/**
 * 跨工具共用領域型別：標的、行情、分析結果殼層與資料來源標籤。
 * 各工具可逐步對齊 AnalysisEnvelope；pipeline／history 以此為契約。
 */

/** 資料來源（OpenAPI／Grounding／Gemini／手動） */
export type DataSource = 'openapi' | 'grounding' | 'gemini' | 'manual'

/** 市場代碼（台／美等；可擴充） */
export type MarketCode = 'TW' | 'US' | 'OTHER'

/**
 * 標的參考：代號＋市場，作為跨工具傳遞的最小單位。
 */
export interface SymbolRef {
  /** 股票／基金代號 */
  symbol: string
  /** 市場；未指定時由工具自行推斷 */
  market?: MarketCode
  /** 顯示名稱（可選） */
  name?: string
}

/**
 * 結構化行情／指標快照（通常來自 OpenAPI）。
 */
export interface MarketQuote {
  symbol: string
  market?: MarketCode
  /** 數值或字串值 */
  value: number | string | boolean | null
  /** 顯示用字串 */
  display: string
  unit?: string
  /** 資料所屬交易日或報表日（ISO 或 YYYYMMDD） */
  asOf?: string
  source: DataSource
  /** 來源端點或說明 */
  sourceDetail?: string
}

/**
 * 分析結果共用殼層：寫入今日 History、跨工具重用。
 * @template T - 工具專屬 payload
 */
export interface AnalysisEnvelope<T = unknown> {
  /** 產生此結果的工具 id */
  toolId: string
  /** 查詢鍵（如 symbol、主題字串） */
  queryKey: string
  symbol?: string
  market?: MarketCode
  /** 本地日曆日 YYYY-MM-DD */
  dayKey: string
  /** 取得時間（epoch ms） */
  fetchedAt: number
  /** 主要資料來源（可多層時取最終） */
  primarySource: DataSource
  /** 參與過的來源清單 */
  sources: DataSource[]
  /** 工具專屬內容 */
  payload: T
  /** 人類可讀摘要（History UI／餵給 Gemini 用） */
  summary?: string
}

/**
 * History／pipeline 查詢鍵組件。
 */
export interface HistoryKeyParts {
  kind: string
  queryKey: string
  /** 可選子鍵（如 indicatorId） */
  subKey?: string
}

/**
 * 回傳本地今日的 dayKey（YYYY-MM-DD）。
 * @returns 日期字串
 */
export function todayDayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 組出 History 穩定鍵（不含日期；日期由 store 的 dayKey 隔離）。
 * @param parts - kind／queryKey／subKey
 * @returns 字串鍵
 */
export function buildHistoryEntryKey(parts: HistoryKeyParts): string {
  const sub = parts.subKey ? `:${parts.subKey}` : ''
  return `${parts.kind}:${parts.queryKey}${sub}`
}
