import { createClient, generateWithFallback } from "@/lib/gemini";
import { StockMarket, AnalysisResult } from "./types";

export const analyzeStock = async (symbol: string, market: StockMarket): Promise<AnalysisResult> => {
  const ai = createClient();

  const marketName = market === StockMarket.TW ? "台股 (Taiwan Stock Market)" : "美股 (US Stock Market)";

  const prompt = `
    請針對 ${marketName} 的股票代號/名稱 "${symbol}" 進行深度的投資分析與未來走向預測。

    請扮演一位擁有20年經驗的華爾街高級分析師與宏觀經濟學家。

    你需要執行以下步驟：
    1. **即時數據搜尋**：利用 Google Search 獲取該股票最新的價格、今日漲跌幅、市值、本益比 (PE Ratio) 以及最近一週的重大新聞。
    2. **基本面分析**：分析公司的財務狀況、營收增長、獲利能力以及在產業中的競爭優勢。
    3. **技術面分析**：根據搜尋到的技術指標（如均線 MA、RSI、MACD 等）分析目前的趨勢是多頭還是空頭。
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
  `;

  try {
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4, // Lower temperature for more analytical/factual responses
      },
    });

    const text = response.text || "無法產生分析報告，請稍後再試。";

    // Extract grounding chunks (sources)
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title) || [];

    // Deduplicate sources based on URI
    const uniqueSources = Array.from(new Map(sources.map((item: any) => [item.uri, item])).values()) as { title: string; uri: string }[];

    return {
      markdownText: text,
      sources: uniqueSources,
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "分析過程中發生錯誤，請檢查 API Key 或網路連線。");
  }
};