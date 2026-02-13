
export type Market = 'US' | 'TW';

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
