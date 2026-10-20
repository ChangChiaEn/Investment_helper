'use client'

/**
 * 指標目錄瀏覽：內建指標、自訂公式新增／刪除與參數說明。
 */

import { useMemo, useState } from 'react'
import { getAllIndicators } from '@/lib/tools/decision-tree/catalog'
import { validateFormulaSyntax } from '@/lib/tools/decision-tree/formulaEval'
import {
  addFormula,
  deleteFormula,
  loadFormulas,
} from '@/lib/tools/decision-tree/formulaStore'
import type { FormulaIndicator } from '@/lib/tools/decision-tree/types'
import { SourceBadge } from './SourceBadge'

/**
 * @returns 指標目錄 UI（含自訂公式編輯）
 */
export function CatalogPanel() {
  const [formulas, setFormulas] = useState<FormulaIndicator[]>(() =>
    typeof window !== 'undefined' ? loadFormulas() : []
  )
  const [name, setName] = useState('')
  const [expression, setExpression] = useState('entry_price - 2 * atr')
  const [error, setError] = useState('')
  // 依公式列表刷新合併目錄（含剛新增的公式）
  const catalog = useMemo(() => getAllIndicators(), [formulas])

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-fg">
        編輯決策節點時可選用下列指標。官方行情／財報經代理即時查詢（路徑見設定頁「市場 API
        登錄」）；失敗或缺資料時降級
        AI；自填欄位來自庫存（未填以 0）；複合指標會先取行情再與庫存計算；公式為使用者自訂表達式。
      </p>

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
                    參數 {p.label}（預設 {String(p.default)}）
                  </li>
                ))}
              </ul>
            )}
            {ind.unit && <p className="mt-2 text-xs text-muted-fg">單位：{ind.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
