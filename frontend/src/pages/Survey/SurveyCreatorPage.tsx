import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, HelpCircle, Eye, Plus, Trash2, Copy } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { getDraft, saveSettings, saveQuestions, clearDraft } from '../../utils/surveyDraft';
import { useAppStore } from '../../store/useAppStore';

// Типы для вопросов
interface Question {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: any[];
  imageUrl?: string;
  imageName?: string;
  validation?: Record<string, any>;
}

// Типы для настроек
interface SurveyData {
  title: string;
  description: string;
  language: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  maxParticipants: string;
  // Настройки опроса
  allowAnonymous: boolean;
  showProgress: boolean;
  randomizeQuestions: boolean;
  oneResponsePerUser: boolean;
  collectTelegramData: boolean;
  creationType: 'manual';
}

type TabType = 'settings' | 'questions' | 'preview';

const SurveyCreatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { createSurvey, publishSurvey } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Данные опроса
  const [surveyData, setSurveyData] = useState<SurveyData>({
    title: '',
    description: '',
    language: 'ru',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    maxParticipants: '',
    allowAnonymous: true,
    showProgress: true,
    randomizeQuestions: false,
    oneResponsePerUser: true,
    collectTelegramData: true,
    creationType: 'manual'
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  // Загружаем данные из черновика при инициализации
  useEffect(() => {
    const draft = getDraft();
    if (draft?.settings) {
      const settings = draft.settings;
      setSurveyData(prev => ({
        ...prev,
        ...settings,
        title: settings.title || '',
        description: settings.description || '',
        language: settings.language || 'ru',
        startDate: settings.startDate || '',
        startTime: settings.startTime || '',
        endDate: settings.endDate || '',
        endTime: settings.endTime || '',
        maxParticipants: settings.maxParticipants || '',
        allowAnonymous: settings.allowAnonymous ?? true,
        showProgress: settings.showProgress ?? true,
        randomizeQuestions: settings.randomizeQuestions ?? false,
        oneResponsePerUser: settings.oneResponsePerUser ?? true,
        collectTelegramData: settings.collectTelegramData ?? true
      }));
    }
    
    if (draft?.questions) {
      setQuestions(draft.questions);
    }
  }, []);

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/survey/create'
  });

  // Сохраняем данные в черновик
  const saveDraft = () => {
    saveSettings(surveyData);
    saveQuestions(questions);
  };

  // Обработчики изменений
  const handleSurveyDataChange = (field: keyof SurveyData, value: any) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionChange = (questionId: string, updates: Partial<Question>) => {
    setQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, ...updates } : q)
    );
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: 'text',
      title: '',
      description: '',
      required: true,
      options: []
    };
    setQuestions(prev => [...prev, newQuestion]);
    hapticFeedback?.light();
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    hapticFeedback?.light();
  };

  const duplicateQuestion = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const newQuestion = {
        ...question,
        id: `q_${Date.now()}`,
        title: `${question.title} (копия)`
      };
      setQuestions(prev => [...prev, newQuestion]);
      hapticFeedback?.light();
    }
  };

  // Проверка готовности к публикации
  const isReadyToPublish = surveyData.title.trim().length > 0 && questions.length > 0;

  // Публикация опроса
  const handlePublish = async () => {
    if (!isReadyToPublish) return;
    
    setIsPublishing(true);
    hapticFeedback?.success();
    
    try {
      // Сохраняем финальные данные
      saveDraft();
      
      // Создаем опрос
      const createdSurvey = await createSurvey({
        title: surveyData.title,
        description: surveyData.description,
        is_public: true,
        settings: {
          ...surveyData,
          questions: questions
        }
      });

      // Публикуем опрос
      await publishSurvey(createdSurvey.id);
      
      // Очищаем черновик
      clearDraft();
      
      // Переходим на страницу успешной публикации
      navigate(`/survey/published?surveyId=${createdSurvey.id}`);
    } catch (error) {
      console.error('Ошибка публикации опроса:', error);
      alert('Не удалось опубликовать опрос. Попробуйте снова.');
      setIsPublishing(false);
    }
  };

  // Переключение табов
  const switchTab = (tab: TabType) => {
    saveDraft(); // Сохраняем данные при переключении
    setActiveTab(tab);
    hapticFeedback?.light();
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '100px'
    }}>
      {/* Шапка с табами */}
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
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0
          }}>
            Создание опроса
          </h1>
        </div>
        
        {/* Табы */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '4px',
          gap: '4px'
        }}>
          <button
            onClick={() => switchTab('settings')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'settings' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'settings' ? 'white' : 'var(--tg-text-color)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Settings size={16} />
            Настройки
          </button>
          
          <button
            onClick={() => switchTab('questions')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'questions' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'questions' ? 'white' : 'var(--tg-text-color)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <HelpCircle size={16} />
            Вопросы
          </button>
          
          <button
            onClick={() => switchTab('preview')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'preview' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'preview' ? 'white' : 'var(--tg-text-color)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Eye size={16} />
            Предпросмотр
          </button>
        </div>
      </div>

      {/* Контент табов */}
      <div style={{ padding: '20px 16px' }}>
        {activeTab === 'settings' && (
          <SettingsTab 
            surveyData={surveyData}
            onDataChange={handleSurveyDataChange}
            showAdvancedSettings={showAdvancedSettings}
            onToggleAdvanced={() => setShowAdvancedSettings(!showAdvancedSettings)}
          />
        )}
        
        {activeTab === 'questions' && (
          <QuestionsTab
            questions={questions}
            onQuestionChange={handleQuestionChange}
            onAddQuestion={addQuestion}
            onDeleteQuestion={deleteQuestion}
            onDuplicateQuestion={duplicateQuestion}
          />
        )}
        
        {activeTab === 'preview' && (
          <PreviewTab
            surveyData={surveyData}
            questions={questions}
            answers={previewAnswers}
            onAnswerChange={setPreviewAnswers}
          />
        )}
      </div>

      {/* Кнопка публикации */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        backgroundColor: 'var(--tg-bg-color)',
        borderTop: '1px solid var(--tg-section-separator-color)'
      }}>
        <button
          onClick={handlePublish}
          disabled={!isReadyToPublish || isPublishing}
          style={{
            width: '100%',
            backgroundColor: isReadyToPublish ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isReadyToPublish ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: isReadyToPublish ? 1 : 0.5
          }}
        >
          {isPublishing ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Публикация...
            </>
          ) : (
            '📊 Опубликовать опрос'
          )}
        </button>
        
        {!isReadyToPublish && (
          <p style={{
            fontSize: '12px',
            color: 'var(--tg-hint-color)',
            textAlign: 'center',
            margin: '8px 0 0 0'
          }}>
            Заполните название и добавьте хотя бы один вопрос
          </p>
        )}
      </div>
    </div>
  );
};

// Компонент таба настроек
const SettingsTab: React.FC<{
  surveyData: SurveyData;
  onDataChange: (field: keyof SurveyData, value: any) => void;
  showAdvancedSettings: boolean;
  onToggleAdvanced: () => void;
}> = ({ surveyData, onDataChange, showAdvancedSettings, onToggleAdvanced }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Основные настройки */}
      <div style={{
        backgroundColor: 'var(--tg-section-bg-color)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📝 Основная информация
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--tg-text-color)'
          }}>
            Название опроса *
          </label>
          <input
            type="text"
            value={surveyData.title}
            onChange={(e) => onDataChange('title', e.target.value)}
            placeholder="Введите название опроса..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'var(--tg-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>
        
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--tg-text-color)'
          }}>
            Описание (необязательно)
          </label>
          <textarea
            value={surveyData.description}
            onChange={(e) => onDataChange('description', e.target.value)}
            placeholder="Краткое описание опроса..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'var(--tg-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Расширенные настройки */}
      <div style={{
        backgroundColor: 'var(--tg-section-bg-color)',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <button
          onClick={onToggleAdvanced}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'var(--tg-bg-color)',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '8px',
            color: 'var(--tg-text-color)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: showAdvancedSettings ? '16px' : '0'
          }}
        >
          <span>⚙️ Расширенные настройки</span>
          <span style={{ transform: showAdvancedSettings ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
            ▼
          </span>
        </button>
        
        {showAdvancedSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Здесь будут расширенные настройки */}
            <p style={{ color: 'var(--tg-hint-color)', fontSize: '14px' }}>
              Расширенные настройки будут добавлены в следующем шаге
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Компонент таба вопросов
const QuestionsTab: React.FC<{
  questions: Question[];
  onQuestionChange: (questionId: string, updates: Partial<Question>) => void;
  onAddQuestion: () => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
}> = ({ questions, onQuestionChange, onAddQuestion, onDeleteQuestion, onDuplicateQuestion }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{
        backgroundColor: 'var(--tg-section-bg-color)',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ❓ Вопросы ({questions.length})
          </h3>
          
          <button
            onClick={onAddQuestion}
            style={{
              backgroundColor: 'var(--tg-button-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>
        
        {questions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--tg-hint-color)'
          }}>
            <HelpCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
              Добавьте первый вопрос
            </p>
            <button
              onClick={onAddQuestion}
              style={{
                backgroundColor: 'var(--tg-button-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Создать вопрос
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {questions.map((question, index) => (
              <div
                key={question.id}
                style={{
                  backgroundColor: 'var(--tg-bg-color)',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid var(--tg-section-separator-color)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--tg-hint-color)'
                  }}>
                    Вопрос {index + 1}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onDuplicateQuestion(question.id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--tg-section-separator-color)',
                        borderRadius: '6px',
                        padding: '6px',
                        cursor: 'pointer',
                        color: 'var(--tg-text-color)'
                      }}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteQuestion(question.id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--tg-section-separator-color)',
                        borderRadius: '6px',
                        padding: '6px',
                        cursor: 'pointer',
                        color: 'var(--tg-text-color)'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <input
                  type="text"
                  value={question.title}
                  onChange={(e) => onQuestionChange(question.id, { title: e.target.value })}
                  placeholder="Введите вопрос..."
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
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Компонент таба предпросмотра
const PreviewTab: React.FC<{
  surveyData: SurveyData;
  questions: Question[];
  answers: Record<string, any>;
  onAnswerChange: (answers: Record<string, any>) => void;
}> = ({ surveyData, questions }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{
        backgroundColor: 'var(--tg-section-bg-color)',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          👀 Предпросмотр опроса
        </h3>
        
        {questions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--tg-hint-color)'
          }}>
            <Eye size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '16px' }}>
              Добавьте вопросы для предпросмотра
            </p>
          </div>
        ) : (
          <div>
            {/* Заголовок опроса */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                margin: '0 0 8px 0',
                color: 'var(--tg-text-color)'
              }}>
                {surveyData.title || 'Название опроса'}
              </h2>
              {surveyData.description && (
                <p style={{
                  fontSize: '16px',
                  color: 'var(--tg-hint-color)',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {surveyData.description}
                </p>
              )}
            </div>
            
            {/* Вопросы */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {questions.map((question, index) => (
                <div key={question.id} style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: 'var(--tg-text-color)'
                  }}>
                    {index + 1}. {question.title || 'Вопрос без названия'}
                    {question.required && <span style={{ color: 'red' }}> *</span>}
                  </label>
                  
                  {question.description && (
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--tg-hint-color)',
                      margin: '0 0 12px 0'
                    }}>
                      {question.description}
                    </p>
                  )}
                  
                  <input
                    type="text"
                    placeholder="Ваш ответ..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--tg-section-separator-color)',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Кнопка отправки */}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                disabled
                style={{
                  backgroundColor: 'var(--tg-button-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 32px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'not-allowed',
                  opacity: 0.7
                }}
              >
                Отправить ответы
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SurveyCreatorPage;
