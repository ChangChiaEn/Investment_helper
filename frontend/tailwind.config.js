/** @type {import('tailwindcss').Config} */
/**
 * 語意色對應 CSS 變數（由 ThemeProvider / FOUC script 寫入）。
 * 使用 rgb(var(--color-*) / <alpha-value>) 以支援 bg-card/95 等 opacity 修飾。
 */
const withOpacity = (cssVar) => `rgb(var(${cssVar}) / <alpha-value>)`

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: withOpacity('--color-bg'),
        'bg-end': withOpacity('--color-bg-end'),
        fg: withOpacity('--color-fg'),
        card: {
          DEFAULT: withOpacity('--color-card'),
          fg: withOpacity('--color-card-fg'),
        },
        muted: {
          DEFAULT: withOpacity('--color-muted'),
          fg: withOpacity('--color-muted-fg'),
        },
        border: withOpacity('--color-border'),
        primary: {
          DEFAULT: withOpacity('--color-primary'),
          fg: withOpacity('--color-primary-fg'),
          soft: withOpacity('--color-primary-soft'),
          // 向後相容舊 class（primary-400 / primary-600 等）→ 映射語意主色階
          50: withOpacity('--color-primary-soft'),
          100: withOpacity('--color-primary-soft'),
          200: withOpacity('--color-primary-soft'),
          300: withOpacity('--color-primary'),
          400: withOpacity('--color-primary'),
          500: withOpacity('--color-primary'),
          600: withOpacity('--color-primary'),
          700: withOpacity('--color-primary'),
          800: withOpacity('--color-primary-soft'),
          900: withOpacity('--color-primary-soft'),
          950: withOpacity('--color-primary-soft'),
        },
        accent: {
          DEFAULT: withOpacity('--color-accent'),
          light: withOpacity('--color-accent'),
          dark: withOpacity('--color-primary'),
        },
        sidebar: {
          DEFAULT: withOpacity('--color-sidebar'),
          alt: withOpacity('--color-sidebar-alt'),
          fg: withOpacity('--color-sidebar-fg'),
          muted: withOpacity('--color-sidebar-muted'),
          border: withOpacity('--color-sidebar-border'),
          hover: withOpacity('--color-sidebar-hover'),
        },
        danger: {
          DEFAULT: withOpacity('--color-danger'),
          soft: withOpacity('--color-danger-soft'),
        },
        success: {
          DEFAULT: withOpacity('--color-success'),
          soft: withOpacity('--color-success-soft'),
        },
        warning: {
          DEFAULT: withOpacity('--color-warning'),
          soft: withOpacity('--color-warning-soft'),
        },
        ring: withOpacity('--color-ring'),
        chart: {
          1: withOpacity('--color-chart-1'),
          2: withOpacity('--color-chart-2'),
          3: withOpacity('--color-chart-3'),
          4: withOpacity('--color-chart-4'),
        },
        /*
         * surface-* 向後相容（舊深色 UI 慣例）：
         * - 低數字當「主字／次要字」（text-surface-100/300）→ fg / muted-fg
         * - 高數字當「區塊底／邊框」（bg-surface-800、border-surface-600）→ muted / border
         * 不可再把 100 映射成背景色，否則標題會與畫布糊成一團。
         */
        surface: {
          50: withOpacity('--color-card'),
          100: withOpacity('--color-fg'),
          200: withOpacity('--color-border'),
          300: withOpacity('--color-muted-fg'),
          400: withOpacity('--color-muted-fg'),
          500: withOpacity('--color-muted-fg'),
          600: withOpacity('--color-border'),
          700: withOpacity('--color-muted'),
          800: withOpacity('--color-muted'),
          900: withOpacity('--color-card'),
          950: withOpacity('--color-bg'),
        },
      },
    },
  },
  plugins: [],
}
