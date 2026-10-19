
export enum Language {
  ZH = 'zh',
  EN = 'en'
}

export enum InvestorProfileMode {
  CATEGORICAL = 'CATEGORICAL', // 選擇性格
  CUSTOM = 'CUSTOM'           // 自定義比例
}

export enum InvestorProfile {
  CONSERVATIVE = 'CONSERVATIVE',
  MODERATE = 'MODERATE',
  AGGRESSIVE = 'AGGRESSIVE'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface CustomAllocation {
  lowRisk: number;
  medRisk: number;
  highRisk: number;
}

export enum AssetCategory {
  CASH = 'CASH',
  STOCKS = 'STOCKS',
  ETF = 'ETF',
  BONDS = 'BONDS',
  MUTUAL_FUNDS = 'MUTUAL_FUNDS',
  CRYPTO = 'CRYPTO',
  REAL_ESTATE = 'REAL_ESTATE',
  GOLD = 'GOLD',
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
  OTHER = 'OTHER'
}

export enum AccountPurpose {
  SAVINGS = 'SAVINGS',
  BROKERAGE = 'BROKERAGE',
  GOLD = 'GOLD',
  FOREIGN_CURRENCY = 'FOREIGN_CURRENCY',
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
  OTHER = 'OTHER'
}

export interface AssetEntry {
  bankCode: string;
  bankName: string;
  purpose: AccountPurpose;
  category: AssetCategory;
  amount: number;
  notes: string;
}

export interface AnalysisResult {
  riskAssessment?: string;
  rebalancingAdvice?: string;
  suggestedAllocation?: {
    category: AssetCategory;
    percentage: number;
  }[];
  marketOutlook?: string;
  groundingUrls?: string[];
  // 計算出的基礎數據 (非 AI)
  actualAllocation: CustomAllocation;
  targetAllocation: CustomAllocation;
  diffAllocation: CustomAllocation;
}
