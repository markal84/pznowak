'use client'

import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'

import {
  PREPARE_MESSAGES,
  prepareFile,
  skipUpload,
  uploadFile,
  type PreparedFile,
  type UploadReply,
} from '@/lib/attachments/prepare'
import {
  ACCEPT_ATTRIBUTE,
  ATTACHMENT_RULES,
  ATTACHMENTS_RETENTION_MONTHS,
  formatBytes,
  photosLabel,
} from '@/lib/attachments/rules'
import { SITE } from '@/lib/site'

/**
 * Załączniki w formularzu (Zlecenie B): klient dodaje zdjęcia z internetu, swoje zdjęcia albo szkic, widzi
 * miniatury i może je usunąć przed wysłaniem. Pliki idą na serwer dopiero po przyjęciu zgłoszenia, każdy
 * z jednorazowym biletem z odpowiedzi (`useSubmission` woła `manifest()` przed wysyłką i `upload()` po niej).
 * Podpinany jednym miejscem w formularzu; bez przełącznika `ATTACHMENTS_ENABLED` formularz go nie renderuje.
 */

export type AttachmentsResult =
  | { kind: 'uploaded'; sent: number; failed: number; messages: string[] }
  | { kind: 'refused'; declared: number }

export type AttachmentsHandle = {
  /** Czeka na przygotowanie dodanych plików i zwraca ich rozmiary (zapowiedź w zgłoszeniu). */
  manifest: () => Promise<Array<{ size: number }>>
  /** Wysyła pliki z zapowiedzi, w tej samej kolejności, z biletami z odpowiedzi serwera. */
  upload: (uploads: Array<{ token: string }>) => Promise<AttachmentsResult>
}

type Item = {
  key: string
  name: string
  status: 'preparing' | 'ready' | 'uploading' | 'done' | 'failed'
  prepared: PreparedFile | null
  progress: number
  message?: string
}

const MAX = ATTACHMENT_RULES.maxFiles

function statusText(item: Item): string {
  switch (item.status) {
    case 'preparing':
      return 'Przygotowanie…'
    case 'ready':
      return item.prepared ? formatBytes(item.prepared.blob.size) : ''
    case 'uploading':
      return `Wysyłanie… ${Math.round(item.progress * 100)}%`
    case 'done':
      return 'Dołączone'
    case 'failed':
      return item.message ?? 'Nie udało się wysłać'
  }
}

export default function Attachments({
  disabled = false,
  error,
  ref,
}: {
  disabled?: boolean
  /** Błąd od serwera (pole `attachments` w odpowiedzi 400). */
  error?: string
  ref?: Ref<AttachmentsHandle>
}) {
  const id = useId()
  const inputId = `${id}-pliki`
  const hintId = `${id}-podpowiedz`
  const errorId = `${id}-bledy`
  const input = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [items, setItems] = useState<Item[]>([])
  // Kopia stanu do kodu asynchronicznego (przygotowanie, wysyłka), zawsze aktualna.
  const itemsRef = useRef<Item[]>([])
  const pending = useRef<Promise<void>>(Promise.resolve())
  const snapshot = useRef<Item[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [dragging, setDragging] = useState(false)

  const update = (change: (items: Item[]) => Item[]) => {
    itemsRef.current = change(itemsRef.current)
    setItems(itemsRef.current)
  }
  const patch = (key: string, values: Partial<Item>) =>
    update((list) => list.map((item) => (item.key === key ? { ...item, ...values } : item)))

  useEffect(
    () => () => {
      for (const item of itemsRef.current)
        if (item.prepared?.previewUrl) URL.revokeObjectURL(item.prepared.previewUrl)
    },
    [],
  )

  const addFiles = (files: File[]) => {
    if (disabled || !files.length) return
    const free = MAX - itemsRef.current.length
    const accepted = files.slice(0, Math.max(0, free))
    const problems: string[] = []
    if (files.length > accepted.length)
      problems.push(
        `Można dołączyć najwyżej ${photosLabel(MAX)}; pominięto ${files.length - accepted.length}.`,
      )
    const added = accepted.map((file) => ({
      file,
      item: {
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name || 'zdjęcie',
        status: 'preparing' as const,
        prepared: null,
        progress: 0,
      },
    }))
    update((list) => [...list, ...added.map((a) => a.item)])
    setErrors(problems)

    // Po kolei, żeby telefon nie dekodował kilku dużych zdjęć naraz.
    pending.current = pending.current.then(async () => {
      let ready = 0
      for (const { file, item } of added) {
        const result = await prepareFile(file).catch(() => ({
          ok: false as const,
          error: 'unreadable' as const,
        }))
        if (!itemsRef.current.some((i) => i.key === item.key)) {
          // Usunięty w trakcie przygotowania.
          if (result.ok && result.file.previewUrl) URL.revokeObjectURL(result.file.previewUrl)
          continue
        }
        if (result.ok) {
          ready++
          patch(item.key, { status: 'ready', prepared: result.file })
        } else {
          update((list) => list.filter((i) => i.key !== item.key))
          const problem = `„${item.name}”: ${PREPARE_MESSAGES[result.error]}.`
          setErrors((current) => [...current, problem])
        }
      }
      if (ready)
        setAnnouncement(`Dodano ${photosLabel(ready)}. Razem ${itemsRef.current.length} z ${MAX}.`)
    })
  }

  const remove = (key: string, index: number) => {
    const item = itemsRef.current.find((i) => i.key === key)
    if (!item || disabled) return
    if (item.prepared?.previewUrl) URL.revokeObjectURL(item.prepared.previewUrl)
    update((list) => list.filter((i) => i.key !== key))
    setAnnouncement(`Usunięto „${item.name}”. Zostało ${photosLabel(itemsRef.current.length)}.`)
    // Fokus na następny przycisk „Usuń” albo na wybór plików, żeby klawiatura nie wypadła z formularza.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-remove]')
      const next = buttons?.[Math.min(index, (buttons?.length ?? 1) - 1)]
      ;(next ?? input.current)?.focus()
    })
  }

  useImperativeHandle(ref, () => ({
    async manifest() {
      await pending.current
      snapshot.current = itemsRef.current.filter((i) => i.prepared && i.status === 'ready')
      return snapshot.current.map((i) => ({ size: i.prepared!.blob.size }))
    },
    async upload(uploads) {
      const files = snapshot.current
      let sent = 0
      const messages: string[] = []
      for (const [index, item] of files.entries()) {
        const token = uploads[index]?.token
        if (!token || !item.prepared) {
          patch(item.key, { status: 'failed', message: 'Nie udało się wysłać' })
          messages.push(`„${item.name}”: nie udało się wysłać.`)
          continue
        }
        patch(item.key, { status: 'uploading', progress: 0 })
        setAnnouncement(`Wysyłanie zdjęć: ${index + 1} z ${files.length}.`)
        let reply: UploadReply | null = null
        // Jedna ponowna próba przy zerwanym połączeniu albo błędzie serwera.
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            reply = await uploadFile(item.prepared.blob, token, item.name, (progress) =>
              patch(item.key, { progress }),
            )
            if (reply.status < 500) break
          } catch {
            reply = null
          }
        }
        // 409 po zerwanym połączeniu: pierwsza próba doszła, tylko odpowiedź przepadła.
        const ok = reply?.status === 201 || (reply?.status === 409 && reply.code === 'used_token')
        if (ok) {
          sent++
          patch(item.key, { status: 'done', progress: 1 })
          continue
        }
        const message = reply?.message ?? 'nie udało się wysłać (brak połączenia)'
        patch(item.key, { status: 'failed', message })
        messages.push(`„${item.name}”: ${message.replace(/\.$/, '')}.`)
        // Sieć albo serwer: zwalniamy miejsce, żeby pracownia od razu dostała powiadomienie.
        if (!reply || reply.status >= 500) await skipUpload(token)
      }
      return { kind: 'uploaded', sent, failed: files.length - sent, messages }
    },
  }))

  const full = items.length >= MAX
  const describedBy = [hintId, errors.length || error ? errorId : ''].filter(Boolean).join(' ')

  return (
    <div
      className={`field attachments${dragging ? ' is-dragging' : ''}`}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        if (disabled || full || !event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDragging(true)
      }}
      onDrop={(event) => {
        if (disabled || full) return
        event.preventDefault()
        setDragging(false)
        addFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <span className="lbl">
        Zdjęcia lub szkic <span className="opt-note">(opcjonalnie)</span>
      </span>
      <span className="field-hint" id={hintId}>
        Zdjęcie z internetu, Twoje zdjęcie albo szkic. Do {photosLabel(MAX)}: JPG, PNG, WebP lub
        HEIC z iPhone’a. Zdjęcia służą tylko do wyceny; usuwamy je razem ze zgłoszeniem, najpóźniej
        po {ATTACHMENTS_RETENTION_MONTHS} miesiącach.
      </span>

      {items.length ? (
        <ul aria-label="Dodane zdjęcia" className="att-list" ref={listRef}>
          {items.map((item, index) => (
            <li className={`att-item is-${item.status}`} key={item.key}>
              {item.prepared?.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- podgląd lokalnego pliku (blob:)
                <img alt="" className="att-thumb" src={item.prepared.previewUrl} />
              ) : (
                <span aria-hidden="true" className="att-thumb att-thumb-empty">
                  {item.status === 'preparing' ? '…' : 'HEIC'}
                </span>
              )}
              <span className="att-meta">
                <span className="att-name">{item.name}</span>
                <span className="att-status">{statusText(item)}</span>
                {item.status === 'uploading' ? (
                  <span aria-hidden="true" className="att-progress">
                    <span style={{ width: `${Math.round(item.progress * 100)}%` }} />
                  </span>
                ) : null}
              </span>
              {item.status === 'ready' || item.status === 'preparing' ? (
                <button
                  aria-label={`Usuń zdjęcie „${item.name}”`}
                  className="att-remove"
                  data-remove=""
                  disabled={disabled}
                  onClick={() => remove(item.key, index)}
                  type="button"
                >
                  Usuń
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {full ? (
        <span className="field-hint">Dodano {photosLabel(MAX)}, więcej się nie zmieści.</span>
      ) : (
        <span className="att-pick">
          <input
            accept={ACCEPT_ATTRIBUTE}
            aria-describedby={describedBy}
            className="att-input"
            disabled={disabled}
            id={inputId}
            multiple
            onChange={(event) => {
              addFiles(Array.from(event.currentTarget.files ?? []))
              event.currentTarget.value = ''
            }}
            ref={input}
            type="file"
          />
          <label className="btn btn-line att-button" htmlFor={inputId}>
            {items.length ? 'Dodaj kolejne zdjęcia' : 'Dodaj zdjęcia'}
          </label>
        </span>
      )}

      {errors.length || error ? (
        <span className="field-error" id={errorId} role="alert">
          {[...(error ? [error] : []), ...errors].join(' ')}
        </span>
      ) : null}
      <span aria-live="polite" className="att-sr">
        {announcement}
      </span>
    </div>
  )
}

/** Informacja na karcie „Wiadomość wysłana”: ile zdjęć doszło, a jeśli nie wszystkie, co dalej. */
export function AttachmentsNote({ result }: { result: AttachmentsResult | null }) {
  if (!result) return null
  const mail = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
  if (result.kind === 'refused')
    return (
      <p className="notice notice-preview">
        Wiadomość dotarła, ale zdjęć nie mogliśmy teraz przyjąć. Wyślij je e-mailem na {mail} i
        podaj imię, a dołączymy je do zgłoszenia.
      </p>
    )
  if (result.failed === 0)
    return result.sent ? <p className="text">Dołączone: {photosLabel(result.sent)}.</p> : null
  return (
    <div className="notice notice-error" role="alert">
      <p style={{ margin: 0 }}>
        {result.sent
          ? `Wiadomość dotarła. Dołączone zdjęcia: ${result.sent} z ${result.sent + result.failed}. Pozostałe`
          : 'Wiadomość dotarła, ale zdjęć nie udało się dołączyć. Zdjęcia'}{' '}
        możesz wysłać e-mailem na {mail} i podać imię.
      </p>
      {result.messages.length ? (
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          {result.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
