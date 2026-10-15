import { NextRequest, NextResponse } from 'next/server'
import { getQuotes, normalizeSymbol } from '@/lib/tools/tw-stock-target/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbols')?.split(',') ?? []
  const symbols = Array.from(new Set(raw.map(normalizeSymbol)))
  if (!raw.length || raw.length > 50 || symbols.some(symbol => !symbol)) {
    return NextResponse.json({ error: '請提供 1–50 個有效的台股代號（支援 .TW 與 .TWO）。' }, { status: 400 })
  }
  try {
    const quotes = await getQuotes(symbols as string[])
    if (!quotes.length) return NextResponse.json({ error: '無法取得報價，請檢查股票代號或稍後重試。' }, { status: 502 })
    return NextResponse.json(quotes, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: '報價服務暫時無法使用，請稍後重試。' }, { status: 502 })
  }
}
