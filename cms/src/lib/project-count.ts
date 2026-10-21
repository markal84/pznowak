export function formatProductCount(count: number): string {
  if (count === 1) return '1 projekt'
  const digit = count % 10
  const ending = count % 100
  const noun = digit >= 2 && digit <= 4 && (ending < 12 || ending > 14) ? 'projekty' : 'projektów'
  return `${count} ${noun}`
}
