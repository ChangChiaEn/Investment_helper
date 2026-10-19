'use client'

/**
 * 決策樹工具主頁：庫存／指標／編輯樹／執行。
 */

import { useEffect, useState } from 'react'
import { GitBranch } from 'lucide-react'
import { CatalogPanel } from '@/components/decision-tree/CatalogPanel'
import { InventoryPanel } from '@/components/inventory/InventoryPanel'
import { RunPanel } from '@/components/decision-tree/RunPanel'
import { TreeEditorPanel } from '@/components/decision-tree/TreeEditorPanel'
import { loadInventory, type DecisionInventory } from '@/lib/inventory'
import { useTheme } from '@/contexts/ThemeContext'
import { getToolDisplayLabels } from '@/config/disguise'

type TabId = 'inventory' | 'catalog' | 'editor' | 'run'

const TABS: { id: TabId; label: string }[] = [
  { id: 'inventory', label: '庫存' },
  { id: 'catalog', label: '指標' },
  { id: 'editor', label: '編輯樹' },
  { id: 'run', label: '執行' },
]

/**
 * 決策樹工具頁面。
 * @returns 工具 UI
 */
export default function DecisionTreePage() {
  const { disguise } = useTheme()
  const pageLabels = getToolDisplayLabels(
    'decision-tree',
    '決策樹',
    '自訂指標條件與多分叉決策樹；僅輸出建議，不執行下單。資料存於本機瀏覽器。',
    disguise,
  )
  const [tab, setTab] = useState<TabId>('inventory')
  const [inventory, setInventory] = useState<DecisionInventory | null>(null)

  useEffect(() => {
    setInventory(loadInventory())
  }, [])

  /**
   * 庫存變更時更新狀態（store 函式已寫入 localStorage）。
   * @param inv - 新庫存
   */
  const handleInventoryChange = (inv: DecisionInventory) => {
    setInventory(inv)
  }

  if (!inventory) {
    return (
      <div className="p-8 text-muted-fg text-sm">載入庫存中...</div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <GitBranch className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-fg">{pageLabels.name}</h1>
            <p className="text-sm text-muted-fg">
              {disguise
                ? '自訂條件與流程圖；僅產出建議，不執行操作。資料存於本機。'
                : pageLabels.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary text-primary-fg'
                : 'bg-card text-card-fg border border-border hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 分頁改以隱藏切換，避免卸載後遺失執行結果；結果另有 localStorage 記憶 */}
      <div className={tab === 'inventory' ? '' : 'hidden'}>
        <InventoryPanel inventory={inventory} onChange={handleInventoryChange} />
      </div>
      <div className={tab === 'catalog' ? '' : 'hidden'}>
        <CatalogPanel />
      </div>
      <div className={tab === 'editor' ? '' : 'hidden'}>
        <TreeEditorPanel />
      </div>
      <div className={tab === 'run' ? '' : 'hidden'}>
        <RunPanel inventory={inventory} />
      </div>
    </div>
  )
}
