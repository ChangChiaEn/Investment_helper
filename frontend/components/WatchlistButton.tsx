'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { navigateToTool, getAnalysisTool } from '@/utils/navigation'

interface WatchlistButtonProps {
  symbol: string
  name: string
  type: 'stock' | 'fund'
  source?: string
  className?: string
}

export function WatchlistButton({ symbol, name, type, source, className = '' }: WatchlistButtonProps) {
  const [isWatched, setIsWatched] = useState(false)

  const handleToggle = async () => {
    // TODO: 呼叫 API 新增/移除 watchlist
    setIsWatched(!isWatched)
    
    if (!isWatched) {
      // 新增到 watchlist
      try {
        const response = await fetch('/api/v1/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // TODO: 加入 Authorization header
          },
          body: JSON.stringify({
            type,
            symbol,
            name,
            source,
          }),
        })
        
        if (response.ok) {
          setIsWatched(true)
        }
      } catch (error) {
        console.error('Failed to add to watchlist:', error)
      }
    } else {
      // TODO: 從 watchlist 移除
    }
  }

  const handleAnalyze = () => {
    const analysisTool = getAnalysisTool(type)
    const url = navigateToTool(analysisTool, { symbol, name, type, source })
    window.location.href = url
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleToggle}
        className={`p-2 rounded-lg transition-colors ${
          isWatched
            ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={isWatched ? '已加入關注清單' : '加入關注清單'}
      >
        {isWatched ? (
          <BookmarkCheck className="w-5 h-5" />
        ) : (
          <Bookmark className="w-5 h-5" />
        )}
      </button>
      <button
        onClick={handleAnalyze}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
      >
        進階分析
      </button>
    </div>
  )
}

