/**
 * 僅「今天」的查詢／分析 History（localStorage）。
 * 以本地日曆日 dayKey 隔離；讀寫時清掉非今日資料。
 * 不作為跨日歷史查詢快取——指定日期請走支援日期的 OpenAPI 或 Gemini。
 */

import type { AnalysisEnvelope, DataSource } from '@/lib/domain'
import { buildHistoryEntryKey, todayDayKey } from '@/lib/domain'

/** localStorage 鍵 */
const STORAGE_KEY = 'sagafisc_today_history'

/** History 單筆（與 AnalysisEnvelope 對齊，entryKey 供索引） */
export interface HistoryEntry<T = unknown> extends AnalysisEnvelope<T> {
  /** 穩定索引鍵（不含日期） */
  entryKey: string
  /** 顯示標題 */
  title: string
}

/** 持久化結構 */
interface HistoryStoreShape {
  dayKey: string
  entries: HistoryEntry[]
}

/**
 * 讀取原始 store；若日期不符則回空並可選擇寫回。
 * @returns store 形狀
 */
function readRaw(): HistoryStoreShape {
  if (typeof window === 'undefined') {
    return { dayKey: todayDayKey(), entries: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dayKey: todayDayKey(), entries: [] }
    const parsed = JSON.parse(raw) as HistoryStoreShape
    if (!parsed || typeof parsed.dayKey !== 'string' || !Array.isArray(parsed.entries)) {
      return { dayKey: todayDayKey(), entries: [] }
    }
    return parsed
  } catch {
    return { dayKey: todayDayKey(), entries: [] }
  }
}

/**
 * 寫入 store。
 * @param shape - 完整結構
 */
function writeRaw(shape: HistoryStoreShape): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shape))
  } catch {
    // quota 滿時略過，不阻斷主流程
  }
}

/**
 * 清除非今日資料；必要時寫回。
 * @returns 今日有效的 store
 */
export function purgeExpired(): HistoryStoreShape {
  const today = todayDayKey()
  const raw = readRaw()
  if (raw.dayKey !== today) {
    const empty: HistoryStoreShape = { dayKey: today, entries: [] }
    writeRaw(empty)
    return empty
  }
  return raw
}

/**
 * 列出今日所有 History 項目（新到舊）。
 * @returns 項目陣列
 */
export function listTodayHistory(): HistoryEntry[] {
  const store = purgeExpired()
  return [...store.entries].sort((a, b) => b.fetchedAt - a.fetchedAt)
}

/**
 * 依 entryKey 取得今日快取。
 * @param entryKey - 穩定鍵
 * @returns 項目或 null
 */
export function getHistoryEntry<T = unknown>(entryKey: string): HistoryEntry<T> | null {
  const store = purgeExpired()
  const found = store.entries.find((e) => e.entryKey === entryKey)
  return (found as HistoryEntry<T>) || null
}

/**
 * 依 kind + queryKey + subKey 查詢。
 * @param kind - 種類（如 openapi、analysis）
 * @param queryKey - 主鍵（常為 symbol）
 * @param subKey - 可選子鍵
 * @returns 項目或 null
 */
export function getHistoryByParts<T = unknown>(
  kind: string,
  queryKey: string,
  subKey?: string
): HistoryEntry<T> | null {
  return getHistoryEntry<T>(buildHistoryEntryKey({ kind, queryKey, subKey }))
}

/**
 * 寫入或覆寫一筆今日 History。
 * @param input - 不含 dayKey／fetchedAt／entryKey 時可自動補
 * @returns 寫入後的項目
 */
export function putHistoryEntry<T = unknown>(
  input: Omit<HistoryEntry<T>, 'dayKey' | 'fetchedAt' | 'entryKey'> & {
    entryKey?: string
    kind?: string
    subKey?: string
  }
): HistoryEntry<T> {
  const store = purgeExpired()
  const today = todayDayKey()
  const entryKey =
    input.entryKey ||
    buildHistoryEntryKey({
      kind: input.kind || input.toolId,
      queryKey: input.queryKey,
      subKey: input.subKey,
    })

  const entry: HistoryEntry<T> = {
    toolId: input.toolId,
    queryKey: input.queryKey,
    symbol: input.symbol,
    market: input.market,
    dayKey: today,
    fetchedAt: Date.now(),
    primarySource: input.primarySource,
    sources: input.sources,
    payload: input.payload,
    summary: input.summary,
    entryKey,
    title: input.title,
  }

  const nextEntries = store.entries.filter((e) => e.entryKey !== entryKey)
  nextEntries.unshift(entry as HistoryEntry)
  // 防爆：單日最多保留 200 筆
  writeRaw({ dayKey: today, entries: nextEntries.slice(0, 200) })
  return entry
}

/**
 * 刪除單筆。
 * @param entryKey - 鍵
 */
export function removeHistoryEntry(entryKey: string): void {
  const store = purgeExpired()
  writeRaw({
    dayKey: store.dayKey,
    entries: store.entries.filter((e) => e.entryKey !== entryKey),
  })
}

/**
 * 清空今日 History。
 */
export function clearTodayHistory(): void {
  writeRaw({ dayKey: todayDayKey(), entries: [] })
}

/**
 * 來源標籤的繁中顯示。
 * @param source - DataSource
 * @returns 顯示字串
 */
export function dataSourceLabel(source: DataSource): string {
  switch (source) {
    case 'openapi':
      return 'OpenAPI'
    case 'grounding':
      return 'Grounding'
    case 'gemini':
      return 'Gemini'
    case 'manual':
      return '手動'
    default:
      return source
  }
}
