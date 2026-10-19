/**
 * 共用庫存本機儲存（localStorage）。
 * 新鍵 sagafisc_inventory；若無資料則自舊鍵 sagafisc_decision_inventory 遷移一次。
 */

import type { CustomList, HoldingItem, Inventory, ListItem } from './types'

/** 新版共用庫存鍵 */
const STORAGE_KEY = 'sagafisc_inventory'
/** 決策樹舊版鍵（僅遷移用） */
const LEGACY_STORAGE_KEY = 'sagafisc_decision_inventory'

/** 預設空庫存（不含預設觀察／候選分頁） */
export function createEmptyInventory(): Inventory {
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
export function migrateInventory(raw: Partial<Inventory>): Inventory {
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
 * 讀取庫存；無資料時回傳預設；自動遷移舊結構與舊 storage key。
 * @returns 庫存物件
 */
export function loadInventory(): Inventory {
  if (typeof window === 'undefined') return createEmptyInventory()
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    let fromLegacy = false
    // 新鍵無資料時，從決策樹舊鍵遷移一次
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        raw = legacy
        fromLegacy = true
      }
    }
    if (!raw) return createEmptyInventory()
    const parsed = JSON.parse(raw) as Partial<Inventory>
    const migrated = migrateInventory(parsed)
    // 寫回新鍵；若來自舊鍵或含舊欄位則正規化
    if (
      fromLegacy ||
      parsed.watchlist ||
      parsed.candidates ||
      !Array.isArray(parsed.lists)
    ) {
      saveInventory(migrated)
    }
    return migrated
  } catch {
    return createEmptyInventory()
  }
}

/**
 * 寫入庫存（僅新鍵；不持久化廢棄欄位）。
 * @param inventory - 完整庫存
 */
export function saveInventory(inventory: Inventory): void {
  if (typeof window === 'undefined') return
  const clean: Inventory = {
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
export function addHolding(inv: Inventory, item: Omit<HoldingItem, 'id'>): Inventory {
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
  inv: Inventory,
  id: string,
  patch: Partial<Omit<HoldingItem, 'id'>>
): Inventory {
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
export function removeHolding(inv: Inventory, id: string): Inventory {
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
export function addCustomList(inv: Inventory, name: string, maxItems?: number): Inventory {
  const trimmed = name.trim()
  if (!trimmed) return inv
  if (inv.lists.some((l) => l.name === trimmed)) return inv
  const next: Inventory = {
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
export function renameCustomList(inv: Inventory, listId: string, name: string): Inventory {
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
export function removeCustomList(inv: Inventory, listId: string): Inventory {
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
  inv: Inventory,
  listId: string,
  item: Omit<ListItem, 'id' | 'addedAt'>
): Inventory {
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
export function removeListItem(inv: Inventory, listId: string, itemId: string): Inventory {
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
  inv: Inventory,
  patch: Partial<Pick<Inventory, 'totalCapital' | 'cashRemaining' | 'maxHoldings'>>
): Inventory {
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
export function findHolding(inv: Inventory, symbol: string): HoldingItem | undefined {
  return inv.holdings.find((h) => h.symbol === symbol)
}

/**
 * 彙整持股與所有分類中的標的（代號去重）。
 * @param inv - 庫存
 * @returns [symbol, name][]
 */
export function collectAllSymbols(inv: Inventory): [string, string][] {
  const map = new Map<string, string>()
  inv.holdings.forEach((h) => map.set(h.symbol, h.name))
  inv.lists.forEach((list) => {
    list.items.forEach((i) => {
      if (!map.has(i.symbol)) map.set(i.symbol, i.name)
    })
  })
  return Array.from(map.entries())
}
