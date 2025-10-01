from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:password@localhost/surveys"
    
    # API
    api_v1_str: str = "/api/v1"
    project_name: str = "AI Surveys"
    
    # CORS
    backend_cors_origins: list = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"

settings = Settings()
