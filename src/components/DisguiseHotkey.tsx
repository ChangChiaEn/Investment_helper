'use client'

import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

/**
 * 全域緊急熱鍵：Ctrl+Shift+H 在「關閉」與「上次偽裝變體」間切換。
 * 輸入框／可編輯區內不觸發，避免干擾打字。
 */
export function DisguiseHotkey() {
  const { toggleDisguise } = useTheme()

  useEffect(() => {
    /**
     * 監聽 Ctrl+Shift+H。
     * @param e 鍵盤事件
     */
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && e.shiftKey)) return
      if (e.key !== 'H' && e.key !== 'h') return

      const target = e.target as HTMLElement | null
      // 在表單輸入中不攔截，避免與系統／瀏覽器快捷鍵衝突時誤觸
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      e.preventDefault()
      toggleDisguise()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleDisguise])

  return null
}
