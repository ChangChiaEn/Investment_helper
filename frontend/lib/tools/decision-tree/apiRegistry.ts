/**
 * 市場 API 端點登錄：集中管理決策樹（及未來工具）所用官方 API，
 * 供 resolver、設定頁與文件共用，避免路徑字串散落。
 */

import type { MarketSource } from './proxyAllowlist'
import { MARKET_SOURCE_CONFIG } from './proxyAllowlist'

/** 單一市場 API 端點定義 */
export interface MarketApiEndpoint {
  /** 穩定識別碼（程式內引用） */
  id: string
  /** 顯示名稱 */
  name: string
  /** 說明用途 */
  description: string
  /** 代理來源 */
  source: MarketSource
  /** 相對路徑 */
  path: string
  /** 查詢字串範例（不含 ?），可含佔位說明 */
  queryExample?: string
  /** 使用此端點的指標 id 清單 */
  usedByIndicators: string[]
  /** 所屬功能模組標籤 */
  modules: string[]
  /** 是否為連線測試用端點 */
  isHealthCheck?: boolean
}

/**
 * 市場 API 登錄表（單例概念的 class，便於擴充與查詢）。
 */
export class MarketApiRegistry {
  private readonly endpoints = new Map<string, MarketApiEndpoint>()

  /**
   * 註冊一筆端點；同 id 會覆寫。
   * @param ep - 端點定義
   * @returns this（可鏈式）
   */
  register(ep: MarketApiEndpoint): this {
    this.endpoints.set(ep.id, ep)
    return this
  }

  /**
   * 批次註冊。
   * @param list - 端點陣列
   * @returns this
   */
  registerAll(list: MarketApiEndpoint[]): this {
    list.forEach((ep) => this.register(ep))
    return this
  }

  /**
   * 依 id 取得端點。
   * @param id - 端點 id
   * @returns 定義或 undefined
   */
  get(id: string): MarketApiEndpoint | undefined {
    return this.endpoints.get(id)
  }

  /**
   * 列出全部端點（依模組、名稱排序）。
   * @returns 端點陣列
   */
  listAll(): MarketApiEndpoint[] {
    return Array.from(this.endpoints.values()).sort((a, b) => {
      const ma = a.modules[0] || ''
      const mb = b.modules[0] || ''
      if (ma !== mb) return ma.localeCompare(mb, 'zh-Hant')
      return a.name.localeCompare(b.name, 'zh-Hant')
    })
  }

  /**
   * 依模組篩選。
   * @param module - 模組標籤，例如 decision-tree
   * @returns 端點陣列
   */
  listByModule(module: string): MarketApiEndpoint[] {
    return this.listAll().filter((e) => e.modules.includes(module))
  }

  /**
   * 依指標 id 找出相關端點。
   * @param indicatorId - 指標 id
   * @returns 端點陣列
   */
  listByIndicator(indicatorId: string): MarketApiEndpoint[] {
    return this.listAll().filter((e) => e.usedByIndicators.includes(indicatorId))
  }

  /**
   * 組出人類可讀的上游 URL 預覽。
   * @param id - 端點 id
   * @returns 完整 https URL 或空字串
   */
  previewUrl(id: string): string {
    const ep = this.get(id)
    if (!ep) return ''
    const host = MARKET_SOURCE_CONFIG[ep.source].host
    const q = ep.queryExample ? `?${ep.queryExample}` : ''
    return `https://${host}${ep.path}${q}`
  }
}

/** 決策樹模組標籤 */
export const MODULE_DECISION_TREE = 'decision-tree'

/**
 * 決策樹目前實際使用的市場 API 定義清單。
 * 新增指標／路徑時請同步更新此處與 catalog／resolvers。
 */
export const DECISION_TREE_API_ENDPOINTS: MarketApiEndpoint[] = [
  {
    id: 'twse_stock_day_all',
    name: '上市個股日成交資訊',
    description: '全市場當日 OHLCV、漲跌、成交筆數',
    source: 'twse_openapi',
    path: '/v1/exchangeReport/STOCK_DAY_ALL',
    usedByIndicators: [
      'close_price',
      'trade_volume',
      'trade_value',
      'price_change',
      'opening_price',
      'highest_price',
      'lowest_price',
      'transaction_count',
      'unrealized_pnl_pct',
      'drawdown_from_swing',
    ],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'tpex_daily_close',
    name: '上櫃日收盤行情',
    description: '上櫃主機板當日收盤（上市找不到時備援）',
    source: 'tpex',
    path: '/openapi/v1/tpex_mainboard_daily_close_quotes',
    usedByIndicators: ['close_price'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_bwibbu_all',
    name: '本益比／殖利率／股價淨值比',
    description: '上市個股估值快照',
    source: 'twse_openapi',
    path: '/v1/exchangeReport/BWIBBU_ALL',
    usedByIndicators: ['pe_ratio', 'dividend_yield', 'pb_ratio'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_stock_day_avg_all',
    name: '日收盤價及月平均價',
    description: '上市個股收盤與月均價',
    source: 'twse_openapi',
    path: '/v1/exchangeReport/STOCK_DAY_AVG_ALL',
    usedByIndicators: ['monthly_avg_price', 'close_vs_monthly_avg_pct'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_fmsrfk_all',
    name: '個股月成交資訊',
    description: '含月週轉率等',
    source: 'twse_openapi',
    path: '/v1/exchangeReport/FMSRFK_ALL',
    usedByIndicators: ['monthly_turnover_ratio'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_mi_index',
    name: '每日收盤行情－大盤統計',
    description: '加權指數等大盤指標',
    source: 'twse_openapi',
    path: '/v1/exchangeReport/MI_INDEX',
    usedByIndicators: ['taiex_change_pct'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_mi_qfiis',
    name: '外資及陸資持股比率（依產業）',
    description: '集中市場外資陸資投資類股持股比例',
    source: 'twse_openapi',
    path: '/v1/fund/MI_QFIIS_cat',
    usedByIndicators: [],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_revenue_l',
    name: '上市月營收彙總',
    description: '月營收 YoY／MoM 等',
    source: 'twse_openapi',
    path: '/v1/opendata/t187ap05_L',
    usedByIndicators: ['monthly_revenue_yoy', 'monthly_revenue_mom', 'monthly_revenue'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_income_l_ci',
    name: '上市綜合損益表（一般業）',
    description: 'EPS／毛利等財務快照',
    source: 'twse_openapi',
    path: '/v1/opendata/t187ap06_L_ci',
    usedByIndicators: ['eps', 'roe', 'gross_margin'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_company_basic_l',
    name: '上市證券基本資料',
    description: '連線健康檢查用',
    source: 'twse_openapi',
    path: '/v1/opendata/t187ap03_L',
    usedByIndicators: [],
    modules: [MODULE_DECISION_TREE],
    isHealthCheck: true,
  },
  {
    id: 'twse_dividend_l',
    name: '上市股利分派情形',
    description: '現金股利等配發資訊',
    source: 'twse_openapi',
    path: '/v1/opendata/t187ap45_L',
    usedByIndicators: ['cash_dividend'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_t86',
    name: '三大法人買賣超（日）',
    description: 'RWD T86；支援依日期查詢',
    source: 'twse_rwd',
    path: '/rwd/zh/fund/T86',
    queryExample: 'date=YYYYMMDD&selectType=ALLBUT0999&response=json',
    usedByIndicators: [
      'inst_net_buy',
      'trust_net_buy',
      'foreign_net_buy',
      'trust_buy_streak',
      'foreign_buy_streak',
    ],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_stock_day',
    name: '個股日成交資訊（月報）',
    description: 'RWD 個股日 K，用於均線／ATR 等序列計算',
    source: 'twse_rwd',
    path: '/rwd/zh/afterTrading/STOCK_DAY',
    queryExample: 'date=YYYYMM01&stockNo={symbol}&response=json',
    usedByIndicators: ['ma', 'bias', 'drawdown_from_high', 'atr', 'is_low_zone'],
    modules: [MODULE_DECISION_TREE],
  },
  {
    id: 'twse_mi_margn',
    name: '融資融券餘額',
    description: '融資／融券今日餘額（RWD open_data）',
    source: 'twse_rwd',
    path: '/exchangeReport/MI_MARGN',
    queryExample: 'response=open_data&selectType=ALL',
    usedByIndicators: ['margin_balance', 'short_balance'],
    modules: [MODULE_DECISION_TREE],
  },
]

/** 全域登錄實例（決策樹端點已預註冊） */
export const marketApiRegistry = new MarketApiRegistry().registerAll(DECISION_TREE_API_ENDPOINTS)

/**
 * 依登錄 id 取得 path／source，供 resolver 呼叫，避免硬編碼字串漂移。
 * @param id - 端點 id
 * @returns source 與 path
 * @throws 找不到端點時
 */
export function requireEndpoint(id: string): { source: MarketSource; path: string } {
  const ep = marketApiRegistry.get(id)
  if (!ep) throw new Error(`MarketApiRegistry 缺少端點：${id}`)
  return { source: ep.source, path: ep.path }
}
