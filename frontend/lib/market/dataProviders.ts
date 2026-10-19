/**
 * 外部／非 proxy 資料來源登錄：與 MarketApiRegistry（證交所等）並列，
 * 供設定頁揭露、避免工具私自接 API 卻無總覽。
 */

/** 資料取得方式 */
export type DataProviderKind = 'npm-client' | 'http-proxy' | 'browser-local'

/** 單一外部資料提供者定義 */
export interface DataProvider {
  /** 穩定識別碼 */
  id: string
  /** 顯示名稱 */
  name: string
  /** 用途說明 */
  description: string
  /** 取得方式 */
  kind: DataProviderKind
  /** 使用此來源的工具／模組 id */
  modules: string[]
  /** 人類可讀的上游說明（非必為可點 URL） */
  upstream: string
  /** 實作位置（相對 frontend） */
  implementation: string
}

/** 台股目標價追蹤器模組標籤 */
export const MODULE_TW_STOCK_TARGET = 'tw-stock-target'

/**
 * 非證交所 proxy 的資料來源清單。
 * 新增工具私接第三方 API 時請同步登錄此處。
 */
export const DATA_PROVIDERS: DataProvider[] = [
  {
    id: 'yahoo_finance_quote',
    name: 'Yahoo Finance 報價與法人目標價',
    description:
      '台股目標價追蹤器用：即時／延遲報價、漲跌、分析師目標價中位數（quoteSummary）。',
    kind: 'npm-client',
    modules: [MODULE_TW_STOCK_TARGET],
    upstream: 'Yahoo Finance（yahoo-finance2 → quoteSummary）',
    implementation: 'lib/tools/tw-stock-target/service.ts',
  },
  {
    id: 'yahoo_finance_discover_assist',
    name: 'Yahoo Finance（潛力股掃描輔助報價）',
    description:
      '潛力股掃描主資料為證交所 T86；候選標的的現價與法人目標價仍經 Yahoo 補齊。',
    kind: 'npm-client',
    modules: [MODULE_TW_STOCK_TARGET],
    upstream: 'Yahoo Finance（yahoo-finance2 → quoteSummary）',
    implementation: 'lib/tools/tw-stock-target/service.ts',
  },
]

/**
 * 依模組篩選資料提供者。
 * @param module - 模組 id
 * @returns 提供者陣列
 */
export function listDataProvidersByModule(module: string): DataProvider[] {
  return DATA_PROVIDERS.filter((p) => p.modules.includes(module))
}
