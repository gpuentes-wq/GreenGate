/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gg: {
          green: '#1f7a4d',
          dark: '#14532d',
          light: '#e8f5ee',
        },
      },
    },
  },
  plugins: [],
}
