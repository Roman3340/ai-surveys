import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { surveyApi } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

interface Question {
  id: string;
  type: string;
  text: string;
  description?: string;
  isRequired: boolean;
  orderIndex: number;
  options?: any[];
  hasOtherOption?: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  ratingMax?: number;
  validation?: any;
  imageUrl?: string;
  conditionalLogic?: any;
}

interface SurveyData {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  settings: any;
  canParticipate: boolean;
  participationMessage?: string;
  creatorUsername?: string;
}

interface Answers {
  [questionId: string]: any;
}

export default function SurveyTakePage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { user, hapticFeedback } = useTelegram();

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Состояния для scale и rating вопросов
  const [scaleValues, setScaleValues] = useState<Record<string, number>>({});
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({});
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const loadSurvey = async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        const response = await surveyApi.getSurveyPublic(surveyId, user?.id);
        
        if (!response.canParticipate) {
          setError(response.participationMessage || 'Участие в опросе недоступно');
          setLoading(false);
          return;
        }
        
        setSurvey(response);
        
        // Маппим вопросы и гарантируем правильный формат conditionalLogic
        const mappedQuestions = response.questions.map((q: any) => ({
          ...q,
          conditionalLogic: q.conditionalLogic || q.conditional_logic || null
        }));
        
        // Перемешиваем вопросы один раз при загрузке
        if (response.settings?.randomizeQuestions) {
          const shuffled = [...mappedQuestions].sort(() => Math.random() - 0.5);
          setShuffledQuestions(shuffled);
        } else {
          const sorted = [...mappedQuestions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
          setShuffledQuestions(sorted);
        }
        
        // Скроллим к верху страницы
        window.scrollTo(0, 0);
      } catch (e: any) {
        console.error(e);
        setError(e?.response?.data?.detail || 'Не удалось загрузить опрос');
      } finally {
        setLoading(false);
      }
    };
    loadSurvey();
  }, [surveyId, user?.id]);

  // Получаем список видимых вопросов на основе условий
  const visibleQuestions = useMemo(() => {
    return shuffledQuestions.filter(q => {
      // Находим все вопросы, которые имеют conditionalLogic с этим вопросом в showQuestions
      const conditionQuestions = shuffledQuestions.filter(otherQ => {
        if (!otherQ.conditionalLogic) return false;
        const logic = otherQ.conditionalLogic;
        
        // Проверяем все возможные условия
        const allShowQuestions: string[] = [];
        if (logic.conditions) {
          logic.conditions.forEach((c: any) => {
            if (c.showQuestions) {
              allShowQuestions.push(...c.showQuestions);
            }
          });
        }
        if (logic.valueConditions) {
          logic.valueConditions.forEach((c: any) => {
            if (c.showQuestions) {
              allShowQuestions.push(...c.showQuestions);
            }
          });
        }
        if (logic.dateConditions) {
          logic.dateConditions.forEach((c: any) => {
            if (c.showQuestions) {
              allShowQuestions.push(...c.showQuestions);
            }
          });
        }
        
        return allShowQuestions.includes(q.id);
      });
      
      // Если вопрос не упоминается ни в одном conditionalLogic, показываем его всегда
      if (conditionQuestions.length === 0) return true;
      
      // Проверяем, выполнено ли хотя бы одно условие для показа этого вопроса
      return conditionQuestions.some(conditionQuestion => {
        const logic = conditionQuestion.conditionalLogic;
        if (!logic) return false;
        
        // Single choice или Yes/No
        if (logic.conditions && logic.conditions.length > 0) {
          return logic.conditions.some((condition: any) => {
            if (!condition.showQuestions || !condition.showQuestions.includes(q.id)) return false;
            
            const conditionAnswer = answers[conditionQuestion.id];
            if (conditionAnswer === undefined || conditionAnswer === null) return false;
            
            if (conditionQuestion.type === 'yes_no') {
              return condition.answer === conditionAnswer;
            } else if (conditionQuestion.type === 'single_choice') {
              return condition.optionValue === conditionAnswer;
            }
            
            return false;
          });
        }
        
        // Multiple choice
        if (logic.conditionType) {
          // Для multiple_choice проверяем условия
          const conditionAnswer = answers[conditionQuestion.id];
          if (!Array.isArray(conditionAnswer)) return false;
          
          let conditionMet = false;
          if (logic.conditionType === 'any') {
            conditionMet = logic.options?.some((opt: string) => conditionAnswer.includes(opt)) || false;
          } else if (logic.conditionType === 'all') {
            conditionMet = logic.options?.every((opt: string) => conditionAnswer.includes(opt)) || false;
          } else if (logic.conditionType === 'count') {
            conditionMet = conditionAnswer.length >= (logic.minCount || 0);
          }
          
          // Если условие выполнено, проверяем, есть ли этот вопрос в showQuestions
          if (conditionMet && logic.conditions?.[0]?.showQuestions?.includes(q.id)) {
            return true;
          }
        }
        
        // Scale, Rating, Number
        if (logic.valueConditions && logic.valueConditions.length > 0) {
          return logic.valueConditions.some((condition: any) => {
            if (!condition.showQuestions || !condition.showQuestions.includes(q.id)) return false;
            
            const conditionAnswer = answers[conditionQuestion.id];
            if (typeof conditionAnswer !== 'number') return false;
            
            switch (condition.operator) {
              case 'less_than':
                return conditionAnswer < (condition.value || 0);
              case 'less_or_equal':
                return conditionAnswer <= (condition.value || 0);
              case 'equal':
                return conditionAnswer === (condition.value || 0);
              case 'greater_or_equal':
                return conditionAnswer >= (condition.value || 0);
              case 'greater_than':
                return conditionAnswer > (condition.value || 0);
              case 'range':
                return conditionAnswer >= (condition.min || 0) && conditionAnswer <= (condition.max || 0);
              default:
                return false;
            }
          });
        }
        
        // Date
        if (logic.dateConditions && logic.dateConditions.length > 0) {
          return logic.dateConditions.some((condition: any) => {
            if (!condition.showQuestions || !condition.showQuestions.includes(q.id)) return false;
            
            const conditionAnswer = answers[conditionQuestion.id];
            if (typeof conditionAnswer !== 'string') return false;
            
            const answerDate = new Date(conditionAnswer);
            if (isNaN(answerDate.getTime())) return false;
            
            switch (condition.operator) {
              case 'before':
                return answerDate < new Date(condition.date || '');
              case 'before_or_equal':
                return answerDate <= new Date(condition.date || '');
              case 'equal':
                return answerDate.toDateString() === new Date(condition.date || '').toDateString();
              case 'after_or_equal':
                return answerDate >= new Date(condition.date || '');
              case 'after':
                return answerDate > new Date(condition.date || '');
              case 'range':
                const startDate = new Date(condition.startDate || '');
                const endDate = new Date(condition.endDate || '');
                return answerDate >= startDate && answerDate <= endDate;
              default:
                return false;
            }
          });
        }
        
        return false;
      });
    });
  }, [shuffledQuestions, answers]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };
  
  const validateAllQuestions = (): boolean => {
    if (!survey) return false;
    
    const errors: Record<string, string> = {};
    
    visibleQuestions.forEach(question => {
      const answer = answers[question.id];
      const otherAnswer = answers[`${question.id}_other`];
      
      // Проверяем обязательные вопросы
      if (question.isRequired) {
        let isEmpty = false;
        if (!answer) {
          isEmpty = true;
        } else if (typeof answer === 'string' && answer.trim() === '') {
          isEmpty = true;
        } else if (Array.isArray(answer) && answer.length === 0) {
          isEmpty = true;
        } else if (answer === 'Другое' && !otherAnswer?.trim()) {
          isEmpty = true;
        } else if (Array.isArray(answer) && answer.includes('Другое') && !otherAnswer?.trim()) {
          isEmpty = true;
        }

        if (isEmpty) {
          errors[question.id] = 'Это обязательный вопрос';
        }
      }
      
      // Проверяем валидацию "Другое" для всех вопросов (обязательных и необязательных)
      if (answer === 'Другое' && !otherAnswer?.trim()) {
        errors[question.id] = 'Пожалуйста, введите ваш ответ в поле "Другое"';
      } else if (Array.isArray(answer) && answer.includes('Другое') && !otherAnswer?.trim()) {
        errors[question.id] = 'Пожалуйста, введите ваш ответ в поле "Другое"';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!survey || !surveyId) return;

    if (!validateAllQuestions()) {
      hapticFeedback?.error();
      const firstErrorId = Object.keys(validationErrors)[0];
      if (firstErrorId) {
        document.getElementById(`question-${firstErrorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setSubmitting(true);
    hapticFeedback?.medium();
    
    try {
      const formattedAnswers = visibleQuestions.map(q => {
        let answerValue = answers[q.id] || null;
        
        if (answerValue === 'Другое') {
          answerValue = answers[`${q.id}_other`] || null;
        }
        
        if (Array.isArray(answerValue) && answerValue.includes('Другое')) {
          const otherText = answers[`${q.id}_other`] || '';
          answerValue = answerValue
            .map((a: string) => (a === 'Другое' ? otherText : a))
            .filter((a: string) => a && String(a).trim() !== '');
        }

        return {
          question_id: q.id,
          answer_value: answerValue
        };
      });

      // Всегда передаем user_id для проверки oneResponsePerUser
      // Анонимность контролируется флагом is_anonymous в бэкенде
      await surveyApi.submitSurveyAnswers(surveyId, formattedAnswers, user?.id);
      
      hapticFeedback?.success();
      navigate(`/survey/${surveyId}/completed`, { 
        state: { 
          hasReward: survey.settings?.motivationEnabled,
          creatorUsername: survey.creatorUsername
        }
      });
    } catch (error: any) {
      console.error('Ошибка отправки ответов:', error);
      alert(error?.response?.data?.detail || 'Не удалось отправить ответы. Попробуйте снова.');
      hapticFeedback?.error();
    } finally {
        setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id];
    const error = validationErrors[question.id];

    const baseStyle: React.CSSProperties = {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '8px',
      border: error ? '1px solid var(--tg-destructive-text-color)' : 'none',
      backgroundColor: 'var(--tg-section-bg-color)',
      color: 'var(--tg-text-color)',
      fontSize: '16px',
      outline: 'none'
    };

    // Text
    if (question.type === 'text') {
      return (
        <input
          type="text"
          placeholder="Ваш ответ..."
          value={answer || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          style={baseStyle}
        />
      );
    }

    // Textarea
    if (question.type === 'textarea') {
      return (
        <textarea
          placeholder="Ваш ответ..."
          rows={4}
          value={answer || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          style={{
            ...baseStyle,
            resize: 'vertical' as const
          }}
        />
      );
    }

    // Date
    if (question.type === 'date') {
      return (
        <input
          type="date"
          value={answer || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          style={baseStyle}
        />
      );
    }

    // Number
    if (question.type === 'number') {
      return (
        <input
          type="number"
          placeholder="Введите число..."
          value={answer || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          style={baseStyle}
        />
      );
    }

    // Single Choice
    if (question.type === 'single_choice') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {question.options?.map((option: any, index: number) => {
            const optionText = typeof option === 'string' ? option : option.text;
            const isSelected = answer === optionText;
            
            return (
              <label key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: isSelected ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    checked={isSelected}
                    onChange={() => handleAnswerChange(question.id, optionText)}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    opacity: isSelected ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                  }} />
                </div>
                <span style={{ 
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  flex: 1
                }}>
                  {optionText}
                </span>
              </label>
            );
          })}
          
          {question.hasOtherOption && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${answer === 'Другое' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: answer === 'Другое' ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    checked={answer === 'Другое'}
                    onChange={() => handleAnswerChange(question.id, 'Другое')}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    opacity: answer === 'Другое' ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                  }} />
                </div>
                <span style={{ 
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  flex: 1
                }}>
                  Другое
                </span>
              </label>
              
              {answer === 'Другое' && (
                <div style={{ marginLeft: '32px' }}>
                  <input
                    type="text"
                    placeholder="Другое"
                    value={answers[`${question.id}_other`] || ''}
                    onChange={(e) => handleAnswerChange(`${question.id}_other`, e.target.value)}
                    style={{
                      ...baseStyle,
                      border: !answers[`${question.id}_other`] ? '1px solid #ff4444' : '1px solid #b0b0b0',
                      backgroundColor: 'var(--tg-bg-color)'
                    }}
                  />
                  {!answers[`${question.id}_other`] && (
                    <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '4px' }}>
                      Пожалуйста, введите ваш ответ
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Кнопка "Отменить выбор" */}
          {answer && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleAnswerChange(question.id, null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--tg-hint-color)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                Отменить выбор
              </button>
            </div>
          )}
        </div>
      );
    }

    // Multiple Choice
    if (question.type === 'multiple_choice') {
      const currentAnswers = Array.isArray(answer) ? answer : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {question.options?.map((option: any, index: number) => {
            const optionText = typeof option === 'string' ? option : option.text;
            const isChecked = currentAnswers.includes(optionText);
            
            return (
              <label key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: `2px solid ${isChecked ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: isChecked ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const newAnswers = e.target.checked
                        ? [...currentAnswers, optionText]
                        : currentAnswers.filter((a: string) => a !== optionText);
                      handleAnswerChange(question.id, newAnswers);
                    }}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -90%)',
                    width: '12px',
                    height: '12px',
                    opacity: isChecked ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                  </div>
                </div>
                <span style={{ 
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  flex: 1
                }}>
                  {optionText}
                </span>
              </label>
            );
          })}
          
          {question.hasOtherOption && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: `2px solid ${currentAnswers.includes('Другое') ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: currentAnswers.includes('Другое') ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={currentAnswers.includes('Другое')}
                    onChange={(e) => {
                      const newAnswers = e.target.checked
                        ? [...currentAnswers, 'Другое']
                        : currentAnswers.filter((a: string) => a !== 'Другое');
                      
                      if (!e.target.checked) {
                        handleAnswerChange(`${question.id}_other`, '');
                      }
                      
                      handleAnswerChange(question.id, newAnswers);
                    }}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -90%)',
                    width: '12px',
                    height: '12px',
                    opacity: currentAnswers.includes('Другое') ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                  </div>
                </div>
                <span style={{ 
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  flex: 1
                }}>
                  Другое
                </span>
              </label>
              
              {currentAnswers.includes('Другое') && (
                <div style={{ marginLeft: '32px' }}>
                  <input
                    type="text"
                    placeholder="Другое"
                    value={answers[`${question.id}_other`] || ''}
                    onChange={(e) => handleAnswerChange(`${question.id}_other`, e.target.value)}
                    style={{
                      ...baseStyle,
                      border: !answers[`${question.id}_other`] ? '1px solid #ff4444' : '1px solid #b0b0b0',
                      backgroundColor: 'var(--tg-bg-color)'
                    }}
                  />
                  {!answers[`${question.id}_other`] && (
                    <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '4px' }}>
                      Пожалуйста, введите ваш ответ
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // Scale
    if (question.type === 'scale') {
      const scaleMin = question.scaleMin || 1;
      const scaleMax = question.scaleMax || 10;
      const scaleValue = scaleValues[question.id] ?? answer ?? Math.floor((scaleMin + scaleMax) / 2);
      
      return (
        <div style={{ 
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--tg-section-separator-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: scaleValue === scaleMin ? 'var(--tg-button-color)' : 'var(--tg-text-color)',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {scaleMin}
            </span>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="range"
                min={scaleMin}
                max={scaleMax}
                value={scaleValue}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setScaleValues(prev => ({ ...prev, [question.id]: value }));
                  handleAnswerChange(question.id, value);
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  background: '#666',
                  borderRadius: '4px',
                  outline: 'none',
                  appearance: 'none' as const
                }}
              />
            </div>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: scaleValue === scaleMax ? 'var(--tg-button-color)' : 'var(--tg-text-color)',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {scaleMax}
            </span>
          </div>
          
          {scaleValue !== scaleMin && scaleValue !== scaleMax && (
            <div style={{ 
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '16px',
                color: 'var(--tg-button-color)',
                fontWeight: 'bold'
              }}>
                {scaleValue}
              </span>
            </div>
          )}
          
          {(question.scaleMinLabel || question.scaleMaxLabel) && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--tg-hint-color)'
            }}>
              <span>{question.scaleMinLabel || ''}</span>
              <span>{question.scaleMaxLabel || ''}</span>
            </div>
          )}
        </div>
      );
    }

    // Rating
    if (question.type === 'rating') {
      const maxRating = question.ratingMax || 5;
      const rating = ratingValues[question.id] ?? answer ?? 0;
      
      return (
        <div style={{ 
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--tg-section-separator-color)'
        }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {Array.from({ length: maxRating }, (_, i) => {
              const star = i + 1;
              return (
                <button
                  key={star}
                  onClick={() => {
                    setRatingValues(prev => ({ ...prev, [question.id]: star }));
                    handleAnswerChange(question.id, star);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <svg 
                    width="32" 
                    height="32" 
                    viewBox="0 0 24 24" 
                    fill={star <= rating ? "#ffd700" : "none"} 
                    stroke={star <= rating ? "#ffd700" : "var(--tg-hint-color)"} 
                    strokeWidth="2"
                  >
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Yes/No
    if (question.type === 'yes_no') {
      return (
        <div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}>
              <div style={{
                position: 'relative',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: `2px solid ${answer === 'yes' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: answer === 'yes' ? 'var(--tg-button-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={answer === 'yes'}
                  onChange={() => handleAnswerChange(question.id, 'yes')}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    cursor: 'pointer'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  opacity: answer === 'yes' ? 1 : 0,
                  transition: 'opacity 0.2s ease'
                }} />
              </div>
              <span style={{ color: 'var(--tg-text-color)' }}>Да</span>
            </label>
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}>
              <div style={{
                position: 'relative',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: `2px solid ${answer === 'no' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: answer === 'no' ? 'var(--tg-button-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={answer === 'no'}
                  onChange={() => handleAnswerChange(question.id, 'no')}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    cursor: 'pointer'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  opacity: answer === 'no' ? 1 : 0,
                  transition: 'opacity 0.2s ease'
                }} />
              </div>
              <span style={{ color: 'var(--tg-text-color)' }}>Нет</span>
            </label>
          </div>
          
          {/* Кнопка "Отменить выбор" */}
          {answer && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleAnswerChange(question.id, null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--tg-hint-color)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                Отменить выбор
              </button>
            </div>
          )}
        </div>
      );
    }

    return <div>Неподдерживаемый тип вопроса</div>;
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--tg-bg-color)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid var(--tg-button-color)', 
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ color: 'var(--tg-hint-color)' }}>Загрузка опроса...</p>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--tg-bg-color)',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😔</div>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: 'var(--tg-text-color)', 
            marginBottom: '12px' 
          }}>
            Опрос недоступен
          </h2>
          <p style={{ color: 'var(--tg-hint-color)', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
            {error}
          </p>
          
          {/* Дополнительный текст */}
          <p style={{
            fontSize: '12px',
            color: 'var(--tg-hint-color)',
            marginTop: '24px',
            lineHeight: '1.5'
          }}>
            Хотите создать свой опрос?
            <br />
            <button
              onClick={() => navigate('/')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--tg-link-color)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'none',
                padding: '0',
                margin: '0'
              }}
            >
              Откройте главную страницу AI Surveys
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' }}>{survey.title}</h1>
        {survey.description && <p style={{ fontSize: '14px', color: 'var(--tg-hint-color)', margin: 0, whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{survey.description}</p>}
      </div>

      <div style={{ padding: '0 20px 120px 20px' }}>
        {visibleQuestions.map((question, index) => (
            <motion.div
              key={question.id}
              id={`question-${question.id}`}
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ 
                paddingTop: '24px', 
                borderBottom: index < visibleQuestions.length - 1 ? '1px solid var(--tg-section-separator-color)' : 'none', 
                paddingBottom: '24px',
                overflow: 'hidden'
              }}
            >
            {question.imageUrl && (
              <div style={{ marginBottom: '20px' }}>
                <img 
                  src={question.imageUrl} 
                  alt="Question illustration"
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '12px'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                    {question.text}
                    {question.isRequired && <span style={{ color: 'var(--tg-destructive-text-color)', marginLeft: '4px' }}>*</span>}
                </h2>
                {question.description && <p style={{ fontSize: '14px', color: 'var(--tg-hint-color)', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{question.description}</p>}
                {validationErrors[question.id] && <p style={{ fontSize: '13px', color: 'var(--tg-destructive-text-color)', margin: '8px 0 0 0' }}>{validationErrors[question.id]}</p>}
            </div>

            <div>
              {renderQuestion(question)}
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px',
        backgroundColor: 'var(--tg-bg-color)', borderTop: '1px solid var(--tg-section-separator-color)',
      }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
            backgroundColor: 'var(--tg-button-color)', color: 'var(--tg-button-text-color)',
            fontSize: '16px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.5 : 1, transition: 'opacity 0.2s ease'
          }}
        >
          {submitting ? 'Отправка...' : 'Отправить ответы'}
        </button>
      </div>
    </div>
  );
}
