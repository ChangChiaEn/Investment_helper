/**
 * 決策樹庫存本機儲存（localStorage）；支援舊版觀察／候選遷移至自訂分類。
 */

import type { CustomList, DecisionInventory, HoldingItem, ListItem } from './types'

const STORAGE_KEY = 'sagafisc_decision_inventory'

/** 預設空庫存（不含預設觀察／候選分頁） */
export function createEmptyInventory(): DecisionInventory {
  return {
    holdings: [],
    lists: [],
    totalCapital: 1000000,
    cashRemaining: 1000000,
    maxHoldings: 5,
  }
}

/**
 * 將舊版 watchlist／candidates 遷移為 lists，並清掉廢棄欄位。
 * @param raw - 可能含舊欄位的部分庫存
 * @returns 正規化後庫存
 */
export function migrateInventory(raw: Partial<DecisionInventory>): DecisionInventory {
  const base = createEmptyInventory()
  const lists: CustomList[] = Array.isArray(raw.lists) ? [...raw.lists] : []

  // --- 舊版固定分頁 → 自訂分類（僅在尚無同名分類時遷移） ---
  const hasName = (name: string) => lists.some((l) => l.name === name)
  if (Array.isArray(raw.watchlist) && raw.watchlist.length > 0 && !hasName('觀察清單')) {
    lists.push({
      id: newId(),
      name: '觀察清單',
      items: raw.watchlist,
      maxItems: typeof raw.maxWatchlist === 'number' ? raw.maxWatchlist : 8,
    })
  }
  if (Array.isArray(raw.candidates) && raw.candidates.length > 0 && !hasName('候選池')) {
    lists.push({
      id: newId(),
      name: '候選池',
      items: raw.candidates,
    })
  }

  return {
    holdings: Array.isArray(raw.holdings) ? raw.holdings : base.holdings,
    lists,
    totalCapital: typeof raw.totalCapital === 'number' ? raw.totalCapital : base.totalCapital,
    cashRemaining: typeof raw.cashRemaining === 'number' ? raw.cashRemaining : base.cashRemaining,
    maxHoldings: typeof raw.maxHoldings === 'number' ? raw.maxHoldings : base.maxHoldings,
  }
}

/**
 * 讀取庫存；無資料時回傳預設；自動遷移舊結構。
 * @returns 庫存物件
 */
export function loadInventory(): DecisionInventory {
  if (typeof window === 'undefined') return createEmptyInventory()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyInventory()
    const parsed = JSON.parse(raw) as Partial<DecisionInventory>
    const migrated = migrateInventory(parsed)
    // 若曾含舊欄位，寫回正規化結果
    if (parsed.watchlist || parsed.candidates || !Array.isArray(parsed.lists)) {
      saveInventory(migrated)
    }
    return migrated
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
  // 不持久化廢棄欄位
  const clean: DecisionInventory = {
    holdings: inventory.holdings,
    lists: inventory.lists,
    totalCapital: inventory.totalCapital,
    cashRemaining: inventory.cashRemaining,
    maxHoldings: inventory.maxHoldings,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
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

/**
 * 新增自訂分類。
 * @param inv - 庫存
 * @param name - 分類名稱
 * @param maxItems - 可選上限
 * @returns 更新後庫存
 */
export function addCustomList(
  inv: DecisionInventory,
  name: string,
  maxItems?: number
): DecisionInventory {
  const trimmed = name.trim()
  if (!trimmed) return inv
  if (inv.lists.some((l) => l.name === trimmed)) return inv
  const next: DecisionInventory = {
    ...inv,
    lists: [
      ...inv.lists,
      {
        id: newId(),
        name: trimmed,
        items: [],
        maxItems,
      },
    ],
  }
  saveInventory(next)
  return next
}

/**
 * 重新命名分類。
 * @param inv - 庫存
 * @param listId - 分類 id
 * @param name - 新名稱
 * @returns 更新後庫存
 */
export function renameCustomList(
  inv: DecisionInventory,
  listId: string,
  name: string
): DecisionInventory {
  const trimmed = name.trim()
  if (!trimmed) return inv
  const next = {
    ...inv,
    lists: inv.lists.map((l) => (l.id === listId ? { ...l, name: trimmed } : l)),
  }
  saveInventory(next)
  return next
}

/**
 * 刪除整個分類。
 * @param inv - 庫存
 * @param listId - 分類 id
 * @returns 更新後庫存
 */
export function removeCustomList(inv: DecisionInventory, listId: string): DecisionInventory {
  const next = { ...inv, lists: inv.lists.filter((l) => l.id !== listId) }
  saveInventory(next)
  return next
}

/**
 * 向指定分類新增標的。
 * @param inv - 庫存
 * @param listId - 分類 id
 * @param item - 不含 id／addedAt
 * @returns 更新後庫存
 */
export function addListItem(
  inv: DecisionInventory,
  listId: string,
  item: Omit<ListItem, 'id' | 'addedAt'>
): DecisionInventory {
  const next = {
    ...inv,
    lists: inv.lists.map((l) => {
      if (l.id !== listId) return l
      if (l.maxItems !== undefined && l.items.length >= l.maxItems) return l
      return {
        ...l,
        items: [...l.items, { ...item, id: newId(), addedAt: Date.now() }],
      }
    }),
  }
  saveInventory(next)
  return next
}

/**
 * 從分類刪除標的。
 * @param inv - 庫存
 * @param listId - 分類 id
 * @param itemId - 項目 id
 * @returns 更新後庫存
 */
export function removeListItem(
  inv: DecisionInventory,
  listId: string,
  itemId: string
): DecisionInventory {
  const next = {
    ...inv,
    lists: inv.lists.map((l) =>
      l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
    ),
  }
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
  patch: Partial<Pick<DecisionInventory, 'totalCapital' | 'cashRemaining' | 'maxHoldings'>>
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

/**
 * 彙整持股與所有分類中的標的（代號去重）。
 * @param inv - 庫存
 * @returns [symbol, name][]
 */
export function collectAllSymbols(inv: DecisionInventory): [string, string][] {
  const map = new Map<string, string>()
  inv.holdings.forEach((h) => map.set(h.symbol, h.name))
  inv.lists.forEach((list) => {
    list.items.forEach((i) => {
      if (!map.has(i.symbol)) map.set(i.symbol, i.name)
    })
  })
  return Array.from(map.entries())
}
