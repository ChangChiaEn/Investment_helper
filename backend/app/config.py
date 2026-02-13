"""
應用程式配置
"""
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    database_url: str
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str
    
    # JWT
    jwt_secret: str
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # Environment
    environment: str = "development"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return self.cors_origins.split(",")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

