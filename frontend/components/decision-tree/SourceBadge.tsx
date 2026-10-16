/**
 * 指標來源徽章（OpenAPI／AI／手動／實際解析來源）。
 */

import type { IndicatorSource } from '@/lib/tools/decision-tree/types'

/** 來源徽章樣式（語意色，隨主題變化） */
const STYLES: Record<string, string> = {
  openapi: 'bg-primary-soft text-primary',
  ai: 'bg-primary-soft text-accent',
  manual: 'bg-warning-soft text-warning',
  error: 'bg-danger-soft text-danger',
}

const LABELS: Record<string, string> = {
  openapi: '官方',
  ai: 'AI',
  manual: '手動',
  error: '錯誤',
}

/**
 * @param source - 來源標籤
 * @returns 徽章元素
 */
export function SourceBadge({ source }: { source: IndicatorSource | 'error' | string }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STYLES[source] || 'bg-muted text-muted-fg'}`}>
      {LABELS[source] || source}
    </span>
  )
}
