/**
 * 資料管線：History（僅今日）→ OpenAPI →（可選）Grounding → Gemini。
 * 結構化事實優先走官方 API 並寫入 History，以減少 AI token 與重複查詢。
 */

import { createClient, generateWithFallback } from '@/lib/gemini'
import type { DataSource, MarketCode } from '@/lib/domain'
import { buildHistoryEntryKey } from '@/lib/domain'
import { getHistoryEntry, putHistoryEntry } from '@/lib/history'
import {
  fetchViaMarketProxy,
  requireEndpoint,
  type MarketProxyRequest,
  type MarketProxySuccessBody,
} from '@/lib/market'

/** OpenAPI 請求結果（可標註是否命中 History） */
export interface MarketFetchResult extends MarketProxySuccessBody {
  /** 是否來自今日 History */
  fromHistory: boolean
}

/**
 * 經 History 的市場代理：今日同 endpoint＋query 直接重用，否則打 OpenAPI 並寫入。
 * 指定過去日期時請帶入該日 query（如 date=YYYYMMDD），且勿依賴「今日」以外的 History。
 * @param req - 代理請求
 * @param options - 端點 id（供 History 鍵）、標題、可選 session cache
 * @returns 代理成功本體＋fromHistory
 */
export async function fetchMarketWithHistory(
  req: MarketProxyRequest,
  options: {
    endpointId: string
    title?: string
    /** 當次執行記憶體快取（優先於 History） */
    sessionCache?: Map<string, unknown>
  }
): Promise<MarketFetchResult> {
  const cacheKey = `openapi:${options.endpointId}:${req.query || ''}`
  const session = options.sessionCache

  // --- 當次 session 快取 ---
  if (session?.has(cacheKey)) {
    const data = session.get(cacheKey)
    return {
      ok: true,
      source: req.source,
      upstream: '(session-cache)',
      contentType: 'application/json',
      data,
      fromHistory: false,
    }
  }

  const entryKey = buildHistoryEntryKey({
    kind: 'openapi',
    queryKey: options.endpointId,
    subKey: req.query || 'default',
  })
  const cached = getHistoryEntry<MarketProxySuccessBody>(entryKey)
  if (cached?.payload?.ok) {
    session?.set(cacheKey, cached.payload.data)
    return { ...cached.payload, fromHistory: true }
  }

  const body = await fetchViaMarketProxy(req)
  session?.set(cacheKey, body.data)

  putHistoryEntry({
    entryKey,
    toolId: 'market',
    queryKey: options.endpointId,
    title: options.title || `OpenAPI：${options.endpointId}`,
    primarySource: 'openapi',
    sources: ['openapi'],
    payload: body,
    summary: summarizeOpenApiPayload(options.endpointId, body.data),
  })

  return { ...body, fromHistory: false }
}

/**
 * 依登錄 id 拉取（自動帶 source／path）。
 * @param endpointId - 登錄表 id
 * @param query - 可選查詢字串
 * @param sessionCache - 可選當次快取
 * @returns 市場資料結果
 */
export async function fetchEndpointWithHistory(
  endpointId: string,
  query?: string,
  sessionCache?: Map<string, unknown>
): Promise<MarketFetchResult> {
  const ep = requireEndpoint(endpointId)
  return fetchMarketWithHistory(
    { source: ep.source, path: ep.path, query },
    { endpointId, sessionCache }
  )
}

/**
 * 為台股標的組短結構化摘要（給 Gemini prompt 用），寫入／讀取 History。
 * @param symbol - 股票代號
 * @param sessionCache - 可選
 * @returns 摘要文字與來源
 */
export async function prefetchTwStockFacts(
  symbol: string,
  sessionCache?: Map<string, unknown>
): Promise<{ summary: string; sources: DataSource[]; fromHistory: boolean }> {
  const entryKey = buildHistoryEntryKey({
    kind: 'facts',
    queryKey: symbol,
    subKey: 'tw-daily',
  })
  const hit = getHistoryEntry<{ summary: string }>(entryKey)
  if (hit?.payload?.summary) {
    return {
      summary: hit.payload.summary,
      sources: hit.sources,
      fromHistory: true,
    }
  }

  const lines: string[] = []
  const sources: DataSource[] = ['openapi']
  let fromHistory = false

  try {
    const day = await fetchEndpointWithHistory('twse_stock_day_all', undefined, sessionCache)
    fromHistory = fromHistory || day.fromHistory
    const row = findSymbolRow(day.data, symbol)
    if (row) {
      lines.push(
        `日成交：收盤=${pickField(row, ['收盤價', 'Close', '收盤'])}，開=${pickField(row, ['開盤價', 'OpeningPrice'])}，高=${pickField(row, ['最高價', 'HighestPrice'])}，低=${pickField(row, ['最低價', 'LowestPrice'])}，量=${pickField(row, ['成交股數', 'TradeVolume'])}，漲跌=${pickField(row, ['漲跌價差', 'Change'])}`
      )
    }
  } catch {
    // OpenAPI 失敗不阻斷；後續可交 Grounding
  }

  try {
    const val = await fetchEndpointWithHistory('twse_bwibbu_all', undefined, sessionCache)
    fromHistory = fromHistory || val.fromHistory
    const row = findSymbolRow(val.data, symbol)
    if (row) {
      lines.push(
        `估值：本益比=${pickField(row, ['本益比', 'PEratio'])}，殖利率=${pickField(row, ['殖利率', 'DividendYield', '殖利率(%)'])}，股淨比=${pickField(row, ['股價淨值比', 'PBratio'])}`
      )
    }
  } catch {
    // 略過
  }

  const summary =
    lines.length > 0
      ? `【官方 OpenAPI 今日結構化資料｜${symbol}】\n${lines.join('\n')}`
      : ''

  if (summary) {
    putHistoryEntry({
      entryKey,
      toolId: 'pipeline',
      queryKey: symbol,
      symbol,
      market: 'TW',
      title: `台股事實摘要：${symbol}`,
      primarySource: 'openapi',
      sources,
      payload: { summary },
      summary,
    })
  }

  return { summary, sources, fromHistory }
}

/** Gemini 分析管線選項 */
export interface GeminiPipelineOptions {
  toolId: string
  /** History／顯示用查詢鍵 */
  queryKey: string
  title: string
  /** 完整或主體 prompt（可含已嵌入的 OpenAPI 摘要） */
  prompt: string
  /** 是否啟用 Google Search Grounding */
  useGrounding?: boolean
  temperature?: number
  symbol?: string
  market?: MarketCode
  /** 略過 History 強制重跑 */
  forceRefresh?: boolean
}

/** Gemini 管線結果 */
export interface GeminiPipelineResult {
  text: string
  groundingSources: { title: string; uri: string }[]
  sources: DataSource[]
  fromHistory: boolean
}

/**
 * 執行 Gemini 分析：先查今日 History，命中則不消耗 token；否則呼叫 API 並寫入。
 * @param options - 管線選項
 * @returns 文字、grounding 來源與是否命中 History
 */
export async function runGeminiPipeline(
  options: GeminiPipelineOptions
): Promise<GeminiPipelineResult> {
  const entryKey = buildHistoryEntryKey({
    kind: 'analysis',
    queryKey: options.queryKey,
    subKey: options.toolId,
  })

  if (!options.forceRefresh) {
    const hit = getHistoryEntry<{
      text: string
      groundingSources: { title: string; uri: string }[]
    }>(entryKey)
    if (hit?.payload?.text) {
      return {
        text: hit.payload.text,
        groundingSources: hit.payload.groundingSources || [],
        sources: hit.sources,
        fromHistory: true,
      }
    }
  }

  const ai = createClient()
  const sources: DataSource[] = ['gemini']

  const response = await generateWithFallback(ai, {
    contents: options.prompt,
    config: {
      temperature: options.temperature ?? 0.4,
    },
  })

  const text = response.text || '無法產生分析報告，請稍後再試。'
  const rawSources =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: { web?: { title?: string; uri?: string } }) => chunk.web)
      .filter(
        (web: { title?: string; uri?: string } | undefined): web is { title: string; uri: string } =>
          !!(web && web.uri && web.title)
      ) || []
  const groundingSources = Array.from(
    new Map(rawSources.map((item: { title: string; uri: string }) => [item.uri, item])).values()
  ) as { title: string; uri: string }[]

  putHistoryEntry({
    entryKey,
    toolId: options.toolId,
    queryKey: options.queryKey,
    symbol: options.symbol,
    market: options.market,
    title: options.title,
    primarySource: 'gemini',
    sources,
    payload: { text, groundingSources },
    summary: text.slice(0, 240),
  })

  return { text, groundingSources, sources, fromHistory: false }
}

/**
 * OpenAPI payload 短摘要（History UI）。
 * @param endpointId - 端點
 * @param data - 回應
 * @returns 摘要
 */
function summarizeOpenApiPayload(endpointId: string, data: unknown): string {
  if (Array.isArray(data)) return `${endpointId}：${data.length} 筆`
  if (data && typeof data === 'object') return `${endpointId}：物件資料`
  return `${endpointId}：已取得`
}

/**
 * 在陣列資料中找代號列。
 * @param data - API 資料
 * @param symbol - 代號
 * @returns 列或 null
 */
function findSymbolRow(data: unknown, symbol: string): Record<string, unknown> | null {
  const norm = symbol.trim()
  if (!Array.isArray(data)) return null
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const code = String(
      row['證券代號'] ?? row['Code'] ?? row['股票代號'] ?? row['公司代號'] ?? row['Symbol'] ?? ''
    ).trim()
    if (code === norm) return row
  }
  return null
}

/**
 * 從列取第一個有值的欄位。
 * @param row - 列
 * @param keys - 候選鍵
 * @returns 字串或 —
 */
function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v)
  }
  return '—'
}
