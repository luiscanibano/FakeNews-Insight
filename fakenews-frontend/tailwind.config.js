/** @type {import('tailwindcss').Config} */
const withAlpha = (cssVar) => `rgb(from var(${cssVar}) r g b / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: withAlpha('--border'),
        input: withAlpha('--input'),
        ring: withAlpha('--ring'),
        background: withAlpha('--background'),
        foreground: withAlpha('--foreground'),
        'surface-container-high': withAlpha('--surface-container-high'),
        'tertiary-fixed-dim': withAlpha('--tertiary-fixed-dim'),
        'inverse-primary': withAlpha('--inverse-primary'),
        'surface-container-lowest': withAlpha('--surface-container-lowest'),
        'on-surface-variant': withAlpha('--on-surface-variant'),
        'surface-container': withAlpha('--surface-container'),
        tertiary: withAlpha('--tertiary'),
        'on-surface': withAlpha('--on-surface'),
        'inverse-on-surface': withAlpha('--inverse-on-surface'),
        'surface-variant': withAlpha('--surface-variant'),
        'on-primary-fixed': withAlpha('--on-primary-fixed'),
        'secondary-fixed': withAlpha('--secondary-fixed'),
        'on-secondary': withAlpha('--on-secondary'),
        'on-tertiary': withAlpha('--on-tertiary'),
        'primary-dim': withAlpha('--primary-dim'),
        'primary-fixed': withAlpha('--primary-fixed'),
        'on-background': withAlpha('--on-background'),
        surface: withAlpha('--surface'),
        'outline-variant': withAlpha('--outline-variant'),
        'secondary-container': withAlpha('--secondary-container'),
        'tertiary-dim': withAlpha('--tertiary-dim'),
        'surface-tint': withAlpha('--surface-tint'),
        'on-tertiary-fixed-variant': withAlpha('--on-tertiary-fixed-variant'),
        outline: withAlpha('--outline'),
        'on-error': withAlpha('--on-error'),
        'surface-bright': withAlpha('--surface-bright'),
        'on-tertiary-fixed': withAlpha('--on-tertiary-fixed'),
        'on-primary-container': withAlpha('--on-primary-container'),
        'on-secondary-fixed-variant': withAlpha('--on-secondary-fixed-variant'),
        error: withAlpha('--error'),
        'primary-fixed-dim': withAlpha('--primary-fixed-dim'),
        'on-secondary-fixed': withAlpha('--on-secondary-fixed'),
        'on-primary-fixed-variant': withAlpha('--on-primary-fixed-variant'),
        'secondary-dim': withAlpha('--secondary-dim'),
        'on-primary': withAlpha('--on-primary'),
        'surface-container-highest': withAlpha('--surface-container-highest'),
        'secondary-fixed-dim': withAlpha('--secondary-fixed-dim'),
        'tertiary-fixed': withAlpha('--tertiary-fixed'),
        'surface-container-low': withAlpha('--surface-container-low'),
        'error-container': withAlpha('--error-container'),
        'on-tertiary-container': withAlpha('--on-tertiary-container'),
        'on-secondary-container': withAlpha('--on-secondary-container'),
        primary: {
          DEFAULT: withAlpha('--primary'),
          foreground: withAlpha('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withAlpha('--secondary'),
          foreground: withAlpha('--secondary-foreground'),
        },
        destructive: {
          DEFAULT: withAlpha('--destructive'),
          foreground: withAlpha('--primary-foreground'),
        },
        muted: {
          DEFAULT: withAlpha('--muted'),
          foreground: withAlpha('--muted-foreground'),
        },
        accent: {
          DEFAULT: withAlpha('--accent'),
          foreground: withAlpha('--accent-foreground'),
        },
        popover: {
          DEFAULT: withAlpha('--popover'),
          foreground: withAlpha('--popover-foreground'),
        },
        card: {
          DEFAULT: withAlpha('--card'),
          foreground: withAlpha('--card-foreground'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Geist Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
        shine: 'shine 1.5s ease-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shine: {
          '100%': { left: '125%' },
        },
      },
    },
  },
  plugins: [],
}

