import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Send, Star } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { getDraft, saveQuestions, saveSettings } from '../../utils/surveyDraft';
import { surveysAPI, type CreateSurveyRequest } from '../../api/surveys';
import { useAppStore } from '../../store/useAppStore';
import type { Question } from '../../types';

interface SurveyData {
  title: string;
  description: string;
  questions: Question[];
  settings: {
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    maxParticipants?: string;
    motivation?: string;
    rewardValue?: string;
    rewardDescription?: string;
  };
}

interface PreviewAnswers {
  [questionId: string]: any;
}

const SurveyPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hapticFeedback, user: telegramUser } = useTelegram();
  const { user, addSurvey } = useAppStore();
  
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [answers, setAnswers] = useState<PreviewAnswers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);

  // Прокрутка к верху при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Получаем данные опроса из state или из черновика
    const data = location.state?.surveyData;
    if (data) {
      setSurveyData(data);
      // Обновим черновик, чтобы ничего не потерять
      saveQuestions(data.questions as any);
      saveSettings(data.settings as any);
    } else {
      const draft = getDraft();
      if (draft?.questions && draft.settings) {
        setSurveyData({
          title: draft.settings.title || 'Новый опрос',
          description: draft.settings.description || '',
          questions: draft.questions as any,
          settings: draft.settings as any
        } as any);
      } else {
        navigate('/survey/create/manual/questions');
      }
    }
  }, [location.state, navigate]);

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/survey/create/manual/questions'
  });

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNextQuestion = () => {
    if (!surveyData) return;
    
    const currentQuestion = surveyData.questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];
    
    // Проверяем обязательные вопросы
    if (currentQuestion.required) {
      if (!answer || 
          (typeof answer === 'string' && answer.trim() === '') ||
          (Array.isArray(answer) && answer.length === 0)) {
        alert('Этот вопрос обязателен для ответа');
        return;
      }
    }
    
    hapticFeedback?.light();
    if (currentQuestionIndex < surveyData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    hapticFeedback?.light();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handlePublishSurvey = async () => {
    if (!surveyData) return;
    
    const currentQuestion = surveyData.questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id];
    
    // Проверяем последний вопрос, если он обязательный
    if (currentQuestion.required) {
      if (!answer || 
          (typeof answer === 'string' && answer.trim() === '') ||
          (Array.isArray(answer) && answer.length === 0)) {
        alert('Этот вопрос обязателен для ответа');
        return;
      }
    }
    
    setIsPublishing(true);
    hapticFeedback?.success();
    
    try {
      // Получаем ID пользователя
      const userId = user?.telegramId || telegramUser?.id;
      if (!userId) {
        throw new Error('Пользователь не найден');
      }
      
      // Подготавливаем данные для API
      const surveyRequest: CreateSurveyRequest = {
        title: surveyData.title,
        description: surveyData.description,
        creatorId: userId,
        creationType: 'manual',
        questions: surveyData.questions.map(q => ({
          id: q.id,
          type: q.type,
          title: q.title,
          description: q.description,
          required: q.required,
          order: q.order,
          options: q.options,
          validation: q.validation
        })),
        settings: surveyData.settings
      };
      
      // Отправляем запрос на создание опроса
      const response = await surveysAPI.createSurvey(surveyRequest);
      
      // Добавляем опрос в локальное хранилище
      const newSurvey = {
        id: response.survey.id.toString(),
        title: response.survey.title,
        description: response.survey.description || '',
        creatorId: response.survey.user_id,
        isPublished: response.survey.is_published,
        isPublic: true,
        createdAt: response.survey.created_at,
        updatedAt: response.survey.updated_at || response.survey.created_at,
        questions: response.questions.map(q => ({
          id: q.id.toString(),
          surveyId: response.survey.id.toString(),
          type: q.type as any,
          title: q.title,
          description: q.description,
          required: q.required,
          order: q.order,
          options: q.options || [],
          validation: q.validation || {}
        })),
        responses: [],
        settings: {
          allowAnonymous: true,
          showProgress: true,
          randomizeQuestions: false,
          oneResponsePerUser: true,
          collectTelegramData: true,
          creationType: 'manual' as const
        }
      };
      
      addSurvey(newSurvey);
      
      // Очищаем черновик
      try {
        localStorage.removeItem('surveyPreviewData');
        localStorage.removeItem('surveyDraft');
        localStorage.removeItem('surveySettings');
      } catch {}
      
      alert('Опрос успешно опубликован!');
      navigate('/');
      
    } catch (error) {
      console.error('Ошибка при публикации опроса:', error);
      alert(`Ошибка при публикации опроса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const renderQuestionPreview = (question: Question) => {
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
              padding: '12px 16px',
              borderRadius: '8px',
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
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'var(--tg-section-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        );

      case 'single_choice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options?.map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: answer === (typeof option === 'string' ? option : option.text) ? 'var(--tg-button-color)' : 'var(--tg-section-bg-color)',
                  color: answer === (typeof option === 'string' ? option : option.text) ? 'var(--tg-button-text-color)' : 'var(--tg-text-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleAnswerChange(question.id, typeof option === 'string' ? option : option.text)}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answer === (typeof option === 'string' ? option : option.text)}
                  onChange={() => handleAnswerChange(question.id, typeof option === 'string' ? option : option.text)}
                  style={{ margin: 0 }}
                />
                <span>{typeof option === 'string' ? option : option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple_choice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options?.map((option, index) => {
              const optionText = typeof option === 'string' ? option : option.text;
              const isSelected = Array.isArray(answer) && answer.includes(optionText);
              return (
                <label
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--tg-section-separator-color)',
                    backgroundColor: isSelected ? 'var(--tg-button-color)' : 'var(--tg-section-bg-color)',
                    color: isSelected ? 'var(--tg-button-text-color)' : 'var(--tg-text-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    const currentAnswers = Array.isArray(answer) ? answer : [];
                    const newAnswers = isSelected
                      ? currentAnswers.filter(a => a !== optionText)
                      : [...currentAnswers, optionText];
                    handleAnswerChange(question.id, newAnswers);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ margin: 0 }}
                  />
                  <span>{optionText}</span>
                </label>
              );
            })}
          </div>
        );

      case 'scale':
        const scaleMin = question.validation?.min || 1;
        const scaleMax = question.validation?.max || 5;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>{scaleMin}</span>
              <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>{scaleMax}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => {
                const value = scaleMin + i;
                return (
                  <button
                    key={value}
                    onClick={() => handleAnswerChange(question.id, value)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid var(--tg-section-separator-color)',
                      backgroundColor: answer === value ? 'var(--tg-button-color)' : 'var(--tg-section-bg-color)',
                      color: answer === value ? 'var(--tg-button-text-color)' : 'var(--tg-text-color)',
                      fontSize: '16px',
                      fontWeight: '500',
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
        const maxRating = question.validation?.max || 5;
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {Array.from({ length: maxRating }, (_, i) => {
              const starValue = i + 1;
              return (
                <button
                  key={starValue}
                  onClick={() => handleAnswerChange(question.id, starValue)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px',
                    color: (answer && starValue <= answer) ? '#FFD700' : 'var(--tg-hint-color)',
                    transition: 'color 0.2s ease'
                  }}
                >
                  <Star fill={(answer && starValue <= answer) ? '#FFD700' : 'none'} />
                </button>
              );
            })}
          </div>
        );

       case 'yes_no':
         return (
           <div style={{ display: 'flex', gap: '12px' }}>
             {[
               { text: 'Да', sticker: '✅' },
               { text: 'Нет', sticker: '❌' }
             ].map((option) => {
               const isSelected = answer === option.text;
               const isYes = option.text === 'Да';
               const selectedColor = isYes ? '#34C759' : '#FF3B30';
               
               return (
                 <button
                   key={option.text}
                   onClick={() => handleAnswerChange(question.id, option.text)}
                   style={{
                     flex: 1,
                     padding: '12px 24px',
                     borderRadius: '8px',
                     border: isSelected ? `2px solid ${selectedColor}` : '1px solid var(--tg-section-separator-color)',
                     backgroundColor: isSelected ? selectedColor : 'var(--tg-section-bg-color)',
                     color: isSelected ? 'white' : 'var(--tg-text-color)',
                     fontSize: '16px',
                     fontWeight: '500',
                     cursor: 'pointer',
                     transition: 'all 0.2s ease',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: '8px'
                   }}
                 >
                   <span style={{ fontSize: '18px' }}>{option.sticker}</span>
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
              padding: '12px 16px',
              borderRadius: '8px',
              border: '2px solid var(--tg-button-color)',
              backgroundColor: 'var(--tg-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              outline: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Введите число..."
            min={question.validation?.min}
            max={question.validation?.max}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
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

  if (!surveyData) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--tg-bg-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  const currentQuestion = surveyData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / surveyData.questions.length) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '100px'
    }}>
      {/* Шапка */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        backgroundColor: 'var(--tg-bg-color)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <Eye size={20} color="var(--tg-button-color)" />
          <h1 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: 0
          }}>
            Предпросмотр опроса
          </h1>
        </div>
        
        {/* Прогресс-бар */}
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'rgba(244, 109, 0, 0.2)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{
          fontSize: '12px',
          color: 'var(--tg-hint-color)',
          marginTop: '4px'
        }}>
          Вопрос {currentQuestionIndex + 1} из {surveyData.questions.length}
        </div>
      </div>

      {/* Заголовок опроса */}
      <div style={{ padding: '24px 16px 16px 16px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 8px 0'
        }}>
          {surveyData.title}
        </h2>
        {surveyData.description && (
          <p style={{
            fontSize: '14px',
            color: 'var(--tg-hint-color)',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {surveyData.description}
          </p>
        )}
      </div>

      {/* Текущий вопрос */}
      <div style={{ padding: '0 16px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: 'var(--tg-section-bg-color)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                minWidth: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--tg-button-color)',
                color: 'var(--tg-button-text-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {currentQuestionIndex + 1}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  margin: '0 0 8px 0'
                }}>
                  {currentQuestion.title}
                  {currentQuestion.required && (
                    <span style={{ color: '#FF3B30', marginLeft: '4px' }}>*</span>
                  )}
                </h3>
                {currentQuestion.description && (
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--tg-hint-color)',
                    margin: '0 0 16px 0'
                  }}>
                    {currentQuestion.description}
                  </p>
                )}
                {currentQuestion.imageUrl && (
                  <div style={{ margin: '0 0 16px 0' }}>
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Изображение к вопросу"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '8px',
                        border: '1px solid var(--tg-section-separator-color)',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {renderQuestionPreview(currentQuestion)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Навигация */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        backgroundColor: 'var(--tg-bg-color)',
        borderTop: '1px solid var(--tg-section-separator-color)',
        display: 'flex',
        gap: '12px'
      }}>
        <button
          onClick={handlePrevQuestion}
          disabled={currentQuestionIndex === 0}
          style={{
            flex: 1,
            backgroundColor: 'var(--tg-section-bg-color)',
            color: 'var(--tg-text-color)',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentQuestionIndex === 0 ? 0.5 : 1
          }}
        >
          Назад
        </button>
        
        {currentQuestionIndex < surveyData.questions.length - 1 ? (
          <button
            onClick={handleNextQuestion}
            style={{
              flex: 1,
              background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Далее
          </button>
        ) : (
          <button
            onClick={handlePublishSurvey}
            disabled={isPublishing}
            style={{
              flex: 1,
              backgroundColor: isPublishing ? '#8E8E93' : '#34C759',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isPublishing ? 0.7 : 1
            }}
          >
            <Send size={16} />
            {isPublishing ? 'Публикация...' : 'Опубликовать'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SurveyPreview;
