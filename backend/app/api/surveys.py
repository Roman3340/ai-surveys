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
        # Находим пользователя по telegram_id
        from app.models.user import User
        telegram_id = survey_data["creatorId"]
        user = db.query(User).filter(User.telegram_id == telegram_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail=f"User with telegram_id {telegram_id} not found")
        
        print(f"👤 Found user: {user.id} (telegram_id: {user.telegram_id})")
        
        # Создаем опрос
        survey_dict = {
            "title": survey_data["title"],
            "user_id": user.id,  # Используем внутренний ID пользователя
            "description": survey_data.get("description", ""),
            "creation_type": survey_data.get("creationType", "manual"),
            "question_count": len(survey_data.get("questions", [])),  # Реальное количество вопросов
            "is_published": True,
            "is_active": True
        }
        
        # Добавляем дополнительные поля если есть
        if "settings" in survey_data:
            settings = survey_data["settings"]
            if "startDate" in settings and "startTime" in settings and settings["startDate"] and settings["startTime"]:
                start_datetime = f"{settings['startDate']} {settings['startTime']}"
                try:
                    survey_dict["start_date"] = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
                except ValueError:
                    print(f"⚠️ Invalid start_date format: {start_datetime}")
            
            if "endDate" in settings and "endTime" in settings and settings["endDate"] and settings["endTime"]:
                end_datetime = f"{settings['endDate']} {settings['endTime']}"
                try:
                    survey_dict["end_date"] = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
                except ValueError:
                    print(f"⚠️ Invalid end_date format: {end_datetime}")
            
            if "maxParticipants" in settings and settings["maxParticipants"]:
                try:
                    survey_dict["max_participants"] = int(settings["maxParticipants"])
                except ValueError:
                    print(f"⚠️ Invalid maxParticipants: {settings['maxParticipants']}")
            
            # Сохраняем мотивацию
            if "motivation" in settings and settings["motivation"]:
                survey_dict["motivation"] = settings["motivation"]
                print(f"💎 Motivation saved: {settings['motivation']}")
            else:
                print(f"⚠️ No motivation found in settings: {settings}")
        
        db_survey = Survey(**survey_dict)
        db.add(db_survey)
        db.commit()
        db.refresh(db_survey)
        
        # Создаем вопросы
        questions_data = survey_data.get("questions", [])
        created_questions = []
        
        for i, question_data in enumerate(questions_data):
            question_type = question_data["type"]
            
            question_dict = {
                "survey_id": db_survey.id,
                "type": question_type,
                "text": question_data["title"],  # Используем 'text' вместо 'title'
                "is_required": question_data.get("required", True),  # Используем 'is_required' вместо 'required'
                "order": i + 1,
                "options": question_data.get("options", []),
                # Поля по умолчанию NULL
                "scale_min": None,
                "scale_max": None,
                "rating_max": None
            }
            
            # Настройки для типа "Шкала"
            if question_type == "scale":
                question_dict["scale_min"] = question_data.get("scale_min", 1)
                question_dict["scale_max"] = question_data.get("scale_max", 5)
            
            # Настройки для типа "Оценка звездами" (rating)
            elif question_type == "rating":
                question_dict["rating_max"] = question_data.get("rating_max", 5)
            
            db_question = Question(**question_dict)
            db.add(db_question)
            created_questions.append(db_question)
        
        db.commit()
        
        # Обновляем вопросы с ID
        for question in created_questions:
            db.refresh(question)
        
        print(f"✅ Survey created successfully with ID: {db_survey.id}")
        return {
            "survey": {
                "id": db_survey.id,
                "title": db_survey.title,
                "description": db_survey.description,
                "user_id": db_survey.user_id,
                "creation_type": db_survey.creation_type,
                "is_published": db_survey.is_published,
                "is_active": db_survey.is_active,
                "created_at": db_survey.created_at.isoformat() if db_survey.created_at else None,
                "updated_at": db_survey.updated_at.isoformat() if db_survey.updated_at else None
            },
            "questions": [
                {
                    "id": q.id,
                    "survey_id": q.survey_id,
                    "type": q.type,
                    "text": q.text,
                    "is_required": q.is_required,
                    "order": q.order,
                    "options": q.options,
                    "created_at": q.created_at.isoformat() if q.created_at else None
                }
                for q in created_questions
            ],
            "message": "Survey created successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating survey: {str(e)}")

@router.get("/user/{telegram_id}", response_model=List[SurveySchema])
async def get_user_surveys(telegram_id: int, db: Session = Depends(get_db)):
    """Получить опросы пользователя по telegram_id"""
    from app.models.user import User
    
    print(f"🔍 Loading surveys for telegram_id: {telegram_id}")
    
    # Находим пользователя по telegram_id
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    
    if not user:
        print(f"❌ User with telegram_id {telegram_id} not found")
        raise HTTPException(status_code=404, detail=f"User with telegram_id {telegram_id} not found")
    
    print(f"👤 Found user: {user.id} (telegram_id: {user.telegram_id})")
    
    # Получаем опросы пользователя по внутреннему ID
    surveys = db.query(Survey).filter(Survey.user_id == user.id).order_by(Survey.created_at.desc()).all()
    print(f"📊 Found {len(surveys)} surveys for user {user.id}")
    
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
