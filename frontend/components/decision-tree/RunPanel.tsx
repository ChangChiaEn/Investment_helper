'use client'

/**
 * 決策樹執行頁：多選標的批次執行、結果摘要與可收合過程、本機記憶。
 */

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { precheckBatch, runDecisionTreeBatch } from '@/lib/tools/decision-tree/batchRunner'
import { runDecisionTree, treeHasManualNode } from '@/lib/tools/decision-tree/engine'
import { collectAllSymbols } from '@/lib/tools/decision-tree/inventoryStore'
import {
  clearRunSession,
  loadRunSession,
  saveRunSession,
} from '@/lib/tools/decision-tree/runResultStore'
import { getActiveTree, loadTrees, setActiveTreeId } from '@/lib/tools/decision-tree/treeStore'
import type { DecisionInventory, RunState } from '@/lib/tools/decision-tree/types'
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
  const [trees, setTrees] = useState(loadTrees())
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<RunState[]>([])
  /** 展開過程的標的代號集合 */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [batchHint, setBatchHint] = useState('')

  // --- 還原上次執行結果（切換分頁／重整） ---
  useEffect(() => {
    setTrees(loadTrees())
    const session = loadRunSession()
    if (session.selectedSymbols.length) setSelectedSymbols(session.selectedSymbols)
    if (session.results.length) setResults(session.results)
  }, [])

  // --- 自動持久化 ---
  useEffect(() => {
    saveRunSession({
      treeId: trees.activeId,
      selectedSymbols,
      results,
      running,
      updatedAt: Date.now(),
    })
  }, [trees.activeId, selectedSymbols, results, running])

  const symbols = useMemo(() => collectAllSymbols(inventory), [inventory])

  const activeTree = getActiveTree()
  const hasManual = activeTree ? treeHasManualNode(activeTree) : false

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
   * 開始執行（單檔或批次）。
   */
  const handleRun = async () => {
    const tree = getActiveTree()
    if (!tree) {
      alert('請先在「編輯樹」建立並儲存決策樹')
      return
    }
    const check = precheckBatch(tree, selectedSymbols)
    if (!check.ok) {
      setBatchHint(check.message)
      alert(check.message)
      return
    }
    setBatchHint('')
    setRunning(true)
    setResults([])
    try {
      if (selectedSymbols.length === 1) {
        const next = await runDecisionTree({
          tree,
          symbol: selectedSymbols[0],
          inventory,
        })
        setResults([next])
      } else {
        const batch = await runDecisionTreeBatch({
          tree,
          symbols: selectedSymbols,
          inventory,
          onProgress: (partial) => setResults([...partial]),
        })
        setResults(batch)
      }
    } catch (err) {
      setResults([
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
   * 人工節點回答後繼續（僅單檔）。
   * @param answer - 是／否
   */
  const handleManual = async (answer: 'yes' | 'no') => {
    const tree = getActiveTree()
    const pending = results.find((r) => r.status === 'awaiting_manual')
    if (!tree || !pending) return
    setRunning(true)
    try {
      const next = await runDecisionTree({
        tree,
        symbol: pending.symbol,
        inventory,
        previous: pending,
        manualAnswer: answer,
      })
      setResults((prev) => prev.map((r) => (r.symbol === pending.symbol ? next : r)))
    } catch (err) {
      setResults((prev) =>
        prev.map((r) =>
          r.symbol === pending.symbol
            ? {
                ...r,
                status: 'error',
                error: err instanceof Error ? err.message : String(err),
              }
            : r
        )
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
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  const summary = useMemo(() => {
    const completed = results.filter((r) => r.status === 'completed')
    const errors = results.filter((r) => r.status === 'error')
    const waiting = results.filter((r) => r.status === 'awaiting_manual')
    return { completed: completed.length, errors: errors.length, waiting: waiting.length, total: results.length }
  }, [results])

  const pendingManual = results.find((r) => r.status === 'awaiting_manual')

  return (
    <div className="space-y-4">
      <Disclaimer />

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-gray-700">
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
            className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium disabled:opacity-50"
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
          {results.length > 0 && (
            <button
              type="button"
              className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              onClick={() => {
                setResults([])
                clearRunSession()
              }}
            >
              清除結果記憶
            </button>
          )}
        </div>

        {hasManual && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            此樹含人工確認節點：僅可單檔執行。若選多檔會提示改為單檔。
          </p>
        )}
        {batchHint && <p className="text-xs text-red-700">{batchHint}</p>}

        {/* 多選標的 */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-800">標的（可多選）</span>
            <button type="button" className="text-xs text-primary-700" onClick={selectAll}>
              全選
            </button>
            <button type="button" className="text-xs text-gray-500" onClick={clearSelection}>
              清空
            </button>
            <span className="text-xs text-gray-400">已選 {selectedSymbols.length}</span>
          </div>
          {symbols.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              庫存尚無標的。請先至「庫存」新增持股或自訂分類。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {symbols.map(([sym, name]) => {
                const checked = selectedSymbols.includes(sym)
                return (
                  <label
                    key={sym}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                      checked
                        ? 'border-primary-500 bg-primary-50 text-primary-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={checked}
                      onChange={() => toggleSymbol(sym)}
                    />
                    <span className="font-mono">{sym}</span>
                    <span className="text-gray-500 truncate max-w-[100px]">{name}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {pendingManual && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-amber-900">
            需要人工確認 · {pendingManual.symbol}
          </h3>
          <p className="text-sm text-amber-800">{pendingManual.pendingPrompt}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={running}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
              onClick={() => handleManual('yes')}
            >
              是
            </button>
            <button
              type="button"
              disabled={running}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
              onClick={() => handleManual('no')}
            >
              否
            </button>
          </div>
        </div>
      )}

      {/* 統一結果摘要 */}
      {results.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap gap-3 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">執行結果</span>
            <span>共 {summary.total} 檔</span>
            <span className="text-emerald-700">完成 {summary.completed}</span>
            {summary.waiting > 0 && <span className="text-amber-700">待確認 {summary.waiting}</span>}
            {summary.errors > 0 && <span className="text-red-700">錯誤 {summary.errors}</span>}
          </div>
          <ul className="divide-y">
            {results.map((state) => (
              <ResultRow
                key={`${state.symbol}_${state.treeId}`}
                state={state}
                expanded={expanded.has(state.symbol)}
                onToggle={() => toggleExpand(state.symbol)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * 單一標的結果列：摘要固定顯示，過程預設收合。
 */
function ResultRow({
  state,
  expanded,
  onToggle,
}: {
  state: RunState
  expanded: boolean
  onToggle: () => void
}) {
  const statusLabel =
    state.status === 'completed'
      ? '完成'
      : state.status === 'awaiting_manual'
        ? '待人工'
        : state.status === 'error'
          ? '錯誤'
          : '執行中'
  const statusClass =
    state.status === 'completed'
      ? 'bg-emerald-100 text-emerald-800'
      : state.status === 'awaiting_manual'
        ? 'bg-amber-100 text-amber-800'
        : state.status === 'error'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-700'

  return (
    <li className="p-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 mt-1 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 mt-1 text-gray-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-gray-900">{state.symbol}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
          </div>
          {state.status === 'completed' && (
            <p className="text-sm text-gray-800">{state.resultAdvice}</p>
          )}
          {state.status === 'error' && (
            <p className="text-sm text-red-700">執行中止：{state.error}</p>
          )}
          {state.status === 'awaiting_manual' && (
            <p className="text-sm text-amber-800">{state.pendingPrompt}</p>
          )}
          {state.resultParams && Object.keys(state.resultParams).length > 0 && (
            <ul className="text-xs text-gray-600 list-disc ml-4">
              {Object.entries(state.resultParams).map(([k, v]) => (
                <li key={k}>
                  {k}：{String(v)}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400">
            {expanded ? '收合過程' : `展開過程（${state.path.length} 步）`}
          </p>
        </div>
      </button>

      {expanded && state.path.length > 0 && (
        <ol className="mt-3 ml-6 space-y-3 border-l-2 border-primary-100 pl-3">
          {state.path.map((step, i) => (
            <li key={`${step.nodeId}_${i}`}>
              <div className="text-sm font-medium text-gray-900">
                {i + 1}. [{step.kind}] {step.label}
                {step.branchTaken && (
                  <span className="ml-2 text-xs text-gray-500">
                    → {step.branchTaken === 'yes' ? '通過／是' : '未通過／否'}
                  </span>
                )}
              </div>
              {step.note && <p className="text-xs text-gray-600 mt-0.5">{step.note}</p>}
              {step.indicatorResults && (
                <ul className="mt-1 space-y-1">
                  {step.indicatorResults.map((r) => (
                    <li
                      key={r.indicatorId}
                      className="text-xs flex flex-wrap items-center gap-2 text-gray-700"
                    >
                      <SourceBadge source={r.resolvedSource} />
                      <span className="font-mono">{r.indicatorId}</span>
                      <span>{r.display}</span>
                      {r.error && <span className="text-red-600">{r.error}</span>}
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
