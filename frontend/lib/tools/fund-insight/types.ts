export interface Fund {
  name: string;
  code?: string;
  returnRate3Month: string;
  netAssetValue?: string;
  riskLevel?: string;
}

export interface OverlappingStock {
  stockName: string;
  count: number;         // How many funds hold this
  heldBy: string[];      // Names of funds holding this
  sector: string;        // e.g. Semiconductor, AI
  reason: string;        // Why is it popular?
}

export interface OverlapAnalysis {
  stocks: OverlappingStock[];
  summary: string;       // Overall synthesis of the overlap strategy
}

export interface SingleFundAnalysis {
  fundName: string;
  holdings: {
    summary: string;     // 持股分析摘要
    topList: string[];   // 前十大持股或產業清單
  };
  sentiment: {
    summary: string;     // 市場情緒摘要
    keyEvents: string[]; // 關鍵新聞事件條列
  };
  strategy: {
    suggestion: string;   // 具體操作建議
    riskAnalysis: string; // 風險分析
    suitableFor: string;  // 適合投資人屬性
  };
  sourceUrls: string[];
}

export enum AppState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  FUNDS_LIST = 'FUNDS_LIST',       // Funds loaded
  ANALYZING_OVERLAPS = 'ANALYZING_OVERLAPS', // (NEW) Analyzing overlaps
  SHOW_OVERLAPS = 'SHOW_OVERLAPS', // (NEW) Showing overlaps
  ANALYZING = 'ANALYZING',         // Analyzing a specific fund
  SHOW_REPORT = 'SHOW_REPORT',     // Showing the specific report
  ERROR = 'ERROR'
}
