import type { SubmissionSettings } from './config'
import { FORM_TIMING, checkFormToken, deriveKey, hashIp, issueFormToken } from './form-token'
import {
  ipLimitIdentity,
  quarantineBuckets,
  secondsToNextHour,
  submissionBuckets,
  type LimitBucket,
} from './limits'
import { CONSENT_TEXT, type FormKind } from './options'
import type { LimitOutcome, SubmissionDraft } from './store'
import { describeContact, describeCreator, rowsToText } from './summary'
import type { TurnstileResult } from './turnstile'
import { validateContact, validateCreator, type FieldErrors } from './validation'

/**
 * Endpoint zgłoszeń (`/api/zgloszenia`). Kolejność kontroli jest celowa:
 * 1. honeypot i czas wypełnienia (tanie, bez sieci i bazy),
 * 2. walidacja pól (błąd 400 nie zużywa tokenu Turnstile, więc człowiek poprawia pole i wysyła ponownie),
 * 3. Turnstile (siteverify). Gdy Cloudflare jest niedostępny dla serwera, zgłoszenie trafia do kwarantanny
 *    (szkic oznaczony „bez weryfikacji”, ostrzejsze limity, bez automatycznej wizualizacji); każdy inny błąd
 *    weryfikacji (brak lub zły token, inny host, inna akcja) odrzuca zgłoszenie,
 * 4. limity: IP na godzinę i dzienny sufit, liczone dopiero po pozytywnym Turnstile albo przy kwarantannie,
 *    żeby śmieciowe żądania nie wyczerpały sufitu prawdziwym klientom,
 * 5. zapis szkicu; powiadomienie pracowni po wysłaniu odpowiedzi.
 */

export type ResponseCode =
  | 'accepted'
  | 'invalid'
  | 'rejected'
  | 'too_fast'
  | 'expired'
  | 'rate_limited'
  | 'daily_limit'
  | 'verification_failed'
  | 'verification_unavailable'
  | 'disabled'
  | 'error'

export type SubmissionResponse = {
  ok: boolean
  code: ResponseCode
  message: string
  fields?: FieldErrors
}

export const RESPONSE_MESSAGES: Record<ResponseCode, string> = {
  accepted: 'Dziękujemy. Zgłoszenie trafiło do pracowni.',
  invalid: 'Sprawdź zaznaczone pola.',
  rejected:
    'Nie udało się wysłać zgłoszenia. Odśwież stronę i spróbuj ponownie albo zadzwoń lub napisz:',
  too_fast: 'Wysłano zbyt szybko. Odczekaj kilka sekund i spróbuj ponownie.',
  expired: 'Formularz był otwarty bardzo długo. Kliknij „Wyślij” jeszcze raz.',
  rate_limited:
    'Z tego połączenia wysłano już kilka zgłoszeń w ciągu godziny. Spróbuj później albo zadzwoń lub napisz:',
  daily_limit:
    'Dziś przyjęliśmy przez stronę wyjątkowo dużo zgłoszeń. Zadzwoń lub napisz, a odpowiemy:',
  verification_failed:
    'Nie udało się potwierdzić, że wysyła człowiek. Odśwież stronę i spróbuj ponownie albo zadzwoń lub napisz:',
  verification_unavailable: 'Nie możemy teraz potwierdzić wysyłki. Zadzwoń lub napisz:',
  disabled: 'Wysyłka przez stronę jest chwilowo wyłączona. Zadzwoń lub napisz:',
  error: 'Coś poszło nie tak po naszej stronie. Zadzwoń lub napisz:',
}

export const MAX_BODY_BYTES = 16 * 1024

export type AcceptedSubmission = SubmissionDraft & { id: number; createdAt: string }

export type SubmissionDeps = {
  settings: SubmissionSettings
  now: () => number
  verifyTurnstile: (args: {
    token: unknown
    remoteip?: string
    expectedAction: FormKind
    expectedHostname: string
  }) => Promise<TurnstileResult>
  /** Czy siteverify odpowiada serwerowi (przy zgłoszeniu bez tokenu, gdy widżet w przeglądarce zawiódł). */
  siteverifyReachable: () => Promise<boolean>
  consumeLimits: (buckets: LimitBucket[]) => Promise<LimitOutcome>
  insertDraft: (draft: SubmissionDraft) => Promise<{ id: number }>
  /** Powiadomienie pracowni i sprzątanie liczników; uruchamiane po odpowiedzi (`after`). */
  afterAccepted: (submission: AcceptedSubmission, context: { origin: string }) => Promise<void>
  defer: (task: () => Promise<void>) => void
  log?: (event: string, details?: Record<string, unknown>) => void
}

function reply(
  status: number,
  code: ResponseCode,
  extra: Partial<SubmissionResponse> = {},
  headers: HeadersInit = {},
) {
  const body: SubmissionResponse = {
    ok: code === 'accepted',
    code,
    message: RESPONSE_MESSAGES[code],
    ...extra,
  }
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

/** Adres klienta według nagłówków ustawianych przez Vercel (klient nie może ich podmienić). */
export function clientIp(headers: Headers): string | null {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

/** Host, na który przyszło zgłoszenie; Turnstile musi być rozwiązany na tym samym hoście. */
export function requestHostname(request: Request): string {
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host
  return host.split(',')[0].trim().replace(/:\d+$/, '').toLowerCase()
}

function requestOrigin(request: Request): string {
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    new URL(request.url).protocol.replace(':', '')
  return `${proto}://${request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host}`
}

const isForm = (value: unknown): value is FormKind => value === 'kreator' || value === 'kontakt'

/** GET /api/zgloszenia?form=kreator – podpisany token otwarcia formularza. */
export function handleFormTokenRequest(
  request: Request,
  deps: Pick<SubmissionDeps, 'settings' | 'now'>,
): Response {
  const form = new URL(request.url).searchParams.get('form')
  if (!isForm(form)) return reply(400, 'invalid')
  if (!deps.settings.turnstileSecret) return reply(503, 'disabled')
  const token = issueFormToken(form, deriveKey(deps.settings.appSecret, 'form-token'), deps.now())
  return Response.json(
    { token, minMs: FORM_TIMING[form].minMs, maxAgeMs: FORM_TIMING.maxAgeMs },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

function buildDraft(
  form: FormKind,
  data: unknown,
  meta: { ipHash: string; userAgent: string; fillSeconds: number; testing: boolean; now: Date },
): { draft: SubmissionDraft } | { errors: FieldErrors } {
  const common = {
    status: 'draft' as const,
    consentText: CONSENT_TEXT[form],
    consentAt: meta.now.toISOString(),
    notification: 'pending' as const,
    verification: 'verified' as 'verified' | 'quarantine',
    meta: {
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      fillSeconds: meta.fillSeconds,
      verifiedWithTestKeys: meta.testing,
    },
  }
  if (form === 'kreator') {
    const result = validateCreator(data)
    if (!result.ok) return { errors: result.errors }
    const { name, phone, notes, consent: _consent, ...choices } = result.value
    return {
      draft: {
        ...common,
        kind: 'creator',
        name,
        phone,
        summary: rowsToText(describeCreator(choices)),
        message: notes,
        details: choices,
        visualizationStatus: 'waiting',
      },
    }
  }
  const result = validateContact(data)
  if (!result.ok) return { errors: result.errors }
  const { name, phone, email, message, consent: _consent, ...details } = result.value
  return {
    draft: {
      ...common,
      kind: 'contact',
      name,
      phone,
      email,
      topic: details.topic,
      summary: rowsToText(describeContact(details)),
      message,
      details,
      visualizationStatus: 'not_applicable',
    },
  }
}

/** POST /api/zgloszenia */
export async function handleSubmission(request: Request, deps: SubmissionDeps): Promise<Response> {
  const log =
    deps.log ??
    ((event: string, details?: Record<string, unknown>) =>
      console.warn(`[zgloszenia] ${event}`, details ?? ''))
  try {
    const { settings } = deps
    if (!settings.turnstileSecret) return reply(503, 'disabled')

    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      return reply(415, 'rejected')
    }
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES)
      return reply(413, 'rejected')
    const raw = await request.text()
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return reply(413, 'rejected')

    let body: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return reply(400, 'rejected')
      body = parsed as Record<string, unknown>
    } catch {
      return reply(400, 'rejected')
    }
    const form = body.form
    if (!isForm(form)) return reply(400, 'rejected')

    // 1. Pole-pułapka: człowiek go nie widzi, więc każda wartość oznacza bota.
    if (body.honeypot !== undefined && body.honeypot !== '') {
      log('odrzucone: honeypot', { form })
      return reply(403, 'rejected')
    }

    // 1b. Czas od otwarcia formularza (podpisany token z GET).
    const now = deps.now()
    const timing = checkFormToken(
      body.formToken,
      form,
      deriveKey(settings.appSecret, 'form-token'),
      now,
    )
    if (!timing.ok) {
      log(`odrzucone: token formularza (${timing.reason})`, { form })
      if (timing.reason === 'too_fast') return reply(403, 'too_fast')
      if (timing.reason === 'expired') return reply(403, 'expired')
      return reply(403, 'rejected')
    }

    // 2. Walidacja pól (przed Turnstile, żeby nie zużyć tokenu przy literówce).
    const ip = clientIp(request.headers)
    const ipHash = hashIp(
      ip ? ipLimitIdentity(ip) : 'nieznany',
      deriveKey(settings.appSecret, 'ip-hash'),
    )
    const built = buildDraft(form, body.data, {
      ipHash,
      userAgent: (request.headers.get('user-agent') ?? '').slice(0, 200),
      fillSeconds: Math.round(timing.ageMs / 1000),
      testing: false,
      now: new Date(now),
    })
    if ('errors' in built) return reply(400, 'invalid', { fields: built.errors })

    // 3. Turnstile; przy awarii Cloudflare kwarantanna zamiast odrzucenia.
    let quarantine = false
    const token = body.turnstileToken
    if ((typeof token !== 'string' || !token.trim()) && body.turnstileUnavailable === true) {
      // Przeglądarka nie dostała tokenu (widżet lub skrypt Cloudflare zawiódł). Kwarantanna tylko wtedy,
      // gdy Cloudflare nie odpowiada także serwerowi; przy blokadzie po stronie przeglądarki odrzucenie.
      if (await deps.siteverifyReachable()) {
        log('odrzucone: brak tokenu Turnstile, Cloudflare działa', { form })
        return reply(403, 'verification_failed')
      }
      quarantine = true
    } else {
      const turnstile = await deps.verifyTurnstile({
        token,
        remoteip: ip ?? undefined,
        expectedAction: form,
        expectedHostname: requestHostname(request),
      })
      if (turnstile.ok) {
        built.draft.meta = { ...built.draft.meta, verifiedWithTestKeys: turnstile.testing }
      } else if (turnstile.reason === 'unavailable') {
        quarantine = true
      } else {
        log(`odrzucone: turnstile (${turnstile.reason})`, { form, codes: turnstile.codes })
        if (
          turnstile.reason === 'not_configured' ||
          turnstile.reason === 'testing_key_in_production'
        ) {
          return reply(503, 'disabled')
        }
        return reply(403, 'rejected')
      }
    }
    if (quarantine) built.draft.verification = 'quarantine'

    // 4. Limity (atomowo, wszystkie naraz); kwarantanna ma dodatkowe, ostrzejsze liczniki.
    const limits = await deps.consumeLimits([
      ...submissionBuckets(settings.namespace, ipHash, new Date(now), settings.limits),
      ...(quarantine
        ? quarantineBuckets(settings.namespace, ipHash, new Date(now), settings.limits)
        : []),
    ])
    if (!limits.ok) {
      log(`odrzucone: limit (${limits.bucket.scope})`, { form })
      // Wyczerpana kwarantanna: dalej działa jak fail-closed (telefon i e-mail).
      if (limits.bucket.scope === 'quarantine') return reply(503, 'verification_unavailable')
      if (limits.bucket.scope === 'ip') {
        return reply(
          429,
          'rate_limited',
          {},
          { 'Retry-After': String(secondsToNextHour(new Date(now))) },
        )
      }
      return reply(429, 'daily_limit')
    }

    // 5. Szkic w bazie; wizualizacja nie startuje (kolejka: queue.ts).
    const { id } = await deps.insertDraft(built.draft)
    if (quarantine) log('przyjęte do kwarantanny: Cloudflare Turnstile niedostępny', { form, id })
    const accepted: AcceptedSubmission = {
      ...built.draft,
      id,
      createdAt: new Date(now).toISOString(),
    }
    const origin = requestOrigin(request)
    deps.defer(async () => {
      try {
        await deps.afterAccepted(accepted, { origin })
      } catch (error) {
        log('błąd po przyjęciu zgłoszenia', {
          id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })
    return reply(201, 'accepted')
  } catch (error) {
    log('błąd obsługi zgłoszenia', {
      error: error instanceof Error ? error.message : String(error),
    })
    return reply(500, 'error')
  }
}
