/**
 * 決策樹批次執行：有限並行佇列 + 共用市場資料快取。
 */

import { runDecisionTree, treeHasManualNode } from './engine'
import type { DecisionInventory, DecisionTreeDoc, RunState } from './types'

/** 批次預設同時執行檔數（避免 TWSE／代理限流） */
export const DEFAULT_BATCH_CONCURRENCY = 2

/** 批次執行選項 */
export interface BatchRunOptions {
  tree: DecisionTreeDoc
  symbols: string[]
  inventory: DecisionInventory
  /** 並行上限，預設 2 */
  concurrency?: number
  /** 每一檔完成時回呼（含進行中結果） */
  onProgress?: (results: RunState[]) => void
  /** 自動化指標寫回庫存後通知 UI */
  onInventoryChange?: (inv: DecisionInventory) => void
}

/** 批次前置檢查結果 */
export type BatchPrecheck =
  | { ok: true; message?: undefined }
  | { ok: false; reason: 'empty' | 'has_manual'; message: string }

/**
 * 批次前檢查：空選取或含人工節點則不可批次。
 * @param tree - 決策樹
 * @param symbols - 選取標的
 * @returns 檢查結果
 */
export function precheckBatch(tree: DecisionTreeDoc, symbols: string[]): BatchPrecheck {
  if (symbols.length === 0) {
    return { ok: false, reason: 'empty', message: '請至少選擇一個標的' }
  }
  if (symbols.length > 1 && treeHasManualNode(tree)) {
    return {
      ok: false,
      reason: 'has_manual',
      message: '此樹含主觀確認節點，請單檔執行（一次只選一個標的）',
    }
  }
  return { ok: true }
}

/**
 * 以有限並行佇列執行多標的；全市場 API 共用同一 cache。
 * @param options - 樹、標的、庫存與並行度
 * @returns 各標的 RunState（順序與 symbols 一致）
 */
export async function runDecisionTreeBatch(options: BatchRunOptions): Promise<RunState[]> {
  const { tree, symbols, inventory, onProgress, onInventoryChange } = options
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_BATCH_CONCURRENCY)
  const sharedCache = new Map<string, unknown>()
  const results: (RunState | undefined)[] = new Array(symbols.length)
  let nextIndex = 0

  /**
   * 工作者：從佇列取下一個標的執行。
   */
  const worker = async () => {
    while (nextIndex < symbols.length) {
      const i = nextIndex
      nextIndex += 1
      const symbol = symbols[i]
      try {
        const state = await runDecisionTree({
          tree,
          symbol,
          inventory,
          sharedCache,
          onInventoryChange,
        })
        results[i] = state
      } catch (err) {
        results[i] = {
          status: 'error',
          treeId: tree.id,
          symbol,
          currentNodeId: null,
          path: [],
          error: err instanceof Error ? err.message : String(err),
        }
      }
      // 回報目前已完成的結果（未完成者略過）
      onProgress?.(results.filter((r): r is RunState => Boolean(r)))
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, symbols.length) }, () => worker())
  await Promise.all(workers)

  return results.map(
    (r, i) =>
      r || {
        status: 'error' as const,
        treeId: tree.id,
        symbol: symbols[i],
        currentNodeId: null,
        path: [],
        error: '未執行',
      }
  )
}
