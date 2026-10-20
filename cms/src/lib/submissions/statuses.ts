/** Wartości pól wyboru kolekcji „Zgłoszenia”; wartości po angielsku, etykiety dla pracowni po polsku. */

export const SUBMISSION_KINDS = [
  { label: 'Kreator pierścionka', value: 'creator' },
  { label: 'Formularz kontaktowy', value: 'contact' },
] as const

export const SUBMISSION_STATUSES = [
  { label: 'Szkic – do przejrzenia', value: 'draft' },
  { label: 'W kontakcie', value: 'contacted' },
  { label: 'Zamknięte', value: 'closed' },
  { label: 'Spam', value: 'spam' },
] as const

/**
 * Kolejka wizualizacji (tylko kreator). Zgłoszenie startuje jako `waiting`; pracownia zatwierdza (`approved`),
 * a pomocnik pobiera pracę przez `claimVisualization`, które przestawia na `in_progress` w granicach
 * dziennego limitu. `done` i `failed` ustawia pomocnik po zakończeniu.
 */
export const VISUALIZATION_STATUSES = [
  { label: 'Nie dotyczy', value: 'not_applicable' },
  { label: 'Czeka na akceptację', value: 'waiting' },
  { label: 'Zatwierdzona – w kolejce', value: 'approved' },
  { label: 'W toku', value: 'in_progress' },
  { label: 'Gotowa', value: 'done' },
  { label: 'Błąd', value: 'failed' },
  { label: 'Odrzucona', value: 'rejected' },
] as const

export const NOTIFICATION_STATUSES = [
  { label: 'Oczekuje', value: 'pending' },
  { label: 'Wysłane do pracowni', value: 'sent' },
  { label: 'Pominięte (brak poczty)', value: 'skipped' },
  { label: 'Błąd wysyłki', value: 'failed' },
] as const

/** Kwarantanna: Cloudflare Turnstile był niedostępny, więc zgłoszenia nie dało się zweryfikować. */
export const VERIFICATION_STATUSES = [
  { label: 'Zweryfikowane (Turnstile)', value: 'verified' },
  { label: 'Kwarantanna – bez weryfikacji', value: 'quarantine' },
] as const

export type SubmissionKind = (typeof SUBMISSION_KINDS)[number]['value']
export type VisualizationStatus = (typeof VISUALIZATION_STATUSES)[number]['value']
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]['value']
