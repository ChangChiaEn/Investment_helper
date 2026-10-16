/**
 * 指標來源徽章（OpenAPI／AI／手動／實際解析來源）。
 */

import type { IndicatorSource } from '@/lib/tools/decision-tree/types'

const STYLES: Record<string, string> = {
  openapi: 'bg-sky-100 text-sky-800',
  ai: 'bg-violet-100 text-violet-800',
  manual: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
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
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STYLES[source] || 'bg-gray-100 text-gray-600'}`}>
      {LABELS[source] || source}
    </span>
  )
}
