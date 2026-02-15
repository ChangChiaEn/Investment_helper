# UX 更新紀錄：狀態暫存 + 關注清單 + 跨工具自動填入

> 日期：2026-02-15

---

## 更新摘要

此次更新實作了三大功能，解決使用者在工具間切換時資料丟失、無法標記感興趣標的、以及無法快速將結果帶到下一個工具做分析的問題。

---

## 一、前後差異對比

### 1. 工具狀態暫存 (Tool State Cache)

| | 更新前 | 更新後 |
|---|---|---|
| 切換工具 | 結果和表單全部丟失，需重新查詢 | 自動保留，切回來就能看到上次結果 |
| 暫存範圍 | 無 | 同一個 session（瀏覽器分頁）內有效 |
| 持久化 | 無 | 記憶體暫存（refresh 會清除，這是預期行為） |

**涵蓋的工具：**
- AI 潛力股分析師 → 暫存 market、strategy、推薦結果
- 智能基金分析助手 → 暫存 query、分析結果、sources
- 基金透視鏡 → 暫存 query、基金列表、單一報告、交叉分析報告
- Gemini Stock Prophet → 暫存 market、symbol、分析報告
- 即時基金風險分析 → 暫存 query、分析結果
- Trend Dashboard → 暫存 viewMode、selectedSector、searchQuery、分析報告、摘要

### 2. 關注清單 (Watchlist)

| | 更新前 | 更新後 |
|---|---|---|
| WatchlistButton | 呼叫不存在的 `/api/v1/watchlist` API | 使用 Context + localStorage |
| 持久化 | 無法運作 | localStorage，重新整理也不會丟 |
| Sidebar 顯示 | 無 | Navigation 底部有可收合的關注清單區塊 |
| 操作 | 無 | hover 顯示「送去分析」和「移除」按鈕 |

**WatchlistItem 資料結構：**
```ts
interface WatchlistItem {
  id: string          // `${type}-${symbol}` 作為唯一 key
  symbol: string      // 標的代號/名稱
  name: string        // 顯示名稱
  type: 'stock' | 'fund'
  source?: string     // 來源工具 ID
  addedAt: number     // 加入時間戳
}
```

**localStorage key：** `sagafisc_watchlist`

### 3. 跨工具自動填入

| | 更新前 | 更新後 |
|---|---|---|
| 結果卡片上的操作 | 無 | 書籤按鈕 + 「深度分析」按鈕 |
| 跨工具資料傳遞 | ToolDataContext 存在但未被結果頁使用 | 點擊「深度分析」→ URL params 帶入目標工具 |
| 目標工具接收 | 不會自動填入 | 自動讀取 URL params、填入表單、觸發分析 |

**自動路由對應：**
- 股票標的 → Gemini Stock Prophet（自動帶入 ticker 並分析）
- 基金標的 → 即時基金風險分析（自動帶入基金名稱並分析）

---

## 二、新增/修改的檔案清單

### 新增
| 檔案 | 說明 |
|---|---|
| `frontend/contexts/WatchlistContext.tsx` | 關注清單全域 Context + Storage Adapter 抽象層 |
| `frontend/contexts/ToolCacheContext.tsx` | 工具狀態暫存全域 Context（Map-based） |
| `frontend/hooks/useToolCache.ts` | 各工具頁面使用的 cache hook |

### 修改
| 檔案 | 變更內容 |
|---|---|
| `frontend/app/layout.tsx` | 加入 `WatchlistProvider` + `ToolCacheProvider` |
| `frontend/components/Navigation.tsx` | 新增 `WatchlistPanel` 可收合區塊 |
| `frontend/components/WatchlistButton.tsx` | 完全重寫：改用 Context、Router 導航取代 API 呼叫 |
| `frontend/app/tools/ai-stock-analyst/page.tsx` | StockCard 加入 WatchlistButton + cache 整合 |
| `frontend/app/tools/fund-assistant/page.tsx` | FundCard 加入 WatchlistButton + cache 整合 |
| `frontend/app/tools/fund-insight/page.tsx` | 基金卡片加入 WatchlistButton + cache 整合 |
| `frontend/app/tools/gemini-stock-prophet/page.tsx` | 接收 URL params 自動分析 + cache 整合 |
| `frontend/app/tools/fund-risk-analysis/page.tsx` | 接收 URL params 自動分析 + cache 整合 |
| `frontend/app/tools/trend-dashboard/page.tsx` | cache 整合（不重複載入 summary） |

---

## 三、架構設計

### Context 層級

```
ToolDataProvider          (跨工具導航用的一次性資料)
  └─ WatchlistProvider    (關注清單，可替換 storage adapter)
       └─ ToolCacheProvider   (記憶體暫存)
            └─ App UI
```

### Tool Cache 機制

```
useToolCache('tool-id') → { cached, save }

- cached: 頁面 mount 時讀取的快照（只讀一次）
- save(state): 將當前 state 存入 Map
- 生命週期: session 內有效，不會寫入 localStorage
```

### Watchlist Storage Adapter

```
WatchlistStorage interface:
  load(): Promise<WatchlistItem[]>
  save(items: WatchlistItem[]): Promise<void>

目前預設: localStorageAdapter
未來替換: 傳入 apiStorageAdapter 即可
```

---

## 四、未來接後端資料庫的方式

### Step 1: 實作 API Storage Adapter

在 `frontend/contexts/WatchlistContext.tsx` 中已預留了 `WatchlistStorage` interface 和範例程式碼。只需：

```ts
// frontend/lib/watchlistApi.ts
import { WatchlistStorage, WatchlistItem } from '@/contexts/WatchlistContext'

export const apiStorageAdapter: WatchlistStorage = {
  load: async () => {
    const res = await fetch('/api/v1/watchlist', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error('Failed to load watchlist')
    return res.json()
  },
  save: async (items: WatchlistItem[]) => {
    await fetch('/api/v1/watchlist', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(items),
    })
  },
}
```

### Step 2: 在 layout.tsx 替換 adapter

```tsx
// 前端有登入機制後
import { apiStorageAdapter } from '@/lib/watchlistApi'

<WatchlistProvider storage={apiStorageAdapter}>
```

### Step 3: 後端 API 端點

需要實作的端點：

| Method | Path | 說明 |
|---|---|---|
| `GET` | `/api/v1/watchlist` | 取得使用者的關注清單 |
| `PUT` | `/api/v1/watchlist` | 整批更新關注清單 |

或者更細粒度：

| Method | Path | 說明 |
|---|---|---|
| `GET` | `/api/v1/watchlist` | 取得清單 |
| `POST` | `/api/v1/watchlist` | 新增項目 |
| `DELETE` | `/api/v1/watchlist/:id` | 移除項目 |

如果使用細粒度 API，需將 `WatchlistStorage` interface 擴展為支援單一操作（`addItem`, `removeItem`），而非整批 save。

### Step 4: Tool Cache 也可以接後端（可選）

目前 Tool Cache 是純記憶體。如果需要跨裝置同步，可以：
1. 將 `ToolCacheContext` 改為寫入 API
2. 或者在 `useToolCache` 中加入 `sessionStorage` fallback

但建議保持記憶體暫存即可，因為分析結果具有時效性。

### 資料庫 Schema 建議

```sql
-- watchlist table
CREATE TABLE watchlist (
  id          VARCHAR(100) PRIMARY KEY,  -- e.g., "stock-AAPL"
  user_id     VARCHAR(50) NOT NULL,
  symbol      VARCHAR(100) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  type        ENUM('stock', 'fund') NOT NULL,
  source      VARCHAR(50),               -- 來源工具 ID
  added_at    BIGINT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, type, symbol)
);
```

---

## 五、對應 plan.md 的 User Flow 實現狀況

| plan.md 需求 | 實現狀態 |
|---|---|
| 「可標記此標的物」 | ✅ WatchlistButton 在 StockCard / FundCard 上 |
| 「點選進階分析後直接帶入」 | ✅ 一鍵導航 + 自動觸發分析 |
| 「資料在各工具間共享」 | ✅ Watchlist sidebar + URL params 傳遞 |
| 「資料自動帶入」 | ✅ 目標工具自動讀取 params 並分析 |
| 「同一介面切換不同的 AI 助手」 | ✅ Tool Cache 讓切換不丟狀態 |
