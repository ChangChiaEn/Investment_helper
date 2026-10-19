/**
 * 前端市場資料客戶端：經 /api/market-proxy 轉發官方 GET。
 */

import { requireEndpoint } from './apiRegistry'
import type { MarketSource } from './proxyAllowlist'
import { MARKET_SOURCE_CONFIG } from './proxyAllowlist'
import type { MarketProxyErrorBody, MarketProxySuccessBody } from './proxyHandler'

/** 代理請求參數 */
export interface MarketProxyRequest {
  source: MarketSource
  /** 相對路徑，例如 /v1/exchangeReport/STOCK_DAY_ALL */
  path: string
  /** 上游查詢字串（不含 ?），例如 date=20241015 */
  query?: string
}

/**
 * 呼叫市場資料代理。
 * @param req - 來源、路徑與查詢
 * @returns 成功時含 data；失敗時丟出 Error
 */
export async function fetchViaMarketProxy(req: MarketProxyRequest): Promise<MarketProxySuccessBody> {
  const params = new URLSearchParams()
  params.set('source', req.source)
  params.set('path', req.path)
  if (req.query) params.set('query', req.query)

  const res = await fetch(`/api/market-proxy?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  })

  const body = (await res.json()) as MarketProxySuccessBody | MarketProxyErrorBody
  if (!body.ok) {
    throw new Error(body.error || `代理失敗（HTTP ${res.status}）`)
  }
  return body
}

/**
 * 設定頁用：測試代理是否可連線，並打一筆已知 OpenAPI 端點。
 * @returns 測試結果摘要
 */
export async function testMarketProxyConnection(): Promise<{
  ok: boolean
  message: string
  upstream?: string
}> {
  try {
    // 上市證券基本資料（最新快照，路徑由登錄表管理）
    const ep = requireEndpoint('twse_company_basic_l')
    const result = await fetchViaMarketProxy({
      source: ep.source,
      path: ep.path,
    })
    const rows = Array.isArray(result.data) ? result.data.length : 0
    return {
      ok: true,
      message: `連線成功（${MARKET_SOURCE_CONFIG.twse_openapi.label}，取得 ${rows} 筆）`,
      upstream: result.upstream,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      message: `連線失敗：${msg}。請確認本機 API Route 或 Cloudflare Pages Function 已部署。`,
    }
  }
}
