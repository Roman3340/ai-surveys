from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from app.core.database import get_db
from app.models.survey import Survey
from app.models.question import Question
from app.schemas.survey import Survey as SurveySchema, SurveyCreate, SurveyUpdate
from app.schemas.question import QuestionCreate

router = APIRouter()

@router.get("/", response_model=List[SurveySchema])
async def get_surveys(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Получить список всех опросов"""
    surveys = db.query(Survey).offset(skip).limit(limit).all()
    return surveys

@router.get("/{survey_id}", response_model=SurveySchema)
async def get_survey(survey_id: int, db: Session = Depends(get_db)):
    """Получить опрос по ID"""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey

@router.post("/", response_model=SurveySchema)
async def create_survey(survey: SurveyCreate, db: Session = Depends(get_db)):
    """Создать новый опрос"""
    db_survey = Survey(**survey.dict())
    db.add(db_survey)
    db.commit()
    db.refresh(db_survey)
    return db_survey

@router.post("/complete", response_model=Dict[str, Any])
async def create_complete_survey(
    survey_data: Dict[str, Any], 
    db: Session = Depends(get_db)
):
    """Создать полный опрос с вопросами"""
    try:
        # Создаем опрос
        survey_dict = {
            "title": survey_data["title"],
            "user_id": survey_data["creatorId"],
            "description": survey_data.get("description", ""),
            "creation_type": survey_data.get("creationType", "manual"),
            "is_published": True,
            "is_active": True
        }
        
        # Добавляем дополнительные поля если есть
        if "settings" in survey_data:
            settings = survey_data["settings"]
            if "startDate" in settings and "startTime" in settings:
                start_datetime = f"{settings['startDate']} {settings['startTime']}"
                survey_dict["start_date"] = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
            
            if "endDate" in settings and "endTime" in settings:
                end_datetime = f"{settings['endDate']} {settings['endTime']}"
                survey_dict["end_date"] = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
            
            if "maxParticipants" in settings:
                survey_dict["max_participants"] = int(settings["maxParticipants"]) if settings["maxParticipants"] else None
        
        db_survey = Survey(**survey_dict)
        db.add(db_survey)
        db.commit()
        db.refresh(db_survey)
        
        # Создаем вопросы
        questions_data = survey_data.get("questions", [])
        created_questions = []
        
        for i, question_data in enumerate(questions_data):
            question_dict = {
                "survey_id": db_survey.id,
                "type": question_data["type"],
                "title": question_data["title"],
                "description": question_data.get("description", ""),
                "required": question_data.get("required", True),
                "order": i + 1,
                "options": question_data.get("options", []),
                "validation": question_data.get("validation", {})
            }
            
            db_question = Question(**question_dict)
            db.add(db_question)
            created_questions.append(db_question)
        
        db.commit()
        
        # Обновляем вопросы с ID
        for question in created_questions:
            db.refresh(question)
        
        return {
            "survey": db_survey,
            "questions": created_questions,
            "message": "Survey created successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating survey: {str(e)}")

@router.get("/user/{user_id}", response_model=List[SurveySchema])
async def get_user_surveys(user_id: int, db: Session = Depends(get_db)):
    """Получить опросы пользователя"""
    surveys = db.query(Survey).filter(Survey.user_id == user_id).order_by(Survey.created_at.desc()).all()
    return surveys

@router.put("/{survey_id}", response_model=SurveySchema)
async def update_survey(survey_id: int, survey: SurveyUpdate, db: Session = Depends(get_db)):
    """Обновить опрос"""
    db_survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not db_survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    update_data = survey.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_survey, field, value)
    
    db.commit()
    db.refresh(db_survey)
    return db_survey

@router.delete("/{survey_id}")
async def delete_survey(survey_id: int, db: Session = Depends(get_db)):
    """Удалить опрос"""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    db.delete(survey)
    db.commit()
    return {"message": "Survey deleted successfully"}
