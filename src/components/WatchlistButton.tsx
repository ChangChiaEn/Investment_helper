'use client'

/**
 * 加入／移除庫存「關注」分類，以及導向深度分析。
 * （元件名保留 WatchlistButton 以減少呼叫端改動）
 */

import { Bookmark, BookmarkCheck, ArrowRight } from 'lucide-react'
import { useInventory } from '@/contexts/InventoryContext'
import { useRouteLoading } from '@/components/RouteLoadingOverlay'
import { navigateToTool, getAnalysisTool } from '@/utils/navigation'
import { useRouter } from 'next/navigation'
import type { AssetType } from '@/lib/domain'

interface WatchlistButtonProps {
  symbol: string
  name: string
  type: 'stock' | 'fund'
  source?: string
  className?: string
  showAnalyze?: boolean
}

/**
 * @param symbol - 標的代號
 * @param name - 標的名稱
 * @param type - 股票或基金
 * @param source - 可選來源標記
 * @param className - 外層額外 class
 * @param showAnalyze - 是否顯示深度分析按鈕
 * @returns 關注與分析按鈕組
 */
export function WatchlistButton({
  symbol,
  name,
  type,
  source,
  className = '',
  showAnalyze = true,
}: WatchlistButtonProps) {
  const { hasWatch, toggleWatch } = useInventory()
  const router = useRouter()
  const { startRouteLoading } = useRouteLoading()
  const assetType = type as AssetType
  const isWatched = hasWatch(symbol, assetType)

  /** 切換是否加入庫存「關注」 */
  const handleToggle = () => {
    toggleWatch({ symbol, name, assetType, source })
  }

  /** 導向對應深度分析頁 */
  const handleAnalyze = () => {
    const analysisTool = getAnalysisTool(type)
    const url = navigateToTool(analysisTool, { symbol, name, type, source })
    startRouteLoading()
    router.push(url)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isWatched
            ? 'bg-warning/20 text-warning hover:bg-warning/30'
            : 'bg-muted/50 text-muted-fg hover:bg-muted hover:text-fg'
        }`}
        title={isWatched ? '從庫存關注移除' : '加入庫存關注'}
      >
        {isWatched ? (
          <BookmarkCheck className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
      </button>
      {showAnalyze && (
        <button
          type="button"
          onClick={handleAnalyze}
          className="px-3 py-1.5 bg-primary/80 text-primary-fg rounded-lg hover:bg-primary transition-colors text-xs font-medium flex items-center gap-1"
        >
          深度分析
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
