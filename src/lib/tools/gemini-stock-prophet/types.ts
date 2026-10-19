/**
 * Gemini Stock Prophet 工具型別。
 * 市場代碼對齊 domain MarketCode；StockMarket 保留相容別名。
 */

import type { MarketCode } from '@/lib/domain'

/** @deprecated 請改用 MarketCode；數值與 'TW' | 'US' 相同 */
export enum StockMarket {
  TW = 'TW',
  US = 'US',
}

/** 查詢用市場（對齊 domain） */
export type ProphetMarket = Extract<MarketCode, 'TW' | 'US'>

export interface StockQuery {
  symbol: string
  market: StockMarket | ProphetMarket
}

export interface GroundingSource {
  title: string
  uri: string
}

/** 工具專屬分析 payload（可包進 AnalysisEnvelope） */
export interface AnalysisResult {
  markdownText: string
  sources: GroundingSource[]
}

export interface AnalysisState {
  isLoading: boolean
  data: AnalysisResult | null
  error: string | null
}
