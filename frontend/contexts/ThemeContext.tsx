'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME_ID,
  DISGUISE_THEME_IDS,
  applyThemeColors,
  resolveThemeId,
  type ThemeId,
  type ThemeDefinition,
} from '@/config/themes'
import {
  DISGUISE_STORAGE_KEY,
  DISGUISE_PREV_THEME_KEY,
  DISGUISE_LAST_VARIANT_KEY,
  DEFAULT_DISGUISE_VARIANT,
  applyDisguiseAttribute,
  resolveDisguiseVariant,
  getDisguiseDocumentTitle,
  getDisguiseThemeId,
  maskText,
  type DisguiseVariant,
} from '@/config/disguise'

/** ThemeContext 對外提供的狀態與操作。 */
interface ThemeContextValue {
  /** 目前主題 ID */
  themeId: ThemeId
  /** 目前主題完整定義 */
  theme: ThemeDefinition
  /** 切換主題並持久化至 localStorage */
  setTheme: (id: ThemeId) => void
  /** 是否開啟任一偽裝變體 */
  disguise: boolean
  /** 目前偽裝變體（off 表示關閉） */
  disguiseVariant: DisguiseVariant
  /**
   * 設定偽裝變體。
   * 非 off 時切到對應主題並記住先前主題；off 時還原。
   */
  setDisguiseVariant: (variant: DisguiseVariant) => void
  /**
   * 相容舊 API：true → 開啟上次／預設變體；false → 關閉。
   */
  setDisguise: (enabled: boolean) => void
  /** 緊急熱鍵：在 off 與上次變體間切換 */
  toggleDisguise: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** 真實品牌分頁標題（關閉偽裝時還原） */
const REAL_DOCUMENT_TITLE = 'Sagafisc 智慧投研平台'

/**
 * 判斷主題是否為偽裝專用色票。
 * @param id 主題 ID
 */
function isDisguiseTheme(id: ThemeId): boolean {
  return DISGUISE_THEME_IDS.includes(id)
}

/**
 * 提供全站主題狀態：套用 CSS 變數、寫入 data-theme／data-disguise，並同步 localStorage。
 * @param children 子元件樹
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID)
  const [disguiseVariant, setDisguiseVariantState] =
    useState<DisguiseVariant>('off')

  // 掛載後從 localStorage 還原（FOUC script 已先套用變數，此處對齊 React 狀態）
  useEffect(() => {
    const savedTheme = resolveThemeId(localStorage.getItem(THEME_STORAGE_KEY))
    const savedVariant = resolveDisguiseVariant(
      localStorage.getItem(DISGUISE_STORAGE_KEY),
    )
    setThemeId(savedTheme)
    setDisguiseVariantState(savedVariant)
    applyThemeColors(THEMES[savedTheme].colors, savedTheme)
    applyDisguiseAttribute(savedVariant)
    document.title =
      savedVariant === 'off'
        ? REAL_DOCUMENT_TITLE
        : getDisguiseDocumentTitle(savedVariant)
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    const resolved = resolveThemeId(id)
    setThemeId(resolved)
    applyThemeColors(THEMES[resolved].colors, resolved)
    localStorage.setItem(THEME_STORAGE_KEY, resolved)
  }, [])

  /**
   * 設定偽裝變體並同步主題／標題／data-disguise。
   * @param variant 目標變體
   */
  const setDisguiseVariant = useCallback((variant: DisguiseVariant) => {
    setDisguiseVariantState(variant)
    applyDisguiseAttribute(variant)
    localStorage.setItem(DISGUISE_STORAGE_KEY, variant)

    if (variant === 'off') {
      document.title = REAL_DOCUMENT_TITLE
      const prev = resolveThemeId(
        localStorage.getItem(DISGUISE_PREV_THEME_KEY) || DEFAULT_THEME_ID,
      )
      const restore = isDisguiseTheme(prev) ? DEFAULT_THEME_ID : prev
      setThemeId(restore)
      applyThemeColors(THEMES[restore].colors, restore)
      localStorage.setItem(THEME_STORAGE_KEY, restore)
      localStorage.removeItem(DISGUISE_PREV_THEME_KEY)
      return
    }

    // 記住上次非 off 變體，供熱鍵還原
    localStorage.setItem(DISGUISE_LAST_VARIANT_KEY, variant)
    document.title = getDisguiseDocumentTitle(variant)

    const current = resolveThemeId(localStorage.getItem(THEME_STORAGE_KEY))
    if (!isDisguiseTheme(current)) {
      localStorage.setItem(DISGUISE_PREV_THEME_KEY, current)
    }

    const themeKey = getDisguiseThemeId(variant) ?? 'chat'
    setThemeId(themeKey)
    applyThemeColors(THEMES[themeKey].colors, themeKey)
    localStorage.setItem(THEME_STORAGE_KEY, themeKey)
  }, [])

  const setDisguise = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        setDisguiseVariant('off')
        return
      }
      const last = resolveDisguiseVariant(
        localStorage.getItem(DISGUISE_LAST_VARIANT_KEY),
      )
      setDisguiseVariant(last === 'off' ? DEFAULT_DISGUISE_VARIANT : last)
    },
    [setDisguiseVariant],
  )

  const toggleDisguise = useCallback(() => {
    const current = resolveDisguiseVariant(
      localStorage.getItem(DISGUISE_STORAGE_KEY),
    )
    if (current !== 'off') {
      setDisguiseVariant('off')
      return
    }
    const last = resolveDisguiseVariant(
      localStorage.getItem(DISGUISE_LAST_VARIANT_KEY),
    )
    setDisguiseVariant(last === 'off' ? DEFAULT_DISGUISE_VARIANT : last)
  }, [setDisguiseVariant])

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme: THEMES[themeId],
      setTheme,
      disguise: disguiseVariant !== 'off',
      disguiseVariant,
      setDisguiseVariant,
      setDisguise,
      toggleDisguise,
    }),
    [
      themeId,
      setTheme,
      disguiseVariant,
      setDisguiseVariant,
      setDisguise,
      toggleDisguise,
    ],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * 讀取目前主題、偽裝狀態與切換函式。
 * @returns ThemeContextValue
 * @throws 未包在 ThemeProvider 內時拋錯
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme 必須在 ThemeProvider 內使用')
  }
  return ctx
}

/**
 * 回傳文案遮罩函式：偽裝開啟時依詞彙表替換。
 * @returns mask(text) → 顯示用字串
 */
export function useMask(): (text: string) => string {
  const { disguise } = useTheme()
  return useCallback((text: string) => maskText(text, disguise), [disguise])
}
