/**
 * 使用者自訂公式指標本機儲存與目錄轉換。
 */

import type { FormulaIndicator, IndicatorDef } from './types'

const STORAGE_KEY = 'sagafisc_decision_formulas'

/**
 * 讀取全部自訂公式。
 * @returns 公式列表
 */
export function loadFormulas(): FormulaIndicator[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FormulaIndicator[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 寫入公式列表。
 * @param list - 完整列表
 */
export function saveFormulas(list: FormulaIndicator[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/**
 * 新增一筆公式。
 * @param input - 名稱與表達式
 * @returns 更新後列表
 */
export function addFormula(input: {
  name: string
  expression: string
  description?: string
}): FormulaIndicator[] {
  const list = loadFormulas()
  const item: FormulaIndicator = {
    id: `formula_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    name: input.name.trim() || '未命名公式',
    expression: input.expression.trim(),
    description: input.description?.trim(),
    createdAt: Date.now(),
  }
  const next = [item, ...list]
  saveFormulas(next)
  return next
}

/**
 * 刪除公式。
 * @param id - 公式 id
 * @returns 更新後列表
 */
export function deleteFormula(id: string): FormulaIndicator[] {
  const next = loadFormulas().filter((f) => f.id !== id)
  saveFormulas(next)
  return next
}

/**
 * 將公式轉成指標目錄項目。
 * @param f - 公式
 * @returns IndicatorDef
 */
export function formulaToIndicatorDef(f: FormulaIndicator): IndicatorDef {
  return {
    id: f.id,
    name: f.name,
    description: f.description || `公式：${f.expression}`,
    source: 'formula',
    valueType: 'number',
    expression: f.expression,
  }
}
