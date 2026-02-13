'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TOOL_CONFIGS } from '@/config/tools'

interface WatchlistItem {
  id: string
  symbol: string
  name: string
  type: 'stock' | 'fund'
  price?: number
  change_pct?: number
}

export function HomeDashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: 從 API 載入 watchlist 資料
    // 目前使用 mock data
    setTimeout(() => {
      setWatchlist([])
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow p-6 border border-surface-200/50">
        <div className="animate-pulse">
          <div className="h-4 bg-surface-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-surface-200 rounded"></div>
            <div className="h-16 bg-surface-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-surface-200/50">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
        <span className="w-1 h-6 bg-gradient-to-b from-primary-600 to-blue-600 rounded-full"></span>
        我的關注清單
      </h2>
      {watchlist.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>還沒有關注任何標的</p>
          <p className="text-sm mt-2">開始使用工具來標記您感興趣的股票或基金</p>
        </div>
      ) : (
        <div className="space-y-3">
          {watchlist.map((item) => (
            <Link
              key={item.id}
              href={`/tools/${item.type === 'stock' ? 'gemini-stock-prophet' : 'fund-risk-analysis'}?symbol=${item.symbol}&name=${item.name}&type=${item.type}`}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.symbol}</div>
                </div>
                {item.price && (
                  <div className="text-right">
                    <div className="font-medium">${item.price.toFixed(2)}</div>
                    {item.change_pct && (
                      <div
                        className={`text-sm ${
                          item.change_pct >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.change_pct >= 0 ? '+' : ''}
                        {item.change_pct.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

