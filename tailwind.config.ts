import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'media',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        serif: ['var(--font-playfair)', 'serif'],
        playfair: ['var(--font-playfair)', 'serif'],
        cormorant: ['var(--font-cormorant)', 'serif']
      },
      colors: {
        'brand-gold': '#BFA181',
        'brand-beige': '#EAE0D5',
        'brand-light-gray': '#D8CFC3',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config; 