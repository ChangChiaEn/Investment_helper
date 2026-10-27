/**
 * 指標參數變體本機儲存：複製內建指標並另設參數。
 */

import type { IndicatorParamDef, IndicatorVariant } from './types'

const STORAGE_KEY = 'sagafisc_decision_indicator_variants'

/**
 * 自參數 schema 組出預設值物件。
 * @param defs - 參數定義
 * @returns key → default
 */
export function defaultParamsFromSchema(
  defs?: IndicatorParamDef[]
): Record<string, number | string> {
  const out: Record<string, number | string> = {}
  for (const p of defs || []) {
    if (p.default !== undefined) out[p.key] = p.default
  }
  return out
}

/**
 * 將參數物件格式化成短字串（顯示用）。
 * @param params - 參數
 * @returns 例：n=20, days=10
 */
export function formatParamsLabel(params: Record<string, number | string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
}

/**
 * 讀取全部參數變體。
 * @returns 變體列表
 */
export function loadVariants(): IndicatorVariant[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as IndicatorVariant[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 寫入變體列表。
 * @param list - 完整列表
 */
export function saveVariants(list: IndicatorVariant[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/**
 * 新增一筆參數變體。
 * @param input - 名稱、基底 id、參數
 * @returns 更新後列表
 */
export function addVariant(input: {
  name: string
  baseIndicatorId: string
  params: Record<string, number | string>
  description?: string
}): IndicatorVariant[] {
  const list = loadVariants()
  const item: IndicatorVariant = {
    id: `variant_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    name: input.name.trim() || '未命名變體',
    baseIndicatorId: input.baseIndicatorId,
    params: { ...input.params },
    description: input.description?.trim(),
    createdAt: Date.now(),
  }
  const next = [item, ...list]
  saveVariants(next)
  return next
}

/**
 * 刪除變體。
 * @param id - 變體 id
 * @returns 更新後列表
 */
export function deleteVariant(id: string): IndicatorVariant[] {
  const next = loadVariants().filter((v) => v.id !== id)
  saveVariants(next)
  return next
}
