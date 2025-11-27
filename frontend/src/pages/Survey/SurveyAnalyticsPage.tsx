import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Copy, Share, Settings, ChevronDown, ChevronUp, Save, X, Trash2, Download, QrCode, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { surveyApi, questionApi, aiAnalytics, uploadApi } from '../../services/api';
import type { SurveyShareResponse } from '../../services/api';
import type { Survey, SurveySettings, QuestionType } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { AnimatedTabs } from '../../components/ui/AnimatedTabs';
import ImagePopup from '../../components/ui/ImagePopup';
import CenteredPageContainer from '../../components/layout/CenteredPageContainer';

// Типы для условной логики
type ConditionalOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'date_after'
  | 'date_before'
  | 'date_on';

interface Condition {
  operator: ConditionalOperator;
  value: string | number | string[];
}

interface ConditionalLogic {
  enabled: boolean;
  dependsOn: string; // ID вопроса, от которого зависит
  conditions: Condition[];
  logicOperator?: 'AND' | 'OR'; // Для множественных условий
}

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
  tempImagePath?: string; // Временный путь к изображению для загрузки в Яндекс Диск
  conditionalLogic?: ConditionalLogic; // Условия показа этого вопроса
}

// Компонент для таба "Сводка"
const SummaryTab: React.FC<{
  survey: Survey | null;
  questions: EditableQuestion[];
  responses: any[] | null;
  stats: { total_responses: number } | null;
  loading: boolean;
  aiAnalyticsStatus: 'not_found' | 'exists' | 'generating' | 'loading';
  onNavigateToAI: () => void;
  imageLoading: { [questionId: string]: boolean };
  setImageLoading: React.Dispatch<React.SetStateAction<{ [questionId: string]: boolean }>>;
  setFullscreenImage: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({ survey, questions, responses, stats, loading, aiAnalyticsStatus, onNavigateToAI, imageLoading, setImageLoading, setFullscreenImage }) => {
  const { t } = useTranslation();
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
          borderTop: '3px solid var(--tg-button-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <div>{t('surveyAnalytics.loading')}</div>
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
        {t('surveyAnalytics.noResponses')}
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
      case 'date':
      case 'number':
        return {
          type: 'text',
          answers: answers.slice(0, showAllAnswers[question.id] ? answers.length : 5),
          totalCount: answers.length,
          hasMore: answers.length > 5
        };
      
      case 'yes_no':
        const yesNoStats = answers.reduce((acc: any, answer) => {
          const value = answer.value === 'yes' ? t('surveyAnalytics.answers.yes') : answer.value === 'no' ? t('surveyAnalytics.answers.no') : answer.value;
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {});
        return {
          type: 'single_choice',
          stats: yesNoStats,
          totalCount: answers.length
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
        <h3 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 600 }}>{t('surveyAnalytics.generalStats')}</h3>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--tg-button-color)' }}>
          {stats?.total_responses ?? 0}
        </div>
        <div style={{ color: 'var(--tg-hint-color)', fontSize: 12 }}>{t('surveyAnalytics.totalAnswers')}</div>
      </div>


      {/* Аналитика по вопросам */}
      {questions && questions.length > 0 && questions.map((question, index) => {
        const questionStats = getQuestionStats(question);
        const aiButtonPosition = Math.floor(questions.length / 3);
        const shouldShowAIButton = index === aiButtonPosition;
        
        return (
          <React.Fragment key={question.id}>
            <div style={{ 
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

              {/* Изображение к вопросу */}
              {question.image_url && (
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                    position: 'relative',
                      marginBottom: '8px',
                    backgroundColor: 'var(--tg-section-bg-color)',
                      borderRadius: '8px',
                    border: '1px solid var(--tg-section-separator-color)',
                    padding: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxWidth: '100%',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                  }}
                  onClick={() => setFullscreenImage(question.image_url || null)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  >
                    {imageLoading[question.id] && (
                      <div
                        style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1
                        }}
                      >
                        <div
                          style={{
                          width: '32px',
                          height: '32px',
                          border: '3px solid var(--tg-section-separator-color)',
                          borderTop: '3px solid var(--tg-button-color)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                          }}
                        />
                        <span
                          style={{
                          color: 'var(--tg-hint-color)', 
                          fontSize: '14px' 
                          }}
                        >
                          {t('surveyAnalytics.imageLoading')}
                        </span>
                        <style>{`
                          @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                          }
                        `}</style>
                      </div>
                    )}
                    <img 
                      src={question.image_url} 
                      alt={question.image_name || 'Question illustration'}
                      onLoadStart={() => {
                        setImageLoading(prev => ({ ...prev, [question.id]: true }));
                      }}
                      onLoad={() => {
                        setImageLoading(prev => ({ ...prev, [question.id]: false }));
                      }}
                      onError={(e) => {
                        const imgElement = e.currentTarget;
                        imgElement.style.display = 'none';
                        setImageLoading(prev => ({ ...prev, [question.id]: false }));
                        const errorDiv = document.createElement('div');
                        errorDiv.textContent = t('surveyAnalytics.imageLoadError');
                        errorDiv.style.cssText =
                          'padding: 20px; text-align: center; color: var(--tg-hint-color); background: var(--tg-section-bg-color); border-radius: 12px; border: 1px solid var(--tg-section-separator-color);';
                        imgElement.parentElement?.appendChild(errorDiv);
                      }}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: imageLoading[question.id] ? 'none' : 'block'
                      }}
                    />
                  </div>
                  <p
                    style={{
                    fontSize: '11px',
                    color: 'var(--tg-hint-color)',
                    margin: '6px 0 0 0',
                    textAlign: 'center',
                    fontStyle: 'italic'
                    }}
                  >
                    {t('surveyAnalytics.imageClick')}
                  </p>
                </div>
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
                  questionType={question.type}
                />
              )}
              
              {questionStats.type === 'single_choice' && (
                <SingleChoiceChart 
                  stats={questionStats.stats}
                  totalCount={questionStats.totalCount}
                  options={question.options || []}
                  questionType={question.type}
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

            {/* Кнопка ИИ аналитики после 1/3 вопросов */}
            {shouldShowAIButton && (
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
                    if (aiAnalyticsStatus === 'generating') {
                      // Если генерируется, показываем уведомление
                      return;
                    }
                    onNavigateToAI();
                  }}
                  disabled={aiAnalyticsStatus === 'generating'}
                  style={{
                    width: '100%',
                    background: aiAnalyticsStatus === 'generating' 
                      ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundSize: '200% 200%',
                    animation: aiAnalyticsStatus === 'generating' ? 'none' : 'gradientShift 3s ease infinite',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '16px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: aiAnalyticsStatus === 'generating' ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: aiAnalyticsStatus === 'generating' 
                      ? '0 2px 8px rgba(108, 117, 125, 0.3)'
                      : '0 4px 15px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.3s ease',
                    opacity: aiAnalyticsStatus === 'generating' ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (aiAnalyticsStatus !== 'generating') {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (aiAnalyticsStatus !== 'generating') {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                    }
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
                    {aiAnalyticsStatus === 'exists' ? t('surveyAnalytics.aiAnalytics.button.exists') : 
                     aiAnalyticsStatus === 'generating' ? t('surveyAnalytics.aiAnalytics.button.generating') :
                     t('surveyAnalytics.aiAnalytics.button.notFound')}
                  </span>
                </button>

                {/* Описание под кнопкой */}
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--tg-hint-color)',
                    lineHeight: '1.4',
                    textAlign: 'center'
                  }}>
                    {t('surveyAnalytics.aiAnalytics.description')}
                  </p>
                </div>
              </div>
            )}
          </React.Fragment>
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
  selectedUserId: string;
  onUserSelect: (userId: string) => void;
  imageLoading: { [questionId: string]: boolean };
  setImageLoading: React.Dispatch<React.SetStateAction<{ [questionId: string]: boolean }>>;
  setFullscreenImage: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({ questions, responses, survey, loading, selectedUserId, onUserSelect, imageLoading, setImageLoading, setFullscreenImage }) => {
  const { t } = useTranslation();
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
        label: t('surveyAnalytics.respondentNumber', { number: index + 1 }),
        index: index
      };
    } else {
      const username = user?.username || t('surveyAnalytics.respondent');
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
      onUserSelect(userOptions[0].id);
    }
  }, [userOptions, selectedUserId, onUserSelect]);

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
    onUserSelect(userId);
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
          {t('surveyAnalytics.loading')}
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
          {t('surveyAnalytics.noResponsesYet')}
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
          {t('surveyAnalytics.selectUser')}
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
          {t('surveyAnalytics.from')} {totalUsers}
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
              {t('surveyAnalytics.respondentNumber', { number: currentUserIndex })}
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
              @{currentUserData.username || t('surveyAnalytics.respondent')}
            </a>
          ) : (
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--tg-text-color)',
              fontWeight: '500'
            }}>
              {t('surveyAnalytics.respondent')}
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
                    originalValue: t('surveyAnalytics.answers.other'),
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
                    originalValue: [...predefinedSelected, t('surveyAnalytics.answers.other')],
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

                {/* Изображение к вопросу */}
                {question.image_url && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      position: 'relative',
                      backgroundColor: 'var(--tg-section-bg-color)',
                      borderRadius: '12px',
                      border: '1px solid var(--tg-section-separator-color)',
                      padding: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      maxWidth: '100%',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s ease'
                    }}
                    onClick={() => setFullscreenImage(question.image_url || null)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    >
                      {imageLoading[question.id] && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 1
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid var(--tg-section-separator-color)',
                            borderTop: '3px solid var(--tg-button-color)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          <span style={{ 
                            color: 'var(--tg-hint-color)', 
                            fontSize: '14px' 
                          }}>
                            {t('surveyAnalytics.imageLoading')}
                          </span>
                          <style>{`
                            @keyframes spin {
                              0% { transform: rotate(0deg); }
                              100% { transform: rotate(360deg); }
                            }
                          `}</style>
                        </div>
                      )}
                      <img 
                        src={question.image_url} 
                        alt={question.image_name || 'Question illustration'}
                        onLoadStart={() => {
                          setImageLoading(prev => ({ ...prev, [question.id]: true }));
                        }}
                        onLoad={() => {
                          console.log('Изображение успешно загружено:', question.image_url);
                          setImageLoading(prev => ({ ...prev, [question.id]: false }));
                        }}
                        onError={(e) => {
                          console.error('Ошибка загрузки изображения:', question.image_url);
                          const imgElement = e.currentTarget;
                          imgElement.style.display = 'none';
                          setImageLoading(prev => ({ ...prev, [question.id]: false }));
                          // Показываем сообщение об ошибке
                          const errorDiv = document.createElement('div');
                          errorDiv.textContent = t('surveyAnalytics.imageLoadError');
                          errorDiv.style.cssText = 'padding: 20px; text-align: center; color: var(--tg-hint-color); background: var(--tg-section-bg-color); border-radius: 12px; border: 1px solid var(--tg-section-separator-color);';
                          imgElement.parentElement?.appendChild(errorDiv);
                        }}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          display: imageLoading[question.id] ? 'none' : 'block'
                        }}
                      />
                    </div>
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--tg-hint-color)',
                      margin: '6px 0 0 0',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      {t('surveyAnalytics.imageClick')}
                    </p>
                  </div>
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
  selectedQuestionId: string;
  onQuestionSelect: (questionId: string) => void;
  imageLoading: { [questionId: string]: boolean };
  setImageLoading: React.Dispatch<React.SetStateAction<{ [questionId: string]: boolean }>>;
  setFullscreenImage: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({ questions, responses, survey, loading, selectedQuestionId, onQuestionSelect, imageLoading, setImageLoading, setFullscreenImage }) => {
  const { t } = useTranslation();

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
          {t('surveyAnalytics.loading')}
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
        {t('surveyAnalytics.loading')}
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
                originalValue: t('surveyAnalytics.answers.other'),
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
                originalValue: [...predefinedSelected, t('surveyAnalytics.answers.other')],
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
          {t('surveyAnalytics.selectQuestion')}
        </label>
        <select
          value={selectedQuestionId}
          onChange={(e) => onQuestionSelect(e.target.value)}
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
          <option value="">{t('surveyAnalytics.questionNotSelected')}</option>
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

          {/* Изображение к вопросу */}
          {selectedQuestion.image_url && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                position: 'relative',
                backgroundColor: 'var(--tg-section-bg-color)',
                borderRadius: '12px',
                border: '1px solid var(--tg-section-separator-color)',
                padding: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '100%',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onClick={() => setFullscreenImage(selectedQuestion.image_url || null)}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              >
                {imageLoading[selectedQuestion.id] && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid var(--tg-section-separator-color)',
                      borderTop: '3px solid var(--tg-button-color)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ 
                      color: 'var(--tg-hint-color)', 
                      fontSize: '14px' 
                    }}>
                      Загрузка изображения...
                    </span>
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                  </div>
                )}
                <img 
                  src={selectedQuestion.image_url} 
                  alt={selectedQuestion.image_name || 'Question illustration'}
                  onLoadStart={() => {
                    setImageLoading(prev => ({ ...prev, [selectedQuestion.id]: true }));
                  }}
                  onLoad={() => {
                    console.log('Изображение успешно загружено:', selectedQuestion.image_url);
                    setImageLoading(prev => ({ ...prev, [selectedQuestion.id]: false }));
                  }}
                  onError={(e) => {
                    console.error('Ошибка загрузки изображения:', selectedQuestion.image_url);
                    const imgElement = e.currentTarget;
                    imgElement.style.display = 'none';
                    setImageLoading(prev => ({ ...prev, [selectedQuestion.id]: false }));
                    // Показываем сообщение об ошибке
                    const errorDiv = document.createElement('div');
                    errorDiv.textContent = t('surveyAnalytics.imageLoadError');
                    errorDiv.style.cssText = 'padding: 20px; text-align: center; color: var(--tg-hint-color); background: var(--tg-section-bg-color); border-radius: 12px; border: 1px solid var(--tg-section-separator-color);';
                    imgElement.parentElement?.appendChild(errorDiv);
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: imageLoading[selectedQuestion.id] ? 'none' : 'block'
                  }}
                />
              </div>
              <p style={{
                fontSize: '11px',
                color: 'var(--tg-hint-color)',
                margin: '6px 0 0 0',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                {t('surveyAnalytics.imageClick')}
              </p>
            </div>
          )}

          {questionAnswers.length === 0 ? (
            <p style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)',
              textAlign: 'center',
              padding: '20px 0'
            }}>
              {t('surveyAnalytics.noAnswersForQuestion')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questionAnswers.map((answer, index) => {
                // Определяем, нужно ли показывать username сверху
                const showUsernameOnTop = ['single_choice', 'multiple_choice', 'scale', 'rating'].includes(selectedQuestion.type);
                
                // Определяем, нужно ли показывать username справа (как у rating)
                const showUsernameRight = ['yes_no', 'date', 'number'].includes(selectedQuestion.type);
                
                // Определяем, нужно ли показывать username под ответом (для текстовых вопросов)
                const showUsernameBelow = ['text', 'textarea'].includes(selectedQuestion.type);
                
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
                      {/* Username справа для определенных типов вопросов */}
                      {showUsernameRight && !isAnonymous && answer.user && (
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
                    
                    {/* Username под ответом для текстовых вопросов */}
                    {showUsernameBelow && !isAnonymous && answer.user && (
                      <div style={{
                        textAlign: 'center',
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: 'var(--tg-section-bg-color)',
                        borderRadius: '6px',
                        border: '1px solid var(--tg-section-separator-color)'
                      }}>
                        <a
                          href={answer.user.username ? `https://t.me/${answer.user.username}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: '11px', 
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

    case 'yes_no': {
      const yesSelected = value === 'yes' || value === 'Да';
      const noSelected = value === 'no' || value === 'Нет';
      return (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: yesSelected ? '#34C759' : 'var(--tg-section-bg-color)',
            color: yesSelected ? 'white' : 'var(--tg-text-color)'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: `2px solid ${yesSelected ? 'white' : 'var(--tg-hint-color)'}`,
              backgroundColor: yesSelected ? 'white' : 'transparent',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: yesSelected ? '#34C759' : 'transparent',
                opacity: yesSelected ? 1 : 0
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
            backgroundColor: noSelected ? '#FF3B30' : 'var(--tg-section-bg-color)',
            color: noSelected ? 'white' : 'var(--tg-text-color)'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: `2px solid ${noSelected ? 'white' : 'var(--tg-hint-color)'}`,
              backgroundColor: noSelected ? 'white' : 'transparent',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: noSelected ? '#FF3B30' : 'transparent',
                opacity: noSelected ? 1 : 0
              }} />
            </div>
            <span>Нет</span>
          </div>
        </div>
      );
    }

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
  questionType?: string;
}> = ({ answers, totalCount, hasMore, isAnonymous, onShowPopup, questionType }) => {
  const { t } = useTranslation();
  const renderUserLink = (user: any) => {
    if (!user) return null;
    
    const username = user.username;
    const displayName = username ? `@${username}` : t('surveyAnalytics.respondent');
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
        {answers.map((answer, index) => {
          // Определяем, нужно ли показывать username в одной строке с ответом
          const showUsernameInline = questionType && ['yes_no', 'date', 'number'].includes(questionType);
          
          return (
            <div key={index} style={{ 
              padding: '12px', 
              backgroundColor: 'var(--tg-bg-color)', 
              borderRadius: '8px',
              display: 'flex',
              flexDirection: showUsernameInline ? 'row' : 'column',
              justifyContent: showUsernameInline ? 'space-between' : 'flex-start',
              alignItems: showUsernameInline ? 'center' : 'stretch',
              gap: showUsernameInline ? '8px' : '8px'
            }}>
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--tg-text-color)',
                lineHeight: '1.4',
                wordBreak: 'break-word',
                flex: showUsernameInline ? 1 : 'none'
              }}>
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
                  
                  // Форматируем yes/no для отображения
                  if (displayValue === 'yes') {
                    displayValue = t('surveyAnalytics.answers.yes');
                  } else if (displayValue === 'no') {
                    displayValue = t('surveyAnalytics.answers.no');
                  }
                  
                  return displayValue;
                })()}
              </div>
              {!isAnonymous && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: showUsernameInline ? 'flex-end' : 'center',
                  alignItems: 'center',
                  flexShrink: 0
                }}>
                  {renderUserLink(answer.user)}
                </div>
              )}
            </div>
          );
        })}
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
          {t('surveyAnalytics.showAll')} ({totalCount})
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
  questionType?: string;
}> = ({ stats, totalCount, questionType }) => {
  const { t } = useTranslation();

  const YES_COLOR = '#34C759';
  const NO_COLOR = '#FF3B30';
  const defaultColors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF9800', '#9C27B0', '#8E8E93', '#00BCD4', '#FFEB3B', '#607D8B'];

  const normalizeOption = (option: string) => option.toString().trim().toLowerCase();
  const isYesOption = (option: string) => {
    const normalized = normalizeOption(option);
    return normalized.includes('да') || normalized.includes('yes');
  };
  const isNoOption = (option: string) => {
    const normalized = normalizeOption(option);
    return normalized.includes('нет') || normalized.includes('no');
  };

  const getColorForOption = (option: string, index: number) => {
    if (questionType === 'yes_no') {
      if (isYesOption(option)) return YES_COLOR;
      if (isNoOption(option)) return NO_COLOR;
    }
    return defaultColors[index % defaultColors.length];
  };
  
  // Для вопросов "Да/Нет" сортируем ответы так, чтобы "Да" был зеленым, а "Нет" красным
  const getSortedStats = () => {
    if (questionType === 'yes_no') {
      const sortedEntries = Object.entries(stats).sort((a, b) => {
        const [optionA] = a;
        const [optionB] = b;
        
        // "Да" всегда первый (зеленый), "Нет" всегда второй (красный)
        if (optionA.toLowerCase().includes('да') || optionA.toLowerCase().includes('yes')) return -1;
        if (optionB.toLowerCase().includes('да') || optionB.toLowerCase().includes('yes')) return 1;
        if (optionA.toLowerCase().includes('нет') || optionA.toLowerCase().includes('no')) return 1;
        if (optionB.toLowerCase().includes('нет') || optionB.toLowerCase().includes('no')) return -1;
        
        return 0;
      });
      
      return Object.fromEntries(sortedEntries);
    }
    
    return stats;
  };
  
  const sortedStats = getSortedStats();
  
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {/* Круговая диаграмма */}
      <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          {(() => {
            let currentAngle = 0;
            const entries = Object.entries(sortedStats);
            
            // Если только один ответ, делаем полный круг
            if (entries.length === 1) {
              const [singleOption] = entries[0];
              return (
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill={getColorForOption(singleOption, 0)}
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
                  fill={getColorForOption(option, index)}
                />
              );
            });
          })()}
        </svg>
      </div>
      
      {/* Легенда */}
      <div style={{ flex: 1 }}>
        {Object.entries(sortedStats).map(([option, count], index) => {
          const percentage = Math.round((count / totalCount) * 100);
          const color = getColorForOption(option, index);
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
                backgroundColor: color,
                flexShrink: 0
              }} />
              <span style={{ fontSize: '12px', color: 'var(--tg-text-color)' }}>
                {option} ({count} | {percentage}%)
              </span>
            </div>
          );
        })}
        <div style={{ 
          fontSize: '10px', 
          color: 'var(--tg-hint-color)', 
          marginTop: '8px' 
        }}>
          {t('surveyAnalytics.totalAnswers')}: {totalCount}
        </div>
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
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((option) => {
        const count = stats[option] || 0;
        // Не показываем варианты с 0 ответов
        if (count === 0) return null;
        
        const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return (
          <div key={option} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: '160px', // Фиксированная ширина
              fontSize: '11px', 
              color: 'var(--tg-text-color)',
              textAlign: 'left',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '1.2'
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
                backgroundColor: 'var(--tg-button-color)',
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
                backgroundColor: 'var(--tg-button-color)',
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
  const { t } = useTranslation();
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
    const displayName = username ? `@${username}` : t('surveyAnalytics.respondent');
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
          {t('surveyAnalytics.showAll')} ({totalCount})
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
  const { t } = useTranslation();
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
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85vh',
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--tg-section-separator-color)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.35)'
        }}
        onClick={(e) => e.stopPropagation()}
    >
      {/* Заголовок с крестиком - всегда видимый */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexShrink: 0
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: '600', 
          color: 'var(--tg-text-color)',
          flex: 1
        }}>
          Все ответы
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'var(--tg-button-color)',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '6px',
            fontWeight: 'bold',
            minWidth: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
      
      {/* Контент с прокруткой */}
      <div 
        style={{
            backgroundColor: 'var(--tg-bg-color)',
          borderRadius: '12px',
            padding: '16px',
          flex: 1,
            overflowY: 'auto',
          color: 'var(--tg-text-color)',
          border: '1px solid var(--tg-section-separator-color)'
        }}
      >
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
            
            // Форматируем yes/no для отображения
            if (displayValue === 'yes') {
                displayValue = t('surveyAnalytics.answers.yes');
            } else if (displayValue === 'no') {
                displayValue = t('surveyAnalytics.answers.no');
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
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ 
                  lineHeight: '1.4',
                  wordBreak: 'break-word'
                }}>
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
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <a
                      href={answer.user.username ? `https://t.me/${answer.user.username}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        fontSize: '11px', 
                        color: 'var(--tg-button-color)',
                        textDecoration: 'none',
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
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SurveyAnalyticsPage() {
  const { t } = useTranslation();
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [share, setShare] = useState<SurveyShareResponse | null>(null);
  const [stats, setStats] = useState<{ total_responses: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
  const [deletedQuestions, setDeletedQuestions] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, { scaleMin?: string; scaleMax?: string }>>({});
  const [settingsValidationErrors, setSettingsValidationErrors] = useState<Record<string, string>>({});
  const [aiAnalyticsStatus, setAiAnalyticsStatus] = useState<'not_found' | 'exists' | 'generating' | 'loading'>('loading');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [imageLoading, setImageLoading] = useState<{ [questionId: string]: boolean }>({});
  const [uploadingImages, setUploadingImages] = useState<{ [questionId: string]: boolean }>({});
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const totalResponses = stats?.total_responses ?? 0;
  const surveyHasResponses = totalResponses > 0;

  const InlineAddQuestionIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
    <Plus
      size={size}
      color="#007AFF"
      strokeWidth={2.5}
      style={{ marginLeft: 4, verticalAlign: 'middle' }}
    />
  );

  useStableBackButton({ targetRoute: '/' });

  // Функции для экспорта CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    // Создаем заголовки
    const headers = Object.keys(data[0]);
    
    // Создаем CSV контент
    const csvContent = [
      headers.join(';'),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Экранируем значения, содержащие точку с запятой или кавычки
          if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(';')
      )
    ].join('\n');
    
    // Используем стандартный метод скачивания для всех устройств
    const BOM = '\uFEFF'; // Byte Order Mark для UTF-8
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAllAnswers = () => {
    if (!responsesPage || !questions) return;
    
    const csvData: any[] = [];
    
    questions.forEach((question) => {
      const questionAnswers = responsesPage.flatMap((response: any) => {
        const answers = response.answers || [];
        return answers
          .filter((a: any) => a.question_id === question.id)
          .map((a: any) => ({
            question_text: question.text,
            question_type: question.type,
            answer_value: a.value === 'yes' ? t('surveyAnalytics.answers.yes') : a.value === 'no' ? t('surveyAnalytics.answers.no') : a.value,
            respondent: response.user?.username ? `@${response.user.username}` : t('surveyAnalytics.respondentNumber', { number: responsesPage.indexOf(response) + 1 })
          }));
      });
      
      csvData.push(...questionAnswers);
    });
    
    exportToCSV(csvData, `survey_${surveyId}_all_answers.csv`);
  };

  const exportQuestionAnswers = () => {
    if (!responsesPage || !questions || !selectedQuestionId) return;
    
    const selectedQuestion = questions.find(q => q.id === selectedQuestionId);
    if (!selectedQuestion) return;
    
    const questionAnswers = responsesPage.flatMap((response: any) => {
      const answers = response.answers || [];
      return answers
        .filter((a: any) => a.question_id === selectedQuestionId)
        .map((a: any) => ({
          question_text: selectedQuestion.text,
          question_type: selectedQuestion.type,
          answer_value: a.value === 'yes' ? 'Да' : a.value === 'no' ? 'Нет' : a.value,
          respondent: response.user?.username ? `@${response.user.username}` : `Респондент ${responsesPage.indexOf(response) + 1}`
        }));
    });
    
    exportToCSV(questionAnswers, `survey_${surveyId}_question_${selectedQuestionId}.csv`);
  };

  const exportUserAnswers = () => {
    if (!responsesPage || !questions || !selectedUserId) return;
    
    const userIndex = parseInt(selectedUserId.split('_')[1]);
    const userResponse = responsesPage[userIndex];
    if (!userResponse) return;
    
    const userAnswers = questions.map((question) => {
      const answer = userResponse.answers?.find((a: any) => a.question_id === question.id);
      return {
        question_text: question.text,
        question_type: question.type,
        answer_value: answer?.value === 'yes' ? t('surveyAnalytics.answers.yes') : answer?.value === 'no' ? t('surveyAnalytics.answers.no') : (answer?.value || ''),
        respondent: userResponse.user?.username ? `@${userResponse.user.username}` : t('surveyAnalytics.respondentNumber', { number: userIndex + 1 })
      };
    });
    
    exportToCSV(userAnswers, `survey_${surveyId}_user_${userIndex + 1}.csv`);
  };

  // Проверяем статус ИИ аналитики
  const checkAiAnalyticsStatus = async () => {
    if (!surveyId) return;
    
    try {
      const response = await aiAnalytics.getAnalyticsStatus(surveyId);
      if (response.data.status === 'completed') {
        setAiAnalyticsStatus('exists');
      } else if (response.data.status === 'generating' || response.data.status === 'in_progress') {
        setAiAnalyticsStatus('generating');
      } else {
        setAiAnalyticsStatus('not_found');
      }
    } catch (error) {
      console.error('Ошибка проверки статуса ИИ аналитики:', error);
      setAiAnalyticsStatus('not_found');
    }
  };

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
        
        // Проверяем статус ИИ аналитики
        await checkAiAnalyticsStatus();
        
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(t('surveyAnalytics.alerts.loadError'));
        setLoading(false);
      }
    };
    load();
  }, [surveyId, t]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (activeTab !== 'questions' || !surveyId) return;
      try {
        const list = await questionApi.getSurveyQuestions(surveyId);
        
        // Функция для конвертации ссылки Яндекс Диска в прокси-URL на бэкенде
        const convertYandexDiskUrl = (url: string): string => {
          // Проверяем, является ли это ссылкой Яндекс Диска
          if (!url || (!url.includes('yadi.sk') && !url.includes('disk.yandex.ru') && !url.includes('downloader.disk.yandex.ru'))) {
            return url; // Если это не ссылка Яндекс Диска, возвращаем как есть
          }
          
          // Если это ссылка на наш прокси-эндпоинт, возвращаем как есть
          if (url.includes('/api/uploads/yandex-disk-proxy')) {
            return url;
          }
          
          // Используем прокси-эндпоинт на бэкенде для всех ссылок Яндекс Диска
          let apiBaseUrl = (window as any).__API_BASE_URL__ || window.location.origin;
          
          // Убираем /api из конца apiBaseUrl если он есть, чтобы избежать двойного /api/api/
          if (apiBaseUrl.endsWith('/api')) {
            apiBaseUrl = apiBaseUrl.slice(0, -4);
          }
          
          const proxyUrl = `${apiBaseUrl}/api/uploads/yandex-disk-proxy?url=${encodeURIComponent(url)}`;
          return proxyUrl;
        };
        
        const mapped = list.map((q: any) => {
          // Парсим validation для получения conditionalLogic
          let validation = q.validation;
          if (typeof validation === 'string') {
            try {
              validation = JSON.parse(validation);
            } catch (e) {
              // Не критично, продолжаем
            }
          }
          
          // Конвертируем URL изображения если он есть (используем прокси)
          let imageUrl = q.imageUrl || q.image_url;
          if (imageUrl) {
            imageUrl = convertYandexDiskUrl(imageUrl);
          }
          
          return {
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
            image_url: imageUrl,
            image_name: q.imageName || q.image_name,
            conditionalLogic: validation?.conditionalLogic
          };
        });
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
        
        // Функция для конвертации ссылки Яндекс Диска в прокси-URL на бэкенде
        const convertYandexDiskUrl = (url: string): string => {
          if (!url || (!url.includes('yadi.sk') && !url.includes('disk.yandex.ru') && !url.includes('downloader.disk.yandex.ru'))) {
            return url;
          }
          
          if (url.includes('/api/uploads/yandex-disk-proxy')) {
            return url;
          }
          
          let apiBaseUrl = (window as any).__API_BASE_URL__ || window.location.origin;
          
          if (apiBaseUrl.endsWith('/api')) {
            apiBaseUrl = apiBaseUrl.slice(0, -4);
          }
          
          const proxyUrl = `${apiBaseUrl}/api/uploads/yandex-disk-proxy?url=${encodeURIComponent(url)}`;
          return proxyUrl;
        };
        
        // Загружаем вопросы и ответы параллельно для аналитики
        const [questionsList, responses] = await Promise.all([
          questionApi.getSurveyQuestions(surveyId),
          surveyApi.getSurveyResponses(surveyId, 100, 0)
        ]);
        
        // Преобразуем вопросы в нужный формат
        const mappedQuestions = questionsList.map((q: any) => {
          // Парсим validation для получения conditionalLogic
          let validation = q.validation;
          if (typeof validation === 'string') {
            try {
              validation = JSON.parse(validation);
            } catch (e) {
              // Не критично, продолжаем
            }
          }
          
          // Конвертируем URL изображения если он есть (используем прокси)
          let imageUrl = q.imageUrl || q.image_url;
          if (imageUrl) {
            imageUrl = convertYandexDiskUrl(imageUrl);
          }
          
          return {
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
            image_url: imageUrl,
            image_name: q.imageName || q.image_name,
            conditionalLogic: validation?.conditionalLogic
          };
        });
        
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
      const confirmed = window.confirm(t('surveyAnalytics.status.completeConfirm'));
      if (!confirmed) return;
    }
    
    if (newStatus === 'draft') {
      const confirmed = window.confirm(t('surveyAnalytics.status.draftConfirm'));
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
      alert(e?.response?.data?.detail || t('surveyAnalytics.alerts.statusChangeError'));
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
      alert(t('surveyAnalytics.alerts.settingsUpdated'));
    } catch (e) {
      console.error(e);
      alert(t('surveyAnalytics.alerts.settingsSaveError'));
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
    if (!surveyId || savingQuestions) return;
    
    setSavingQuestions(true);
    try {
      // Удаляем удаленные вопросы (только те, которые существуют в БД, т.е. не имеют temp_ ID)
      for (const questionId of deletedQuestions) {
        // Пропускаем временные ID, т.к. они не существуют в БД
        if (!questionId.startsWith('temp_')) {
          try {
            await questionApi.deleteQuestion(questionId);
          } catch (e: any) {
            // Если вопрос уже удален или не найден, просто логируем и продолжаем
            console.warn(`Не удалось удалить вопрос ${questionId}:`, e);
          }
        }
      }
      
      // Создаем маппинг временных ID на реальные UUID
      const questionIdMap: Record<string, string> = {};
      
      // Сначала создаем маппинг для всех существующих вопросов
      for (const q of editedQuestions) {
        if (!q.id.startsWith('temp_')) {
          questionIdMap[q.id] = q.id;
        }
      }
      
      // Пересчитываем order_index для всех вопросов последовательно (1, 2, 3...)
      const questionsWithCorrectOrder = editedQuestions.map((q, index) => ({
        ...q,
        order_index: index + 1
      }));
      
      // Разделяем вопросы на новые (temp_) и существующие
      const newQuestions: Array<{ data: any; tempId: string }> = [];
      const existingQuestions: any[] = [];
      
      for (const q of questionsWithCorrectOrder) {
        // Объединяем validation и conditionalLogic
        let validationWithConditional: any = {};
        if (q.conditionalLogic) {
          validationWithConditional.conditionalLogic = { ...q.conditionalLogic };
          
          // Обновляем dependsOn на реальный UUID если он есть в маппинге
          if (validationWithConditional.conditionalLogic.dependsOn && questionIdMap[validationWithConditional.conditionalLogic.dependsOn]) {
            validationWithConditional.conditionalLogic.dependsOn = questionIdMap[validationWithConditional.conditionalLogic.dependsOn];
          }
        }
        
        const questionData = {
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
            validation: Object.keys(validationWithConditional).length > 0 ? validationWithConditional : undefined
        };
        
        if (q.id.startsWith('temp_')) {
          newQuestions.push({
            data: {
              ...questionData,
              survey_id: surveyId
            },
            tempId: q.id
          });
        } else {
          existingQuestions.push({
            id: q.id,
            ...questionData
          });
        }
      }
      
      // Сначала создаем новые вопросы последовательно с временными индексами
      // (используем очень большие индексы, чтобы избежать конфликтов)
      // Важно: создаем их последовательно, чтобы обновлять маппинг temp_ ID -> реальный ID
      let tempIndexOffset = 10000; // Начинаем с большого числа для временных индексов
      for (const { data, tempId } of newQuestions) {
        // Обновляем dependsOn в validation, если он ссылается на temp_ ID
        if (data.validation?.conditionalLogic?.dependsOn && questionIdMap[data.validation.conditionalLogic.dependsOn]) {
          data.validation.conditionalLogic.dependsOn = questionIdMap[data.validation.conditionalLogic.dependsOn];
        }
        
        // Сохраняем правильный индекс для последующего bulk update
        const correctOrderIndex = data.order_index;
        
        // Создаем вопрос с временным индексом (бэкенд не будет пересчитывать, т.к. индекс указан явно)
        const createdQuestion = await questionApi.createQuestion({
          ...data,
          order_index: tempIndexOffset
        });
        questionIdMap[tempId] = createdQuestion.id;
        tempIndexOffset++;
        
        // Добавляем созданный вопрос в список для bulk update с правильным индексом
        existingQuestions.push({
          id: createdQuestion.id,
          type: data.type,
          text: data.text,
          description: data.description,
          is_required: data.is_required,
          order_index: correctOrderIndex, // Правильный индекс будет установлен при bulk update
          options: data.options,
          has_other_option: data.has_other_option,
          scale_min: data.scale_min,
          scale_max: data.scale_max,
          scale_min_label: data.scale_min_label,
          scale_max_label: data.scale_max_label,
          validation: data.validation
        });
      }
      
      // Обновляем dependsOn в существующих вопросах перед bulk update
      for (const existingQ of existingQuestions) {
        if (existingQ.validation?.conditionalLogic?.dependsOn && questionIdMap[existingQ.validation.conditionalLogic.dependsOn]) {
          existingQ.validation.conditionalLogic.dependsOn = questionIdMap[existingQ.validation.conditionalLogic.dependsOn];
        }
      }
      
      // Обновляем ВСЕ вопросы (включая только что созданные) одним bulk запросом (атомарно)
      // Это гарантирует, что все индексы будут установлены правильно без конфликтов
      if (existingQuestions.length > 0) {
        await questionApi.bulkUpdateQuestions(surveyId, existingQuestions);
      }
      
      // Второй проход: загружаем изображения в Яндекс Диск и обновляем вопросы
      for (const q of questionsWithCorrectOrder) {
        const realQuestionId = q.id.startsWith('temp_') ? questionIdMap[q.id] : q.id;
        
        // Если у вопроса есть временное изображение, загружаем его в Яндекс Диск
        if (q.tempImagePath && realQuestionId) {
          try {
            const uploadResult = await uploadApi.uploadToYandexDisk(q.tempImagePath, realQuestionId);
            
            // Обновляем вопрос с публичной ссылкой из Яндекс Диска
            await questionApi.updateQuestion(realQuestionId, {
              image_url: uploadResult.url,
              image_name: uploadResult.filename
            });
          } catch (e) {
            console.error(`Ошибка загрузки изображения для вопроса ${q.id}:`, e);
            // Продолжаем сохранение даже если изображение не загрузилось
          }
        } else if (q.image_url && realQuestionId && !q.tempImagePath) {
          // Если изображение уже есть (не временное), просто обновляем вопрос
          await questionApi.updateQuestion(realQuestionId, {
            image_url: q.image_url,
            image_name: q.image_name
          });
        }
      }
      
      // Третий проход: обновляем все вопросы с условной логикой, у которых dependsOn указывал на временный ID
      // и теперь нужно обновить на реальный UUID
      for (const q of questionsWithCorrectOrder) {
        if (q.conditionalLogic?.dependsOn) {
          const originalDependsOn = q.conditionalLogic.dependsOn;
          const realDependsOn = questionIdMap[originalDependsOn];
          
          // Если dependsOn был временным ID и теперь имеет реальный UUID, обновляем
          if (originalDependsOn.startsWith('temp_') && realDependsOn && realDependsOn !== originalDependsOn) {
            const updatedConditionalLogic = {
              ...q.conditionalLogic,
              dependsOn: realDependsOn
            };
            
            const questionIdToUpdate = q.id.startsWith('temp_') ? questionIdMap[q.id] : q.id;
            
            await questionApi.updateQuestion(questionIdToUpdate, {
              validation: {
                conditionalLogic: updatedConditionalLogic
              }
            });
          }
        }
      }
      
      const list = await questionApi.getSurveyQuestions(surveyId);
      
      // Функция для конвертации ссылки Яндекс Диска в прокси-URL на бэкенде
      const convertYandexDiskUrl = (url: string): string => {
        if (!url || (!url.includes('yadi.sk') && !url.includes('disk.yandex.ru') && !url.includes('downloader.disk.yandex.ru'))) {
          return url;
        }
        
        if (url.includes('/api/uploads/yandex-disk-proxy')) {
          return url;
        }
        
        let apiBaseUrl = (window as any).__API_BASE_URL__ || window.location.origin;
        
        if (apiBaseUrl.endsWith('/api')) {
          apiBaseUrl = apiBaseUrl.slice(0, -4);
        }
        
        const proxyUrl = `${apiBaseUrl}/api/uploads/yandex-disk-proxy?url=${encodeURIComponent(url)}`;
        return proxyUrl;
      };
      
      const mapped = list.map((q: any) => {
        // Парсим validation для получения conditionalLogic
        let validation = q.validation;
        if (typeof validation === 'string') {
          try {
            validation = JSON.parse(validation);
          } catch (e) {
            // Не критично, продолжаем
          }
        }
        
        // Конвертируем URL изображения если он есть (используем прокси)
        let imageUrl = q.imageUrl || q.image_url;
        if (imageUrl) {
          imageUrl = convertYandexDiskUrl(imageUrl);
        }
        
        return {
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
          image_url: imageUrl,
          image_name: q.imageName || q.image_name,
          conditionalLogic: validation?.conditionalLogic
        };
      });
      setQuestions(mapped);
      setEditedQuestions(JSON.parse(JSON.stringify(mapped)));
      setDeletedQuestions([]);
      setEditingQuestions(false);
      hapticFeedback?.success();
      alert(t('surveyAnalytics.alerts.questionsUpdated'));
    } catch (e) {
      console.error(e);
      alert(t('surveyAnalytics.alerts.questionsSaveError'));
    } finally {
      setSavingQuestions(false);
    }
  };

  const createNewQuestion = (orderIndex: number): EditableQuestion => ({
    id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'text',
    text: '',
    description: undefined,
    is_required: true,
    order_index: orderIndex,
    options: [],
    has_other_option: false,
    scale_min: undefined,
    scale_max: undefined,
    scale_min_label: undefined,
    scale_max_label: undefined
  });

  const updateEditedQuestion = (index: number, updates: Partial<EditableQuestion>) => {
    setEditedQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const moveQuestionUp = (questionId: string) => {
    const index = editedQuestions.findIndex(q => q.id === questionId);
    if (index > 0) {
      const newQuestions = [...editedQuestions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      
      // Обновляем order_index для всех вопросов
      let updatedQuestions = newQuestions.map((q, i) => ({ ...q, order_index: i + 1 }));
      
      // Если вопрос перемещен на первую позицию, убираем условную логику
      if (index === 1 && updatedQuestions[0].conditionalLogic) {
        updatedQuestions[0] = { ...updatedQuestions[0], conditionalLogic: undefined };
      }
      
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

  const deleteQuestion = (questionId: string) => {
    if (window.confirm(t('surveyAnalytics.questions.deleteConfirm'))) {
      // Если вопрос новый (с временным ID), просто удаляем его из списка,
      // не добавляя в deletedQuestions, т.к. он еще не существует в БД
      if (questionId.startsWith('temp_')) {
        setEditedQuestions(prev => prev.filter(q => q.id !== questionId));
      } else {
        // Если вопрос существующий, добавляем его в список для удаления из БД
        setDeletedQuestions(prev => [...prev, questionId]);
        setEditedQuestions(prev => prev.filter(q => q.id !== questionId));
      }
      hapticFeedback?.light();
    }
  };

  const addQuestionAfter = (questionIndex: number) => {
    const newQuestion = createNewQuestion(questionIndex + 2);
    const updatedList = [...editedQuestions];
    updatedList.splice(questionIndex + 1, 0, newQuestion);
    const reindexed = updatedList.map((q, idx) => ({ ...q, order_index: idx + 1 }));
    setEditedQuestions(reindexed);
    hapticFeedback?.light();
    setTimeout(() => {
      const element = document.getElementById(`question-${newQuestion.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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

  const handleDownloadQR = async () => {
    if (!share?.qr_code || !survey) return;
    
    setDownloading(true);
    hapticFeedback?.light();
    
    try {
      // Используем стандартный метод скачивания для всех устройств
      const link = document.createElement('a');
      link.href = share.qr_code;
      link.download = `qr-code-survey-${survey.id}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Ошибка скачивания QR-кода:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareTelegram = () => {
    if (!surveyId) return;
    
    hapticFeedback?.light();
    
    // Открываем бота с deep link для получения сообщения с кнопкой
    const botUrl = `https://t.me/insighto_bot?start=share_${surveyId}`;
    window.open(botUrl, '_blank');
  };

  const getStatusBadge = () => {
    if (!survey) return null;
    switch (survey.status) {
      case 'active':
        return { text: t('surveyAnalytics.status.active'), color: '#34C759' };
      case 'draft':
        return { text: t('surveyAnalytics.status.draft'), color: '#8E8E93' };
      case 'completed':
        return { text: t('surveyAnalytics.status.completed'), color: '#FF6B6B' };
      case 'archived':
        return { text: t('surveyAnalytics.status.archived'), color: '#FF9500' };
      default:
        return { text: survey.status, color: '#8E8E93' };
    }
  };

  const questionTypes = [
    { value: 'text', label: t('surveyAnalytics.questions.questionTypes.text'), icon: '📝' },
    { value: 'textarea', label: t('surveyAnalytics.questions.questionTypes.textarea'), icon: '📄' },
    { value: 'single_choice', label: t('surveyAnalytics.questions.questionTypes.single_choice'), icon: '🔘' },
    { value: 'multiple_choice', label: t('surveyAnalytics.questions.questionTypes.multiple_choice'), icon: '☑️' },
    { value: 'scale', label: t('surveyAnalytics.questions.questionTypes.scale'), icon: '📊' },
    { value: 'rating', label: t('surveyAnalytics.questions.questionTypes.rating'), icon: '⭐' },
    { value: 'yes_no', label: t('surveyAnalytics.questions.questionTypes.yes_no'), icon: '✅' },
    { value: 'date', label: t('surveyAnalytics.questions.questionTypes.date'), icon: '📅' },
    { value: 'number', label: t('surveyAnalytics.questions.questionTypes.number'), icon: '🔢' }
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
  const canEditQuestions = true; // Всегда разрешаем редактирование вопросов
  const settings = survey.settings || {};

  // Компонент для редактирования условной логики
  const ConditionalLogicEditor: React.FC<{
    question: EditableQuestion;
    allQuestions: EditableQuestion[];
    currentIndex: number;
    onConditionChange: (conditionalLogic: ConditionalLogic | undefined) => void;
    disabled?: boolean;
  }> = ({ question, allQuestions, currentIndex, onConditionChange, disabled = false }) => {
    // Получаем доступные вопросы для зависимости (только предыдущие)
    const availableQuestions = allQuestions.slice(0, currentIndex);
    
    // Получаем доступные операторы для выбранного типа вопроса
    const getAvailableOperators = (dependsOnType: string): Array<{ value: ConditionalOperator; label: string }> => {
      switch (dependsOnType) {
        case 'single_choice':
        case 'yes_no':
          return [
            { value: 'equals', label: 'равно' },
            { value: 'not_equals', label: 'не равно' }
          ];
        case 'multiple_choice':
          return [
            { value: 'contains', label: 'содержит' },
            { value: 'not_contains', label: 'не содержит' }
          ];
        case 'scale':
        case 'number':
          return [
            { value: 'equals', label: 'равно' },
            { value: 'greater_than', label: 'больше' },
            { value: 'less_than', label: 'меньше' },
            { value: 'greater_or_equal', label: 'больше или равно' },
            { value: 'less_or_equal', label: 'меньше или равно' }
          ];
        case 'rating':
          return [
            { value: 'equals', label: 'равно' },
            { value: 'greater_than', label: 'больше' },
            { value: 'less_than', label: 'меньше' },
            { value: 'greater_or_equal', label: 'больше или равно' },
            { value: 'less_or_equal', label: 'меньше или равно' }
          ];
        case 'date':
          return [
            { value: 'date_on', label: 'равно дате' },
            { value: 'date_after', label: 'после даты' },
            { value: 'date_before', label: 'до даты' }
          ];
        default:
          return [];
      }
    };

    const dependsOnQuestion = availableQuestions.find(q => q.id === question.conditionalLogic?.dependsOn);
    const availableOperators = dependsOnQuestion ? getAvailableOperators(dependsOnQuestion.type) : [];
    
    // Получаем значения для выбора в зависимости от типа вопроса
    const getConditionValueOptions = (dependsOnQuestion: EditableQuestion): Array<{ value: string | number; label: string }> => {
      if (!dependsOnQuestion) return [];
      
      switch (dependsOnQuestion.type) {
        case 'single_choice':
          return (dependsOnQuestion.options || []).filter(opt => opt.trim()).map(opt => ({ value: opt, label: opt }));
        case 'multiple_choice':
          return (dependsOnQuestion.options || []).filter(opt => opt.trim()).map(opt => ({ value: opt, label: opt }));
        case 'yes_no':
          return [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ];
        case 'scale':
          const min = dependsOnQuestion.scale_min || 1;
          const max = dependsOnQuestion.scale_max || 10;
          return Array.from({ length: max - min + 1 }, (_, i) => {
            const val = min + i;
            return { value: val, label: val.toString() };
          });
        case 'rating':
          return [1, 2, 3, 4, 5].map(val => ({ value: val, label: val.toString() }));
        default:
          return [];
      }
    };

    const handleToggleCondition = () => {
      if (question.conditionalLogic?.enabled) {
        onConditionChange(undefined);
      } else {
        const firstQuestion = availableQuestions[0];
        if (!firstQuestion) return;
        
        const operators = getAvailableOperators(firstQuestion.type);
        const defaultValue = firstQuestion.type === 'scale' || firstQuestion.type === 'rating' || firstQuestion.type === 'number'
          ? (firstQuestion.scale_min || 1)
          : firstQuestion.type === 'yes_no'
          ? 'yes'
          : (firstQuestion.options?.[0] || '');
        
        onConditionChange({
          enabled: true,
          dependsOn: firstQuestion.id,
          conditions: [{
            operator: operators[0]?.value || 'equals',
            value: defaultValue
          }],
          logicOperator: firstQuestion.type === 'multiple_choice' ? 'OR' : 'AND'
        });
      }
    };

    const handleDependsOnChange = (questionId: string) => {
      const selectedQuestion = availableQuestions.find(q => q.id === questionId);
      if (!selectedQuestion) return;
      
      const operators = getAvailableOperators(selectedQuestion.type);
      const firstCondition: Condition = {
        operator: operators[0]?.value || 'equals',
        value: selectedQuestion.type === 'scale' || selectedQuestion.type === 'rating' || selectedQuestion.type === 'number'
          ? (selectedQuestion.scale_min || 1)
          : (selectedQuestion.options?.[0] || 'yes')
      };
      
      onConditionChange({
        enabled: true,
        dependsOn: questionId,
        conditions: [firstCondition],
        logicOperator: selectedQuestion.type === 'multiple_choice' ? 'OR' : 'AND'
      });
    };

    const handleOperatorChange = (conditionIndex: number, operator: ConditionalOperator) => {
      if (!question.conditionalLogic) return;
      const newConditions = [...question.conditionalLogic.conditions];
      newConditions[conditionIndex] = { ...newConditions[conditionIndex], operator };
      onConditionChange({
        ...question.conditionalLogic,
        conditions: newConditions
      });
    };

    const handleValueChange = (conditionIndex: number, value: string | number | string[]) => {
      if (!question.conditionalLogic) return;
      const newConditions = [...question.conditionalLogic.conditions];
      const finalValue = (value === '' && dependsOnQuestion?.type === 'number') ? 0 : value;
      newConditions[conditionIndex] = { ...newConditions[conditionIndex], value: finalValue };
      onConditionChange({
        ...question.conditionalLogic,
        conditions: newConditions
      });
    };

    const handleAddCondition = () => {
      if (!question.conditionalLogic || !dependsOnQuestion) return;
      const operators = getAvailableOperators(dependsOnQuestion.type);
      const newCondition: Condition = {
        operator: operators[0]?.value || 'equals',
        value: dependsOnQuestion.type === 'scale' || dependsOnQuestion.type === 'rating' || dependsOnQuestion.type === 'number'
          ? (dependsOnQuestion.scale_min || 1)
          : (dependsOnQuestion.options?.[0] || 'yes')
      };
      onConditionChange({
        ...question.conditionalLogic,
        conditions: [...question.conditionalLogic.conditions, newCondition]
      });
    };

    const handleRemoveCondition = (conditionIndex: number) => {
      if (!question.conditionalLogic) return;
      const newConditions = question.conditionalLogic.conditions.filter((_, i) => i !== conditionIndex);
      if (newConditions.length === 0) {
        onConditionChange(undefined);
      } else {
        onConditionChange({
          ...question.conditionalLogic,
          conditions: newConditions
        });
      }
    };

    if (availableQuestions.length === 0) {
      return null;
    }

    return (
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: 'var(--tg-bg-color)',
        borderRadius: '8px',
        border: '1px solid var(--tg-section-separator-color)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: question.conditionalLogic?.enabled ? '12px' : '0'
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--tg-text-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            flex: 1,
            minWidth: 0
          }} onClick={disabled ? undefined : handleToggleCondition}>
            <span>🔀</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('surveyAnalytics.questions.conditionalQuestion')}
            </span>
          </label>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '40px',
            height: '20px',
            flexShrink: 0,
            opacity: disabled ? 0.5 : 1
          }}>
            <input
              type="checkbox"
              checked={question.conditionalLogic?.enabled || false}
              onChange={disabled ? undefined : handleToggleCondition}
              disabled={disabled}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: disabled ? 'not-allowed' : 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: question.conditionalLogic?.enabled ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
              borderRadius: '20px',
              transition: '0.3s'
            }}>
              <span style={{
                position: 'absolute',
                height: '16px',
                width: '16px',
                left: question.conditionalLogic?.enabled ? '21px' : '2px',
                bottom: '2px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s'
              }} />
            </span>
          </label>
        </div>

        {question.conditionalLogic?.enabled && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--tg-link-color)',
                marginBottom: '6px'
              }}>
                Зависит от вопроса:
              </label>
              <select
                value={question.conditionalLogic.dependsOn}
                onChange={(e) => handleDependsOnChange(e.target.value)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '14px',
                  outline: 'none',
                  opacity: disabled ? 0.6 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              >
                {availableQuestions.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.text || t('surveyAnalytics.questions.question', { number: allQuestions.findIndex(qq => qq.id === q.id) + 1 })}
                  </option>
                ))}
              </select>
            </div>

            {dependsOnQuestion && (
              <>
                {/* Проверяем, является ли родительский вопрос текстовым типом */}
                {dependsOnQuestion.type === 'text' || dependsOnQuestion.type === 'textarea' ? (
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--tg-section-bg-color)',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--tg-hint-color)',
                      lineHeight: '1.4'
                    }}>
                      {t('surveyAnalytics.questions.conditionalLogicUnavailable')}
                    </div>
                  </div>
                ) : (
                  <>
                    {question.conditionalLogic.conditions.map((condition, conditionIndex) => (
                  <div key={conditionIndex} style={{
                    marginBottom: '12px',
                    padding: '10px',
                    backgroundColor: 'var(--tg-section-bg-color)',
                    borderRadius: '6px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    minWidth: 0
                  }}>
                    {conditionIndex > 0 && (
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--tg-hint-color)',
                        fontWeight: '500',
                        minWidth: '30px'
                      }}>
                        {question.conditionalLogic?.logicOperator || 'AND'}
                      </span>
                    )}
                    
                    <select
                      value={condition.operator}
                      onChange={(e) => handleOperatorChange(conditionIndex, e.target.value as ConditionalOperator)}
                      disabled={disabled}
                      style={{
                        flex: '1 1 140px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '13px',
                        outline: 'none',
                        opacity: disabled ? 0.6 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        minWidth: 0
                      }}
                    >
                      {availableOperators.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    {dependsOnQuestion.type === 'date' ? (
                      <input
                        type="date"
                        value={typeof condition.value === 'string' ? condition.value : ''}
                        onChange={(e) => handleValueChange(conditionIndex, e.target.value)}
                        disabled={disabled}
                        style={{
                          flex: '2 1 200px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'var(--tg-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '13px',
                          outline: 'none',
                          opacity: disabled ? 0.6 : 1,
                          minWidth: 0
                        }}
                      />
                    ) : dependsOnQuestion.type === 'number' ? (
                      <input
                        type="number"
                        value={condition.value === 0 ? '' : condition.value}
                        onChange={(e) => {
                          if (disabled) return;
                          const value = e.target.value;
                          if (value === '' || value === '-') {
                            const newConditions = [...(question.conditionalLogic?.conditions || [])];
                            newConditions[conditionIndex] = { ...newConditions[conditionIndex], value: value as any };
                            onConditionChange({
                              ...question.conditionalLogic!,
                              conditions: newConditions
                            });
                          } else {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              handleValueChange(conditionIndex, numValue);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          if (disabled) return;
                          if (e.target.value === '' || e.target.value === '-') {
                            handleValueChange(conditionIndex, 0);
                          }
                        }}
                        disabled={disabled}
                        style={{
                          flex: '2 1 140px',
                          minWidth: 0,
                          maxWidth: '120px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'var(--tg-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '13px',
                          outline: 'none',
                          opacity: disabled ? 0.6 : 1
                        }}
                      />
                    ) : (
                      <select
                        value={typeof condition.value === 'string' || typeof condition.value === 'number' ? condition.value.toString() : ''}
                        onChange={(e) => {
                          if (disabled) return;
                          const valueOptions = getConditionValueOptions(dependsOnQuestion);
                          const selected = valueOptions.find(opt => opt.value.toString() === e.target.value);
                          handleValueChange(conditionIndex, selected?.value || e.target.value);
                        }}
                        disabled={disabled}
                        style={{
                          flex: '2 1 200px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'var(--tg-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '13px',
                          outline: 'none',
                          opacity: disabled ? 0.6 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          minWidth: 0
                        }}
                      >
                        {getConditionValueOptions(dependsOnQuestion).map(opt => (
                          <option key={opt.value.toString()} value={opt.value.toString()}>{opt.label}</option>
                        ))}
                      </select>
                    )}

                    {question.conditionalLogic && question.conditionalLogic.conditions.length > 1 && !disabled && (
                      <button
                        onClick={() => handleRemoveCondition(conditionIndex)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#ff4444',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '16px',
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
                ))}

                    {dependsOnQuestion.type === 'multiple_choice' && question.conditionalLogic && question.conditionalLogic.conditions.length < 5 && !disabled && (
                      <button
                        onClick={handleAddCondition}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'transparent',
                          border: '1px dashed var(--tg-section-separator-color)',
                          borderRadius: '6px',
                          color: 'var(--tg-hint-color)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          marginBottom: '8px'
                        }}
                      >
                        + Добавить условие
                      </button>
                    )}

                    {/* Проверяем, полностью ли заполнены условия */}
                    {(() => {
                      const hasIncompleteConditions = question.conditionalLogic?.conditions.some(condition => {
                        if (condition.value === undefined || condition.value === null || condition.value === '') {
                          return true;
                        }
                        if (Array.isArray(condition.value) && condition.value.length === 0) {
                          return true;
                        }
                        return false;
                      });
                      
                      if (hasIncompleteConditions) {
                        return (
                          <div style={{
                            fontSize: '11px',
                            color: '#FF9500',
                            lineHeight: '1.4',
                            marginTop: '8px',
                            padding: '8px',
                            backgroundColor: 'rgba(255, 149, 0, 0.1)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 149, 0, 0.3)'
                          }}>
                            ⚠️ {t('surveyAnalytics.questions.incompleteCondition')}
                          </div>
                        );
                      }
                      
                      return (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--tg-hint-color)',
                          lineHeight: '1.4',
                          marginTop: '8px'
                        }}>
                          💡 Этот вопрос будет показан только если условия выполнены. Это поможет сократить время прохождения опроса.
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderQuestionEditor = (question: EditableQuestion, index: number) => {
    const isDeleted = deletedQuestions.includes(question.id);
    const hasResponses = surveyHasResponses;
    const isNewQuestion = question.id.startsWith('temp_');
    const disabled = !editingQuestions || (hasResponses && !isNewQuestion);

    return (
      <motion.div
        key={question.id}
        id={`question-${question.id}`}
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
            opacity: isDeleted ? 0.5 : 1,
            position: 'relative'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                {question.conditionalLogic?.enabled && (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--tg-button-color)',
                    backgroundColor: 'rgba(88, 101, 242, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}>
                    🔀 {t('surveyAnalytics.questions.conditional')}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={question.text}
                onChange={(e) => updateEditedQuestion(index, { text: e.target.value })}
                disabled={disabled}
                placeholder={question.text === '' ? t('surveyAnalytics.questions.enterQuestion') : undefined}
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
                  opacity: disabled ? 0.6 : 1,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
              />
              {question.conditionalLogic?.enabled && (() => {
                const parentQuestion = editedQuestions.find(q => q.id === question.conditionalLogic?.dependsOn);
                if (!parentQuestion) return null;
                
                const parentIndex = editedQuestions.findIndex(q => q.id === parentQuestion.id);
                return (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--tg-link-color)',
                    fontStyle: 'italic',
                    marginTop: '2px',
                    lineHeight: '1.3'
                  }}>
                    {t('surveyAnalytics.questions.dependsOnQuestion', { number: parentIndex + 1, text: parentQuestion.text || t('surveyAnalytics.questions.noTitle') })}
                  </div>
                );
              })()}
              
              <textarea
                value={question.description || ''}
                onChange={(e) => updateEditedQuestion(index, { description: e.target.value })}
                disabled={disabled}
                placeholder={t('surveyAnalytics.questions.descriptionPlaceholder')}
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
            
            {/* Кнопки удаления и добавления */}
            {editingQuestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => deleteQuestion(question.id)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#FF3B30',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => addQuestionAfter(index)}
                  disabled={savingQuestions}
                  title={t('surveyAnalytics.questions.addAfter')}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: savingQuestions ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                    color: '#007AFF',
                    opacity: savingQuestions ? 0.5 : 1
                }}
              >
                  <Plus size={16} strokeWidth={2.4} color="#007AFF" />
              </button>
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

          {/* Загрузка изображения к вопросу */}
          {!disabled && editingQuestions && (
            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px dashed var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--tg-hint-color)'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      setUploadingImages(prev => ({ ...prev, [question.id]: true }));
                      
                      // Проверяем размер файла (10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        setUploadingImages(prev => ({ ...prev, [question.id]: false }));
                        alert(t('surveyAnalytics.alerts.imageSizeError'));
                        hapticFeedback?.error();
                        e.target.value = '';
                        return;
                      }
                      
                      // Проверяем тип файла
                      if (!file.type || !file.type.startsWith('image/')) {
                        setUploadingImages(prev => ({ ...prev, [question.id]: false }));
                        alert(t('surveyAnalytics.alerts.imageTypeError'));
                        hapticFeedback?.error();
                        e.target.value = '';
                        return;
                      }
                      
                      const result = await uploadApi.uploadImage(file);
                      
                      if (!result || !result.url) {
                        throw new Error('Сервер не вернул URL изображения');
                      }
                      
                      // Получаем полный URL для отображения
                      let fullUrl = result.url;
                      
                      if (!fullUrl.startsWith('http')) {
                        const getApiBase = (window as any).__GET_API_BASE_URL__;
                        let apiBaseUrl = getApiBase ? getApiBase() : ((window as any).__API_BASE_URL__ || window.location.origin);
                        
                        if (apiBaseUrl.endsWith('/api')) {
                          apiBaseUrl = apiBaseUrl.slice(0, -4);
                        }
                        
                        if (fullUrl.startsWith('/api')) {
                          fullUrl = `${apiBaseUrl}${fullUrl}`;
                        } else {
                          fullUrl = `${apiBaseUrl}/api${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
                        }
                      }
                      
                      updateEditedQuestion(index, {
                        image_url: fullUrl,
                        image_name: result.filename,
                        tempImagePath: result.temp_path
                      });
                      
                      hapticFeedback?.success();
                      setUploadingImages(prev => ({ ...prev, [question.id]: false }));
                    } catch (error: any) {
                      console.error('Ошибка загрузки изображения:', error);
                      setUploadingImages(prev => ({ ...prev, [question.id]: false }));
                      
                      let errorMessage = t('surveyAnalytics.alerts.imageUploadError');
                      
                      if (error?.response?.data?.detail) {
                        errorMessage = error.response.data.detail;
                      } else if (error?.message) {
                        errorMessage = error.message;
                      } else if (error?.response?.status === 413) {
                        errorMessage = 'Файл слишком большой. Максимальный размер: 10MB';
                      } else if (error?.response?.status === 400) {
                        errorMessage = error?.response?.data?.detail || 'Некорректный файл';
                      }
                      
                      alert(errorMessage);
                      hapticFeedback?.error();
                    }
                    
                    e.target.value = '';
                  }}
                />
                {uploadingImages[question.id] ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid var(--tg-section-separator-color)',
                      borderTop: '2px solid var(--tg-button-color)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>Загрузка изображения...</span>
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tg-hint-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21,15 16,10 5,21"></polyline>
                    </svg>
                    <span>Добавить изображение</span>
                  </>
                )}
              </label>
            </div>
          )}

          {/* Изображение к вопросу */}
          {question.image_url && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                position: 'relative',
                backgroundColor: 'var(--tg-section-bg-color)',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                padding: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '100%',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onClick={() => setFullscreenImage(question.image_url || null)}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              >
                {imageLoading[question.id] && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid var(--tg-section-separator-color)',
                      borderTop: '3px solid var(--tg-button-color)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ 
                      color: 'var(--tg-hint-color)', 
                      fontSize: '14px' 
                    }}>
                      Загрузка изображения...
                    </span>
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                  </div>
                )}
                <img 
                  src={question.image_url} 
                  alt={question.image_name || 'Изображение'}
                  onLoadStart={() => {
                    setImageLoading(prev => ({ ...prev, [question.id]: true }));
                  }}
                  onLoad={() => {
                    console.log('Изображение успешно загружено:', question.image_url);
                    setImageLoading(prev => ({ ...prev, [question.id]: false }));
                  }}
                  onError={(e) => {
                    console.error('Ошибка загрузки изображения:', question.image_url);
                    const imgElement = e.currentTarget;
                    imgElement.style.display = 'none';
                    setImageLoading(prev => ({ ...prev, [question.id]: false }));
                    // Показываем сообщение об ошибке
                    const errorDiv = document.createElement('div');
                    errorDiv.textContent = t('surveyAnalytics.alerts.imageUploadError');
                    errorDiv.style.cssText = 'padding: 20px; text-align: center; color: var(--tg-hint-color); background: var(--tg-section-bg-color); border-radius: 8px; border: 1px solid var(--tg-section-separator-color);';
                    imgElement.parentElement?.appendChild(errorDiv);
                  }}
                  style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          width: 'auto',
                          height: 'auto',
                    objectFit: 'contain',
                    display: imageLoading[question.id] ? 'none' : 'block'
                  }}
                />
              </div>
              <p style={{
                fontSize: '11px',
                color: 'var(--tg-hint-color)',
                margin: '6px 0 0 0',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                Нажмите на изображение для просмотра
              </p>
              {!disabled && (
                <button
                  onClick={() => updateEditedQuestion(index, { 
                    image_url: undefined, 
                    image_name: undefined,
                    tempImagePath: undefined
                  })}
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
                              // Применяем ограничения только для финальных значений
                              if (numValue > 100) {
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
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value !== '') {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              // Применяем ограничение минимума только при потере фокуса
                              if (numValue < 2) {
                                updateEditedQuestion(index, { scale_max: 2 });
                                validateScaleValues(question.id, question.scale_min, 2);
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

          {/* Условная логика */}
          {editingQuestions && (
            <ConditionalLogicEditor
              question={question}
              allQuestions={editedQuestions}
              currentIndex={index}
              onConditionChange={(conditionalLogic) => updateEditedQuestion(index, { conditionalLogic })}
              disabled={disabled}
            />
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
              cursor: (!editingQuestions || savingQuestions) ? 'not-allowed' : 'pointer',
              opacity: (!editingQuestions || savingQuestions) ? 0.6 : 1,
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
                  disabled={!editingQuestions || savingQuestions}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: (!editingQuestions || savingQuestions) ? 'not-allowed' : 'pointer'
                  }}
                />
                {question.is_required && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {t('surveyAnalytics.questions.requiredQuestion')}
            </label>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 12, paddingBottom: 80, overflowX: 'hidden' }}>
      <CenteredPageContainer>
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
            📝 {survey.questions?.length || 0} {(survey.questions?.length || 0) === 1 ? t('surveyAnalytics.questions.questionCount') : t('surveyAnalytics.questions.questionCountMany')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tg-hint-color)' }}>
            📊 {stats?.total_responses ?? 0} {((stats?.total_responses ?? 0) === 1 || (stats?.total_responses ?? 0) > 20) ? t('surveyAnalytics.questions.answerCount') : t('surveyAnalytics.questions.answerCountMany')}
          </div>
        </div>
      </div>

      {/* Табы */}
      <AnimatedTabs
        tabs={[
          { id: 'overview', label: t('surveyAnalytics.tabs.overview') },
          { id: 'questions', label: t('surveyAnalytics.tabs.questions') },
          { id: 'analytics', label: t('surveyAnalytics.tabs.analytics') },
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
            <h3 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 600 }}>{t('surveyAnalytics.status.title')}</h3>
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
                      ✅ {t('surveyAnalytics.status.activate')}
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
                      📝 {t('surveyAnalytics.status.moveToDraft')}
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
                      ✔️ {t('surveyAnalytics.status.complete')}
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
                      📦 {t('surveyAnalytics.status.archive')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Распространение */}
          {survey && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ 
                background: 'var(--tg-section-bg-color)', 
                borderRadius: 16, 
                padding: 20,
                border: '1px solid var(--tg-section-separator-color)',
                marginBottom: 16
              }}
            >
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: 18, 
                fontWeight: 600,
                color: 'var(--tg-text-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🔗 {t('surveyAnalytics.distribution.title')}
              </h3>
              
              <div style={{ 
                background: 'var(--tg-bg-color)', 
                borderRadius: 12, 
                padding: 12, 
                marginBottom: 16, 
                wordBreak: 'break-all', 
                fontSize: 14, 
                color: 'var(--tg-hint-color)',
                fontFamily: 'monospace',
                border: '1px solid var(--tg-section-separator-color)'
              }}>
                {share?.share_url || t('surveyAnalytics.distribution.linkUnavailable')}
              </div>
              
              {share?.share_url && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      flex: 1,
                      background: copied ? '#34C759' : 'var(--tg-button-color)',
                      color: 'var(--tg-button-text-color)',
                      border: 'none',
                      borderRadius: 12,
                      padding: 12,
                      fontWeight: 600,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease',
                      boxShadow: copied ? '0 4px 12px rgba(52, 199, 89, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <Copy size={16} /> {copied ? t('surveyAnalytics.distribution.copied') : t('surveyAnalytics.distribution.copy')}
                  </button>
                  <button
                    onClick={handleShareTelegram}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #0088cc, #0066aa)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      padding: 12,
                      fontWeight: 600,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0, 136, 204, 0.3)'
                    }}
                  >
                    <Share size={16} /> {t('surveyAnalytics.distribution.share')}
                  </button>
                </div>
              )}
              
              {share?.qr_code && (
                <div style={{ 
                  textAlign: 'center',
                  background: 'var(--tg-bg-color)',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid var(--tg-section-separator-color)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--tg-text-color)'
                  }}>
                    <QrCode size={18} />
                    {t('surveyAnalytics.distribution.qrCode')}
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <img 
                      src={share.qr_code} 
                      alt="QR код для опроса" 
                      style={{ 
                        maxWidth: 160, 
                        maxHeight: 160,
                        borderRadius: 12, 
                        border: '2px solid var(--tg-section-separator-color)'
                      }} 
                    />
                  </div>
                  
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--tg-hint-color)',
                    margin: '0 0 12px 0',
                    lineHeight: '1.4'
                  }}>
                    {t('surveyAnalytics.distribution.qrScanHint')}
                  </p>
                  
                  <button
                    onClick={handleDownloadQR}
                    disabled={downloading}
                    style={{
                      width: '100%',
                      backgroundColor: downloading ? 'var(--tg-hint-color)' : 'var(--tg-button-color)',
                      color: 'var(--tg-button-text-color)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: downloading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <Download size={14} />
                    {downloading ? t('surveyAnalytics.distribution.downloading') : t('surveyAnalytics.distribution.downloadQR')}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Настройки опроса */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 12 }}>
            <button
              onClick={() => {
                setSettingsExpanded(!settingsExpanded);
                hapticFeedback?.light();
                // Скролл к настройкам при открытии
                if (!settingsExpanded) {
                  setTimeout(() => {
                    const settingsElement = document.querySelector('[data-settings-section]');
                    if (settingsElement) {
                      settingsElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      });
                    }
                  }, 100);
                }
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
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t('surveyAnalytics.settings.title')}</h3>
              </div>
              {settingsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {settingsExpanded && (
              <div data-settings-section>
                <button
                  onClick={() => {
                    if (editingSettings) {
                      handleSaveSettings();
                    } else {
                      setEditingSettings(true);
                      setEditedSettings(survey.settings);
                      setEditedMaxParticipants(survey.maxParticipants?.toString() || '');
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
                  {editingSettings ? <><Save size={14} /> {t('surveyAnalytics.settings.saveChanges')}</> : <>⚙️ {t('surveyAnalytics.settings.edit')}</>}
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
                    <X size={14} /> {t('surveyAnalytics.settings.cancel')}
                  </button>
                )}

                {/* Предупреждение о блокировке настроек при наличии ответов */}
                {!canEdit && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#FFF3CD',
                    borderRadius: '8px',
                    border: '1px solid #856404'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      color: '#856404',
                      lineHeight: '1.4'
                    }}>
                      ⚠️ {t('surveyAnalytics.settings.lockWarning')}
                    </div>
                  </div>
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
                    <span style={{ color: 'var(--tg-hint-color)' }}>{t('surveyAnalytics.settings.oneResponsePerUser')}</span>
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
                      <span style={{ fontWeight: 500 }}>{settings.oneResponsePerUser ? t('surveyAnalytics.settings.yes') : t('surveyAnalytics.settings.no')}</span>
                    )}
                  </div>

                  {/* Анонимность */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>{t('surveyAnalytics.settings.anonymous')}</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.allowAnonymous || false}
                          disabled={!canEdit}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, allowAnonymous: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: canEdit ? 'pointer' : 'not-allowed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.allowAnonymous ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          opacity: canEdit ? 1 : 0.5,
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
                      <span style={{ fontWeight: 500 }}>{settings.allowAnonymous ? t('surveyAnalytics.settings.anonymousAllowed') : t('surveyAnalytics.settings.anonymousForbidden')}</span>
                    )}
                  </div>

                  {/* Скрыть создателя опроса */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>{t('surveyAnalytics.settings.hideCreator')}</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.hideCreator || false}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const newSettings = { ...editedSettings!, hideCreator: e.target.checked };
                            // Если включаем скрытие создателя, отключаем мотивацию
                            if (e.target.checked && newSettings.motivationEnabled) {
                              newSettings.motivationEnabled = false;
                            }
                            setEditedSettings(newSettings);
                          }}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: canEdit ? 'pointer' : 'not-allowed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.hideCreator ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          opacity: canEdit ? 1 : 0.5,
                          borderRadius: '22px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '16px',
                            width: '16px',
                            left: editedSettings?.hideCreator ? '24px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.hideCreator ? t('surveyAnalytics.settings.yes') : t('surveyAnalytics.settings.no')}</span>
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
                    <span style={{ color: 'var(--tg-hint-color)' }}>{t('surveyAnalytics.settings.randomizeQuestions')}</span>
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
                      <span style={{ fontWeight: 500 }}>{settings.randomizeQuestions ? t('surveyAnalytics.settings.yes') : t('surveyAnalytics.settings.no')}</span>
                    )}
                  </div>

                  {/* Макс. участников */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>{t('surveyAnalytics.settings.maxParticipants')}</span>
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
                          placeholder={t('surveyAnalytics.settings.noLimit')}
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
                      <span style={{ fontWeight: 500 }}>{survey.maxParticipants || t('surveyAnalytics.settings.notSpecified')}</span>
                    )}
                  </div>

                  {/* Мотивация */}
                  {(settings.motivationEnabled || editingSettings) && (
                    <>
                      
                      {/* Предупреждение - показываем только при включенной мотивации */}
                      {editedSettings?.motivationEnabled && (
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
                            ⚠️ {t('surveyAnalytics.settings.motivation.warning')}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                        <span style={{ color: 'var(--tg-hint-color)' }}>{t('surveyAnalytics.settings.motivation.title')}</span>
                        {editingSettings ? (
                          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px' }}>
                            <input
                              type="checkbox"
                              checked={editedSettings?.motivationEnabled || false}
                              disabled={!canEdit || editedSettings?.hideCreator || false}
                              onChange={(e) => setEditedSettings({ ...editedSettings!, motivationEnabled: e.target.checked })}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: 'absolute',
                              cursor: (!canEdit || editedSettings?.hideCreator || false) ? 'not-allowed' : 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: editedSettings?.motivationEnabled ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                              opacity: (!canEdit || editedSettings?.hideCreator || false) ? 0.5 : 1,
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
                              {t('surveyAnalytics.settings.motivation.type')}
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
                              <option value="discount">{t('surveyAnalytics.settings.motivation.discount')}</option>
                              <option value="promo">{t('surveyAnalytics.settings.motivation.promo')}</option>
                              <option value="stars">{t('surveyAnalytics.settings.motivation.stars')}</option>
                              <option value="gift">{t('surveyAnalytics.settings.motivation.gift')}</option>
                              <option value="other">{t('surveyAnalytics.settings.motivation.other')}</option>
                            </select>
                          </div>

                          {editedSettings?.motivationType === 'stars' && (
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                              <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '6px' }}>
                                {t('surveyAnalytics.settings.motivation.starsCount')}
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
                                {t('surveyAnalytics.settings.motivation.discountDescription')}
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
                                placeholder={t('surveyAnalytics.settings.motivation.discountPlaceholder')}
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
                                  {t('surveyAnalytics.settings.motivation.promoDescription')}
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
                                  placeholder={t('surveyAnalytics.settings.motivation.promoPlaceholder')}
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
                                  {t('surveyAnalytics.settings.motivation.promoCode')}
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
                                {t('surveyAnalytics.settings.motivation.description')}
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
                                placeholder={t('surveyAnalytics.settings.motivation.descriptionPlaceholder')}
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
                            <span style={{ color: 'var(--tg-hint-color)' }}>{t('surveyAnalytics.settings.motivation.type')}</span>
                            <span style={{ fontWeight: 500 }}>
                              {settings.motivationType === 'discount' && t('surveyAnalytics.settings.motivation.discount')}
                              {settings.motivationType === 'promo' && t('surveyAnalytics.settings.motivation.promo')}
                              {settings.motivationType === 'stars' && t('surveyAnalytics.settings.motivation.stars')}
                              {settings.motivationType === 'gift' && t('surveyAnalytics.settings.motivation.gift')}
                              {settings.motivationType === 'other' && t('surveyAnalytics.settings.motivation.other')}
                            </span>
                          </div>
                          {settings.motivationDetails && (
                            <div style={{ padding: '8px 0' }}>
                              <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginBottom: '4px' }}>
                                {settings.motivationType === 'stars' ? t('surveyAnalytics.settings.motivation.starsCountLabel') : 
                                 settings.motivationType === 'discount' ? t('surveyAnalytics.settings.motivation.discountLabel') :
                                 settings.motivationType === 'promo' ? t('surveyAnalytics.settings.motivation.promoDescriptionLabel') : t('surveyAnalytics.settings.motivation.descriptionLabel')}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 500 }}>{settings.motivationDetails}</div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Таб: Вопросы */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {canEditQuestions && (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--tg-hint-color)' }}>
                  {editingQuestions ? t('surveyAnalytics.questions.editModeActive') : t('surveyAnalytics.questions.editAvailable')}
                </span>
              </div>
              <button
                onClick={() => {
                  if (editingQuestions) {
                    handleSaveQuestions();
                  } else {
                    setEditingQuestions(true);
                  }
                  if (!savingQuestions) {
                    hapticFeedback?.light();
                  }
                }}
                disabled={savingQuestions}
                style={{
                  background: editingQuestions ? (savingQuestions ? 'var(--tg-hint-color)' : 'var(--tg-button-color)') : 'var(--tg-button-color)',
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
                  cursor: savingQuestions ? 'not-allowed' : 'pointer',
                  opacity: savingQuestions ? 0.7 : 1,
                  position: 'relative'
                }}
              >
                {savingQuestions ? (
                  <>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>{t('surveyAnalytics.questions.saving')}</span>
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                  </>
                ) : (
                  <>
                    {editingQuestions ? <><Save size={14} /> {t('surveyAnalytics.questions.saveChanges')}</> : <>⚙️ {t('surveyAnalytics.questions.editQuestions')}</>}
                  </>
                )}
              </button>
              {editingQuestions && (
                <button
                  onClick={() => {
                    if (!savingQuestions) {
                      setEditingQuestions(false);
                      setEditedQuestions(JSON.parse(JSON.stringify(questions)));
                      setDeletedQuestions([]);
                      hapticFeedback?.light();
                    }
                  }}
                  disabled={savingQuestions}
                  style={{
                    background: savingQuestions ? 'var(--tg-hint-color)' : '#8E8E93',
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
                    cursor: savingQuestions ? 'not-allowed' : 'pointer',
                    opacity: savingQuestions ? 0.7 : 1
                  }}
                >
                  <X size={14} /> {t('surveyAnalytics.questions.cancel')}
                </button>
              )}
            </div>
          )}

          {/* Подсказки отображаются только в режиме редактирования */}
          {editingQuestions && (
            surveyHasResponses ? (
            <div style={{
              marginTop: '5px',
              padding: '12px',
              backgroundColor: '#FFF3CD',
              borderRadius: '8px',
              border: '1px solid #856404'
            }}>
              <div style={{
                fontSize: '13px',
                color: '#856404',
                  lineHeight: '1.4',
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ marginRight: 4 }}>⚠️</span>
                  <span>
                    {t('surveyAnalytics.questions.editRestriction')}
                    <InlineAddQuestionIcon />
                  </span>
              </div>
            </div>
            ) : (
              <div style={{
                marginTop: '5px',
                padding: '12px',
                backgroundColor: '#E6F2FF',
                borderRadius: '8px',
                border: '1px solid #8CB4FF'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: '#0B5394',
                  lineHeight: '1.4',
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ marginRight: 4 }}>ℹ️</span>
                  <span>
                    {t('surveyAnalytics.questions.addHint')}
                    <InlineAddQuestionIcon />
                  </span>
                </div>
              </div>
            )
          )}
          
          {editedQuestions.length === 0 ? (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 10, padding: 20, textAlign: 'center', color: 'var(--tg-hint-color)' }}>
              {t('surveyAnalytics.questions.noQuestions')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <AnimatePresence>
                {editedQuestions.map((q, idx) => renderQuestionEditor(q, idx))}
              </AnimatePresence>
            </div>
          )}

          {/* Кнопка добавления вопроса - внизу */}
          {editingQuestions && (
            <button
              onClick={() => {
                if (!savingQuestions) {
                  const maxOrderIndex = editedQuestions.length > 0 
                    ? Math.max(...editedQuestions.map(q => q.order_index))
                    : 0;
                  const newQuestion = createNewQuestion(maxOrderIndex + 1);
                  setEditedQuestions([...editedQuestions, newQuestion]);
                  hapticFeedback?.light();
                }
              }}
              disabled={savingQuestions}
              style={{
                background: 'transparent',
                color: savingQuestions ? 'var(--tg-hint-color)' : 'var(--tg-hint-color)',
                border: 'none',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                cursor: savingQuestions ? 'not-allowed' : 'pointer',
                opacity: savingQuestions ? 0.5 : 1
              }}
            >
              ➕ {t('surveyAnalytics.questions.createQuestion')}
            </button>
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
              {t('surveyAnalytics.analyticsSubTabs.summary')}
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
              {t('surveyAnalytics.analyticsSubTabs.question')}
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
              {t('surveyAnalytics.analyticsSubTabs.user')}
            </button>
          </div>

          {/* Кнопки экспорта */}
          {(stats?.total_responses ?? 0) > 0 && (
            <div style={{ marginTop: '7px' }}>
              {analyticsTab === 'summary' && (
                <button
                  onClick={exportAllAnswers}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '16px 16px',
                    backgroundColor: '#34C759',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {t('surveyAnalytics.export.allAnswers')}
                </button>
              )}
              
              {analyticsTab === 'question' && selectedQuestionId && (
                <button
                  onClick={exportQuestionAnswers}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '16px 16px',
                    backgroundColor: '#34C759',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {t('surveyAnalytics.export.questionAnswers')}
                </button>
              )}
              
              {analyticsTab === 'user' && selectedUserId && (
                <button
                  onClick={exportUserAnswers}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '16px 16px',
                    backgroundColor: '#34C759',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {t('surveyAnalytics.export.userAnswers')}
                </button>
              )}
              
              {/* Показываем подпись только если есть хотя бы одна кнопка */}
              {((analyticsTab === 'summary') || 
                (analyticsTab === 'question' && selectedQuestionId) || 
                (analyticsTab === 'user' && selectedUserId)) && (
                <div style={{
                  textAlign: 'center',
                  marginTop: '8px',
                  fontSize: '11px',
                  color: 'var(--tg-hint-color)'
                }}>
                  {t('surveyAnalytics.export.csvFormat')}
                </div>
              )}
            </div>
          )}

          {/* Контент подтабов */}
          {analyticsTab === 'summary' && (
            <SummaryTab 
              survey={survey}
              questions={questions || []}
              responses={responsesPage}
              stats={stats}
              loading={analyticsLoading}
              aiAnalyticsStatus={aiAnalyticsStatus}
              onNavigateToAI={() => {
                if (!surveyId) {
                  console.error('SurveyId is undefined!');
                  return;
                }
                navigate(`/survey/${surveyId}/ai-analytics`);
              }}
              imageLoading={imageLoading}
              setImageLoading={setImageLoading}
              setFullscreenImage={setFullscreenImage}
            />
          )}
          
          {analyticsTab === 'question' && (
            (stats?.total_responses ?? 0) === 0 ? (
              <div style={{
                background: 'var(--tg-section-bg-color)', 
                borderRadius: 12, 
                padding: 20, 
                textAlign: 'center', 
                color: 'var(--tg-hint-color)' 
              }}>
                Пока нет ответов — аналитика будет доступна после первых прохождений
              </div>
            ) : (
              <QuestionTab 
                questions={questions}
                responses={responsesPage}
                survey={survey}
                loading={analyticsLoading}
                selectedQuestionId={selectedQuestionId}
                onQuestionSelect={setSelectedQuestionId}
                imageLoading={imageLoading}
                setImageLoading={setImageLoading}
                setFullscreenImage={setFullscreenImage}
              />
            ) 
          )}
          
          {analyticsTab === 'user' && (
            (stats?.total_responses ?? 0) === 0 ? (
              <div style={{
                background: 'var(--tg-section-bg-color)', 
                borderRadius: 12, 
                padding: 20, 
                textAlign: 'center', 
                color: 'var(--tg-hint-color)' 
              }}>
                Пока нет ответов — аналитика будет доступна после первых прохождений
              </div>
            ) : (
              <IndividualUserTab 
                questions={questions}
                responses={responsesPage}
                survey={survey}
                loading={analyticsLoading}
                selectedUserId={selectedUserId}
                onUserSelect={setSelectedUserId}
                imageLoading={imageLoading}
                setImageLoading={setImageLoading}
                setFullscreenImage={setFullscreenImage}
              />
            )
          )}
        </div>
      )}
      </CenteredPageContainer>

      {/* Полноэкранный просмотр изображения */}
      <ImagePopup 
        imageUrl={fullscreenImage} 
        onClose={() => setFullscreenImage(null)} 
      />
    </div>
  );
}
