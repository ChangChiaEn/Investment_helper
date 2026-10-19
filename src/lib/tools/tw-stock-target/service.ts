import YahooFinance from 'yahoo-finance2'
import type { DiscoveryResult, ScanMode, StockQuote } from './types'

const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] })
const quoteCache = new Map<string, { expires: number; quote: StockQuote }>()
const pendingQuotes = new Map<string, Promise<StockQuote | null>>()
const scans = new Map<ScanMode, { expires: number; result: DiscoveryResult }>()
const pendingScans = new Map<ScanMode, Promise<DiscoveryResult>>()
const reports = new Map<string, { expires: number; report: TradingReport | null }>()
let pendingReports: Promise<TradingReport[]> | undefined

interface TradingReport {
  date: string
  fields: string[]
  data: string[][]
}

export function normalizeSymbol(input: string): string | null {
  const symbol = input.trim().toUpperCase()
  return /^\d{4,6}[A-Z]?(?:\.TW|\.TWO)?$/.test(symbol) ? symbol : null
}

export function isScanMode(value: string): value is ScanMode {
  return value === 'short' || value === 'swing' || value === 'strong'
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  // Explicit suffixes select a market; bare codes also try the OTC exchange.
  const candidates = symbol.includes('.') ? [symbol] : [`${symbol}.TW`, `${symbol}.TWO`]
  for (const candidate of candidates) {
    try {
      const options = { fetchOptions: { signal: AbortSignal.timeout(10_000) } }
      const data = await yahoo.quoteSummary(candidate, { modules: ['price', 'financialData'] }, options)
        .catch(() => yahoo.quoteSummary(candidate, { modules: ['price'] }, {
          fetchOptions: { signal: AbortSignal.timeout(10_000) },
        }))
      const price = data.price
      if (!price || !positive(price.regularMarketPrice)) continue
      return {
        symbol,
        name: price.shortName || price.longName || symbol,
        price: price.regularMarketPrice,
        change: price.regularMarketChange,
        // quoteSummary returns a ratio, unlike quote's percentage value.
        changePercent: price.regularMarketChangePercent === undefined
          ? undefined : price.regularMarketChangePercent * 100,
        updatedAt: price.regularMarketTime?.toISOString(),
        targetPrice: positive(data.financialData?.targetMedianPrice)
          ? data.financialData.targetMedianPrice : undefined,
      }
    } catch {
      // A missing stock or unavailable exchange must not hide other quotes.
    }
  }
  return null
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  const cached = quoteCache.get(symbol)
  if (cached && cached.expires > Date.now()) return cached.quote
  const pending = pendingQuotes.get(symbol)
  if (pending) return pending
  const request = fetchQuote(symbol).then(quote => {
    if (quote) {
      if (quoteCache.size >= 512) quoteCache.delete(quoteCache.keys().next().value!)
      quoteCache.set(symbol, { expires: Date.now() + 30_000, quote })
    }
    return quote
  }).finally(() => pendingQuotes.delete(symbol))
  pendingQuotes.set(symbol, request)
  return request
}

export async function getQuotes(symbols: string[]): Promise<StockQuote[]> {
  const quotes: StockQuote[] = []
  for (let index = 0; index < symbols.length; index += 6) {
    const batch = await Promise.all(symbols.slice(index, index + 6).map(getQuote))
    for (const quote of batch) if (quote) quotes.push(quote)
  }
  return quotes
}

async function fetchTradingReports(): Promise<TradingReport[]> {
  const result: TradingReport[] = []
  // Work in Taipei calendar days even when the server runs in UTC.
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const day = new Date(`${today}T00:00:00Z`)
  for (let attempt = 0; result.length < 5 && attempt < 21; attempt++, day.setUTCDate(day.getUTCDate() - 1)) {
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue
    const date = day.toISOString().slice(0, 10).replace(/-/g, '')
    const cached = reports.get(date)
    if (cached && cached.expires > Date.now()) {
      if (cached.report) result.push(cached.report)
      continue
    }
    // Space uncached TWSE requests to avoid overwhelming the upstream service.
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 2_000))
    let response: Response
    try {
      response = await fetch(`https://www.twse.com.tw/rwd/zh/fund/T86?response=json&selectType=ALLBUT0999&date=${date}`, {
        headers: {
          Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; Sagafisc/1.0)',
          'Accept-Language': 'zh-TW,zh;q=0.9', Referer: 'https://www.twse.com.tw/zh/trading/foreign/t86.html',
        },
        signal: AbortSignal.timeout(30_000), cache: 'no-store',
      })
    } catch {
      throw new Error('證交所資料連線失敗或逾時，請稍後重試。')
    }
    if (!response.ok) throw new Error('證交所資料暫時無法取得，請稍後重試。')
    let data: { stat?: string; date?: string; fields?: string[]; data?: string[][] }
    try {
      data = await response.json()
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new Error('證交所資料讀取逾時，請稍後重試。')
      }
      throw new Error('證交所暫時拒絕連線，請稍後重試。')
    }
    if (typeof data.stat !== 'string' || !/OK|沒有符合條件|查無資料/.test(data.stat)) {
      throw new Error('證交所回傳無法辨識的資料，請稍後重試。')
    }
    if (data.date && data.date !== date) throw new Error('證交所回傳的交易日期不符，暫時無法掃描。')
    const report = data.stat === 'OK' && Array.isArray(data.fields) && Array.isArray(data.data) && data.data.length
      ? { date, fields: data.fields, data: data.data } : null
    if (reports.size >= 32) reports.delete(reports.keys().next().value!)
    // Today's report may not have been published yet; retry it after five minutes.
    reports.set(date, { report, expires: Date.now() + (report ? 3_600_000 : 300_000) })
    if (report) result.push(report)
  }
  // Never silently label fewer reports as a five-day scan.
  if (result.length !== 5) throw new Error('目前無法取得完整的近 5 個交易日資料，請稍後重試。')
  return result
}

function getTradingReports(): Promise<TradingReport[]> {
  if (!pendingReports) pendingReports = fetchTradingReports().finally(() => { pendingReports = undefined })
  return pendingReports
}

export function selectCandidates(days: TradingReport[], mode: ScanMode) {
  const stats = new Map<string, { name: string; netBuy1Day: number; netBuy5Day: number }>()
  days.forEach((day, index) => {
    const symbolIndex = day.fields.indexOf('證券代號')
    const nameIndex = day.fields.indexOf('證券名稱')
    const buyIndex = day.fields.indexOf('外陸資買賣超股數(不含外資自營商)')
    if (symbolIndex < 0 || nameIndex < 0 || buyIndex < 0) throw new Error('證交所資料欄位已變更，暫時無法掃描。')
    for (const row of day.data) {
      const symbol = row[symbolIndex]?.trim()
      if (!symbol || !/^[1-9]\d{3}$/.test(symbol)) continue
      const netBuy = Number(row[buyIndex]?.replace(/,/g, ''))
      if (!Number.isFinite(netBuy)) continue
      const previous = stats.get(symbol)
      if (index === 0) stats.set(symbol, { name: row[nameIndex]?.trim() || symbol, netBuy1Day: netBuy, netBuy5Day: netBuy })
      else if (previous) previous.netBuy5Day += netBuy
    }
  })
  return Array.from(stats, ([symbol, stat]) => ({ symbol, ...stat })).filter(stat => {
    const short = stat.netBuy1Day > 1_000_000
    const swing = stat.netBuy5Day > 3_000_000
    return mode === 'short' ? short : mode === 'swing' ? swing : short && swing
  })
}

async function scan(mode: ScanMode): Promise<DiscoveryResult> {
  const days = await getTradingReports()
  const candidates = selectCandidates(days, mode)
  // Discovery uses only TWSE-listed stocks, so do not fall back to OTC here.
  const quotes = await getQuotes(candidates.map(stock => `${stock.symbol}.TW`))
  if (candidates.length && !quotes.length) throw new Error('報價服務暫時無法取得資料，請稍後重試。')
  const stocks = quotes.flatMap(quote => {
    if (!positive(quote.targetPrice)) return []
    const symbol = quote.symbol.replace(/\.TW$/, '')
    const stat = candidates.find(stock => stock.symbol === symbol)!
    return [{
      symbol, name: stat.name, price: quote.price, targetPrice: quote.targetPrice,
      upside: ((quote.targetPrice - quote.price) / quote.price) * 100,
      foreignNetBuy1Day: stat.netBuy1Day, foreignNetBuy5Day: stat.netBuy5Day,
    }]
  }).sort((a, b) => b.upside - a.upside).slice(0, 20)
  return { stocks, tradingDates: days.map(day => day.date) }
}

export async function discoverStocks(mode: ScanMode): Promise<DiscoveryResult> {
  const cached = scans.get(mode)
  if (cached && cached.expires > Date.now()) return cached.result
  const pending = pendingScans.get(mode)
  if (pending) return pending
  const request = scan(mode).then(result => {
    scans.set(mode, { expires: Date.now() + 600_000, result })
    return result
  }).finally(() => pendingScans.delete(mode))
  pendingScans.set(mode, request)
  return request
}
