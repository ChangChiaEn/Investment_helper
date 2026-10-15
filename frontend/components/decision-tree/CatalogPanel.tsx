'use client'

/**
 * 指標目錄瀏覽（三類徽章與參數說明）。
 */

import { INDICATOR_CATALOG } from '@/lib/tools/decision-tree/catalog'
import { SourceBadge } from './SourceBadge'

/**
 * @returns 指標目錄 UI
 */
export function CatalogPanel() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        編輯決策節點時可選用下列指標。OpenAPI 經代理即時查詢；失敗或缺資料時降級 AI；手動欄位來自庫存。
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {INDICATOR_CATALOG.map((ind) => (
          <div key={ind.id} className="bg-white border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-medium text-gray-900">{ind.name}</h3>
              <SourceBadge source={ind.source} />
            </div>
            <p className="text-xs text-gray-500 mb-2 font-mono">{ind.id}</p>
            <p className="text-sm text-gray-700">{ind.description}</p>
            {ind.params && ind.params.length > 0 && (
              <ul className="mt-2 text-xs text-gray-600 space-y-0.5">
                {ind.params.map((p) => (
                  <li key={p.key}>
                    參數 {p.label}（預設 {String(p.default)}）
                  </li>
                ))}
              </ul>
            )}
            {ind.unit && <p className="mt-2 text-xs text-gray-400">單位：{ind.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
