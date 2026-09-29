/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#1B1E27',
        muted: '#8B919C',
        cool: '#E6E9EF',
        line: '#ECEEF3',
      },
    },
  },
  plugins: [],
}
