from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Survey(Base):
    __tablename__ = "surveys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    language = Column(String(10), default="ru")
    
    # Настройки опроса
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    max_participants = Column(Integer)
    
    # Тип создания
    creation_type = Column(String(20), nullable=False)  # 'manual' или 'ai'
    
    # Настройки для AI опросов
    user_type = Column(String(20))  # 'business' или 'personal'
    business_sphere = Column(String(100))
    target_audience = Column(String(255))
    survey_goal = Column(Text)
    topic = Column(String(255))
    audience = Column(String(255))
    purpose = Column(Text)
    question_count = Column(Integer, nullable=False)  # Реальное количество вопросов
    question_types = Column(JSON)  # Список типов вопросов
    
    # Мотивация
    motivation = Column(JSON)
    
    # Статус
    is_published = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    owner = relationship("User", back_populates="surveys")
    questions = relationship("Question", back_populates="survey", cascade="all, delete-orphan")
