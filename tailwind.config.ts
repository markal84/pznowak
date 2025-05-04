import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'media',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/aspect-ratio'), require('@tailwindcss/forms')]
}

export default config