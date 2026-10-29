/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'ficunam-display': ['Syne', 'Space Grotesk', 'sans-serif'],
        'ficunam-sans': ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        ficunam: {
          red: '#D91E26',
          dark: '#080808',
          ivory: '#F4F0EA',
          panel: '#111111'
        }
      }
    },
  },
  plugins: [],
};
