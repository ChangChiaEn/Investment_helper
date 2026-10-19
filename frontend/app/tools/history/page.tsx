'use client'

/**
 * 今日 History 檢視頁：列出本日 OpenAPI／分析快取，可清除單筆或全部。
 * 僅保留本地日曆「今天」；跨日資料由 store 自動 purge。
 */

import { useCallback, useEffect, useState } from 'react'
import { History, Trash2, RefreshCw } from 'lucide-react'
import {
  clearTodayHistory,
  dataSourceLabel,
  listTodayHistory,
  purgeExpired,
  removeHistoryEntry,
  type HistoryEntry,
} from '@/lib/history'
import { todayDayKey } from '@/lib/domain'

/**
 * @returns History 工具頁
 */
export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [dayKey, setDayKey] = useState(todayDayKey())

  const reload = useCallback(() => {
    purgeExpired()
    setDayKey(todayDayKey())
    setEntries(listTodayHistory())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <History className="w-6 h-6" />
          <h1 className="text-2xl font-bold text-card-fg">今日 History</h1>
        </div>
        <p className="text-sm text-muted-fg">
          僅保留本機日期 <span className="font-mono text-card-fg">{dayKey}</span> 的查詢與分析。
          重複查詢會優先命中此處，減少 OpenAPI／AI token。指定過去日期請走支援日期的 OpenAPI 或 Gemini，不會從此讀取。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-muted text-card-fg hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4" />
            重新整理
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('確定清空今日全部 History？')) {
                clearTodayHistory()
                reload()
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-danger/10 text-danger hover:bg-danger/20"
          >
            <Trash2 className="w-4 h-4" />
            清空今日
          </button>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-fg text-sm">
          今日尚無快取。執行決策樹或 Stock Prophet（台股）後會出現 OpenAPI／分析紀錄。
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li
              key={e.entryKey}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium text-card-fg">{e.title}</h2>
                  <p className="text-xs text-muted-fg font-mono mt-0.5">{e.entryKey}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-danger hover:underline"
                  onClick={() => {
                    removeHistoryEntry(e.entryKey)
                    reload()
                  }}
                >
                  刪除
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-muted text-muted-fg">
                  工具：{e.toolId}
                </span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
                  主來源：{dataSourceLabel(e.primarySource)}
                </span>
                {e.sources.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-muted text-muted-fg">
                    {dataSourceLabel(s)}
                  </span>
                ))}
                <span className="px-2 py-0.5 rounded bg-muted text-muted-fg">
                  {new Date(e.fetchedAt).toLocaleTimeString('zh-TW')}
                </span>
              </div>
              {e.summary && (
                <p className="text-sm text-card-fg/90 whitespace-pre-wrap line-clamp-4">
                  {e.summary}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
