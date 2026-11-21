import type { MetadataRoute } from 'next'

// Manifest aplikacji (/manifest.webmanifest). Musi leżeć w głównym katalogu app/, nie w grupie (frontend):
// pliki specjalne Next.js (favicon.ico, manifest) w grupie tras nie są podawane.
// Daje ikonę i nazwę przy „Dodaj do ekranu głównego” na Androidzie. Strona otwiera się wtedy jak zwykła karta
// przeglądarki (display: browser), bo to wizytówka pracowni, nie aplikacja.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pracownia Złotnicza Michał Nowak',
    short_name: 'Michał Nowak',
    description:
      'Rodzinna pracownia złotnicza w Busku-Zdroju. Pierścionki zaręczynowe i obrączki na zamówienie, naprawy i przeróbki biżuterii.',
    lang: 'pl',
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
