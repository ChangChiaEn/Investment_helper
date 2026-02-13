"""
認證相關 API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas
from app.models import User
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.config import settings
from app.dependencies import get_current_user_id
from uuid import UUID

router = APIRouter()
security = HTTPBearer()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt

@router.post("/register", response_model=schemas.TokenResponse)
async def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    # 檢查 email 是否已存在
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # 建立新使用者
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 產生 tokens
    access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.jwt_refresh_token_expire_days)
    
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email},
        expires_delta=access_token_expires
    )
    refresh_token = create_access_token(
        data={"sub": str(new_user.id), "type": "refresh"},
        expires_delta=refresh_token_expires
    )
    
    return {
        "user_id": new_user.id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": settings.jwt_access_token_expire_minutes * 60
    }

@router.post("/login", response_model=schemas.TokenResponse)
async def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # 產生 tokens
    access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.jwt_refresh_token_expire_days)
    
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"},
        expires_delta=refresh_token_expires
    )
    
    return {
        "user_id": user.id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": settings.jwt_access_token_expire_minutes * 60
    }

@router.post("/refresh", response_model=schemas.RefreshTokenResponse)
async def refresh_token(token_data: schemas.RefreshTokenRequest):
    try:
        payload = jwt.decode(token_data.refresh_token, settings.jwt_secret, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "expires_in": settings.jwt_access_token_expire_minutes * 60
    }

@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == UUID(current_user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {
        "user_id": user.id,
        "email": user.email,
        "name": user.name
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    # TODO: 實作 token 黑名單機制（可選）
    return {"success": True}

