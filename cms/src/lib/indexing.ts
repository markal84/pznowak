/** Tylko wdrożenie produkcyjne Vercela może być indeksowane; preview i lokalne uruchomienia nie. */
export function isIndexable(env: string | undefined = process.env.VERCEL_ENV): boolean {
  return env === 'production'
}
