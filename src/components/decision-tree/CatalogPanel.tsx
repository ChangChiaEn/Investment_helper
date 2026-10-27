'use client'

/**
 * 指標目錄瀏覽：內建指標、參數變體複製、自訂公式新增／刪除。
 */

import { useMemo, useState } from 'react'
import { getAllIndicators, INDICATOR_CATALOG } from '@/lib/tools/decision-tree/catalog'
import { validateFormulaSyntax } from '@/lib/tools/decision-tree/formulaEval'
import {
  addFormula,
  deleteFormula,
  loadFormulas,
} from '@/lib/tools/decision-tree/formulaStore'
import {
  addVariant,
  defaultParamsFromSchema,
  deleteVariant,
  formatParamsLabel,
  loadVariants,
} from '@/lib/tools/decision-tree/variantStore'
import type {
  FormulaIndicator,
  IndicatorDef,
  IndicatorVariant,
} from '@/lib/tools/decision-tree/types'
import { SourceBadge } from './SourceBadge'

/**
 * @returns 指標目錄 UI（含變體複製與自訂公式）
 */
export function CatalogPanel() {
  const [formulas, setFormulas] = useState<FormulaIndicator[]>(() =>
    typeof window !== 'undefined' ? loadFormulas() : []
  )
  const [variants, setVariants] = useState<IndicatorVariant[]>(() =>
    typeof window !== 'undefined' ? loadVariants() : []
  )
  const [name, setName] = useState('')
  const [expression, setExpression] = useState('entry_price - 2 * atr')
  const [error, setError] = useState('')
  /** 正在複製參數的內建指標 id；null 表示未開對話 */
  const [cloneOf, setCloneOf] = useState<string | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [cloneParams, setCloneParams] = useState<Record<string, number | string>>({})
  const [cloneError, setCloneError] = useState('')

  // 公式／變體變更時重算合併目錄
  const catalog = useMemo(() => getAllIndicators(), [formulas, variants])

  const cloneBase = useMemo(
    () => (cloneOf ? INDICATOR_CATALOG.find((i) => i.id === cloneOf) : undefined),
    [cloneOf]
  )

  /**
   * 新增自訂公式並刷新列表。
   */
  const handleAdd = () => {
    const syntaxErr = validateFormulaSyntax(expression)
    if (syntaxErr) {
      setError(syntaxErr)
      return
    }
    if (!name.trim()) {
      setError('請填名稱')
      return
    }
    setError('')
    setFormulas(addFormula({ name, expression }))
    setName('')
  }

  /**
   * 刪除公式並刷新列表。
   * @param id - 公式 id
   */
  const handleDelete = (id: string) => {
    setFormulas(deleteFormula(id))
  }

  /**
   * 開啟「複製指標並改參數」表單。
   * @param ind - 來源內建指標（須有 params）
   */
  const openClone = (ind: IndicatorDef) => {
    if (!ind.params?.length || ind.baseIndicatorId) return
    setCloneOf(ind.id)
    setCloneName(`${ind.name}（自訂）`)
    setCloneParams(defaultParamsFromSchema(ind.params))
    setCloneError('')
  }

  /**
   * 確認寫入參數變體。
   */
  const confirmClone = () => {
    if (!cloneOf || !cloneBase?.params?.length) return
    if (!cloneName.trim()) {
      setCloneError('請填變體名稱')
      return
    }
    try {
      setVariants(
        addVariant({
          name: cloneName,
          baseIndicatorId: cloneOf,
          params: cloneParams,
        })
      )
      setCloneOf(null)
      setCloneError('')
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * 刪除參數變體。
   * @param id - 變體 id
   */
  const handleDeleteVariant = (id: string) => {
    setVariants(deleteVariant(id))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-fg">
        編輯決策節點時可選用下列指標。有「可調參數」者可在條件中直接改視窗日數，或在此複製成獨立變體（例如
        MA20 與 MA60）以便重複選用。官方行情失敗時降級 AI；自填欄位來自庫存。
      </p>

      {/* --- 複製參數對話（指標頁） --- */}
      {cloneBase && cloneOf && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-fg">複製指標並另設參數</h3>
          <p className="text-xs text-muted-fg">
            基底：{cloneBase.name}（{cloneOf}）。儲存後會出現在選單中，條件裡也可再覆寫參數。
          </p>
          <label className="text-xs text-card-fg block">
            變體名稱
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="例：移動平均線 20 日"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(cloneBase.params || []).map((p) => (
              <label key={p.key} className="text-xs text-card-fg block">
                {p.label}
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                  value={Number(cloneParams[p.key] ?? p.default ?? 0)}
                  min={p.min}
                  max={p.max}
                  onChange={(e) =>
                    setCloneParams((prev) => ({
                      ...prev,
                      [p.key]: Number(e.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
          {cloneError && <p className="text-xs text-danger">{cloneError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-sm bg-primary text-primary-fg rounded-lg"
              onClick={confirmClone}
            >
              儲存變體
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-sm border rounded-lg"
              onClick={() => setCloneOf(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* --- 已存參數變體 --- */}
      {variants.length > 0 && (
        <div className="bg-card border rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-fg">我的參數變體</h3>
          <ul className="divide-y border rounded-lg overflow-hidden">
            {variants.map((v) => (
              <li
                key={v.id}
                className="flex items-start justify-between gap-3 px-3 py-2 text-sm bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="font-medium text-fg">{v.name}</div>
                  <p className="text-xs text-muted-fg mt-0.5">
                    基底 {v.baseIndicatorId}｜{formatParamsLabel(v.params)}
                  </p>
                  <p className="text-[10px] font-mono text-muted-fg">{v.id}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-danger shrink-0"
                  onClick={() => handleDeleteVariant(v.id)}
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- 自訂公式（指標頁） --- */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-fg">自訂公式指標</h3>
          <p className="text-xs text-muted-fg mt-1">
            以四則運算、括號與既有指標 id 組合，例如{' '}
            <code className="font-mono text-[11px]">entry_price - 2 * atr</code>
            。新增後可在決策條件選單中選用。
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] items-end">
          <label className="text-xs text-card-fg block">
            名稱
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
              placeholder="例：進場價減兩倍 ATR"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-xs text-card-fg block">
            表達式
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm font-mono"
              placeholder="entry_price - 2 * atr"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="px-3 py-2 text-sm bg-primary text-primary-fg rounded-lg"
            onClick={handleAdd}
          >
            新增公式
          </button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {formulas.length > 0 && (
          <ul className="divide-y border rounded-lg overflow-hidden">
            {formulas.map((f) => (
              <li
                key={f.id}
                className="flex items-start justify-between gap-3 px-3 py-2 text-sm bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-fg">{f.name}</span>
                    <SourceBadge source="formula" />
                  </div>
                  <p className="text-xs font-mono text-muted-fg mt-0.5 break-all">{f.expression}</p>
                  <p className="text-[10px] font-mono text-muted-fg">{f.id}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-danger shrink-0"
                  onClick={() => handleDelete(f.id)}
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {catalog.map((ind) => (
          <div key={ind.id} className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-medium text-fg">{ind.name}</h3>
              <SourceBadge source={ind.source} />
            </div>
            <p className="text-xs text-muted-fg mb-2 font-mono">{ind.id}</p>
            <p className="text-sm text-card-fg">{ind.description}</p>
            {ind.expression && (
              <p className="mt-2 text-xs font-mono text-muted-fg">表達式：{ind.expression}</p>
            )}
            {ind.params && ind.params.length > 0 && (
              <ul className="mt-2 text-xs text-muted-fg space-y-0.5">
                {ind.params.map((p) => (
                  <li key={p.key}>
                    參數 {p.label}（預設{' '}
                    {String(ind.defaultParams?.[p.key] ?? p.default)}）
                  </li>
                ))}
              </ul>
            )}
            {ind.unit && <p className="mt-2 text-xs text-muted-fg">單位：{ind.unit}</p>}
            {/* 僅內建且有可調參數者可複製成變體 */}
            {ind.params && ind.params.length > 0 && !ind.baseIndicatorId && !ind.expression && (
              <button
                type="button"
                className="mt-3 text-xs text-primary-700"
                onClick={() => openClone(ind)}
              >
                複製並另設參數
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
