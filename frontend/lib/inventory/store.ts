/**
 * 共用庫存本機儲存（localStorage）。
 * 新鍵 sagafisc_inventory；遷移來源：決策樹舊鍵、獨立 sagafisc_watchlist。
 */

import type { AssetType } from '@/lib/domain'
import type { CustomList, HoldingItem, Inventory, ListItem, ListItemInput } from './types'
import { WATCH_LIST_NAME } from './types'

/** 新版共用庫存鍵 */
const STORAGE_KEY = 'sagafisc_inventory'
/** 決策樹舊版鍵（僅遷移用） */
const LEGACY_STORAGE_KEY = 'sagafisc_decision_inventory'
/** 獨立關注清單舊鍵（遷移進「關注」分類後清除） */
const LEGACY_WATCHLIST_KEY = 'sagafisc_watchlist'

/** 舊 Watchlist 項目形狀 */
interface LegacyWatchlistItem {
  id?: string
  symbol: string
  name: string
  type?: AssetType
  source?: string
  addedAt?: number
}

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
 * 讀取庫存；無資料時回傳預設；自動遷移舊結構、舊 inventory key、舊 watchlist。
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
    let migrated = raw
      ? migrateInventory(JSON.parse(raw) as Partial<Inventory>)
      : createEmptyInventory()

    // --- 獨立 Watchlist →「關注」分類（僅遷移一次） ---
    const withWatch = mergeLegacyWatchlist(migrated)
    const changed =
      fromLegacy ||
      withWatch !== migrated ||
      (raw &&
        (() => {
          try {
            const parsed = JSON.parse(raw) as Partial<Inventory>
            return !!(parsed.watchlist || parsed.candidates || !Array.isArray(parsed.lists))
          } catch {
            return false
          }
        })())

    if (changed) {
      saveInventory(withWatch)
    }
    return withWatch
  } catch {
    return createEmptyInventory()
  }
}

/**
 * 將 sagafisc_watchlist 併入「關注」分類後移除舊鍵。
 * @param inv - 目前庫存
 * @returns 合併後庫存（無變更時回傳同一參考）
 */
function mergeLegacyWatchlist(inv: Inventory): Inventory {
  if (typeof window === 'undefined') return inv
  const raw = localStorage.getItem(LEGACY_WATCHLIST_KEY)
  if (!raw) return inv
  let items: LegacyWatchlistItem[] = []
  try {
    const parsed = JSON.parse(raw)
    items = Array.isArray(parsed) ? parsed : []
  } catch {
    localStorage.removeItem(LEGACY_WATCHLIST_KEY)
    return inv
  }
  if (items.length === 0) {
    localStorage.removeItem(LEGACY_WATCHLIST_KEY)
    return inv
  }

  let next = ensureWatchList(inv)
  const watch = next.lists.find((l) => l.name === WATCH_LIST_NAME)!
  const existing = new Set(watch.items.map((i) => `${i.assetType || 'stock'}:${i.symbol}`))
  const toAdd: ListItem[] = []
  for (const w of items) {
    if (!w?.symbol) continue
    const assetType: AssetType = w.type === 'fund' ? 'fund' : 'stock'
    const key = `${assetType}:${w.symbol}`
    if (existing.has(key)) continue
    existing.add(key)
    toAdd.push({
      id: newId(),
      symbol: w.symbol,
      name: w.name || w.symbol,
      assetType,
      source: w.source,
      addedAt: typeof w.addedAt === 'number' ? w.addedAt : Date.now(),
    })
  }
  if (toAdd.length > 0) {
    next = {
      ...next,
      lists: next.lists.map((l) =>
        l.name === WATCH_LIST_NAME ? { ...l, items: [...l.items, ...toAdd] } : l
      ),
    }
  }
  localStorage.removeItem(LEGACY_WATCHLIST_KEY)
  return next
}

/**
 * 確保存在名為「關注」的分類；沒有則建立。
 * @param inv - 庫存
 * @returns 更新後庫存（可能已寫入）
 */
export function ensureWatchList(inv: Inventory): Inventory {
  if (inv.lists.some((l) => l.name === WATCH_LIST_NAME)) return inv
  return addCustomList(inv, WATCH_LIST_NAME)
}

/**
 * 取得「關注」分類（必要時先建立）。
 * @param inv - 庫存
 * @returns 分類與可能更新後的庫存
 */
export function getWatchList(inv: Inventory): { list: CustomList; inventory: Inventory } {
  const ensured = ensureWatchList(inv)
  const list = ensured.lists.find((l) => l.name === WATCH_LIST_NAME)!
  return { list, inventory: ensured }
}

/**
 * 是否已在「關注」中（依 symbol＋assetType）。
 * @param inv - 庫存
 * @param symbol - 代號
 * @param assetType - 種類
 * @returns 是否存在
 */
export function hasInWatchList(
  inv: Inventory,
  symbol: string,
  assetType: AssetType = 'stock'
): boolean {
  const list = inv.lists.find((l) => l.name === WATCH_LIST_NAME)
  if (!list) return false
  return list.items.some(
    (i) => i.symbol === symbol && (i.assetType || 'stock') === assetType
  )
}

/**
 * 切換「關注」：有則移除、無則加入。
 * @param inv - 庫存
 * @param item - 標的
 * @returns 更新後庫存
 */
export function toggleWatchListItem(inv: Inventory, item: ListItemInput): Inventory {
  const assetType: AssetType = item.assetType || 'stock'
  const { list, inventory: base } = getWatchList(inv)
  const existing = list.items.find(
    (i) => i.symbol === item.symbol && (i.assetType || 'stock') === assetType
  )
  if (existing) {
    return removeListItem(base, list.id, existing.id)
  }
  return addListItem(base, list.id, { ...item, assetType })
}

/**
 * 從「關注」依項目 id 移除。
 * @param inv - 庫存
 * @param itemId - 項目 id
 * @returns 更新後庫存
 */
export function removeWatchListItem(inv: Inventory, itemId: string): Inventory {
  const list = inv.lists.find((l) => l.name === WATCH_LIST_NAME)
  if (!list) return inv
  return removeListItem(inv, list.id, itemId)
}

/**
 * 彙整庫存內可選標的（含 assetType），供目標價／決策樹等選取。
 * @param inv - 庫存
 * @returns 標的陣列（代號去重，持股優先）
 */
export function collectSymbolRefs(inv: Inventory): Array<{
  symbol: string
  name: string
  assetType: AssetType
  source?: string
}> {
  const map = new Map<
    string,
    { symbol: string; name: string; assetType: AssetType; source?: string }
  >()
  inv.holdings.forEach((h) => {
    map.set(h.symbol, {
      symbol: h.symbol,
      name: h.name,
      assetType: 'stock',
    })
  })
  inv.lists.forEach((list) => {
    list.items.forEach((i) => {
      if (!map.has(i.symbol)) {
        map.set(i.symbol, {
          symbol: i.symbol,
          name: i.name,
          assetType: i.assetType || 'stock',
          source: i.source,
        })
      }
    })
  })
  return Array.from(map.values())
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
export function addListItem(inv: Inventory, listId: string, item: ListItemInput): Inventory {
  const next = {
    ...inv,
    lists: inv.lists.map((l) => {
      if (l.id !== listId) return l
      if (l.maxItems !== undefined && l.items.length >= l.maxItems) return l
      // 同代號＋同種類不重複加入
      const assetType = item.assetType || 'stock'
      if (l.items.some((i) => i.symbol === item.symbol && (i.assetType || 'stock') === assetType)) {
        return l
      }
      return {
        ...l,
        items: [...l.items, { ...item, assetType, id: newId(), addedAt: Date.now() }],
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
 * 更新分類內標的（含可選進場欄位）。
 * @param inv - 庫存
 * @param listId - 分類 id
 * @param itemId - 項目 id
 * @param patch - 部分欄位
 * @returns 更新後庫存
 */
export function updateListItem(
  inv: Inventory,
  listId: string,
  itemId: string,
  patch: Partial<Omit<ListItem, 'id' | 'addedAt'>>
): Inventory {
  const next = {
    ...inv,
    lists: inv.lists.map((l) =>
      l.id === listId
        ? {
            ...l,
            items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
          }
        : l
    ),
  }
  saveInventory(next)
  return next
}

/**
 * 將持股移至指定分類；進場價／股數／波段高等欄位一併帶入 ListItem。
 * @param inv - 庫存
 * @param holdingId - 持股 id
 * @param listId - 目標分類 id
 * @returns 更新後庫存；找不到項目或分類時原樣回傳
 */
export function moveHoldingToList(
  inv: Inventory,
  holdingId: string,
  listId: string
): Inventory {
  const holding = inv.holdings.find((h) => h.id === holdingId)
  const list = inv.lists.find((l) => l.id === listId)
  if (!holding || !list) return inv

  const existing = list.items.find(
    (i) => i.symbol === holding.symbol && (i.assetType || 'stock') === 'stock'
  )
  // 目標已滿且無法合併同代號時不移動，避免持股先被刪掉
  if (
    !existing &&
    list.maxItems !== undefined &&
    list.items.length >= list.maxItems
  ) {
    return inv
  }

  // 先自持股移除，再寫入分類（同代號則合併欄位，避免重複列）
  let next: Inventory = {
    ...inv,
    holdings: inv.holdings.filter((h) => h.id !== holdingId),
  }
  if (existing) {
    next = updateListItem(next, listId, existing.id, {
      name: holding.name || existing.name,
      note: holding.note ?? existing.note,
      market: holding.market ?? existing.market,
      entryPrice: holding.entryPrice,
      shares: holding.shares,
      entryDate: holding.entryDate,
      swingHigh: holding.swingHigh,
    })
  } else {
    next = addListItem(next, listId, {
      symbol: holding.symbol,
      name: holding.name,
      note: holding.note,
      market: holding.market,
      assetType: 'stock',
      entryPrice: holding.entryPrice,
      shares: holding.shares,
      entryDate: holding.entryDate,
      swingHigh: holding.swingHigh,
    })
  }
  saveInventory(next)
  return next
}

/**
 * 將分類標的移入持股；沿用已存進場欄位，缺省時給可編輯預設值。
 * @param inv - 庫存
 * @param listId - 來源分類 id
 * @param itemId - 項目 id
 * @returns 更新後庫存
 */
export function moveListItemToHoldings(
  inv: Inventory,
  listId: string,
  itemId: string
): Inventory {
  const list = inv.lists.find((l) => l.id === listId)
  const item = list?.items.find((i) => i.id === itemId)
  if (!list || !item) return inv

  let next = removeListItem(inv, listId, itemId)
  const existingHolding = next.holdings.find((h) => h.symbol === item.symbol)
  if (existingHolding) {
    // 已在持股：合併數值（分類側有值才覆寫）
    next = updateHolding(next, existingHolding.id, {
      name: item.name || existingHolding.name,
      note: item.note ?? existingHolding.note,
      market: item.market ?? existingHolding.market,
      entryPrice: item.entryPrice ?? existingHolding.entryPrice,
      shares: item.shares ?? existingHolding.shares,
      entryDate: item.entryDate ?? existingHolding.entryDate,
      swingHigh: item.swingHigh ?? existingHolding.swingHigh,
    })
  } else {
    next = addHolding(next, {
      symbol: item.symbol,
      name: item.name,
      note: item.note,
      market: item.market,
      entryPrice: item.entryPrice ?? 0,
      shares: item.shares ?? 0,
      entryDate: item.entryDate ?? new Date().toISOString().slice(0, 10),
      swingHigh: item.swingHigh ?? 0,
    })
  }
  saveInventory(next)
  return next
}

/**
 * 將標的自一個分類移至另一分類，保留全部欄位（含進場資訊）。
 * @param inv - 庫存
 * @param fromListId - 來源分類
 * @param itemId - 項目 id
 * @param toListId - 目標分類
 * @returns 更新後庫存
 */
export function moveListItemToList(
  inv: Inventory,
  fromListId: string,
  itemId: string,
  toListId: string
): Inventory {
  if (fromListId === toListId) return inv
  const from = inv.lists.find((l) => l.id === fromListId)
  const to = inv.lists.find((l) => l.id === toListId)
  const item = from?.items.find((i) => i.id === itemId)
  if (!from || !to || !item) return inv

  const assetType = item.assetType || 'stock'
  const existing = to.items.find(
    (i) => i.symbol === item.symbol && (i.assetType || 'stock') === assetType
  )
  if (
    !existing &&
    to.maxItems !== undefined &&
    to.items.length >= to.maxItems
  ) {
    return inv
  }

  let next = removeListItem(inv, fromListId, itemId)
  if (existing) {
    next = updateListItem(next, toListId, existing.id, {
      name: item.name || existing.name,
      note: item.note ?? existing.note,
      market: item.market ?? existing.market,
      source: item.source ?? existing.source,
      entryPrice: item.entryPrice ?? existing.entryPrice,
      shares: item.shares ?? existing.shares,
      entryDate: item.entryDate ?? existing.entryDate,
      swingHigh: item.swingHigh ?? existing.swingHigh,
    })
  } else {
    next = addListItem(next, toListId, {
      symbol: item.symbol,
      name: item.name,
      note: item.note,
      assetType,
      market: item.market,
      source: item.source,
      entryPrice: item.entryPrice,
      shares: item.shares,
      entryDate: item.entryDate,
      swingHigh: item.swingHigh,
    })
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
