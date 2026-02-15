'use client'

import { Bookmark, BookmarkCheck, ArrowRight } from 'lucide-react'
import { useWatchlist } from '@/contexts/WatchlistContext'
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

export function WatchlistButton({ symbol, name, type, source, className = '', showAnalyze = true }: WatchlistButtonProps) {
  const { has, toggle } = useWatchlist()
  const router = useRouter()
  const isWatched = has(symbol, type)

  const handleToggle = () => {
    toggle({ symbol, name, type, source })
  }

  const handleAnalyze = () => {
    const analysisTool = getAnalysisTool(type)
    const url = navigateToTool(analysisTool, { symbol, name, type, source })
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
