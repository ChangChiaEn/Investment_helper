
export enum GICS_Sector {
  IT = '資訊科技',
  FINANCIALS = '金融',
  HEALTHCARE = '醫療保健',
  CONSUMER_DISCRETIONARY = '消費循環',
  CONSUMER_STAPLES = '消費非循環',
  ENERGY = '能源',
  UTILITIES = '公用事業',
  MATERIALS = '天然資源',
  INDUSTRIALS = '工業',
  REAL_ESTATE = '房地產',
  COMMUNICATION = '通訊服務'
}

export interface CapexData {
  year: number;
  value: number;
  intensity: number;
  valuationZScore: number;
  revenueGrowth: number;
  sentiment: number;
}

export interface SectorDetail {
  id: GICS_Sector;
  description: string;
  examples: string[];
  historicalCapex: CapexData[];
  imfOutlook: string;
}

export interface CycleExpectation {
  period: string;
  rating: '低' | '中' | '高';
  logic: string;
}

export interface Suitability {
  tool: string;
  recommendation: '✅ 首選' | '⚠️ 適合' | '❌ 不建議';
  reason: string;
}

export interface AnalysisResult {
  conclusion: '長期前景' | '短期前景' | '夕陽產業';
  overallEval: string;
  strategyLabel: string;
  strategy: string;
  cycleExpectations: CycleExpectation[];
  suitabilities: Suitability[];
  riskFactor: {
    level: '低' | '中' | '高' | '極高';
    description: string;
    offsetCoefficient: string;
  };
  keywords: string[];
  newsSources: { title: string; url: string; source: string }[];
  content: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  sector: GICS_Sector;
  query: string;
  result: AnalysisResult;
}

export type ViewMode = 'DASHBOARD' | 'ANALYSIS' | 'HISTORY_VIEW';
