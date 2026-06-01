/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1E3A5F',
          50: '#eef3f8',
          100: '#d4e0ec',
          600: '#234770',
          700: '#1E3A5F',
          800: '#172d4a',
          900: '#0f1f33',
        },
        royal: {
          DEFAULT: '#2E6DA4',
          50: '#eef5fb',
          100: '#d6e6f3',
          500: '#2E6DA4',
          600: '#285f8f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
