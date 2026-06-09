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
        gold: {
          DEFAULT: '#D4AF37',
          50: '#fbf7e9',
          100: '#f4e9c2',
          400: '#dcbf52',
          500: '#D4AF37',
          600: '#b8932a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scroll-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        'logo-pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        'draw-check': {
          '0%': { strokeDashoffset: '26' },
          '100%': { strokeDashoffset: '0' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease-out forwards',
        'scroll-bounce': 'scroll-bounce 1.8s ease-in-out infinite',
        'logo-pulse': 'logo-pulse 1.4s ease-in-out',
        'draw-check': 'draw-check 0.5s ease-out 0.1s forwards',
        'pop-in': 'pop-in 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
