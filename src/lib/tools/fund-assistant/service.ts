import { Type, Schema } from "@google/genai";
import { createClient, generateWithFallback } from "@/lib/gemini";
import { FundAnalysisResult, GroundingSource } from "./types";

// Define the fund object properties
const fundProperties = {
  fundName: { type: Type.STRING, description: "The full official name of the fund identified (in Traditional Chinese)." },
  isAvailableOnAnue: { type: Type.BOOLEAN, description: "True if the fund is likely available on Anue (fund.cnyes.com)." },
  navPrice: { type: Type.STRING, description: "The most recent Net Asset Value (NAV) found, e.g., '120.5 TWD'. Return 'N/A' if not found." },
  riskLevel: { type: Type.STRING, description: "Risk level (e.g., RR4, RR5)." },
  marketSentiment: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'], description: "Overall market sentiment." },
  sentimentScore: { type: Type.INTEGER, description: "A score from 0 (Extremely Bearish) to 100 (Extremely Bullish)." },
  expertSummary: { type: Type.STRING, description: "Comprehensive executive summary in Traditional Chinese (approx 100 words)." },
  pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 key positive factors (Traditional Chinese)." },
  cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 key risks or negative factors (Traditional Chinese)." },
  trendPrediction: { type: Type.STRING, description: "Prediction for the next 3-6 months (Traditional Chinese)." },
  entryStrategy: { type: Type.STRING, description: "Specific advice on WHEN to buy to maximize profit. Use Traditional Chinese." },
  exitStrategy: { type: Type.STRING, description: "Specific advice on WHEN to sell/take profit. Use Traditional Chinese." },
  newsHighlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Headlines of 2-3 relevant news stories (Traditional Chinese)." }
};

// Define the response schema for structured output (Array of Funds)
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    funds: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: fundProperties,
        required: ["fundName", "isAvailableOnAnue", "marketSentiment", "sentimentScore", "expertSummary", "pros", "cons", "trendPrediction", "entryStrategy", "exitStrategy", "newsHighlights"]
      }
    }
  },
  required: ["funds"]
};

export const analyzeFundWithGemini = async (query: string): Promise<{ result: FundAnalysisResult[]; sources: GroundingSource[] }> => {
  const ai = createClient();

  const prompt = `
    你是一位頂尖的金融分析師。使用者的查詢是：「${query}」。

    任務說明：
    1. **意圖判斷**：
       - 若查詢是**具體的基金名稱**（如「安聯台灣科技」），請直接分析該基金（回傳 1 個結果）。
       - 若查詢是**尋找推薦**（如「找短期翻倍基金」、「推薦高獲利標的」），請利用 Google Search 搜尋目前市場上題材最熱（如 AI、重電、半導體、比特幣 ETF 等）、短期動能最強，且在台灣（如鉅亨網）可購買的 **3支** 不同類型的「黑馬基金」。
       - 推薦的基金必須波動大、具備爆發潛力，適合積極型投資人。

    2. **執行分析 (針對每一支基金)**：
       - **查證**：在「鉅亨網 (fund.cnyes.com)」確認該基金名稱、最新淨值及交易狀態。
       - **新聞與趨勢**：搜尋最新的市場情緒、專家觀點及相關利多利空新聞。
       - **進出場策略 (關鍵)**：針對「最大化收益」與「短期操作」的目標，給出極為具體的進場點位（例如：拉回至月線買進）與停利/停損點位。

    **請務必使用繁體中文 (Traditional Chinese) 回答所有內容。**
    回傳格式必須符合 JSON Schema，包含一個 'funds' 陣列。
  `;

  try {
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search Grounding
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        thinkingConfig: {
            thinkingBudget: 4096 // Increase budget for multiple funds analysis
        }
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini.");
    }

    const parsedResponse = JSON.parse(responseText);
    const result: FundAnalysisResult[] = parsedResponse.funds;

    // Extract Grounding Metadata (Sources)
    const sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            url: chunk.web.uri,
            source: new URL(chunk.web.uri).hostname.replace('www.', '')
          });
        }
      });
    }

    return { result, sources };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};