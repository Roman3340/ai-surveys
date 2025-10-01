import asyncio
import logging
import os
from datetime import datetime
from typing import Optional

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, WebAppData
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.core.database import SessionLocal
from app.models.user import User
from app.models.survey import Survey  # Импортируем для корректной работы relationships
from app.models.question import Question  # Импортируем для корректной работы relationships
from app.schemas.user import UserCreate

# Загружаем переменные окружения
load_dotenv("bot.env")

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Конфигурация бота
BOT_TOKEN = os.getenv("BOT_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL", "http://localhost:5173")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не найден в переменных окружения!")

# Создание бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


def get_db():
    """Получение сессии базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def create_or_update_user(user_data: types.User, db: Session, app_opened: bool = False) -> User:
    """Создание или обновление пользователя в БД"""
    try:
        current_time = datetime.utcnow()
        
        # Проверяем, существует ли пользователь
        existing_user = db.query(User).filter(User.telegram_id == user_data.id).first()
        
        if existing_user:
            # Обновляем данные существующего пользователя
            existing_user.username = user_data.username
            existing_user.first_name = user_data.first_name
            existing_user.last_name = user_data.last_name
            existing_user.language_code = user_data.language_code or "ru"
            existing_user.last_activity = current_time
            existing_user.updated_at = current_time
            
            # Если пользователь открыл приложение
            if app_opened:
                if not existing_user.app_opened_at:
                    existing_user.app_opened_at = current_time  # Первое открытие
                existing_user.app_opened_count += 1
                existing_user.last_app_opened_at = current_time
            
            db.commit()
            db.refresh(existing_user)
            logger.info(f"Updated user: {existing_user.telegram_id}, app_opened: {app_opened}")
            return existing_user
        else:
            # Создаем нового пользователя
            new_user = User(
                telegram_id=user_data.id,
                username=user_data.username,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                language_code=user_data.language_code or "ru",
                is_active=True,
                is_premium=getattr(user_data, 'is_premium', False),
                created_at=current_time,
                last_activity=current_time,
                bot_started_at=current_time,  # Отмечаем первое обращение к боту
                app_opened_count=1 if app_opened else 0,
                app_opened_at=current_time if app_opened else None,
                last_app_opened_at=current_time if app_opened else None
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            logger.info(f"Created new user: {new_user.telegram_id}, app_opened: {app_opened}")
            return new_user
            
    except Exception as e:
        logger.error(f"Error creating/updating user: {e}")
        db.rollback()
        raise


@dp.message(CommandStart())
async def start_command(message: types.Message):
    """Обработчик команды /start"""
    try:
        # Получаем сессию БД
        db = next(get_db())
        
        # Создаем или обновляем пользователя (app_opened=False - только запустил бота)
        user = await create_or_update_user(message.from_user, db, app_opened=False)
        
        # Создаем клавиатуру с кнопкой для открытия веб-приложения
        keyboard = InlineKeyboardBuilder()
        keyboard.add(
            InlineKeyboardButton(
                text="🚀 Открыть приложение",
                web_app=WebAppInfo(url=WEB_APP_URL)
            )
        )
        
        # Красивое приветственное сообщение
        welcome_text = f"""
🎉 <b>Привет, {message.from_user.first_name}!</b>

Я — <b>AI Surveys Bot</b> 🤖 — ваш помощник для создания умных опросов!

✨ <b>Что я умею:</b>
• Создавать опросы с помощью ИИ
• Генерировать вопросы автоматически  
• Настраивать опросы под ваши нужды
• Анализировать результаты

🎯 <b>Как начать:</b>
Нажмите кнопку <b>"🚀 Открыть приложение"</b> рядом с полем ввода сообщений, чтобы перейти в веб-интерфейс и создать свой первый опрос!

💡 <b>Совет:</b> В приложении вы сможете выбрать тип опроса (для бизнеса или личных целей) и получить персонализированные вопросы, созданные ИИ.

Удачного создания опросов! 📊✨
        """
        
        await message.answer(
            welcome_text,
            reply_markup=keyboard.as_markup(),
            parse_mode="HTML"
        )
        
        logger.info(f"Sent welcome message to user {user.telegram_id}")
        
    except Exception as e:
        logger.error(f"Error in start command: {e}")
        await message.answer(
            "❌ Произошла ошибка при обработке команды. Попробуйте позже."
        )


@dp.message(F.web_app_data)
async def handle_web_app_data(message: types.Message):
    """Обработчик данных от веб-приложения"""
    try:
        # Получаем сессию БД
        db = next(get_db())
        
        # Получаем данные от веб-приложения
        web_app_data = message.web_app_data
        data = web_app_data.data
        
        logger.info(f"Web app data received from user {message.from_user.id}: {data}")
        
        # Парсим JSON данные
        try:
            import json
            parsed_data = json.loads(data)
            action = parsed_data.get('action', 'unknown')
            logger.info(f"Parsed action: {action}")
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON data: {data}")
            action = 'unknown'
        
        # Обновляем пользователя с флагом app_opened=True
        user = await create_or_update_user(message.from_user, db, app_opened=True)
        
        # Отправляем подтверждение пользователю
        await message.answer(
            "✅ <b>Приложение успешно открыто!</b>\n\n"
            f"Действие: {action}\n"
            f"Открытий приложения: {user.app_opened_count}",
            parse_mode="HTML"
        )
        
    except Exception as e:
        logger.error(f"Error handling web app data: {e}")
        await message.answer(
            "❌ Произошла ошибка при обработке данных приложения."
        )


@dp.message(Command("help"))
async def help_command(message: types.Message):
    """Обработчик команды /help"""
    help_text = """
📖 <b>Справка по боту AI Surveys</b>

<b>Доступные команды:</b>
/start - Начать работу с ботом
/help - Показать эту справку
/stats - Показать статистику ваших опросов

<b>Как использовать:</b>
1. Нажмите /start для начала работы
2. Используйте кнопку "🚀 Открыть приложение" для перехода в веб-интерфейс
3. Создавайте опросы с помощью ИИ
4. Настраивайте вопросы под свои нужды

<b>Поддержка:</b>
Если у вас возникли вопросы, обратитесь к администратору бота.
    """
    
    await message.answer(help_text, parse_mode="HTML")


@dp.message(Command("stats"))
async def stats_command(message: types.Message):
    """Обработчик команды /stats - показывает статистику пользователя"""
    try:
        db = next(get_db())
        user = db.query(User).filter(User.telegram_id == message.from_user.id).first()
        
        if not user:
            await message.answer("❌ Пользователь не найден. Используйте /start для регистрации.")
            return
        
        # Здесь можно добавить подсчет опросов пользователя
        # surveys_count = db.query(Survey).filter(Survey.user_id == user.id).count()
        
        stats_text = f"""
📊 <b>Ваша статистика</b>

👤 <b>Профиль:</b>
• Имя: {user.first_name} {user.last_name or ''}
• Username: @{user.username or 'не указан'}
• Язык: {user.language_code}
• Premium: {'✅' if user.is_premium else '❌'}

📅 <b>Активность:</b>
• Регистрация: {user.created_at.strftime('%d.%m.%Y %H:%M')}
• Первый запуск бота: {user.bot_started_at.strftime('%d.%m.%Y %H:%M') if user.bot_started_at else 'Не зафиксировано'}
• Последняя активность: {user.last_activity.strftime('%d.%m.%Y %H:%M')}

🚀 <b>Веб-приложение:</b>
• Открывал приложение: {'✅' if user.app_opened_at else '❌'}
• Количество открытий: {user.app_opened_count}
• Первое открытие: {user.app_opened_at.strftime('%d.%m.%Y %H:%M') if user.app_opened_at else 'Никогда'}
• Последнее открытие: {user.last_app_opened_at.strftime('%d.%m.%Y %H:%M') if user.last_app_opened_at else 'Никогда'}

📈 <b>Опросы:</b>
• Создано опросов: 0 (функция в разработке)
• Активных опросов: 0 (функция в разработке)
        """
        
        await message.answer(stats_text, parse_mode="HTML")
        
    except Exception as e:
        logger.error(f"Error in stats command: {e}")
        await message.answer("❌ Ошибка при получении статистики.")


@dp.message()
async def handle_other_messages(message: types.Message):
    """Обработчик всех остальных сообщений"""
    await message.answer(
        "🤔 Не понимаю эту команду. Используйте /start для начала работы или /help для справки."
    )


async def main():
    """Основная функция запуска бота"""
    logger.info("Starting AI Surveys Bot...")
    
    try:
        # Запуск бота
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Error starting bot: {e}")
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
