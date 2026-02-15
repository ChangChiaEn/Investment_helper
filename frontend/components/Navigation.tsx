'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAVIGATION_TOOLS, ADVANCED_TOOLS } from '@/config/tools'
import { Home, Settings, Star, ChevronDown, ChevronRight, ArrowRight, Trash2 } from 'lucide-react'
import { ToolIcon } from '@/components/ToolIcons'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { navigateToTool, getAnalysisTool } from '@/utils/navigation'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

function WatchlistPanel() {
  const { items, remove } = useWatchlist()
  const [expanded, setExpanded] = useState(true)
  const router = useRouter()

  const handleAnalyze = (item: typeof items[0]) => {
    const analysisTool = getAnalysisTool(item.type)
    const url = navigateToTool(analysisTool, {
      symbol: item.symbol,
      name: item.name,
      type: item.type,
      source: item.source,
    })
    router.push(url)
  }

  if (items.length === 0) return null

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider hover:text-surface-300 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Star className="w-3 h-3 text-amber-400" />
          關注清單 ({items.length})
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {items.map(item => (
            <div
              key={item.id}
              className="group flex items-center gap-2 px-4 py-2 hover:bg-surface-800/50 rounded-lg mx-1 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-surface-300 truncate font-medium">
                  {item.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    item.type === 'stock'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.type === 'stock' ? '股票' : '基金'}
                  </span>
                  <span className="text-[10px] text-surface-500 truncate">{item.symbol}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleAnalyze(item)}
                  className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-900/30 rounded transition-colors"
                  title="深度分析"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="p-1 text-surface-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                  title="移除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="w-64 bg-gradient-to-b from-surface-900 to-surface-950 border-r border-surface-700/50 flex flex-col h-screen shadow-2xl">
      {/* Logo */}
      <div className="p-6 border-b border-surface-700/50 bg-gradient-to-r from-surface-900 to-surface-800">
        <Link href="/" className="flex items-center space-x-2 group">
          <Image
            src="/Sagafisc.png"
            alt="Sagafisc"
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300"
          />
          <span className="font-bold text-xl bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
            Sagafisc
          </span>
        </Link>
      </div>

      {/* 主要導覽 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <Link
            href="/"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/'
                ? 'bg-primary-900/30 text-primary-300 font-medium border border-primary-700/30'
                : 'text-surface-300 hover:bg-surface-800/50'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>首頁</span>
          </Link>
        </div>

        <div className="mb-2">
          <h3 className="px-4 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
            主要功能
          </h3>
        </div>

        <div className="space-y-1">
          {NAVIGATION_TOOLS.map((tool) => {
            const isActive = pathname === `/tools/${tool.id}`
            return (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-900/30 to-blue-900/20 text-primary-300 font-medium shadow-sm border border-primary-600/30'
                    : 'text-surface-300 hover:bg-surface-800/50 hover:shadow-sm'
                }`}
              >
                <ToolIcon toolId={tool.id} className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{tool.name}</div>
                  <div className="text-xs text-surface-500 truncate">
                    {tool.description}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* 進階功能 */}
        {ADVANCED_TOOLS.length > 0 && (
          <>
            <div className="mt-6 mb-2">
              <h3 className="px-4 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                進階功能
              </h3>
            </div>
            <div className="space-y-1">
              {ADVANCED_TOOLS.map((tool) => {
                const isActive = pathname === `/tools/${tool.id}`
                return (
                  <Link
                    key={tool.id}
                    href={`/tools/${tool.id}`}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-900/30 text-primary-300 font-medium border border-primary-600/30'
                        : 'text-surface-300 hover:bg-surface-800/50'
                    }`}
                  >
                    <ToolIcon toolId={tool.id} className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{tool.name}</div>
                      <div className="text-xs text-surface-500 truncate">
                        {tool.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* 關注清單 */}
        <WatchlistPanel />
      </div>

      {/* 底部設定 */}
      <div className="p-4 border-t border-surface-700/50">
        <Link
          href="/settings"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-surface-300 hover:bg-surface-800/50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>設定</span>
        </Link>
      </div>
    </nav>
  )
}
