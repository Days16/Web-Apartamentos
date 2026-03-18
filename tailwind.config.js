/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f172a',
          medium: '#334155',
          light: '#475569',
          lighter: '#64748b',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
        },
        teal: {
          DEFAULT: '#1a5f6e',
          dark:    '#0d3d47',
          darker:  '#0f3a47',
          mid:     '#207688',
          50:      '#e0f2fe',
          100:     '#7dd3fc',
        },
        gold: {
          DEFAULT: '#D4A843',
          dark:    '#8B6914',
          bg:      '#FEF0D0',
        },
        'light-bg': '#f5f5f5',
        'text-secondary': '#6a6a6a',
        'border-light': 'rgba(58, 58, 58, 0.08)',
        'error-red': '#c0392b',
        'success-green': '#1a5f6e',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans:  ['Jost', 'sans-serif'],
      },
      fontSize: {
        'eyebrow': ['clamp(8px,2vw,10px)', { letterSpacing: '0.2em', lineHeight: '1.2' }],
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.5' }],
        'lg': ['16px', { lineHeight: '1.5' }],
        'xl': ['18px', { lineHeight: '1.5' }],
        '2xl': ['20px', { lineHeight: '1.5' }],
        '3xl': ['24px', { lineHeight: '1.5' }],
        '4xl': ['28px', { lineHeight: '1.5' }],
        '5xl': ['32px', { lineHeight: '1.5' }],
        '6xl': ['40px', { lineHeight: '1.5' }],
      },
      lineHeight: {
        'tight': '1.2',
        'snug': '1.3',
        'normal': '1.5',
        'relaxed': '1.7',
        'loose': '2',
      },
      boxShadow: {
        'card':   '0 4px 24px rgba(15,23,42,0.07)',
        'card-lg':'0 12px 32px rgba(15,23,42,0.12)',
        'nav':    '0 2px 20px rgba(15,23,42,0.08)',
        'input-focus': '0 0 0 3px rgba(26, 95, 110, 0.1)',
        'input-error': '0 0 0 3px rgba(192, 57, 43, 0.1)',
      },
      zIndex: {
        '60':  '60',
        '100': '100',
        '200': '200',
        '250': '250',
        '300': '300',
        '999': '999',
      },
      minHeight: {
        'touch': '44px',
        'hero': 'clamp(60vh, 92vh, 100vh)',
      },
      minWidth: {
        'touch': '44px',
      },
      screens: {
        'xs': '480px',
      },
      spacing: {
        '18': '4.5rem',
        'clamp-sm': 'clamp(12px, 3vw, 20px)',
        'clamp-md': 'clamp(16px, 5vw, 80px)',
        'clamp-lg': 'clamp(40px, 10vw, 100px)',
      },
      borderRadius: {
        'input': '4px',
        'card': 'clamp(8px, 2vw, 16px)',
      },
      transitionDuration: {
        'fast': '0.2s',
      },
    },
  },
  plugins: [],
};
