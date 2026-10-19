/**
 * AI 潛力股分析師型別。
 * Market 對齊 domain MarketCode 子集。
 */

import type { MarketCode } from '@/lib/domain'

/** @deprecated 請優先用 MarketCode；保留相容 */
export type Market = Extract<MarketCode, 'US' | 'TW'>

export interface UserPreferences {
  market: Market;
  strategy: string;
}

export interface ChartDataPoint {
  year: string;
  price: number;
}

export interface StockRecommendation {
  ticker: string;
  name: string;
  currentPrice: number;
  targetPrice: number;
  takeProfit: number;
  stopLoss: number;
  upsidePercentage: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  sector: string;
  reasoning: string;
  keyCatalysts: string[];
  chartData: ChartDataPoint[];
}

export interface SearchSource {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  recommendations: StockRecommendation[];
  sources: SearchSource[];
}
