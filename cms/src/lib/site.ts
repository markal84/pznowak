export const SITE = {
  name: 'Michał Nowak',
  tagline: 'Pracownia złotnicza',
  since: 1890,
  phone: '+48 501 321 347',
  phoneHref: 'tel:+48501321347',
  phoneShort: '501 321 347',
  email: 'kontakt@pznowak.pl',
  street: 'Kilińskiego 12',
  city: '28-100 Busko-Zdrój',
  mapsUrl: 'https://maps.google.com/?q=Kili%C5%84skiego+12+Busko-Zdr%C3%B3j',
  instagram: 'https://www.instagram.com/nowak_pracownia_zlotnicza/',
  facebook: 'https://www.facebook.com/profile.php?id=61568506251939',
  hours: [
    { days: 'Pon.–pt.', time: '8:00–16:00' },
    { days: 'Sobota', time: '10:00–16:00' },
  ],
} as const

/**
 * Jedna linijka zaufania pod przyciskami w hero (strona główna). `confirmed: false` = jeszcze niepotwierdzone przez
 * pracownię: na podglądzie widać wyróżniony znacznik „do uzupełnienia”, na produkcji pozycja się nie pokazuje.
 * Dopisując fakt, ustaw `confirmed: true`.
 */
export const HERO_TRUST: readonly { text: string; confirmed: boolean }[] = [
  { text: 'Zamówienia wysyłamy do klientów w całej Polsce', confirmed: true },
  { text: 'Rozmowa o projekcie także przez wideo [do potwierdzenia]', confirmed: false },
  { text: 'Pierścionek na zamówienie gotowy zwykle w [TERMIN]', confirmed: false },
]

export const NAV = [
  { id: 'pierscionki', label: 'Pierścionki', href: '/pierscionki' },
  { id: 'obraczki', label: 'Obrączki', href: '/obraczki' },
  { id: 'zamowienie', label: 'Na zamówienie', href: '/na-zamowienie' },
  { id: 'naprawy', label: 'Naprawy', href: '/naprawy' },
  { id: 'realizacje', label: 'Realizacje', href: '/realizacje' },
  { id: 'pracownia', label: 'Pracownia', href: '/pracownia' },
] as const

/**
 * Narzędzia do projektowania online. Wyłączone 21.10.2026 (pracownia woli katalog gotowych prac i zdjęcie lub
 * opis od klienta przez formularz kontaktowy). Kod, testy i zabezpieczenia wysyłki zostają; `true` przywraca
 * kreator w nagłówku, w treściach i pod `/kreator`, a konfigurator na stronie „Obrączki”.
 * Przy wyłączonym kreatorze `/kreator` odpowiada 404, a endpoint zgłoszeń nie przyjmuje formularza kreatora.
 */
export const RING_CREATOR_ENABLED = false
export const BAND_CONFIGURATOR_ENABLED = false

/** Wyróżniona pozycja nagłówka (drugorzędny przycisk obok „Umów wizytę”, osobna pozycja w menu na telefonie). */
export const CREATOR_LINK = { id: 'kreator', label: 'Zaprojektuj pierścionek', href: '/kreator' } as const

/** Zamiast kreatora: zdjęcie lub opis przez formularz kontaktowy (temat „na zamówienie”). */
export const CUSTOM_ORDER_LINK = { label: 'Wyślij zdjęcie lub opis', href: '/kontakt?temat=nowy' } as const

export type NavId = (typeof NAV)[number]['id'] | 'home' | 'kontakt' | 'kreator'

/**
 * Klucz witryny Cloudflare Turnstile (publiczny, wstawiany przy budowaniu). Wysyłka z kreatora i formularza
 * kontaktowego działa tylko z kluczem; bez niego formularze pokazują PREVIEW_NOTICE i niczego nie wysyłają.
 * Sekret i limity: `src/lib/submissions/config.ts`.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ''

export const SUBMISSIONS_ENABLED = TURNSTILE_SITE_KEY !== ''

/**
 * Zdjęcia w formularzu kontaktowym (Zlecenie B). Przełącznik `ATTACHMENTS_ENABLED` (`1`/`true`) jest wstawiany
 * przy budowaniu (`next.config.ts` → `env`); domyślnie wyłączony, wtedy formularz wygląda jak przed zmianą.
 * Serwer czyta ten sam przełącznik w `src/lib/submissions/config.ts`.
 */
export const ATTACHMENTS_ENABLED =
  SUBMISSIONS_ENABLED && ['1', 'true'].includes((process.env.ATTACHMENTS_ENABLED ?? '').trim().toLowerCase())

export const PREVIEW_NOTICE =
  'Wersja podglądowa: wysyłka jest jeszcze wyłączona. Zadzwoń lub napisz, a odpowiemy w godzinach pracy pracowni.'

export const FAMILY = [
  {
    year: '1890',
    name: 'Wiktor Nowak',
    role: 'Kowal z Szańca',
    short: 'Kowal z Szańca. Sprowadzał narzędzia z Francji i robił pierwsze projekty biżuterii.',
    text: 'Sprowadzał narzędzia z Francji i to on zrobił w rodzinie pierwsze projekty biżuterii.',
    img: '/about-us-grandgrandfather_Wiktor.png',
    alt: 'Wiktor Nowak z rodziną, fotografia z przełomu wieków',
    pos: '50% 20%',
  },
  {
    year: '1955',
    name: 'Stanisław Nowak',
    role: 'Złotnik',
    short: 'Złotnik. Rozwinął warsztat i uczył się u najlepszych mistrzów w regionie.',
    text: 'Mistrz złotnictwa lat 50. Rozwinął warsztat i szkolił się u najlepszych w regionie.',
    img: '/about-us-grandfather.png',
    alt: 'Stanisław Nowak, portret z lat pięćdziesiątych',
    pos: '50% 25%',
  },
  {
    year: '1985',
    name: 'Mieczysław Nowak',
    role: 'Złotnik i projektant',
    short: 'Jego projekty z lat 80. do dziś wracają do pracowni na renowację.',
    text: 'Tytan pracy. Jego projekty z lat 80. były cenione w regionie i do dziś wracają do pracowni na renowację.',
    img: '/about-us-father.png',
    alt: 'Mieczysław Nowak pochylony nad stołem złotniczym, lata osiemdziesiąte',
    pos: '62% 40%',
  },
  {
    year: 'Dziś',
    name: 'Michał Nowak',
    role: 'Złotnik, czwarte pokolenie',
    short: 'Projektuje pierścionki z kamieniami szlachetnymi i sam oprawia kamienie.',
    text: 'Kontynuuje rodzinne rzemiosło. Projektuje pierścionki z kamieniami szlachetnymi, sam oprawia kamienie i pilnuje każdego detalu.',
    img: '/about-us-son.png',
    alt: 'Michał Nowak przy mikroskopie w pracowni',
    pos: '40% 30%',
  },
] as const
