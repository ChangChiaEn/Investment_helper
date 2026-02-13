# 工具本地化整合指南

## 已完成
- ✅ AI 潛力股分析師 (`ai-stock-analyst`)

## 待整合工具

1. **Global Investment Trend Dashboard** (`trend-dashboard`)
2. **Gemini Stock Prophet** (`gemini-stock-prophet`)
3. **智能基金分析助手** (`fund-assistant`)
4. **即時基金風險分析** (`fund-risk-analysis`)
5. **財產分布分析** (`asset-analysis`)
6. **AlphaStrategist AI** (`alphastrategist`)
7. **鉅亨基金智庫** (`fund-insight`)

## 整合步驟

### 1. 建立工具目錄結構

```bash
# 在 frontend/tools 下建立工具目錄
New-Item -ItemType Directory -Force -Path tools/[tool-name]/components, tools/[tool-name]/services, tools/[tool-name]/types
```

### 2. 複製檔案

從原始工具目錄複製以下檔案到 `frontend/tools/[tool-name]/`：

- `types.ts` → `frontend/tools/[tool-name]/types.ts`
- `services/geminiService.ts` → `frontend/tools/[tool-name]/services/geminiService.ts`
- `components/*.tsx` → `frontend/tools/[tool-name]/components/`
- `App.tsx` → `frontend/app/tools/[tool-name]/page.tsx`

### 3. 修改檔案

#### 3.1 更新 import 路徑
- 將相對路徑改為絕對路徑（使用 `@/tools/[tool-name]/...`）
- 確保所有組件標記為 `'use client'`

#### 3.2 更新環境變數
- 將 `process.env.API_KEY` 改為 `process.env.NEXT_PUBLIC_GEMINI_API_KEY`

#### 3.3 建立頁面組件
- 將 `App.tsx` 轉換為 Next.js 頁面組件
- 確保使用 `'use client'` 指令

### 4. 更新配置

在 `frontend/config/tools.ts` 中：
- 移除 `url` 屬性（如果有的話）
- 設定 `localPath: '[tool-name]'`

### 5. 更新路由

在 `frontend/app/tools/[toolId]/page.tsx` 中加入新的工具路由：

```typescript
if (toolConfig.localPath && toolId === '[tool-name]') {
  const ToolComponent = dynamic(() => import('@/app/tools/[tool-name]/page'), {
    ssr: false,
  })
  return (
    <div className="h-full">
      <ToolComponent />
    </div>
  )
}
```

### 6. 安裝依賴

檢查工具需要的額外依賴，並加入 `frontend/package.json`：

```bash
npm install [需要的套件]
```

常見依賴：
- `@google/genai` - Gemini API（已安裝）
- `recharts` - 圖表（已安裝）
- `lucide-react` - 圖標（已安裝）

### 7. 測試

1. 啟動開發伺服器：`npm run dev`
2. 訪問 `http://localhost:3000/tools/[tool-name]`
3. 檢查功能是否正常運作

## 範例：AI 潛力股分析師

已完成整合，可作為參考範例：
- `frontend/tools/ai-stock-analyst/` - 工具檔案
- `frontend/app/tools/ai-stock-analyst/page.tsx` - 頁面組件

## 注意事項

1. **環境變數**：確保 `.env.local` 中有 `NEXT_PUBLIC_GEMINI_API_KEY`
2. **Client Components**：所有使用 hooks 或瀏覽器 API 的組件必須標記 `'use client'`
3. **動態載入**：使用 `dynamic` 載入工具組件以優化效能
4. **樣式**：確保 Tailwind CSS 類別正確應用

## 快速整合腳本

可以建立一個腳本自動化部分流程，但建議手動檢查每個工具的特定需求。

