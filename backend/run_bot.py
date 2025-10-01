#!/usr/bin/env python3
"""
Скрипт для запуска Telegram бота AI Surveys
"""

import sys
import os
import asyncio
from pathlib import Path

# Добавляем путь к приложению
sys.path.append(str(Path(__file__).parent))

try:
    from telegram_bot_improved import main
except ImportError as e:
    print(f"Ошибка импорта: {e}")
    print("Убедитесь, что все зависимости установлены:")
    print("pip install -r requirements.txt")
    sys.exit(1)

if __name__ == "__main__":
    print("🤖 Запуск AI Surveys Telegram Bot...")
    print("Для остановки нажмите Ctrl+C")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Бот остановлен пользователем")
    except Exception as e:
        print(f"❌ Ошибка запуска бота: {e}")
        sys.exit(1)
