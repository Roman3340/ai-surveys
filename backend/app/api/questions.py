from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.question import Question
from app.schemas.question import Question as QuestionSchema, QuestionCreate, QuestionUpdate

router = APIRouter()

@router.get("/", response_model=List[QuestionSchema])
async def get_questions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Получить список всех вопросов"""
    questions = db.query(Question).offset(skip).limit(limit).all()
    return questions

@router.get("/{question_id}", response_model=QuestionSchema)
async def get_question(question_id: int, db: Session = Depends(get_db)):
    """Получить вопрос по ID"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.get("/survey/{survey_id}", response_model=List[QuestionSchema])
async def get_questions_by_survey(survey_id: int, db: Session = Depends(get_db)):
    """Получить все вопросы опроса"""
    questions = db.query(Question).filter(Question.survey_id == survey_id).order_by(Question.order).all()
    return questions

@router.post("/", response_model=QuestionSchema)
async def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    """Создать новый вопрос"""
    db_question = Question(**question.dict())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@router.put("/{question_id}", response_model=QuestionSchema)
async def update_question(question_id: int, question: QuestionUpdate, db: Session = Depends(get_db)):
    """Обновить вопрос"""
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    update_data = question.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_question, field, value)
    
    db.commit()
    db.refresh(db_question)
    return db_question

@router.delete("/{question_id}")
async def delete_question(question_id: int, db: Session = Depends(get_db)):
    """Удалить вопрос"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(question)
    db.commit()
    return {"message": "Question deleted successfully"}
