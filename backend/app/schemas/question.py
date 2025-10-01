from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class QuestionBase(BaseModel):
    text: str
    type: str  # text, single_choice, multiple_choice, scale, yes_no, rating
    is_required: bool = True
    order: int = 0
    options: Optional[List[str]] = None
    scale_min: int = 1
    scale_max: int = 5
    scale_labels: Optional[Dict[str, str]] = None
    rating_max: int = 5
    image_url: Optional[str] = None
    image_name: Optional[str] = None

class QuestionCreate(QuestionBase):
    survey_id: int

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    type: Optional[str] = None
    is_required: Optional[bool] = None
    order: Optional[int] = None
    options: Optional[List[str]] = None
    scale_min: Optional[int] = None
    scale_max: Optional[int] = None
    scale_labels: Optional[Dict[str, str]] = None
    rating_max: Optional[int] = None
    image_url: Optional[str] = None
    image_name: Optional[str] = None

class Question(QuestionBase):
    id: int
    survey_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
