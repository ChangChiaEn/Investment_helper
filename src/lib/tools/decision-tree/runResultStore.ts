/**
 * 決策樹執行結果本機記憶：append-only 批次歷史，重跑／切分頁都不刪舊結果。
 */

import type { RunBatch, RunSessionSnapshot, RunState } from './types'

const STORAGE_KEY = 'sagafisc_decision_run_session'

/** 歷史批次上限（避免 localStorage 爆量） */
export const MAX_RUN_BATCHES = 50

/** 空快照 */
export function createEmptyRunSession(): RunSessionSnapshot {
  return {
    treeId: null,
    selectedSymbols: [],
    batches: [],
    activeBatchId: null,
    running: false,
    updatedAt: 0,
  }
}

/**
 * 自 raw JSON 解析批次列表（含舊版 results 遷移）。
 * @param parsed - 部分快照
 * @returns 批次陣列
 */
function parseBatches(parsed: Partial<RunSessionSnapshot>): RunBatch[] {
  let batches: RunBatch[] = Array.isArray(parsed.batches) ? parsed.batches : []
  if (batches.length === 0 && Array.isArray(parsed.results) && parsed.results.length > 0) {
    batches = [
      {
        id: `legacy_${Date.now().toString(36)}`,
        treeId: parsed.treeId || parsed.results[0]?.treeId || '',
        treeName: '（遷移）上次結果',
        symbols: parsed.results.map((r) => r.symbol),
        results: parsed.results,
        createdAt: parsed.updatedAt || Date.now(),
      },
    ]
  }
  return batches
}

/**
 * 讀取執行工作階段（含舊版 results 遷移）。
 * @returns 快照
 */
export function loadRunSession(): RunSessionSnapshot {
  if (typeof window === 'undefined') return createEmptyRunSession()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyRunSession()
    const parsed = JSON.parse(raw) as Partial<RunSessionSnapshot>
    const batches = parseBatches(parsed)
    const activeBatchId =
      parsed.activeBatchId && batches.some((b) => b.id === parsed.activeBatchId)
        ? parsed.activeBatchId
        : batches[0]?.id ?? null

    return {
      ...createEmptyRunSession(),
      treeId: parsed.treeId ?? null,
      selectedSymbols: Array.isArray(parsed.selectedSymbols) ? parsed.selectedSymbols : [],
      batches,
      activeBatchId,
      running: false,
      updatedAt: parsed.updatedAt || 0,
    }
  } catch {
    return createEmptyRunSession()
  }
}

/**
 * 合併兩批歷史：以 id 為鍵，incoming 覆寫同 id；其餘既有批次一律保留。
 * 排序：incoming 順序優先，再接上僅存在於 existing 的舊批（依 createdAt 新到舊）。
 * @param existing - 本機既有
 * @param incoming - 本次要寫入
 * @returns 合併後（已裁切上限）
 */
export function mergeBatches(existing: RunBatch[], incoming: RunBatch[]): RunBatch[] {
  const byId = new Map<string, RunBatch>()
  for (const b of existing) byId.set(b.id, b)
  for (const b of incoming) byId.set(b.id, b)

  const seen = new Set<string>()
  const merged: RunBatch[] = []
  for (const b of incoming) {
    const row = byId.get(b.id)
    if (!row || seen.has(b.id)) continue
    merged.push(row)
    seen.add(b.id)
  }
  const leftovers = existing
    .filter((b) => !seen.has(b.id))
    .sort((a, b) => b.createdAt - a.createdAt)
  for (const b of leftovers) {
    merged.push(b)
    seen.add(b.id)
  }
  return merged.slice(0, MAX_RUN_BATCHES)
}

/**
 * 寫入執行工作階段（與本機既有批次合併，永不因「本次列表較短」而刪舊批）。
 * 真正清空請呼叫 clearRunSession。
 * @param session - 快照
 */
export function saveRunSession(session: RunSessionSnapshot): void {
  if (typeof window === 'undefined') return

  const existing = loadRunSession().batches
  const batches = mergeBatches(existing, session.batches)
  const activeBatchId =
    session.activeBatchId && batches.some((b) => b.id === session.activeBatchId)
      ? session.activeBatchId
      : batches[0]?.id ?? null

  const next: RunSessionSnapshot = {
    treeId: session.treeId,
    selectedSymbols: session.selectedSymbols,
    batches,
    activeBatchId,
    running: session.running,
    updatedAt: Date.now(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // quota 滿時略過
  }
}

/**
 * 清除全部執行歷史。
 */
export function clearRunSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 以完整快照覆寫本機（不做 merge；刪除批次／單筆結果時使用）。
 * @param session - 完整快照
 */
export function replaceRunSession(session: RunSessionSnapshot): void {
  if (typeof window === 'undefined') return
  const batches = session.batches.slice(0, MAX_RUN_BATCHES)
  const activeBatchId =
    session.activeBatchId && batches.some((b) => b.id === session.activeBatchId)
      ? session.activeBatchId
      : batches[0]?.id ?? null
  const next: RunSessionSnapshot = {
    treeId: session.treeId,
    selectedSymbols: session.selectedSymbols,
    batches,
    activeBatchId,
    running: false,
    updatedAt: Date.now(),
  }
  try {
    if (batches.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // quota 滿時略過
  }
}

/**
 * 刪除單一執行批次並寫回本機。
 * @param batchId - 批次 id
 * @returns 更新後的批次列表與作用中批次 id
 */
export function removeBatch(batchId: string): {
  batches: RunBatch[]
  activeBatchId: string | null
} {
  const session = loadRunSession()
  const batches = session.batches.filter((b) => b.id !== batchId)
  const activeBatchId =
    session.activeBatchId === batchId
      ? batches[0]?.id ?? null
      : session.activeBatchId && batches.some((b) => b.id === session.activeBatchId)
        ? session.activeBatchId
        : batches[0]?.id ?? null
  replaceRunSession({
    ...session,
    batches,
    activeBatchId,
    running: false,
  })
  return { batches, activeBatchId }
}

/**
 * 刪除某批次內單一標的結果；若該批結果清空則一併移除該批。
 * @param batchId - 批次 id
 * @param symbol - 標的代號
 * @returns 更新後的批次列表與作用中批次 id
 */
export function removeBatchResult(
  batchId: string,
  symbol: string
): {
  batches: RunBatch[]
  activeBatchId: string | null
} {
  const session = loadRunSession()
  let batches = session.batches.map((b) => {
    if (b.id !== batchId) return b
    const results = b.results.filter((r) => r.symbol !== symbol)
    const symbols = b.symbols.filter((s) => s !== symbol)
    return { ...b, results, symbols }
  })
  // 結果已空的批次一併移除
  batches = batches.filter((b) => b.id !== batchId || b.results.length > 0)
  const activeBatchId =
    batches.some((b) => b.id === session.activeBatchId)
      ? session.activeBatchId
      : batches[0]?.id ?? null
  replaceRunSession({
    ...session,
    batches,
    activeBatchId,
    running: false,
  })
  return { batches, activeBatchId }
}

/**
 * 建立新執行批次 id。
 * @returns id
 */
export function newRunBatchId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 將新批次插到最前並裁切上限。
 * @param batches - 既有列表
 * @param batch - 新批次
 * @returns 更新後列表
 */
export function prependBatch(batches: RunBatch[], batch: RunBatch): RunBatch[] {
  // 若同 id 已存在則先移除再插到最前
  const without = batches.filter((b) => b.id !== batch.id)
  return [batch, ...without].slice(0, MAX_RUN_BATCHES)
}

/**
 * 更新指定批次內某標的結果（主觀確認續答用）。
 * @param batches - 列表
 * @param batchId - 批次 id
 * @param symbol - 標的
 * @param next - 新狀態
 * @returns 更新後列表
 */
export function updateBatchResult(
  batches: RunBatch[],
  batchId: string,
  symbol: string,
  next: RunState
): RunBatch[] {
  return batches.map((b) => {
    if (b.id !== batchId) return b
    return {
      ...b,
      results: b.results.map((r) => (r.symbol === symbol ? next : r)),
    }
  })
}
