from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import surveys, questions, users
from app.core.config import settings

app = FastAPI(
    title="AI Surveys API",
    description="API для создания и управления опросами",
    version="1.0.0"
)

# Настройка CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(surveys.router, prefix="/api/v1/surveys", tags=["surveys"])
app.include_router(questions.router, prefix="/api/v1/questions", tags=["questions"])

@app.get("/")
async def root():
    return {"message": "AI Surveys API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
