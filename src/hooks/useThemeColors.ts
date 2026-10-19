'use client'

import { useMemo } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { rgbToHex } from '@/config/themes'

/**
 * 將目前主題語意色轉成 hex，供 Recharts 等需 inline 色碼的元件使用。
 * @returns 常用圖表／UI hex 色與 chart 色盤陣列
 */
export function useThemeColors() {
  const { theme } = useTheme()
  const c = theme.colors

  return useMemo(() => {
    const chart = [
      rgbToHex(c.chart1),
      rgbToHex(c.chart2),
      rgbToHex(c.chart3),
      rgbToHex(c.chart4),
      rgbToHex(c.primary),
      rgbToHex(c.accent),
      rgbToHex(c.warning),
      rgbToHex(c.danger),
    ]
    return {
      bg: rgbToHex(c.bg),
      fg: rgbToHex(c.fg),
      card: rgbToHex(c.card),
      cardFg: rgbToHex(c.cardFg),
      muted: rgbToHex(c.muted),
      mutedFg: rgbToHex(c.mutedFg),
      border: rgbToHex(c.border),
      primary: rgbToHex(c.primary),
      accent: rgbToHex(c.accent),
      success: rgbToHex(c.success),
      danger: rgbToHex(c.danger),
      warning: rgbToHex(c.warning),
      chart,
      chart1: chart[0],
      chart2: chart[1],
      chart3: chart[2],
      chart4: chart[3],
    }
  }, [c])
}
