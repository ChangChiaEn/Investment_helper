# FinBuddy 架構遷移技術文檔

本文件記錄 FinBuddy 前端架構從「外部工具 + Webpack Alias」遷移至「統一原生整合」的完整過程、原因與技術細節。

---

## 目錄

1. [遷移摘要](#遷移摘要)
2. [更新前架構](#更新前架構)
3. [更新後架構](#更新後架構)
4. [為何要遷移](#為何要遷移)
5. [遷移內容](#遷移內容)
6. [檔案對照表](#檔案對照表)
7. [技術決策說明](#技術決策說明)
8. [啟動方式](#啟動方式)

---

## 遷移摘要

| 項目 | 更新前 | 更新後 |
|------|--------|--------|
| **工具存放位置** | 專案根目錄的 8 個獨立 Vite 資料夾 | `frontend/lib/tools/` + `frontend/app/tools/` |
| **工具引入方式** | Webpack Alias（`@/tools-*`） | 標準 `@/lib/tools/*` 路徑別名 |
| **UI 框架** | 各工具自有 App.tsx（混合 Vite + React） | 統一 Next.js App Router 頁面 |
| **視覺風格** | 混亂（有暗色、有亮色、各自不同） | 統一淺色主題（白底、灰邊框、藍色強調） |
| **TypeScript 檢查** | `ignoreBuildErrors: true` 跳過 | 完整 TypeScript 型別檢查通過 |
| **Build 結果** | 依賴外部目錄，部署困難 | 自包含，可直接部署 Cloudflare |

---

## 更新前架構

### 目錄結構

```
Investment_helper/
├── frontend/                         # Next.js 主程式
│   └── next.config.js               # 含 8 個 webpack alias
│
├── ai-stock-analyst/                 # 獨立 Vite 專案 ①
│   ├── App.tsx                      # 工具的完整 UI + 邏輯
│   ├── components/                  # 工具專屬元件
│   ├── services/geminiService.ts    # Gemini API 呼叫
│   ├── types.ts
│   ├── package.json                 # 各自的 dependencies
│   ├── vite.config.ts
│   └── index.html
│
├── gemini-stock-prophet/             # 獨立 Vite 專案 ②
├── global-investment-trend-dashboard/ # 獨立 Vite 專案 ③
├── anue-fund-genius/                 # 獨立 Vite 專案 ④
├── fundscope-ai/                     # 獨立 Vite 專案 ⑤
├── wealthvision---yearly-asset-analysis/ # 獨立 Vite 專案 ⑥
├── alphastrategist-ai/               # 獨立 Vite 專案 ⑦
└── anue-fund-insight/                # 獨立 Vite 專案 ⑧
```

### 引入方式

`next.config.js` 透過 webpack alias 將外部資料夾映射為模組路徑：

```js
// 更新前的 next.config.js
config.resolve.alias = {
  '@/tools-ai-stock-analyst': path.resolve(__dirname, '../ai-stock-analyst'),
  '@/tools-gemini-stock-prophet': path.resolve(__dirname, '../gemini-stock-prophet'),
  '@/tools-global-trend': path.resolve(__dirname, '../global-investment-trend-dashboard'),
  '@/tools-fund-assistant': path.resolve(__dirname, '../anue-fund-genius'),
  '@/tools-fund-risk': path.resolve(__dirname, '../fundscope-ai'),
  '@/tools-asset-analysis': path.resolve(__dirname, '../wealthvision---yearly-asset-analysis'),
  '@/tools-alphastrategist': path.resolve(__dirname, '../alphastrategist-ai'),
  '@/tools-fund-insight': path.resolve(__dirname, '../anue-fund-insight'),
  // 額外: 強制 @google/genai 從 frontend 解析
  '@google/genai': path.resolve(frontendNodeModules, '@google/genai'),
}

// 必須跳過型別檢查才能 build
typescript: {
  ignoreBuildErrors: true,
}
```

### 工具頁面載入

各工具頁面透過 `dynamic()` import 載入外部 App.tsx，再用 `<ToolWrapper>` 包裹：

```tsx
// 更新前: app/tools/ai-stock-analyst/page.tsx
const ToolApp = dynamic(() => import('@/tools-ai-stock-analyst/App'), { ssr: false })

export default function Page() {
  return <ToolWrapper toolId="ai-stock-analyst"><ToolApp /></ToolWrapper>
}
```

### 問題

1. **雙層 Layout** — 各工具的 App.tsx 自帶 header/footer，被嵌套在主系統的 sidebar layout 裡，造成「頁面中有頁面」
2. **風格不統一** — 有的工具用暗色主題，有的用亮色，完全不搭
3. **Build 不穩定** — 必須用 `ignoreBuildErrors: true` 跳過型別檢查，隱藏了大量真實錯誤
4. **部署困難** — Cloudflare Pages 需要整個程式碼自包含在一個目錄內，但 8 個外部資料夾打破了這個限制
5. **重複依賴** — 每個工具都有自己的 `package.json`，重複安裝 React、@google/genai 等
6. **模組解析複雜** — 需要手動設定 `@google/genai` 的解析路徑，避免版本衝突

---

## 更新後架構

### 目錄結構

```
Investment_helper/
├── frontend/
│   ├── app/tools/                    # 8 個工具的 UI 頁面（統一風格）
│   │   ├── ai-stock-analyst/page.tsx
│   │   ├── gemini-stock-prophet/page.tsx
│   │   ├── trend-dashboard/page.tsx
│   │   ├── fund-assistant/page.tsx
│   │   ├── fund-risk-analysis/page.tsx
│   │   ├── asset-analysis/page.tsx
│   │   ├── alphastrategist/page.tsx
│   │   └── fund-insight/page.tsx
│   │
│   ├── lib/tools/                    # 8 個工具的商業邏輯（純邏輯層）
│   │   ├── ai-stock-analyst/
│   │   │   ├── service.ts           # Gemini API 呼叫
│   │   │   └── types.ts            # TypeScript 型別定義
│   │   ├── gemini-stock-prophet/    # service.ts + types.ts
│   │   ├── trend-dashboard/         # service.ts + types.ts + mockData.ts
│   │   ├── fund-assistant/          # service.ts + types.ts
│   │   ├── fund-risk/               # service.ts + types.ts
│   │   ├── asset-analysis/          # service.ts + types.ts + constants.tsx
│   │   ├── alphastrategist/         # service.ts + types.ts
│   │   └── fund-insight/            # service.ts + types.ts
│   │
│   ├── components/                   # 共用元件
│   │   ├── SourcesSection.tsx       # Google Search 來源連結
│   │   ├── ErrorMessage.tsx         # 統一錯誤訊息
│   │   ├── Disclaimer.tsx           # 投資免責聲明
│   │   └── Navigation.tsx           # 側邊欄導覽
│   │
│   └── next.config.js               # 乾淨設定，無 alias、無 ignoreBuildErrors
│
├── backend/                          # FastAPI 後端（未變動）
└── docs/                             # 文件
```

### 引入方式

```js
// 更新後的 next.config.js
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false, net: false, tls: false }
    }
    return config
  },
  experimental: { esmExternals: true },
  // 注意：不再有 typescript.ignoreBuildErrors
}
```

### 工具頁面載入

各工具頁面直接是完整的 React 元件，不再需要動態引入外部模組：

```tsx
// 更新後: app/tools/ai-stock-analyst/page.tsx
'use client'

import { generateStockAnalysis } from '@/lib/tools/ai-stock-analyst/service'
import type { StockRecommendation } from '@/lib/tools/ai-stock-analyst/types'
import { SourcesSection } from '@/components/SourcesSection'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Disclaimer } from '@/components/Disclaimer'

export default function AIStockAnalystPage() {
  // 完整的工具 UI，使用統一的元件和風格
}
```

---

## 為何要遷移

### 1. 解決雙層 Layout 問題

| 問題 | 說明 |
|------|------|
| **現象** | 工具頁面在主系統 sidebar 內，同時顯示工具自己的 header 和 footer |
| **原因** | 引入的是工具完整的 App.tsx，包含獨立的 layout 和導覽 |
| **解法** | 只保留商業邏輯（service + types），UI 在主系統中原生重寫 |

### 2. 統一視覺風格

| 問題 | 說明 |
|------|------|
| **現象** | 8 個工具各自的配色、圓角、間距、字型風格不一致 |
| **原因** | 各工具是獨立專案開發，設計沒有統一規範 |
| **解法** | 統一使用淺色主題（白底 bg-white、灰邊框 border-gray-200、藍強調 blue-600） |

### 3. 移除 Build Hack

| 問題 | 說明 |
|------|------|
| **現象** | 必須設定 `ignoreBuildErrors: true` 才能 build |
| **原因** | 外部 Vite 專案的 TypeScript 設定與 Next.js 不相容 |
| **解法** | 所有程式碼在 frontend/ 內，共用相同 tsconfig，型別檢查完整通過 |

### 4. 簡化部署

| 問題 | 說明 |
|------|------|
| **現象** | Cloudflare Pages 無法存取 frontend/ 外的資料夾 |
| **原因** | Cloudflare build 只看 build output directory 和其來源目錄 |
| **解法** | 所有程式碼自包含在 frontend/，build 完全獨立 |

### 5. 消除重複依賴

| 問題 | 說明 |
|------|------|
| **現象** | @google/genai 在 9 個地方安裝（8 工具 + frontend） |
| **原因** | 每個工具有自己的 package.json |
| **解法** | 統一使用 frontend/node_modules 的依賴 |

### 6. 抽取共用元件

| 問題 | 說明 |
|------|------|
| **現象** | 8 個工具各自實作相同功能（來源連結、錯誤顯示、免責聲明） |
| **原因** | 獨立專案無法共享元件 |
| **解法** | 建立 SourcesSection、ErrorMessage、Disclaimer 共用元件 |

---

## 遷移內容

### 商業邏輯遷移

從各工具資料夾的 `services/` 和 `types.ts` 搬移至 `frontend/lib/tools/`：

| 原始檔案 | 遷移至 | 修改 |
|----------|--------|------|
| `ai-stock-analyst/services/geminiService.ts` | `lib/tools/ai-stock-analyst/service.ts` | 修正 import 路徑 |
| `ai-stock-analyst/types.ts` | `lib/tools/ai-stock-analyst/types.ts` | 無 |
| `gemini-stock-prophet/services/geminiService.ts` | `lib/tools/gemini-stock-prophet/service.ts` | 修正 import |
| `global-investment-trend-dashboard/services/geminiService.ts` | `lib/tools/trend-dashboard/service.ts` | 修正 import |
| `global-investment-trend-dashboard/data/mockData.ts` | `lib/tools/trend-dashboard/mockData.ts` | 無 |
| `anue-fund-genius/services/geminiService.ts` | `lib/tools/fund-assistant/service.ts` | 修正 import |
| `fundscope-ai/services/geminiService.ts` | `lib/tools/fund-risk/service.ts` | 修正 import |
| `wealthvision---yearly-asset-analysis/services/geminiService.ts` | `lib/tools/asset-analysis/service.ts` | 修正 import、response.text 空值處理 |
| `wealthvision---yearly-asset-analysis/constants.tsx` | `lib/tools/asset-analysis/constants.tsx` | 無 |
| `alphastrategist-ai/services/geminiService.ts` | `lib/tools/alphastrategist/service.ts` | 修正 import |
| `anue-fund-insight/services/geminiService.ts` | `lib/tools/fund-insight/service.ts` | 修正 import、Set 迭代修正 |

### UI 頁面重寫

每個工具的 UI 都從零重寫，保留原有功能但統一風格：

| 工具 | 頁面路徑 | 保留的核心功能 |
|------|----------|----------------|
| AI 潛力股分析師 | `app/tools/ai-stock-analyst/page.tsx` | 市場選擇、策略輸入、股票卡片（含 recharts 趨勢圖）、止盈止損 |
| Gemini Stock Prophet | `app/tools/gemini-stock-prophet/page.tsx` | 市場下拉、股票搜尋、Markdown 報告渲染、loading skeleton |
| Trend Dashboard | `app/tools/trend-dashboard/page.tsx` | 11 產業 CapEx 疊圖、Alpha Rank、趨勢對決分析、Z-Score、匯出報告、歷史紀錄 |
| 智能基金分析助手 | `app/tools/fund-assistant/page.tsx` | 基金搜尋、熱搜標籤、爆發潛力股按鈕、sentiment gauge、進出場策略、pros/cons |
| 基金風險分析 | `app/tools/fund-risk-analysis/page.tsx` | 快速基金標籤、3 階段 loading、PieChart 持股分布、持股卡片（含新聞情緒） |
| 財產分布分析 | `app/tools/asset-analysis/page.tsx` | 多語言、多幣種、投資人屬性、資產表單、風險配置對比、AI 建議 |
| AlphaStrategist AI | `app/tools/alphastrategist/page.tsx` | Chat UI、多輪對話、Markdown 渲染、grounding sources、每則免責聲明 |
| 鉅亨基金智庫 | `app/tools/fund-insight/page.tsx` | 多基金搜尋、單一深度分析、持股重疊交叉分析（Cross-Check） |

### 共用元件建立

| 元件 | 路徑 | 說明 |
|------|------|------|
| `SourcesSection` | `components/SourcesSection.tsx` | 顯示 Google Search Grounding 的來源連結網格 |
| `ErrorMessage` | `components/ErrorMessage.tsx` | 統一的紅色錯誤訊息卡片，含重試按鈕 |
| `Disclaimer` | `components/Disclaimer.tsx` | 投資免責聲明（琥珀色警告框） |

### next.config.js 修改

| 項目 | 更新前 | 更新後 |
|------|--------|--------|
| Webpack Alias | 8 個 `@/tools-*` 別名指向外部目錄 | 移除（不再需要） |
| `@google/genai` 強制解析 | 手動指向 frontend/node_modules | 移除（自動解析） |
| `resolve.modules` | 手動設定模組搜尋路徑 | 移除 |
| `extensionAlias` | `.js/.mjs` 擴展別名 | 移除 |
| `ignoreBuildErrors` | `true`（跳過型別檢查） | 移除（完整型別檢查） |

---

## 檔案對照表

### 已刪除（舊工具資料夾）

| 舊資料夾 | 內容 | 狀態 |
|----------|------|------|
| `ai-stock-analyst/` | App.tsx, components/, services/, types.ts, package.json, vite.config.ts | 可安全刪除 |
| `gemini-stock-prophet/` | 同上 | 可安全刪除 |
| `global-investment-trend-dashboard/` | 同上（含 data/mockData.ts） | 可安全刪除 |
| `anue-fund-genius/` | 同上 | 可安全刪除 |
| `fundscope-ai/` | 同上 | 可安全刪除 |
| `wealthvision---yearly-asset-analysis/` | 同上（含 constants.tsx） | 可安全刪除 |
| `alphastrategist-ai/` | 同上 | 可安全刪除 |
| `anue-fund-insight/` | 同上 | 可安全刪除 |
| `tsconfig.tools.json` | 工具共用 TypeScript 設定 | 可安全刪除 |

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `frontend/lib/tools/*/service.ts` | 8 個工具的 Gemini API 呼叫（從舊 services/ 遷移） |
| `frontend/lib/tools/*/types.ts` | 8 個工具的 TypeScript 型別定義 |
| `frontend/lib/tools/trend-dashboard/mockData.ts` | GICS 產業歷史 CapEx 資料 |
| `frontend/lib/tools/asset-analysis/constants.tsx` | 翻譯、風險映射、銀行列表等常數 |
| `frontend/components/SourcesSection.tsx` | 共用：來源連結 |
| `frontend/components/ErrorMessage.tsx` | 共用：錯誤訊息 |
| `frontend/components/Disclaimer.tsx` | 共用：免責聲明 |
| `docs/TOOLS_SPEC.md` | 8 大工具功能規格書 |
| `docs/ARCHITECTURE_MIGRATION.md` | 本文件 |

### 修改檔案

| 檔案 | 修改內容 |
|------|----------|
| `frontend/next.config.js` | 移除 webpack alias、ignoreBuildErrors |
| `frontend/app/tools/ai-stock-analyst/page.tsx` | 從動態引入改為原生頁面 |
| `frontend/app/tools/gemini-stock-prophet/page.tsx` | 同上 |
| `frontend/app/tools/trend-dashboard/page.tsx` | 同上 |
| `frontend/app/tools/fund-assistant/page.tsx` | 同上 |
| `frontend/app/tools/fund-risk-analysis/page.tsx` | 同上 |
| `frontend/app/tools/asset-analysis/page.tsx` | 同上 |
| `frontend/app/tools/alphastrategist/page.tsx` | 同上 |
| `frontend/app/tools/fund-insight/page.tsx` | 同上 |
| `frontend/components/HomeDashboard.tsx` | 修正 Link import 語法 |
| `README.md` | 更新專案結構說明 |

---

## 技術決策說明

### Q: 為什麼不直接修改原有工具的風格？

如果只改 CSS 而保留外部引入架構，以下問題仍然存在：
- Webpack Alias 在 Cloudflare Pages build 時不可靠
- 必須保留 `ignoreBuildErrors`
- 無法共享 Next.js 原生元件（如 `next/link`、`next/router`）
- 各工具的 App.tsx 仍會產生雙層 Layout

### Q: 為什麼把商業邏輯放在 lib/tools/ 而不是 app/tools/？

遵循 Next.js App Router 的慣例：
- `app/` 僅放路由相關的頁面元件
- `lib/` 放純邏輯（API 呼叫、型別、工具函式）
- 這樣做的好處是商業邏輯可以被多個頁面或元件引用

### Q: 為什麼建立 SourcesSection、ErrorMessage、Disclaimer 共用元件？

原本 8 個工具各自實作了幾乎相同的功能：
- 顯示 Google Search 的來源連結
- 顯示錯誤訊息（紅色卡片 + 重試按鈕）
- 顯示投資免責聲明

抽取為共用元件後，修改一處即可全部生效，也確保視覺一致。

### Q: Gemini API Key 的管理方式有改變嗎？

沒有改變。所有工具仍使用相同的 `getApiKey()` 邏輯：

```typescript
const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem('gemini_api_key');
    if (userKey) return userKey;
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || '';
};
```

優先讀取使用者在設定頁面輸入的 Key，回退到環境變數。

---

## 啟動方式

### 開發模式（僅前端，最常用）

```bash
cd frontend
npm install    # 首次或依賴有更新時
npm run dev    # 啟動開發伺服器
```

開啟 http://localhost:3000，前往 `/settings` 輸入 Gemini API Key 即可使用。

### 開發模式（前端 + 後端）

```bash
# 終端機 1：前端
cd frontend
npm run dev

# 終端機 2：後端
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env        # 並填入資料庫連線資訊
uvicorn main:app --reload --port 8000
```

### 建置

```bash
cd frontend
npm run build    # 輸出至 .next/ 或 out/（若有 output: 'export'）
```

### 部署至 Cloudflare

詳見 [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md)。
