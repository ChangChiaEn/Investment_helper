import { createClient, generateWithFallback } from "@/lib/gemini";
import { AnalysisResult, StockRecommendation, UserPreferences } from "./types";

export const generateStockAnalysis = async (prefs: UserPreferences): Promise<AnalysisResult> => {
  const ai = createClient();

  const marketText = prefs.market === 'TW' ? "Taiwan Stock Market (台股)" : "US Stock Market (美股)";

  const prompt = `
    You are a world-class senior financial analyst and investment strategist using Gemini 3.

    Your task:
    1. **Search** for the LATEST REAL-TIME market data, stock prices, and news for the ${marketText} to identify undervalued stocks.
    2. Identify 3-4 highly potential, undervalued stocks that match the user's strategy: "${prefs.strategy}".
    3. Verify current prices and recent catalysts using Google Search.
    4. Provide specific trading advice including Take Profit (止盈) and Stop Loss (止損) levels based on technical and fundamental analysis.

    Output Format:
    Return ONLY a valid JSON array matching the following structure inside a JSON code block (\`\`\`json ... \`\`\`).

    JSON Structure for each item:
    {
      "ticker": "Stock Symbol (e.g. AAPL or 2330.TW)",
      "name": "Company Name",
      "currentPrice": Number (Latest price found),
      "targetPrice": Number (Projected price in 12-18 months),
      "takeProfit": Number (Recommended sell point for profit),
      "stopLoss": Number (Recommended exit point to minimize loss),
      "upsidePercentage": Number (Growth percentage based on current vs target),
      "riskLevel": "Low" | "Medium" | "High",
      "sector": "Industry Sector",
      "reasoning": "Analysis in Traditional Chinese (繁體中文), 2-3 sentences explaining why it matches the strategy and search findings.",
      "keyCatalysts": ["Catalyst 1", "Catalyst 2", "Catalyst 3"],
      "chartData": [
        { "year": "Current", "price": Number },
        { "year": "2025", "price": Number },
        { "year": "2026", "price": Number },
        { "year": "2027", "price": Number }
      ]
    }

    Constraints:
    - Use Traditional Chinese for text fields.
    - Ensure takeProfit and stopLoss are realistic relative to currentPrice.
    - Ensure data is based on the search results.
  `;

  try {
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    let recommendations: StockRecommendation[] = [];

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);

    if (jsonMatch && jsonMatch[1]) {
      try {
        recommendations = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("JSON Parse Error (Block):", e);
        try {
            recommendations = JSON.parse(text);
        } catch (e2) {
             throw new Error("Failed to parse stock analysis data.");
        }
      }
    } else {
       try {
         recommendations = JSON.parse(text);
       } catch (e) {
         console.error("JSON Parse Error (Raw):", e);
         throw new Error("Failed to parse stock analysis data.");
       }
    }

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title)
      .map((web: any) => ({ title: web.title, uri: web.uri }));

    const uniqueSources = Array.from(new Map(sources.map((s:any) => [s.uri, s])).values());

    return {
      recommendations,
      sources: uniqueSources as any[]
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
