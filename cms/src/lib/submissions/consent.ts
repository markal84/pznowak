import { showPlaceholders } from '../placeholders'
import { CONSENT_TEXT, type FormKind } from './options'

/** Fragment zgody, który na produkcji znika, dopóki pracownia nie dostarczy polityki prywatności. */
const PRIVACY_NOTE = ' Polityka prywatności [wkrótce]'

/**
 * Treść zgody pokazywana przy formularzu i zapisywana ze zgłoszeniem (musi być ta sama w obu miejscach).
 * Poza produkcją pełna, z notką „[wkrótce]”; na produkcji bez niej (nie pokazujemy znaczników).
 * Tylko po stronie serwera: formularze (komponenty klienckie) dostają tekst w propsie.
 */
export function consentText(form: FormKind): string {
  const text = CONSENT_TEXT[form]
  return showPlaceholders() ? text : text.replace(PRIVACY_NOTE, '')
}
