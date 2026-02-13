import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FundAnalysis } from "./types";

// Schema definition for structured JSON output
const fundAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fundName: { type: Type.STRING, description: "The full name of the fund analyzed." },
    updatedDate: { type: Type.STRING, description: "Approximate date of the holdings data found." },
    overallRisk: { type: Type.STRING, enum: ["High", "Medium", "Low"], description: "Overall risk assessment of the fund." },
    overallTrend: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"], description: "Overall market trend prediction for the fund." },
    summary: { type: Type.STRING, description: "Executive summary of the fund's current status and major risks." },
    holdings: {
      type: Type.ARRAY,
      description: "List of the top 5-10 holdings of the fund.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Company name." },
          ticker: { type: Type.STRING, description: "Stock ticker symbol (e.g., 2330.TW)." },
          weight: { type: Type.NUMBER, description: "Portfolio weight percentage (0-100)." },
          riskLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          trend: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
          analysis: { type: Type.STRING, description: "Brief analysis of why this stock is a risk or opportunity." },
          recentNews: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                summary: { type: Type.STRING },
                sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                source: { type: Type.STRING, description: "Source of the news if available" }
              }
            }
          }
        },
        required: ["name", "weight", "riskLevel", "trend", "analysis", "recentNews"]
      }
    }
  },
  required: ["fundName", "overallRisk", "overallTrend", "summary", "holdings"]
};

const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem('gemini_api_key');
    if (userKey) return userKey;
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || '';
};

export const analyzeFund = async (fundName: string): Promise<FundAnalysis> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("請先至設定頁面輸入 Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    請針對基金 "${fundName}" (例如：安聯台灣科技基金) 進行即時分析。

    你的任務步驟如下：
    1. 使用 Google Search 工具找出該基金目前最新的前 5-10 大持股成分股 (Top Holdings)。請盡量尋找來自 Anue 鉅亨網、MoneyDJ 或基金官網的最新月報資料。
    2. 針對每一檔持股，搜尋過去兩週內的重大財經新聞、營收公布或法人報告。
    3. 綜合新聞內容，判斷每檔股票的風險等級 (Risk Level) 與 趨勢 (Trend)。
    4. 提供該基金的整體風險與趨勢評估。

    請確保數據盡可能準確，若找不到確切權重，請根據搜尋結果進行合理估算並標註。
    回答必須是繁體中文。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Using a model that supports search grounding well
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search for real-time data
        responseMimeType: "application/json",
        responseSchema: fundAnalysisSchema,
        systemInstruction: "你是一位專業的基金經理人與股票分析師，擅長解讀台股與科技股的財報與新聞風險。",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response generated from Gemini");
    }

    return JSON.parse(text) as FundAnalysis;

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};
