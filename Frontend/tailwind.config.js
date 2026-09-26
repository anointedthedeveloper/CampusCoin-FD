/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background:         'rgb(var(--background) / <alpha-value>)',
        surface:            'rgb(var(--surface) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--surface-elevated) / <alpha-value>)',
        border:             'var(--border)',
        'text-primary':     'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary':   'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted':       'rgb(var(--text-muted) / <alpha-value>)',
        primary:            'rgb(var(--primary) / <alpha-value>)',
        'primary-accent':   'rgb(var(--primary-accent) / <alpha-value>)',

        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        cream: {
          DEFAULT: '#fdf8ee',
          50:  '#fefcf7',
          100: '#fdf8ee',
          200: '#faeed2',
        },
        accent: {
          DEFAULT: '#f59e0b',
          100: '#fef3c7',
          600: '#f59e0b',
          700: '#d97706',
        },
      },

      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      borderRadius: {
        '4xl': '2rem',
      },

      boxShadow: {
        // Crisp, layered shadows — feels premium, not heavy
        'card':   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
        'panel':  '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
        'modal':  '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        'btn':    '0 1px 2px rgba(0,0,0,0.10)',
        'btn-primary': '0 2px 8px rgba(22,163,74,0.30)',
        'btn-primary-hover': '0 4px 14px rgba(22,163,74,0.35)',
        'inset':  'inset 0 1px 2px rgba(0,0,0,0.06)',
        // Dark-mode equivalents (used explicitly where needed)
        'dark-card':       '0 1px 4px rgba(0,0,0,0.30)',
        'dark-card-hover': '0 4px 16px rgba(0,0,0,0.40)',
        'dark-panel':      '0 4px 24px rgba(0,0,0,0.35)',
      },

      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slow-zoom': {
          '0%':   { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-4px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.6' },
        },
      },

      animation: {
        'fade-in-up':    'fade-in-up 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':       'fade-in 0.3s ease-out both',
        'scale-in':      'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-left': 'slide-in-left 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'slow-zoom':     'slow-zoom 20s ease-in-out infinite alternate',
        float:           'float 3.2s ease-in-out infinite',
        'pulse-soft':    'pulse-soft 2s ease-in-out infinite',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
