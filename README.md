<p align="center">
  <img src="/Sagafisc.png" width="80" alt="Sagafisc Logo" />
</p>

<h1 align="center">Sagafisc 智慧投研平台</h1>

<p align="center">
  整合 10 個投資研究工具的一站式投資理財平台<br/>
  涵蓋投資全流程：<strong>找方向 → 找標的 → 深入分析 → 追蹤與決策 → 部位與資產</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB?logo=react" alt="React Vite" />
  <img src="https://img.shields.io/badge/Backend-Node.js_Express-339933?logo=node.js" alt="Express" />
  <img src="https://img.shields.io/badge/AI-Gemini_API-4285F4?logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/State-Zustand_&_Context-black" alt="State" />
</p>

---

## 功能總覽

| 流程分組 | 工具 | 說明 |
|---|---|---|
| **共用基建** | 庫存 (Inventory) | 持股、關注分類與資金參數；跨工具共用標的庫 |
| **共用基建** | 今日 History | 查看今日 OpenAPI 與 AI 查詢快取，避免重複消耗配額 |
| **找方向** | Trend Dashboard | 11 大 GICS 產業即時趨勢分析，含 AI 週期與風險評估 |
| **找標的** | AI 潛力股分析師 | 依投資主題與策略，由 AI 推薦潛力股並附目標價與止損點 |
| **找標的** | 鉅亨基金智庫 | 輸入基金名稱分析持股，掃描重疊強勢股 |
| **深入分析** | Gemini Stock Prophet | 台美股走勢預測與深度分析，涵蓋基本面、技術面、籌碼面 |
| **深入分析** | 智能基金分析助手 | 判斷最佳進出場時機，提供情緒評分與專家摘要 |
| **深入分析** | 即時基金風險分析 | 分析基金持股結構、近期新聞情緒與風險等級評估 |
| **追蹤與決策** | 台股目標價追蹤器 | 追蹤即時行情報價、目標價距離與外資買超潛力股 |
| **追蹤與決策** | 決策樹 (Decision Tree) | 自訂指標條件與視覺化決策樹流程，輸出進出場建議 |
| **部位與資產** | 財產分布分析 | 個人資產健診、投資人風險偏好適配與再平衡建議 |
| **綜合助理** | AlphaStrategist AI | 多輪對話式首席投資策略師，支援全頁與右下角懸浮視窗 |

**核心特色：**
- **即時市場搜尋 Grounding**：AI 工具整合最新市場數據與新聞搜尋。
- **跨工具資料無縫流轉**：任何工具發現的標的皆可一鍵送入庫存、關注清單或深度診斷。
- **本地 API Key 與快取管理**：支援在設定頁設定個人 Gemini API Key，當日 OpenAPI 與 AI 分析自動快取，節省 token。
- **摸魚／隱私模式**：快捷鍵一鍵隱藏金融敏感資訊，切換為中性對話風格外觀。

---

## 技術架構

- **前端**：React 18、Vite、React Router v6、Tailwind CSS、Zustand、Recharts、@xyflow/react
- **後端 API 代理**：Express (Node.js 22)、Yahoo Finance 報價服務、TWSE/TPEx OpenAPI Proxy
- **AI 引擎**：@google/genai TypeScript SDK
- **狀態管理**：React Context API + Zustand + LocalStorage 持久化

---

## 本地開發

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器（預設監聽 http://0.0.0.0:3000）
npm run dev

# 專案建置
npm run build
```
