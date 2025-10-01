from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    telegram_id: int
    username: Optional[str] = None  # @username (может быть null)
    first_name: str  # Всегда есть в Telegram
    last_name: Optional[str] = None  # Может быть null в Telegram
    language_code: str = "ru"
    is_active: bool = True
    is_premium: bool = False  # Telegram Premium (из initData)

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    language_code: Optional[str] = None
    is_active: Optional[bool] = None
    is_premium: Optional[bool] = None

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_activity: datetime
    
    # Отслеживание активности
    bot_started_at: Optional[datetime] = None
    app_opened_at: Optional[datetime] = None
    app_opened_count: int = 0
    last_app_opened_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
