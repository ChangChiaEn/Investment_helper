<p align="center">
  <img src="frontend/app/Sagafisc.png" width="80" alt="Sagafisc Logo" />
</p>

<h1 align="center">Sagafisc 智慧投研平台</h1>

<p align="center">
  整合 8 個 AI 分析工具的一站式投資理財平台<br/>
  涵蓋投資四階段：<strong>市場掃描 → 目標篩選 → 深度診斷 → 資產管理</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-Next.js_14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/AI-Gemini_API-4285F4?logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Deploy-Cloudflare-F38020?logo=cloudflare" alt="Cloudflare" />
</p>

---

## 功能總覽

| 階段 | 工具 | 說明 |
|------|------|------|
| **市場掃描** | Trend Dashboard | 11 大 GICS 產業即時趨勢分析，含 AI 風險評估 |
| **目標篩選（股票）** | AI 潛力股分析師 | 輸入投資主題，AI 推薦潛力股並附目標價與止損點 |
| **目標篩選（基金）** | 智能基金分析助手 | 搜尋基金並給出進出場策略與情緒評分 |
| **深度診斷（股票）** | Gemini Stock Prophet | 個股走勢預測，涵蓋基本面、技術面、籌碼面 |
| **深度診斷（基金）** | 即時基金風險分析 | 分析基金持股結構與新聞風險 |
| **資產管理** | 財產分布分析 | 個人資產健診與再平衡建議 |
| **進階：綜合顧問** | AlphaStrategist AI | 多輪對話式投資顧問，20 年策略師角色 |
| **進階：交叉分析** | 鉅亨基金智庫 | 分析多支基金的成分股重疊，找出共同看好標的 |

**核心特色：**
- 所有 AI 工具都使用 **Google Search Grounding**，取得即時市場數據
- **跨工具資料傳遞** — 在趨勢分析中看到看好的標的，一鍵帶入深度分析
- **前端輸入 API Key** — 使用者在設定頁面輸入自己的 Gemini API Key，無需部署時硬編碼
- **Watchlist 標記系統** — 跨工具共享關注標的（需連接資料庫）

---

## 技術架構

```
前端：   Next.js 14 | React 18 | TypeScript | Tailwind CSS | Zustand
後端：   FastAPI | SQLAlchemy | PostgreSQL | JWT 認證
AI：     Google Gemini API（@google/genai）+ Google Search Grounding
部署：   Cloudflare Pages（前端）+ Railway / Fly.io（後端）
```

---

## 快速開始

### 環境需求

- Node.js 18+
- Python 3.11+
- 一組 [Gemini API Key](https://aistudio.google.com/apikey)

### 1. 安裝

```bash
git clone <repo-url>
cd Investment_helper

# 前端
cd frontend
npm install
cp .env.example .env.local
cd ..

# 後端（可選，不連資料庫也能使用前端所有 AI 功能）
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cd ..
```

### 2. 啟動前端

```bash
cd frontend
npm run dev
# 開啟 http://localhost:3000
```

啟動後，前往 **設定頁面**（`/settings`）輸入你的 Gemini API Key 即可使用所有 AI 分析功能。

### 3. 啟動後端（可選）

只有在需要使用 Watchlist、使用者登入、歷史分析紀錄等功能時，才需要啟動後端。

```bash
cd backend
# 確保已設定 .env 中的 DATABASE_URL
uvicorn main:app --reload --port 8000
```

---

## 專案結構

```
Investment_helper/
├── frontend/                              # Next.js 14 前端主程式
│   ├── app/                               # App Router 頁面
│   │   ├── page.tsx                       # 首頁 Dashboard
│   │   ├── settings/page.tsx              # 設定（API Key + 首頁選擇）
│   │   └── tools/                         # 8 大 AI 工具頁面
│   │       ├── [toolId]/page.tsx          # 動態路由（fallback）
│   │       ├── ai-stock-analyst/          # AI 潛力股分析師
│   │       ├── gemini-stock-prophet/      # 股票走勢預測
│   │       ├── trend-dashboard/           # 產業趨勢儀表板
│   │       ├── fund-assistant/            # 智能基金分析助手
│   │       ├── fund-risk-analysis/        # 基金風險分析
│   │       ├── asset-analysis/            # 財產分布分析
│   │       ├── alphastrategist/           # 綜合投資顧問
│   │       └── fund-insight/              # 基金持股交叉分析
│   ├── lib/tools/                         # 工具商業邏輯層
│   │   ├── ai-stock-analyst/             #   service.ts + types.ts
│   │   ├── gemini-stock-prophet/
│   │   ├── trend-dashboard/              #   + mockData.ts
│   │   ├── fund-assistant/
│   │   ├── fund-risk/
│   │   ├── asset-analysis/               #   + constants.tsx
│   │   ├── alphastrategist/
│   │   └── fund-insight/
│   ├── components/                        # 共用元件
│   │   ├── Navigation.tsx                # 側邊欄導覽
│   │   ├── SourcesSection.tsx            # Google Search 來源連結
│   │   ├── ErrorMessage.tsx              # 錯誤訊息顯示
│   │   ├── Disclaimer.tsx                # 投資免責聲明
│   │   └── ...
│   ├── config/tools.ts                    # 工具配置
│   └── contexts/ToolDataContext.tsx        # 跨工具資料共享
│
├── backend/                               # FastAPI 後端 API
│   ├── main.py                            # 入口
│   ├── app/
│   │   ├── config.py                      # 環境變數設定
│   │   ├── database.py                    # SQLAlchemy 設定
│   │   ├── models.py                      # 資料庫模型
│   │   ├── schemas.py                     # 請求/回應格式
│   │   ├── dependencies.py                # JWT 驗證
│   │   └── routers/                       # API 路由
│   │       ├── auth.py                    # 認證 API
│   │       ├── watchlist.py               # 關注清單 API
│   │       └── analysis.py                # 分析紀錄 API
│   └── requirements.txt
│
├── docs/                                  # 文件
│   ├── TOOLS_SPEC.md                      # 8 大工具功能規格書
│   ├── ARCHITECTURE_MIGRATION.md          # 架構遷移技術文檔
│   ├── DATABASE_GUIDE.md                  # 資料庫接入指南
│   └── CLOUDFLARE_DEPLOY.md               # Cloudflare 部署教學
└── README.md                              # 專案說明
```

---

## API 端點

後端提供 RESTful API，所有路由前綴為 `/api/v1`：

### 認證

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 使用者註冊 |
| POST | `/api/v1/auth/login` | 使用者登入 |
| POST | `/api/v1/auth/refresh` | 刷新 Token |
| GET | `/api/v1/auth/me` | 取得當前使用者 |
| POST | `/api/v1/auth/logout` | 登出 |

### 關注清單

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/v1/watchlist` | 取得關注清單（支援 `?type=stock\|fund` 篩選） |
| POST | `/api/v1/watchlist` | 新增關注標的 |
| DELETE | `/api/v1/watchlist/{id}` | 刪除關注標的 |
| GET | `/api/v1/watchlist/{id}/latest` | 取得最新價格資料 |

### 分析紀錄

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/v1/analysis` | 取得分析紀錄（支援 `?watchlist_id=` 篩選） |
| POST | `/api/v1/analysis` | 儲存分析結果 |

### 健康檢查

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/` | API 資訊 |
| GET | `/health` | 健康檢查 |

互動式文件：啟動後端後訪問 `http://localhost:8000/docs`（Swagger UI）

---

## 資料庫指南

詳細的資料庫接入指南請參考 [docs/DATABASE_GUIDE.md](docs/DATABASE_GUIDE.md)。

**支援的資料庫方案：**

| 方案 | 適合場景 | 特點 |
|------|---------|------|
| **Supabase**（推薦） | 快速上線 | 免費 PostgreSQL + Auth + Realtime |
| **Neon** | Serverless | 無伺服器 PostgreSQL，Cloudflare 友善 |
| **Railway** | 全託管 | 一鍵部署，自帶 PostgreSQL |
| **Self-hosted** | 完全控制 | Docker Compose 部署 |

---

## 部署指南

詳細的 Cloudflare 部署教學請參考 [docs/CLOUDFLARE_DEPLOY.md](docs/CLOUDFLARE_DEPLOY.md)。

**架構概覽：**

```
                    ┌─────────────────┐
                    │  Cloudflare CDN │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼                             ▼
    ┌──────────────────┐          ┌──────────────────┐
    │ Cloudflare Pages │          │   後端 API       │
    │ (Next.js 靜態)   │ ──API──▶ │ (Railway/Fly.io) │
    └──────────────────┘          └────────┬─────────┘
                                           │
                                  ┌────────▼─────────┐
                                  │   PostgreSQL     │
                                  │ (Supabase/Neon)  │
                                  └──────────────────┘
```

---

## 環境變數

### 前端（`frontend/.env.local`）

| 變數名稱 | 必填 | 說明 |
|----------|------|------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | 否 | 預設 Gemini API Key（使用者也可在設定頁面輸入） |
| `NEXT_PUBLIC_API_BASE_URL` | 否 | 後端 API 位址，預設 `http://localhost:8000/api/v1` |

### 後端（`backend/.env`）

| 變數名稱 | 必填 | 說明 |
|----------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 連線字串 |
| `SUPABASE_URL` | 是 | Supabase 專案 URL |
| `SUPABASE_SERVICE_KEY` | 是 | Supabase Service Role Key |
| `SUPABASE_ANON_KEY` | 是 | Supabase Anon Key |
| `JWT_SECRET` | 是 | JWT 簽章密鑰（至少 32 字元） |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | 否 | Access Token 有效期，預設 15 分鐘 |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | 否 | Refresh Token 有效期，預設 7 天 |
| `CORS_ORIGINS` | 否 | CORS 允許來源，預設 `http://localhost:3000` |
| `ENVIRONMENT` | 否 | 執行環境，預設 `development` |

---

## 使用者流程

```
找趨勢：Trend Dashboard → 點擊產業 → AI 潛力股/智能基金 → 標記 → 深度分析
找目標：AI 潛力股/智能基金 → 瀏覽結果 → 標記 → Gemini Stock Prophet / 基金風險分析
理財庫：財產分布分析 → AI 建議 → 跳轉至其他工具調整配置
```

---

## 開發

```bash
# 開發模式（前端 + 後端同時運行）
# 終端機 1
cd frontend && npm run dev

# 終端機 2
cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000

# 僅前端開發（不需要資料庫）
cd frontend && npm run dev

# 建置
cd frontend && npm run build
```

---

## 授權

MIT
