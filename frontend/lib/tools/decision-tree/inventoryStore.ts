/**
 * 決策樹庫存本機儲存（localStorage）。
 */

import type { DecisionInventory, HoldingItem, ListItem } from './types'

const STORAGE_KEY = 'sagafisc_decision_inventory'

/** 預設空庫存 */
export function createEmptyInventory(): DecisionInventory {
  return {
    holdings: [],
    watchlist: [],
    candidates: [],
    totalCapital: 1000000,
    cashRemaining: 1000000,
    maxHoldings: 5,
    maxWatchlist: 8,
  }
}

/**
 * 讀取庫存；無資料時回傳預設。
 * @returns 庫存物件
 */
export function loadInventory(): DecisionInventory {
  if (typeof window === 'undefined') return createEmptyInventory()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyInventory()
    const parsed = JSON.parse(raw) as Partial<DecisionInventory>
    return { ...createEmptyInventory(), ...parsed }
  } catch {
    return createEmptyInventory()
  }
}

/**
 * 寫入庫存。
 * @param inventory - 完整庫存
 */
export function saveInventory(inventory: DecisionInventory): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory))
}

/**
 * 產生簡單唯一 id。
 * @returns id 字串
 */
export function newId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 新增持股。
 * @param inv - 目前庫存
 * @param item - 不含 id 的持股欄位
 * @returns 更新後庫存
 */
export function addHolding(
  inv: DecisionInventory,
  item: Omit<HoldingItem, 'id'>
): DecisionInventory {
  const next = {
    ...inv,
    holdings: [...inv.holdings, { ...item, id: newId() }],
  }
  saveInventory(next)
  return next
}

/**
 * 更新持股。
 * @param inv - 目前庫存
 * @param id - 持股 id
 * @param patch - 部分欄位
 * @returns 更新後庫存
 */
export function updateHolding(
  inv: DecisionInventory,
  id: string,
  patch: Partial<Omit<HoldingItem, 'id'>>
): DecisionInventory {
  const next = {
    ...inv,
    holdings: inv.holdings.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  }
  saveInventory(next)
  return next
}

/**
 * 刪除持股。
 * @param inv - 目前庫存
 * @param id - 持股 id
 * @returns 更新後庫存
 */
export function removeHolding(inv: DecisionInventory, id: string): DecisionInventory {
  const next = { ...inv, holdings: inv.holdings.filter((h) => h.id !== id) }
  saveInventory(next)
  return next
}

type ListKey = 'watchlist' | 'candidates'

/**
 * 新增觀察或候選項目。
 * @param inv - 目前庫存
 * @param key - 清單鍵
 * @param item - 不含 id／addedAt
 * @returns 更新後庫存
 */
export function addListItem(
  inv: DecisionInventory,
  key: ListKey,
  item: Omit<ListItem, 'id' | 'addedAt'>
): DecisionInventory {
  const next = {
    ...inv,
    [key]: [...inv[key], { ...item, id: newId(), addedAt: Date.now() }],
  }
  saveInventory(next)
  return next
}

/**
 * 刪除觀察或候選項目。
 * @param inv - 目前庫存
 * @param key - 清單鍵
 * @param id - 項目 id
 * @returns 更新後庫存
 */
export function removeListItem(
  inv: DecisionInventory,
  key: ListKey,
  id: string
): DecisionInventory {
  const next = { ...inv, [key]: inv[key].filter((i) => i.id !== id) }
  saveInventory(next)
  return next
}

/**
 * 更新全域手動參數。
 * @param inv - 目前庫存
 * @param patch - 部分全域欄位
 * @returns 更新後庫存
 */
export function updateGlobals(
  inv: DecisionInventory,
  patch: Partial<
    Pick<DecisionInventory, 'totalCapital' | 'cashRemaining' | 'maxHoldings' | 'maxWatchlist'>
  >
): DecisionInventory {
  const next = { ...inv, ...patch }
  saveInventory(next)
  return next
}

/**
 * 依代號找持股。
 * @param inv - 庫存
 * @param symbol - 股票代號
 * @returns 持股或 undefined
 */
export function findHolding(inv: DecisionInventory, symbol: string): HoldingItem | undefined {
  return inv.holdings.find((h) => h.symbol === symbol)
}
