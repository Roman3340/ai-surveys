import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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
  };

  const validateCurrentQuestion = (): boolean => {
    if (!survey) return false;
    
    const currentQuestion = survey.questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];
    
    if (currentQuestion.isRequired) {
      if (!answer || 
          (typeof answer === 'string' && answer.trim() === '') ||
          (Array.isArray(answer) && answer.length === 0)) {
        alert('Этот вопрос обязателен для ответа');
        return false;
      }
    }
    
    return true;
  };

  const handleNextQuestion = () => {
    if (!survey) return;
    
    if (!validateCurrentQuestion()) return;
    
    hapticFeedback?.light();
    if (currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevQuestion = () => {
    hapticFeedback?.light();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!survey || !surveyId) return;
    
    if (!validateCurrentQuestion()) return;
    
    setSubmitting(true);
    hapticFeedback?.medium();
    
    try {
      // Формируем ответы в нужном формате для бэкенда
      const formattedAnswers = survey.questions.map(q => ({
        question_id: q.id,
        answer_value: answers[q.id] || null
      }));

      await surveyApi.submitSurveyAnswers(surveyId, formattedAnswers, user?.id);
      
      hapticFeedback?.success();
      navigate(`/survey/${surveyId}/completed`, { 
        state: { surveyTitle: survey.title, hasReward: survey.settings?.motivationEnabled }
      });
    } catch (error: any) {
      console.error('Ошибка отправки ответов:', error);
      alert(error?.response?.data?.detail || 'Не удалось отправить ответы. Попробуйте снова.');
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id];

    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Ваш ответ..."
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'var(--tg-section-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Ваш развернутый ответ..."
            rows={5}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'var(--tg-section-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        );

      case 'single_choice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options?.map((option: any, index: number) => {
              const optionText = typeof option === 'string' ? option : option.text;
              const isSelected = answer === optionText;
              
              return (
                <label
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                    backgroundColor: isSelected ? 'rgba(244, 109, 0, 0.1)' : 'var(--tg-section-bg-color)',
                    color: 'var(--tg-text-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleAnswerChange(question.id, optionText)}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSelected && (
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--tg-button-color)'
                      }} />
                    )}
                  </div>
                  <span style={{ fontSize: '15px' }}>{optionText}</span>
                </label>
              );
            })}
            
            {question.hasOtherOption && (
              <input
                type="text"
                value={answer?.startsWith('other:') ? answer.replace('other:', '') : ''}
                onChange={(e) => handleAnswerChange(question.id, `other:${e.target.value}`)}
                placeholder="Другое (укажите свой вариант)..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '15px',
                  outline: 'none'
                }}
              />
            )}
          </div>
        );

      case 'multiple_choice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options?.map((option: any, index: number) => {
              const optionText = typeof option === 'string' ? option : option.text;
              const currentAnswers = Array.isArray(answer) ? answer : [];
              const isSelected = currentAnswers.includes(optionText);
              
              return (
                <label
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                    backgroundColor: isSelected ? 'rgba(244, 109, 0, 0.1)' : 'var(--tg-section-bg-color)',
                    color: 'var(--tg-text-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    const newAnswers = isSelected
                      ? currentAnswers.filter((a: string) => a !== optionText)
                      : [...currentAnswers, optionText];
                    handleAnswerChange(question.id, newAnswers);
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                    backgroundColor: isSelected ? 'var(--tg-button-color)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSelected && (
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{ fontSize: '15px' }}>{optionText}</span>
                </label>
              );
            })}
          </div>
        );

      case 'scale':
        const scaleMin = question.scaleMin || 1;
        const scaleMax = question.scaleMax || 10;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--tg-hint-color)' }}>
                {question.scaleMinLabel || scaleMin}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--tg-hint-color)' }}>
                {question.scaleMaxLabel || scaleMax}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => {
                const value = scaleMin + i;
                const isSelected = answer === value;
                
                return (
                  <button
                    key={value}
                    onClick={() => handleAnswerChange(question.id, value)}
                    style={{
                      minWidth: '44px',
                      height: '44px',
                      padding: '0 8px',
                      borderRadius: '12px',
                      border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                      backgroundColor: isSelected ? 'var(--tg-button-color)' : 'var(--tg-section-bg-color)',
                      color: isSelected ? 'white' : 'var(--tg-text-color)',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'rating':
        const maxRating = question.ratingMax || 5;
        
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '12px 0' }}>
            {Array.from({ length: maxRating }, (_, i) => {
              const starValue = i + 1;
              const isSelected = answer && starValue <= answer;
              
              return (
                <button
                  key={starValue}
                  onClick={() => handleAnswerChange(question.id, starValue)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Star 
                    size={32}
                    fill={isSelected ? '#FFD700' : 'none'} 
                    stroke={isSelected ? '#FFD700' : 'var(--tg-hint-color)'}
                    strokeWidth={2}
                  />
                </button>
              );
            })}
          </div>
        );

      case 'yes_no':
        return (
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { text: 'Да', emoji: '✅', color: '#34C759' },
              { text: 'Нет', emoji: '❌', color: '#FF3B30' }
            ].map((option) => {
              const isSelected = answer === option.text;
              
              return (
                <button
                  key={option.text}
                  onClick={() => handleAnswerChange(question.id, option.text)}
                  style={{
                    flex: 1,
                    padding: '16px 24px',
                    borderRadius: '12px',
                    border: `2px solid ${isSelected ? option.color : 'var(--tg-section-separator-color)'}`,
                    backgroundColor: isSelected ? option.color : 'var(--tg-section-bg-color)',
                    color: isSelected ? 'white' : 'var(--tg-text-color)',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{option.emoji}</span>
                  {option.text}
                </button>
              );
            })}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '2px solid var(--tg-button-color)',
              backgroundColor: 'var(--tg-section-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            inputMode="numeric"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Введите число..."
            min={question.validation?.min}
            max={question.validation?.max}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'var(--tg-section-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              outline: 'none'
            }}
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

  const currentQuestion = survey.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / survey.questions.length) * 100;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === survey.questions.length - 1;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '120px'
    }}>
      {/* Шапка с прогрессом */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        backgroundColor: 'var(--tg-bg-color)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            margin: '0 0 8px 0'
          }}>
            {survey.title}
          </h1>
          {survey.description && (
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--tg-hint-color)',
              margin: 0
            }}>
              {survey.description}
            </p>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            flex: 1,
            height: '6px',
            backgroundColor: 'rgba(244, 109, 0, 0.15)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: 'var(--tg-button-color)',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ 
            fontSize: '13px', 
            color: 'var(--tg-hint-color)',
            fontWeight: '500',
            minWidth: '60px',
            textAlign: 'right'
          }}>
            {currentQuestionIndex + 1} / {survey.questions.length}
          </span>
        </div>
      </div>

      {/* Вопрос */}
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        style={{
          padding: '24px 20px'
        }}
      >
        {/* Изображение вопроса */}
        {currentQuestion.imageUrl && (
          <div style={{ marginBottom: '20px' }}>
            <img 
              src={currentQuestion.imageUrl} 
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
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 8px 0',
            lineHeight: '1.4'
          }}>
            {currentQuestion.text}
            {currentQuestion.isRequired && (
              <span style={{ color: 'var(--tg-button-color)', marginLeft: '4px' }}>*</span>
            )}
          </h2>
          {currentQuestion.description && (
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--tg-hint-color)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Поле ответа */}
        <div>
          {renderQuestion(currentQuestion)}
        </div>
      </motion.div>

      {/* Навигация */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 20px',
        backgroundColor: 'var(--tg-bg-color)',
        borderTop: '1px solid var(--tg-section-separator-color)',
        display: 'flex',
        gap: '12px'
      }}>
        {!isFirstQuestion && (
          <button
            onClick={handlePrevQuestion}
            disabled={submitting}
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'var(--tg-section-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '15px',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: submitting ? 0.5 : 1
            }}
          >
            <ChevronLeft size={20} />
            Назад
          </button>
        )}
        
        {!isLastQuestion ? (
          <button
            onClick={handleNextQuestion}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'var(--tg-button-color)',
              color: 'var(--tg-button-text-color)',
              fontSize: '15px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: submitting ? 0.5 : 1
            }}
          >
            Далее
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'var(--tg-button-color)',
              color: 'var(--tg-button-text-color)',
              fontSize: '15px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: submitting ? 0.5 : 1
            }}
          >
            {submitting ? 'Отправка...' : '✓ Отправить ответы'}
          </button>
        )}
      </div>
    </div>
  );
}

