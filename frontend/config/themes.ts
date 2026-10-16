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

/**
 * 四套主題定義（色值唯一來源）。
 * 對比原則：深底用淺字、淺底用深字；mutedFg／sidebarMuted 仍須可讀。
 */
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  hacker: {
    id: 'hacker',
    name: '駭客風',
    description: '近黑底與霓虹綠，沉浸式終端機感',
    colors: {
      // 深色畫布 → 近白主字；次要字提高亮度以利閱讀
      bg: '8 12 24',
      bgEnd: '12 18 36',
      fg: '248 250 252',
      card: '22 32 52',
      cardFg: '248 250 252',
      muted: '15 23 42',
      mutedFg: '186 198 214',
      border: '71 85 105',
      primary: '52 211 153',
      primaryFg: '2 6 23',
      primarySoft: '6 78 59',
      accent: '110 231 183',
      sidebar: '2 6 23',
      sidebarAlt: '10 16 30',
      sidebarFg: '248 250 252',
      sidebarMuted: '168 182 200',
      sidebarBorder: '51 65 85',
      sidebarHover: '30 41 59',
      danger: '252 165 165',
      dangerSoft: '69 10 10',
      success: '110 231 183',
      successSoft: '6 78 59',
      warning: '253 224 71',
      warningSoft: '69 26 3',
      ring: '52 211 153',
      chart1: '52 211 153',
      chart2: '56 189 248',
      chart3: '253 224 71',
      chart4: '252 165 165',
    },
  },
  camel: {
    id: 'camel',
    name: '駝色護眼風',
    description: '暖米色畫布與棕橄欖強調，長時間閱讀更舒適',
    colors: {
      // 淺暖底 → 深棕字；側欄深底 → 近白字
      bg: '250 243 230',
      bgEnd: '242 228 204',
      fg: '36 24 14',
      card: '255 252 246',
      cardFg: '36 24 14',
      muted: '235 220 195',
      mutedFg: '74 52 32',
      border: '180 148 110',
      primary: '110 78 40',
      primaryFg: '255 252 246',
      primarySoft: '232 213 183',
      accent: '74 98 42',
      sidebar: '58 42 28',
      sidebarAlt: '74 54 36',
      sidebarFg: '255 250 240',
      sidebarMuted: '230 210 180',
      sidebarBorder: '42 30 18',
      sidebarHover: '90 66 44',
      danger: '160 40 30',
      dangerSoft: '253 226 220',
      success: '56 96 48',
      successSoft: '220 236 208',
      warning: '140 88 16',
      warningSoft: '255 236 200',
      ring: '110 78 40',
      chart1: '110 78 40',
      chart2: '74 98 42',
      chart3: '140 88 16',
      chart4: '160 40 30',
    },
  },
  pink: {
    id: 'pink',
    name: '粉色可愛風',
    description: '柔粉卡面與莓紅主色，輕盈可愛',
    colors: {
      // 淺粉底 → 深紫紅字；側欄深玫紅 → 近白字
      bg: '255 244 248',
      bgEnd: '252 228 240',
      fg: '48 12 32',
      card: '255 255 255',
      cardFg: '48 12 32',
      muted: '252 226 238',
      mutedFg: '96 28 64',
      border: '244 180 214',
      primary: '190 24 93',
      primaryFg: '255 255 255',
      primarySoft: '252 231 243',
      accent: '219 39 119',
      sidebar: '88 16 48',
      sidebarAlt: '112 20 60',
      sidebarFg: '255 245 250',
      sidebarMuted: '252 210 230',
      sidebarBorder: '72 12 40',
      sidebarHover: '130 30 72',
      danger: '185 28 56',
      dangerSoft: '255 228 230',
      success: '4 120 87',
      successSoft: '209 250 229',
      warning: '180 64 8',
      warningSoft: '255 237 213',
      ring: '219 39 119',
      chart1: '219 39 119',
      chart2: '147 51 234',
      chart3: '234 88 12',
      chart4: '13 148 136',
    },
  },
  calm: {
    id: 'calm',
    name: '白藍冷靜風',
    description: '白與冰藍色調，清晰專業的冷靜介面',
    colors: {
      // 淺灰白底 → 近黑字；側欄深藍 → 近白字
      bg: '244 247 251',
      bgEnd: '226 232 240',
      fg: '2 6 23',
      card: '255 255 255',
      cardFg: '2 6 23',
      muted: '226 232 240',
      mutedFg: '51 65 85',
      border: '148 163 184',
      primary: '29 78 216',
      primaryFg: '255 255 255',
      primarySoft: '219 234 254',
      accent: '3 105 161',
      sidebar: '2 6 23',
      sidebarAlt: '15 23 42',
      sidebarFg: '248 250 252',
      sidebarMuted: '186 198 214',
      sidebarBorder: '30 41 59',
      sidebarHover: '30 41 59',
      danger: '185 28 28',
      dangerSoft: '254 226 226',
      success: '21 128 61',
      successSoft: '220 252 231',
      warning: '161 98 7',
      warningSoft: '254 243 199',
      ring: '37 99 235',
      chart1: '29 78 216',
      chart2: '3 105 161',
      chart3: '180 83 9',
      chart4: '185 28 28',
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
