import { Type } from "@google/genai";
import { getApiKey, createClient, generateWithFallback } from "@/lib/gemini";
import { Fund, SingleFundAnalysis, OverlapAnalysis } from "./types";

// 1. Fetch Funds Data (Supports both specific names and categories)
export const fetchFundsData = async (query: string = ""): Promise<{ funds: Fund[], rawText: string }> => {
  const ai = createClient();

  const searchInput = query.trim();
  if (!searchInput) {
      throw new Error("請輸入基金名稱。");
  }

  // Hybrid prompt: handles both specific list of names OR a category search
  const prompt = `
    使用者輸入了以下查詢字串："${searchInput}"

    請判斷這是一個「基金名稱清單」(例如：安聯台灣科技, 統一黑馬) 還是一個「類別搜尋」(例如：科技股, 高股息)。

    任務目標：
    1. **若是基金名稱清單**：請針對清單中的每一支基金，利用 Google Search 搜尋其在「鉅亨網 (Anue)」的最新數據 (代碼、3個月報酬率、風險等級)。
    2. **若是類別搜尋**：請找出該類別在鉅亨網近三個月績效最佳的前 3 名基金。

    嚴格限制：
    1. 資料來源優先參考鉅亨網 (Anue.com)。
    2. 若找不到特定數值 (如風險等級)，請留空或填寫 "-"。
    3. 回傳內容請使用繁體中文。

    請回傳 JSON 物件：
    {
      "funds": [
        {
          "name": "基金完整名稱",
          "returnRate3Month": "三個月報酬率 (請包含 % 符號)",
          "code": "基金代碼",
          "riskLevel": "風險等級 (例如 RR4)"
        }
      ]
    }
  `;

  try {
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                funds: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            returnRate3Month: { type: Type.STRING },
                            code: { type: Type.STRING },
                            riskLevel: { type: Type.STRING }
                        }
                    }
                }
            }
        }
      }
    });

    let jsonText = response.text || "{}";

    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }
    jsonText = jsonText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

    try {
        const data = JSON.parse(jsonText);
        return { funds: data.funds || [], rawText: jsonText };
    } catch (e) {
        console.error("Funds JSON Parse Error", e);
        throw new Error("數據解析失敗，請確認輸入名稱是否正確。");
    }

  } catch (error) {
    console.error("Error fetching funds:", error);
    throw error;
  }
};

// 2. Analyze Fund Overlaps
export const analyzeFundOverlaps = async (funds: Fund[]): Promise<OverlapAnalysis> => {
    const ai = createClient();

    const fundsList = funds.map(f => f.name).join(", ");

    const prompt = `
      針對以下這幾支表現優異的基金，進行「持股重疊交叉分析」：
      基金清單：${fundsList}

      任務：
      1. 利用 Google Search 分別找出這幾支基金的「前十大持股」或主要成分股。
      2. **比對**這些持股清單，找出「重複出現」在至少兩支基金中的股票 (Overlapping Stocks)。
      3. 若找不到完全相同的股票，請尋找重複的「細分產業」或「概念」(例如：都持有 AI 伺服器供應鏈)。

      請回傳 JSON 格式：
      {
        "summary": "一句話總結這些基金的共同佈局策略 (例如：均重倉 AI 半導體龍頭)。",
        "stocks": [
          {
            "stockName": "股票或產業名稱 (例如: TSMC, Nvidia)",
            "count": 重複出現的次數 (數字),
            "heldBy": ["持有此股的基金A名稱", "持有此股的基金B名稱"],
            "sector": "所屬產業 (例如: 半導體)",
            "reason": "簡述為何這些基金都看好它 (例如: AI 晶片壟斷優勢)"
          }
        ]
      }

      注意：
      - 請優先列出重複次數 (count) 最高的項目。
      - 若無完全重疊個股，請列出重疊的「產業關鍵字」。
    `;

    try {
      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  summary: { type: Type.STRING },
                  stocks: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              stockName: { type: Type.STRING },
                              count: { type: Type.NUMBER },
                              heldBy: { type: Type.ARRAY, items: { type: Type.STRING } },
                              sector: { type: Type.STRING },
                              reason: { type: Type.STRING }
                          }
                      }
                  }
              }
          }
        }
      });

      let jsonText = response.text || "{}";
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      } else {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const result = JSON.parse(jsonText);
      return {
          summary: result.summary || "分析完成，但未發現顯著重疊。",
          stocks: result.stocks || []
      };

    } catch (error) {
      console.error("Error analyzing overlaps:", error);
      throw error;
    }
  };

// 3. Single Fund Deep Analysis (Structured)
export const analyzeSingleFund = async (fund: Fund): Promise<SingleFundAnalysis> => {
  const ai = createClient();

  const fundInfo = `${fund.name} (Code: ${fund.code || 'N/A'}, 3M Return: ${fund.returnRate3Month})`;

  const prompt = `
    針對這支在鉅亨網 (Anue) 表現優異的基金進行深度分析：
    基金資訊：${fundInfo}

    請執行以下深度分析任務 (請展現專業金融分析師的口吻，並嚴格使用**繁體中文**回答)。

    【極重要原則】：
    1. **不要回傳 HTML**，請回傳純文字 JSON 結構。
    2. 若搜尋不到該基金的「特定持股」或「特定新聞」，**請勿回答無法生成**。
       -> 請根據該基金的「名稱」與「類別」(如：科技、美債、生技)，分析該「產業板塊」的通用現況與持股邏輯。
       -> 例如：若查不到某科技基金持股，請分析目前 AI 與半導體產業的龍頭股(如 Nvidia) 對此類基金的影響。

    任務內容：

    1. **持股結構 (Holdings)**：
       - summary: 分析該基金的佈局策略 (例如：集中度高、偏重硬體等)。
       - topList: 列出 3-5 個主要持股名稱或主要投資產業。

    2. **市場情緒 (Sentiment)**：
       - summary: 近期該領域的總經環境與市場氣氛。
       - keyEvents: 列出 2-3 個影響該基金表現的近期關鍵事件 (如 Fed 決策、財報季)。

    3. **專家建議 (Strategy)**：
       - suggestion: 給投資人的具體操作建議 (加碼、觀望、停利)。
       - riskAnalysis: 潛在風險提示。
       - suitableFor: 適合什麼類型的投資人 (如：積極型、領息族)。

    請以 JSON 格式回傳。
  `;

  try {
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                holdings: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        topList: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                },
                sentiment: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        keyEvents: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                },
                strategy: {
                    type: Type.OBJECT,
                    properties: {
                        suggestion: { type: Type.STRING },
                        riskAnalysis: { type: Type.STRING },
                        suitableFor: { type: Type.STRING }
                    }
                }
            }
        }
      }
    });

    let jsonText = response.text || "{}";

    // Cleanup
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    } else {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let result;
    try {
        result = JSON.parse(jsonText);
    } catch (e) {
        console.error("Analysis JSON Parse Error", e);
        throw new Error("分析報告生成格式異常，請再試一次。");
    }

    // Extract grounding URLs
    const sourceUrls: string[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sourceUrls.push(chunk.web.uri);
      }
    });

    // Fallback safe guards
    return {
      fundName: fund.name,
      holdings: result.holdings || { summary: "暫無詳細持股數據", topList: [] },
      sentiment: result.sentiment || { summary: "暫無市場情緒分析", keyEvents: [] },
      strategy: result.strategy || { suggestion: "建議持續觀察", riskAnalysis: "市場波動風險", suitableFor: "一般投資人" },
      sourceUrls: Array.from(new Set(sourceUrls))
    };

  } catch (error) {
    console.error("Error analyzing fund:", error);
    throw error;
  }
};
