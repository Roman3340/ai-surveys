import { useState, useEffect } from 'react';
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
      } catch (e: any) {
        console.error(e);
        setError(e?.response?.data?.detail || 'Не удалось загрузить опрос');
      } finally {
        setLoading(false);
      }
    };
    loadSurvey();
  }, [surveyId, user?.id]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    // Сбрасываем ошибку валидации при изменении ответа
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
    
    survey.questions.forEach(question => {
      if (question.isRequired) {
        const answer = answers[question.id];
        const otherAnswer = answers[`${question.id}_other`];
        
        let isEmpty = false;
        if (!answer) {
          isEmpty = true;
        } else if (typeof answer === 'string' && answer.trim() === '') {
          isEmpty = true;
        } else if (Array.isArray(answer) && answer.length === 0) {
          isEmpty = true;
        } else if (answer === 'Другое' && !otherAnswer?.trim()) {
          // Для single_choice с "Другое"
          isEmpty = true;
        } else if (Array.isArray(answer) && answer.includes('Другое') && !otherAnswer?.trim()) {
          // Для multiple_choice с "Другое"
          isEmpty = true;
        }

        if (isEmpty) {
          errors[question.id] = 'Это обязательный вопрос';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!survey || !surveyId) return;

    if (!validateAllQuestions()) {
      hapticFeedback?.error();
      // Найдем первый вопрос с ошибкой и прокрутим к нему
      const firstErrorId = Object.keys(validationErrors)[0];
      if (firstErrorId) {
        document.getElementById(`question-${firstErrorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setSubmitting(true);
    hapticFeedback?.medium();
    
    try {
      const formattedAnswers = survey.questions.map(q => {
        let answerValue = answers[q.id] || null;
        
        // Обработка "Другого" варианта для single_choice
        if (answerValue === 'Другое') {
          answerValue = answers[`${q.id}_other`] || null;
        }
        
        // Обработка "Другого" варианта для multiple_choice
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

    const baseStyle = {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '8px',
      border: error ? '1px solid var(--tg-destructive-text-color)' : 'none',
      backgroundColor: 'var(--tg-section-bg-color)',
      color: 'var(--tg-text-color)',
      fontSize: '16px',
      outline: 'none'
    };

    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder="Ваш ответ..."
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={baseStyle}
          />
        );

      case 'textarea':
        return (
          <textarea
            placeholder="Ваш ответ..."
            rows={4}
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={{
              ...baseStyle,
              resize: 'vertical'
            }}
          />
        );

      case 'single_choice':
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
          </div>
        );

      case 'multiple_choice':
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
                          // Также очищаем текст "Другое"
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
      
      case 'scale':
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
                    appearance: 'none'
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

      case 'rating':
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

      case 'yes_no':
        return (
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
        );

      case 'date':
        return (
          <input
            type="date"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={baseStyle}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            placeholder="Введите число..."
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={baseStyle}
          />
        );

      default:
        return <div>Неподдерживаемый тип вопроса</div>;
    }
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
          <p style={{ color: 'var(--tg-hint-color)', fontSize: '15px', lineHeight: '1.5' }}>
            {error}
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
      {/* Шапка опроса */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' }}>{survey.title}</h1>
        {survey.description && <p style={{ fontSize: '14px', color: 'var(--tg-hint-color)', margin: 0 }}>{survey.description}</p>}
      </div>

      {/* Список вопросов */}
      <div style={{ padding: '0 20px 120px 20px' }}>
        {survey.questions.map((question, index) => (
          <motion.div
            key={question.id}
            id={`question-${question.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{ paddingTop: '24px', borderBottom: index < survey.questions.length - 1 ? '1px solid var(--tg-section-separator-color)' : 'none', paddingBottom: '24px' }}
          >
            {/* Изображение вопроса */}
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

            {/* Текст вопроса */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                    {question.text}
                    {question.isRequired && <span style={{ color: 'var(--tg-destructive-text-color)', marginLeft: '4px' }}>*</span>}
                </h2>
                {question.description && <p style={{ fontSize: '14px', color: 'var(--tg-hint-color)', margin: 0, lineHeight: '1.5' }}>{question.description}</p>}
                {validationErrors[question.id] && <p style={{ fontSize: '13px', color: 'var(--tg-destructive-text-color)', margin: '8px 0 0 0' }}>{validationErrors[question.id]}</p>}
            </div>

            <div>
              {renderQuestion(question)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Кнопка отправки */}
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
