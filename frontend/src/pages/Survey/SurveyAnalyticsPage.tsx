import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Share, Settings, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { surveyApi, questionApi } from '../../services/api';
import type { SurveyShareResponse } from '../../services/api';
import type { Survey, SurveySettings, QuestionType } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { AnimatedTabs } from '../../components/ui/AnimatedTabs';

interface EditableQuestion {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  is_required: boolean;
  order_index: number;
  options?: string[];
  has_other_option?: boolean;
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
  image_url?: string;
  image_name?: string;
}

// Компонент для таба "Сводка"
const SummaryTab: React.FC<{
  survey: Survey | null;
  questions: EditableQuestion[];
  responses: any[] | null;
  stats: { total_responses: number } | null;
  loading: boolean;
}> = ({ survey, questions, responses, stats, loading }) => {
  const [showAllAnswers, setShowAllAnswers] = useState<{ [questionId: string]: boolean }>({});
  const [showAnswersPopup, setShowAnswersPopup] = useState<{ questionId: string; answers: any[] } | null>(null);

  if (loading || !questions || questions.length === 0) {
    return (
      <div style={{ 
        background: 'var(--tg-section-bg-color)', 
        borderRadius: 12, 
        padding: 40, 
        textAlign: 'center', 
        color: 'var(--tg-hint-color)' 
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--tg-section-separator-color)',
          borderTop: '3px solid #FF9500',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <div>Загрузка аналитики...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <div style={{ 
        background: 'var(--tg-section-bg-color)', 
        borderRadius: 12, 
        padding: 20, 
        textAlign: 'center', 
        color: 'var(--tg-hint-color)' 
      }}>
        Пока нет ответов — аналитика будет доступна после первых прохождений
      </div>
    );
  }

  // Функция для получения ответов на конкретный вопрос
  const getQuestionAnswers = (questionId: string) => {
    if (!responses || responses.length === 0) {
      return [];
    }
    
    return responses
      .flatMap(r => {
        // Теперь answers уже загружены с бэкенда
        const answers = r.answers || [];
        return answers
          .filter((a: any) => a.question_id === questionId)
          .filter((a: any) => a.value !== null && a.value !== undefined && a.value !== '') // Фильтруем пустые ответы
          .map((a: any) => ({
            value: a.value,
            user: r.user || null
          }));
      });
  };

  // Функция для получения статистики по типу вопроса
  const getQuestionStats = (question: EditableQuestion) => {
    const answers = getQuestionAnswers(question.id);
    
    switch (question.type) {
      case 'text':
      case 'textarea':
      case 'yes_no':
      case 'date':
      case 'number':
        return {
          type: 'text',
          answers: answers.slice(0, showAllAnswers[question.id] ? answers.length : 5),
          totalCount: answers.length,
          hasMore: answers.length > 5
        };
      
      case 'single_choice':
        const singleChoiceStats = answers.reduce((acc: any, answer) => {
          const value = answer.value;
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {});
        return {
          type: 'single_choice',
          stats: singleChoiceStats,
          totalCount: answers.length
        };
      
      case 'multiple_choice':
        const multipleChoiceStats = answers.flatMap(a => Array.isArray(a.value) ? a.value : [a.value]).reduce((acc: any, answer) => {
          acc[answer] = (acc[answer] || 0) + 1;
          return acc;
        }, {});
        return {
          type: 'multiple_choice',
          stats: multipleChoiceStats,
          totalCount: answers.length
        };
      
      case 'scale':
        const scaleStats = answers.reduce((acc: any, answer) => {
          const value = answer.value;
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {});
        return {
          type: 'scale',
          stats: scaleStats,
          totalCount: answers.length
        };
      
      case 'rating':
        const ratingAnswers = answers;
        const averageRating = ratingAnswers.length > 0 
          ? ratingAnswers.reduce((sum: number, answer) => sum + (answer.value || answer), 0) / ratingAnswers.length 
          : 0;
        return {
          type: 'rating',
          answers: ratingAnswers.slice(0, showAllAnswers[question.id] ? ratingAnswers.length : 5),
          totalCount: ratingAnswers.length,
          hasMore: ratingAnswers.length > 5,
          averageRating
        };
      
      default:
        return { type: 'unknown', totalCount: 0 };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      {/* Общая статистика */}
      <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 12 }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 600 }}>Общая статистика</h3>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--tg-button-color)' }}>
          {stats?.total_responses ?? 0}
        </div>
        <div style={{ color: 'var(--tg-hint-color)', fontSize: 12 }}>Всего ответов</div>
      </div>

      {/* Кнопка ИИ аналитики */}
      <div style={{ position: 'relative', display: 'block' }}>
        {/* Летающие звездочки SVG */}
        <div style={{
          position: 'absolute',
          top: '-4px',
          right: '1px',
          animation: 'float 2s ease-in-out infinite',
          animationDelay: '0s',
          zIndex: 1
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFA500" strokeWidth="1">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </div>
        <div style={{
          position: 'absolute',
          bottom: '-4px',
          left: '1px',
          animation: 'float 2s ease-in-out infinite',
          animationDelay: '1s',
          zIndex: 1
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFA500" strokeWidth="1">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </div>
        
        <button
          onClick={() => {
            // Заглушка - пока ничего не делает
            console.log('ИИ аналитика - заглушка');
          }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 3s ease infinite',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
            transform: 'rotate(45deg)',
            transition: 'all 0.6s',
            opacity: 0
          }} />
          <span style={{ position: 'relative', zIndex: 1 }}>
            🤖 Получить ИИ аналитику
          </span>
        </button>
      </div>

      {/* Аналитика по вопросам */}
      {questions && questions.length > 0 && questions.map((question) => {
        const questionStats = getQuestionStats(question);
        
        return (
          <div key={question.id} style={{ 
            background: 'var(--tg-section-bg-color)', 
            borderRadius: 12, 
            padding: 16 
          }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              fontSize: 14, 
              fontWeight: 600,
              color: 'var(--tg-text-color)'
            }}>
              {question.text}
            </h4>
            {question.description && (
              <p style={{
                fontSize: '12px',
                color: 'var(--tg-hint-color)',
                margin: '0 0 12px 0',
                lineHeight: '1.4'
              }}>
                {question.description}
              </p>
            )}
            
            {questionStats.type === 'text' && (
              <TextAnswersBlock 
                answers={questionStats.answers || []}
                totalCount={questionStats.totalCount}
                hasMore={questionStats.hasMore || false}
                questionId={question.id}
                isAnonymous={survey?.settings?.allowAnonymous || false}
                onShowAll={() => setShowAllAnswers(prev => ({ ...prev, [question.id]: true }))}
                onShowPopup={() => {
                  const allAnswers = getQuestionAnswers(question.id);
                  setShowAnswersPopup({ questionId: question.id, answers: allAnswers });
                }}
              />
            )}
            
            {questionStats.type === 'single_choice' && (
              <SingleChoiceChart 
                stats={questionStats.stats}
                totalCount={questionStats.totalCount}
                options={question.options || []}
              />
            )}
            
            {questionStats.type === 'multiple_choice' && (
              <MultipleChoiceChart 
                stats={questionStats.stats}
                totalCount={questionStats.totalCount}
                options={question.options || []}
              />
            )}
            
            {questionStats.type === 'scale' && (
              <ScaleChart 
                stats={questionStats.stats}
                totalCount={questionStats.totalCount}
                minValue={question.scale_min || 1}
                maxValue={question.scale_max || 10}
              />
            )}
            
            {questionStats.type === 'rating' && (
              <RatingAnswersBlock 
                answers={questionStats.answers || []}
                totalCount={questionStats.totalCount}
                hasMore={questionStats.hasMore || false}
                averageRating={questionStats.averageRating || 0}
                questionId={question.id}
                isAnonymous={survey?.settings?.allowAnonymous || false}
                onShowAll={() => setShowAllAnswers(prev => ({ ...prev, [question.id]: true }))}
                onShowPopup={() => {
                  const allAnswers = getQuestionAnswers(question.id);
                  setShowAnswersPopup({ questionId: question.id, answers: allAnswers });
                }}
              />
            )}
          </div>
        );
      })}

      {/* Popup для показа всех ответов */}
      {showAnswersPopup && (
        <AnswersPopup 
          questionId={showAnswersPopup.questionId}
          answers={showAnswersPopup.answers}
          isAnonymous={survey?.settings?.allowAnonymous || false}
          onClose={() => setShowAnswersPopup(null)}
        />
      )}
    </div>
  );
};

// Компонент для таба "Отдельный пользователь"
const IndividualUserTab: React.FC<{
  questions: EditableQuestion[];
  responses: any[] | null;
  survey: Survey | null;
  loading: boolean;
}> = ({ questions, responses, survey, loading }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [currentUserIndex, setCurrentUserIndex] = useState<number>(1);
  const [manualUserInput, setManualUserInput] = useState<string>('1');

  const isAnonymous = survey?.settings?.allowAnonymous || false;
  const totalUsers = responses?.length || 0;

  // Создаем список пользователей для выпадающего списка
  const userOptions = responses?.map((response, index) => {
    const user = response.user;
    if (isAnonymous) {
      return {
        id: `respondent_${index + 1}`,
        label: `Респондент ${index + 1}`,
        index: index
      };
    } else {
      const username = user?.username || 'Респондент';
      return {
        id: `user_${index}`,
        label: `@${username}`,
        index: index
      };
    }
  }) || [];

  // Инициализируем первого пользователя по умолчанию
  useEffect(() => {
    if (userOptions.length > 0 && !selectedUserId) {
      setSelectedUserId(userOptions[0].id);
    }
  }, [userOptions, selectedUserId]);

  // Получаем ответы текущего пользователя
  const getCurrentUserResponses = () => {
    if (!responses || responses.length === 0) return [];
    
    const userIndex = currentUserIndex - 1;
    if (userIndex < 0 || userIndex >= responses.length) return [];
    
    const userResponse = responses[userIndex];
    if (!userResponse) return [];
    
    return userResponse.answers || [];
  };

  // Обработка выбора пользователя из выпадающего списка
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const userOption = userOptions.find(option => option.id === userId);
    if (userOption) {
      setCurrentUserIndex(userOption.index + 1);
      setManualUserInput((userOption.index + 1).toString());
    }
  };

  // Обработка ручного ввода номера пользователя
  const handleManualInputChange = (value: string) => {
    setManualUserInput(value);
  };

  const handleManualInputBlur = () => {
    const numValue = parseInt(manualUserInput);
    if (isNaN(numValue) || numValue < 1) {
      setCurrentUserIndex(1);
      setManualUserInput('1');
    } else if (numValue > totalUsers) {
      setCurrentUserIndex(totalUsers);
      setManualUserInput(totalUsers.toString());
    } else {
      setCurrentUserIndex(numValue);
    }
  };

  // Навигация между пользователями
  const goToPreviousUser = () => {
    if (currentUserIndex > 1) {
      const newIndex = currentUserIndex - 1;
      setCurrentUserIndex(newIndex);
      setManualUserInput(newIndex.toString());
    }
  };

  const goToNextUser = () => {
    if (currentUserIndex < totalUsers) {
      const newIndex = currentUserIndex + 1;
      setCurrentUserIndex(newIndex);
      setManualUserInput(newIndex.toString());
    }
  };

  // Получаем данные текущего пользователя
  const currentUser = responses?.[currentUserIndex - 1];
  const currentUserData = currentUser?.user;
  const currentUserResponses = getCurrentUserResponses();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 16, 
        padding: '40px 20px' 
      }}>
        <div style={{
          width: 24,
          height: 24,
          border: '3px solid var(--tg-button-color)',
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--tg-hint-color)', fontSize: '14px' }}>
          Загрузка аналитики...
        </p>
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 16, 
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <p style={{ color: 'var(--tg-hint-color)', fontSize: '16px' }}>
          На этот опрос пока нет ответов
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Выпадающий список пользователей */}
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: 8, 
          fontSize: '14px', 
          fontWeight: '500',
          color: 'var(--tg-text-color)'
        }}>
          Выберите пользователя
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => handleUserSelect(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--tg-section-bg-color)',
            color: 'var(--tg-text-color)',
            fontSize: '16px',
            outline: 'none'
          }}
        >
          {userOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Навигация между пользователями */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12,
        padding: '16px',
        backgroundColor: 'var(--tg-section-bg-color)',
        borderRadius: '8px',
        border: '1px solid var(--tg-section-separator-color)'
      }}>
        <button
          onClick={goToPreviousUser}
          disabled={currentUserIndex <= 1}
          style={{
            padding: '8px 12px',
            border: 'none',
            backgroundColor: currentUserIndex <= 1 ? 'var(--tg-hint-color)' : 'var(--tg-button-color)',
            color: 'white',
            borderRadius: '6px',
            cursor: currentUserIndex <= 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: currentUserIndex <= 1 ? 0.5 : 1
          }}
        >
          ←
        </button>
        
        <input
          type="number"
          value={manualUserInput}
          onChange={(e) => handleManualInputChange(e.target.value)}
          onBlur={handleManualInputBlur}
          min="1"
          max={totalUsers}
          style={{
            width: '60px',
            padding: '8px 12px',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '6px',
            backgroundColor: 'var(--tg-bg-color)',
            color: 'var(--tg-text-color)',
            fontSize: '14px',
            textAlign: 'center',
            outline: 'none'
          }}
        />
        
        <span style={{ 
          fontSize: '14px', 
          color: 'var(--tg-text-color)',
          whiteSpace: 'nowrap'
        }}>
          из {totalUsers}
        </span>
        
        <button
          onClick={goToNextUser}
          disabled={currentUserIndex >= totalUsers}
          style={{
            padding: '8px 12px',
            border: 'none',
            backgroundColor: currentUserIndex >= totalUsers ? 'var(--tg-hint-color)' : 'var(--tg-button-color)',
            color: 'white',
            borderRadius: '6px',
            cursor: currentUserIndex >= totalUsers ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: currentUserIndex >= totalUsers ? 0.5 : 1
          }}
        >
          →
        </button>
      </div>

      {/* Информация о текущем пользователе */}
      {currentUser && (
        <div style={{
          textAlign: 'center',
          marginBottom: '12px',
          padding: '8px 12px',
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '6px',
          border: '1px solid var(--tg-section-separator-color)'
        }}>
          {isAnonymous ? (
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--tg-text-color)',
              fontWeight: '500'
            }}>
              Респондент {currentUserIndex}
            </span>
          ) : currentUserData ? (
            <a
              href={currentUserData.username ? `https://t.me/${currentUserData.username}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                fontSize: '12px', 
                color: 'var(--tg-button-color)',
                textDecoration: 'none',
                cursor: currentUserData.username ? 'pointer' : 'default',
                fontWeight: '500'
              }}
              onClick={(e) => {
                if (!currentUserData.username) {
                  e.preventDefault();
                }
              }}
            >
              @{currentUserData.username || 'Респондент'}
            </a>
          ) : (
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--tg-text-color)',
              fontWeight: '500'
            }}>
              Респондент
            </span>
          )}
        </div>
      )}

      {/* Ответы пользователя */}
      {questions && questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((question) => {
            const userAnswer = currentUserResponses.find((answer: any) => 
              answer.question_id === question.id
            );

            if (!userAnswer || userAnswer.value === null || userAnswer.value === undefined || userAnswer.value === '') {
              return null; // Не показываем вопросы без ответов
            }

            // Обрабатываем случай с "Другое" точно так же, как в табе "Вопрос"
            let processedValue = userAnswer.value;
            
            // Определяем, есть ли вариант "Другое" в вопросе
            const hasOtherOption = question.has_other_option;
            const predefinedOptions = question.options || [];
            
            if (hasOtherOption) {
              // Для single_choice - проверяем, не является ли ответ "другим"
              if (!Array.isArray(userAnswer.value)) {
                // Если ответ не входит в предопределенные варианты - это "Другое"
                if (!predefinedOptions.includes(userAnswer.value)) {
                  processedValue = {
                    type: 'other',
                    originalValue: 'Другое',
                    userText: userAnswer.value
                  };
                }
              } else {
                // Для multiple_choice - находим "другие" ответы
                const otherAnswers = userAnswer.value.filter((answer: string) => 
                  !predefinedOptions.includes(answer)
                );
                
                if (otherAnswers.length > 0) {
                  // Создаем массив с предопределенными вариантами + "Другое"
                  const predefinedSelected = userAnswer.value.filter((answer: string) => 
                    predefinedOptions.includes(answer)
                  );
                  
                  processedValue = {
                    type: 'other',
                    originalValue: [...predefinedSelected, 'Другое'],
                    userText: otherAnswers.join(', ') // Объединяем все "другие" ответы
                  };
                }
              }
            }

            return (
              <div key={question.id} style={{
                background: 'var(--tg-section-bg-color)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--tg-section-separator-color)'
              }}>
                <h4 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: 14, 
                  fontWeight: 600,
                  color: 'var(--tg-text-color)'
                }}>
                  {question.text}
                </h4>
                {question.description && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--tg-hint-color)',
                    margin: '0 0 12px 0',
                    lineHeight: '1.4'
                  }}>
                    {question.description}
                  </p>
                )}
                
                <div style={{ 
                  marginTop: '12px',
                  backgroundColor: 'var(--tg-bg-color)',
                  borderRadius: '6px',
                  padding: '12px',
                  border: '1px solid var(--tg-section-separator-color)'
                }}>
                  {renderQuestionAnswer(question, processedValue)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Компонент для таба "Вопрос"
const QuestionTab: React.FC<{
  questions: EditableQuestion[];
  responses: any[] | null;
  survey: Survey | null;
  loading: boolean;
}> = ({ questions, responses, survey, loading }) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px 20px',
        background: 'var(--tg-section-bg-color)', 
        borderRadius: 12, 
        gap: 16 
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--tg-button-color)',
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ color: 'var(--tg-text-color)', fontSize: '14px' }}>
          Загрузка аналитики...
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div style={{ 
        background: 'var(--tg-section-bg-color)', 
        borderRadius: 12, 
        padding: 20, 
        textAlign: 'center', 
        color: 'var(--tg-hint-color)' 
      }}>
        Нет вопросов для анализа
      </div>
    );
  }

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId);
  const isAnonymous = survey?.settings?.allowAnonymous || false;

  // Получаем ответы для выбранного вопроса
  const getQuestionAnswers = (questionId: string) => {
    if (!responses || responses.length === 0) return [];
    
    return responses
      .flatMap(r => {
        const answers = r.answers || [];
        const mainAnswer = answers.find((a: any) => a.question_id === questionId);
        
        if (!mainAnswer || mainAnswer.value === null || mainAnswer.value === undefined || mainAnswer.value === '') {
          return [];
        }
        
        // Находим вопрос для получения его вариантов
        const question = questions.find(q => q.id === questionId);
        if (!question) return [];
        
        let processedValue = mainAnswer.value;
        
        // Определяем, есть ли вариант "Другое" в вопросе
        const hasOtherOption = question.has_other_option;
        const predefinedOptions = question.options || [];
        
        if (hasOtherOption) {
          // Для single_choice - проверяем, не является ли ответ "другим"
          if (!Array.isArray(mainAnswer.value)) {
            // Если ответ не входит в предопределенные варианты - это "Другое"
            if (!predefinedOptions.includes(mainAnswer.value)) {
              processedValue = {
                type: 'other',
                originalValue: 'Другое',
                userText: mainAnswer.value
              };
            }
          } else {
            // Для multiple_choice - находим "другие" ответы
            const otherAnswers = mainAnswer.value.filter((answer: string) => 
              !predefinedOptions.includes(answer)
            );
            
            if (otherAnswers.length > 0) {
              // Создаем массив с предопределенными вариантами + "Другое"
              const predefinedSelected = mainAnswer.value.filter((answer: string) => 
                predefinedOptions.includes(answer)
              );
              
              processedValue = {
                type: 'other',
                originalValue: [...predefinedSelected, 'Другое'],
                userText: otherAnswers.join(', ') // Объединяем все "другие" ответы
              };
            }
          }
        }
        
        return [{
          value: processedValue,
          user: r.user || null
        }];
      });
  };

  const questionAnswers = selectedQuestion ? getQuestionAnswers(selectedQuestion.id) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Выпадающий список вопросов */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: 'var(--tg-text-color)'
        }}>
          Выберите вопрос
        </label>
        <select
          value={selectedQuestionId}
          onChange={(e) => setSelectedQuestionId(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--tg-section-bg-color)',
            color: 'var(--tg-text-color)',
            fontSize: '16px',
            outline: 'none'
          }}
        >
          <option value="">Вопрос не выбран</option>
          {questions.map((question) => (
            <option key={question.id} value={question.id}>
              {question.text}
            </option>
          ))}
        </select>
      </div>

      {/* Отображение выбранного вопроса и ответов */}
      {selectedQuestion && (
        <div style={{ 
          background: 'var(--tg-section-bg-color)', 
          borderRadius: 12, 
          padding: 16 
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            margin: '0 0 8px 0',
            color: 'var(--tg-text-color)'
          }}>
            {selectedQuestion.text}
          </h3>
          {selectedQuestion.description && (
            <p style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)',
              margin: '0 0 16px 0',
              lineHeight: '1.4'
            }}>
              {selectedQuestion.description}
            </p>
          )}

          {questionAnswers.length === 0 ? (
            <p style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)',
              textAlign: 'center',
              padding: '20px 0'
            }}>
              На этот вопрос пока нет ответов
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questionAnswers.map((answer, index) => {
                // Определяем, нужно ли показывать username сверху
                const showUsernameOnTop = ['single_choice', 'multiple_choice', 'scale', 'rating'].includes(selectedQuestion.type);
                
                return (
                  <div key={index} style={{
                    background: 'var(--tg-bg-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid var(--tg-section-separator-color)'
                  }}>
                    {/* Username сверху для определенных типов вопросов */}
                    {showUsernameOnTop && !isAnonymous && answer.user && (
                      <div style={{
                        textAlign: 'center',
                        marginBottom: '12px',
                        padding: '8px 12px',
                        backgroundColor: 'var(--tg-section-bg-color)',
                        borderRadius: '6px',
                        border: '1px solid var(--tg-section-separator-color)'
                      }}>
                        <a
                          href={answer.user.username ? `https://t.me/${answer.user.username}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: '12px', 
                            color: 'var(--tg-button-color)',
                            textDecoration: 'none',
                            cursor: answer.user.username ? 'pointer' : 'default',
                            fontWeight: '500'
                          }}
                          onClick={(e) => {
                            if (!answer.user.username) {
                              e.preventDefault();
                            }
                          }}
                        >
                          @{answer.user.username || 'Респондент'}
                        </a>
                      </div>
                    )}
                    
                    {/* Ответ на вопрос */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        {renderQuestionAnswer(selectedQuestion, answer.value)}
                      </div>
                      {/* Username справа для остальных типов вопросов */}
                      {!showUsernameOnTop && !isAnonymous && answer.user && (
                        <a
                          href={answer.user.username ? `https://t.me/${answer.user.username}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: '11px', 
                            color: 'var(--tg-button-color)',
                            textDecoration: 'none',
                            cursor: answer.user.username ? 'pointer' : 'default',
                            whiteSpace: 'nowrap'
                          }}
                          onClick={(e) => {
                            if (!answer.user.username) {
                              e.preventDefault();
                            }
                          }}
                        >
                          @{answer.user.username || 'Респондент'}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Функция для рендеринга ответа на вопрос
const renderQuestionAnswer = (question: EditableQuestion, value: any) => {

  switch (question.type) {
    case 'text':
    case 'textarea':
      return (
        <div style={{ fontSize: '14px', color: 'var(--tg-text-color)', lineHeight: '1.4' }}>
          {value}
        </div>
      );

    case 'single_choice':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(question.options || []).map((option, index) => {
            // Проверяем, выбран ли этот вариант (учитываем случай с "Другое")
            const isSelected = (value && value.type === 'other') 
              ? false // Если выбрано "Другое", то обычные варианты не выбраны
              : value === option;
              
            return (
              <label key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'default',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                opacity: isSelected ? 1 : 0.6
              }}>
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: isSelected ? 'var(--tg-button-color)' : 'transparent'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    opacity: isSelected ? 1 : 0
                  }} />
                </div>
                <span style={{ 
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  flex: 1
                }}>
                  {option}
                </span>
              </label>
            );
          })}
          
          {/* Вариант "Другое" */}
          {question.has_other_option && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'default',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                opacity: (value && value.type === 'other') ? 1 : 0.6
              }}>
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${(value && value.type === 'other') ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: (value && value.type === 'other') ? 'var(--tg-button-color)' : 'transparent'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    opacity: (value && value.type === 'other') ? 1 : 0
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
              
              {/* Показываем текст пользователя если выбрано "Другое" */}
              {(value && value.type === 'other') && (
                <div style={{ marginLeft: '32px' }}>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--tg-bg-color)',
                    borderRadius: '6px',
                    border: '1px solid var(--tg-section-separator-color)',
                    fontSize: '14px',
                    color: 'var(--tg-text-color)'
                  }}>
                    {value.userText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );

    case 'multiple_choice':
      // Обрабатываем случай с "Другое" для multiple_choice
      let selectedValues = Array.isArray(value) ? value : [];
      let otherText = null;
      let hasOtherSelected = false;
      
      if (value && value.type === 'other') {
        selectedValues = value.originalValue;
        otherText = value.userText;
        hasOtherSelected = true;
      }
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(question.options || []).map((option, index) => {
            const isChecked = selectedValues.includes(option);
            return (
              <label key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'default',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                opacity: isChecked ? 1 : 0.6
              }}>
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: `2px solid ${isChecked ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: isChecked ? 'var(--tg-button-color)' : 'transparent'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -90%)',
                    width: '12px',
                    height: '12px',
                    opacity: isChecked ? 1 : 0
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
                  {option}
                </span>
              </label>
            );
          })}
          
          {/* Вариант "Другое" */}
          {question.has_other_option && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'default',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                opacity: hasOtherSelected ? 1 : 0.6
              }}>
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: `2px solid ${hasOtherSelected ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: hasOtherSelected ? 'var(--tg-button-color)' : 'transparent'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -90%)',
                    width: '12px',
                    height: '12px',
                    opacity: hasOtherSelected ? 1 : 0
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
              
              {/* Показываем текст пользователя если выбрано "Другое" */}
              {hasOtherSelected && otherText && (
                <div style={{ marginLeft: '32px' }}>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--tg-bg-color)',
                    borderRadius: '6px',
                    border: '1px solid var(--tg-section-separator-color)',
                    fontSize: '14px',
                    color: 'var(--tg-text-color)'
                  }}>
                    {otherText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );

    case 'scale':
      const minValue = question.scale_min || 1;
      const maxValue = question.scale_max || 10;
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
              color: 'var(--tg-text-color)',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {minValue}
            </span>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#666',
                borderRadius: '4px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  left: `${((value - minValue) / (maxValue - minValue)) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'var(--tg-button-color)',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: 'var(--tg-text-color)',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {maxValue}
            </span>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <span style={{
              fontSize: '18px',
              color: 'var(--tg-button-color)',
              fontWeight: 'bold'
            }}>
              {value}
            </span>
          </div>
          
          {(question.scale_min_label || question.scale_max_label) && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--tg-hint-color)'
            }}>
              <span>{question.scale_min_label || ''}</span>
              <span>{question.scale_max_label || ''}</span>
            </div>
          )}
        </div>
      );

    case 'rating':
      return (
        <div style={{ 
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--tg-section-separator-color)'
        }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <svg 
                key={star}
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill={star <= value ? "#ffd700" : "none"} 
                stroke={star <= value ? "#ffd700" : "var(--tg-hint-color)"} 
                strokeWidth="2"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            ))}
          </div>
        </div>
      );

    case 'yes_no':
      return (
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: value === 'yes' ? 'var(--tg-button-color)' : 'var(--tg-section-bg-color)',
            color: value === 'yes' ? 'white' : 'var(--tg-text-color)'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: `2px solid ${value === 'yes' ? 'white' : 'var(--tg-hint-color)'}`,
              backgroundColor: value === 'yes' ? 'white' : 'transparent'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'white',
                opacity: value === 'yes' ? 1 : 0
              }} />
            </div>
            <span>Да</span>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: value === 'no' ? 'var(--tg-button-color)' : 'var(--tg-section-bg-color)',
            color: value === 'no' ? 'white' : 'var(--tg-text-color)'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: `2px solid ${value === 'no' ? 'white' : 'var(--tg-hint-color)'}`,
              backgroundColor: value === 'no' ? 'white' : 'transparent'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'white',
                opacity: value === 'no' ? 1 : 0
              }} />
            </div>
            <span>Нет</span>
          </div>
        </div>
      );

    case 'date':
      const dateValue = typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/) 
        ? new Date(value).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : value;
      return (
        <div style={{ fontSize: '14px', color: 'var(--tg-text-color)' }}>
          {dateValue}
        </div>
      );

    case 'number':
      return (
        <div style={{ fontSize: '14px', color: 'var(--tg-text-color)' }}>
          {value}
        </div>
      );

    default:
      return (
        <div style={{ fontSize: '14px', color: 'var(--tg-text-color)' }}>
          {value}
        </div>
      );
  }
};

// Компонент для текстовых ответов
const TextAnswersBlock: React.FC<{
  answers: any[];
  totalCount: number;
  hasMore: boolean;
  questionId: string;
  isAnonymous: boolean;
  onShowAll: () => void;
  onShowPopup: (answers: any[]) => void;
}> = ({ answers, totalCount, hasMore, isAnonymous, onShowPopup }) => {
  const renderUserLink = (user: any) => {
    if (!user) return null;
    
    const username = user.username;
    const displayName = username ? `@${username}` : 'Респондент';
    const link = username ? `https://t.me/${username}` : '#';
    
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          fontSize: '11px', 
          color: 'var(--tg-button-color)',
          cursor: 'pointer',
          textDecoration: 'none'
        }}
        onClick={(e) => {
          if (!username) {
            e.preventDefault();
          }
        }}
      >
        {displayName}
      </a>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {answers.map((answer, index) => (
          <div key={index} style={{ 
            padding: '8px 12px', 
            backgroundColor: 'var(--tg-bg-color)', 
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--tg-text-color)' }}>
              {(() => {
                let displayValue = answer.value || answer;
                
                // Форматируем дату если это дата
                if (typeof displayValue === 'string' && displayValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  const date = new Date(displayValue);
                  displayValue = date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                }
                
                return displayValue;
              })()}
            </span>
            {!isAnonymous && renderUserLink(answer.user)}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => onShowPopup(answers)}
          style={{
            marginTop: '8px',
            background: 'transparent',
            border: '1px dashed var(--tg-section-separator-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--tg-hint-color)',
            fontSize: '12px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Посмотреть все ответы ({totalCount})
        </button>
      )}
    </div>
  );
};

// Компонент для круговой диаграммы (один из списка)
const SingleChoiceChart: React.FC<{
  stats: { [key: string]: number };
  totalCount: number;
  options: string[];
}> = ({ stats, totalCount }) => {
  const colors = ['#FF6B6B', '#34C759', '#4ECDC4', '#DDA0DD', '#45B7D1', '#96CEB4', '#FFEAA7', '#98D8C8', '#FF3B30', '#8E8E93', '#007AFF', '#FF9500'];
  
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {/* Круговая диаграмма */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          {(() => {
            let currentAngle = 0;
            const entries = Object.entries(stats);
            
            // Если только один ответ, делаем полный круг
            if (entries.length === 1) {
              return (
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill={colors[0]}
                />
              );
            }
            
            return entries.map((entry, index) => {
              const option = entry[0];
              const count = entry[1];
              const percentage = (count / totalCount) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle += angle;
              
              const x1 = 60 + 50 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 60 + 50 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 60 + 50 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 60 + 50 * Math.sin((endAngle * Math.PI) / 180);
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = `M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
              
              return (
                <path
                  key={option}
                  d={pathData}
                  fill={colors[index % colors.length]}
                />
              );
            });
          })()}
        </svg>
      </div>
      
      {/* Легенда */}
      <div style={{ flex: 1 }}>
        {Object.entries(stats).map(([option, count], index) => {
          const percentage = Math.round((count / totalCount) * 100);
          return (
            <div key={option} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 4 
            }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: colors[index % colors.length]
              }} />
              <span style={{ fontSize: '12px', color: 'var(--tg-text-color)' }}>
                {option} ({count} | {percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Компонент для столбчатой диаграммы (несколько из списка)
const MultipleChoiceChart: React.FC<{
  stats: { [key: string]: number };
  totalCount: number;
  options: string[];
}> = ({ stats, options }) => {
  const maxCount = Math.max(...Object.values(stats));
  
  // Находим максимальную ширину названия для выравнивания
  const maxNameWidth = Math.max(...options.map(option => option.length * 7 + 20)); // Примерная ширина в пикселях
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((option) => {
        const count = stats[option] || 0; // Показываем 0 если нет ответов
        const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0; // Процент от доступной ширины
        return (
          <div key={option} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              minWidth: `${maxNameWidth}px`, 
              fontSize: '11px', 
              color: 'var(--tg-text-color)',
              textAlign: 'left'
            }}>
              {option}
            </div>
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center',
              position: 'relative',
              minWidth: '100px' // Минимальная ширина для области гистограмм
            }}>
              <div style={{
                width: `${widthPercent}%`,
                height: '24px',
                backgroundColor: '#FF9500',
                borderRadius: '4px',
                position: 'relative',
                minWidth: count > 0 ? '20px' : '0px'
              }}>
                <span style={{ 
                  fontSize: '11px', 
                  color: '#000000', 
                  fontWeight: '600',
                  position: 'absolute',
                  right: '16px',
                  top: '4px',
                  textAlign: 'right'
                }}>
                  {count}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Компонент для шкалы
const ScaleChart: React.FC<{
  stats: { [key: string]: number };
  totalCount: number;
  minValue: number;
  maxValue: number;
}> = ({ stats, minValue, maxValue }) => {
  const maxCount = Math.max(...Object.values(stats));
  
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 120 }}>
        {Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i).map((value) => {
          const count = stats[value] || 0;
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={value} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '100%',
                height: `${height}px`,
                backgroundColor: '#FF9500',
                borderRadius: '4px 4px 0 0',
                position: 'relative'
              }}>
                <span style={{ 
                  fontSize: '10px', 
                  color: 'var(--tg-hint-color)', 
                  position: 'absolute',
                  top: '-16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap'
                }}>
                  {count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i).map((value) => (
          <div key={value} style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--tg-text-color)' }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Компонент для рейтинга
const RatingAnswersBlock: React.FC<{
  answers: any[];
  totalCount: number;
  hasMore: boolean;
  averageRating: number;
  questionId: string;
  isAnonymous: boolean;
  onShowAll: () => void;
  onShowPopup: (answers: any[]) => void;
}> = ({ answers, totalCount, hasMore, averageRating, isAnonymous, onShowPopup }) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const isFull = i < Math.floor(rating);
      const isPartial = i === Math.floor(rating) && rating % 1 > 0;
      const partialAmount = rating % 1;
      
      return (
        <span key={i} style={{ 
          color: isFull ? '#ffd700' : isPartial ? '#ffd700' : 'var(--tg-hint-color)',
          fontSize: '24px',
          position: 'relative',
          display: 'inline-block'
        }}>
          {isPartial ? (
            <span style={{
              background: `linear-gradient(90deg, #ffd700 ${partialAmount * 100}%, var(--tg-hint-color) ${partialAmount * 100}%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ★
            </span>
          ) : (
            '★'
          )}
        </span>
      );
    });
  };

  const renderUserLink = (user: any) => {
    if (!user) return null;
    
    const username = user.username;
    const displayName = username ? `@${username}` : 'Респондент';
    const link = username ? `https://t.me/${username}` : '#';
    
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          fontSize: '11px', 
          color: 'var(--tg-button-color)',
          cursor: 'pointer',
          textDecoration: 'none'
        }}
        onClick={(e) => {
          if (!username) {
            e.preventDefault();
          }
        }}
      >
        {displayName}
      </a>
    );
  };

  return (
    <div>
      {/* Средняя оценка */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: 16,
        padding: '12px',
        backgroundColor: 'var(--tg-bg-color)',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginBottom: 4 }}>
          Средняя оценка
        </div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>
          {renderStars(averageRating)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--tg-hint-color)' }}>
          {averageRating.toFixed(1)} из 5
        </div>
      </div>
      
      {/* Индивидуальные ответы */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {answers.map((answer, index) => (
          <div key={index} style={{ 
            padding: '8px 12px', 
            backgroundColor: 'var(--tg-bg-color)', 
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '13px', color: 'var(--tg-text-color)' }}>
                {renderStars(answer.value || answer)}
              </span>
            </div>
            {!isAnonymous && renderUserLink(answer.user)}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => onShowPopup(answers)}
          style={{
            marginTop: '8px',
            background: 'transparent',
            border: '1px dashed var(--tg-section-separator-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--tg-hint-color)',
            fontSize: '12px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Посмотреть все ответы ({totalCount})
        </button>
      )}
    </div>
  );
};

// Popup для показа всех ответов
const AnswersPopup: React.FC<{
  questionId: string;
  answers: any[];
  isAnonymous: boolean;
  onClose: () => void;
}> = ({ answers, isAnonymous, onClose }) => {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '95%',
          width: '350px',
          maxHeight: '80%',
          overflow: 'auto',
          color: 'var(--tg-text-color)',
          border: '1px solid var(--tg-section-separator-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--tg-text-color)' }}>
            Все ответы
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tg-hint-color)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {answers.map((answer, index) => {
            let displayValue = answer.value || answer;
            
            // Форматируем дату если это дата
            if (typeof displayValue === 'string' && displayValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const date = new Date(displayValue);
              displayValue = date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
            }
            
            // Функция для отображения звезд
            const renderStars = (rating: number) => {
              return Array.from({ length: 5 }, (_, i) => {
                const isFull = i < Math.floor(rating);
                const isPartial = i === Math.floor(rating) && rating % 1 > 0;
                const partialAmount = rating % 1;
                
                return (
                  <span key={i} style={{ 
                    color: isFull ? '#ffd700' : isPartial ? '#ffd700' : 'var(--tg-hint-color)',
                    fontSize: '18px',
                    position: 'relative',
                    display: 'inline-block'
                  }}>
                    {isPartial ? (
                      <span style={{
                        background: `linear-gradient(90deg, #ffd700 ${partialAmount * 100}%, var(--tg-hint-color) ${partialAmount * 100}%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>
                        ★
                      </span>
                    ) : (
                      '★'
                    )}
                  </span>
                );
              });
            };
            
            return (
              <div key={index} style={{ 
                padding: '12px', 
                backgroundColor: 'var(--tg-bg-color)', 
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--tg-text-color)',
                border: '1px solid var(--tg-section-separator-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {typeof displayValue === 'number' && displayValue >= 1 && displayValue <= 5 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {renderStars(displayValue)}
                      <span style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginLeft: '4px' }}>
                        ({displayValue})
                      </span>
                    </div>
                  ) : (
                    <span>{displayValue}</span>
                  )}
                </div>
                {!isAnonymous && answer.user && (
                  <a
                    href={answer.user.username ? `https://t.me/${answer.user.username}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      fontSize: '11px', 
                      color: 'var(--tg-button-color)',
                      textDecoration: 'none',
                      marginLeft: '16px',
                      cursor: answer.user.username ? 'pointer' : 'default'
                    }}
                    onClick={(e) => {
                      if (!answer.user.username) {
                        e.preventDefault();
                      }
                    }}
                  >
                    @{answer.user.username || 'Респондент'}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function SurveyAnalyticsPage() {
  const { surveyId } = useParams();
  const { hapticFeedback } = useTelegram();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [share, setShare] = useState<SurveyShareResponse | null>(null);
  const [stats, setStats] = useState<{ total_responses: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'analytics'>('overview');
  const [analyticsTab, setAnalyticsTab] = useState<'summary' | 'question' | 'user'>('summary');
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [responsesPage, setResponsesPage] = useState<any[] | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState<SurveySettings | null>(null);
  const [editedMaxParticipants, setEditedMaxParticipants] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<EditableQuestion[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, { scaleMin?: string; scaleMax?: string }>>({});
  const [settingsValidationErrors, setSettingsValidationErrors] = useState<Record<string, string>>({});

  useStableBackButton({ targetRoute: '/' });

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        const [s, sh, st] = await Promise.all([
          surveyApi.getSurvey(surveyId, false),
          surveyApi.getSurveyShareLink(surveyId).catch(() => null),
          surveyApi.getSurveyStats(surveyId),
        ]);
        setSurvey(s);
        setShare(sh);
        setStats(st as any);
        setEditedSettings(s.settings);
        setEditedMaxParticipants(s.maxParticipants?.toString() || '');
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить опрос');
        setLoading(false);
      }
    };
    load();
  }, [surveyId]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (activeTab !== 'questions' || !surveyId) return;
      try {
        const list = await questionApi.getSurveyQuestions(surveyId);
        const mapped = list.map((q: any) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          description: q.description,
          is_required: q.isRequired || q.is_required,
          order_index: q.orderIndex || q.order_index,
          options: Array.isArray(q.options) ? q.options : (q.options ? Object.values(q.options) : []),
          has_other_option: q.hasOtherOption || q.has_other_option,
          scale_min: q.scaleMin || q.scale_min,
          scale_max: q.scaleMax || q.scale_max,
          scale_min_label: q.scaleMinLabel || q.scale_min_label,
          scale_max_label: q.scaleMaxLabel || q.scale_max_label,
          image_url: q.imageUrl || q.image_url,
          image_name: q.imageName || q.image_name
        }));
        setQuestions(mapped);
        setEditedQuestions(JSON.parse(JSON.stringify(mapped)));
      } catch (e) {
        console.error(e);
      }
    };
    loadQuestions();
  }, [activeTab, surveyId]);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (activeTab !== 'analytics' || !surveyId) return;
      
      try {
        setAnalyticsLoading(true);
        
        // Загружаем вопросы и ответы параллельно для аналитики
        const [questionsList, responses] = await Promise.all([
          questionApi.getSurveyQuestions(surveyId),
          surveyApi.getSurveyResponses(surveyId, 100, 0)
        ]);
        
        // Преобразуем вопросы в нужный формат
        const mappedQuestions = questionsList.map((q: any) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          description: q.description,
          is_required: q.isRequired || q.is_required,
          order_index: q.orderIndex || q.order_index,
          options: Array.isArray(q.options) ? q.options : (q.options ? Object.values(q.options) : []),
          has_other_option: q.hasOtherOption || q.has_other_option,
          scale_min: q.scaleMin || q.scale_min,
          scale_max: q.scaleMax || q.scale_max,
          scale_min_label: q.scaleMinLabel || q.scale_min_label,
          scale_max_label: q.scaleMaxLabel || q.scale_max_label,
          image_url: q.imageUrl || q.image_url,
          image_name: q.imageName || q.image_name
        }));
        
        setQuestions(mappedQuestions);
        setResponsesPage(responses);
      } catch (e) {
        console.error('Error loading analytics data:', e);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    
    loadAnalyticsData();
  }, [activeTab, surveyId]);


  const handleStatusChange = async (newStatus: string) => {
    if (!survey || !surveyId) return;
    
    if (newStatus === 'completed') {
      const confirmed = window.confirm('Опрос будет завершён и закрыт для ответов. Продолжить?');
      if (!confirmed) return;
    }
    
    if (newStatus === 'draft') {
      const confirmed = window.confirm('Снять опрос с публикации? Пользователи не смогут на него отвечать.');
      if (!confirmed) return;
    }

    try {
      await surveyApi.updateSurveyStatus(surveyId, newStatus);
      const fresh = await surveyApi.getSurvey(surveyId);
      setSurvey(fresh);
      setShowStatusDropdown(false);
      hapticFeedback?.success();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.detail || 'Не удалось изменить статус');
    }
  };

  const validateSettings = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Валидация maxParticipants
    if (editedMaxParticipants && editedMaxParticipants.trim() !== '') {
      const num = parseInt(editedMaxParticipants);
      if (isNaN(num) || num < 1) {
        errors.maxParticipants = 'Количество участников должно быть не менее 1';
      }
    }
    
    // Валидация мотивации
    if (editedSettings?.motivationEnabled) {
      // Проверяем что описание заполнено для всех типов
      if (!editedSettings.motivationDetails || editedSettings.motivationDetails.trim() === '') {
        if (editedSettings.motivationType === 'stars') {
          errors.motivationDetails = 'Введите количество звёзд';
        } else {
          errors.motivationDetails = 'Заполните описание награды';
        }
      } else if (editedSettings.motivationType === 'stars') {
        // Для звезд дополнительно проверяем что число >= 1
        const starsCount = parseInt(editedSettings.motivationDetails);
        if (isNaN(starsCount) || starsCount < 1) {
          errors.motivationDetails = 'Количество звёзд должно быть не менее 1';
        }
      }
      
      // Для промокода нужен также промокод
      if (editedSettings.motivationType === 'promo') {
        if (!editedSettings.motivationConditions || editedSettings.motivationConditions.trim() === '') {
          errors.motivationConditions = 'Введите промокод';
        }
      }
    }
    
    setSettingsValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      // Скроллим к первому ошибочному полю
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(`settings-${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    
    return true;
  };

  const handleSaveSettings = async () => {
    if (!survey || !surveyId || !editedSettings) return;
    
    if (!validateSettings()) {
      hapticFeedback?.error();
      return;
    }
    
    try {
      const settingsToSend = {
        ...editedSettings,
        maxParticipants: editedMaxParticipants
      };
      const updated = await surveyApi.updateSurveySettings(surveyId, settingsToSend);
      setSurvey(updated);
      setEditedSettings(updated.settings);
      setEditedMaxParticipants(updated.maxParticipants?.toString() || '');
      setEditingSettings(false);
      setSettingsValidationErrors({});
      hapticFeedback?.success();
      alert('Настройки успешно обновлены!');
    } catch (e) {
      console.error(e);
      alert('Не удалось сохранить настройки');
    }
  };

  const validateScaleValues = (questionId: string, scaleMin?: number, scaleMax?: number) => {
    const errors: { scaleMin?: string; scaleMax?: string } = {};
    
    // Проверяем только если значения определены
    if (scaleMin !== undefined) {
      if (scaleMin < 1) {
        errors.scaleMin = 'Значение не должно быть меньше 1';
      } else if (scaleMin > 99) {
        errors.scaleMin = 'Значение не должно быть больше 99';
      }
    }
    
    if (scaleMax !== undefined) {
      if (scaleMax < 2) {
        errors.scaleMax = 'Значение не должно быть меньше 2';
      } else if (scaleMax > 100) {
        errors.scaleMax = 'Значение не должно быть больше 100';
      }
    }
    
    // Проверяем что "От" меньше "До"
    if (scaleMin !== undefined && scaleMax !== undefined && scaleMin >= scaleMax) {
      errors.scaleMin = '"От" должно быть меньше "До"';
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [questionId]: errors
    }));
    
    return Object.keys(errors).length === 0;
  };

  const handleSaveQuestions = async () => {
    if (!surveyId) return;
    try {
      for (const q of editedQuestions) {
        await questionApi.updateQuestion(q.id, {
          type: q.type,
          text: q.text,
          description: q.description,
          is_required: q.is_required,
          order_index: q.order_index,
          options: q.options,
          has_other_option: q.has_other_option,
          scale_min: q.scale_min,
          scale_max: q.scale_max,
          scale_min_label: q.scale_min_label,
          scale_max_label: q.scale_max_label,
        });
      }
      
      const list = await questionApi.getSurveyQuestions(surveyId);
      const mapped = list.map((q: any) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        description: q.description,
        is_required: q.isRequired || q.is_required,
        order_index: q.orderIndex || q.order_index,
        options: Array.isArray(q.options) ? q.options : (q.options ? Object.values(q.options) : []),
        has_other_option: q.hasOtherOption || q.has_other_option,
        scale_min: q.scaleMin || q.scale_min,
        scale_max: q.scaleMax || q.scale_max,
        scale_min_label: q.scaleMinLabel || q.scale_min_label,
        scale_max_label: q.scaleMaxLabel || q.scale_max_label,
        image_url: q.imageUrl || q.image_url,
        image_name: q.imageName || q.image_name
      }));
      setQuestions(mapped);
      setEditedQuestions(JSON.parse(JSON.stringify(mapped)));
      setEditingQuestions(false);
      hapticFeedback?.success();
      alert('Вопросы успешно обновлены!');
    } catch (e) {
      console.error(e);
      alert('Не удалось сохранить вопросы');
    }
  };

  const updateEditedQuestion = (index: number, updates: Partial<EditableQuestion>) => {
    setEditedQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const moveQuestionUp = (questionId: string) => {
    const index = editedQuestions.findIndex(q => q.id === questionId);
    if (index > 0) {
      const newQuestions = [...editedQuestions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      
      // Обновляем order_index для всех вопросов
      const updatedQuestions = newQuestions.map((q, i) => ({ ...q, order_index: i + 1 }));
      setEditedQuestions(updatedQuestions);
      
      // Автоскролл к перемещенному вопросу
      setTimeout(() => {
        const questionElement = document.getElementById(`question-${questionId}`);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const moveQuestionDown = (questionId: string) => {
    const index = editedQuestions.findIndex(q => q.id === questionId);
    if (index < editedQuestions.length - 1) {
      const newQuestions = [...editedQuestions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      
      // Обновляем order_index для всех вопросов
      const updatedQuestions = newQuestions.map((q, i) => ({ ...q, order_index: i + 1 }));
      setEditedQuestions(updatedQuestions);
      
      // Автоскролл к перемещенному вопросу
      setTimeout(() => {
        const questionElement = document.getElementById(`question-${questionId}`);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const addOption = (questionIndex: number) => {
    const q = editedQuestions[questionIndex];
    updateEditedQuestion(questionIndex, {
      options: [...(q.options || []), '']
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const q = editedQuestions[questionIndex];
    const newOptions = [...(q.options || [])];
    newOptions[optionIndex] = value;
    updateEditedQuestion(questionIndex, { options: newOptions });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const q = editedQuestions[questionIndex];
    const newOptions = (q.options || []).filter((_, i) => i !== optionIndex);
    updateEditedQuestion(questionIndex, { options: newOptions });
  };

  const handleCopy = async () => {
    if (!share?.share_url) return;
    try {
      await navigator.clipboard.writeText(share.share_url);
      setCopied(true);
      hapticFeedback?.light();
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const getStatusBadge = () => {
    if (!survey) return null;
    switch (survey.status) {
      case 'active':
        return { text: 'Активен', color: '#34C759' };
      case 'draft':
        return { text: 'Черновик', color: '#8E8E93' };
      case 'completed':
        return { text: 'Завершён', color: '#FF6B6B' };
      case 'archived':
        return { text: 'Архив', color: '#FF9500' };
      default:
        return { text: survey.status, color: '#8E8E93' };
    }
  };

  const questionTypes = [
    { value: 'text', label: 'Короткий ответ', icon: '📝' },
    { value: 'textarea', label: 'Развёрнутый ответ', icon: '📄' },
    { value: 'single_choice', label: 'Один из списка', icon: '🔘' },
    { value: 'multiple_choice', label: 'Несколько из списка', icon: '☑️' },
    { value: 'scale', label: 'Шкала', icon: '📊' },
    { value: 'rating', label: 'Оценка звёздами', icon: '⭐' },
    { value: 'yes_no', label: 'Да/Нет', icon: '✅' },
    { value: 'date', label: 'Дата', icon: '📅' },
    { value: 'number', label: 'Число', icon: '🔢' }
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Загрузка...
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 20 }}>
        <div>Ошибка: {error || 'Опрос не найден'}</div>
      </div>
    );
  }

  const statusBadge = getStatusBadge();
  const canEdit = (stats?.total_responses ?? 0) === 0;
  const settings = survey.settings || {};

  const renderQuestionEditor = (question: EditableQuestion, index: number) => {
    const disabled = !editingQuestions;

    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            border: editingQuestions ? '2px solid var(--tg-button-color)' : '1px solid var(--tg-section-separator-color)',
          }}
        >
          {/* Заголовок вопроса */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                minWidth: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--tg-button-color)',
                color: 'var(--tg-button-text-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 12,
                marginTop: '2px'
              }}
            >
              {index + 1}
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={question.text}
                onChange={(e) => updateEditedQuestion(index, { text: e.target.value })}
                disabled={disabled}
                placeholder="Вопрос"
                style={{
                  width: '100%',
                  fontSize: '15px',
                  fontWeight: '500',
                  padding: '10px 0',
                  border: 'none',
                  borderBottom: '2px solid var(--tg-section-separator-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--tg-text-color)',
                  outline: 'none',
                  opacity: disabled ? 0.6 : 1
                }}
              />
              
              <textarea
                value={question.description || ''}
                onChange={(e) => updateEditedQuestion(index, { description: e.target.value })}
                disabled={disabled}
                placeholder="Описание (необязательно)"
                rows={3}
                style={{
                  width: '100%',
                  fontSize: '13px',
                  padding: '6px 0',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--tg-hint-color)',
                  outline: 'none',
                  marginTop: '6px',
                  opacity: disabled ? 0.6 : 1,
                  resize: 'vertical'
                }}
              />
            </div>
            
            {/* Кнопки перемещения */}
            {editingQuestions && editedQuestions.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {index > 0 && (
                  <button
                    onClick={() => moveQuestionUp(question.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--tg-hint-color)',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ChevronUp size={12} />
                  </button>
                )}
                {index < editedQuestions.length - 1 && (
                  <button
                    onClick={() => moveQuestionDown(question.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--tg-hint-color)',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ChevronDown size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Тип вопроса */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ position: 'relative', minWidth: '200px' }}>
              <select
                value={question.type}
                onChange={(e) => updateEditedQuestion(index, {
                  type: e.target.value as QuestionType,
                  options: ['single_choice', 'multiple_choice'].includes(e.target.value) ? [''] : []
                })}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '14px',
                  outline: 'none',
                  appearance: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1
                }}
              >
                {questionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown 
                size={16} 
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--tg-hint-color)',
                  pointerEvents: 'none'
                }}
              />
            </div>
          </div>

          {/* Изображение к вопросу */}
          {question.image_url && (
            <div style={{ marginBottom: '12px', position: 'relative' }}>
              <img 
                src={question.image_url} 
                alt={question.image_name || 'Изображение'} 
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  objectFit: 'contain',
                  border: '1px solid var(--tg-section-separator-color)'
                }}
              />
              {!disabled && (
                <button
                  onClick={() => updateEditedQuestion(index, { image_url: undefined, image_name: undefined })}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#FF3B30',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4H14M6 7V11M10 7V11M3 4L4 13C4 13.5304 4.21071 14.0391 4.58579 14.4142C4.96086 14.7893 5.46957 15 6 15H10C10.5304 15 11.0391 14.7893 11.4142 14.4142C11.7893 14.0391 12 13.5304 12 13L13 4M5 4V2C5 1.73478 5.10536 1.48043 5.29289 1.29289C5.48043 1.10536 5.73478 1 6 1H10C10.2652 1 10.5196 1.10536 10.7071 1.29289C10.8946 1.48043 11 1.73478 11 2V4" 
                      stroke="white" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}


          {/* Варианты ответов для множественного выбора */}
          {(['single_choice', 'multiple_choice'].includes(question.type)) && (
            <div style={{ marginBottom: '12px' }}>
              <AnimatePresence>
                {question.options?.map((option, optIdx) => (
                  <motion.div
                    key={optIdx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: question.type === 'single_choice' ? '50%' : '4px',
                      border: '2px solid var(--tg-section-separator-color)',
                      backgroundColor: 'var(--tg-section-bg-color)'
                    }} />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, optIdx, e.target.value)}
                      disabled={disabled}
                      placeholder={`Вариант ${optIdx + 1}`}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--tg-section-separator-color)',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '14px',
                        outline: 'none',
                        opacity: disabled ? 0.6 : 1
                      }}
                    />
                    {!disabled && question.options && question.options.length > 1 && (
                      <button
                        onClick={() => removeOption(index, optIdx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--tg-hint-color)',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '18px',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Вариант "Другое" - показываем если включен */}
              {question.has_other_option && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: question.type === 'single_choice' ? '50%' : '4px',
                    border: '2px solid var(--tg-section-separator-color)',
                    backgroundColor: 'var(--tg-section-bg-color)'
                  }} />
                  <input
                    type="text"
                    value="Другое"
                    readOnly
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'var(--tg-section-bg-color)',
                      color: 'var(--tg-hint-color)',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'not-allowed'
                    }}
                  />
                  {!disabled && (
                    <button
                      onClick={() => updateEditedQuestion(index, { has_other_option: false })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--tg-hint-color)',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '18px',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
              
              {!disabled && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => addOption(index)}
                    style={{
                      flex: question.has_other_option ? undefined : 1,
                      width: question.has_other_option ? '100%' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px dashed var(--tg-section-separator-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--tg-hint-color)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      justifyContent: 'center'
                    }}
                  >
                    <span>+</span>
                    Добавить вариант
                  </button>

                  {!question.has_other_option && (
                    <button
                      onClick={() => updateEditedQuestion(index, { has_other_option: true })}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px dashed var(--tg-section-separator-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--tg-hint-color)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        justifyContent: 'center'
                      }}
                    >
                      <span>+</span>
                      Добавить «Другое»
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Шкала для типа scale */}
          {question.type === 'scale' && (
            <div style={{ marginBottom: '12px' }}>
              {!disabled && (
                <>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '4px' }}>
                        От (1-99)
                      </label>
                      <input
                        type="number"
                        value={question.scale_min === undefined ? '' : question.scale_min}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            updateEditedQuestion(index, { scale_min: undefined });
                            validateScaleValues(question.id, undefined, question.scale_max);
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              if (numValue < 1) {
                                updateEditedQuestion(index, { scale_min: 1 });
                                validateScaleValues(question.id, 1, question.scale_max);
                              } else if (numValue > 99) {
                                updateEditedQuestion(index, { scale_min: 99 });
                                validateScaleValues(question.id, 99, question.scale_max);
                              } else {
                                const currentMax = question.scale_max || 10;
                                if (numValue >= currentMax) {
                                  updateEditedQuestion(index, { 
                                    scale_min: numValue,
                                    scale_max: numValue + 1
                                  });
                                  validateScaleValues(question.id, numValue, numValue + 1);
                                } else {
                                  updateEditedQuestion(index, { scale_min: numValue });
                                  validateScaleValues(question.id, numValue, question.scale_max);
                                }
                              }
                            }
                          }
                        }}
                        min={1}
                        max={99}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${validationErrors[question.id]?.scaleMin ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
                          backgroundColor: 'var(--tg-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                      {validationErrors[question.id]?.scaleMin && (
                        <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                          {validationErrors[question.id].scaleMin}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '4px' }}>
                        До (2-100)
                      </label>
                      <input
                        type="number"
                        value={question.scale_max === undefined ? '' : question.scale_max}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            updateEditedQuestion(index, { scale_max: undefined });
                            validateScaleValues(question.id, question.scale_min, undefined);
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              if (numValue < 2) {
                                updateEditedQuestion(index, { scale_max: 2 });
                                validateScaleValues(question.id, question.scale_min, 2);
                              } else if (numValue > 100) {
                                updateEditedQuestion(index, { scale_max: 100 });
                                validateScaleValues(question.id, question.scale_min, 100);
                              } else {
                                const currentMin = question.scale_min || 1;
                                if (numValue <= currentMin) {
                                  updateEditedQuestion(index, { 
                                    scale_max: numValue,
                                    scale_min: numValue - 1
                                  });
                                  validateScaleValues(question.id, numValue - 1, numValue);
                                } else {
                                  updateEditedQuestion(index, { scale_max: numValue });
                                  validateScaleValues(question.id, question.scale_min, numValue);
                                }
                              }
                            }
                          }
                        }}
                        min={2}
                        max={100}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${validationErrors[question.id]?.scaleMax ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
                          backgroundColor: 'var(--tg-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                      {validationErrors[question.id]?.scaleMax && (
                        <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                          {validationErrors[question.id].scaleMax}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '4px' }}>
                        Подпись к мин.
                      </label>
                      <input
                        type="text"
                        value={question.scale_min_label || ''}
                        onChange={(e) => updateEditedQuestion(index, { scale_min_label: e.target.value })}
                        placeholder="Не нравится"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--tg-section-separator-color)',
                          backgroundColor: 'var(--tg-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '4px' }}>
                        Подпись к макс.
                      </label>
                      <input
                        type="text"
                        value={question.scale_max_label || ''}
                        onChange={(e) => updateEditedQuestion(index, { scale_max_label: e.target.value })}
                        placeholder="Нравится"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--tg-section-separator-color)',
                          backgroundColor: 'var(--tg-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* Обязательный вопрос */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '10px',
            borderTop: '1px solid var(--tg-section-separator-color)'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: 'var(--tg-text-color)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              position: 'relative'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: `2px solid ${question.is_required ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: question.is_required ? 'var(--tg-button-color)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                <input
                  type="checkbox"
                  checked={question.is_required}
                  onChange={(e) => updateEditedQuestion(index, { is_required: e.target.checked })}
                  disabled={disabled}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: disabled ? 'not-allowed' : 'pointer'
                  }}
                />
                {question.is_required && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              Обязательный вопрос
            </label>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 12, paddingBottom: 80 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, flex: 1 }}>{survey.title}</h1>
          {statusBadge && (
            <div style={{ background: statusBadge.color, color: 'white', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
              {statusBadge.text}
            </div>
          )}
        </div>
        {survey.description && (
          <p style={{ color: 'var(--tg-hint-color)', margin: '8px 0 0 0', fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{survey.description}</p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tg-hint-color)' }}>
            📝 {survey.questions?.length || 0} {(survey.questions?.length || 0) === 1 ? 'вопрос' : 'вопросов'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tg-hint-color)' }}>
            📊 {stats?.total_responses ?? 0} {((stats?.total_responses ?? 0) === 1 || (stats?.total_responses ?? 0) > 20) ? 'ответ' : 'ответов'}
          </div>
        </div>
      </div>

      {/* Табы */}
      <AnimatedTabs
        tabs={[
          { id: 'overview', label: 'Обзор' },
          { id: 'questions', label: 'Вопросы' },
          { id: 'analytics', label: 'Аналитика' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id as any);
          hapticFeedback?.light();
        }}
        style={{ marginBottom: 12 }}
      />

      {/* Таб: Обзор */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Управление статусом */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 12 }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 600 }}>Статус опроса</h3>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                style={{
                  width: '100%',
                  background: 'var(--tg-bg-color)',
                  color: 'var(--tg-text-color)',
                  border: '1px solid var(--tg-section-separator-color)',
                  borderRadius: 10,
                  padding: '11px 14px',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span>{statusBadge?.text}</span>
                <ChevronDown size={16} />
              </button>
              {showStatusDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--tg-section-bg-color)',
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  overflow: 'hidden',
                  border: '1px solid var(--tg-section-separator-color)'
                }}>
                  {survey.status !== 'active' && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '11px 14px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--tg-text-color)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--tg-section-separator-color)'
                      }}
                    >
                      ✅ Активировать
                    </button>
                  )}
                  {survey.status === 'active' && canEdit && (
                    <button
                      onClick={() => handleStatusChange('draft')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '11px 14px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--tg-text-color)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--tg-section-separator-color)'
                      }}
                    >
                      📝 Перевести в черновик
                    </button>
                  )}
                  {survey.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange('completed')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '11px 14px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--tg-text-color)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--tg-section-separator-color)'
                      }}
                    >
                      ✔️ Завершить опрос
                    </button>
                  )}
                  {survey.status !== 'archived' && (
                    <button
                      onClick={() => handleStatusChange('archived')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '11px 14px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--tg-text-color)',
                        cursor: 'pointer'
                      }}
                    >
                      📦 Архивировать
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Распространение */}
          {share && (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 600 }}>Распространение</h3>
              <div style={{ background: 'var(--tg-bg-color)', borderRadius: 8, padding: 10, marginBottom: 10, wordBreak: 'break-all', fontSize: 12, color: 'var(--tg-hint-color)' }}>
                {share.share_url}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1,
                    background: 'var(--tg-button-color)',
                    color: 'var(--tg-button-text-color)',
                    border: 'none',
                    borderRadius: 8,
                    padding: 10,
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Copy size={14} /> {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(share.share_url)}`, '_blank')}
                  style={{
                    flex: 1,
                    background: '#0088cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: 10,
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Share size={14} /> Поделиться
                </button>
              </div>
              {share.qr_code && (
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                  <img src={share.qr_code} alt="QR" style={{ maxWidth: 160, borderRadius: 8, border: '1px solid var(--tg-section-separator-color)' }} />
                </div>
              )}
            </div>
          )}

          {/* Настройки опроса */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 12 }}>
            <button
              onClick={() => {
                setSettingsExpanded(!settingsExpanded);
                hapticFeedback?.light();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 0,
                marginBottom: settingsExpanded ? 10 : 0,
                color: 'var(--tg-text-color)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={16} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Настройки опроса</h3>
              </div>
              {settingsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {settingsExpanded && (
              <>
                <button
                  onClick={() => {
                    if (editingSettings) {
                      handleSaveSettings();
                    } else {
                      setEditingSettings(true);
                    }
                    hapticFeedback?.light();
                  }}
                  style={{
                    background: editingSettings ? 'var(--tg-button-color)' : 'var(--tg-button-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: 10
                  }}
                >
                  {editingSettings ? <><Save size={14} /> Сохранить изменения</> : <>⚙️ Редактировать</>}
                </button>
                
                {editingSettings && (
                  <button
                    onClick={() => {
                      setEditingSettings(false);
                      setEditedSettings(survey.settings);
                      setEditedMaxParticipants(survey.maxParticipants?.toString() || '');
                      hapticFeedback?.light();
                    }}
                    style={{
                      background: '#8E8E93',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontWeight: 600,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      width: '100%',
                      marginBottom: 10
                    }}
                  >
                    <X size={14} /> Отменить
                  </button>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  {/* Показывать прогресс - закомментировано */}
                  {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Показывать прогресс</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.showProgress || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, showProgress: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.showProgress ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '22px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '16px',
                            width: '16px',
                            left: editedSettings?.showProgress ? '24px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.showProgress ? 'Да' : 'Нет'}</span>
                    )}
                  </div> */}

                  {/* Один ответ на пользователя */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Один ответ на пользователя</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.oneResponsePerUser || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, oneResponsePerUser: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.oneResponsePerUser ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '22px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '16px',
                            width: '16px',
                            left: editedSettings?.oneResponsePerUser ? '24px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.oneResponsePerUser ? 'Да' : 'Нет'}</span>
                    )}
                  </div>

                  {/* Анонимность */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Анонимность</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.allowAnonymous || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, allowAnonymous: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.allowAnonymous ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '22px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '16px',
                            width: '16px',
                            left: editedSettings?.allowAnonymous ? '24px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.allowAnonymous ? 'Разрешена' : 'Запрещена'}</span>
                    )}
                  </div>

                  {/* Сбор Telegram-данных - закомментировано */}
                  {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Сбор Telegram-данных</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.collectTelegramData || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, collectTelegramData: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.collectTelegramData ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '22px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '16px',
                            width: '16px',
                            left: editedSettings?.collectTelegramData ? '24px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.collectTelegramData ? 'Да' : 'Нет'}</span>
                    )}
                  </div> */}

                  {/* Перемешать вопросы */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Перемешать вопросы</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.randomizeQuestions || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, randomizeQuestions: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.randomizeQuestions ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '22px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '16px',
                            width: '16px',
                            left: editedSettings?.randomizeQuestions ? '24px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.randomizeQuestions ? 'Да' : 'Нет'}</span>
                    )}
                  </div>

                  {/* Макс. участников */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Макс. участников</span>
                    {editingSettings ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <input
                          id="settings-maxParticipants"
                          type="number"
                          value={editedMaxParticipants}
                          onChange={(e) => {
                            setEditedMaxParticipants(e.target.value);
                            if (settingsValidationErrors.maxParticipants) {
                              setSettingsValidationErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.maxParticipants;
                                return newErrors;
                              });
                            }
                          }}
                          placeholder="Без ограничений"
                          min={1}
                          style={{
                            width: '120px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${settingsValidationErrors.maxParticipants ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
                            backgroundColor: 'var(--tg-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '13px',
                            outline: 'none',
                            textAlign: 'right'
                          }}
                        />
                        {settingsValidationErrors.maxParticipants && (
                          <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px', textAlign: 'right' }}>
                            {settingsValidationErrors.maxParticipants}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{survey.maxParticipants || 'Не указано'}</span>
                    )}
                  </div>

                  {/* Мотивация */}
                  {(settings.motivationEnabled || editingSettings) && (
                    <>
                      {/* Предупреждение */}
                      <div style={{ 
                        marginBottom: '16px', 
                        padding: '12px', 
                        backgroundColor: 'rgba(244, 109, 0, 0.1)', 
                        borderRadius: '8px',
                        border: '1px solid rgba(244, 109, 0, 0.3)'
                      }}>
                        <div style={{ 
                          fontSize: '13px', 
                          color: 'var(--tg-hint-color)', 
                          lineHeight: '1.4' 
                        }}>
                          ⚠️ При включении мотивации респонденту будет заранее известно о награде за прохождение опроса. Мы дадим ваш Telegram-контакт респонденту для связи с вами и выдачи приза. AI Surveys не участвует в хранении и передаче наград.
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                        <span style={{ color: 'var(--tg-hint-color)' }}>Мотивация включена</span>
                        {editingSettings ? (
                          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                            <input
                              type="checkbox"
                              checked={editedSettings?.motivationEnabled || false}
                              onChange={(e) => setEditedSettings({ ...editedSettings!, motivationEnabled: e.target.checked })}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: editedSettings?.motivationEnabled ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                              borderRadius: '22px',
                              transition: '0.3s'
                            }}>
                              <span style={{
                                position: 'absolute',
                                content: '',
                                height: '16px',
                                width: '16px',
                                left: editedSettings?.motivationEnabled ? '24px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                transition: '0.3s'
                              }} />
                            </span>
                          </label>
                        ) : (
                          <span style={{ fontWeight: 500 }}>Да</span>
                        )}
                      </div>

                      {editingSettings && editedSettings?.motivationEnabled && (
                        <>
                          <div style={{ padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                            <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '6px' }}>
                              Тип мотивации
                            </label>
                            <select
                              value={editedSettings?.motivationType || 'discount'}
                              onChange={(e) => setEditedSettings({ 
                                ...editedSettings!, 
                                motivationType: e.target.value as any,
                                motivationDetails: '',
                                motivationConditions: ''
                              })}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid var(--tg-section-separator-color)',
                                backgroundColor: 'var(--tg-bg-color)',
                                color: 'var(--tg-text-color)',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            >
                              <option value="discount">💰 Скидка</option>
                              <option value="promo">🛒 Промокод</option>
                              <option value="stars">⭐ Звёзды Telegram</option>
                              <option value="gift">🎁 Подарок</option>
                              <option value="other">Другое</option>
                            </select>
                          </div>

                          {editedSettings?.motivationType === 'stars' && (
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                              <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '6px' }}>
                                Количество звёзд (минимум 1)
                              </label>
                              <input
                                id="settings-motivationDetails"
                                type="text"
                                inputMode="numeric"
                                value={editedSettings?.motivationDetails || ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, ''); // Только цифры
                                  setEditedSettings({ ...editedSettings!, motivationDetails: val });
                                  if (settingsValidationErrors.motivationDetails) {
                                    setSettingsValidationErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.motivationDetails;
                                      return newErrors;
                                    });
                                  }
                                }}
                                placeholder="50"
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${settingsValidationErrors.motivationDetails ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
                                  backgroundColor: 'var(--tg-bg-color)',
                                  color: 'var(--tg-text-color)',
                                  fontSize: '13px',
                                  outline: 'none'
                                }}
                              />
                              {settingsValidationErrors.motivationDetails && (
                                <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                                  {settingsValidationErrors.motivationDetails}
                                </div>
                              )}
                            </div>
                          )}

                          {editedSettings?.motivationType === 'discount' && (
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                              <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '6px' }}>
                                Описание скидки
                              </label>
                              <input
                                id="settings-motivationDetails"
                                type="text"
                                value={editedSettings?.motivationDetails || ''}
                                onChange={(e) => {
                                  setEditedSettings({ ...editedSettings!, motivationDetails: e.target.value });
                                  if (settingsValidationErrors.motivationDetails) {
                                    setSettingsValidationErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.motivationDetails;
                                      return newErrors;
                                    });
                                  }
                                }}
                                placeholder="20% скидка на следующий заказ"
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${settingsValidationErrors.motivationDetails ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
                                  backgroundColor: 'var(--tg-bg-color)',
                                  color: 'var(--tg-text-color)',
                                  fontSize: '13px',
                                  outline: 'none'
                                }}
                              />
                              {settingsValidationErrors.motivationDetails && (
                                <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                                  {settingsValidationErrors.motivationDetails}
                                </div>
                              )}
                            </div>
                          )}

                          {editedSettings?.motivationType === 'promo' && (
                            <>
                              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                                <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '6px' }}>
                                  Описание промокода
                                </label>
                                <input
                                  id="settings-motivationDetails"
                                  type="text"
                                  value={editedSettings?.motivationDetails || ''}
                                  onChange={(e) => {
                                    setEditedSettings({ ...editedSettings!, motivationDetails: e.target.value });
                                    if (settingsValidationErrors.motivationDetails) {
                                      setSettingsValidationErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors.motivationDetails;
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  placeholder="Бесплатная доставка за прохождение опроса"
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    border: `1px solid ${settingsValidationErrors.motivationDetails ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
                                    backgroundColor: 'var(--tg-bg-color)',
                                    color: 'var(--tg-text-color)',
                                    fontSize: '13px',
                                    outline: 'none'
                                  }}
                                />
                                {settingsValidationErrors.motivationDetails && (
                                  <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                                    {settingsValidationErrors.motivationDetails}
                                  </div>
                                )}
                              </div>
                              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                                <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '6px' }}>
                                  Промокод
                                </label>
                                <input
                                  id="settings-motivationConditions"
                                  type="text"
                                  value={editedSettings?.motivationConditions || ''}
                                  onChange={(e) => {
                                    setEditedSettings({ ...editedSettings!, motivationConditions: e.target.value });
                                    if (settingsValidationErrors.motivationConditions) {
                                      setSettingsValidationErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors.motivationConditions;
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  placeholder="FREE_DELIVERY"
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    border: `1px solid ${settingsValidationErrors.motivationConditions ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
                                    backgroundColor: 'var(--tg-bg-color)',
                                    color: 'var(--tg-text-color)',
                                    fontSize: '13px',
                                    outline: 'none'
                                  }}
                                />
                                {settingsValidationErrors.motivationConditions && (
                                  <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                                    {settingsValidationErrors.motivationConditions}
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {(editedSettings?.motivationType === 'gift' || editedSettings?.motivationType === 'other') && (
                            <div style={{ padding: '8px 0' }}>
                              <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '6px' }}>
                                Описание
                              </label>
                              <input
                                id="settings-motivationDetails"
                                type="text"
                                value={editedSettings?.motivationDetails || ''}
                                onChange={(e) => {
                                  setEditedSettings({ ...editedSettings!, motivationDetails: e.target.value });
                                  if (settingsValidationErrors.motivationDetails) {
                                    setSettingsValidationErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.motivationDetails;
                                      return newErrors;
                                    });
                                  }
                                }}
                                placeholder="Опишите мотивацию..."
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${settingsValidationErrors.motivationDetails ? '#FF3B30' : 'var(--tg-section-separator-color)'}`,
                                  backgroundColor: 'var(--tg-bg-color)',
                                  color: 'var(--tg-text-color)',
                                  fontSize: '13px',
                                  outline: 'none'
                                }}
                              />
                              {settingsValidationErrors.motivationDetails && (
                                <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                                  {settingsValidationErrors.motivationDetails}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {!editingSettings && settings.motivationEnabled && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                            <span style={{ color: 'var(--tg-hint-color)' }}>Тип мотивации</span>
                            <span style={{ fontWeight: 500 }}>
                              {settings.motivationType === 'discount' && '💰 Скидка'}
                              {settings.motivationType === 'promo' && '🛒 Промокод'}
                              {settings.motivationType === 'stars' && '⭐ Telegram Stars'}
                              {settings.motivationType === 'gift' && '🎁 Подарок'}
                              {settings.motivationType === 'other' && 'Другое'}
                            </span>
                          </div>
                          {settings.motivationDetails && (
                            <div style={{ padding: '8px 0' }}>
                              <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginBottom: '4px' }}>
                                {settings.motivationType === 'stars' ? 'Количество звёзд:' : 
                                 settings.motivationType === 'discount' ? 'Размер скидки:' :
                                 settings.motivationType === 'promo' ? 'Описание промокода:' : 'Описание:'}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 500 }}>{settings.motivationDetails}</div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Таб: Вопросы */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {canEdit && (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--tg-hint-color)' }}>
                  {editingQuestions ? 'Режим редактирования активен' : 'Редактирование доступно'}
                </span>
              </div>
              <button
                onClick={() => {
                  if (editingQuestions) {
                    handleSaveQuestions();
                  } else {
                    setEditingQuestions(true);
                  }
                  hapticFeedback?.light();
                }}
                style={{
                  background: editingQuestions ? 'var(--tg-button-color)' : 'var(--tg-button-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {editingQuestions ? <><Save size={14} /> Сохранить изменения</> : <>⚙️ Редактировать вопросы</>}
              </button>
              {editingQuestions && (
                <button
                  onClick={() => {
                    setEditingQuestions(false);
                    setEditedQuestions(JSON.parse(JSON.stringify(questions)));
                    hapticFeedback?.light();
                  }}
                  style={{
                    background: '#8E8E93',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <X size={14} /> Отменить
                </button>
              )}
            </div>
          )}
          {!canEdit && (
            <div style={{ background: '#FFF3CD', color: '#856404', borderRadius: 10, padding: 10, fontSize: 12 }}>
              ⚠️ Редактирование невозможно — есть ответы на опрос
            </div>
          )}
          {editedQuestions.length === 0 ? (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 10, padding: 20, textAlign: 'center', color: 'var(--tg-hint-color)' }}>
              Вопросов нет
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <AnimatePresence>
                {editedQuestions.map((q, idx) => renderQuestionEditor(q, idx))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Таб: Аналитика */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Подтабы аналитики */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '4px',
            gap: '2px'
          }}>
            <button
              onClick={() => setAnalyticsTab('summary')}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: analyticsTab === 'summary' ? 'var(--tg-button-color)' : 'transparent',
                color: analyticsTab === 'summary' ? 'white' : 'var(--tg-text-color)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Сводка
            </button>
            <button
              onClick={() => setAnalyticsTab('question')}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: analyticsTab === 'question' ? 'var(--tg-button-color)' : 'transparent',
                color: analyticsTab === 'question' ? 'white' : 'var(--tg-text-color)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Вопрос
            </button>
            <button
              onClick={() => setAnalyticsTab('user')}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: analyticsTab === 'user' ? 'var(--tg-button-color)' : 'transparent',
                color: analyticsTab === 'user' ? 'white' : 'var(--tg-text-color)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Отдельный пользователь
            </button>
          </div>

          {/* Контент подтабов */}
          {analyticsTab === 'summary' && (
            <SummaryTab 
              survey={survey}
              questions={questions || []}
              responses={responsesPage}
              stats={stats}
              loading={analyticsLoading}
            />
          )}
          
          {analyticsTab === 'question' && (
            <QuestionTab 
              questions={questions}
              responses={responsesPage}
              survey={survey}
              loading={analyticsLoading}
            />
          )}
          
          {analyticsTab === 'user' && (
            <IndividualUserTab 
              questions={questions}
              responses={responsesPage}
              survey={survey}
              loading={analyticsLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}
