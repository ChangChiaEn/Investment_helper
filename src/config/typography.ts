/**
 * 全站字體／字級唯一來源。
 * 實際載入於 layout（next/font）；此檔集中常數，避免各頁各自指定字型。
 */

/**
 * 正文／UI 字型 CSS 變數名（對應 next/font variable）。
 * 注意：layout.tsx 的 next/font `variable` 必須寫字面量，不可引用此常數。
 */
export const FONT_SANS_VAR = '--font-sans'

/**
 * 等寬字型 CSS 變數名（代號、價格、API 路徑）。
 * 注意：layout.tsx 的 next/font `variable` 必須寫字面量，不可引用此常數。
 */
export const FONT_MONO_VAR = '--font-mono'

/**
 * 根字級（px）。Tailwind rem 會隨此縮放。
 * 修改此值即可整體放大／縮小全站文字。
 */
export const ROOT_FONT_SIZE_PX = 18

/**
 * 行高（無單位倍數）。
 */
export const BODY_LINE_HEIGHT = 1.6

/**
 * Tailwind fontFamily 對應字串（供 tailwind.config.js 引用時對齊）。
 * 實際值以 CSS var 為準。
 */
export const TAILWIND_FONT_SANS = [
  `var(${FONT_SANS_VAR})`,
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'sans-serif',
] as const

/** 等寬字型 fallback 鏈 */
export const TAILWIND_FONT_MONO = [
  `var(${FONT_MONO_VAR})`,
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Consolas',
  'monospace',
] as const
