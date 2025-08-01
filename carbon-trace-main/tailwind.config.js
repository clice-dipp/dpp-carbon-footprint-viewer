import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  plugins: [daisyui, require('@tailwindcss/typography')],
  daisyui: {
    themes: ["corporate", "business"]
  }
}
