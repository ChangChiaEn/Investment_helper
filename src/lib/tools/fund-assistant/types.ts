export interface FundAnalysisResult {
  fundName: string;
  isAvailableOnAnue: boolean;
  navPrice?: string; // Net Asset Value
  riskLevel?: string;
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  sentimentScore: number; // 0 to 100
  expertSummary: string;
  pros: string[];
  cons: string[];
  trendPrediction: string;
  entryStrategy: string; // New field for entry timing
  exitStrategy: string;  // New field for exit timing
  newsHighlights: string[];
}

export interface GroundingSource {
  title: string;
  url: string;
  source: string;
}

export interface AnalysisState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: FundAnalysisResult[] | null; // Changed to array
  sources: GroundingSource[];
  error?: string;
}

export enum PopularFund {
  ALLIANZ_TECH = "安聯台灣科技基金",
  UNIFIED_BLACK_HORSE = "統一黑馬基金",
  NOMURA_HIGH_CONVICTION = "野村優質基金",
  GOLDMAN_SACHS_TECH = "高盛全球未來科技基金",
  FRANKLIN_TECH = "富蘭克林坦伯頓科技基金"
}