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
  DISGUISE_THEME_ID,
  applyThemeColors,
  resolveThemeId,
  type ThemeId,
  type ThemeDefinition,
} from '@/config/themes'
import {
  DISGUISE_STORAGE_KEY,
  DISGUISE_PREV_THEME_KEY,
  DISGUISE_DOCUMENT_TITLE,
  applyDisguiseAttribute,
  resolveDisguiseEnabled,
} from '@/config/disguise'

/** ThemeContext 對外提供的狀態與操作。 */
interface ThemeContextValue {
  /** 目前主題 ID */
  themeId: ThemeId
  /** 目前主題完整定義 */
  theme: ThemeDefinition
  /** 切換主題並持久化至 localStorage */
  setTheme: (id: ThemeId) => void
  /** 是否開啟上班摸魚／偽裝模式 */
  disguise: boolean
  /**
   * 開關偽裝模式。
   * 開啟時切到 chat 主題並記住先前主題；關閉時還原。
   */
  setDisguise: (enabled: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** 真實品牌分頁標題（關閉偽裝時還原） */
const REAL_DOCUMENT_TITLE = 'Sagafisc 智慧投研平台'

/**
 * 提供全站主題狀態：套用 CSS 變數、寫入 data-theme／data-disguise，並同步 localStorage。
 * @param children 子元件樹
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID)
  const [disguise, setDisguiseState] = useState(false)

  // 掛載後從 localStorage 還原（FOUC script 已先套用變數，此處對齊 React 狀態）
  useEffect(() => {
    const savedTheme = resolveThemeId(localStorage.getItem(THEME_STORAGE_KEY))
    const savedDisguise = resolveDisguiseEnabled(
      localStorage.getItem(DISGUISE_STORAGE_KEY),
    )
    setThemeId(savedTheme)
    setDisguiseState(savedDisguise)
    applyThemeColors(THEMES[savedTheme].colors, savedTheme)
    applyDisguiseAttribute(savedDisguise)
    document.title = savedDisguise ? DISGUISE_DOCUMENT_TITLE : REAL_DOCUMENT_TITLE
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    const resolved = resolveThemeId(id)
    setThemeId(resolved)
    applyThemeColors(THEMES[resolved].colors, resolved)
    localStorage.setItem(THEME_STORAGE_KEY, resolved)
  }, [])

  /**
   * 開關偽裝：寫入 data-disguise、分頁標題，並自動切換／還原 chat 主題。
   * @param enabled 是否開啟
   */
  const setDisguise = useCallback(
    (enabled: boolean) => {
      setDisguiseState(enabled)
      applyDisguiseAttribute(enabled)
      localStorage.setItem(DISGUISE_STORAGE_KEY, enabled ? '1' : '0')
      document.title = enabled ? DISGUISE_DOCUMENT_TITLE : REAL_DOCUMENT_TITLE

      if (enabled) {
        // 記住目前主題，再切到聊天風（已是 chat 則不覆寫 previous）
        const current = resolveThemeId(localStorage.getItem(THEME_STORAGE_KEY))
        if (current !== DISGUISE_THEME_ID) {
          localStorage.setItem(DISGUISE_PREV_THEME_KEY, current)
        }
        setThemeId(DISGUISE_THEME_ID)
        applyThemeColors(THEMES[DISGUISE_THEME_ID].colors, DISGUISE_THEME_ID)
        localStorage.setItem(THEME_STORAGE_KEY, DISGUISE_THEME_ID)
      } else {
        const prev = resolveThemeId(
          localStorage.getItem(DISGUISE_PREV_THEME_KEY) || DEFAULT_THEME_ID,
        )
        // 還原時避免停在 chat（若 previous 就是 chat 則回預設）
        const restore =
          prev === DISGUISE_THEME_ID ? DEFAULT_THEME_ID : prev
        setThemeId(restore)
        applyThemeColors(THEMES[restore].colors, restore)
        localStorage.setItem(THEME_STORAGE_KEY, restore)
        localStorage.removeItem(DISGUISE_PREV_THEME_KEY)
      }
    },
    [],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme: THEMES[themeId],
      setTheme,
      disguise,
      setDisguise,
    }),
    [themeId, setTheme, disguise, setDisguise],
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
