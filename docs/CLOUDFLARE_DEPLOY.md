# Cloudflare 部署教學

本文件說明如何將 Sagafisc 部署至 Cloudflare Pages（前端）以及搭配後端服務的完整方案。

---

## 目錄

1. [架構概覽](#架構概覽)
2. [前端部署：Cloudflare Pages](#前端部署cloudflare-pages)
3. [後端部署方案](#後端部署方案)
4. [資料庫方案](#資料庫方案)
5. [自訂網域](#自訂網域)
6. [CI/CD 自動部署](#cicd-自動部署)
7. [環境變數設定](#環境變數設定)

---

## 架構概覽

```
使用者瀏覽器
    │
    │ Gemini API（直接從瀏覽器呼叫）
    │
    ▼
┌─────────────────────────────┐
│     Cloudflare Pages        │  ← 前端 (Next.js Static Export)
│     your-app.pages.dev      │
└─────────────┬───────────────┘
              │ REST API（可選）
              ▼
┌─────────────────────────────┐
│     Backend API             │  ← 後端 (Railway / Fly.io / Render)
│     api.your-domain.com     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│     PostgreSQL              │  ← 資料庫 (Supabase / Neon)
│     Supabase / Neon         │
└─────────────────────────────┘
```

**重要說明：**
- Gemini API 呼叫從**瀏覽器端**直接發送（使用者提供的 API Key），不經過後端伺服器
- 所有 8 個 AI 工具的商業邏輯（`frontend/lib/tools/`）都在前端執行
- 後端**僅用於**使用者帳號、Watchlist 和分析紀錄（可選功能）
- **不需要後端也能使用所有 AI 分析功能**

---

## 前端部署：Cloudflare Pages

### 前端結構（已優化）

所有工具的程式碼已整合進 `frontend/` 目錄內，無需外部依賴：

```
frontend/
├── app/tools/         ← 8 個工具的 UI 頁面
├── lib/tools/         ← 8 個工具的商業邏輯（Gemini API 呼叫）
├── components/        ← 共用元件
└── next.config.js     ← 乾淨的設定檔，無 webpack alias
```

### Step 1：修改 next.config.js

在 `frontend/next.config.js` 中加入 `output: 'export'`：

```js
const nextConfig = {
  output: 'export',        // ← 加入此行
  reactStrictMode: true,
  images: {
    unoptimized: true,     // ← Cloudflare Pages 不支援 Next.js Image Optimization
  },
  // ...其他設定保持不變
}
```

### Step 2：方式 A — 透過 Git 自動部署（推薦）

1. 將專案推送至 GitHub / GitLab

2. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)

3. 前往 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**

4. 選擇你的 Repository

5. 設定建置指令：

| 設定項 | 值 |
|--------|-----|
| Framework preset | Next.js (Static HTML Export) |
| Build command | `cd frontend && npm install && npm run build` |
| Build output directory | `frontend/out` |
| Root directory | `/` (留空) |

6. 設定環境變數（在 Settings → Environment Variables）：

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.your-domain.com/api/v1`（可選，僅後端功能需要） |
| `NEXT_PUBLIC_GEMINI_API_KEY` | （留空，由使用者自行在設定頁面輸入） |
| `NODE_VERSION` | `18` |

7. 點擊 **Save and Deploy**

### Step 2：方式 B — 手動部署（Wrangler CLI）

```bash
# 安裝 Wrangler
npm install -g wrangler

# 登入 Cloudflare
wrangler login

# 建置前端
cd frontend
npm run build

# 部署
wrangler pages deploy out --project-name sagafisc
```

### 驗證部署

部署完成後，Cloudflare 會提供一個 URL：
- `https://sagafisc.pages.dev`（預設）
- 或你設定的自訂網域

開啟網站，前往 `/settings` 輸入 Gemini API Key，然後測試各工具。

---

## 後端部署方案

後端為**可選功能**。僅在需要使用者帳號、Watchlist、歷史分析紀錄時才需要部署。

### 方案 A：Railway（推薦，最簡單）

1. 前往 [railway.app](https://railway.app) → 用 GitHub 登入

2. **New Project** → **Deploy from GitHub repo**

3. 選擇此 Repository

4. Railway 會自動偵測 Python 專案，設定：

| 設定項 | 值 |
|--------|-----|
| Root Directory | `backend` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

5. 新增 **PostgreSQL** 服務：
   - 在同一專案中 Add Service → Database → PostgreSQL
   - Railway 會自動設定 `DATABASE_URL`

6. 設定環境變數（Variables 頁面）：

```
JWT_SECRET=your-production-secret-key-at-least-32-chars
CORS_ORIGINS=https://sagafisc.pages.dev,https://your-domain.com
ENVIRONMENT=production
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SERVICE_KEY=placeholder
SUPABASE_ANON_KEY=placeholder
```

7. Railway 會自動部署並提供 URL，例如：`https://sagafisc-backend-production.up.railway.app`

8. 回到 Cloudflare Pages 的環境變數，更新：
```
NEXT_PUBLIC_API_BASE_URL=https://sagafisc-backend-production.up.railway.app/api/v1
```

### 方案 B：Fly.io

```bash
# 安裝 flyctl
curl -L https://fly.io/install.sh | sh

# 登入
fly auth login

# 在 backend 目錄建立 fly.toml
cd backend
fly launch --name sagafisc-api

# 設定環境變數
fly secrets set JWT_SECRET="your-secret" \
  DATABASE_URL="postgresql://..." \
  CORS_ORIGINS="https://sagafisc.pages.dev"

# 部署
fly deploy
```

### 方案 C：Render

1. 前往 [render.com](https://render.com)
2. New → Web Service → 連結 GitHub
3. 設定 Root Directory 為 `backend`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. 新增 PostgreSQL Database
6. 設定環境變數

---

## 資料庫方案

### Supabase（推薦搭配 Railway 後端）

- 免費方案：500 MB 儲存
- 提供 Dashboard 管理介面
- 詳見 [DATABASE_GUIDE.md](DATABASE_GUIDE.md)

### Neon（推薦搭配 Cloudflare Workers）

- Serverless PostgreSQL
- 支援 HTTP 連線
- 免費方案：0.5 GB 儲存
- 冷啟動快速

### Railway PostgreSQL

- 與後端同一平台，最簡單
- 每月 $5 免費額度共用
- 無需額外設定連線

---

## 自訂網域

### Cloudflare Pages 自訂網域

1. 在 Cloudflare Dashboard → Pages → 你的專案 → Custom domains
2. 點擊 **Set up a custom domain**
3. 輸入你的網域，例如 `sagafisc.your-domain.com`
4. Cloudflare 會自動設定 DNS（如果網域在 Cloudflare 管理）

### 後端自訂網域

若後端在 Railway：
1. Railway Dashboard → 你的 Service → Settings → Domains
2. 新增 Custom Domain，例如 `api.your-domain.com`
3. 在 DNS 中新增 CNAME 記錄指向 Railway 提供的位址

---

## CI/CD 自動部署

### GitHub Actions（選用）

建立 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install & Build
        working-directory: frontend
        run: |
          npm ci
          npm run build
        env:
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.API_BASE_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy frontend/out --project-name sagafisc
```

需要在 GitHub Secrets 中設定：
- `CLOUDFLARE_API_TOKEN` — Cloudflare API Token（Pages 權限）
- `API_BASE_URL` — 後端 API 位址（可選）

---

## 環境變數設定

### 完整環境變數清單

#### Cloudflare Pages（前端）

| Variable | 說明 | 範例 |
|----------|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 後端 API 位址（可選） | `https://api.sagafisc.com/api/v1` |
| `NEXT_PUBLIC_GEMINI_API_KEY` | 預設 API Key（可選） | （留空） |
| `NODE_VERSION` | Node.js 版本 | `18` |

#### Railway / Fly.io / Render（後端，可選）

| Variable | 說明 | 範例 |
|----------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT 密鑰 | 至少 32 字元隨機字串 |
| `CORS_ORIGINS` | 允許的前端來源 | `https://sagafisc.pages.dev` |
| `ENVIRONMENT` | 環境標識 | `production` |
| `SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase Key | `eyJ...` |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJ...` |

---

## 部署檢查清單

- [ ] 前端 `next.config.js` 已加入 `output: 'export'`
- [ ] `npm run build` 在 `frontend/` 中成功通過
- [ ] 前端可在 `/settings` 正常輸入 API Key
- [ ] 所有 AI 工具的 Web Search 功能正常運作
- [ ] HTTPS 已啟用（Cloudflare 自動處理）
- [ ] （可選）前端 `.env` 中的 `NEXT_PUBLIC_API_BASE_URL` 指向正式後端
- [ ] （可選）後端 `CORS_ORIGINS` 包含前端正式網域
- [ ] （可選）後端 `JWT_SECRET` 使用強隨機密鑰
- [ ] （可選）資料庫已建立所有資料表
- [ ] （可選）自訂網域 DNS 已設定
