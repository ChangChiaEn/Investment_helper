/**
 * 本機開發用市場資料 GET 代理（與 Cloudflare Pages Function 行為對齊）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleMarketProxy } from '@/lib/tools/decision-tree/proxyHandler'

/**
 * 轉發官方市場資料 GET 請求。
 * @param request - 含 source、path、query 查詢參數
 * @returns JSON 代理結果
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const source = searchParams.get('source') || ''
  const path = searchParams.get('path') || ''
  const query = searchParams.get('query') || undefined

  const result = await handleMarketProxy(source, path, query)
  return NextResponse.json(result.body, { status: result.status })
}
