/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        soc: {
          900: '#0b0e14',
          850: '#10141d',
          800: '#161c28',
          750: '#1c2434',
          700: '#242e42',
          600: '#34425d',
          accent: '#00f0ff',
          neonGreen: '#00ff88',
          alertRed: '#ff2d55',
          warningAmber: '#ffaa00'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
