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
        sans: ['var(--font-lato-sans)', 'sans-serif'],
        mono: ['monospace'],
        serif: ['var(--font-playfair)', 'serif'],
        playfair: ['var(--font-playfair)', 'serif'],
      },
      // Typographic Scale (Major Third 1:1.25, base 16px)
      fontSize: {
        'base': '1rem',       // 16px
        'lg': '1.25rem',    // 20px
        'xl': '1.563rem',   // 25px
        '2xl': '1.953rem',  // 31px (H3)
        '3xl': '2.441rem',  // 39px (H2)
        '4xl': '3.052rem',  // 49px (H1)
      },
      // Line Height based on 8pt grid
      lineHeight: {
        'base': '1.5rem',    // 24px (for 16px text, 1.5 ratio)
        'relaxed': '2rem', // 32px (e.g., for 20px/25px text)
        'h3':   '2.5rem',    // 40px (for ~31px text)
        'h2':   '3rem',      // 48px (for ~39px text)
        'h1':   '4rem',      // 64px (for ~49px text)
      },
      colors: {
        'brand-gold': '#BFA181',
        'brand-beige': '#fecaca',
        'brand-light-gray': '#bfdbfe',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config; 