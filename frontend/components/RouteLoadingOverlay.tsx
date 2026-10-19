'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader } from '@/components/Loader'

/** 路由載入控制：供 Link 以外的 router.push 在導航前啟動載入畫面 */
interface RouteLoadingContextValue {
  /**
   * 標記即將進行程式化導航，立即顯示主內容區載入中。
   * 新路由完成掛載後會自動關閉。
   */
  startRouteLoading: () => void
}

const RouteLoadingContext = createContext<RouteLoadingContextValue>({
  startRouteLoading: () => {},
})

/**
 * 取得路由載入控制，用於 router.push 等非 Link 導航前顯示載入中。
 * @returns startRouteLoading — 立即顯示載入覆蓋層
 */
export function useRouteLoading(): RouteLoadingContextValue {
  return useContext(RouteLoadingContext)
}

interface RouteLoadingOverlayProps {
  /** 主內容區子節點 */
  children: ReactNode
}

/**
 * 在同站內路由切換期間，於主內容區顯示載入中，直到新頁面完成掛載渲染。
 * 涵蓋：側邊欄 Link 點擊、瀏覽器前進/後退、以及透過 startRouteLoading 的程式化導航。
 * @param children - 主內容
 * @returns 含載入覆蓋層的主內容容器
 */
export function RouteLoadingOverlay({ children }: RouteLoadingOverlayProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const [isLoading, setIsLoading] = useState(false)
  // 是否有待關閉的載入（點擊或 popstate 觸發後，等 routeKey 變更再關）
  const pendingRef = useRef(false)
  const prevRouteKeyRef = useRef(routeKey)

  const startRouteLoading = useCallback(() => {
    pendingRef.current = true
    setIsLoading(true)
  }, [])

  // --- 攔截同站 <a> 點擊：在 Next 換頁前立刻顯示載入，改善體感 ---
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return

      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return

        const nextKey = `${url.pathname}?${url.searchParams.toString()}`
        const currentKey = `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`
        if (nextKey === currentKey) return

        pendingRef.current = true
        setIsLoading(true)
      } catch {
        // 無效 URL 略過
      }
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // --- 瀏覽器前進／後退：同樣顯示載入，避免內容空白 ---
  useEffect(() => {
    const onPopState = () => {
      pendingRef.current = true
      setIsLoading(true)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // --- 新路由掛載後：等進入繪製階段再關閉（僅在 routeKey 真的變更時觸發）---
  useEffect(() => {
    // 同一路由（例如僅點擊觸發 isLoading）不關閉，避免載入畫面提早消失
    if (prevRouteKeyRef.current === routeKey) return
    prevRouteKeyRef.current = routeKey
    pendingRef.current = false

    let cancelled = false
    let raf2 = 0

    // 雙 requestAnimationFrame：確保新頁面已進入瀏覽器繪製佇列
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) setIsLoading(false)
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [routeKey])

  // --- 安全閥：導航異常卡住時逾時關閉，避免永久遮罩 ---
  useEffect(() => {
    if (!isLoading) return
    const timer = window.setTimeout(() => {
      pendingRef.current = false
      setIsLoading(false)
    }, 12000)
    return () => window.clearTimeout(timer)
  }, [isLoading])

  return (
    <RouteLoadingContext.Provider value={{ startRouteLoading }}>
      <div className="relative h-full w-full">
        {isLoading && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-surface-950/90 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader size="lg" text="載入中..." />
          </div>
        )}
        {children}
      </div>
    </RouteLoadingContext.Provider>
  )
}
