/**
 * Cloudflare Pages Function：市場資料 GET 代理。
 * 路由：GET /api/market-proxy?source=...&path=...&query=...
 * 若 Pages Root 為 frontend，使用此目錄；若 Root 為 repo `/`，請用根目錄 functions/。
 */

const SOURCE_CONFIG: Record<string, { host: string }> = {
  twse_openapi: { host: 'openapi.twse.com.tw' },
  twse_rwd: { host: 'www.twse.com.tw' },
  tpex: { host: 'www.tpex.org.tw' },
  mops: { host: 'mops.twse.com.tw' },
}

const TIMEOUT_MS = 15000

/**
 * Cloudflare Pages Function 進入點。
 * @param context - 含 request 的 context
 * @returns JSON Response
 */
export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url)
  const source = url.searchParams.get('source') || ''
  const path = url.searchParams.get('path') || ''
  const query = url.searchParams.get('query') || ''

  const cfg = SOURCE_CONFIG[source]
  if (!cfg) {
    return json({ ok: false, error: '無效的 source 參數' }, 400)
  }
  if (!path || !path.startsWith('/') || path.includes('://') || path.includes('..')) {
    return json({ ok: false, error: 'path 必須以 / 開頭，且不可含協定或 ..' }, 400)
  }

  const upstream = `https://${cfg.host}${path}${query ? `?${query}` : ''}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(upstream, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Sagafisc-MarketProxy/1.0',
      },
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
      return json({ ok: false, error: `上游回應 ${res.status}` }, 502)
    }
    return json({ ok: true, source, upstream, contentType, data }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ ok: false, error: msg.includes('abort') ? '上游逾時' : `轉發失敗：${msg}` }, 504)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * @param body - 回應本體
 * @param status - HTTP 狀態
 * @returns Response
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
