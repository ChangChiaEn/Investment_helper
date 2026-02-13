
import { GoogleGenAI, Type } from "@google/genai";
import { AssetEntry, InvestorProfile, AssetCategory, Language, InvestorProfileMode, CustomAllocation } from "./types";
import { TRANSLATIONS } from "./constants";

export async function analyzePortfolio(
  assets: AssetEntry[],
  profileMode: InvestorProfileMode,
  profile: InvestorProfile,
  customAlloc: CustomAllocation,
  lang: Language,
  currency: string
) {
  const apiKey = (() => {
    if (typeof window !== 'undefined') {
      const userKey = localStorage.getItem('gemini_api_key');
      if (userKey) return userKey;
    }
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || '';
  })();
  if (!apiKey) {
    throw new Error("請先至設定頁面輸入 Gemini API Key");
  }
  const ai = new GoogleGenAI({ apiKey });
  const t = TRANSLATIONS[lang];
  const portfolioSummary = assets
    .filter(a => a.amount > 0)
    .map(a => `[${a.bankName}] ${t.purposes[a.purpose]} (${t.categories[a.category]}): ${a.amount.toLocaleString()} ${currency}${a.notes ? ` (備註: ${a.notes})` : ''}`)
    .join("\n");

  const targetInfo = profileMode === InvestorProfileMode.CATEGORICAL
    ? `Investor Profile: ${profile}`
    : `Custom Target Risk Allocation: Low Risk ${customAlloc.lowRisk}%, Medium Risk ${customAlloc.medRisk}%, High Risk ${customAlloc.highRisk}%`;

  const systemInstruction = `
    You are a world-class financial advisor in the year 2026.
    Analyze the user's current portfolio based on their target goals.
    Target Goals: ${targetInfo}
    Current Assets: ${portfolioSummary}

    CRITICAL: Use the googleSearch tool to get up-to-date market outlooks for the year 2026.
    Provide actionable rebalancing advice and suggested percentage allocation for standard asset categories.
    Return the response strictly in JSON format.
    You must provide all text fields in ${lang === Language.ZH ? 'Traditional Chinese (繁體中文)' : 'English'}.
  `;

  // Use gemini-3-pro-preview for complex reasoning and search grounding tasks
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `
      Current Date Context: 2026.
      Analyze current wealth distribution versus targets for the year 2026.
      Language: ${lang}
      Base Currency: ${currency}

      Please provide:
      1. riskAssessment: A detailed analysis comparing current risk levels to the user's target.
      2. rebalancingAdvice: Clear steps to realign the current assets to reach the desired target state in 2026.
      3. suggestedAllocation: A list of recommended percentages for asset categories to achieve the target.
      4. marketOutlook: A detailed financial outlook specifically for 2026-2027 based on current events.
    `,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskAssessment: { type: Type.STRING },
          rebalancingAdvice: { type: Type.STRING },
          suggestedAllocation: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                percentage: { type: Type.NUMBER }
              },
              required: ["category", "percentage"]
            }
          },
          marketOutlook: { type: Type.STRING }
        },
        required: ["riskAssessment", "rebalancingAdvice", "suggestedAllocation", "marketOutlook"]
      }
    }
  });

  try {
    // Access the text property directly (not a method call)
    const rawText = (response.text || '').trim();
    // In case of markdown code block wrapping, clean the text before parsing
    const cleanJson = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleanJson);

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const urls = groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean);

    return {
      ...parsed,
      groundingUrls: urls || []
    };
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    throw new Error(lang === Language.ZH ? "分析生成失敗，請稍後再試。" : "Analysis failed. Please try again.");
  }
}
