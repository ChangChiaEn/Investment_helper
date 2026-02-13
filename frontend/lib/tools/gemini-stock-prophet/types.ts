export enum StockMarket {
  TW = 'TW',
  US = 'US'
}

export interface StockQuery {
  symbol: string;
  market: StockMarket;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  markdownText: string;
  sources: GroundingSource[];
}

export interface AnalysisState {
  isLoading: boolean;
  data: AnalysisResult | null;
  error: string | null;
}