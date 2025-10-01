# Telegram Bot для AI Surveys

## Описание

Telegram бот для интеграции с веб-приложением AI Surveys. Бот позволяет пользователям:
- Регистрироваться в системе
- Открывать веб-приложение через кнопку
- Получать статистику своих опросов
- Отслеживать активность пользователей

## Установка

### 1. Установка зависимостей

```bash
# Активируйте виртуальное окружение
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows

# Установите зависимости для бота
pip install -r bot_requirements.txt
```

### 2. Настройка переменных окружения

Скопируйте файл `bot.env.example` в `bot.env` и заполните:

```bash
cp bot.env.example bot.env
```

Отредактируйте `bot.env`:
```env
BOT_TOKEN=your_actual_bot_token_here
WEB_APP_URL=https://your-domain.com
DATABASE_URL=postgresql://postgres:password@localhost/surveys
LOG_LEVEL=INFO
LOG_FILE=bot.log
```

### 3. Получение токена бота

1. Откройте [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен в файл `bot.env`

### 4. Настройка веб-приложения

Для работы кнопки "Открыть приложение" нужно настроить Web App в BotFather:

1. Откройте [@BotFather](https://t.me/botfather)
2. Отправьте команду `/mybots`
3. Выберите вашего бота
4. Выберите "Bot Settings" → "Menu Button"
5. Выберите "Configure Menu Button"
6. Введите URL вашего веб-приложения
7. Введите описание: "AI Surveys - Создание опросов с ИИ"

## Запуск

### Запуск бота

```bash
python telegram_bot_improved.py
```

### Запуск в фоновом режиме (Linux/Mac)

```bash
nohup python telegram_bot_improved.py > bot.log 2>&1 &
```

### Запуск через systemd (Linux)

Создайте файл `/etc/systemd/system/ai-surveys-bot.service`:

```ini
[Unit]
Description=AI Surveys Telegram Bot
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/your/backend
Environment=PATH=/path/to/your/backend/venv/bin
ExecStart=/path/to/your/backend/venv/bin/python telegram_bot_improved.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Затем:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-surveys-bot
sudo systemctl start ai-surveys-bot
```

## Функциональность

### Команды бота

- `/start` - Начать работу с ботом и зарегистрироваться
- `/help` - Показать справку
- `/stats` - Показать статистику пользователя

### Отслеживание активности

Бот отслеживает:
- Регистрацию пользователей
- Последнюю активность
- Открытие веб-приложения (через параметр `app_opened`)

### Интеграция с БД

Бот автоматически:
- Создает пользователей в БД при первом запуске
- Обновляет данные пользователей при повторном запуске
- Отслеживает активность

## Логирование

Логи сохраняются в файл `bot.log` и выводятся в консоль.

Уровни логирования:
- `INFO` - основная информация
- `ERROR` - ошибки
- `DEBUG` - отладочная информация

## Разработка

### Структура файлов

```
backend/
├── telegram_bot.py              # Базовая версия бота
├── telegram_bot_improved.py     # Улучшенная версия с логированием
├── bot_requirements.txt         # Зависимости для бота
├── bot.env.example             # Пример конфигурации
└── bot.log                     # Файл логов (создается автоматически)
```

### Добавление новых команд

1. Создайте обработчик:
```python
@dp.message(Command("new_command"))
async def new_command_handler(message: types.Message):
    await message.answer("Ответ на новую команду")
```

2. Добавьте команду в справку в функции `help_command`

### Интеграция с веб-приложением

Для передачи данных между ботом и веб-приложением можно использовать:
- URL параметры
- Telegram Web App API
- Общую БД

## Безопасность

- Никогда не коммитьте токен бота в репозиторий
- Используйте переменные окружения для конфиденциальных данных
- Регулярно обновляйте зависимости
- Мониторьте логи на предмет подозрительной активности

## Мониторинг

Для мониторинга работы бота можно использовать:
- Логи в файле `bot.log`
- Статистику в БД
- Внешние сервисы мониторинга (например, Sentry)

## Поддержка

При возникновении проблем:
1. Проверьте логи в файле `bot.log`
2. Убедитесь, что БД доступна
3. Проверьте правильность токена бота
4. Убедитесь, что веб-приложение доступно по указанному URL
