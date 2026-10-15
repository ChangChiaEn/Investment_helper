'use client'

import { Bookmark, BookmarkCheck, ArrowRight } from 'lucide-react'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { useRouteLoading } from '@/components/RouteLoadingOverlay'
import { navigateToTool, getAnalysisTool } from '@/utils/navigation'
import { useRouter } from 'next/navigation'

interface WatchlistButtonProps {
  symbol: string
  name: string
  type: 'stock' | 'fund'
  source?: string
  className?: string
  showAnalyze?: boolean
}

/**
 * 關注清單加入／移除，以及導向深度分析工具的按鈕列。
 * @param symbol - 標的代號
 * @param name - 標的名稱
 * @param type - 股票或基金
 * @param source - 可選來源標記
 * @param className - 外層額外 class
 * @param showAnalyze - 是否顯示深度分析按鈕
 * @returns 關注與分析按鈕組
 */
export function WatchlistButton({ symbol, name, type, source, className = '', showAnalyze = true }: WatchlistButtonProps) {
  const { has, toggle } = useWatchlist()
  const router = useRouter()
  const { startRouteLoading } = useRouteLoading()
  const isWatched = has(symbol, type)

  /** 切換是否加入關注清單 */
  const handleToggle = () => {
    toggle({ symbol, name, type, source })
  }

  /** 導向對應深度分析頁；先顯示載入中再換頁 */
  const handleAnalyze = () => {
    const analysisTool = getAnalysisTool(type)
    const url = navigateToTool(analysisTool, { symbol, name, type, source })
    startRouteLoading()
    router.push(url)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleToggle}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isWatched
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'bg-surface-700/50 text-surface-400 hover:bg-surface-600/50 hover:text-surface-300'
        }`}
        title={isWatched ? '從關注清單移除' : '加入關注清單'}
      >
        {isWatched ? (
          <BookmarkCheck className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
      </button>
      {showAnalyze && (
        <button
          onClick={handleAnalyze}
          className="px-3 py-1.5 bg-primary-600/80 text-white rounded-lg hover:bg-primary-500 transition-colors text-xs font-medium flex items-center gap-1"
        >
          深度分析
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
