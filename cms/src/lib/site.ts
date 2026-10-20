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

export const NAV = [
  { id: 'pierscionki', label: 'Pierścionki', href: '/pierscionki' },
  { id: 'obraczki', label: 'Obrączki', href: '/obraczki' },
  { id: 'zamowienie', label: 'Na zamówienie', href: '/na-zamowienie' },
  { id: 'naprawy', label: 'Naprawy', href: '/naprawy' },
  { id: 'realizacje', label: 'Realizacje', href: '/realizacje' },
  { id: 'pracownia', label: 'Pracownia', href: '/pracownia' },
] as const

export type NavId = (typeof NAV)[number]['id'] | 'home' | 'kontakt' | 'kreator'

/**
 * Wysyłka z kreatora i formularzy jest wyłączona do czasu wdrożenia zabezpieczeń
 * (zlecenie: etap 2). Włączenie = zmiana tej jednej stałej plus podpięcie endpointu.
 */
export const SUBMISSIONS_ENABLED = false

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
