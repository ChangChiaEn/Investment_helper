'use client'

import { useMask } from '@/contexts/ThemeContext'

/**
 * 將子字串依偽裝詞彙表替換後渲染。
 * @param children 原始文案
 */
export function Masked({ children }: { children: string }) {
  const mask = useMask()
  return <>{mask(children)}</>
}
