export interface HoldingNews {
  headline: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  source?: string;
}

export interface Holding {
  name: string;
  ticker?: string;
  weight: number; // Percentage, e.g., 8.5
  riskLevel: 'High' | 'Medium' | 'Low';
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  analysis: string; // Brief AI generated analysis
  recentNews: HoldingNews[];
}

export interface FundAnalysis {
  fundName: string;
  updatedDate: string;
  overallRisk: 'High' | 'Medium' | 'Low';
  overallTrend: 'Bullish' | 'Bearish' | 'Neutral';
  summary: string;
  holdings: Holding[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
