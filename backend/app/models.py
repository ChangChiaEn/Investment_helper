"""
資料庫模型定義
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, DECIMAL, BigInteger, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    watchlist_items = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="user", cascade="all, delete-orphan")

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(10), nullable=False)  # 'stock' or 'fund'
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    source = Column(String(50))  # 來源工具名稱
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="watchlist_items")
    analysis_results = relationship("AnalysisResult", back_populates="watchlist_item")

    # Constraints
    __table_args__ = (
        CheckConstraint("type IN ('stock', 'fund')", name="check_type"),
        UniqueConstraint("user_id", "symbol", "type", name="unique_user_symbol_type"),
    )

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    watchlist_id = Column(UUID(as_uuid=True), ForeignKey("watchlist.id", ondelete="SET NULL"), nullable=True)
    tool = Column(String(50), nullable=False)  # 工具名稱
    result = Column(JSON, nullable=False)  # AI 分析結果
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="analysis_results")
    watchlist_item = relationship("Watchlist", back_populates="analysis_results")

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol = Column(String(20), nullable=False, index=True)
    type = Column(String(10), nullable=False)  # 'stock' or 'fund'
    price = Column(DECIMAL(12, 4), nullable=False)
    change_pct = Column(DECIMAL(8, 4))  # 日漲跌幅 %
    volume = Column(BigInteger)  # 選填，基金無此欄位
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Constraints
    __table_args__ = (
        CheckConstraint("type IN ('stock', 'fund')", name="check_price_type"),
        UniqueConstraint("symbol", "type", func.date(func.timezone('UTC', fetched_at)), name="unique_symbol_type_date"),
    )

