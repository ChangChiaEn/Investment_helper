"""
Pydantic Schemas for API request/response
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    user_id: UUID
    access_token: str
    refresh_token: str
    expires_in: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenResponse(BaseModel):
    access_token: str
    expires_in: int

class UserResponse(BaseModel):
    user_id: UUID
    email: str
    name: str

    class Config:
        from_attributes = True

# Watchlist Schemas
class WatchlistCreate(BaseModel):
    type: str  # 'stock' or 'fund'
    symbol: str
    name: str
    source: Optional[str] = None

class WatchlistItem(BaseModel):
    id: UUID
    type: str
    symbol: str
    name: str
    source: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WatchlistListResponse(BaseModel):
    data: List[WatchlistItem]
    total: int
    page: int
    limit: int

class WatchlistLatestData(BaseModel):
    price: Optional[float]
    change_pct: Optional[float]
    updated_at: datetime
    news: List[Dict[str, Any]] = []

# Analysis Schemas
class AnalysisCreate(BaseModel):
    watchlist_id: Optional[UUID] = None
    tool: str
    result: Dict[str, Any]

class AnalysisItem(BaseModel):
    id: UUID
    tool: str
    result: Dict[str, Any]
    created_at: datetime
    watchlist_id: Optional[UUID] = None

    class Config:
        from_attributes = True

class AnalysisListResponse(BaseModel):
    data: List[AnalysisItem]
    total: int
    page: int
    limit: int

# Error Response
class ErrorResponse(BaseModel):
    error: Dict[str, str]
    status: int

