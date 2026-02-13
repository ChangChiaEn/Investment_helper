# FinBuddy Frontend

Next.js 14 + React 18 + TypeScript 前端應用

## 環境設定

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.local.example` 為 `.env.local` 並填入實際值：

```bash
cp .env.local.example .env.local
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

應用將在 http://localhost:3000 可用

## 專案結構

```
frontend/
├── app/              # Next.js App Router
│   ├── layout.tsx   # 根佈局（包含 Navigation）
│   ├── page.tsx     # 首頁（可自訂 homepage）
│   ├── tools/       # 工具頁面
│   └── settings/    # 設定頁面
├── components/       # React 元件
│   ├── Navigation.tsx      # 側邊欄導覽
│   ├── ToolEmbed.tsx      # 工具嵌入元件
│   ├── HomeDashboard.tsx  # 首頁儀表板
│   └── ToolSelector.tsx   # 工具選擇器
├── config/          # 設定檔
│   └── tools.ts     # 工具配置
└── contexts/        # React Context
    └── ToolDataContext.tsx # 跨工具資料傳遞
```

## 功能說明

### 導覽列功能

1. **Trend Dashboard** - 全產業大勢分析
2. **AI 潛力股分析師** - 股票目標篩選
3. **Gemini Stock Prophet** - 股票深度診斷
4. **智能基金分析助手** - 基金目標篩選
5. **即時基金風險分析** - 基金深度診斷
6. **財產分布分析** - 個人資產管理

### 可自訂首頁

使用者可以在設定頁面選擇想要設為首頁的工具，登入後將自動導向該工具。

### 跨工具資料傳遞

透過 `ToolDataContext` 和 URL query parameters 實現工具間的資料傳遞，例如從「AI 潛力股分析師」標記標的後，可以直接帶入「Gemini Stock Prophet」進行深度分析。

