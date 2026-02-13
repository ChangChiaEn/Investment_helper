# Sagafisc 八大工具功能規格書

## 工具 1：AI 潛力股分析師 (ai-stock-analyst)
**ID**: `ai-stock-analyst`
**分類**: stock
**核心服務**: `generateStockAnalysis(prefs: UserPreferences)`
**Gemini 模型**: gemini-3-pro-preview + googleSearch

### 功能
- 使用者選擇市場（美股 US / 台股 TW）
- 輸入投資策略偏好（自由文字，如「AI 概念股」「高股息穩定成長」）
- AI 回傳 3-4 支潛力股推薦

### 輸入 UI
- 市場選擇：兩個按鈕（美股/台股）
- 策略輸入：文字框（placeholder: 尋找 undervalued 的 AI 概念股）
- 提交按鈕

### 輸出資料結構 (StockRecommendation[])
每支股票包含：
- ticker, name, sector
- currentPrice, targetPrice, upsidePercentage
- takeProfit (止盈), stopLoss (止損)
- riskLevel (Low/Medium/High)
- reasoning (繁中分析文字)
- keyCatalysts[] (增長催化劑)
- chartData[] (年度價格預測圖表：year + price)

### 結果顯示
- 卡片網格（1-3 列），每張卡含：
  - ticker + sector 標籤 + 公司名
  - 潛在漲幅百分比
  - 現價 vs 目標價
  - 止盈/止損建議（雙欄）
  - 分析原因文字
  - 催化劑列表
  - recharts AreaChart 趨勢圖（按風險著色）
- 參考資料來源區（Google Search grounding chunks）

---

## 工具 2：Gemini Stock Prophet (gemini-stock-prophet)
**ID**: `gemini-stock-prophet`
**分類**: stock
**核心服務**: `analyzeStock(symbol: string, market: StockMarket)`
**Gemini 模型**: gemini-3-pro-preview + googleSearch (temperature: 0.4)

### 功能
- 使用者選擇市場（台股/美股下拉選單）
- 輸入股票代號或名稱（如 2330, AAPL）
- AI 生成完整的 Markdown 格式投資分析報告

### 輸入 UI
- 市場下拉選單（台股🇹🇼 / 美股🇺🇸）
- 股票代號/名稱文字框
- 提交按鈕

### 輸出資料結構 (AnalysisResult)
- markdownText: 完整 Markdown 報告
- sources[]: { title, uri }

### 報告章節結構
1. 即時市場概況
2. 消息面與市場情緒
3. 基本面核心數據
4. 技術面趨勢分析
5. 風險提示
6. 綜合結論與預測

### 結果顯示
- 免責聲明 banner
- Markdown 渲染區（自製簡易 parser：h1/h2/h3/li/bold/numbered list）
- 資料來源連結網格

---

## 工具 3：Trend Dashboard (global-investment-trend-dashboard)
**ID**: `trend-dashboard`
**分類**: trend
**核心服務**:
  - `analyzeSectorPotential(sector, query)` — 產業深度分析
  - `getDashboardSummary()` — 全球熱點摘要
**Gemini 模型**: gemini-3-pro-preview + googleSearch
**額外依賴**: `data/mockData.ts` (11 大 GICS 產業歷史 CapEx 數據)

### 功能
- 載入時自動取得全球產業熱點摘要
- 左側邊欄：11 大 GICS 產業切換 + 歷史對決紀錄（max 5, 存 localStorage）
- Dashboard 模式：所有產業 CapEx 疊圖 + Alpha Rank
- 分析模式：針對選定產業 + 使用者問題進行「趨勢對決」

### 輸入 UI
- 搜尋框（在 header 中）：對某產業提問
- 左側邊欄：GICS 產業按鈕 + 歷史紀錄

### 輸出資料結構 (AnalysisResult)
- conclusion: 長期前景 | 短期前景 | 夕陽產業
- overallEval: 綜合評價
- strategyLabel + strategy
- riskFactor: { level, description, offsetCoefficient }
- cycleExpectations[]: { period, rating, logic } (短/中/長期)
- suitabilities[]: { tool, recommendation, reason } (ETF/基金/波段)
- content: 詳細報告文字
- keywords[]
- newsSources[]

### Dashboard 顯示
- recharts LineChart：11 產業 CapEx 疊圖（選中產業粗線 + 其他半透明）
- Alpha Rank 卡片網格（前 6 名）
- 全球熱點摘要文字

### 分析結果顯示
- 核心診斷：產業 + 綜合評價 + 風險等級
- 收益預期表格（短/中/長期三行）
- 風險對沖分析
- Z-Score 趨勢圖 (recharts)
- 投資工具建議表（ETF/基金/波段）
- 深度報告文字
- 匯出報告功能（下載 .txt）

---

## 工具 4：智能基金分析助手 (anue-fund-genius)
**ID**: `fund-assistant`
**分類**: fund
**核心服務**: `analyzeFundWithGemini(query)`
**Gemini 模型**: gemini-3-pro-preview + googleSearch + JSON Schema + thinkingBudget: 4096
**特色**: 支援結構化 JSON 輸出 (responseMimeType: "application/json")

### 功能
- 輸入基金名稱 → 分析單一基金
- 輸入尋找推薦語句 → AI 推薦 3 支黑馬基金
- 「尋找 3 支極短期爆發潛力股」快捷按鈕
- 鉅亨熱搜基金快速標籤

### 輸入 UI
- 搜尋框 + 開始分析按鈕
- 「尋找爆發潛力股」特殊按鈕（orange gradient, 帶 Rocket/Zap icon）
- 熱搜基金 tags（安聯台灣科技、統一黑馬、野村優質、高盛科技、富蘭克林科技）

### 輸出資料結構 (FundAnalysisResult[])
每支基金：
- fundName, isAvailableOnAnue (鉅亨網驗證)
- navPrice, riskLevel
- marketSentiment (Bullish/Bearish/Neutral)
- sentimentScore (0-100)
- expertSummary
- pros[] (3 項利多), cons[] (3 項風險)
- trendPrediction (3-6 個月展望)
- entryStrategy (進場策略), exitStrategy (出場策略)
- newsHighlights[]

### 結果顯示
- 多基金時：標題 banner「AI 智能精選：N 檔高爆發潛力股」
- 每支基金卡：
  - 名稱 + 鉅亨可購標籤 + 淨值 + 風險等級
  - 趨勢預測 + sentiment gauge bar (0-100)
  - 進場/出場策略雙卡（綠/紅色）
  - 專家分析總結
  - 利多/風險雙欄
  - 未來展望（斜體引用）
  - 相關新聞
- 資料來源連結

---

## 工具 5：即時基金持股風險分析 (fundscope-ai)
**ID**: `fund-risk-analysis`
**分類**: fund
**核心服務**: `analyzeFund(fundName)`
**Gemini 模型**: gemini-3-flash-preview + googleSearch + JSON Schema

### 功能
- 輸入基金名稱（如「安聯台灣科技」）
- AI 搜尋基金持股 → 分析每檔持股的新聞風險
- 快速基金標籤（安聯/統一/元大/野村）

### 輸入 UI
- 搜尋框 + 分析按鈕
- 快速選擇 tags

### 輸出資料結構 (FundAnalysis)
- fundName, updatedDate
- overallRisk (High/Medium/Low), overallTrend (Bullish/Bearish/Neutral)
- summary
- holdings[]:
  - name, ticker, weight (%)
  - riskLevel, trend
  - analysis (分析文字)
  - recentNews[]: { headline, summary, sentiment, source }

### 結果顯示
- 總覽卡：基金名 + 更新日期 + 趨勢icon + 風險標籤
- 總結報告（藍色區塊）
- **PieChart** (recharts)：持股權重分佈
- 持股卡片網格（每張含）：
  - 持股名 + 代號 + 權重%
  - 趨勢 icon + 風險標籤
  - AI 分析文字
  - 近期新聞列表（含 sentiment 色點）

---

## 工具 6：財產分布分析 (wealthvision---yearly-asset-analysis)
**ID**: `asset-analysis`
**分類**: asset
**核心服務**: `analyzePortfolio(assets, profileMode, profile, customAlloc, lang, currency)`
**Gemini 模型**: gemini-3-pro-preview + googleSearch + JSON Schema
**額外依賴**: `xlsx` 套件（Excel 匯出）、`constants.ts`（翻譯/風險映射/配置基準）

### 功能
- 多語言支援（繁中/英文切換）
- 多幣種支援
- 輸入資產清單（銀行、用途、類別、金額、備註）
- 選擇投資人屬性（保守/穩健/積極）或自定義風險比例
- AI 或純計算模式分析
- 試算配置模擬
- Excel 報告匯出

### 資產類別 (AssetCategory)
CASH, STOCKS, ETF, BONDS, MUTUAL_FUNDS, CRYPTO, REAL_ESTATE, GOLD, FIXED_DEPOSIT, OTHER

### 帳戶用途 (AccountPurpose)
SAVINGS, BROKERAGE, GOLD, FOREIGN_CURRENCY, FIXED_DEPOSIT, OTHER

### 輸入 UI
- 語言切換（右上角）
- 資產表單（動態新增/刪除行）：銀行代碼/名稱、用途、類別、金額、備註
- 投資人模式選擇（類別型 vs 自定義比例）
- AI 分析開關
- 提交按鈕

### 輸出資料結構 (AnalysisResult)
計算部分：
- actualAllocation: { lowRisk, medRisk, highRisk }
- targetAllocation
- diffAllocation

AI 部分：
- riskAssessment: 風險評估文字
- rebalancingAdvice: 再平衡建議
- suggestedAllocation[]: { category, percentage }
- marketOutlook: 市場展望
- groundingUrls[]

### Dashboard 顯示
- 風險配置對比圖
- AI 建議區
- 試算模擬功能
- Excel 下載（含總覽/資產清單/試算配置三個工作表）

---

## 工具 7：AlphaStrategist AI (alphastrategist-ai)
**ID**: `alphastrategist`
**分類**: advanced
**核心服務**: `sendMessageToGemini(history, newMessage)`
**Gemini 模型**: gemini-3-pro-preview + googleSearch
**特色**: 聊天機器人介面，支援多輪對話

### 功能
- 對話式介面（Chat UI）
- 角色：首席投資策略師（20年經驗）
- 支援台股籌碼面 + 美股基本面 + 鉅亨網基金分析
- 每則回覆附帶 Google Search 來源連結
- 完整對話歷史記憶

### System Instruction 要點
- 台股：搜尋三大法人買賣超、融資融券、主力持股
- 基金：確認鉅亨網可購、搜尋前十大持股
- 美股：搜尋財報、機構持股、華爾街目標價
- 回覆結構：市場概況 → 多維分析（籌碼/基本/技術/消息） → 專家觀點策略

### 輸入 UI
- 對話輸入框（固定在底部）
- 發送按鈕

### 輸出
- Markdown 格式的機器人回覆
- 每則附帶 grounding chunks（來源連結）

### 對話顯示
- 使用者訊息：右側，琥珀色氣泡
- 機器人訊息：左側，深色氣泡 + 頭像
- 簡易 Markdown 渲染（h2/h3/bullet/bold）
- 每則 bot 回覆底部附免責聲明
- 來源連結標籤

---

## 工具 8：鉅亨基金智庫 (anue-fund-insight)
**ID**: `fund-insight`
**分類**: advanced
**核心服務**:
  - `fetchFundsData(query)` — 搜尋基金資料
  - `analyzeSingleFund(fund)` — 單一基金深度分析
  - `analyzeFundOverlaps(funds)` — 持股重疊交叉分析
**Gemini 模型**: gemini-3-pro-preview + googleSearch + JSON Schema

### 功能
- 輸入多支基金名稱（逗號分隔）或類別搜尋
- 載入基金績效列表
- 針對單一基金進行深度分析
- **獨家功能**：跨基金持股重疊分析（Cross-Check）

### 輸入 UI
- textarea 多行輸入（以逗號/空白分隔）
- 載入基金數據按鈕

### 資料流程
1. 輸入 → `fetchFundsData` → 基金列表（name, code, 3M return, risk）
2. 點擊基金卡 → `analyzeSingleFund` → 深度報告
3. 點擊「掃描重疊強勢股」→ `analyzeFundOverlaps` → 交叉分析

### 基金列表 (Fund[])
- name, code, returnRate3Month, riskLevel

### 單一分析 (SingleFundAnalysis)
- fundName
- holdings: { summary, topList[] }
- sentiment: { summary, keyEvents[] }
- strategy: { suggestion, riskAnalysis, suitableFor }
- sourceUrls[]

### 重疊分析 (OverlapAnalysis)
- summary: 共同佈局策略描述
- stocks[]:
  - stockName, count (重複次數)
  - heldBy[] (持有基金名稱)
  - sector, reason

### 結果顯示
- 基金卡片網格（含績效/風險/分析按鈕）
- 「掃描重疊強勢股」按鈕
- 深度分析報告區
- 重疊分析結果區

---

## 共用規格

### Gemini API Key 來源
所有工具統一使用 `getApiKey()`:
1. 優先讀取 `localStorage.getItem('gemini_api_key')`
2. 回退 `process.env.NEXT_PUBLIC_GEMINI_API_KEY`
3. 回退 `process.env.API_KEY`

### Google Search Grounding
所有工具使用 `tools: [{ googleSearch: {} }]` 啟用即時搜尋

### 來源提取
統一從 `response.candidates?.[0]?.groundingMetadata?.groundingChunks` 提取
