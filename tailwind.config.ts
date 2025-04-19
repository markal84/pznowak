import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'media',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-lato-sans)', 'sans-serif'],
        mono: ['monospace'],
        serif: ['var(--font-playfair)', 'serif'],
        display: ['var(--font-playfair)', 'serif']
      },
      fontSize: {
        base: '1rem',    // 16px
        lg: '1.25rem',   // 20px
        xl: '1.563rem',  // 25px
        '2xl': '1.953rem', // 31px
        '3xl': '2.441rem', // 39px
        '4xl': '3.052rem'  // 49px
      },
      lineHeight: {
        base: '1.5rem',    // 24px
        relaxed: '2rem',   // 32px
        h3: '2.5rem',      // 40px
        h2: '3rem',        // 48px
        h1: '4rem'         // 64px
      },
      colors: {
        'brand-gold': '#BFA181',        // delikatne, szlachetne złoto
        'brand-gold-light': 'rgba(191, 161, 129, 0.3)',
        'brand-light': '#F4F2EE',       // ciepła biel
        'brand-beige': '#F5E1C3',       // beżowy akcent
        'brand-gray': '#F5F5F5'         // neutralne tło
      }
    }
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/aspect-ratio'), require('@tailwindcss/forms')]
}

export default config