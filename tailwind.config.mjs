/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        racing: {
          dark: '#141619',
          surface: '#1A1D22',
          card: '#22262B',
          border: '#2C3138',
          hover: '#343A43',
          red: '#F04B32',
          'red-hover': '#D93820',
          white: '#F0EFEA',
          muted: '#969BA0',
          dim: '#5F656D',
        },
      },
      fontFamily: {
        headline: ['var(--font-headline)', 'Barlow Condensed', 'Archivo Narrow', 'sans-serif'],
        sans: ['var(--font-sans)', 'IBM Plex Sans', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
