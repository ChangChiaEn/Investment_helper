'use client'

import { useEffect, useState, Suspense, ReactNode } from 'react'
import { Navigation } from '@/components/Navigation'
import { ToolDataProvider } from '@/contexts/ToolDataContext'
import { InventoryProvider } from '@/contexts/InventoryContext'
import { ToolCacheProvider } from '@/contexts/ToolCacheContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { RouteLoadingOverlay } from '@/components/RouteLoadingOverlay'
import { DisguiseHotkey } from '@/components/DisguiseHotkey'
import { DisguiseTextWalker } from '@/components/DisguiseTextWalker'
import { Loader } from '@/components/Loader'

interface AppShellProps {
  children: ReactNode
}

/**
 * 路由覆蓋層的 Suspense fallback（useSearchParams 需包在 Suspense 內）。
 * @returns 主內容區載入畫面
 */
function MainLoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader size="lg" text="載入中..." />
    </div>
  )
}

/**
 * 全站外殼：主題、Provider、側邊導覽與主內容區。
 * 掛載前只輸出固定載入畫面，確保 SSR 與首次客戶端 HTML 完全一致，消除 hydration 錯誤。
 * 掛載後以 RouteLoadingOverlay 在換頁期間顯示載入中，改善切換體感。
 * @param children - 各頁面內容
 * @returns 全站版面
 */
export function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 伺服器與首次 CSR 都渲染同一結構，掛載後再展開完整 UI
  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg text-fg">
        <Loader size="lg" text="載入中..." />
      </div>
    )
  }

  return (
    <ThemeProvider>
      <DisguiseHotkey />
      <ToolDataProvider>
        <InventoryProvider>
          <ToolCacheProvider>
            <div className="flex h-screen bg-bg text-fg">
              <Navigation />
              <main className="flex-1 overflow-auto">
                <DisguiseTextWalker>
                  <Suspense fallback={<MainLoadingFallback />}>
                    <RouteLoadingOverlay>{children}</RouteLoadingOverlay>
                  </Suspense>
                </DisguiseTextWalker>
              </main>
            </div>
          </ToolCacheProvider>
        </InventoryProvider>
      </ToolDataProvider>
    </ThemeProvider>
  )
}
