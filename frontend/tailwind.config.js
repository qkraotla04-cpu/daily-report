/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Inter', 'system-ui', '-apple-system', 'Noto Sans KR', 'sans-serif'],
        serif: ['Inter', 'system-ui', '-apple-system', 'Noto Sans KR', 'sans-serif'],
        mono:  ['JetBrains Mono', 'D2Coding', 'Courier New', 'monospace'],
      },
      colors: {
        /* Cyanotype Dark Palette */
        cream:        '#07182E',
        'cream-deep': '#050F1F',
        paper:        '#0E2542',
        'paper-warm': '#102B4D',
        ink:          '#E8F1FF',
        'ink-2':      '#B8D2F0',
        'ink-muted':  '#7FA4CC',
        'ink-faint':  '#4F75A0',
        line:         '#2A4A75',
        'line-soft':  '#1B355A',
        accent: {
          DEFAULT: '#5AC8FF',
          deep:    '#2EA3E0',
          soft:    '#122F47',
        },
        'state-done':   '#34D399',
        'state-wait':   '#FBBF24',
        'state-danger': '#F87171',

        /* Remap indigo → Cyanotype */
        indigo: {
          50:  '#0A2030',
          100: '#0F2C44',
          200: '#1A4060',
          300: '#2A5A80',
          400: '#3A7AA0',
          500: '#5AC8FF',
          600: '#5AC8FF',
          700: '#2EA3E0',
          800: '#1A7AAF',
          900: '#0E5080',
        },

        primary: {
          50:  '#0A2030',
          100: '#0F2C44',
          500: '#5AC8FF',
          600: '#5AC8FF',
          700: '#2EA3E0',
        },
      },
      boxShadow: {
        'v2-card': 'none',
        'v2-pop':  'none',
        'v2-soft': 'none',
      },
      borderRadius: {
        'v2-sm': '2px',
        'v2-md': '3px',
        'v2-lg': '4px',
        'v2-xl': '6px',
      },
    },
  },
  plugins: [],
}
