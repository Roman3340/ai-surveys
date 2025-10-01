from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.survey import Survey
from app.schemas.survey import Survey as SurveySchema, SurveyCreate, SurveyUpdate

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
