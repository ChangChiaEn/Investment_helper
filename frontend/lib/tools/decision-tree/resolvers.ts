/**
 * 指標解析器：OpenAPI（經 proxy）→ 失敗降級 AI；manual 讀庫存。
 */

import { createClient, generateWithFallback } from '@/lib/gemini'
import { getIndicatorDef } from './catalog'
import { fetchViaMarketProxy } from './marketClient'
import type { DecisionInventory, IndicatorSource, IndicatorValue } from './types'
import { findHolding } from './inventoryStore'

/** 解析上下文 */
export interface ResolveContext {
  symbol: string
  inventory: DecisionInventory
  /** 當次執行快取，避免重複打 API */
  cache?: Map<string, unknown>
}

/**
 * 解析單一指標；OpenAPI 失敗或缺資料時降級 AI；錯誤時 resolvedSource=error。
 * @param indicatorId - 指標 id
 * @param params - 參數覆寫
 * @param ctx - 標的與庫存
 * @returns 指標值
 */
export async function resolveIndicator(
  indicatorId: string,
  params: Record<string, number | string> | undefined,
  ctx: ResolveContext
): Promise<IndicatorValue> {
  const def = getIndicatorDef(indicatorId)
  if (!def) {
    return {
      indicatorId,
      resolvedSource: 'error',
      value: null,
      display: '未知指標',
      error: `找不到指標：${indicatorId}`,
    }
  }

  try {
    if (def.source === 'manual') {
      return resolveManual(indicatorId, ctx)
    }
    if (def.source === 'ai') {
      return await resolveViaAi(indicatorId, def.name, params, ctx)
    }
    // openapi：先官方，失敗降級 AI
    try {
      return await resolveOpenApi(indicatorId, params, ctx)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      try {
        const ai = await resolveViaAi(indicatorId, def.name, params, ctx, msg)
        return ai
      } catch (aiErr) {
        const aiMsg = aiErr instanceof Error ? aiErr.message : String(aiErr)
        return {
          indicatorId,
          resolvedSource: 'error',
          value: null,
          display: '取得失敗',
          error: `OpenAPI：${msg}；AI：${aiMsg}`,
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      indicatorId,
      resolvedSource: 'error',
      value: null,
      display: '取得失敗',
      error: msg,
    }
  }
}

/**
 * 手動欄位解析。
 * @param indicatorId - 指標 id
 * @param ctx - 上下文
 * @returns 指標值
 */
function resolveManual(indicatorId: string, ctx: ResolveContext): IndicatorValue {
  const h = findHolding(ctx.inventory, ctx.symbol)
  const inv = ctx.inventory

  const num = (v: number | undefined | null, label: string): IndicatorValue => {
    if (v === undefined || v === null || Number.isNaN(v)) {
      return {
        indicatorId,
        resolvedSource: 'error',
        value: null,
        display: '缺手動資料',
        error: `請先在庫存填寫：${label}`,
      }
    }
    return { indicatorId, resolvedSource: 'manual', value: v, display: String(v) }
  }

  switch (indicatorId) {
    case 'entry_price':
      return num(h?.entryPrice, '進場價')
    case 'shares':
      return num(h?.shares, '股數')
    case 'swing_high':
      return num(h?.swingHigh, '波段最高價')
    case 'total_capital':
      return num(inv.totalCapital, '總資金')
    case 'cash_remaining':
      return num(inv.cashRemaining, '剩餘現金')
    case 'holding_count':
      return { indicatorId, resolvedSource: 'manual', value: inv.holdings.length, display: String(inv.holdings.length) }
    case 'max_holdings':
      return num(inv.maxHoldings, '持股上限')
    case 'position_pct_of_capital': {
      if (!h || !inv.totalCapital) {
        return {
          indicatorId,
          resolvedSource: 'error',
          value: null,
          display: '缺資料',
          error: '需持股與總資金',
        }
      }
      const pct = ((h.entryPrice * h.shares) / inv.totalCapital) * 100
      return { indicatorId, resolvedSource: 'manual', value: round(pct, 2), display: `${round(pct, 2)}%` }
    }
    case 'unrealized_pnl_pct':
    case 'drawdown_from_swing':
      // 需現價：同步路徑無法 await；改由呼叫端用 openapi close 再算，這裡標錯誤提示
      return {
        indicatorId,
        resolvedSource: 'error',
        value: null,
        display: '需現價',
        error: '請改用引擎內建複合解析（會先取收盤價）',
      }
    default:
      return {
        indicatorId,
        resolvedSource: 'error',
        value: null,
        display: '未實作',
        error: `手動指標未實作：${indicatorId}`,
      }
  }
}

/**
 * OpenAPI／衍生指標解析。
 * @param indicatorId - 指標 id
 * @param params - 參數
 * @param ctx - 上下文
 * @returns 指標值
 */
async function resolveOpenApi(
  indicatorId: string,
  params: Record<string, number | string> | undefined,
  ctx: ResolveContext
): Promise<IndicatorValue> {
  const cache = ctx.cache || (ctx.cache = new Map())

  switch (indicatorId) {
    case 'close_price': {
      const px = await getLatestClose(ctx.symbol, cache)
      return ok('openapi', indicatorId, px, `${px}`)
    }
    case 'pe_ratio':
    case 'dividend_yield': {
      const row = await getValuationRow(ctx.symbol, cache)
      const key = indicatorId === 'pe_ratio' ? '本益比' : '殖利率'
      const raw = pickNumber(row, [key, 'PEratio', 'DividendYield', '殖利率(%)'])
      if (raw === null) throw new Error(`估值資料無 ${key}`)
      return ok('openapi', indicatorId, raw, String(raw))
    }
    case 'inst_net_buy':
    case 'trust_net_buy':
    case 'foreign_net_buy': {
      const row = await getInstitutionalToday(ctx.symbol, cache)
      const map: Record<string, string[]> = {
        foreign_net_buy: ['外陸資買賣超股數(不含外資自營商)', '外資買賣超股數', '外陸資買賣超股數'],
        trust_net_buy: ['投信買賣超股數'],
        inst_net_buy: ['三大法人買賣超股數'],
      }
      let v = pickNumber(row, map[indicatorId])
      if (indicatorId === 'foreign_net_buy' && v === null) {
        const a = pickNumber(row, ['外陸資買賣超股數(不含外資自營商)'])
        const b = pickNumber(row, ['外資自營商買賣超股數'])
        if (a !== null || b !== null) v = (a || 0) + (b || 0)
      }
      if (v === null) throw new Error('法人買賣超欄位解析失敗')
      return ok('openapi', indicatorId, v, String(v))
    }
    case 'trust_buy_streak':
    case 'foreign_buy_streak': {
      const maxDays = Number(params?.days ?? 10)
      const streak = await calcBuyStreak(ctx.symbol, indicatorId === 'trust_buy_streak' ? 'trust' : 'foreign', maxDays, cache)
      return ok('openapi', indicatorId, streak, `${streak} 天`)
    }
    case 'monthly_revenue_yoy': {
      const yoy = await getMonthlyRevenueYoY(ctx.symbol, cache)
      return ok('openapi', indicatorId, yoy, `${yoy}%`)
    }
    case 'eps':
    case 'roe':
    case 'gross_margin': {
      // MOPS／OpenAPI 結構多變；先試 OpenAPI 財務，失敗拋錯讓上層降級 AI
      const fin = await getFinanceSnapshot(ctx.symbol, cache)
      const keys =
        indicatorId === 'eps'
          ? ['營業利益', '基本每股盈餘', 'EPS', '本期淨利']
          : indicatorId === 'roe'
            ? ['ROE', '股東權益報酬率', '權益報酬率']
            : ['毛利率', '營業毛利率']
      const v = pickNumber(fin, keys)
      if (v === null) throw new Error(`${indicatorId} 無法從官方快照解析`)
      return ok('openapi', indicatorId, v, String(v))
    }
    case 'ma': {
      const n = Number(params?.n ?? 60)
      const closes = await getCloseSeries(ctx.symbol, n, cache)
      const ma = avg(closes.slice(-n))
      return ok('openapi', indicatorId, round(ma, 2), String(round(ma, 2)))
    }
    case 'bias': {
      const n = Number(params?.n ?? 60)
      const closes = await getCloseSeries(ctx.symbol, Math.max(n, 5), cache)
      const last = closes[closes.length - 1]
      const ma = avg(closes.slice(-n))
      const bias = ((last - ma) / ma) * 100
      return ok('openapi', indicatorId, round(bias, 2), `${round(bias, 2)}%`)
    }
    case 'drawdown_from_high': {
      const n = Number(params?.n ?? 60)
      const highs = await getHighSeries(ctx.symbol, n, cache)
      const closes = await getCloseSeries(ctx.symbol, n, cache)
      const high = Math.max(...highs)
      const last = closes[closes.length - 1]
      const dd = ((high - last) / high) * 100
      return ok('openapi', indicatorId, round(dd, 2), `${round(dd, 2)}%`)
    }
    case 'atr': {
      const n = Number(params?.n ?? 14)
      const bars = await getOhlcSeries(ctx.symbol, n + 1, cache)
      const atr = calcAtr(bars, n)
      return ok('openapi', indicatorId, round(atr, 2), String(round(atr, 2)))
    }
    case 'is_low_zone': {
      const closes = await getCloseSeries(ctx.symbol, 60, cache)
      const highs = await getHighSeries(ctx.symbol, 60, cache)
      const last = closes[closes.length - 1]
      const high = Math.max(...highs)
      const dd = ((high - last) / high) * 100
      const ma = avg(closes)
      const bias = ((last - ma) / ma) * 100
      const byDrawdown = dd >= 10 && dd <= 25
      const byMa = last <= ma * 1.02
      const byBias = bias >= -5 && bias <= 5
      const pass = byDrawdown || (byMa && byBias)
      return ok('openapi', indicatorId, pass, pass ? '是（低檔）' : '否')
    }
    case 'unrealized_pnl_pct': {
      const h = findHolding(ctx.inventory, ctx.symbol)
      if (!h) throw new Error('無持股進場價')
      const px = await getLatestClose(ctx.symbol, cache)
      const pct = ((px - h.entryPrice) / h.entryPrice) * 100
      return ok('openapi', indicatorId, round(pct, 2), `${round(pct, 2)}%`)
    }
    case 'drawdown_from_swing': {
      const h = findHolding(ctx.inventory, ctx.symbol)
      if (!h?.swingHigh) throw new Error('無波段最高價')
      const px = await getLatestClose(ctx.symbol, cache)
      const pct = ((h.swingHigh - px) / h.swingHigh) * 100
      return ok('openapi', indicatorId, round(pct, 2), `${round(pct, 2)}%`)
    }
    default:
      throw new Error(`OpenAPI 指標未實作：${indicatorId}`)
  }
}

/**
 * 以 Gemini + Google Search 取得指標數值（結構化 JSON）。
 * @param indicatorId - 指標 id
 * @param name - 顯示名稱
 * @param params - 參數
 * @param ctx - 上下文
 * @param reason - 降級原因
 * @returns 指標值（resolvedSource=ai）
 */
async function resolveViaAi(
  indicatorId: string,
  name: string,
  params: Record<string, number | string> | undefined,
  ctx: ResolveContext,
  reason?: string
): Promise<IndicatorValue> {
  const ai = createClient()
  const prompt = `你是台股資料助手。請查詢股票 ${ctx.symbol} 的「${name}」（indicatorId=${indicatorId}）${
    params ? `，參數=${JSON.stringify(params)}` : ''
  }。
${reason ? `（官方 API 失敗原因：${reason}）` : ''}
只回傳 JSON：{"value": number|boolean|null, "display": string, "note": string}
若無法確定，value 設 null 並在 note 說明。不要 markdown。`

  const response = await generateWithFallback(ai, {
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  })

  const text = (response.text || '').trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 未回傳 JSON')
  const parsed = JSON.parse(jsonMatch[0]) as { value: number | boolean | null; display?: string; note?: string }
  if (parsed.value === null || parsed.value === undefined) {
    throw new Error(parsed.note || 'AI 無法取得數值')
  }
  return {
    indicatorId,
    resolvedSource: 'ai',
    value: parsed.value,
    display: parsed.display || String(parsed.value),
  }
}

// --- 官方資料輔助 ---

function ok(
  source: IndicatorSource,
  indicatorId: string,
  value: number | boolean,
  display: string
): IndicatorValue {
  return { indicatorId, resolvedSource: source, value, display }
}

function round(n: number, d: number): number {
  const p = 10 ** d
  return Math.round(n * p) / p
}

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function pickNumber(row: Record<string, unknown> | null, keys: string[]): number | null {
  if (!row) return null
  for (const k of keys) {
    if (k in row) {
      const n = parseNum(row[k])
      if (n !== null) return n
    }
  }
  // 嘗試模糊鍵名
  for (const [k, v] of Object.entries(row)) {
    if (keys.some((want) => k.includes(want) || want.includes(k))) {
      const n = parseNum(v)
      if (n !== null) return n
    }
  }
  return null
}

function parseNum(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').replace(/%/g, '').trim()
    if (cleaned === '-' || cleaned === '') return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * 取得最近交易日收盤價（全市場日報中找代號）。
 * @param symbol - 股票代號
 * @param cache - 快取
 * @returns 收盤價
 */
async function getLatestClose(symbol: string, cache: Map<string, unknown>): Promise<number> {
  const key = 'stock_day_all'
  let data = cache.get(key) as unknown
  if (!data) {
    const res = await fetchViaMarketProxy({
      source: 'twse_openapi',
      path: '/v1/exchangeReport/STOCK_DAY_ALL',
    })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol)
  if (!row) {
    // 上櫃備援
    const tpex = await fetchViaMarketProxy({
      source: 'tpex',
      path: '/openapi/v1/tpex_mainboard_daily_close_quotes',
    })
    cache.set('tpex_day', tpex.data)
    const row2 = findSymbolRow(tpex.data, symbol)
    if (!row2) throw new Error('找不到該股當日行情')
    const px = pickNumber(row2, ['收盤', 'Close', '收盤價'])
    if (px === null) throw new Error('收盤價解析失敗')
    return px
  }
  const px = pickNumber(row, ['收盤價', 'Close', '收盤'])
  if (px === null) throw new Error('收盤價解析失敗')
  return px
}

async function getValuationRow(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const key = 'bwibbu_all'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({
      source: 'twse_openapi',
      path: '/v1/exchangeReport/BWIBBU_ALL',
    })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol)
  if (!row) throw new Error('找不到估值資料')
  return row
}

async function getInstitutionalToday(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const today = formatTwDate(new Date())
  return getInstitutionalOnDate(symbol, today, cache)
}

async function getInstitutionalOnDate(
  symbol: string,
  yyyymmdd: string,
  cache: Map<string, unknown>
): Promise<Record<string, unknown>> {
  const key = `t86_${yyyymmdd}`
  let data = cache.get(key) as { fields?: string[]; data?: unknown[] } | unknown
  if (!data) {
    const res = await fetchViaMarketProxy({
      source: 'twse_rwd',
      path: '/rwd/zh/fund/T86',
      query: `date=${yyyymmdd}&selectType=ALLBUT0999&response=json`,
    })
    data = res.data
    cache.set(key, data)
  }
  const row = findT86Row(data, symbol)
  if (!row) throw new Error(`T86 無 ${symbol}（${yyyymmdd}）`)
  return row
}

async function calcBuyStreak(
  symbol: string,
  kind: 'trust' | 'foreign',
  maxDays: number,
  cache: Map<string, unknown>
): Promise<number> {
  let streak = 0
  const d = new Date()
  let checked = 0
  // 往回最多掃 maxDays*2 個日曆日以跳過假日
  while (checked < maxDays * 2 && streak < maxDays) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const ymd = formatTwDate(d)
      try {
        const row = await getInstitutionalOnDate(symbol, ymd, cache)
        const v =
          kind === 'trust'
            ? pickNumber(row, ['投信買賣超股數'])
            : (() => {
                const a = pickNumber(row, ['外陸資買賣超股數(不含外資自營商)', '外資買賣超股數'])
                const b = pickNumber(row, ['外資自營商買賣超股數'])
                if (a === null && b === null) return null
                return (a || 0) + (b || 0)
              })()
        if (v !== null && v > 0) streak += 1
        else break
      } catch {
        // 非交易日或無資料：略過不中斷 streak 計數日
      }
      checked += 1
    }
    d.setDate(d.getDate() - 1)
  }
  return streak
}

async function getMonthlyRevenueYoY(symbol: string, cache: Map<string, unknown>): Promise<number> {
  const key = 'rev_l'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({
      source: 'twse_openapi',
      path: '/v1/opendata/t187ap05_L',
    })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol, ['公司代號', 'Code', '出表日期'])
  if (!row) throw new Error('找不到月營收')
  const yoy = pickNumber(row, ['去年同月增減(%)', 'YoY', '營業收入-去年同月增減(%)'])
  if (yoy === null) throw new Error('月營收 YoY 解析失敗')
  return yoy
}

async function getFinanceSnapshot(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const key = 'fin_l'
  let data = cache.get(key)
  if (!data) {
    // 綜合損益表快照（若路徑異動會失敗並降級 AI）
    const res = await fetchViaMarketProxy({
      source: 'twse_openapi',
      path: '/v1/opendata/t187ap06_L_ci',
    })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol)
  if (!row) throw new Error('找不到財務快照')
  return row
}

interface OhlcBar {
  high: number
  low: number
  close: number
}

async function getCloseSeries(symbol: string, n: number, cache: Map<string, unknown>): Promise<number[]> {
  const bars = await getOhlcSeries(symbol, n, cache)
  return bars.map((b) => b.close)
}

async function getHighSeries(symbol: string, n: number, cache: Map<string, unknown>): Promise<number[]> {
  const bars = await getOhlcSeries(symbol, n, cache)
  return bars.map((b) => b.high)
}

/**
 * 以個股日成交月報拼出近期 OHLC（當月＋必要時上月）。
 * @param symbol - 代號
 * @param n - 需要根數
 * @param cache - 快取
 * @returns OHLC 陣列（由舊到新）
 */
async function getOhlcSeries(symbol: string, n: number, cache: Map<string, unknown>): Promise<OhlcBar[]> {
  const months: string[] = []
  const cursor = new Date()
  for (let i = 0; i < 3; i++) {
    months.push(formatTwDate(cursor).slice(0, 6))
    cursor.setMonth(cursor.getMonth() - 1)
  }

  const bars: OhlcBar[] = []
  for (const ym of months) {
    const key = `day_${symbol}_${ym}`
    let data = cache.get(key)
    if (!data) {
      const res = await fetchViaMarketProxy({
        source: 'twse_rwd',
        path: '/rwd/zh/afterTrading/STOCK_DAY',
        query: `date=${ym}01&stockNo=${symbol}&response=json`,
      })
      data = res.data
      cache.set(key, data)
    }
    const parsed = parseStockDay(data)
    bars.unshift(...parsed)
    if (bars.length >= n) break
  }
  if (bars.length < Math.min(n, 5)) throw new Error('K 線資料不足')
  return bars.slice(-n)
}

function parseStockDay(data: unknown): OhlcBar[] {
  const obj = data as { fields?: string[]; data?: unknown[][] }
  if (!obj?.data || !Array.isArray(obj.data)) return []
  const fields = obj.fields || []
  const iHigh = fields.findIndex((f) => f.includes('最高'))
  const iLow = fields.findIndex((f) => f.includes('最低'))
  const iClose = fields.findIndex((f) => f.includes('收盤'))
  return obj.data
    .map((row) => {
      const high = parseNum(row[iHigh >= 0 ? iHigh : 4])
      const low = parseNum(row[iLow >= 0 ? iLow : 5])
      const close = parseNum(row[iClose >= 0 ? iClose : 6])
      if (high === null || low === null || close === null) return null
      return { high, low, close }
    })
    .filter((b): b is OhlcBar => b !== null)
}

function calcAtr(bars: OhlcBar[], n: number): number {
  if (bars.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i]
    const prev = bars[i - 1]
    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close))
    trs.push(tr)
  }
  const slice = trs.slice(-n)
  return avg(slice)
}

function findSymbolRow(
  data: unknown,
  symbol: string,
  codeKeys: string[] = ['證券代號', '股票代號', '公司代號', 'Code', '代號']
): Record<string, unknown> | null {
  if (!Array.isArray(data)) {
    // T86 物件格式另處理
    return null
  }
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    for (const k of codeKeys) {
      if (String(row[k] || '').trim() === symbol) return row
    }
    // 第一欄常為代號
    const vals = Object.values(row)
    if (vals.some((v) => String(v).trim() === symbol)) return row
  }
  return null
}

function findT86Row(data: unknown, symbol: string): Record<string, unknown> | null {
  const obj = data as { fields?: string[]; data?: unknown[][] }
  if (obj?.fields && obj?.data) {
    const idx = obj.fields.findIndex((f) => f.includes('代號') || f.includes('證券'))
    const codeIdx = idx >= 0 ? idx : 0
    for (const row of obj.data) {
      if (String(row[codeIdx]).trim() === symbol) {
        const mapped: Record<string, unknown> = {}
        obj.fields.forEach((f, i) => {
          mapped[f] = row[i]
        })
        return mapped
      }
    }
  }
  return findSymbolRow(data, symbol)
}

/** 西元日期轉 YYYYMMDD */
function formatTwDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}
