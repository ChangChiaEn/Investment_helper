# Sagafisc 智慧投研平台

Sagafisc 是一套整合多個 AI 與數據分析工具的智慧投資研究平台，涵蓋大勢分析、潛力股發掘、個股預測、基金評估、目標價追蹤、自訂決策樹與資產配置健診。

## 技術架構 (React + Vite + Express Full-Stack)

本平台已重構為現代化 React SPA 架構，搭配 Express 伺服器整合即時市場數據與代理：

- **Frontend**: React 18, React Router v6, Tailwind CSS, Lucide React, Recharts, @xyflow/react
- **Backend**: Node.js 22, Express, TypeScript (tsx), yahoo-finance2
- **AI 整合**: Google GenAI SDK (@google/genai)
- **構建工具**: Vite

## 主要功能與工具模組

1. **共用基建**
   - **庫存管理 (`/tools/inventory`)**: 持股部位、分類標籤與資金配置管理。
   - **今日 History (`/tools/history`)**: 當日 OpenAPI 與 AI 查詢快取紀錄。
   - **AlphaStrategist AI (`/tools/alphastrategist`)**: 全頁或右下角懸浮智能助理。

2. **找方向**
   - **Trend Dashboard (`/tools/trend-dashboard`)**: 全球與台美股 11 大 GICS 產業趨勢與週期分析。

3. **找標的**
   - **AI 潛力股分析師 (`/tools/ai-stock-analyst`)**: 結合 Google 搜尋與 Gemini 分析美股與台股翻倍潛力標的。
   - **鉅亨基金智庫 (`/tools/fund-insight`)**: 分析基金成分股與重疊強勢股。

4. **深入分析**
   - **Gemini Stock Prophet (`/tools/gemini-stock-prophet`)**: 個股基本面、技術面預測與投資分析報告。
   - **智能基金分析助手 (`/tools/fund-assistant`)**: 基金進出場時機判斷與市場情緒計。
   - **即時基金風險分析 (`/tools/fund-risk-analysis`)**: 持股成分圓餅圖、新聞情緒與風險等級評估。

5. **追蹤與決策**
   - **台股目標價追蹤器 (`/tools/tw-stock-target`)**: 每 30 秒自動更新即時報價，計算與法人目標價距離，並支援外資買超潛力股掃描。
   - **決策樹 (`/tools/decision-tree`)**: 自訂技術指標、基本面條件與多分叉視覺化決策流程。

6. **部位與資產**
   - **財產分布分析 (`/tools/asset-analysis`)**: 全年資產配置健診與台灣金融機構資產分佈計算。

7. **系統與隱私**
   - **設定 (`/settings`)**: 多套專業主題（駭客風、極客黑、賽博朋克、極簡白）、上班摸魚偽裝模式（支援快捷鍵快速隱藏投資界面）、Gemini API Key 驗證與模型切換。

## 開發與執行

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器 (包含 API 代理與 Vite 前端)
npm run dev

# 專案編譯
npm run build
```
