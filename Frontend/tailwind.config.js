/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic theme tokens — resolve to the CSS variables in src/styles/index.css,
        // so components that consume them (bg-surface, text-text-secondary, etc.) switch
        // automatically between the light and dark palettes without a `dark:` prefix.
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        border: 'var(--border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        primary: 'var(--primary)',
        'primary-accent': 'var(--primary-accent)',
        // NextGen BudgetBee brand palette — bright green + gold, matching the logo artwork.
        brand: {
          50: '#f0fdf4',
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
          50: '#fefcf7',
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
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slow-zoom': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out both',
        'slow-zoom': 'slow-zoom 20s ease-in-out infinite alternate',
        float: 'float 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
