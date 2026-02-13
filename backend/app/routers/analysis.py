"""
Analysis 相關 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional
from jose import JWTError, jwt
from app.database import get_db
from app import schemas
from app.models import AnalysisResult
from app.config import settings
from app.dependencies import get_current_user_id
from uuid import UUID

router = APIRouter()

@router.post("", response_model=schemas.AnalysisItem, status_code=201)
async def create_analysis(
    analysis_data: schemas.AnalysisCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    new_analysis = AnalysisResult(
        user_id=UUID(user_id),
        watchlist_id=analysis_data.watchlist_id,
        tool=analysis_data.tool,
        result=analysis_data.result
    )
    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)
    
    return new_analysis

@router.get("", response_model=schemas.AnalysisListResponse)
async def get_analysis_list(
    watchlist_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    query = db.query(AnalysisResult).filter(AnalysisResult.user_id == UUID(user_id))
    
    if watchlist_id:
        query = query.filter(AnalysisResult.watchlist_id == watchlist_id)
    
    total = query.count()
    items = query.order_by(AnalysisResult.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit
    }

