'use client'

/**
 * 決策樹執行頁：多選標的批次執行、結果摘要與可收合過程、append-only 執行歷史。
 */

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { precheckBatch, runDecisionTreeBatch } from '@/lib/tools/decision-tree/batchRunner'
import { runDecisionTree, treeHasManualNode } from '@/lib/tools/decision-tree/engine'
import { collectAllSymbols, collectSymbolsByGroup } from '@/lib/inventory'
import {
  loadRunSession,
  mergeBatches,
  newRunBatchId,
  prependBatch,
  removeBatch,
  removeBatchResult,
  saveRunSession,
  updateBatchResult,
} from '@/lib/tools/decision-tree/runResultStore'
import { getActiveTree, loadTrees, setActiveTreeId } from '@/lib/tools/decision-tree/treeStore'
import {
  getIndicatorLabel,
  getNodeKindLabel,
} from '@/lib/tools/decision-tree/labels'
import type { DecisionInventory, RunBatch, RunState } from '@/lib/tools/decision-tree/types'
import { SourceBadge } from './SourceBadge'
import { Disclaimer } from '@/components/Disclaimer'

interface Props {
  inventory: DecisionInventory
}

/**
 * @param inventory - 庫存（含持股與自訂分類）
 * @returns 執行 UI
 */
export function RunPanel({ inventory }: Props) {
  const [trees, setTrees] = useState(loadTrees)
  /** 以本機快照初始化，避免首屏空陣列在還原前就被拿去執行／寫回 */
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(() =>
    typeof window !== 'undefined' ? loadRunSession().selectedSymbols : []
  )
  const [running, setRunning] = useState(false)
  const [batches, setBatches] = useState<RunBatch[]>(() =>
    typeof window !== 'undefined' ? loadRunSession().batches : []
  )
  const [activeBatchId, setActiveBatchId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? loadRunSession().activeBatchId : null
  )
  /**
   * 必須先標記還原完成後才允許寫回，
   * 避免 Strict Mode／SSR hydrate 用空狀態覆寫。
   */
  const [sessionReady, setSessionReady] = useState(false)
  /** 展開過程的標的代號集合（以 batchId+symbol 區分） */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [batchHint, setBatchHint] = useState('')

  // --- 還原執行歷史（切換分頁／重整／離開工具再回來） ---
  useEffect(() => {
    setTrees(loadTrees())
    const session = loadRunSession()
    setSelectedSymbols(session.selectedSymbols)
    // 與本機合併，避免記憶體狀態短於 localStorage
    setBatches((prev) => mergeBatches(session.batches, prev))
    setActiveBatchId(session.activeBatchId || session.batches[0]?.id || null)
    setSessionReady(true)
  }, [])

  // --- 自動持久化（僅在還原完成後；寫入時與本機合併，不刪舊批） ---
  useEffect(() => {
    if (!sessionReady) return
    saveRunSession({
      treeId: trees.activeId,
      selectedSymbols,
      batches,
      activeBatchId,
      running,
      updatedAt: Date.now(),
    })
  }, [sessionReady, trees.activeId, selectedSymbols, batches, activeBatchId, running])

  const symbols = useMemo(() => collectAllSymbols(inventory), [inventory])
  /** 依庫存分頁分組：持股、關注、自訂分類 */
  const symbolGroups = useMemo(() => collectSymbolsByGroup(inventory), [inventory])

  const activeTree = getActiveTree()
  const hasManual = activeTree ? treeHasManualNode(activeTree) : false

  const activeBatch = useMemo(
    () => batches.find((b) => b.id === activeBatchId) || batches[0] || null,
    [batches, activeBatchId]
  )
  const results = activeBatch?.results ?? []

  /**
   * 切換標的選取。
   * @param sym - 代號
   */
  const toggleSymbol = (sym: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    )
  }

  /** 全選／清空 */
  const selectAll = () => setSelectedSymbols(symbols.map(([s]) => s))
  const clearSelection = () => setSelectedSymbols([])

  /**
   * 將進行中／完成結果寫入指定批次（不刪舊批）。
   * @param batchId - 批次 id
   * @param nextResults - 結果列
   */
  const patchActiveBatchResults = (batchId: string, nextResults: RunState[]) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, results: nextResults } : b))
    )
  }

  /**
   * 開始執行（單檔或批次）；每次新增一批，不清舊歷史。
   */
  const handleRun = async () => {
    const tree = getActiveTree()
    if (!tree) {
      alert('請先在「編輯樹」建立並儲存決策樹')
      return
    }
    const check = precheckBatch(tree, selectedSymbols)
    if (check.ok === false) {
      setBatchHint(check.message)
      alert(check.message)
      return
    }
    setBatchHint('')
    const batchId = newRunBatchId()
    const draft: RunBatch = {
      id: batchId,
      treeId: tree.id,
      treeName: tree.name,
      symbols: [...selectedSymbols],
      results: [],
      createdAt: Date.now(),
    }
    // 執行前先與 localStorage 合併，避免 React 狀態空了就把舊歷史蓋掉
    setBatches((prev) => {
      const fromStore = loadRunSession().batches
      const base = mergeBatches(fromStore, prev)
      return prependBatch(base, draft)
    })
    setActiveBatchId(batchId)
    setRunning(true)
    try {
      if (selectedSymbols.length === 1) {
        const next = await runDecisionTree({
          tree,
          symbol: selectedSymbols[0],
          inventory,
        })
        patchActiveBatchResults(batchId, [next])
      } else {
        const batchResults = await runDecisionTreeBatch({
          tree,
          symbols: selectedSymbols,
          inventory,
          onProgress: (partial) => patchActiveBatchResults(batchId, [...partial]),
        })
        patchActiveBatchResults(batchId, batchResults)
      }
    } catch (err) {
      patchActiveBatchResults(batchId, [
        {
          status: 'error',
          treeId: tree.id,
          symbol: selectedSymbols[0] || '',
          currentNodeId: null,
          path: [],
          error: err instanceof Error ? err.message : String(err),
        },
      ])
    } finally {
      setRunning(false)
    }
  }

  /**
   * 主觀確認後繼續（僅更新目前批次內該標的）。
   * @param answer - 是／否
   */
  const handleManual = async (answer: 'yes' | 'no') => {
    const tree = getActiveTree()
    const batchId = activeBatch?.id
    const pending = results.find((r) => r.status === 'awaiting_manual')
    if (!tree || !pending || !batchId) return
    setRunning(true)
    try {
      const next = await runDecisionTree({
        tree,
        symbol: pending.symbol,
        inventory,
        previous: pending,
        manualAnswer: answer,
      })
      setBatches((prev) => updateBatchResult(prev, batchId, pending.symbol, next))
    } catch (err) {
      setBatches((prev) =>
        updateBatchResult(prev, batchId, pending.symbol, {
          ...pending,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      )
    } finally {
      setRunning(false)
    }
  }

  /**
   * 展開／收合某標的過程。
   * @param symbol - 代號
   */
  const toggleExpand = (symbol: string) => {
    const key = `${activeBatchId || ''}_${symbol}`
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const summary = useMemo(() => {
    const completed = results.filter((r) => r.status === 'completed')
    const errors = results.filter((r) => r.status === 'error')
    const waiting = results.filter((r) => r.status === 'awaiting_manual')
    return {
      completed: completed.length,
      errors: errors.length,
      waiting: waiting.length,
      total: results.length,
    }
  }, [results])

  const pendingManual = results.find((r) => r.status === 'awaiting_manual')

  /**
   * 刪除目前檢視的整批執行歷史。
   */
  const handleDeleteActiveBatch = () => {
    if (!activeBatch) return
    if (!confirm(`確定刪除此批次？\n${formatBatchLabel(activeBatch)}`)) return
    const next = removeBatch(activeBatch.id)
    setBatches(next.batches)
    setActiveBatchId(next.activeBatchId)
  }

  /**
   * 刪除目前批次內單一標的結果。
   * @param symbol - 標的代號
   */
  const handleDeleteResult = (symbol: string) => {
    if (!activeBatchId) return
    if (!confirm(`確定刪除標的 ${symbol} 的執行結果？`)) return
    const next = removeBatchResult(activeBatchId, symbol)
    setBatches(next.batches)
    setActiveBatchId(next.activeBatchId)
  }

  return (
    <div className="space-y-4">
      <Disclaimer />

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-card-fg">
            決策樹
            <select
              className="mt-1 block border rounded-lg px-3 py-2 min-w-[200px]"
              value={trees.activeId || ''}
              onChange={(e) => {
                setActiveTreeId(e.target.value || null)
                setTrees(loadTrees())
              }}
            >
              <option value="">請選擇</option>
              {trees.trees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={running || selectedSymbols.length === 0}
            onClick={handleRun}
            className="px-5 py-2.5 bg-primary text-primary-fg rounded-xl font-medium disabled:opacity-50"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                執行中
              </span>
            ) : selectedSymbols.length > 1 ? (
              `批次執行（${selectedSymbols.length}）`
            ) : (
              '執行決策樹'
            )}
          </button>
        </div>

        {hasManual && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            此樹含主觀確認節點：僅可單檔執行。若選多檔會提示改為單檔。
          </p>
        )}
        {batchHint && <p className="text-xs text-red-700">{batchHint}</p>}

        {/* 多選標的 */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm font-medium text-card-fg">標的（可多選）</span>
            <button type="button" className="text-xs text-primary-700" onClick={selectAll}>
              全選
            </button>
            <button type="button" className="text-xs text-muted-fg" onClick={clearSelection}>
              清空
            </button>
            <span className="text-xs text-muted-fg">已選 {selectedSymbols.length}</span>
          </div>
          {symbols.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              庫存尚無標的。請先至「庫存」新增持股或自訂分類。
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {symbolGroups.map((group) => (
                <div key={group.key} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-fg uppercase tracking-wide">
                      {group.label}
                    </span>
                    <span className="text-xs text-muted-fg">({group.symbols.length})</span>
                    {group.symbols.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-primary-700"
                        onClick={() => {
                          const ids = group.symbols.map(([s]) => s)
                          setSelectedSymbols((prev) => Array.from(new Set([...prev, ...ids])))
                        }}
                      >
                        全選此組
                      </button>
                    )}
                  </div>
                  {group.symbols.length === 0 ? (
                    <p className="text-xs text-muted-fg pl-1">尚無標的</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {group.symbols.map(([sym, name]) => {
                        const checked = selectedSymbols.includes(sym)
                        return (
                          <label
                            key={`${group.key}_${sym}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                              checked
                                ? 'border-primary-500 bg-primary-50 text-primary-900'
                                : 'border-border bg-card text-card-fg hover:bg-muted'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={checked}
                              onChange={() => toggleSymbol(sym)}
                            />
                            <span className="font-mono">{sym}</span>
                            <span className="text-muted-fg truncate max-w-[100px]">{name}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendingManual && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-amber-900">
            需要主觀確認 · {pendingManual.symbol}
          </h3>
          <p className="text-sm text-amber-800">{pendingManual.pendingPrompt}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={running}
              className="px-4 py-2 bg-success text-primary-fg rounded-lg text-sm"
              onClick={() => handleManual('yes')}
            >
              是
            </button>
            <button
              type="button"
              disabled={running}
              className="px-4 py-2 bg-danger text-primary-fg rounded-lg text-sm"
              onClick={() => handleManual('no')}
            >
              否
            </button>
          </div>
        </div>
      )}

      {/* 歷史批次切換＋當前結果 */}
      {batches.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted flex flex-wrap gap-3 items-center text-sm text-card-fg">
            <span className="font-semibold text-fg">執行歷史</span>
            <span className="text-xs text-muted-fg">已保留 {batches.length} 次</span>
            <select
              className="border rounded-lg px-2 py-1 text-xs min-w-[240px]"
              value={activeBatch?.id || ''}
              onChange={(e) => setActiveBatchId(e.target.value || null)}
              aria-label="選擇歷史執行批次"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatBatchLabel(b)}
                </option>
              ))}
            </select>
            {activeBatch && (
              <>
                <span>本批 {summary.total} 檔</span>
                <span className="text-emerald-700">完成 {summary.completed}</span>
                {summary.waiting > 0 && (
                  <span className="text-amber-700">待確認 {summary.waiting}</span>
                )}
                {summary.errors > 0 && (
                  <span className="text-red-700">錯誤 {summary.errors}</span>
                )}
                <button
                  type="button"
                  className="ml-auto text-xs text-danger border border-red-200 rounded-lg px-2 py-1 hover:bg-danger-soft"
                  onClick={handleDeleteActiveBatch}
                  disabled={running}
                >
                  刪除此批次
                </button>
              </>
            )}
          </div>
          {results.length === 0 ? (
            <p className="p-4 text-sm text-muted-fg">此批次尚無結果（可能仍在執行中）。</p>
          ) : (
            <ul className="divide-y">
              {results.map((state) => {
                const expandKey = `${activeBatchId || ''}_${state.symbol}`
                return (
                  <ResultRow
                    key={`${activeBatchId}_${state.symbol}_${state.treeId}`}
                    state={state}
                    expanded={expanded.has(expandKey)}
                    onToggle={() => toggleExpand(state.symbol)}
                    onDelete={() => handleDeleteResult(state.symbol)}
                    deleteDisabled={running}
                  />
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 批次下拉顯示文字。
 * @param b - 批次
 * @returns 標籤
 */
function formatBatchLabel(b: RunBatch): string {
  const t = new Date(b.createdAt)
  const time = `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
  return `${time} · ${b.treeName} · ${b.symbols.length} 檔`
}

/**
 * 單一標的結果列：摘要固定顯示，過程預設收合；可單筆刪除。
 */
function ResultRow({
  state,
  expanded,
  onToggle,
  onDelete,
  deleteDisabled,
}: {
  state: RunState
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  deleteDisabled?: boolean
}) {
  const statusLabel =
    state.status === 'completed'
      ? '完成'
      : state.status === 'awaiting_manual'
        ? '待確認'
        : state.status === 'error'
          ? '錯誤'
          : '執行中'
  const statusClass =
    state.status === 'completed'
      ? 'bg-emerald-100 text-success'
      : state.status === 'awaiting_manual'
        ? 'bg-amber-100 text-amber-800'
        : state.status === 'error'
          ? 'bg-red-100 text-red-800'
          : 'bg-muted text-card-fg'

  return (
    <li className="p-4">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onToggle} className="flex-1 flex items-start gap-2 text-left min-w-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 mt-1 text-muted-fg shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 mt-1 text-muted-fg shrink-0" />
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-fg">{state.symbol}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
            </div>
            {state.status === 'completed' && (
              <p className="text-base md:text-lg font-medium text-fg leading-snug">
                {state.resultAdvice}
              </p>
            )}
            {state.status === 'error' && (
              <p className="text-sm text-red-700">執行中止：{state.error}</p>
            )}
            {state.status === 'awaiting_manual' && (
              <p className="text-sm text-amber-800">{state.pendingPrompt}</p>
            )}
            <p className="text-xs text-muted-fg">
              {expanded ? '收合過程' : `展開過程（${state.path.length} 步）`}
            </p>
          </div>
        </button>
        <button
          type="button"
          className="shrink-0 text-xs text-danger border border-red-200 rounded-lg px-2 py-1 hover:bg-danger-soft disabled:opacity-50"
          onClick={onDelete}
          disabled={deleteDisabled}
        >
          刪除
        </button>
      </div>

      {expanded && state.path.length > 0 && (
        <ol className="mt-3 ml-6 space-y-3 border-l-2 border-primary-100 pl-3">
          {state.path.map((step, i) => (
            <li key={`${step.nodeId}_${i}`}>
              <div className="text-sm font-medium text-fg">
                {i + 1}. [{getNodeKindLabel(step.kind)}] {step.label}
                {step.branchTaken && (
                  <span className="ml-2 text-xs text-muted-fg">
                    → {step.branchTaken === 'yes' ? '通過／是' : '未通過／否'}
                  </span>
                )}
              </div>
              {step.note && <p className="text-xs text-muted-fg mt-0.5">{step.note}</p>}
              {step.indicatorResults && (
                <ul className="mt-1 space-y-1.5">
                  {step.indicatorResults.map((r) => (
                    <li key={r.indicatorId} className="text-xs text-card-fg">
                      <div className="flex flex-wrap items-center gap-2">
                        <SourceBadge source={r.resolvedSource} />
                        <span>{getIndicatorLabel(r.indicatorId)}</span>
                        <span className="font-medium">{r.display}</span>
                        {r.error && <span className="text-danger">{r.error}</span>}
                      </div>
                      {/* 複合／公式：列出取用的各個組成數值 */}
                      {r.components && r.components.length > 0 && (
                        <ul className="mt-1 ml-3 space-y-0.5 text-muted-fg border-l border-border pl-2">
                          {r.components.map((c, ci) => (
                            <li key={`${r.indicatorId}_c_${ci}`}>
                              {c.label}：{c.display}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}
