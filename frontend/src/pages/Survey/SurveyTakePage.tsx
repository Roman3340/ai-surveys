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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const loadSurvey = async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        const response = await surveyApi.getSurveyPublic(surveyId, user?.id);
        
        if (!response.canParticipate) {
          setError(response.participationMessage || 'Участие в опросе недоступно');
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
    setAnswers(prev => {
        const newAnswers = { ...prev };
        const question = survey?.questions.find(q => q.id === questionId);

        if (question?.type === 'single_choice' && !questionId.startsWith(OTHER_INPUT_PREFIX) && value !== OTHER_OPTION_VALUE) {
            delete newAnswers[OTHER_INPUT_PREFIX + questionId];
        }

        newAnswers[questionId] = value;
        return newAnswers;
    });

    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };
  
  const validateAllQuestions = (): Record<string, string> => {
    if (!survey) return {};
    const errors: Record<string, string> = {};
    survey.questions.forEach(question => {
      if (question.isRequired) {
        const answer = answers[question.id];
        let isEmpty = false;
        if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '') || (Array.isArray(answer) && answer.length === 0)) {
          isEmpty = true;
        } else if (
            (question.type === 'single_choice' && answer === OTHER_OPTION_VALUE && !answers[OTHER_INPUT_PREFIX + question.id]?.trim()) ||
            (question.type === 'multiple_choice' && Array.isArray(answer) && answer.includes(OTHER_OPTION_VALUE) && !answers[OTHER_INPUT_PREFIX + question.id]?.trim())
        ) {
            isEmpty = true;
        }
        if (isEmpty) {
          errors[question.id] = 'Это обязательный вопрос';
        }
      }
    });
    setValidationErrors(errors);
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateAllQuestions();
    if (Object.keys(errors).length > 0) {
      hapticFeedback?.error();
      const firstErrorId = Object.keys(errors)[0];
      if (firstErrorId) {
        document.getElementById(`question-${firstErrorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    if (!survey || !surveyId) return;
    setSubmitting(true);
    hapticFeedback?.medium();
    
    try {
        const formattedAnswers = survey.questions.map(q => {
            let answerValue = answers[q.id];
            if ((q.type === 'single_choice' || q.type === 'multiple_choice') && q.hasOtherOption) {
                const otherInput = answers[OTHER_INPUT_PREFIX + q.id];
                if (q.type === 'multiple_choice' && Array.isArray(answerValue)) {
                    answerValue = answerValue.map(a => a === OTHER_OPTION_VALUE ? otherInput || '' : a).filter(Boolean);
                } else if (q.type === 'single_choice' && answerValue === OTHER_OPTION_VALUE) {
                    answerValue = otherInput || null;
                }
            }
            return {
              question_id: q.id,
              answer_value: answerValue === undefined ? null : answerValue,
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
    const baseInputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 16px', borderRadius: '8px',
        border: `1px solid ${error ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
        backgroundColor: 'var(--tg-section-bg-color)', color: 'var(--tg-text-color)',
        fontSize: '16px', outline: 'none'
    };

    switch (question.type) {
        case 'text':
            return <input type="text" value={answer || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} placeholder="Ваш ответ..." style={baseInputStyle} />;
        case 'textarea':
            return <textarea value={answer || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} placeholder="Ваш развернутый ответ..." rows={4} style={{ ...baseInputStyle, resize: 'vertical', fontFamily: 'inherit' }} />;
        case 'single_choice':
        case 'multiple_choice':
            const isMultiple = question.type === 'multiple_choice';
            const currentAnswers = Array.isArray(answer) ? answer : (answer ? [answer] : []);
            const otherAnswer = answers[OTHER_INPUT_PREFIX + question.id] || '';
            const handleSelection = (optionText: string) => {
                let newAnswers;
                if (isMultiple) {
                    newAnswers = currentAnswers.includes(optionText)
                        ? currentAnswers.filter((a: string) => a !== optionText)
                        : [...currentAnswers, optionText];
                } else { newAnswers = optionText; }
                handleAnswerChange(question.id, newAnswers);
            };
            const renderOption = (optionText: string, isOther: boolean = false) => {
                const valueToToggle = isOther ? OTHER_OPTION_VALUE : optionText;
                const isSelected = currentAnswers.includes(valueToToggle);
                return (
                    <div key={valueToToggle}>
                        <label
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px',
                                border: `1px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                                backgroundColor: isSelected ? 'rgba(244, 109, 0, 0.1)' : 'var(--tg-section-bg-color)',
                                color: 'var(--tg-text-color)', cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                            onClick={() => handleSelection(valueToToggle)}
                        >
                            <div style={{
                                width: '20px', height: '20px', borderRadius: isMultiple ? '4px' : '50%', flexShrink: 0,
                                border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                                backgroundColor: isSelected && isMultiple ? 'var(--tg-button-color)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {isSelected && !isMultiple && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--tg-button-color)' }} />}
                                {isSelected && isMultiple && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                            </div>
                            <span>{optionText}</span>
                        </label>
                        {isOther && isSelected && (
                             <motion.div initial={{ opacity: 0, marginTop: -10 }} animate={{ opacity: 1, marginTop: 8 }} transition={{ duration: 0.3 }}>
                                <input
                                    type="text"
                                    value={otherAnswer}
                                    onChange={(e) => handleAnswerChange(OTHER_INPUT_PREFIX + question.id, e.target.value)}
                                    placeholder="Напишите свой вариант..."
                                    style={{ ...baseInputStyle, width: 'calc(100% - 32px)', marginLeft: '32px' }}
                                />
                            </motion.div>
                        )}
                    </div>
                );
            };
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {question.options?.map((option: any) => renderOption(typeof option === 'string' ? option : option.text))}
                    {question.hasOtherOption && renderOption('Другое', true)}
                </div>
            );
        case 'scale':
            const scaleMin = question.scaleMin || 1;
            const scaleMax = question.scaleMax || 5;
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>{question.scaleMinLabel || scaleMin}</span>
                        <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>{question.scaleMaxLabel || scaleMax}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => {
                            const value = scaleMin + i;
                            return (
                                <button
                                    key={value}
                                    onClick={() => handleAnswerChange(question.id, value)}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        border: `1px solid ${answer === value ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                                        backgroundColor: answer === value ? 'var(--tg-button-color)' : 'var(--tg-section-bg-color)',
                                        color: answer === value ? 'var(--tg-button-text-color)' : 'var(--tg-text-color)',
                                        fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease'
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
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '8px 0' }}>
                    {Array.from({ length: maxRating }, (_, i) => {
                        const starValue = i + 1;
                        return (
                            <button
                                key={starValue}
                                onClick={() => handleAnswerChange(question.id, starValue)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', transition: 'transform 0.2s ease', color: (answer && starValue <= answer) ? '#FFD700' : 'var(--tg-hint-color)' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <Star size={36} fill={(answer && starValue <= answer) ? 'currentColor' : 'none'} strokeWidth={1.5} />
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
                                    flex: 1, padding: '12px 24px', borderRadius: '8px',
                                    border: isSelected ? `2px solid ${option.color}` : '1px solid var(--tg-section-separator-color)',
                                    backgroundColor: isSelected ? option.color : 'var(--tg-section-bg-color)',
                                    color: isSelected ? 'white' : 'var(--tg-text-color)',
                                    fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                <span style={{ fontSize: '18px' }}>{option.emoji}</span>
                                {option.text}
                            </button>
                        );
                    })}
                </div>
            );
        case 'date':
            return <input type="date" value={answer || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} style={{ ...baseInputStyle, border: `2px solid ${error ? '#FF3B30' : 'var(--tg-button-color)'}` }} />;
        case 'number':
            return <input type="number" inputMode="numeric" value={answer || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} placeholder="Введите число..." min={question.validation?.min} max={question.validation?.max} style={baseInputStyle} />;
        default:
            return <div>Неподдерживаемый тип вопроса: {question.type}</div>;
    }
  };

  if (loading) { return <div>Загрузка...</div> }
  if (error) { return <div>Ошибка: {error}</div> }
  if (!survey) { return <div>Опрос не найден.</div> }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', paddingBottom: '100px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--tg-section-separator-color)', backgroundColor: 'var(--tg-bg-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>{survey.title}</h1>
        {survey.description && <p style={{ fontSize: '14px', color: 'var(--tg-hint-color)', margin: 0, lineHeight: 1.5 }}>{survey.description}</p>}
      </div>

      <div style={{ padding: '0 16px' }}>
        {survey.questions.sort((a, b) => a.orderIndex - b.orderIndex).map((question, index) => (
          <motion.div
            key={question.id}
            id={`question-${question.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{ padding: '24px 0', borderBottom: index < survey.questions.length - 1 ? '1px solid var(--tg-section-separator-color)' : 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                  minWidth: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--tg-button-color)', color: 'var(--tg-button-text-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600'
              }}>
                  {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                      {question.text}
                      {question.isRequired && <span style={{ color: '#FF3B30', marginLeft: '4px' }}>*</span>}
                  </h3>
                  {question.description && <p style={{ fontSize: '14px', color: 'var(--tg-hint-color)', margin: 0, lineHeight: '1.5' }}>{question.description}</p>}
                  {validationErrors[question.id] && <p style={{ fontSize: '13px', color: '#FF3B30', margin: '8px 0 0 0', fontWeight: 500 }}>{validationErrors[question.id]}</p>}
              </div>
            </div>
            
            <div style={{ marginLeft: '36px' }}>
              {renderQuestion(question)}
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', backgroundColor: 'var(--tg-bg-color)', borderTop: '1px solid var(--tg-section-separator-color)' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            backgroundColor: 'var(--tg-button-color)', color: 'var(--tg-button-text-color)',
            fontSize: '16px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1, transition: 'all 0.2s ease'
          }}
        >
          {submitting ? 'Отправка...' : 'Отправить ответы'}
        </button>
      </div>
    </div>
  );
}

