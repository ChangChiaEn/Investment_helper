# 資料庫開發指南

FinBuddy 後端使用 **PostgreSQL** 搭配 **SQLAlchemy ORM**。本文件說明如何接入資料庫、建立資料表、以及不同雲端方案的設定方式。

---

## 目錄

1. [資料庫架構](#資料庫架構)
2. [方案一：Supabase（推薦）](#方案一supabase推薦)
3. [方案二：Neon（Serverless）](#方案二neonserverless)
4. [方案三：Railway](#方案三railway)
5. [方案四：Self-hosted Docker](#方案四self-hosted-docker)
6. [建立資料表](#建立資料表)
7. [前端 API 串接](#前端-api-串接)
8. [常見問題](#常見問題)

---

## 資料庫架構

### 關聯圖

```
┌────────────┐       ┌──────────────┐       ┌──────────────────┐
│   users    │       │  watchlist   │       │ analysis_results │
├────────────┤       ├──────────────┤       ├──────────────────┤
│ id (PK)    │◄──┐   │ id (PK)      │◄──┐   │ id (PK)          │
│ email      │   │   │ user_id (FK) │   │   │ user_id (FK)     │
│ name       │   └───│ type         │   └───│ watchlist_id (FK)│
│ password   │       │ symbol       │       │ tool             │
│ created_at │       │ name         │       │ result (JSON)    │
│ updated_at │       │ source       │       │ created_at       │
└────────────┘       │ created_at   │       └──────────────────┘
                     │ updated_at   │
                     └──────────────┘
                           │
                     ┌─────▼──────────┐
                     │ price_history  │
                     ├────────────────┤
                     │ id (PK)        │
                     │ symbol         │
                     │ type           │
                     │ price          │
                     │ change_pct     │
                     │ volume         │
                     │ fetched_at     │
                     └────────────────┘
```

### 資料表說明

| 資料表 | 用途 |
|--------|------|
| `users` | 使用者帳號（email + bcrypt hash） |
| `watchlist` | 使用者關注的股票/基金清單 |
| `analysis_results` | AI 分析結果紀錄（JSON 格式） |
| `price_history` | 標的物歷史價格（由排程爬蟲寫入） |

---

## 方案一：Supabase（推薦）

[Supabase](https://supabase.com) 提供免費的 PostgreSQL 資料庫，附帶 Auth、Realtime 等功能。

### 步驟

1. **建立專案**
   - 前往 [supabase.com](https://supabase.com) 建立帳號
   - 新建專案，選擇離你最近的區域

2. **取得連線資訊**
   - 進入 Project Settings → Database
   - 複製 Connection String (URI format)
   - 進入 Project Settings → API → 取得 `URL`、`anon key`、`service_role key`

3. **設定 `.env`**

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

4. **建立資料表** — 見下方 [建立資料表](#建立資料表) 章節

### 免費方案限制

- 500 MB 資料庫空間
- 2 個免費專案
- 適合開發與小規模使用

---

## 方案二：Neon（Serverless）

[Neon](https://neon.tech) 提供 Serverless PostgreSQL，特別適合 Cloudflare Workers。

### 步驟

1. 前往 [neon.tech](https://neon.tech) 建立帳號
2. 新建專案 → 取得連線字串
3. 設定 `.env`：

```env
DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require
# Supabase 相關欄位可留空或設定假值（若不使用 Supabase 客戶端）
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SERVICE_KEY=placeholder
SUPABASE_ANON_KEY=placeholder
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

### 優勢

- 自動休眠，按需啟動（省錢）
- 支援 HTTP 連線（Cloudflare Workers 友善）
- 免費方案 0.5 GB 儲存

---

## 方案三：Railway

[Railway](https://railway.app) 提供一鍵部署的 PostgreSQL + Python 後端。

### 步驟

1. 前往 [railway.app](https://railway.app) 建立帳號
2. 新建專案 → Add Service → PostgreSQL
3. PostgreSQL 建立後，從 Variables 取得 `DATABASE_URL`
4. 新增另一個 Service → 連結此 Git Repo → 設定 root directory 為 `backend`
5. 在 Service 的 Variables 中設定所有環境變數

### 優勢

- 一鍵部署前後端 + 資料庫
- 每月 $5 免費額度
- 自動 HTTPS

---

## 方案四：Self-hosted Docker

適合需要完全控制的場景。

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: finbuddy
      POSTGRES_USER: finbuddy
      POSTGRES_PASSWORD: your-secure-password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://finbuddy:your-secure-password@db:5432/finbuddy
      JWT_SECRET: your-super-secret-jwt-key-min-32-chars
      CORS_ORIGINS: http://localhost:3000
      ENVIRONMENT: production
    depends_on:
      - db

volumes:
  pgdata:
```

### Dockerfile (backend/)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 建立資料表

### 方式 A：使用 Supabase SQL Editor（推薦）

登入 Supabase Dashboard → SQL Editor → 執行以下 SQL：

```sql
-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 使用者表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- 關注清單
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('stock', 'fund')),
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, symbol, type)
);

CREATE INDEX idx_watchlist_symbol ON watchlist(symbol);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);

-- 分析結果
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    watchlist_id UUID REFERENCES watchlist(id) ON DELETE SET NULL,
    tool VARCHAR(50) NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analysis_user ON analysis_results(user_id);
CREATE INDEX idx_analysis_created ON analysis_results(created_at);

-- 價格歷史
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('stock', 'fund')),
    price DECIMAL(12, 4) NOT NULL,
    change_pct DECIMAL(8, 4),
    volume BIGINT,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (symbol, type, (fetched_at::date))
);

CREATE INDEX idx_price_symbol ON price_history(symbol);
CREATE INDEX idx_price_fetched ON price_history(fetched_at);

-- 自動更新 updated_at 的 trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER watchlist_updated_at BEFORE UPDATE ON watchlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 方式 B：使用 SQLAlchemy 自動建表

```bash
cd backend
# 啟用虛擬環境
venv\Scripts\activate   # Windows
source venv/bin/activate # macOS/Linux

# 執行 Python
python -c "
from app.database import engine, Base
from app.models import User, Watchlist, AnalysisResult, PriceHistory
Base.metadata.create_all(bind=engine)
print('Tables created successfully!')
"
```

---

## 前端 API 串接

### 安裝 Axios（已包含）

前端已安裝 `axios`。API 呼叫範例：

### 認證範例

```typescript
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

// 登入
const login = async (email: string, password: string) => {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password })
  const { access_token, refresh_token } = res.data
  localStorage.setItem('access_token', access_token)
  localStorage.setItem('refresh_token', refresh_token)
  return res.data
}

// 帶認證的請求
const authAxios = axios.create({ baseURL: API_BASE })
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

### Watchlist 範例

```typescript
// 取得關注清單
const getWatchlist = () => authAxios.get('/watchlist')

// 新增標的
const addToWatchlist = (item: {
  type: 'stock' | 'fund'
  symbol: string
  name: string
  source?: string
}) => authAxios.post('/watchlist', item)

// 刪除
const removeFromWatchlist = (id: string) => authAxios.delete(`/watchlist/${id}`)
```

### 儲存分析結果

```typescript
// 在任何工具中，分析完成後儲存結果
const saveAnalysis = (data: {
  watchlist_id?: string
  tool: string        // e.g. 'gemini-stock-prophet'
  result: object      // AI 分析的 JSON 結果
}) => authAxios.post('/analysis', data)
```

---

## 常見問題

### Q: 不連資料庫可以使用嗎？

可以。前端的所有 AI 分析工具都是直接呼叫 Gemini API，不需要後端。後端僅用於：
- 使用者帳號管理
- Watchlist 跨裝置同步
- 分析紀錄持久化

### Q: 我可以用 SQLite 開發嗎？

可以，但需修改 `backend/app/database.py`：

```python
# 改為 SQLite（僅開發用）
DATABASE_URL = "sqlite:///./finbuddy.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
```

同時在 `.env` 中設定：
```
DATABASE_URL=sqlite:///./finbuddy.db
```

注意：SQLite 不支援部分 PostgreSQL 特有語法，不建議用於生產環境。

### Q: 如何新增 API 端點？

1. 在 `backend/app/schemas.py` 定義 Request/Response Schema
2. 在 `backend/app/models.py` 新增 ORM Model（如需新資料表）
3. 在 `backend/app/routers/` 新增或修改 Router
4. 在 `backend/main.py` 註冊 Router：
   ```python
   from app.routers import your_router
   app.include_router(your_router.router, prefix="/api/v1/your-path", tags=["your-tag"])
   ```

### Q: 如何做資料庫遷移 (Migration)？

建議使用 [Alembic](https://alembic.sqlalchemy.org/)：

```bash
pip install alembic
alembic init alembic
# 修改 alembic.ini 中的 sqlalchemy.url
# 修改 alembic/env.py 引入 models

alembic revision --autogenerate -m "initial"
alembic upgrade head
```
