'use client'

/**
 * @deprecated 關注清單已併入 Inventory「關注」分類。
 * 此檔提供薄相容層；新程式請用 useInventory。
 */

import { useMemo } from 'react'
import { useInventory } from '@/contexts/InventoryContext'
import type { AssetType } from '@/lib/domain'

/** @deprecated 請改用 ListItem＋assetType */
export interface WatchlistItem {
  id: string
  symbol: string
  name: string
  type: 'stock' | 'fund'
  source?: string
  addedAt: number
}

/**
 * 相容舊 useWatchlist API（底層讀寫 Inventory）。
 * @returns 舊版關注清單介面
 */
export function useWatchlist() {
  const { watchItems, hasWatch, toggleWatch, removeWatch, addToList } = useInventory()

  const items: WatchlistItem[] = useMemo(
    () =>
      watchItems.map((i) => ({
        id: i.id,
        symbol: i.symbol,
        name: i.name,
        type: (i.assetType || 'stock') as 'stock' | 'fund',
        source: i.source,
        addedAt: i.addedAt,
      })),
    [watchItems]
  )

  return {
    items,
    add: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => {
      addToList({
        symbol: item.symbol,
        name: item.name,
        assetType: item.type as AssetType,
        source: item.source,
      })
    },
    remove: (id: string) => removeWatch(id),
    has: (symbol: string, type: 'stock' | 'fund') => hasWatch(symbol, type),
    toggle: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => {
      toggleWatch({
        symbol: item.symbol,
        name: item.name,
        assetType: item.type as AssetType,
        source: item.source,
      })
    },
  }
}

/**
 * @deprecated 請改用 InventoryProvider；此元件僅透傳 children。
 * @param children - 子節點
 */
export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
