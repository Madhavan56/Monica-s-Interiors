// Design tokens (design spec §1–2) exposed as Tailwind theme values backed by CSS variables,
// so light/dark switching needs no `dark:` variants.
const v = (name) => `var(--color-${name})`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: { sm: '640px', lg: '1024px', xl: '1440px' },
    extend: {
      colors: {
        bg: v('bg'),
        surface: { DEFAULT: v('surface'), alt: v('surface-alt'), sunken: v('surface-sunken') },
        ink: { DEFAULT: v('text'), secondary: v('text-secondary'), tertiary: v('text-tertiary') },
        primary: { DEFAULT: v('primary'), hover: v('primary-hover'), on: v('on-primary') },
        accent: { DEFAULT: v('accent'), text: v('accent-text') },
        line: { DEFAULT: v('border'), strong: v('border-strong') },
        success: { DEFAULT: v('status-success'), bg: v('status-success-bg') },
        warning: { DEFAULT: v('status-warning'), bg: v('status-warning-bg') },
        error: { DEFAULT: v('status-error'), bg: v('status-error-bg') },
        info: { DEFAULT: v('status-info'), bg: v('status-info-bg') },
      },
      fontFamily: {
        display: ['Fraunces Variable', 'Fraunces', 'Georgia', 'serif'],
        sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        body: ['1rem', { lineHeight: '1.5rem' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        h4: ['1.125rem', { lineHeight: '1.625rem' }],
        h3: ['clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)', { lineHeight: '1.33' }],
        h2: ['clamp(1.625rem, 1.3rem + 1.4vw, 2.25rem)', { lineHeight: '1.22' }],
        h1: ['clamp(2rem, 1.4rem + 2.4vw, 3rem)', { lineHeight: '1.17' }],
        display: ['clamp(2.5rem, 1.6rem + 3.6vw, 4rem)', { lineHeight: '1.12' }],
      },
      borderRadius: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
      boxShadow: { xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)', xl: 'var(--shadow-xl)' },
      maxWidth: { content: '1360px' },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)', out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)', spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
