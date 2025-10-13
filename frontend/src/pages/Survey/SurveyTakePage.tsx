import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
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

const OTHER_INPUT_PREFIX = 'other_input_';
const OTHER_OPTION_VALUE = 'other_option_value';


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
        
        let isEmpty = false;
        if (!answer) {
          isEmpty = true;
        } else if (typeof answer === 'string' && answer.trim() === '') {
          isEmpty = true;
        } else if (Array.isArray(answer) && answer.length === 0) {
          isEmpty = true;
        } else if (
            question.hasOtherOption && 
            answer === OTHER_OPTION_VALUE &&
            !answers[OTHER_INPUT_PREFIX + question.id]?.trim()
        ) {
            // Если выбрано "Другое", но текстовое поле пустое
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
      const firstErrorId = Object.keys(validationErrors)[0] || (survey.questions.find(q => validationErrors[q.id])?.id);
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
        
        // Обработка "Другого" варианта
        if (q.hasOtherOption && answerValue === OTHER_OPTION_VALUE) {
            answerValue = answers[OTHER_INPUT_PREFIX + q.id] || null;
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
        const otherAnswer = answers[OTHER_INPUT_PREFIX + question.id] || '';

        const baseInputStyle: React.CSSProperties = {
            width: '100%',
            padding: '14px 16px',
            borderRadius: '12px',
            border: `1px solid ${error ? 'var(--tg-destructive-text-color)' : 'var(--tg-section-separator-color)'}`,
            backgroundColor: 'var(--tg-section-bg-color)',
            color: 'var(--tg-text-color)',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
        };

        switch (question.type) {
            case 'text':
                return <input type="text" value={answer || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} placeholder="Ваш ответ..." style={baseInputStyle} />;
            
            case 'textarea':
                return <textarea value={answer || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} placeholder="Ваш развернутый ответ..." rows={5} style={{ ...baseInputStyle, resize: 'vertical', fontFamily: 'inherit' }} />;

            case 'single_choice':
            case 'multiple_choice':
                const isMultiple = question.type === 'multiple_choice';
                const currentAnswers = Array.isArray(answer) ? answer : (answer ? [answer] : []);

                const handleSelection = (optionText: string) => {
                    if (isMultiple) {
                        const newAnswers = currentAnswers.includes(optionText)
                            ? currentAnswers.filter((a: string) => a !== optionText)
                            : [...currentAnswers, optionText];
                        handleAnswerChange(question.id, newAnswers);
                    } else {
                        handleAnswerChange(question.id, optionText);
                    }
                };

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {question.options?.map((option: any, index: number) => {
                            const optionText = typeof option === 'string' ? option : option.text;
                            const isSelected = currentAnswers.includes(optionText);
                            return (
                                <label
                                    key={index}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px',
                                        border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                                        backgroundColor: isSelected ? 'rgba(244, 109, 0, 0.1)' : 'var(--tg-section-bg-color)',
                                        color: 'var(--tg-text-color)', cursor: 'pointer', transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => handleSelection(optionText)}
                                >
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: isMultiple ? '4px' : '50%',
                                        border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                                        backgroundColor: isSelected && isMultiple ? 'var(--tg-button-color)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        {isSelected && !isMultiple && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--tg-button-color)' }} />}
                                        {isSelected && isMultiple && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                                    </div>
                                    <span style={{ fontSize: '15px' }}>{optionText}</span>
                                </label>
                            );
                        })}
                        {question.hasOtherOption && (
                            <>
                                <label
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px',
                                        border: `2px solid ${currentAnswers.includes(OTHER_OPTION_VALUE) ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                                        backgroundColor: currentAnswers.includes(OTHER_OPTION_VALUE) ? 'rgba(244, 109, 0, 0.1)' : 'var(--tg-section-bg-color)',
                                        cursor: 'pointer', transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => handleSelection(OTHER_OPTION_VALUE)}
                                >
                                     <div style={{
                                        width: '20px', height: '20px', borderRadius: isMultiple ? '4px' : '50%',
                                        border: `2px solid ${currentAnswers.includes(OTHER_OPTION_VALUE) ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                                        backgroundColor: currentAnswers.includes(OTHER_OPTION_VALUE) && isMultiple ? 'var(--tg-button-color)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        {currentAnswers.includes(OTHER_OPTION_VALUE) && !isMultiple && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--tg-button-color)' }} />}
                                        {currentAnswers.includes(OTHER_OPTION_VALUE) && isMultiple && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                                    </div>
                                    <span style={{ fontSize: '15px' }}>Другое</span>
                                </label>
                                {currentAnswers.includes(OTHER_OPTION_VALUE) && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
                                        <input
                                            type="text"
                                            value={otherAnswer}
                                            onChange={(e) => handleAnswerChange(OTHER_INPUT_PREFIX + question.id, e.target.value)}
                                            placeholder="Напишите свой вариант..."
                                            style={{ ...baseInputStyle, marginTop: '8px' }}
                                        />
                                    </motion.div>
                                )}
                            </>
                        )}
                    </div>
                );

            case 'scale':
                const scaleMin = question.scaleMin || 1;
                const scaleMax = question.scaleMax || 5;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--tg-hint-color)' }}>{question.scaleMinLabel || scaleMin}</span>
                            <span style={{ fontSize: '13px', color: 'var(--tg-hint-color)' }}>{question.scaleMaxLabel || scaleMax}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => {
                                const value = scaleMin + i;
                                return (
                                    <button
                                        key={value}
                                        onClick={() => handleAnswerChange(question.id, value)}
                                        style={{
                                            minWidth: '44px', height: '44px', borderRadius: '50%', padding: '0 8px',
                                            border: '2px solid var(--tg-section-separator-color)',
                                            backgroundColor: answer === value ? 'var(--tg-button-color)' : 'var(--tg-section-bg-color)',
                                            color: answer === value ? 'var(--tg-button-text-color)' : 'var(--tg-text-color)',
                                            fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease'
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
                            return (
                                <button
                                    key={starValue}
                                    onClick={() => handleAnswerChange(question.id, starValue)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', transition: 'transform 0.2s ease' }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <Star size={36} fill={(answer && starValue <= answer) ? '#FFD700' : 'var(--tg-section-bg-color)'} stroke={(answer && starValue <= answer) ? '#FFD700' : 'var(--tg-hint-color)'} strokeWidth={1.5} />
                                </button>
                            );
                        })}
                    </div>
                );

            case 'yes_no':
                return (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {[{ text: 'Да', emoji: '✅', color: '#34C759' }, { text: 'Нет', emoji: '❌', color: '#FF3B30' }].map((option) => {
                            const isSelected = answer === option.text;
                            return (
                                <button
                                    key={option.text}
                                    onClick={() => handleAnswerChange(question.id, option.text)}
                                    style={{
                                        flex: 1, padding: '16px 24px', borderRadius: '12px',
                                        border: `2px solid ${isSelected ? option.color : 'var(--tg-section-separator-color)'}`,
                                        backgroundColor: isSelected ? option.color : 'var(--tg-section-bg-color)',
                                        color: isSelected ? 'white' : 'var(--tg-text-color)',
                                        fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
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
                return <input type="date" value={answer || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} style={{...baseInputStyle, border: `2px solid ${error ? 'var(--tg-destructive-text-color)' : 'var(--tg-button-color)'}` }} />;

            case 'number':
                return <input type="number" inputMode="numeric" value={answer || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} placeholder="Введите число..." min={question.validation?.min} max={question.validation?.max} style={baseInputStyle} />;

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

