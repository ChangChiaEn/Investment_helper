/**
 * 指標解析器：OpenAPI（經 proxy）→ 失敗降級 AI；inventory 讀庫存；composite／formula 複合計算。
 */

import { createClient, generateWithFallback } from '@/lib/gemini'
import { calcCashRemaining, findHolding } from '@/lib/inventory'
import { requireEndpoint } from '@/lib/market'
import { fetchMarketWithHistory } from '@/lib/pipeline'
import { getIndicatorDef, normalizeIndicatorSource } from './catalog'
import { evaluateFormula, extractFormulaDeps } from './formulaEval'
import { getIndicatorLabel } from './labels'
import type {
  DecisionInventory,
  IndicatorComponent,
  IndicatorSource,
  IndicatorValue,
} from './types'
import type { MarketSource } from '@/lib/market'

/**
 * 決策樹用 OpenAPI 取得：經共用 pipeline 寫入／讀取今日 History。
 * @param req - source／path／query
 * @returns 含 data 的代理結果
 */
async function fetchViaMarketProxy(req: {
  source: MarketSource
  path: string
  query?: string
}): Promise<{ data: unknown }> {
  // 以 source+path 作為 History 端點鍵，與登錄 id 對齊時仍可跨工具重用同一 path
  const endpointId = `${req.source}${req.path}`
  return fetchMarketWithHistory(req, { endpointId, title: `OpenAPI ${endpointId}` })
}

/** 解析上下文 */
export interface ResolveContext {
  symbol: string
  inventory: DecisionInventory
  /** 當次執行快取，避免重複打 API */
  cache?: Map<string, unknown>
}

/**
 * 解析單一指標；OpenAPI 失敗或缺資料時降級 AI；錯誤時 resolvedSource=error。
 * 變體指標會解析至 baseIndicatorId，並合併 defaultParams 與條件 params。
 * @param indicatorId - 指標 id（可為變體）
 * @param params - 條件上的參數覆寫
 * @param ctx - 標的與庫存
 * @returns 指標值（indicatorId 仍為呼叫端 id，方便對照條件）
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

  // 變體：實際打 API／計算用基底 id；回傳仍標示原 id
  const resolveId = def.baseIndicatorId || indicatorId
  const mergedParams: Record<string, number | string> = {
    ...(def.defaultParams || {}),
    ...(params || {}),
  }

  try {
    const source = normalizeIndicatorSource(def.source)

    // 庫存自填：缺值以 0 防呆，不中止（變體通常不會指向庫存）
    if (source === 'inventory') {
      return tagId(resolveInventory(resolveId, ctx), indicatorId)
    }

    // 使用者公式：解析依賴後求值
    if (source === 'formula') {
      return tagId(await resolveFormula(resolveId, def.expression || '', mergedParams, ctx), indicatorId)
    }

    if (source === 'ai') {
      return tagId(await resolveViaAi(resolveId, def.name, mergedParams, ctx), indicatorId)
    }

    // openapi／composite：先官方（含複合），失敗降級 AI
    try {
      return tagId(await resolveOpenApi(resolveId, mergedParams, ctx), indicatorId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      try {
        const ai = await resolveViaAi(resolveId, def.name, mergedParams, ctx, msg)
        return tagId(ai, indicatorId)
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
 * 將解析結果的 indicatorId 改回呼叫端 id（變體對照用）。
 * @param value - 解析結果
 * @param indicatorId - 原始 id
 * @returns 覆寫 id 後的結果
 */
function tagId(value: IndicatorValue, indicatorId: string): IndicatorValue {
  return value.indicatorId === indicatorId ? value : { ...value, indicatorId }
}

/**
 * 庫存自填欄位解析；缺值／NaN 以 0 代替並標「未填」，不回 error。
 * @param indicatorId - 指標 id
 * @param ctx - 上下文
 * @returns 指標值
 */
function resolveInventory(indicatorId: string, ctx: ResolveContext): IndicatorValue {
  const h = findHolding(ctx.inventory, ctx.symbol)
  const inv = ctx.inventory

  /**
   * 數值防呆：缺漏當 0。
   * @param v - 原始值
   * @param label - 欄位名稱（顯示用）
   * @returns 指標值
   */
  const num = (v: number | undefined | null, label: string): IndicatorValue => {
    if (v === undefined || v === null || Number.isNaN(v)) {
      return {
        indicatorId,
        resolvedSource: 'inventory',
        value: 0,
        display: `0（未填：${label}）`,
      }
    }
    return { indicatorId, resolvedSource: 'inventory', value: v, display: String(v) }
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
    case 'cash_remaining': {
      // 剩餘現金 = 總資金 − Σ(進場價 × 股數)，與庫存欄衍生邏輯一致
      const cash = calcCashRemaining(inv)
      return {
        indicatorId,
        resolvedSource: 'inventory',
        value: cash,
        display: String(cash),
      }
    }
    case 'holding_count':
      return {
        indicatorId,
        resolvedSource: 'inventory',
        value: inv.holdings.length,
        display: String(inv.holdings.length),
      }
    case 'max_holdings':
      return num(inv.maxHoldings, '持股上限')
    case 'position_pct_of_capital': {
      const entry = h?.entryPrice
      const shares = h?.shares
      const capital = inv.totalCapital
      const entryN = entry === undefined || entry === null || Number.isNaN(entry) ? 0 : entry
      const sharesN = shares === undefined || shares === null || Number.isNaN(shares) ? 0 : shares
      const capitalN =
        capital === undefined || capital === null || Number.isNaN(capital) ? 0 : capital
      const missing = entryN === 0 || sharesN === 0 || capitalN === 0
      if (capitalN === 0) {
        return {
          indicatorId,
          resolvedSource: 'inventory',
          value: 0,
          display: '0（未填：總資金）',
        }
      }
      const pct = ((entryN * sharesN) / capitalN) * 100
      return {
        indicatorId,
        resolvedSource: 'inventory',
        value: round(pct, 2),
        display: missing ? `${round(pct, 2)}%（含未填）` : `${round(pct, 2)}%`,
      }
    }
    default:
      return {
        indicatorId,
        resolvedSource: 'error',
        value: null,
        display: '未實作',
        error: `自填指標未實作：${indicatorId}`,
      }
  }
}

/**
 * 解析使用者公式指標。
 * @param indicatorId - 公式指標 id
 * @param expression - 表達式
 * @param params - 轉傳給依賴指標的參數
 * @param ctx - 上下文
 * @returns 指標值
 */
async function resolveFormula(
  indicatorId: string,
  expression: string,
  params: Record<string, number | string> | undefined,
  ctx: ResolveContext
): Promise<IndicatorValue> {
  if (!expression.trim()) {
    return {
      indicatorId,
      resolvedSource: 'error',
      value: null,
      display: '公式為空',
      error: '公式表達式為空',
    }
  }
  const deps = extractFormulaDeps(expression)
  // 禁止公式自引用，避免無限遞迴
  if (deps.includes(indicatorId)) {
    return {
      indicatorId,
      resolvedSource: 'error',
      value: null,
      display: '循環引用',
      error: '公式不可引用自身',
    }
  }
  const vars: Record<string, number> = {}
  const components: IndicatorComponent[] = []
  for (const depId of deps) {
    const resolved = await resolveIndicator(depId, params, ctx)
    if (resolved.resolvedSource === 'error') {
      return {
        indicatorId,
        resolvedSource: 'error',
        value: null,
        display: '依賴失敗',
        error: `公式依賴 ${depId} 失敗：${resolved.error || resolved.display}`,
        components,
      }
    }
    const n = typeof resolved.value === 'number' ? resolved.value : Number(resolved.value)
    if (Number.isNaN(n)) {
      return {
        indicatorId,
        resolvedSource: 'error',
        value: null,
        display: '依賴非數值',
        error: `公式依賴 ${depId} 非數值`,
        components,
      }
    }
    vars[depId] = n
    // 記錄直接依賴；若依賴本身是複合／公式，一併附上其組成
    components.push({
      label: getIndicatorLabel(depId),
      indicatorId: depId,
      value: resolved.value,
      display: resolved.display,
    })
    if (resolved.components?.length) {
      for (const c of resolved.components) {
        components.push({
          ...c,
          label: `　↳ ${c.label}`,
        })
      }
    }
  }
  try {
    const value = evaluateFormula(expression, vars)
    return {
      indicatorId,
      resolvedSource: 'formula',
      value: round(value, 4),
      display: String(round(value, 4)),
      components,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      indicatorId,
      resolvedSource: 'error',
      value: null,
      display: '公式錯誤',
      error: msg,
      components,
    }
  }
}

/** 投信／外資連買檢查天數預設 */
const BUY_STREAK_MAX_DAYS = 10
/** 均線／乖離／回檔預設視窗日數 */
const SERIES_WINDOW_N = 60
/** ATR 計算日數預設 */
const ATR_WINDOW_N = 14

/**
 * OpenAPI／衍生指標解析；視窗日數可由 params 覆寫。
 * @param indicatorId - 指標 id（基底，不含變體）
 * @param params - 參數覆寫
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
    case 'trade_volume':
    case 'trade_value':
    case 'price_change':
    case 'opening_price':
    case 'highest_price':
    case 'lowest_price':
    case 'transaction_count': {
      // 同一支 STOCK_DAY_ALL，依欄位取量價資訊
      const row = await getStockDayRow(ctx.symbol, cache)
      const fieldMap: Record<string, string[]> = {
        trade_volume: ['成交股數', 'TradeVolume'],
        trade_value: ['成交金額', 'TradeValue'],
        price_change: ['漲跌價差', 'Change'],
        opening_price: ['開盤價', 'OpeningPrice'],
        highest_price: ['最高價', 'HighestPrice'],
        lowest_price: ['最低價', 'LowestPrice'],
        transaction_count: ['成交筆數', 'Transaction'],
      }
      const raw = pickNumber(row, fieldMap[indicatorId])
      if (raw === null) throw new Error(`日成交無 ${indicatorId}`)
      return ok('openapi', indicatorId, raw, String(raw))
    }
    case 'pe_ratio':
    case 'dividend_yield':
    case 'pb_ratio': {
      const row = await getValuationRow(ctx.symbol, cache)
      const keyMap: Record<string, string[]> = {
        pe_ratio: ['本益比', 'PEratio'],
        dividend_yield: ['殖利率', 'DividendYield', '殖利率(%)'],
        pb_ratio: ['股價淨值比', 'PBratio'],
      }
      const raw = pickNumber(row, keyMap[indicatorId])
      if (raw === null) throw new Error(`估值資料無 ${indicatorId}`)
      return ok('openapi', indicatorId, raw, String(raw))
    }
    case 'monthly_avg_price':
    case 'close_vs_monthly_avg_pct': {
      const row = await getDayAvgRow(ctx.symbol, cache)
      const avgPx = pickNumber(row, ['月平均價', 'MonthlyAveragePrice'])
      if (avgPx === null) throw new Error('無月平均價')
      if (indicatorId === 'monthly_avg_price') {
        return ok('openapi', indicatorId, avgPx, String(avgPx))
      }
      const close = pickNumber(row, ['收盤價', 'ClosingPrice'])
      if (close === null) throw new Error('無收盤價／月均')
      const pct = ((close - avgPx) / avgPx) * 100
      return ok('openapi', indicatorId, round(pct, 2), `${round(pct, 2)}%`)
    }
    case 'monthly_turnover_ratio': {
      const row = await getMonthlyTradeRow(ctx.symbol, cache)
      const v = pickNumber(row, ['週轉率(%)', 'TurnoverRatio', '週轉率'])
      if (v === null) throw new Error('無月週轉率')
      return ok('openapi', indicatorId, v, `${v}%`)
    }
    case 'taiex_change_pct': {
      const pct = await getTaiexChangePct(cache)
      return ok('openapi', indicatorId, pct, `${pct}%`)
    }
    case 'margin_balance':
    case 'short_balance': {
      const row = await getMarginRow(ctx.symbol, cache)
      const keys =
        indicatorId === 'margin_balance'
          ? ['融資今日餘額', '融資餘額']
          : ['融券今日餘額', '融券餘額']
      const v = pickNumber(row, keys)
      if (v === null) throw new Error(`無${indicatorId === 'margin_balance' ? '融資' : '融券'}餘額`)
      return ok('openapi', indicatorId, v, String(v))
    }
    case 'cash_dividend': {
      const row = await getDividendRow(ctx.symbol, cache)
      const v = pickNumber(row, [
        '股東配發-盈餘分配之現金股利(元/股)',
        '現金股利',
        '盈餘分配之現金股利',
      ])
      if (v === null) throw new Error('無現金股利資料')
      return ok('openapi', indicatorId, v, String(v))
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
      const maxDays = Number(params?.days ?? BUY_STREAK_MAX_DAYS)
      const streak = await calcBuyStreak(
        ctx.symbol,
        indicatorId === 'trust_buy_streak' ? 'trust' : 'foreign',
        maxDays,
        cache
      )
      return ok('openapi', indicatorId, streak, `${streak} 天`)
    }
    case 'monthly_revenue_yoy':
    case 'monthly_revenue_mom':
    case 'monthly_revenue': {
      const row = await getRevenueRow(ctx.symbol, cache)
      if (indicatorId === 'monthly_revenue_yoy') {
        const yoy = pickNumber(row, ['去年同月增減(%)', 'YoY', '營業收入-去年同月增減(%)'])
        if (yoy === null) throw new Error('月營收 YoY 解析失敗')
        return ok('openapi', indicatorId, yoy, `${yoy}%`)
      }
      if (indicatorId === 'monthly_revenue_mom') {
        const mom = pickNumber(row, ['上月比較增減(%)', '營業收入-上月比較增減(%)', 'MoM'])
        if (mom === null) throw new Error('月營收 MoM 解析失敗')
        return ok('openapi', indicatorId, mom, `${mom}%`)
      }
      const rev = pickNumber(row, ['當月營收', '營業收入-當月營收', '營業收入'])
      if (rev === null) throw new Error('當月營收解析失敗')
      return ok('openapi', indicatorId, rev, String(rev))
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
      const n = Number(params?.n ?? SERIES_WINDOW_N)
      const closes = await getCloseSeries(ctx.symbol, n, cache)
      const ma = avg(closes.slice(-n))
      return ok('openapi', indicatorId, round(ma, 2), String(round(ma, 2)))
    }
    case 'bias': {
      const n = Number(params?.n ?? SERIES_WINDOW_N)
      const closes = await getCloseSeries(ctx.symbol, Math.max(n, 5), cache)
      const last = closes[closes.length - 1]
      const ma = avg(closes.slice(-n))
      const bias = ((last - ma) / ma) * 100
      return ok('openapi', indicatorId, round(bias, 2), `${round(bias, 2)}%`)
    }
    case 'drawdown_from_high': {
      const n = Number(params?.n ?? SERIES_WINDOW_N)
      const highs = await getHighSeries(ctx.symbol, n, cache)
      const closes = await getCloseSeries(ctx.symbol, n, cache)
      const high = Math.max(...highs)
      const last = closes[closes.length - 1]
      const dd = ((high - last) / high) * 100
      return ok('openapi', indicatorId, round(dd, 2), `${round(dd, 2)}%`)
    }
    case 'atr': {
      const n = Number(params?.n ?? ATR_WINDOW_N)
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
      return ok('composite', indicatorId, pass, pass ? '是（低檔）' : '否', [
        { label: '收盤價', indicatorId: 'close_price', value: last, display: String(round(last, 2)) },
        { label: '近 60 日最高', value: high, display: String(round(high, 2)) },
        { label: '高點回檔%', value: round(dd, 2), display: `${round(dd, 2)}%` },
        { label: '60 日均線', value: round(ma, 2), display: String(round(ma, 2)) },
        { label: '乖離率%', value: round(bias, 2), display: `${round(bias, 2)}%` },
      ])
    }
    case 'unrealized_pnl_pct': {
      const h = findHolding(ctx.inventory, ctx.symbol)
      const entryRaw = h?.entryPrice
      const entry =
        entryRaw === undefined || entryRaw === null || Number.isNaN(entryRaw) ? 0 : entryRaw
      if (entry === 0) {
        throw new Error('進場價為 0（未填或無效），無法計算未實現報酬率')
      }
      const px = await getLatestClose(ctx.symbol, cache)
      const pct = ((px - entry) / entry) * 100
      return ok('composite', indicatorId, round(pct, 2), `${round(pct, 2)}%`, [
        { label: '收盤價（現價）', indicatorId: 'close_price', value: px, display: String(px) },
        {
          label: '進場價',
          indicatorId: 'entry_price',
          value: entry,
          display: String(entry),
        },
      ])
    }
    case 'drawdown_from_swing': {
      const h = findHolding(ctx.inventory, ctx.symbol)
      const swingRaw = h?.swingHigh
      const swing =
        swingRaw === undefined || swingRaw === null || Number.isNaN(swingRaw) ? 0 : swingRaw
      if (swing === 0) {
        throw new Error('波段最高價為 0（未填或無效），無法計算回檔%')
      }
      const px = await getLatestClose(ctx.symbol, cache)
      const pct = ((swing - px) / swing) * 100
      return ok('composite', indicatorId, round(pct, 2), `${round(pct, 2)}%`, [
        { label: '收盤價（現價）', indicatorId: 'close_price', value: px, display: String(px) },
        {
          label: '波段最高價',
          indicatorId: 'swing_high',
          value: swing,
          display: String(swing),
        },
      ])
    }
    default:
      throw new Error(`OpenAPI 指標未實作：${indicatorId}`)
  }
}

/**
 * 以 Gemini + Google Search 取得指標數值（結構化 JSON）。
 * @param indicatorId - 指標 id
 * @param name - 顯示名稱
 * @param params - 參數（寫入 prompt 供 AI 對齊視窗）
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
  const paramNote =
    params && Object.keys(params).length > 0 ? `，參數=${JSON.stringify(params)}` : ''
  const prompt = `你是台股資料助手。請查詢股票 ${ctx.symbol} 的「${name}」（indicatorId=${indicatorId}）${paramNote}。
${reason ? `（官方 API 失敗原因：${reason}）` : ''}
只回傳 JSON：{"value": number|boolean|null, "display": string, "note": string}
若無法確定，value 設 null 並在 note 說明。不要 markdown。`

  const response = await generateWithFallback(ai, {
    contents: prompt,
    config: {
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

/**
 * 組裝成功的指標結果。
 * @param source - 解析來源
 * @param indicatorId - 指標 id
 * @param value - 數值
 * @param display - 顯示字串
 * @param components - 複合／公式組成（可選）
 * @returns IndicatorValue
 */
function ok(
  source: IndicatorSource,
  indicatorId: string,
  value: number | boolean,
  display: string,
  components?: IndicatorComponent[]
): IndicatorValue {
  return {
    indicatorId,
    resolvedSource: source,
    value,
    display,
    ...(components?.length ? { components } : {}),
  }
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
/**
 * 取得上市日成交列（含量價）；上櫃僅備援收盤。
 * @param symbol - 代號
 * @param cache - 當次／批次共用快取
 * @returns 列物件
 */
async function getStockDayRow(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const ep = requireEndpoint('twse_stock_day_all')
  const key = 'stock_day_all'
  let data = cache.get(key) as unknown
  if (!data) {
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol)
  if (row) return row
  throw new Error('找不到該股當日行情（量價僅支援上市 STOCK_DAY_ALL）')
}

async function getLatestClose(symbol: string, cache: Map<string, unknown>): Promise<number> {
  const ep = requireEndpoint('twse_stock_day_all')
  const key = 'stock_day_all'
  let data = cache.get(key) as unknown
  if (!data) {
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol)
  if (!row) {
    // 上櫃備援
    const tpexEp = requireEndpoint('tpex_daily_close')
    const tpex = await fetchViaMarketProxy({ source: tpexEp.source, path: tpexEp.path })
    cache.set('tpex_day', tpex.data)
    const row2 = findSymbolRow(tpex.data, symbol)
    if (!row2) throw new Error('找不到該股當日行情')
    const px = pickNumber(row2, ['收盤', 'Close', '收盤價'])
    if (px === null) throw new Error('收盤價解析失敗')
    return px
  }
  const px = pickNumber(row, ['收盤價', 'Close', '收盤', 'ClosingPrice'])
  if (px === null) throw new Error('收盤價解析失敗')
  return px
}

async function getValuationRow(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const ep = requireEndpoint('twse_bwibbu_all')
  const key = 'bwibbu_all'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol)
  if (!row) throw new Error('找不到估值資料')
  return row
}

/**
 * 日收盤／月均價列。
 * @param symbol - 代號
 * @param cache - 快取
 * @returns 列
 */
async function getDayAvgRow(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const ep = requireEndpoint('twse_stock_day_avg_all')
  const key = 'stock_day_avg_all'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol)
  if (!row) throw new Error('找不到月平均價資料')
  return row
}

/**
 * 月成交資訊列（週轉率）。
 * @param symbol - 代號
 * @param cache - 快取
 * @returns 列
 */
async function getMonthlyTradeRow(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const ep = requireEndpoint('twse_fmsrfk_all')
  const key = 'fmsrfk_all'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol)
  if (!row) throw new Error('找不到月成交資料')
  return row
}

/**
 * 加權指數當日漲跌百分比。
 * @param cache - 快取
 * @returns 漲跌%
 */
async function getTaiexChangePct(cache: Map<string, unknown>): Promise<number> {
  const ep = requireEndpoint('twse_mi_index')
  const key = 'mi_index'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
    data = res.data
    cache.set(key, data)
  }
  if (!Array.isArray(data)) throw new Error('大盤指數格式異常')
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const name = String(row['指數'] || row['Index'] || '')
    if (name.includes('發行量加權') || name.includes('加權')) {
      const pct = pickNumber(row, ['漲跌百分比', '漲跌百分比(%)', 'ChangePercent'])
      if (pct !== null) return pct
    }
  }
  throw new Error('找不到加權指數漲跌%')
}

/**
 * 融資融券餘額列（CSV／JSON 皆嘗試）。
 * @param symbol - 代號
 * @param cache - 快取
 * @returns 列
 */
async function getMarginRow(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const ep = requireEndpoint('twse_mi_margn')
  const key = 'mi_margn'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({
      source: ep.source,
      path: ep.path,
      query: 'response=open_data&selectType=ALL',
    })
    data = normalizeCsvOrJsonRows(res.data)
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol, ['股票代號', '證券代號', 'Code', '代號'])
  if (!row) throw new Error('找不到融資融券資料')
  return row
}

/**
 * 股利分派列。
 * @param symbol - 代號
 * @param cache - 快取
 * @returns 列
 */
async function getDividendRow(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const ep = requireEndpoint('twse_dividend_l')
  const key = 'dividend_l'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol, ['公司代號', 'Code', '證券代號'])
  if (!row) throw new Error('找不到股利資料')
  return row
}

/**
 * 將 open_data CSV 字串或既有 JSON 陣列正規成列陣列。
 * @param raw - 上游資料
 * @returns 物件陣列
 */
function normalizeCsvOrJsonRows(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string') return []
  const lines = raw.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map((line) => {
    const cols = line.match(/("([^"]*)"|[^,]*)/g) || []
    const row: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      row[h] = (cols[i] || '').replace(/^"|"$/g, '').trim()
    })
    return row
  })
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
  const ep = requireEndpoint('twse_t86')
  const key = `t86_${yyyymmdd}`
  let data = cache.get(key) as { fields?: string[]; data?: unknown[] } | unknown
  if (!data) {
    const res = await fetchViaMarketProxy({
      source: ep.source,
      path: ep.path,
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

/**
 * 月營收列。
 * @param symbol - 代號
 * @param cache - 快取
 * @returns 列
 */
async function getRevenueRow(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const ep = requireEndpoint('twse_revenue_l')
  const key = 'rev_l'
  let data = cache.get(key)
  if (!data) {
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
    data = res.data
    cache.set(key, data)
  }
  const row = findSymbolRow(data, symbol, ['公司代號', 'Code', '出表日期'])
  if (!row) throw new Error('找不到月營收')
  return row
}

async function getFinanceSnapshot(symbol: string, cache: Map<string, unknown>): Promise<Record<string, unknown>> {
  const ep = requireEndpoint('twse_income_l_ci')
  const key = 'fin_l'
  let data = cache.get(key)
  if (!data) {
    // 綜合損益表快照（若路徑異動會失敗並降級 AI）
    const res = await fetchViaMarketProxy({ source: ep.source, path: ep.path })
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
      const ep = requireEndpoint('twse_stock_day')
      const res = await fetchViaMarketProxy({
        source: ep.source,
        path: ep.path,
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
