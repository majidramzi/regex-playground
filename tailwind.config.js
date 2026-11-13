/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      colors: {
        ink: '#17223b',
        violet: {
          50: '#f4f1ff',
          100: '#e9e2ff',
          500: '#7658e8',
          600: '#6647d7',
          700: '#5337bd',
        },
      },
    },
  },
  plugins: [],
};
