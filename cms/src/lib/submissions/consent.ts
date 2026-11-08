import { CONSENT_TEXT, type FormKind } from './options'

/**
 * Treść zgody pokazywana przy formularzu i zapisywana ze zgłoszeniem (musi być ta sama w obu miejscach).
 * Zawiera słowa „Regulamin” i „Politykę prywatności”; formularz zamienia je na linki (ConsentLabel).
 * Tylko po stronie serwera: formularze (komponenty klienckie) dostają tekst w propsie.
 */
export function consentText(form: FormKind): string {
  return CONSENT_TEXT[form]
}
