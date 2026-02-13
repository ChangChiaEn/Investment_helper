"""
Watchlist 相關 API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional
from jose import JWTError, jwt
from app.database import get_db
from app import schemas
from app.models import Watchlist
from app.config import settings
from app.dependencies import get_current_user_id
from uuid import UUID

router = APIRouter()

@router.get("", response_model=schemas.WatchlistListResponse)
async def get_watchlist(
    type: Optional[str] = Query(None, regex="^(stock|fund)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    query = db.query(Watchlist).filter(Watchlist.user_id == UUID(user_id))
    
    if type:
        query = query.filter(Watchlist.type == type)
    
    total = query.count()
    items = query.order_by(Watchlist.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.post("", response_model=schemas.WatchlistItem, status_code=status.HTTP_201_CREATED)
async def create_watchlist_item(
    item_data: schemas.WatchlistCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    # 檢查是否已存在
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == UUID(user_id),
        Watchlist.symbol == item_data.symbol,
        Watchlist.type == item_data.type
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Watchlist item already exists"
        )
    
    new_item = Watchlist(
        user_id=UUID(user_id),
        type=item_data.type,
        symbol=item_data.symbol,
        name=item_data.name,
        source=item_data.source
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return new_item

@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
async def delete_watchlist_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    item = db.query(Watchlist).filter(
        Watchlist.id == item_id,
        Watchlist.user_id == UUID(user_id)
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist item not found"
        )
    
    db.delete(item)
    db.commit()
    
    return {"success": True}

@router.get("/{item_id}/latest", response_model=schemas.WatchlistLatestData)
async def get_watchlist_latest(
    item_id: UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    item = db.query(Watchlist).filter(
        Watchlist.id == item_id,
        Watchlist.user_id == UUID(user_id)
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist item not found"
        )
    
    # TODO: 從 price_history 取得最新價格
    # TODO: 整合新聞 API
    
    return {
        "price": None,
        "change_pct": None,
        "updated_at": item.updated_at,
        "news": []
    }

