/**
 * 市場資料 GET 代理核心邏輯（供 Next.js Route 與 Cloudflare Function 共用）。
 */

import {
  MARKET_PROXY_TIMEOUT_MS,
  buildUpstreamUrl,
  validateMarketProxyRequest,
} from './proxyAllowlist'

/** 代理成功時的回應本體 */
export interface MarketProxySuccessBody {
  ok: true
  source: string
  upstream: string
  contentType: string | null
  data: unknown
  error?: undefined
}

/** 代理失敗時的回應本體 */
export interface MarketProxyErrorBody {
  ok: false
  error: string
}

/**
 * 依查詢參數執行官方資料 GET 轉發。
 * @param source - 來源代碼
 * @param path - 相對路徑
 * @param query - 上游查詢字串（不含 ?）
 * @returns HTTP 狀態與 JSON 本體
 */
export async function handleMarketProxy(
  source: string,
  path: string,
  query?: string
): Promise<{ status: number; body: MarketProxySuccessBody | MarketProxyErrorBody }> {
  const validated = validateMarketProxyRequest(source, path)
  if (!validated.ok) {
    return { status: 400, body: { ok: false, error: (validated as any).error || '驗證失敗' } }
  }

  const upstream = buildUpstreamUrl(validated.host, validated.path, query)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MARKET_PROXY_TIMEOUT_MS)

  try {
    const res = await fetch(upstream, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Sagafisc-MarketProxy/1.0',
      },
      // 不快取寫庫；僅當次轉傳
      cache: 'no-store',
    })

    const contentType = res.headers.get('content-type')
    const text = await res.text()
    let data: unknown = text
    if (contentType?.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    if (!res.ok) {
      return {
        status: 502,
        body: {
          ok: false,
          error: `上游回應 ${res.status}：${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`,
        },
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        source,
        upstream,
        contentType,
        data,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isAbort = msg.includes('abort') || msg.includes('Abort')
    return {
      status: 504,
      body: {
        ok: false,
        error: isAbort ? '上游逾時' : `轉發失敗：${msg}`,
      },
    }
  } finally {
    clearTimeout(timer)
  }
}
