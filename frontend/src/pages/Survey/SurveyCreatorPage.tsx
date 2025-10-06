import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, HelpCircle, Eye, Plus, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
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
  options?: string[]; // Для single_choice и multiple_choice
  imageUrl?: string;
  imageName?: string;
  validation?: Record<string, any>;
  scaleMin?: number; // Для scale
  scaleMax?: number; // Для scale
  scaleLabels?: { min: string; max: string }; // Для scale
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
  // Мотивация
  motivationEnabled: boolean;
  motivationType: string;
  motivationDetails: string;
  motivationConditions?: string;
  // UI состояние
  isKeyboardOpen?: boolean;
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
    allowAnonymous: false,
    showProgress: true,
    randomizeQuestions: false,
    oneResponsePerUser: true,
    collectTelegramData: false,
    creationType: 'manual',
    motivationEnabled: false,
    motivationType: 'discount',
    motivationDetails: ''
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
      prev.map(q => {
        if (q.id === questionId) {
          const updatedQuestion = { ...q, ...updates };
          
          // Автоматически создаем варианты для choice типов
          if (updates.type === 'single_choice' || updates.type === 'multiple_choice') {
            if (!updatedQuestion.options || updatedQuestion.options.length === 0) {
              updatedQuestion.options = ['', '']; // Пустые строки вместо предзаполненного текста
            }
          }
          
          return updatedQuestion;
        }
        return q;
      })
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
    
    // Автоскролл к новому вопросу
    setTimeout(() => {
      const questionElement = document.getElementById(`question-${newQuestion.id}`);
      if (questionElement) {
        questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      handleQuestionChange(questionId, {
        options: [...(question.options || []), ''] // Пустая строка вместо предзаполненного текста
      });
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const newOptions = question.options.filter((_, index) => index !== optionIndex);
      handleQuestionChange(questionId, { options: newOptions });
    }
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

  const moveQuestionUp = (questionId: string) => {
    const index = questions.findIndex(q => q.id === questionId);
    if (index > 0) {
      const newQuestions = [...questions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      setQuestions(newQuestions);
      
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
    const index = questions.findIndex(q => q.id === questionId);
    if (index < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      setQuestions(newQuestions);
      
      // Автоскролл к перемещенному вопросу
      setTimeout(() => {
        const questionElement = document.getElementById(`question-${questionId}`);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
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
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0
          }}>
            Создание опроса
          </h1>
          <span style={{ fontSize: '48px' }}>📝</span>
        </div>
        
        {/* Табы */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '4px',
          gap: '2px'
        }}>
          <button
            onClick={() => switchTab('settings')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'settings' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'settings' ? 'white' : 'var(--tg-text-color)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <Settings size={14} />
            Настройки
          </button>
          
          <button
            onClick={() => switchTab('questions')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'questions' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'questions' ? 'white' : 'var(--tg-text-color)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <HelpCircle size={14} />
            Вопросы
          </button>
          
          <button
            onClick={() => switchTab('preview')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'preview' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'preview' ? 'white' : 'var(--tg-text-color)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <Eye size={14} />
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
            onMoveQuestionUp={moveQuestionUp}
            onMoveQuestionDown={moveQuestionDown}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onKeyboardStateChange={(isOpen) => setSurveyData(prev => ({ ...prev, isKeyboardOpen: isOpen }))}
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
      {!surveyData.isKeyboardOpen && (
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
      )}
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
        marginBottom: '24px'
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
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            onFocus={() => onDataChange('isKeyboardOpen', true)}
            onBlur={() => onDataChange('isKeyboardOpen', false)}
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
            placeholder="Описание опроса..."
            rows={4}
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.currentTarget.blur();
              }
            }}
            onFocus={() => onDataChange('isKeyboardOpen', true)}
            onBlur={() => onDataChange('isKeyboardOpen', false)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--tg-section-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Расширенные настройки */}
      <div>
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
            style={{ marginBottom: '20px' }}
          >
            {/* Язык опроса */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--tg-text-color)'
              }}>
                Язык опроса
              </label>
              <select
                value={surveyData.language}
                onChange={(e) => onDataChange('language', e.target.value)}
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
                <option value="ru">🇷🇺 Русский</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>

            {/* Даты начала и окончания */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: 'var(--tg-text-color)'
                }}>
                  Дата начала
                </label>
                <input
                  type="date"
                  value={surveyData.startDate}
                  onChange={(e) => onDataChange('startDate', e.target.value)}
                  onFocus={() => onDataChange('isKeyboardOpen', true)}
                  onBlur={() => onDataChange('isKeyboardOpen', false)}
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
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: 'var(--tg-text-color)'
                }}>
                  Дата окончания
                </label>
                <input
                  type="date"
                  value={surveyData.endDate}
                  onChange={(e) => onDataChange('endDate', e.target.value)}
                  onFocus={() => onDataChange('isKeyboardOpen', true)}
                  onBlur={() => onDataChange('isKeyboardOpen', false)}
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
                />
              </div>
            </div>

            {/* Максимальное количество участников */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--tg-text-color)'
              }}>
                Максимальное количество участников
              </label>
              <input
                type="number"
                value={surveyData.maxParticipants}
                onChange={(e) => onDataChange('maxParticipants', e.target.value)}
                placeholder="Без ограничений"
                min="1"
                onFocus={() => onDataChange('isKeyboardOpen', true)}
                onBlur={() => onDataChange('isKeyboardOpen', false)}
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
              />
            </div>

            {/* Настройки опроса */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Анонимные ответы */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--tg-section-separator-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Анонимные ответы</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Разрешить участникам отвечать анонимно
                    </div>
                  </div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '24px'
                }}>
                  <input
                    type="checkbox"
                    checked={surveyData.allowAnonymous}
                    onChange={(e) => onDataChange('allowAnonymous', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: surveyData.allowAnonymous ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                    borderRadius: '24px',
                    transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: surveyData.allowAnonymous ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Показывать прогресс */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--tg-section-separator-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Показывать прогресс</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Отображать прогресс прохождения опроса
                    </div>
                  </div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '24px'
                }}>
                  <input
                    type="checkbox"
                    checked={surveyData.showProgress}
                    onChange={(e) => onDataChange('showProgress', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: surveyData.showProgress ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                    borderRadius: '24px',
                    transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: surveyData.showProgress ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Перемешивать вопросы */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--tg-section-separator-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Перемешивать вопросы</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Случайный порядок вопросов для каждого участника
                    </div>
                  </div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '24px'
                }}>
                  <input
                    type="checkbox"
                    checked={surveyData.randomizeQuestions}
                    onChange={(e) => onDataChange('randomizeQuestions', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: surveyData.randomizeQuestions ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                    borderRadius: '24px',
                    transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: surveyData.randomizeQuestions ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Один ответ на пользователя */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--tg-section-separator-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Один ответ на пользователя</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Запретить повторное участие
                    </div>
                  </div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '24px'
                }}>
                  <input
                    type="checkbox"
                    checked={surveyData.oneResponsePerUser}
                    onChange={(e) => onDataChange('oneResponsePerUser', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: surveyData.oneResponsePerUser ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                    borderRadius: '24px',
                    transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: surveyData.oneResponsePerUser ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Собирать данные Telegram */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--tg-section-separator-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Собирать данные Telegram</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Получать информацию о пользователе Telegram
                    </div>
                  </div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '50px',
                  height: '24px'
                }}>
                  <input
                    type="checkbox"
                    checked={surveyData.collectTelegramData}
                    onChange={(e) => onDataChange('collectTelegramData', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: surveyData.collectTelegramData ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                    borderRadius: '24px',
                    transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: surveyData.collectTelegramData ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Мотивация */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Мотивация</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Респонденты будут охотнее отвечать, мы их предупредим что они получат награду за прохождение
                    </div>
                  </div>
                </div>
        <label style={{
          position: 'relative',
          display: 'inline-block',
          width: '50px',
          height: '24px'
        }}>
          <input
            type="checkbox"
            checked={surveyData.motivationEnabled}
            onChange={(e) => {
              onDataChange('motivationEnabled', e.target.checked);
              if (e.target.checked) {
                // Автоскролл к настройкам мотивации
                setTimeout(() => {
                  const motivationSettings = document.getElementById('motivation-settings');
                  if (motivationSettings) {
                    motivationSettings.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 100);
              }
            }}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute',
            cursor: 'pointer',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: surveyData.motivationEnabled ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
            borderRadius: '24px',
            transition: '0.3s'
          }}>
            <span style={{
              position: 'absolute',
              content: '""',
              height: '18px',
              width: '18px',
              left: surveyData.motivationEnabled ? '27px' : '3px',
              bottom: '3px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: '0.3s'
            }} />
          </span>
        </label>
              </div>

              {/* Настройки мотивации */}
              {surveyData.motivationEnabled && (
                <div id="motivation-settings" style={{ marginTop: '10px', padding: '16px', backgroundColor: 'var(--tg-bg-color)', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px',
                      color: 'var(--tg-text-color)'
                    }}>
                      Тип награды
                    </label>
                    <select
                      value={surveyData.motivationType}
                      onChange={(e) => onDataChange('motivationType', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '16px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'var(--tg-section-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                    >
                      <option value="discount">Скидка</option>
                      <option value="promo">Промокод</option>
                      <option value="stars">Звезды Telegram</option>
                      <option value="gift">Подарок</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px',
                      color: 'var(--tg-text-color)'
                    }}>
                      {surveyData.motivationType === 'discount' && 'Размер скидки'}
                      {surveyData.motivationType === 'promo' && 'Что за промокод'}
                      {surveyData.motivationType === 'stars' && 'Сколько звезд одному пользователю'}
                      {surveyData.motivationType === 'gift' && 'Что за подарок'}
                      {surveyData.motivationType === 'other' && 'Пояснение к другому награждению'}
                    </label>
                    <input
                      type="text"
                      value={surveyData.motivationDetails}
                      onChange={(e) => onDataChange('motivationDetails', e.target.value)}
                      placeholder={
                        surveyData.motivationType === 'discount' ? 'Например: 20%' :
                        surveyData.motivationType === 'promo' ? 'Например: SAVE20' :
                        surveyData.motivationType === 'stars' ? 'Например: 50' :
                        surveyData.motivationType === 'gift' ? 'Например: Футболка с логотипом' :
                        'Например: Бесплатная консультация'
                      }
                      enterKeyHint="done"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      onFocus={() => onDataChange('isKeyboardOpen', true)}
                      onBlur={() => onDataChange('isKeyboardOpen', false)}
                      style={{
                        width: '100%',
                        padding: '16px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'var(--tg-section-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Дополнительное поле для скидки и промокода */}
                  {(surveyData.motivationType === 'discount' || surveyData.motivationType === 'promo') && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        color: 'var(--tg-text-color)'
                      }}>
                        {surveyData.motivationType === 'discount' ? 'На что скидка и при каких условиях' : 'На что промокод и при каких условиях'}
                      </label>
                      <textarea
                        value={surveyData.motivationConditions || ''}
                        onChange={(e) => onDataChange('motivationConditions', e.target.value)}
                        placeholder={
                          surveyData.motivationType === 'discount' ? 
                          'Например: Скидка на товар определенной категории за прохождение опроса' :
                          'Например: Промокод на бесплатную доставку при заказе от 1000 рублей'
                        }
                        rows={3}
                        enterKeyHint="done"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            e.currentTarget.blur();
                          }
                        }}
                        onFocus={() => onDataChange('isKeyboardOpen', true)}
                        onBlur={() => onDataChange('isKeyboardOpen', false)}
                        style={{
                          width: '100%',
                          padding: '16px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'var(--tg-section-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '16px',
                          resize: 'vertical',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
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
  onMoveQuestionUp: (questionId: string) => void;
  onMoveQuestionDown: (questionId: string) => void;
  onAddOption: (questionId: string) => void;
  onRemoveOption: (questionId: string, optionIndex: number) => void;
  onKeyboardStateChange: (isOpen: boolean) => void;
}> = ({ questions, onQuestionChange, onAddQuestion, onDeleteQuestion, onDuplicateQuestion, onMoveQuestionUp, onMoveQuestionDown, onAddOption, onRemoveOption, onKeyboardStateChange }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <div style={{
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
            ❓ Вопросы ({questions.length})
          </h3>
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
                id={`question-${question.id}`}
                style={{
                  backgroundColor: 'var(--tg-section-bg-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: 'none',
                  boxShadow: 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--tg-hint-color)'
                    }}>
                      Вопрос {index + 1}
                    </span>
                    
                    {/* Стрелочки для изменения порядка */}
                    {questions.length > 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {index > 0 && (
                          <button
                            onClick={() => onMoveQuestionUp(question.id)}
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
                        {index < questions.length - 1 && (
                          <button
                            onClick={() => onMoveQuestionDown(question.id)}
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
                
                {/* Поле для ввода вопроса */}
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={question.title}
                    onChange={(e) => onQuestionChange(question.id, { title: e.target.value })}
                    placeholder="Введите вопрос..."
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    onFocus={() => onKeyboardStateChange(true)}
                    onBlur={() => onKeyboardStateChange(false)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Поле для описания */}
                <div style={{ marginBottom: '16px' }}>
                  <textarea
                    value={question.description || ''}
                    onChange={(e) => onQuestionChange(question.id, { description: e.target.value })}
                    placeholder="Описание вопроса (необязательно)..."
                    rows={2}
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.currentTarget.blur();
                      }
                    }}
                    onFocus={() => onKeyboardStateChange(true)}
                    onBlur={() => onKeyboardStateChange(false)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Тип вопроса */}
                <div style={{ marginBottom: '16px' }}>
                  <select
                    value={question.type}
                    onChange={(e) => onQuestionChange(question.id, { type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  >
                    <option value="text">📝 Короткий ответ</option>
                    <option value="textarea">📄 Развернутый ответ</option>
                    <option value="single_choice">🔘 Один из списка</option>
                    <option value="multiple_choice">☑️ Несколько из списка</option>
                    <option value="scale">📊 Шкала</option>
                    <option value="rating">⭐️ Оценка звёздами</option>
                    <option value="boolean">✅ Да/Нет</option>
                    <option value="date">📅 Дата</option>
                    <option value="number">🔟 Число</option>
                  </select>
                </div>

                {/* Настройки для разных типов вопросов */}
                {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px',
                      color: 'var(--tg-text-color)'
                    }}>
                      Варианты ответов
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(question.options || ['', '']).map((option, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(question.options || [])];
                              newOptions[index] = e.target.value;
                              onQuestionChange(question.id, { options: newOptions });
                            }}
                            placeholder={`Вариант ${index + 1}`}
                            enterKeyHint="done"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            onFocus={() => onKeyboardStateChange(true)}
                            onBlur={() => onKeyboardStateChange(false)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'var(--tg-bg-color)',
                              color: 'var(--tg-text-color)',
                              fontSize: '14px',
                              outline: 'none'
                            }}
                          />
                          <button
                            onClick={() => onRemoveOption(question.id, index)}
                            style={{
                              backgroundColor: 'transparent',
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
                        </div>
                      ))}
                      <button
                        onClick={() => onAddOption(question.id)}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px dashed var(--tg-section-separator-color)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: 'var(--tg-hint-color)',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        + Добавить вариант
                      </button>
                    </div>
                  </div>
                )}

                {question.type === 'scale' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px',
                      color: 'var(--tg-text-color)'
                    }}>
                      Настройки шкалы
                    </label>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: 'var(--tg-hint-color)',
                          marginBottom: '4px'
                        }}>
                          От
                        </label>
                        <input
                          type="number"
                          value={question.scaleMin || 1}
                          onChange={(e) => onQuestionChange(question.id, { scaleMin: parseInt(e.target.value) || 1 })}
                          min="1"
                          enterKeyHint="done"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          onFocus={() => onKeyboardStateChange(true)}
                          onBlur={() => onKeyboardStateChange(false)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'var(--tg-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: 'var(--tg-hint-color)',
                          marginBottom: '4px'
                        }}>
                          До
                        </label>
                        <input
                          type="number"
                          value={question.scaleMax || 10}
                          onChange={(e) => onQuestionChange(question.id, { scaleMax: parseInt(e.target.value) || 10 })}
                          min="2"
                          max="20"
                          enterKeyHint="done"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          onFocus={() => onKeyboardStateChange(true)}
                          onBlur={() => onKeyboardStateChange(false)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'var(--tg-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: 'var(--tg-hint-color)',
                          marginBottom: '4px'
                        }}>
                          Подпись минимума
                        </label>
                        <input
                          type="text"
                          value={question.scaleLabels?.min || ''}
                          onChange={(e) => onQuestionChange(question.id, { 
                            scaleLabels: { 
                              min: e.target.value,
                              max: question.scaleLabels?.max || ''
                            } 
                          })}
                          placeholder="Например: Ужасно"
                          enterKeyHint="done"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          onFocus={() => onKeyboardStateChange(true)}
                          onBlur={() => onKeyboardStateChange(false)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'var(--tg-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: 'var(--tg-hint-color)',
                          marginBottom: '4px'
                        }}>
                          Подпись максимума
                        </label>
                        <input
                          type="text"
                          value={question.scaleLabels?.max || ''}
                          onChange={(e) => onQuestionChange(question.id, { 
                            scaleLabels: { 
                              min: question.scaleLabels?.min || '',
                              max: e.target.value
                            } 
                          })}
                          placeholder="Например: Отлично"
                          enterKeyHint="done"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          onFocus={() => onKeyboardStateChange(true)}
                          onBlur={() => onKeyboardStateChange(false)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'var(--tg-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Загрузчик картинки */}
                <div style={{ marginBottom: '16px' }}>
                  {question.imageUrl ? (
                    <div>
                      <div style={{
                        position: 'relative',
                        marginBottom: '8px'
                      }}>
                        <img
                          src={question.imageUrl}
                          alt="Загруженная картинка"
                          style={{
                            width: '100%',
                            maxHeight: '200px',
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                        />
                        <button
                          onClick={() => onQuestionChange(question.id, { imageUrl: undefined, imageName: undefined })}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: '500'
                    }}>
                      📷 Добавить картинку
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          e.stopPropagation();
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              onQuestionChange(question.id, { 
                                imageUrl: event.target?.result as string,
                                imageName: file.name 
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                {/* Обязательный вопрос */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => onQuestionChange(question.id, { required: e.target.checked })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <label style={{
                    fontSize: '14px',
                    color: 'var(--tg-text-color)',
                    cursor: 'pointer'
                  }}>
                    Обязательный вопрос
                  </label>
                </div>
              </div>
            ))}
            
            {/* Кнопка добавления вопроса */}
            {questions.length > 0 && (
              <div style={{
                textAlign: 'center',
                padding: '16px 0'
              }}>
                <button
                  onClick={onAddQuestion}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--tg-hint-color)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '0 auto'
                  }}
                >
                  <Plus size={16} />
                  Создать вопрос
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Функция для рендеринга разных типов вопросов
const renderQuestionInput = (question: Question) => {
  const baseStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
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
          enterKeyHint="done"
          style={baseStyle}
        />
      );
    
    case 'textarea':
      return (
        <textarea
          placeholder="Ваш ответ..."
          rows={4}
          enterKeyHint="done"
          style={{
            ...baseStyle,
            resize: 'vertical'
          }}
        />
      );
    
    case 'single_choice':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(question.options || ['', '']).map((option, index) => (
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
                border: '2px solid var(--tg-hint-color)',
                backgroundColor: 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    cursor: 'pointer'
                  }}
                  onChange={() => {
                    // Обновляем стили всех радио кнопок в группе
                    const radioButtons = document.querySelectorAll(`input[name="question_${question.id}"]`);
                    radioButtons.forEach((radio, radioIndex) => {
                      const label = radio.closest('label');
                      const circle = label?.querySelector('div') as HTMLElement;
                      const dot = label?.querySelector('div > div') as HTMLElement;
                      if (radioIndex === index) {
                        circle?.style.setProperty('border-color', 'var(--tg-button-color)');
                        circle?.style.setProperty('background-color', 'var(--tg-button-color)');
                        dot?.style.setProperty('opacity', '1');
                      } else {
                        circle?.style.setProperty('border-color', 'var(--tg-hint-color)');
                        circle?.style.setProperty('background-color', 'transparent');
                        dot?.style.setProperty('opacity', '0');
                      }
                    });
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
                  opacity: 0,
                  transition: 'opacity 0.2s ease'
                }} />
              </div>
              <span style={{ 
                color: 'var(--tg-text-color)',
                fontSize: '16px',
                flex: 1
              }}>
                {option || `Вариант ${index + 1}`}
              </span>
            </label>
          ))}
        </div>
      );
    
    case 'multiple_choice':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(question.options || ['', '']).map((option, index) => (
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
                border: '2px solid var(--tg-hint-color)',
                backgroundColor: 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    cursor: 'pointer'
                  }}
                  onChange={(e) => {
                    const checkbox = e.target as HTMLInputElement;
                    const label = checkbox.closest('label');
                    const square = label?.querySelector('div') as HTMLElement;
                    const checkmark = label?.querySelector('div > div') as HTMLElement;
                    if (checkbox.checked) {
                      square?.style.setProperty('border-color', 'var(--tg-button-color)');
                      square?.style.setProperty('background-color', 'var(--tg-button-color)');
                      checkmark?.style.setProperty('opacity', '1');
                    } else {
                      square?.style.setProperty('border-color', 'var(--tg-hint-color)');
                      square?.style.setProperty('background-color', 'transparent');
                      checkmark?.style.setProperty('opacity', '0');
                    }
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  opacity: 0,
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
                {option || `Вариант ${index + 1}`}
              </span>
            </label>
          ))}
        </div>
      );
    
    case 'scale':
      const min = question.scaleMin || 1;
      const max = Math.min(question.scaleMax || 10, 20); // Ограничиваем максимум до 20
      const [scaleValue, setScaleValue] = React.useState(Math.floor((min + max) / 2));
      
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
              color: scaleValue === min ? 'var(--tg-button-color)' : 'var(--tg-text-color)',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {min}
            </span>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="range"
                min={min}
                max={max}
                value={scaleValue}
                onChange={(e) => setScaleValue(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  background: '#666', // Простая серая линия
                  borderRadius: '4px',
                  outline: 'none',
                  appearance: 'none'
                }}
              />
            </div>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: scaleValue === max ? 'var(--tg-button-color)' : 'var(--tg-text-color)',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {max}
            </span>
          </div>
          
          {/* Показываем выбранное значение на отдельной строке */}
          {scaleValue !== min && scaleValue !== max && (
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
          
          {(question.scaleLabels?.min || question.scaleLabels?.max) && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--tg-hint-color)'
            }}>
              <span>{question.scaleLabels?.min || ''}</span>
              <span>{question.scaleLabels?.max || ''}</span>
            </div>
          )}
        </div>
      );
    
    case 'rating':
      const [rating, setRating] = React.useState(0);
      
      return (
        <div style={{ 
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--tg-section-separator-color)'
        }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
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
            ))}
          </div>
        </div>
      );
    
    case 'boolean':
      return (
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}>
            <input
              type="radio"
              name={`question_${question.id}`}
              value="yes"
              style={{ margin: 0 }}
            />
            <span style={{ color: 'var(--tg-text-color)' }}>Да</span>
          </label>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}>
            <input
              type="radio"
              name={`question_${question.id}`}
              value="no"
              style={{ margin: 0 }}
            />
            <span style={{ color: 'var(--tg-text-color)' }}>Нет</span>
          </label>
        </div>
      );
    
    case 'date':
      return (
        <input
          type="date"
          placeholder="Дата"
          style={baseStyle}
        />
      );
    
    case 'number':
      return (
        <input
          type="number"
          placeholder="Введите число..."
          enterKeyHint="done"
          inputMode="numeric"
          style={baseStyle}
        />
      );
    
    default:
      return (
        <input
          type="text"
          placeholder="Ваш ответ..."
          enterKeyHint="done"
          style={baseStyle}
        />
      );
  }
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
      <div>
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
                  
                  {question.imageUrl && (
                    <div style={{ marginBottom: '12px' }}>
                      <img
                        src={question.imageUrl}
                        alt="Изображение к вопросу"
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                    </div>
                  )}
                  
                  {renderQuestionInput(question)}
                </div>
              ))}
            </div>
            
            {/* Кнопка отправки */}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  const requiredQuestions = questions.filter(q => q.required);
                  if (requiredQuestions.length === 0) {
                    alert('Опрос успешно пройден!');
                  } else {
                    alert('Пожалуйста, ответьте на все обязательные вопросы');
                  }
                }}
                style={{
                  backgroundColor: 'var(--tg-button-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 32px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
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
