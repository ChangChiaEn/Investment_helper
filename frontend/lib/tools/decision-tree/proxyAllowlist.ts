/**
 * 市場資料代理允許清單：限制可轉發的官方來源，避免 SSRF。
 */

/** 支援的官方資料來源代碼 */
export type MarketSource = 'twse_openapi' | 'twse_rwd' | 'tpex' | 'mops'

/** 各來源對應的允許主機與路徑前綴 */
export const MARKET_SOURCE_CONFIG: Record<
  MarketSource,
  { host: string; pathPrefixes: string[]; label: string }
> = {
  twse_openapi: {
    host: 'openapi.twse.com.tw',
    pathPrefixes: ['/v1/', '/'],
    label: '證交所 OpenAPI',
  },
  twse_rwd: {
    host: 'www.twse.com.tw',
    pathPrefixes: ['/rwd/', '/exchangeReport/', '/fund/'],
    label: '證交所報表 API',
  },
  tpex: {
    host: 'www.tpex.org.tw',
    pathPrefixes: ['/openapi/', '/web/', '/www/'],
    label: '櫃買中心',
  },
  mops: {
    host: 'mops.twse.com.tw',
    pathPrefixes: ['/mops/', '/server/', '/'],
    label: '公開資訊觀測站',
  },
}

/** 代理轉發逾時（毫秒） */
export const MARKET_PROXY_TIMEOUT_MS = 15000

/**
 * 驗證來源與路徑是否在允許清單內。
 * @param source - 來源代碼
 * @param path - 相對路徑（須以 / 開頭）
 * @returns 通過時回傳完整目標 URL 基底資訊；否則回傳錯誤訊息
 */
export function validateMarketProxyRequest(
  source: string,
  path: string
): { ok: true; host: string; path: string } | { ok: false; error: string } {
  if (!source || !(source in MARKET_SOURCE_CONFIG)) {
    return { ok: false, error: '無效的 source 參數' }
  }
  if (!path || !path.startsWith('/') || path.includes('://') || path.includes('..')) {
    return { ok: false, error: 'path 必須以 / 開頭，且不可含協定或 ..' }
  }

  const cfg = MARKET_SOURCE_CONFIG[source as MarketSource]
  const allowed = cfg.pathPrefixes.some(
    (prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix) || prefix === '/'
  )
  if (!allowed) {
    return { ok: false, error: `路徑不在 ${cfg.label} 允許清單內` }
  }

  return { ok: true, host: cfg.host, path }
}

/**
 * 組出完整上游 URL。
 * @param host - 允許的主機
 * @param path - 已驗證路徑
 * @param query - 查詢字串（不含 ?）
 * @returns 完整 https URL
 */
export function buildUpstreamUrl(host: string, path: string, query?: string): string {
  const q = query && query.length > 0 ? `?${query}` : ''
  return `https://${host}${path}${q}`
}
