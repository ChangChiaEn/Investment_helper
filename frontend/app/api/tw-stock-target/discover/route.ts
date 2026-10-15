import { NextRequest, NextResponse } from 'next/server'
import { discoverStocks, isScanMode } from '@/lib/tools/tw-stock-target/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode') || 'strong'
  if (!isScanMode(mode)) return NextResponse.json({ error: '不支援的掃描模式。' }, { status: 400 })
  try {
    return NextResponse.json(await discoverStocks(mode), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '市場掃描暫時無法使用。' }, { status: 502 })
  }
}
