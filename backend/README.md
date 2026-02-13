# Sagafisc Backend

FastAPI 後端服務

## 環境設定

### 1. 建立虛擬環境

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. 安裝依賴

```bash
pip install -r requirements.txt
```

### 3. 設定環境變數

複製 `.env.example` 為 `.env` 並填入實際值：

```bash
cp .env.example .env
```

### 4. 初始化資料庫

```bash
# 建立資料表
python -c "from app.database import engine, Base; from app import models; Base.metadata.create_all(bind=engine)"
```

### 5. 啟動服務

```bash
uvicorn main:app --reload --port 8000
```

API 文件將在 http://localhost:8000/docs 可用

## API 端點

- `/api/v1/auth/*` - 認證相關
- `/api/v1/watchlist/*` - 關注清單管理
- `/api/v1/analysis/*` - 分析結果儲存與查詢

詳見 `docs/TOOLS_SPEC.md` 中的工具規格書。

