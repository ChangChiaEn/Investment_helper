# 理財小能手

## 已存在的功能

| 已存在的主功能 | url | 性質 | 備註 |
| --- | --- | --- | --- |
| AlphaStrategist AI | https://ai.studio/apps/drive/1zzteZOPaAijo0L1NXhsYz6dyFH4r5K6V | 綜合幫助管家 |  |
| 財產分布分析 | https://ai.studio/apps/drive/1KWlQbBNzs5ICOQVFdaZwpvwDLrdpH8lL | 個人資產健診 |  |
| Global Investment Trend Dashboard | https://ai.studio/apps/drive/1uyliceFDD2mAtCZfzxzlBWOFb-VR0hKK | 全產業大勢分析 |  |
| 即時基金持股風險分析 | https://ai.studio/apps/drive/1KRZaSoFwPTmtv44_RSBKvubIW9lrMoJc | 基金 | 輸入基金名稱，AI 將自動搜尋其最新持股，並分析相關新聞風險與市場走向。 |
| 智能基金分析助手 | https://ai.studio/apps/drive/1EPtnhyfZW7KSMaerW5CqLlUusVKcChsc | 基金 | 輸入基金或相關名稱。結合金融專家知識、即時新聞與鉅亨網數據，為您判斷最佳進出場時機，最大化投資收益。 |
| AI 潛力股分析師 | https://ai.studio/apps/drive/1m5JZ1E0CvJnvligkw2kYBlYs0jnOEPtF?fullscreenApplet=true | 股票 | 輸入趨勢或主題。分析某趨勢的潛力台美股票 |
| Gemini Stock Prophet | https://ai.studio/apps/drive/1peVlLOs6r7W-a9u4ej2Zh6lh5XjPOdY_ | 股票 | 輸入代號或名稱。台美股走勢預測與深度分析 |
| 鉅亨基金智庫 | https://ai.studio/apps/drive/1v_bvUjv7wic2Ccb2-Wq2lM7Bt8DPxJbK | 股票 | 分析目前大勢基金的成分股重疊的優質股票有哪些。 |

### 分析與設計

| **階段** | **市場掃描** | **目標篩選** | **深度診斷** | **個人管理** |
| --- | --- | --- | --- | --- |
| **User Activity** | **找趨勢** | **挑標的** | **看準度與風險** | **理財庫** |
| **User Story (MVP 層)** | 身為投資人，我想要看到全產業趨勢，以便決定佈局方向。 | 身為投資人，我想要輸入主題，獲得推薦的台美股名單。 | 身為投資人，我想要預測特定股票走勢，以便決定買點。 | 身為投資人，我想要分析我的資產分佈，了解健康度。 |
| **對應功能 （股票）** | Trend Dashboard | AI 潛力股分析師 | Gemini Stock Prophet | 財產分布分析 |
| **對應功能 B（基金）** | Trend Dashboard | 智能基金分析助手  | 即時基金風險分析  | 財產分布分析 |
| 進階功能  |  | 鉅亨基金智庫（找重疊的股票）、標記與分析 | AlphaStrategist AI (全方位諮詢)、標記與分析 | AlphaStrategist AI (全方位諮詢) |

對應功能A、B為必須出現在導航區的功能。

### User Flow

**找趨勢**

1. **進入首頁：** 使用者先看到 **Global Investment Trend Dashboard**，發現「半導體」趨勢大好。
2. **點擊導向：** 使用者點擊「半導體」使用 **AI 潛力股分析師/智能基金分析助手**，找出相關標的物。
3. **深度查看：** 使用者對其中一支標的感興趣**（可標記此標的物）**，點選進階分析後直接帶入 **Gemini Stock Prophet/即時基金風險分析** 進行走勢預測。
    1. 多筆標的物使用 **AlphaStrategist AI** 進行分析

**找目標**

1. **進入首頁：** 使用者使用 **AI 潛力股分析師/智能基金分析助手** 尋找「半導體」相關標的物。
2. **點擊導向：** 發現 **股票A/基金B** 表現最好，點擊進入深度分析**（可標記此標的物）**。
    1. 基金可利用 **鉅亨基金智庫** 進階尋找重疊的優質股
    2. 多筆標的物使用 **AlphaStrategist AI** 進行分析
3. **深度查看：** 使用者對其中一支標的感興趣**（可標記此標的物）**，點選進階分析後直接帶入 **Gemini Stock Prophet/即時基金風險分析** 進行走勢預測。

**理財庫**

1. **進入首頁：** 使用者在 **財產分布分析** 帶入目前的財產分配，模擬調整結果。
    1. 開啟AI分析
2. **點擊導向：** 若使用者新增股票/基金配比，點擊跳轉至…（反正不管是找趨勢還是找目標，都會放在導航列，直接跳過去就好）

### 整合建議

1. **建立「工作區 (Workspace)」概念：**

    目前的工具都是獨立連結。建議設計一個**主側邊欄**，讓這些功能模組化。使用者可以像在用 Slack 或 Notion 一樣，在同一個介面切換不同的 AI 助手，且資料（如：使用者關注的標的）要在各工具間共享。

    > ✅ **已實作** — 主側邊欄 + 工具模組化 + 關注清單（Watchlist）在 sidebar 共享。

2. **數據打通（Data Layer）：**

    最順暢的體驗是「資料自動帶入」。例如，當使用者在「財產分布分析」中標註了自己持有 A 基金，切換到「即時基金風險分析」時，系統應該主動跳出 A 基金的最新動態，而不是讓使用者重新輸入名稱。

    > ✅ **已實作** — 跨工具自動填入（URL params）+ 工具狀態暫存（ToolCacheContext）+ 關注清單一鍵導航至深度分析工具。

3. **入口分流：**
    - **新手/探索者：** 從 **Global Investment Trend**（市場面）切入。
    - **老手/檢視者：** 從 **個人資產健診**（自我面）切入。

---

## 已完成的 UX 改善 (2026-02-15)

### 工具狀態暫存
- 切換工具再切回來，查詢結果和表單狀態保留（session 內有效）
- 涵蓋所有 6 個主要工具頁面
- 實作：`ToolCacheContext` + `useToolCache` hook

### 關注清單 (Watchlist)
- 在結果卡片上點擊書籤即可收藏股票/基金
- Sidebar 顯示關注清單，hover 可「送去分析」或「移除」
- localStorage 持久化，重新整理不會丟失
- Storage Adapter 抽象層，未來可替換為後端 API
- 實作：`WatchlistContext` + `WatchlistStorage` interface

### 跨工具自動填入
- AI 潛力股分析師 StockCard → 一鍵送至 Gemini Stock Prophet
- 智能基金分析助手 FundCard → 一鍵送至即時基金風險分析
- 基金透視鏡基金卡片 → 書籤收藏
- 目標工具自動讀取 URL params 並觸發分析

> 詳細技術文檔見 `docs/update-ux-state-watchlist.md`