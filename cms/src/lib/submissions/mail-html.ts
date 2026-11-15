/**
 * Wspólne drobiazgi maili HTML (powiadomienie pracowni `notify.ts`, potwierdzenie dla klienta `confirmation.ts`):
 * kolory strony z `globals.css`, czcionki z zapasem dla programów pocztowych, escapowanie i odczyt podsumowania.
 */

export const MAIL_COLORS = {
  silver: '#e7e8e3',
  paper: '#fbfbf8',
  velvet: '#1d3832',
  graphite: '#22262a',
  graphite2: '#3a3f43',
  muted: '#575c5f',
  gold: '#c8a15a',
  goldBg: '#f6efe0',
  patina: '#7c5b1e',
  lineSoft: '#c9cbc4',
  onVelvet: '#eef0ea',
  onVelvet2: '#c9d1cb',
  error: '#9b2c22',
  errorBg: '#f8eeeb',
} as const

export const MAIL_SERIF = "'Newsreader', Georgia, 'Times New Roman', serif"
export const MAIL_SANS = "'Schibsted Grotesk', Arial, Helvetica, sans-serif"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Wiersze podsumowania z tekstu „Klucz: wartość” (podział na pierwszym „: ”); inne linie są pomijane. */
export function parseSummaryRows(summary: string | null | undefined): [string, string][] {
  return (summary ?? '')
    .split('\n')
    .map((line) => {
      const at = line.indexOf(': ')
      return at > 0
        ? ([line.slice(0, at).trim(), line.slice(at + 2).trim()] as [string, string])
        : null
    })
    .filter((row): row is [string, string] => Boolean(row && row[0] && row[1]))
}

/** `tel:` z samych cyfr i plusa (numer przeszedł walidację, ale do atrybutu idzie tylko to). */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

/** Potwierdzenie dla klienta (`confirmation.ts`): wyłącznik `SUBMISSIONS_CLIENT_CONFIRMATION=0`, domyślnie włączone. */
export function clientConfirmationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const value = env.SUBMISSIONS_CLIENT_CONFIRMATION?.trim().toLowerCase()
  return !(value === '0' || value === 'false' || value === 'off')
}
