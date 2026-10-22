/**
 * Czy to środowisko może być indeksowane przez Google. Tylko produkcja; podglądy i uruchomienia lokalne nie.
 *
 * `SITE_ENV` (np. `production`) ma pierwszeństwo i działa tak samo na każdym hostingu. `VERCEL_ENV` zostaje jako
 * zapas dla wdrożeń na Vercelu, gdzie `SITE_ENV` nie jest ustawione. Ustawione, ale puste `SITE_ENV` jest ignorowane.
 *
 * Uwaga: wartość trafia do stron i nagłówków zapisanych przy budowaniu, więc `SITE_ENV` musi być ustawione
 * już podczas `next build`, a nie tylko podczas uruchamiania serwera.
 */
export function siteEnvironment(
  siteEnv: string | undefined = process.env.SITE_ENV,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): string | undefined {
  return siteEnv?.trim() || vercelEnv?.trim() || undefined
}

export function isIndexable(
  siteEnv: string | undefined = process.env.SITE_ENV,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  return siteEnvironment(siteEnv, vercelEnv) === 'production'
}
