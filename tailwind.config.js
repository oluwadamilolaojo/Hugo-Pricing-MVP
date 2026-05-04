/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FEFCF6',
          100: '#F5F0E8',
          200: '#EDE5D4',
          300: '#DDD5C4',
          400: '#C9BDA8',
        },
        hugo: {
          black:  '#1A1A1A',
          yellow: '#F5C518',
          gold:   '#C9A800',
          dark:   '#2A2A2A',
          panel:  '#1A1A1A',
          row:    '#242424',
          border: '#2E2E2E',
          muted:  '#888888',
          faint:  '#555555',
          light:  '#CCCCCC',
        },
      },
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      borderRadius: {
        chip: '20px',
      },
    },
  },
  plugins: [],
}
