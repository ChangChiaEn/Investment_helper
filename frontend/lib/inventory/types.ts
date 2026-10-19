/**
 * 共用持股庫存型別（自決策樹抽出，供各工具引用）。
 */

/** 持股項目 */
export interface HoldingItem {
  id: string
  symbol: string
  name: string
  entryPrice: number
  shares: number
  entryDate: string
  swingHigh: number
  note?: string
}

/** 觀察／分類清單內單一標的 */
export interface ListItem {
  id: string
  symbol: string
  name: string
  note?: string
  addedAt: number
}

/**
 * 使用者自訂分類清單（取代固定的觀察／候選分頁）。
 * 僅作為標的分組，不影響持股欄位語意。
 */
export interface CustomList {
  id: string
  name: string
  items: ListItem[]
  /** 可選上限；未設則不限 */
  maxItems?: number
}

/**
 * 共用庫存（本機）。
 * DecisionInventory 為相容別名。
 */
export interface Inventory {
  holdings: HoldingItem[]
  /** 使用者自訂分類（可為空；不預設觀察／候選） */
  lists: CustomList[]
  /**
   * @deprecated 舊版欄位，載入時會遷移至 lists
   */
  watchlist?: ListItem[]
  /**
   * @deprecated 舊版欄位，載入時會遷移至 lists
   */
  candidates?: ListItem[]
  /** 手動全域參數 */
  totalCapital: number
  cashRemaining: number
  maxHoldings: number
  /** @deprecated 改由各 CustomList.maxItems 控制 */
  maxWatchlist?: number
}

/** @deprecated 請改用 Inventory；保留給決策樹等既有匯入 */
export type DecisionInventory = Inventory
