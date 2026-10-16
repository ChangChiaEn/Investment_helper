/**
 * 全站語意色票唯一來源。
 * 色值以「R G B」空白分隔字串儲存，供 CSS 變數與 Tailwind opacity 修飾使用。
 */

/** 單一主題的語意色 token（值為 RGB 三元組字串，例如 `"16 185 129"`）。 */
export interface ThemeColors {
  /** 主畫布背景 */
  bg: string
  /** 主畫布次要漸層端點 */
  bgEnd: string
  /** 主文字 */
  fg: string
  /** 內容卡片背景 */
  card: string
  /** 內容卡片文字 */
  cardFg: string
  /** 次要區塊背景（輸入框、hover 底） */
  muted: string
  /** 次要說明文字 */
  mutedFg: string
  /** 邊框 */
  border: string
  /** 主色（CTA、active） */
  primary: string
  /** 主色上的文字 */
  primaryFg: string
  /** 較淺主色（icon 底、漸層起點） */
  primarySoft: string
  /** 品牌高光（loader、強調） */
  accent: string
  /** 側欄背景 */
  sidebar: string
  /** 側欄次要背景（漸層／header） */
  sidebarAlt: string
  /** 側欄文字 */
  sidebarFg: string
  /** 側欄次要文字 */
  sidebarMuted: string
  /** 側欄邊框 */
  sidebarBorder: string
  /** 側欄 hover 底 */
  sidebarHover: string
  /** 危險／錯誤 */
  danger: string
  /** 危險淡底 */
  dangerSoft: string
  /** 成功 */
  success: string
  /** 成功淡底 */
  successSoft: string
  /** 警告 */
  warning: string
  /** 警告淡底 */
  warningSoft: string
  /** focus ring */
  ring: string
  /** 圖表色 1–4 */
  chart1: string
  chart2: string
  chart3: string
  chart4: string
}

/** 主題定義（含 UI 顯示用 metadata）。 */
export interface ThemeDefinition {
  /** 主題識別碼（寫入 localStorage／data-theme） */
  id: ThemeId
  /** 繁中顯示名稱 */
  name: string
  /** 簡短說明 */
  description: string
  /** 語意色票 */
  colors: ThemeColors
}

/** 支援的主題 ID。 */
export type ThemeId = 'hacker' | 'camel' | 'pink' | 'calm'

/** localStorage 鍵名。 */
export const THEME_STORAGE_KEY = 'app_theme'

/** 預設主題（駭客風）。 */
export const DEFAULT_THEME_ID: ThemeId = 'hacker'

/**
 * CSS 變數名稱對應表（ThemeColors 鍵 → --color-*）。
 * 用於套用主題與 FOUC 腳本。
 */
export const THEME_CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  bg: '--color-bg',
  bgEnd: '--color-bg-end',
  fg: '--color-fg',
  card: '--color-card',
  cardFg: '--color-card-fg',
  muted: '--color-muted',
  mutedFg: '--color-muted-fg',
  border: '--color-border',
  primary: '--color-primary',
  primaryFg: '--color-primary-fg',
  primarySoft: '--color-primary-soft',
  accent: '--color-accent',
  sidebar: '--color-sidebar',
  sidebarAlt: '--color-sidebar-alt',
  sidebarFg: '--color-sidebar-fg',
  sidebarMuted: '--color-sidebar-muted',
  sidebarBorder: '--color-sidebar-border',
  sidebarHover: '--color-sidebar-hover',
  danger: '--color-danger',
  dangerSoft: '--color-danger-soft',
  success: '--color-success',
  successSoft: '--color-success-soft',
  warning: '--color-warning',
  warningSoft: '--color-warning-soft',
  ring: '--color-ring',
  chart1: '--color-chart-1',
  chart2: '--color-chart-2',
  chart3: '--color-chart-3',
  chart4: '--color-chart-4',
}

/**
 * 將主題色票寫入指定元素的 CSS 變數，並設定 data-theme。
 * @param colors 語意色票
 * @param themeId 主題 ID
 * @param el 目標元素，預設為 document.documentElement
 */
export function applyThemeColors(
  colors: ThemeColors,
  themeId: ThemeId,
  el: HTMLElement = document.documentElement,
): void {
  el.setAttribute('data-theme', themeId)
  for (const key of Object.keys(THEME_CSS_VAR_MAP) as (keyof ThemeColors)[]) {
    el.style.setProperty(THEME_CSS_VAR_MAP[key], colors[key])
  }
}

/**
 * 將 RGB 字串轉成 `#rrggbb`（供圖表 inline style 使用）。
 * @param rgb 空白分隔的 RGB，例如 `"16 185 129"`
 * @returns hex 色碼；格式不合法時回傳 `#000000`
 */
export function rgbToHex(rgb: string): string {
  const parts = rgb.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '#000000'
  const [r, g, b] = parts.map((n) => Math.max(0, Math.min(255, n)))
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

/** 四套主題定義（色值唯一來源）。 */
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  hacker: {
    id: 'hacker',
    name: '駭客風',
    description: '近黑底與霓虹綠，沉浸式終端機感',
    colors: {
      bg: '13 17 32',
      bgEnd: '15 23 42',
      fg: '226 232 240',
      card: '30 41 59',
      cardFg: '226 232 240',
      muted: '15 23 42',
      mutedFg: '148 163 184',
      border: '51 65 85',
      primary: '16 185 129',
      primaryFg: '2 6 23',
      primarySoft: '6 78 59',
      accent: '52 211 153',
      sidebar: '2 6 23',
      sidebarAlt: '15 23 42',
      sidebarFg: '203 213 225',
      sidebarMuted: '100 116 139',
      sidebarBorder: '30 41 59',
      sidebarHover: '30 41 59',
      danger: '248 113 113',
      dangerSoft: '69 10 10',
      success: '52 211 153',
      successSoft: '6 78 59',
      warning: '251 191 36',
      warningSoft: '69 26 3',
      ring: '16 185 129',
      chart1: '16 185 129',
      chart2: '56 189 248',
      chart3: '251 191 36',
      chart4: '248 113 113',
    },
  },
  camel: {
    id: 'camel',
    name: '駝色護眼風',
    description: '暖米色畫布與低對比棕橄欖，長時間閱讀更舒適',
    colors: {
      bg: '245 235 220',
      bgEnd: '237 224 200',
      fg: '61 46 33',
      card: '255 250 240',
      cardFg: '61 46 33',
      muted: '237 224 200',
      mutedFg: '120 97 74',
      border: '212 184 150',
      primary: '140 110 70',
      primaryFg: '255 250 240',
      primarySoft: '232 213 183',
      accent: '122 138 74',
      sidebar: '92 74 55',
      sidebarAlt: '107 86 64',
      sidebarFg: '245 235 220',
      sidebarMuted: '212 184 150',
      sidebarBorder: '74 58 43',
      sidebarHover: '74 58 43',
      danger: '185 70 55',
      dangerSoft: '253 226 220',
      success: '90 122 74',
      successSoft: '226 237 214',
      warning: '180 120 40',
      warningSoft: '255 236 200',
      ring: '140 110 70',
      chart1: '140 110 70',
      chart2: '122 138 74',
      chart3: '180 120 40',
      chart4: '185 70 55',
    },
  },
  pink: {
    id: 'pink',
    name: '粉色可愛風',
    description: '柔粉卡面與莓紅主色，輕盈可愛',
    colors: {
      bg: '255 241 246',
      bgEnd: '252 231 243',
      fg: '76 29 49',
      card: '255 255 255',
      cardFg: '76 29 49',
      muted: '252 231 243',
      mutedFg: '157 90 120',
      border: '251 207 232',
      primary: '219 39 119',
      primaryFg: '255 255 255',
      primarySoft: '252 231 243',
      accent: '244 114 182',
      sidebar: '131 24 67',
      sidebarAlt: '157 23 77',
      sidebarFg: '253 242 248',
      sidebarMuted: '249 168 212',
      sidebarBorder: '157 23 77',
      sidebarHover: '157 23 77',
      danger: '225 29 72',
      dangerSoft: '255 228 230',
      success: '16 185 129',
      successSoft: '209 250 229',
      warning: '234 88 12',
      warningSoft: '255 237 213',
      ring: '236 72 153',
      chart1: '236 72 153',
      chart2: '192 132 252',
      chart3: '251 146 60',
      chart4: '45 212 191',
    },
  },
  calm: {
    id: 'calm',
    name: '白藍冷靜風',
    description: '白與冰藍色調，清晰專業的冷靜介面',
    colors: {
      bg: '241 245 249',
      bgEnd: '226 232 240',
      fg: '15 23 42',
      card: '255 255 255',
      cardFg: '15 23 42',
      muted: '241 245 249',
      mutedFg: '100 116 139',
      border: '226 232 240',
      primary: '37 99 235',
      primaryFg: '255 255 255',
      primarySoft: '219 234 254',
      accent: '14 165 233',
      sidebar: '15 23 42',
      sidebarAlt: '30 41 59',
      sidebarFg: '226 232 240',
      sidebarMuted: '148 163 184',
      sidebarBorder: '51 65 85',
      sidebarHover: '51 65 85',
      danger: '220 38 38',
      dangerSoft: '254 226 226',
      success: '22 163 74',
      successSoft: '220 252 231',
      warning: '217 119 6',
      warningSoft: '254 243 199',
      ring: '59 130 246',
      chart1: '37 99 235',
      chart2: '14 165 233',
      chart3: '245 158 11',
      chart4: '239 68 68',
    },
  },
}

/** 供設定頁等 UI 依序渲染的主題列表。 */
export const THEME_LIST: ThemeDefinition[] = [
  THEMES.hacker,
  THEMES.camel,
  THEMES.pink,
  THEMES.calm,
]

/**
 * 解析並回傳合法主題 ID；無效時回傳預設。
 * @param value 可能來自 localStorage 的字串
 * @returns 合法 ThemeId
 */
export function resolveThemeId(value: string | null | undefined): ThemeId {
  if (value && value in THEMES) return value as ThemeId
  return DEFAULT_THEME_ID
}
