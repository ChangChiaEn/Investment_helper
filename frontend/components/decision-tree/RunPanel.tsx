'use client'

/**
 * 決策樹執行頁：選樹／標的、人工確認、路徑與建議結果。
 */

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { runDecisionTree } from '@/lib/tools/decision-tree/engine'
import type { DecisionInventory, RunState } from '@/lib/tools/decision-tree/types'
import { getActiveTree, loadTrees, setActiveTreeId } from '@/lib/tools/decision-tree/treeStore'
import { SourceBadge } from './SourceBadge'
import { Disclaimer } from '@/components/Disclaimer'

interface Props {
  inventory: DecisionInventory
}

/**
 * @param inventory - 庫存（含持股與全域參數）
 * @returns 執行 UI
 */
export function RunPanel({ inventory }: Props) {
  const [trees, setTrees] = useState(loadTrees())
  const [symbol, setSymbol] = useState('')
  const [running, setRunning] = useState(false)
  const [state, setState] = useState<RunState | null>(null)

  useEffect(() => {
    setTrees(loadTrees())
  }, [])

  const symbols = useMemo(() => {
    const set = new Map<string, string>()
    inventory.holdings.forEach((h) => set.set(h.symbol, h.name))
    inventory.watchlist.forEach((w) => set.set(w.symbol, w.name))
    inventory.candidates.forEach((c) => set.set(c.symbol, c.name))
    return Array.from(set.entries())
  }, [inventory])

  /**
   * 開始執行作用中決策樹。
   */
  const handleRun = async () => {
    const tree = getActiveTree()
    if (!tree) {
      alert('請先在「編輯樹」建立並儲存決策樹')
      return
    }
    if (!symbol) {
      alert('請選擇標的')
      return
    }
    setRunning(true)
    setState(null)
    try {
      const next = await runDecisionTree({ tree, symbol, inventory })
      setState(next)
    } catch (err) {
      setState({
        status: 'error',
        treeId: tree.id,
        symbol,
        currentNodeId: null,
        path: [],
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setRunning(false)
    }
  }

  /**
   * 人工節點回答後繼續。
   * @param answer - 是／否
   */
  const handleManual = async (answer: 'yes' | 'no') => {
    const tree = getActiveTree()
    if (!tree || !state) return
    setRunning(true)
    try {
      const next = await runDecisionTree({
        tree,
        symbol: state.symbol,
        inventory,
        previous: state,
        manualAnswer: answer,
      })
      setState(next)
    } catch (err) {
      setState({
        ...state,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <Disclaimer />

      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-end">
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
        <label className="text-sm text-gray-700">
          標的
          <select
            className="mt-1 block border rounded-lg px-3 py-2 min-w-[180px]"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          >
            <option value="">請選擇</option>
            {symbols.map(([sym, name]) => (
              <option key={sym} value={sym}>
                {sym} {name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={running}
          onClick={handleRun}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium disabled:opacity-50"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              執行中
            </span>
          ) : (
            '執行決策樹'
          )}
        </button>
      </div>

      {symbols.length === 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
          庫存尚無標的。請先至「庫存」新增持股、觀察或候選。
        </p>
      )}

      {state?.status === 'awaiting_manual' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-amber-900">需要人工確認</h3>
          <p className="text-sm text-amber-800">{state.pendingPrompt}</p>
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

      {state?.status === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
          執行中止：{state.error}
        </div>
      )}

      {state?.status === 'completed' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-emerald-900">建議結果（非下單指示）</h3>
          <p className="text-gray-800">{state.resultAdvice}</p>
          {state.resultParams && Object.keys(state.resultParams).length > 0 && (
            <ul className="text-sm text-gray-700 list-disc ml-5">
              {Object.entries(state.resultParams).map(([k, v]) => (
                <li key={k}>
                  {k}：{String(v)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state && state.path.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3">執行路徑</h3>
          <ol className="space-y-3">
            {state.path.map((step, i) => (
              <li key={`${step.nodeId}_${i}`} className="border-l-2 border-primary-200 pl-3">
                <div className="text-sm font-medium text-gray-900">
                  {i + 1}. [{step.kind}] {step.label}
                  {step.branchTaken && (
                    <span className="ml-2 text-xs text-gray-500">→ {step.branchTaken === 'yes' ? '通過／是' : '未通過／否'}</span>
                  )}
                </div>
                {step.note && <p className="text-xs text-gray-600 mt-0.5">{step.note}</p>}
                {step.indicatorResults && (
                  <ul className="mt-1 space-y-1">
                    {step.indicatorResults.map((r) => (
                      <li key={r.indicatorId} className="text-xs flex flex-wrap items-center gap-2 text-gray-700">
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
        </div>
      )}
    </div>
  )
}
