/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primaryHover)',
          pressed: 'var(--color-primaryPressed)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondaryHover)',
        },
        accent: 'var(--color-accent)',
        bg: {
          primary: 'var(--color-bgPrimary)',
          surface: 'var(--color-bgSurface)',
          elevated: 'var(--color-bgElevated)',
          overlay: 'var(--color-bgOverlay)',
        },
        surface: {
          primary: 'var(--color-bgPrimary)',
          secondary: 'var(--color-bgSurface)',
          elevated: 'var(--color-bgElevated)',
          overlay: 'var(--color-bgOverlay)',
        },
        text: {
          primary: 'var(--color-textPrimary)',
          secondary: 'var(--color-textSecondary)',
          muted: 'var(--color-textMuted)',
          disabled: 'var(--color-textDisabled)',
        },
        on: {
          primary: 'var(--color-onPrimary)',
          surface: 'var(--color-onSurface)',
        },
        border: {
          default: 'var(--color-borderDefault)',
          subtle: 'var(--color-borderSubtle)',
          focus: 'var(--color-borderFocus)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.04)',
        'xs-dark': '0 1px 2px rgba(0,0,0,0.3)',
        sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'sm-dark': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        md: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
        'md-dark': '0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
        lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
        'lg-dark': '0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.4)',
        xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
        'xl-dark': '0 20px 25px rgba(0,0,0,0.6), 0 10px 10px rgba(0,0,0,0.5)',
        '2xl': '0 25px 50px rgba(0,0,0,0.15)',
        '2xl-dark': '0 25px 50px rgba(0,0,0,0.7)',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        fast: '100ms',
        normal: '150ms',
        slow: '200ms',
        slower: '300ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      scale: {
        102: '1.02',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
