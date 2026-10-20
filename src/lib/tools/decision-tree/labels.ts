/**
 * 決策樹 UI 中文標籤：比較運算子、指標來源、節點種類。
 */

import { getIndicatorDef } from './catalog'
import type { CompareOp, NodeKind } from './types'

/** 執行路徑／節點種類中文 */
export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  decision: '決策',
  manual: '主觀確認',
  result: '結果',
}

/**
 * 取得節點種類中文。
 * @param kind - 節點種類
 * @returns 中文
 */
export function getNodeKindLabel(kind: string): string {
  return NODE_KIND_LABELS[kind as NodeKind] || kind
}

/**
 * 取得指標顯示名稱（優先目錄中文名，否則回傳 id）。
 * @param indicatorId - 指標 id
 * @returns 顯示名稱
 */
export function getIndicatorLabel(indicatorId: string): string {
  return getIndicatorDef(indicatorId)?.name || indicatorId
}

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
export const INDICATOR_SOURCE_LABELS: Record<string, string> = {
  openapi: '官方',
  ai: 'AI',
  inventory: '自填',
  composite: '複合',
  formula: '公式',
  manual: '自填',
  error: '錯誤',
}

/**
 * 取得來源中文標籤。
 * @param source - 來源代碼
 * @returns 中文
 */
export function getSourceLabel(source: string): string {
  return INDICATOR_SOURCE_LABELS[source] || source
}
