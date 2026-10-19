'use client'

/**
 * 獨立庫存管理頁：持股、自訂分類、全域參數。
 * 與側欄／決策樹共用 InventoryContext。
 */

import { Briefcase } from 'lucide-react'
import { InventoryPanel } from '@/components/inventory/InventoryPanel'
import { useInventory } from '@/contexts/InventoryContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getToolDisplayLabels } from '@/config/disguise'
import type { DecisionInventory } from '@/lib/inventory'

/**
 * 庫存工具頁面。
 * @returns 庫存管理 UI
 */
export default function InventoryPage() {
  const { disguise } = useTheme()
  const pageLabels = getToolDisplayLabels(
    'inventory',
    '庫存',
    '管理持股、關注分類與資金參數；各工具可從此讀寫標的。',
    disguise,
  )
  const { inventory, ready, setInventory } = useInventory()

  /**
   * 庫存變更時同步 Context（store 已寫入 localStorage）。
   * @param inv - 新庫存
   */
  const handleChange = (inv: DecisionInventory) => {
    setInventory(inv)
  }

  if (!ready) {
    return <div className="p-8 text-muted-fg text-sm">載入庫存中...</div>
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-fg">{pageLabels.name}</h1>
            <p className="text-sm text-muted-fg">{pageLabels.description}</p>
          </div>
        </div>
      </div>

      <InventoryPanel inventory={inventory} onChange={handleChange} />
    </div>
  )
}
