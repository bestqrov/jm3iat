/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        token: {
          'primary-600': 'hsl(var(--color-primary-600))',
          'primary-700': 'hsl(var(--color-primary-700))',
          'success-600': 'hsl(var(--color-success-600))',
          'danger-600':  'hsl(var(--color-danger-600))',
          'warning-600': 'hsl(var(--color-warning-600))',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
