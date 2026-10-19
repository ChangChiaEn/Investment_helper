/**
 * 決策樹 UI 中文標籤：比較運算子、指標來源。
 */

import type { CompareOp, IndicatorSource } from './types'

/** 比較運算子顯示文字（選單用） */
export const COMPARE_OP_LABELS: Record<CompareOp, string> = {
  truthy: '為真（成立）',
  gte: '≥ 大於等於',
  gt: '＞ 大於',
  lte: '≤ 小於等於',
  lt: '＜ 小於',
  eq: '＝ 等於',
  neq: '≠ 不等於',
  between: '介於（區間）',
}

/** 選單顯示順序 */
export const COMPARE_OP_ORDER: CompareOp[] = [
  'truthy',
  'gte',
  'gt',
  'lte',
  'lt',
  'eq',
  'neq',
  'between',
]

/** 指標來源中文 */
export const INDICATOR_SOURCE_LABELS: Record<IndicatorSource | 'error', string> = {
  openapi: '官方',
  ai: 'AI',
  manual: '手動',
  error: '錯誤',
}

/**
 * 取得來源中文標籤。
 * @param source - 來源代碼
 * @returns 中文
 */
export function getSourceLabel(source: string): string {
  return INDICATOR_SOURCE_LABELS[source as IndicatorSource] || source
}
