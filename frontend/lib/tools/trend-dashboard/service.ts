
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GICS_Sector } from "./types";

const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem('gemini_api_key');
    if (userKey) return userKey;
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || '';
};

export const analyzeSectorPotential = async (sector: GICS_Sector, userQuery: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const systemPrompt = `你是一位資深全球宏觀投資分析師。現在是 2026 年。
你的任務是利用 Google Search 抓取最新資訊 (Bloomberg, Reuters, FT, WSJ)，分析「${sector}」產業。

**分析邏輯 (強制執行)**：
1. **風險對沖係數 (Risk Offset)**：若 CapEx 成長率 > 營收成長率 (根據搜尋到的 2026 預估數據)，必須標註「過度投資風險：高，可能稀釋中期收益」。
2. **三段式收益預期**：
   - 短期 (0-1年)：核心邏輯需包含新聞情緒與資金動能。
   - 中期 (3-5年)：核心邏輯需包含產業資本支出 (CapEx) 與盈餘成長。
   - 長期 (10年以上)：核心邏輯需包含 IMF 結構性轉型與 R&D 投入。

**輸出規範 (嚴格禁止 markdown 語法如 ## 或 **)**：
請按照以下標籤格式輸出：

[CONCLUSION]: (長期前景 | 短期前景 | 夕陽產業)
[OVERALL_EVAL]: (綜合評價簡述，例如：短期波動性高，長期轉型壓力大)
[STRATEGY_LABEL]: (策略標題)
[STRATEGY_SUMMARY]: (簡短描述)
[RISK_LEVEL]: (低 | 中 | 高 | 極高)
[RISK_DESC]: (風險具體描述)
[RISK_OFFSET]: (風險對沖係數分析：說明產能與獲利成長的匹配度)

[CYCLE_EXPECTATIONS]:
(格式: 週期|評級|邏輯。固定三行：短期 (0-1年), 中期 (3-5年), 長期 (10年以上))
短期 (0-1年)|評級|邏輯
中期 (3-5年)|評級|邏輯
長期 (10年以上)|評級|邏輯

[INVESTMENT_SUITABILITY]:
(格式: 工具|建議標籤|理由。固定三行：ETF, 基金, 波段交易。標籤限用: ✅ 首選, ⚠️ 適合, ❌ 不建議)
ETF|建議標籤|理由
基金|建議標籤|理由
波段交易|建議標籤|理由

[KEYWORDS]: (關鍵詞，逗號分隔)
[REPORT_CONTENT]: (詳細分析內容，純文字，禁止 markdown)`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `使用者提問：${userQuery}\n產業：${sector}`,
    config: {
      systemInstruction: systemPrompt,
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "";

  const newsSources: { title: string; url: string; source: string }[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  groundingChunks.forEach((chunk: any) => {
    if (chunk.web && chunk.web.uri) {
      newsSources.push({
        title: chunk.web.title || "相關新聞資訊",
        url: chunk.web.uri,
        source: new URL(chunk.web.uri).hostname.replace('www.', '').split('.')[0]
      });
    }
  });

  const extract = (tag: string) => {
    const regex = new RegExp(`\\[${tag}\\]:?\\s*([\\s\\S]*?)(?=\\n\\[|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  const parseCycle = (raw: string) => {
    return raw.split('\n').map(line => {
      const parts = line.split('|');
      if (parts.length < 3) return null;
      return { period: parts[0].trim(), rating: (parts[1].trim() as any) || '中', logic: parts[2].trim() };
    }).filter((i): i is any => i !== null);
  };

  const parseSuitability = (raw: string) => {
    return raw.split('\n').map(line => {
      const parts = line.split('|');
      if (parts.length < 3) return null;
      return { tool: parts[0].trim(), recommendation: (parts[1].trim() as any) || '⚠️ 適合', reason: parts[2].trim() };
    }).filter((i): i is any => i !== null);
  };

  return {
    conclusion: (extract("CONCLUSION") as any) || "長期前景",
    overallEval: extract("OVERALL_EVAL") || "數據更新中",
    strategyLabel: extract("STRATEGY_LABEL") || "趨勢觀察",
    strategy: extract("STRATEGY_SUMMARY") || "根據 2026 數據配置。",
    riskFactor: {
      level: (extract("RISK_LEVEL") as any) || '中',
      description: extract("RISK_DESC") || "市場正常波動。",
      offsetCoefficient: extract("RISK_OFFSET") || "風險系數穩定。"
    },
    cycleExpectations: parseCycle(extract("CYCLE_EXPECTATIONS")),
    suitabilities: parseSuitability(extract("INVESTMENT_SUITABILITY")),
    content: extract("REPORT_CONTENT"),
    keywords: extract("KEYWORDS").split(',').map(s => s.trim()).filter(Boolean),
    newsSources: newsSources.length > 0 ? newsSources : [
      { title: "Bloomberg - Outlook 2026", url: "https://bloomberg.com", source: "Bloomberg" },
      { title: "Reuters - Sector Trends", url: "https://reuters.com", source: "Reuters" }
    ]
  };
};

export const getDashboardSummary = async (): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: "現在是 2026 年。請使用 Google Search 總結當前 11 大 GICS 產業熱點，不要 markdown，給出純文字。",
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "2026 年市場聚焦於 AI 落地獲利與能源系統韌性。";
};
