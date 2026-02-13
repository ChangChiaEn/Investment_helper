"""
FinBuddy Backend API
FastAPI 後端服務主程式
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="FinBuddy API",
    description="理財小能手後端 API",
    version="1.0.0"
)

# CORS 設定
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "FinBuddy API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# 導入路由模組
from app.routers import auth, watchlist, analysis
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(watchlist.router, prefix="/api/v1/watchlist", tags=["watchlist"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

