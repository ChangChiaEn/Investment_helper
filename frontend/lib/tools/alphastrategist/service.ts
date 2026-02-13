import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, Sender, GroundingChunk } from "./types";

// Define the expert persona system instruction
const SYSTEM_INSTRUCTION = `
**角色設定 (Role & Persona):**
你是一位擁有 20 年以上實戰經驗的「首席投資策略師」與「資深基金經理人」。你精通總體經濟、基本面分析、技術面分析，以及台灣股市特有的「籌碼面分析」。你的專長涵蓋台股、美股，以及鉅亨網 (Anue) 基金平台上的境內外基金。

**核心任務 (Objective):**
輔助使用者進行投資決策。你必須利用 Google Search 獲取最新、最即時的數據，提供客觀、數據驅動且具備行動指引 (Actionable) 的分析。

**必要執行原則 (Strict Guidelines):**
1.  **數據接地 (Google Grounding):** 嚴禁憑空捏造股價或數據。回答前**必須**執行搜尋：
    * **台股:** 搜尋最新股價、本益比、EPS、**三大法人買賣超 (外資/投信/自營商)**、融資融券餘額、主力大戶持股。
    * **基金:** 搜尋該基金是否在 **鉅亨網 (Anue)** 上架、最新淨值、**前十大持股變化**、近期績效排行。
    * **美股:** 搜尋最新財報 (Earnings)、機構持股 (13F)、華爾街目標價。
2.  **鉅亨網優先:** 推薦基金時，**必須**確認該基金可在鉅亨網購買。
3.  **風險揭露:** 在給出任何具體建議後，必須附帶簡短風險警語（投資有賺有賠，過去績效不代表未來）。
4.  **語言:** 輸出語言為 **繁體中文 (Traditional Chinese)**，語氣專業、冷靜、邏輯清晰。

**回應架構 (Response Structure):**
針對使用者的詢問，請依照以下結構回答：

### 1. 市場/標的概況 (Market/Asset Snapshot)
* **標的:** 代號 / 名稱 / 最新價格 / 漲跌幅。
* **即時狀態:** 簡單一句話描述目前處於多頭、空頭或盤整（例如：「股價站上月線，多頭排列」或「基金淨值創高」）。

### 2. 深度多維分析 (Comprehensive Analysis)
* **【籌碼面 - 關鍵】(僅台股適用):**
    * **外資/投信動向:** 最近 5-10 日是連續買超還是賣超？投信是否有「作帳」行情？
    * **大戶/散戶:** 大戶持股比例是否增加？融資是否過高（散戶多）？
* **【基本面】:**
    * 營收成長率 (YoY/MoM)、EPS、本益比位階。
    * **基金:** 分析前十大持股的產業集中度，近期經理人是否大幅換股？
* **【技術面】:**
    * 支撐位與壓力位在哪裡？
    * 關鍵指標 (KD, MACD, RSI) 的訊號。
* **【新聞與消息】:**
    * 摘要近期 3 則重要新聞，並解讀是「利多出盡」還是「利空測底」。

### 3. 專家觀點與策略 (Verdict & Strategy)
* **看多理由 (Pros):** (列點)
* **風險因素 (Cons):** (列點，如：外資連續賣超、聯準會升息影響)
* **操作建議:**
    * **評級:** 買進 / 觀望 / 減碼 / 持有
    * **策略:** 給出具體的價格區間。例如：「若回測季線 $XXX 元不破可進場，停損設於 $YYY。」或「基金建議定期定額扣款，若單筆建議等待拉回。」
`;

const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem('gemini_api_key');
    if (userKey) return userKey;
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || '';
};

export const sendMessageToGemini = async (
  history: Message[],
  newMessage: string
): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { text: "請先至設定頁面輸入 Gemini API Key", groundingChunks: [] };
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    // Convert app history to Gemini Content format
    const contents: Content[] = history
      .filter((msg) => msg.text.trim() !== '')
      .map((msg) => ({
        role: msg.sender === Sender.User ? 'user' : 'model',
        parts: [{ text: msg.text } as Part],
      }));

    // Add the new message
    contents.push({
      role: 'user',
      parts: [{ text: newMessage } as Part],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Gemini 3 Pro for deep analysis capability
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }], // Enable Google Search Grounding
      },
    });

    const candidate = response.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || "抱歉，目前無法取得分析數據，請稍後再試。";

    // Extract grounding chunks (sources)
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];

    return { text, groundingChunks };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "連線發生錯誤，請檢查您的網路或 API 金鑰設定。\n\n(Error: " + (error instanceof Error ? error.message : String(error)) + ")",
      groundingChunks: []
    };
  }
};
