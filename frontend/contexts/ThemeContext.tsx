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
  applyThemeColors,
  resolveThemeId,
  type ThemeId,
  type ThemeDefinition,
} from '@/config/themes'

/** ThemeContext 對外提供的狀態與操作。 */
interface ThemeContextValue {
  /** 目前主題 ID */
  themeId: ThemeId
  /** 目前主題完整定義 */
  theme: ThemeDefinition
  /** 切換主題並持久化至 localStorage */
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * 提供全站主題狀態：套用 CSS 變數、寫入 data-theme，並同步 localStorage。
 * @param children 子元件樹
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID)

  // 掛載後從 localStorage 還原（FOUC script 已先套用變數，此處對齊 React 狀態）
  useEffect(() => {
    const saved = resolveThemeId(localStorage.getItem(THEME_STORAGE_KEY))
    setThemeId(saved)
    applyThemeColors(THEMES[saved].colors, saved)
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    const resolved = resolveThemeId(id)
    setThemeId(resolved)
    applyThemeColors(THEMES[resolved].colors, resolved)
    localStorage.setItem(THEME_STORAGE_KEY, resolved)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme: THEMES[themeId],
      setTheme,
    }),
    [themeId, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * 讀取目前主題與切換函式。
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
