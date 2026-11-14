import Script from 'next/script'
import { ANALYTICS_ENABLED, UMAMI_SRC, UMAMI_WEBSITE_ID, umamiDomains } from '@/lib/analytics'
import { siteUrl } from '@/lib/seo'
import AnalyticsClicks from './AnalyticsClicks'

/**
 * Skrypt statystyk Umami (bez cookies, zob. src/lib/analytics.ts) i nasłuch kliknięć w telefon, e-mail, mapy
 * i profile społecznościowe. Bez NEXT_PUBLIC_UMAMI_WEBSITE_ID nic się nie renderuje.
 * `afterInteractive` (domyślne): skrypt nie opóźnia pierwszego wyświetlenia ani LCP.
 */
export default function Analytics() {
  if (!ANALYTICS_ENABLED) return null
  return (
    <>
      <Script data-domains={umamiDomains(siteUrl())} data-website-id={UMAMI_WEBSITE_ID} id="umami" src={UMAMI_SRC} />
      <AnalyticsClicks />
    </>
  )
}
