/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2F7', 100: '#D6DCE4', 200: '#B0BCCC', 300: '#7E94AE',
          400: '#4F6B8A', 500: '#2E5FA3', 600: '#1F3864', 700: '#162845', 800: '#0D1B2E',
        },
        teal: { 500: '#1F6B63', 600: '#165950' },
      },
      fontFamily: { sans: ['Inter', 'Arial', 'sans-serif'] },
    },
  },
  plugins: [],
}
