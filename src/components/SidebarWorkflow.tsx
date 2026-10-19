'use client'

/**
 * 側欄工作流區塊：庫存（持股＋分類）與今日 History。
 * 樣式對齊導覽列工具連結（非 mono、sidebar token）。
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  History,
  Trash2,
  ArrowRight,
} from 'lucide-react'
import { useInventory } from '@/contexts/InventoryContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouteLoading } from '@/components/RouteLoadingOverlay'
import { DISGUISE_NAV_LABELS } from '@/config/disguise'
import { navigateToTool, getAnalysisTool } from '@/utils/navigation'
import {
  dataSourceLabel,
  listTodayHistory,
  purgeExpired,
  removeHistoryEntry,
  type HistoryEntry,
} from '@/lib/history'
import { WATCH_LIST_NAME } from '@/lib/inventory'
import type { AssetType } from '@/lib/domain'

/**
 * 側欄庫存＋今日 History（收合窄欄時隱藏）。
 * @param collapsed - 側欄是否收合
 */
export function SidebarWorkflow({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null
  return (
    <div className="mt-4 space-y-3 border-t border-sidebar-border/50 pt-4">
      <SidebarInventory />
      <SidebarHistory />
    </div>
  )
}

/**
 * 側欄庫存：持股摘要與各分類標的，可導向工具。
 */
function SidebarInventory() {
  const { inventory, removeWatch, ready } = useInventory()
  const { disguise } = useTheme()
  const [expanded, setExpanded] = useState(true)
  const router = useRouter()
  const { startRouteLoading } = useRouteLoading()

  const totalListed = inventory.lists.reduce((n, l) => n + l.items.length, 0)
  const total = inventory.holdings.length + totalListed
  const title = disguise ? '標的庫' : '庫存'

  const goAnalyze = (symbol: string, name: string, assetType: AssetType) => {
    const tool = getAnalysisTool(assetType)
    const url = navigateToTool(tool, {
      symbol,
      name,
      type: assetType,
      source: 'sidebar-inventory',
    })
    startRouteLoading()
    router.push(url)
  }

  if (!ready || total === 0) {
    return (
      <div>
        <h3 className="px-4 py-2 text-sm font-semibold text-sidebar-muted uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" />
          {title}
        </h3>
        <p className="px-4 text-sm text-sidebar-muted">
          {disguise
            ? '尚無項目。可在工具結果加入。'
            : '尚無標的。在找股／找基金結果按書籤加入「關注」。'}
        </p>
        <Link
          href="/tools/inventory"
          className="mx-1 mt-1 flex items-center space-x-3 px-4 py-2 rounded-xl text-sm text-primary hover:bg-sidebar-hover/50 transition-colors"
        >
          {disguise ? '管理標的庫 →' : '管理庫存 →'}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-sidebar-muted uppercase tracking-wider hover:text-sidebar-fg transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-primary" />
          {title} ({total})
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {inventory.holdings.length > 0 && (
            <div>
              <div className="px-4 py-1 text-xs font-medium text-sidebar-muted">
                {disguise ? '持有' : '持股'} ({inventory.holdings.length})
              </div>
              {inventory.holdings.map((h) => (
                <SidebarSymbolRow
                  key={h.id}
                  symbol={h.symbol}
                  name={h.name}
                  badge={disguise ? DISGUISE_NAV_LABELS.stockType : '持股'}
                  badgeClass="bg-primary/20 text-primary"
                  onAnalyze={() => goAnalyze(h.symbol, h.name, 'stock')}
                />
              ))}
            </div>
          )}
          {inventory.lists.map((list) =>
            list.items.length === 0 ? null : (
              <div key={list.id}>
                <div className="px-4 py-1 text-xs font-medium text-sidebar-muted">
                  {list.name} ({list.items.length})
                </div>
                {list.items.map((item) => (
                  <SidebarSymbolRow
                    key={item.id}
                    symbol={item.symbol}
                    name={item.name}
                    badge={
                      (item.assetType || 'stock') === 'fund'
                        ? disguise
                          ? DISGUISE_NAV_LABELS.fundType
                          : '基金'
                        : disguise
                          ? DISGUISE_NAV_LABELS.stockType
                          : '股票'
                    }
                    badgeClass={
                      (item.assetType || 'stock') === 'fund'
                        ? 'bg-success/20 text-success'
                        : 'bg-primary/20 text-primary'
                    }
                    onAnalyze={() =>
                      goAnalyze(item.symbol, item.name, item.assetType || 'stock')
                    }
                    onRemove={
                      list.name === WATCH_LIST_NAME
                        ? () => removeWatch(item.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )
          )}
          <Link
            href="/tools/inventory"
            className="mx-1 flex items-center px-4 py-2 rounded-xl text-sm text-primary hover:bg-sidebar-hover/50 transition-colors"
          >
            {disguise ? '完整管理 →' : '完整庫存管理 →'}
          </Link>
        </div>
      )}
    </div>
  )
}

/**
 * 側欄單一標的列（對齊導覽列項目密度與字級）。
 */
function SidebarSymbolRow({
  symbol,
  name,
  badge,
  badgeClass,
  onAnalyze,
  onRemove,
}: {
  symbol: string
  name: string
  badge: string
  badgeClass: string
  onAnalyze: () => void
  onRemove?: () => void
}) {
  const { disguise } = useTheme()
  return (
    <div className="group flex items-center gap-2 px-4 py-2 hover:bg-sidebar-hover/50 rounded-xl mx-1 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-sidebar-fg truncate font-medium">{name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>
            {badge}
          </span>
          <span className="text-xs text-sidebar-muted truncate">{symbol}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onAnalyze}
          className="p-1.5 text-primary hover:bg-primary/20 rounded-lg transition-colors"
          title={disguise ? DISGUISE_NAV_LABELS.analyze : '深度分析'}
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-sidebar-muted hover:text-danger hover:bg-danger/20 rounded-lg transition-colors"
            title={disguise ? DISGUISE_NAV_LABELS.remove : '移除'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * 側欄今日 History：點選可開詳細頁或帶入分析。
 */
function SidebarHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [expanded, setExpanded] = useState(true)
  const { disguise } = useTheme()
  const router = useRouter()
  const { startRouteLoading } = useRouteLoading()

  const reload = useCallback(() => {
    purgeExpired()
    setEntries(listTodayHistory().slice(0, 12))
  }, [])

  useEffect(() => {
    reload()
    const t = setInterval(reload, 8000)
    return () => clearInterval(t)
  }, [reload])

  const openEntry = (e: HistoryEntry) => {
    if (e.symbol && e.toolId === 'gemini-stock-prophet') {
      const url = navigateToTool('gemini-stock-prophet', {
        symbol: e.symbol,
        name: e.symbol,
        type: 'stock',
        source: 'sidebar-history',
      })
      startRouteLoading()
      router.push(url)
      return
    }
    startRouteLoading()
    router.push('/tools/history')
  }

  const title = disguise ? '今日紀錄' : '今日 History'

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-sidebar-muted uppercase tracking-wider hover:text-sidebar-fg transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-warning" />
          {title} ({entries.length})
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="px-4 py-2 text-sm text-sidebar-muted">
              {disguise ? '尚無今日紀錄' : '尚無今日查詢／分析快取'}
            </p>
          ) : (
            entries.map((e) => (
              <div
                key={e.entryKey}
                className="group flex items-start gap-2 px-4 py-2 hover:bg-sidebar-hover/50 rounded-xl mx-1 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => openEntry(e)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-sm text-sidebar-fg truncate font-medium">{e.title}</div>
                  <div className="text-xs text-sidebar-muted truncate mt-0.5">
                    {dataSourceLabel(e.primarySource)} ·{' '}
                    {new Date(e.fetchedAt).toLocaleTimeString('zh-TW', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </button>
                <button
                  type="button"
                  className="p-1.5 opacity-0 group-hover:opacity-100 text-sidebar-muted hover:text-danger rounded-lg"
                  title="刪除"
                  onClick={() => {
                    removeHistoryEntry(e.entryKey)
                    reload()
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
          <Link
            href="/tools/history"
            className="mx-1 flex items-center px-4 py-2 rounded-xl text-sm text-primary hover:bg-sidebar-hover/50 transition-colors"
          >
            {disguise ? '查看全部 →' : '查看全部 →'}
          </Link>
        </div>
      )}
    </div>
  )
}
