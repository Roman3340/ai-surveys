from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SurveyBase(BaseModel):
    title: str
    user_id: int
    description: Optional[str] = None
    language: str = "ru"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_participants: Optional[int] = None
    creation_type: str  # 'manual' или 'ai'
    user_type: Optional[str] = None  # 'business' или 'personal'
    business_sphere: Optional[str] = None
    target_audience: Optional[str] = None
    survey_goal: Optional[str] = None
    topic: Optional[str] = None
    audience: Optional[str] = None
    purpose: Optional[str] = None
    question_count: int = 5
    question_types: Optional[List[str]] = None
    motivation: Optional[Dict[str, Any]] = None

class SurveyCreate(SurveyBase):
    pass

class SurveyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_participants: Optional[int] = None
    user_type: Optional[str] = None
    business_sphere: Optional[str] = None
    target_audience: Optional[str] = None
    survey_goal: Optional[str] = None
    topic: Optional[str] = None
    audience: Optional[str] = None
    purpose: Optional[str] = None
    question_count: Optional[int] = None
    question_types: Optional[List[str]] = None
    motivation: Optional[Dict[str, Any]] = None
    is_published: Optional[bool] = None
    is_active: Optional[bool] = None

class Survey(SurveyBase):
    id: int
    is_published: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
