'use client'

/**
 * 全站庫存 Context：唯一標的中心（持股＋分類含「關注」）。
 * 取代獨立 Watchlist storage；啟動時會遷移舊鍵。
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AssetType } from '@/lib/domain'
import {
  WATCH_LIST_NAME,
  addListItem,
  collectSymbolRefs,
  createEmptyInventory,
  hasInWatchList,
  loadInventory,
  removeWatchListItem,
  toggleWatchListItem,
  type Inventory,
  type ListItem,
  type ListItemInput,
} from '@/lib/inventory'

/** Context 對外 API */
interface InventoryContextType {
  /** 完整庫存 */
  inventory: Inventory
  /** 是否已從 localStorage 載入 */
  ready: boolean
  /** 覆寫整份庫存（決策樹 InventoryPanel 等；呼叫端應已 save） */
  setInventory: (inv: Inventory) => void
  /** 「關注」分類項目（相容舊 Watchlist UI） */
  watchItems: ListItem[]
  /** 是否在關注中 */
  hasWatch: (symbol: string, assetType?: AssetType) => boolean
  /** 切換關注 */
  toggleWatch: (item: ListItemInput) => void
  /** 從關注移除（依 item id） */
  removeWatch: (itemId: string) => void
  /** 加入指定分類（無 listId 則進「關注」；已存在則不變） */
  addToList: (item: ListItemInput, listId?: string) => void
  /** 彙整可選標的 */
  allSymbols: ReturnType<typeof collectSymbolRefs>
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

/**
 * 庫存 Provider：掛載時 load＋遷移舊 Watchlist。
 * @param children - 子節點
 */
export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventoryState] = useState<Inventory>(createEmptyInventory)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setInventoryState(loadInventory())
    setReady(true)
  }, [])

  const setInventory = useCallback((inv: Inventory) => {
    setInventoryState(inv)
  }, [])

  const watchItems = useMemo(() => {
    const list = inventory.lists.find((l) => l.name === WATCH_LIST_NAME)
    return list?.items ?? []
  }, [inventory])

  const hasWatch = useCallback(
    (symbol: string, assetType: AssetType = 'stock') =>
      hasInWatchList(inventory, symbol, assetType),
    [inventory]
  )

  const toggleWatch = useCallback((item: ListItemInput) => {
    setInventoryState((prev) => toggleWatchListItem(prev, item))
  }, [])

  const removeWatch = useCallback((itemId: string) => {
    setInventoryState((prev) => removeWatchListItem(prev, itemId))
  }, [])

  const addToList = useCallback((item: ListItemInput, listId?: string) => {
    setInventoryState((prev) => {
      if (listId) return addListItem(prev, listId, item)
      if (hasInWatchList(prev, item.symbol, item.assetType || 'stock')) return prev
      return toggleWatchListItem(prev, item)
    })
  }, [])

  const allSymbols = useMemo(() => collectSymbolRefs(inventory), [inventory])

  const value = useMemo<InventoryContextType>(
    () => ({
      inventory,
      ready,
      setInventory,
      watchItems,
      hasWatch,
      toggleWatch,
      removeWatch,
      addToList,
      allSymbols,
    }),
    [
      inventory,
      ready,
      setInventory,
      watchItems,
      hasWatch,
      toggleWatch,
      removeWatch,
      addToList,
      allSymbols,
    ]
  )

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  )
}

/**
 * 取得庫存 Context。
 * @returns InventoryContextType
 * @throws 未包在 Provider 內
 */
export function useInventory(): InventoryContextType {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider')
  return ctx
}
