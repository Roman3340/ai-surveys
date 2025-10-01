# AI Surveys Backend

FastAPI бэкенд для приложения создания опросов.

## Технологии

- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic

## Установка

1. Установить зависимости:
```bash
pip install -r requirements.txt
```

2. Создать файл `.env` на основе `env.example`:
```bash
cp env.example .env
```

3. Настроить подключение к базе данных в `.env`

4. Инициализировать Alembic:
```bash
alembic init alembic
```

5. Создать миграции:
```bash
alembic revision --autogenerate -m "Initial migration"
```

6. Применить миграции:
```bash
alembic upgrade head
```

## Запуск

```bash
python run.py
```

API будет доступен по адресу: http://localhost:8000

Документация API: http://localhost:8000/docs