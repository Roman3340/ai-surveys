from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    
    # Содержимое вопроса
    text = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # text, single_choice, multiple_choice, scale, yes_no, rating
    
    # Настройки вопроса
    is_required = Column(Boolean, default=True)
    order = Column(Integer, default=0)
    
    # Опции для вопросов с выбором
    options = Column(JSON)  # Список вариантов ответов
    
    # Настройки для шкалы
    scale_min = Column(Integer, nullable=True)  # Только для типа "scale"
    scale_max = Column(Integer, nullable=True)  # Только для типа "scale"
    scale_labels = Column(JSON, nullable=True)  # Подписи для шкалы
    
    # Настройки для рейтинга
    rating_max = Column(Integer, nullable=True)  # Только для типа "rating"
    
    # Изображение
    image_url = Column(String(500))
    image_name = Column(String(255))
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    survey = relationship("Survey", back_populates="questions")
