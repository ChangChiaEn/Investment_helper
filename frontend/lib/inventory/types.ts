/**
 * 共用持股庫存型別：持股＋自訂分類（含「關注」），為全站標的中心。
 */

import type { AssetType, MarketCode } from '@/lib/domain'

/** 預設「關注」分類名稱（由舊 Watchlist 遷移而來） */
export const WATCH_LIST_NAME = '關注'

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
  market?: MarketCode
}

/** 分類清單內單一標的（對齊 SymbolRef＋持久化欄位） */
export interface ListItem {
  id: string
  symbol: string
  name: string
  note?: string
  addedAt: number
  /** 股票或基金；未設視為 stock */
  assetType?: AssetType
  market?: MarketCode
  /** 來源工具 id */
  source?: string
  /**
   * 可選持倉欄位：與持股共用語意，移入「關注」等分類時保留，
   * 方便回測與之後移回持股，不必重填進場價／股數／波段高。
   */
  entryPrice?: number
  shares?: number
  entryDate?: string
  swingHigh?: number
}

/**
 * 庫存項目移動目標：持股，或指定自訂分類。
 * 用於跨分類整理且保留進場相關數值。
 */
export type InventoryMoveTarget =
  | { kind: 'holdings' }
  | { kind: 'list'; listId: string }

/**
 * 使用者自訂分類清單（關注／候選／主題等）。
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
 * 共用庫存（本機唯一標的中心）。
 * DecisionInventory 為相容別名。
 */
export interface Inventory {
  holdings: HoldingItem[]
  /** 使用者自訂分類（含「關注」） */
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

/** 加入分類時的輸入（不含 id／addedAt） */
export type ListItemInput = Omit<ListItem, 'id' | 'addedAt'>
