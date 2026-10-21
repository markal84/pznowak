import { Newsreader, Schibsted_Grotesk } from 'next/font/google'

export const newsreader = Newsreader({
  display: 'swap',
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-newsreader',
  weight: ['300', '400', '500'],
})

export const schibsted = Schibsted_Grotesk({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-schibsted',
  weight: ['400', '500', '600', '700'],
})

export const fontClassName = `${newsreader.variable} ${schibsted.variable}`
