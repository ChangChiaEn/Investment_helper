'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAVIGATION_TOOLS, ADVANCED_TOOLS } from '@/config/tools'
import {
  Home,
  Settings,
  Star,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from 'lucide-react'
import { ToolIcon } from '@/components/ToolIcons'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { useRouteLoading } from '@/components/RouteLoadingOverlay'
import { navigateToTool, getAnalysisTool } from '@/utils/navigation'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import {
  DISGUISE_BRAND,
  DISGUISE_NAV_LABELS,
  getToolDisplayLabels,
} from '@/config/disguise'

/** 側欄收合狀態的 localStorage 鍵 */
const NAV_COLLAPSED_KEY = 'nav_collapsed'

/**
 * 側欄關注清單面板：展開／收合、跳轉分析、移除項目。
 * 偽裝模式下改顯示中性「釘選」文案。
 * @param collapsed 側欄是否為窄欄模式（僅圖示時隱藏本面板）
 */
function WatchlistPanel({ collapsed }: { collapsed: boolean }) {
  const { items, remove } = useWatchlist()
  const { disguise } = useTheme()
  const [expanded, setExpanded] = useState(true)
  const router = useRouter()
  const { startRouteLoading } = useRouteLoading()

  /**
   * 導向深度分析工具；先顯示載入中再 router.push，避免主內容空白。
   * @param item - 關注清單項目
   */
  const handleAnalyze = (item: typeof items[0]) => {
    const analysisTool = getAnalysisTool(item.type)
    const url = navigateToTool(analysisTool, {
      symbol: item.symbol,
      name: item.name,
      type: item.type,
      source: item.source,
    })
    startRouteLoading()
    router.push(url)
  }

  if (items.length === 0 || collapsed) return null

  const watchlistTitle = disguise
    ? `${DISGUISE_NAV_LABELS.watchlist} (${items.length})`
    : `關注清單 (${items.length})`

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-sidebar-muted uppercase tracking-wider hover:text-sidebar-fg transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Star className="w-3 h-3 text-warning" />
          {watchlistTitle}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {items.map(item => (
            <div
              key={item.id}
              className="group flex items-center gap-2 px-4 py-2 hover:bg-sidebar-hover/50 rounded-lg mx-1 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-sidebar-fg truncate font-medium">
                  {item.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    item.type === 'stock'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-success/20 text-success'
                  }`}>
                    {item.type === 'stock'
                      ? (disguise ? DISGUISE_NAV_LABELS.stockType : '股票')
                      : (disguise ? DISGUISE_NAV_LABELS.fundType : '基金')}
                  </span>
                  <span className="text-[10px] text-sidebar-muted truncate">{item.symbol}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleAnalyze(item)}
                  className="p-1 text-primary hover:bg-primary/20 rounded transition-colors"
                  title={disguise ? DISGUISE_NAV_LABELS.analyze : '深度分析'}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="p-1 text-sidebar-muted hover:text-danger hover:bg-danger/20 rounded transition-colors"
                  title={disguise ? DISGUISE_NAV_LABELS.remove : '移除'}
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

/**
 * 左側導覽列：可收合為僅圖示窄欄；狀態寫入 localStorage。
 * 偽裝模式下隱藏 Sagafisc 品牌，工具改顯示中性對話名稱。
 */
export function Navigation() {
  const pathname = usePathname()
  const { disguise } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  // 避免 SSR／hydration 與 localStorage 不一致造成閃爍
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(NAV_COLLAPSED_KEY)
    if (saved === '1') setCollapsed(true)
    setReady(true)
  }, [])

  /** 切換收合並持久化。 */
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(NAV_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  /** 連結在收合／展開時的共用樣式。 */
  const linkClass = (active: boolean) =>
    `flex items-center rounded-xl transition-all duration-200 ${
      collapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'
    } ${
      active
        ? 'bg-gradient-to-r from-primary/20 to-accent/10 text-primary font-medium shadow-sm border border-primary/30'
        : 'text-sidebar-fg hover:bg-sidebar-hover/50 hover:shadow-sm'
    }`

  const brandName = disguise ? DISGUISE_BRAND : 'Sagafisc'
  const homeLabel = disguise ? DISGUISE_NAV_LABELS.home : '首頁'
  const mainSection = disguise ? DISGUISE_NAV_LABELS.mainSection : '主要功能'
  const advancedSection = disguise ? DISGUISE_NAV_LABELS.advancedSection : '進階功能'
  const settingsLabel = disguise ? DISGUISE_NAV_LABELS.settings : '設定'

  return (
    <nav
      className={`
        relative flex flex-col h-screen shrink-0
        bg-gradient-to-b from-sidebar-alt to-sidebar
        border-r border-sidebar-border/50 shadow-2xl text-base
        transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-[4.5rem]' : 'w-72'}
        ${ready ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Logo + 收合按鈕 */}
      <div className={`border-b border-sidebar-border/50 bg-gradient-to-r from-sidebar to-sidebar-alt ${collapsed ? 'p-3' : 'p-4'}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between gap-2'}`}>
          <Link
            href="/"
            className={`flex items-center group min-w-0 ${collapsed ? 'justify-center' : 'space-x-2'}`}
            title={brandName}
          >
            {/* 偽裝時改用對話圖示，避免露出品牌 Logo */}
            {disguise ? (
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 text-primary shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </span>
            ) : (
              <Image
                src="/Sagafisc.png"
                alt="Sagafisc"
                width={40}
                height={40}
                priority
                className="w-10 h-10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
              />
            )}
            {!collapsed && (
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                {brandName}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-2 rounded-lg text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover/50 transition-colors flex-shrink-0"
            title={collapsed ? '展開側欄' : '收合側欄'}
            aria-label={collapsed ? '展開側欄' : '收合側欄'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 主要導覽 */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2' : 'p-4'}`}>
        <div className="mb-4">
          <Link
            href="/"
            title={homeLabel}
            className={linkClass(pathname === '/')}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{homeLabel}</span>}
          </Link>
        </div>

        {!collapsed && (
          <div className="mb-2">
            <h3 className="px-4 py-2 text-sm font-semibold text-sidebar-muted uppercase tracking-wider">
              {mainSection}
            </h3>
          </div>
        )}

        <div className="space-y-1">
          {NAVIGATION_TOOLS.map((tool) => {
            const isActive = pathname === `/tools/${tool.id}`
            const labels = getToolDisplayLabels(
              tool.id,
              tool.name,
              tool.description,
              disguise,
            )
            return (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                title={labels.name}
                className={linkClass(isActive)}
              >
                <ToolIcon toolId={tool.id} className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium">{labels.name}</div>
                    <div className="text-sm text-sidebar-muted truncate">
                      {labels.description}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* 進階功能 */}
        {ADVANCED_TOOLS.length > 0 && (
          <>
            {!collapsed && (
              <div className="mt-6 mb-2">
                <h3 className="px-4 py-2 text-sm font-semibold text-sidebar-muted uppercase tracking-wider">
                  {advancedSection}
                </h3>
              </div>
            )}
            <div className={`space-y-1 ${collapsed ? 'mt-2' : ''}`}>
              {ADVANCED_TOOLS.map((tool) => {
                const isActive = pathname === `/tools/${tool.id}`
                const labels = getToolDisplayLabels(
                  tool.id,
                  tool.name,
                  tool.description,
                  disguise,
                )
                return (
                  <Link
                    key={tool.id}
                    href={`/tools/${tool.id}`}
                    title={labels.name}
                    className={linkClass(isActive)}
                  >
                    <ToolIcon toolId={tool.id} className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium">{labels.name}</div>
                        <div className="text-sm text-sidebar-muted truncate">
                          {labels.description}
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </>
        )}

        <WatchlistPanel collapsed={collapsed} />
      </div>

      {/* 底部設定 */}
      <div className={`border-t border-sidebar-border/50 ${collapsed ? 'p-2' : 'p-4'}`}>
        <Link
          href="/settings"
          title={settingsLabel}
          className={`flex items-center rounded-lg text-sidebar-fg hover:bg-sidebar-hover/50 transition-colors ${
            collapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{settingsLabel}</span>}
        </Link>
      </div>
    </nav>
  )
}
