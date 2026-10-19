/**
 * Gemini Stock Prophet：先以 OpenAPI／今日 History 組結構化事實，
 * 再交給 Grounding＋Gemini 做解讀，減少純搜尋找數字的 token 消耗。
 */

import { prefetchTwStockFacts, runGeminiPipeline } from '@/lib/pipeline'
import { StockMarket, AnalysisResult } from './types'

/**
 * 分析個股：台股先預取 OpenAPI 事實；美股仍以 Grounding 為主。
 * @param symbol - 代號或名稱
 * @param market - 台／美
 * @returns Markdown 報告與 grounding 來源
 */
export const analyzeStock = async (
  symbol: string,
  market: StockMarket
): Promise<AnalysisResult> => {
  const marketName =
    market === StockMarket.TW ? '台股 (Taiwan Stock Market)' : '美股 (US Stock Market)'

  // --- 台股：OpenAPI 今日事實（命中 History 則不重打） ---
  let factsBlock = ''
  if (market === StockMarket.TW) {
    try {
      const facts = await prefetchTwStockFacts(symbol.trim())
      if (facts.summary) {
        factsBlock = `\n\n以下為系統已自證交所 OpenAPI 取得的今日結構化資料，請優先採用，勿再浪費搜尋去查相同數字：\n${facts.summary}\n`
      }
    } catch {
      // 預取失敗仍可走 Grounding
    }
  }

  const prompt = `
    請針對 ${marketName} 的股票代號/名稱 "${symbol}" 進行深度的投資分析與未來走向預測。

    請扮演一位擁有20年經驗的華爾街高級分析師與宏觀經濟學家。
    ${factsBlock}
    你需要執行以下步驟：
    1. **即時數據**：若上方已提供 OpenAPI 結構化數字，請直接引用；不足處再用 Google Search 補新聞與美股等缺口。
    2. **基本面分析**：分析公司的財務狀況、營收增長、獲利能力以及在產業中的競爭優勢。
    3. **技術面分析**：根據已知或搜尋到的技術指標（如均線 MA、RSI、MACD 等）分析目前的趨勢是多頭還是空頭。
    4. **市場情緒與消息面**：綜合近期新聞、法人動向或市場傳言，評估市場對該股的情緒。
    5. **未來走向預測 (核心)**：基於以上數據，給出明確的 "短線 (1-4週)" 與 "中長線 (3-12月)" 的走勢預測 (看漲/看跌/持平)，並說明理由。

    請以 **Markdown** 格式輸出報告，包含以下章節標題 (請嚴格遵守標題名稱)：
    # ${symbol} 投資分析報告
    ## 1. 即時市場概況
    ## 2. 消息面與市場情緒
    ## 3. 基本面核心數據
    ## 4. 技術面趨勢分析
    ## 5. 風險提示
    ## 6. 綜合結論與預測

    請確保語氣專業、客觀，並使用繁體中文 (Traditional Chinese)。
  `

  try {
    const result = await runGeminiPipeline({
      toolId: 'gemini-stock-prophet',
      queryKey: `${market}:${symbol.trim()}`,
      title: `Prophet：${symbol}`,
      prompt,
      useGrounding: true,
      temperature: 0.4,
      symbol: symbol.trim(),
      market: market === StockMarket.TW ? 'TW' : 'US',
    })

    return {
      markdownText: result.text,
      sources: result.groundingSources,
    }
  } catch (error: unknown) {
    console.error('Gemini API Error:', error)
    const message = error instanceof Error ? error.message : '分析過程中發生錯誤，請稍後重試。'
    throw new Error(message)
  }
}
