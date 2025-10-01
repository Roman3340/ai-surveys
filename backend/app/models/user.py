from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Telegram данные
    telegram_id = Column(Integer, unique=True, nullable=False, index=True)
    username = Column(String(255), nullable=True)  # @username (может быть null)
    first_name = Column(String(255), nullable=False)  # Всегда есть в Telegram
    last_name = Column(String(255), nullable=True)  # Может быть null в Telegram
    
    # Дополнительная информация
    language_code = Column(String(10), default="ru")  # ru, en, etc.
    
    # Статус пользователя
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)  # Telegram Premium (из initData)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    # Отслеживание активности
    bot_started_at = Column(DateTime(timezone=True), nullable=True)  # Когда впервые запустил бота
    app_opened_at = Column(DateTime(timezone=True), nullable=True)   # Когда впервые открыл веб-приложение
    app_opened_count = Column(Integer, default=0)                   # Сколько раз открывал приложение
    last_app_opened_at = Column(DateTime(timezone=True), nullable=True)  # Последний раз открывал приложение
    
    # Связи (используем строковую ссылку для избежания циклического импорта)
    surveys = relationship("Survey", back_populates="owner", cascade="all, delete-orphan")
