import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, HelpCircle, Eye, Plus, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { getDraft, saveSettings, saveQuestions, clearDraft } from '../../utils/surveyDraft';
import { useAppStore } from '../../store/useAppStore';
import { questionApi } from '../../services/api';

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
  hasOtherOption?: boolean; // Для варианта "Другое"
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
  hideCreator: boolean;
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
  // Добавляем CSS анимации
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { createSurvey, publishSurvey } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('questions');
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
    showProgress: false,
    randomizeQuestions: false,
    oneResponsePerUser: true,
    collectTelegramData: false,
    hideCreator: false,
    creationType: 'manual',
    motivationEnabled: false,
    motivationType: 'discount',
    motivationDetails: ''
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, { scaleMin?: string; scaleMax?: string }>>({});
  const [motivationValidationError, setMotivationValidationError] = useState<string>('');

  // Загружаем данные из черновика при инициализации
  useEffect(() => {
    const draft = getDraft();
    if (draft?.settings) {
      const settings = draft.settings;
      setSurveyData(prev => ({
        ...prev,
        title: settings.title || '',
        description: settings.description || '',
        language: settings.language || 'ru',
        startDate: settings.startDate || '',
        startTime: settings.startTime || '',
        endDate: settings.endDate || '',
        endTime: settings.endTime || '',
        maxParticipants: settings.maxParticipants || '',
        allowAnonymous: settings.allowAnonymous ?? false,
        showProgress: settings.showProgress ?? false,
        randomizeQuestions: settings.randomizeQuestions ?? false,
        oneResponsePerUser: settings.oneResponsePerUser ?? true,
        collectTelegramData: settings.collectTelegramData ?? false,
        hideCreator: (settings as any).hideCreator ?? false,
        creationType: 'manual',
        motivationEnabled: settings.motivationEnabled ?? false,
        motivationType: settings.motivationType || 'discount',
        motivationDetails: settings.motivationDetails || '',
        motivationConditions: settings.motivationConditions || ''
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

  // Автоматически сохраняем при изменениях
  useEffect(() => {
    saveDraft();
  }, [surveyData, questions]);

  // Инициализируем значения по умолчанию для шкалы и очищаем несовместимые ответы
  useEffect(() => {
    const newAnswers = { ...previewAnswers };
    let hasChanges = false;
    
    questions.forEach(question => {
      const currentAnswer = newAnswers[question.id];
      
      // Очищаем ответы для вопросов, которые изменили тип
      if (currentAnswer !== undefined) {
        let shouldClear = false;
        
        switch (question.type) {
          case 'text':
          case 'textarea':
            if (typeof currentAnswer !== 'string') shouldClear = true;
            break;
          case 'single_choice':
            if (typeof currentAnswer !== 'string') shouldClear = true;
            break;
          case 'multiple_choice':
            if (!Array.isArray(currentAnswer)) shouldClear = true;
            break;
          case 'scale':
            if (typeof currentAnswer !== 'number') shouldClear = true;
            break;
          case 'rating':
            if (typeof currentAnswer !== 'number') shouldClear = true;
            break;
          case 'boolean':
            if (currentAnswer !== 'yes' && currentAnswer !== 'no' && currentAnswer !== null) shouldClear = true;
            break;
          case 'date':
            if (typeof currentAnswer !== 'string') shouldClear = true;
            break;
          case 'number':
            if (typeof currentAnswer !== 'string' && typeof currentAnswer !== 'number') shouldClear = true;
            break;
        }
        
        if (shouldClear) {
          delete newAnswers[question.id];
          hasChanges = true;
        }
      }
      
      // Инициализируем значения по умолчанию для шкалы
      if (question.type === 'scale' && !(question.id in newAnswers)) {
        const min = question.scaleMin || 1;
        const max = question.scaleMax || 10;
        newAnswers[question.id] = Math.floor((min + max) / 2);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setPreviewAnswers(newAnswers);
    }
  }, [questions]);

  // Функция для проверки валидации
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
    
    setValidationErrors(prev => ({
      ...prev,
      [questionId]: errors
    }));
  };

  // Обработчики изменений
  const handleSurveyDataChange = (field: keyof SurveyData, value: any) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
    
    // Очищаем ошибку валидации при изменении полей мотивации
    if (field === 'motivationEnabled' || field === 'motivationType' || field === 'motivationDetails' || field === 'motivationConditions') {
      setMotivationValidationError('');
    }
  };

  // Функция для перехода к созданию опроса с ИИ
  const handleCreateWithAI = () => {
    // Очищаем LocalStorage от данных ручного создания опроса
    clearDraft();
    // Переходим на страницу выбора типа ИИ-опроса
    navigate('/survey/create/ai');
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
          
          // Валидация для шкалы: "От" не должно быть больше или равно "До"
          if (updatedQuestion.type === 'scale') {
            const scaleMin = updatedQuestion.scaleMin;
            const scaleMax = updatedQuestion.scaleMax;
            
            if (scaleMin !== undefined && scaleMax !== undefined && scaleMin >= scaleMax) {
              // Если "От" больше или равно "До", корректируем "До"
              updatedQuestion.scaleMax = scaleMin + 1;
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
      description: undefined,
      required: true,
      options: [],
      scaleMin: undefined, // Только для типа "scale"
      scaleMax: undefined // Только для типа "scale"
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

  // Валидация мотивации
  const validateMotivation = (): boolean => {
    if (!surveyData.motivationEnabled) {
      setMotivationValidationError('');
      return true;
    }

    // Проверяем конфликт с настройкой "Скрыть создателя"
    if (surveyData.hideCreator) {
      setMotivationValidationError('Нельзя включить мотивацию при скрытом создателе опроса');
      return false;
    }

    // Проверяем что описание заполнено для всех типов
    if (!surveyData.motivationDetails || surveyData.motivationDetails.trim() === '') {
      if (surveyData.motivationType === 'stars') {
        setMotivationValidationError('Введите количество звёзд');
      } else {
        setMotivationValidationError('Заполните описание награды');
      }
      return false;
    }

    // Для звезд дополнительно проверяем что число >= 1
    if (surveyData.motivationType === 'stars') {
      const starsCount = parseInt(surveyData.motivationDetails);
      if (isNaN(starsCount) || starsCount < 1) {
        setMotivationValidationError('Количество звёзд должно быть не менее 1');
        return false;
      }
    }

    // Для промокода нужен также промокод
    if (surveyData.motivationType === 'promo') {
      if (!surveyData.motivationConditions || surveyData.motivationConditions.trim() === '') {
        setMotivationValidationError('Введите промокод');
        return false;
      }
    }

    setMotivationValidationError('');
    return true;
  };

  // Проверка готовности к публикации
  const isReadyToPublish = surveyData.title.trim().length > 0 && questions.length > 0;

  // Публикация опроса
  const handlePublish = async () => {
    if (!isReadyToPublish) {
      return;
    }
    
    // Проверяем валидацию мотивации перед публикацией
    if (!validateMotivation()) {
      setActiveTab('settings');
      // Скроллим к настройкам мотивации
      setTimeout(() => {
        const motivationSettings = document.getElementById('motivation-settings');
        if (motivationSettings) {
          motivationSettings.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }
    
    setIsPublishing(true);
    hapticFeedback?.success();
    
    try {
      // Создаем опрос (без вложения вопросов в settings)
      const createdSurvey = await createSurvey({
        title: surveyData.title,
        description: surveyData.description,
        is_public: true,
        settings: {
          allowAnonymous: surveyData.allowAnonymous,
          showProgress: surveyData.showProgress,
          randomizeQuestions: surveyData.randomizeQuestions,
          oneResponsePerUser: surveyData.oneResponsePerUser,
          collectTelegramData: surveyData.collectTelegramData,
          hideCreator: surveyData.hideCreator,
          creationType: 'manual',
          endDate: surveyData.endDate,
          maxParticipants: surveyData.maxParticipants,
          motivationEnabled: surveyData.motivationEnabled,
          motivationType: surveyData.motivationType,
          motivationDetails: surveyData.motivationDetails,
          motivationConditions: surveyData.motivationConditions,
          language: surveyData.language,
        }
      });

      // Создаем вопросы для опроса
      try {
        const surveyId = createdSurvey.id as string;
        const createPayloads = questions.map((q, index) => {
          const optionsClean = (q.options || []).filter((opt) => opt && opt.trim() !== '');
          return {
            survey_id: surveyId,
            type: q.type === 'boolean' ? 'yes_no' : q.type,
            text: q.title || '',
            description: q.description || undefined,
            is_required: q.required,
            order_index: index + 1,
            options: optionsClean.length ? optionsClean : undefined,
            scale_min: q.scaleMin,
            scale_max: q.scaleMax,
            scale_min_label: q.scaleLabels?.min,
            scale_max_label: q.scaleLabels?.max,
            // rating_max по умолчанию 5 на бэкенде; передавать не обязательно
            validation: q.validation,
            image_url: q.imageUrl,
            image_name: q.imageName,
            has_other_option: q.hasOtherOption || false,
          } as const;
        });
        // Последовательно или параллельно; используем последовательный сдержанный параллелизм
        for (const payload of createPayloads) {
          // eslint-disable-next-line no-await-in-loop
          await questionApi.createQuestion(payload as any);
        }
      } catch (e) {
        console.error('Ошибка создания вопросов:', e);
        throw e;
      }

      // Публикуем опрос сразу
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
            motivationValidationError={motivationValidationError}
            setMotivationValidationError={setMotivationValidationError}
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
              validationErrors={validationErrors}
              validateScaleValues={validateScaleValues}
              onCreateWithAI={handleCreateWithAI}
            />
        )}
        
        {activeTab === 'preview' && (
          <PreviewTab
            surveyData={surveyData}
            questions={questions}
            answers={previewAnswers}
            onAnswerChange={setPreviewAnswers}
            validationErrors={validationErrors}
            previewAnswers={previewAnswers}
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
  motivationValidationError: string;
  setMotivationValidationError: (error: string) => void;
}> = ({ surveyData, onDataChange, showAdvancedSettings, onToggleAdvanced, motivationValidationError, setMotivationValidationError }) => {
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

            {/* Дата окончания */}
            <div style={{ marginBottom: '16px' }}>
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

              {/* Показывать прогресс - ЗАКОММЕНТИРОВАНО НА БУДУЩЕЕ */}
              {/* <div style={{
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
              </div> */}

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
                      Случайный порядок вопросов для участника
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

              {/* Скрыть создателя опроса */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--tg-section-separator-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Скрыть создателя опроса</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Скрыть информацию о создателе от участников
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
                    checked={surveyData.hideCreator}
                    onChange={(e) => {
                      onDataChange('hideCreator', e.target.checked);
                      // Если включаем скрытие создателя, отключаем мотивацию
                      if (e.target.checked && surveyData.motivationEnabled) {
                        onDataChange('motivationEnabled', false);
                        setMotivationValidationError('');
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
                    backgroundColor: surveyData.hideCreator ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                    borderRadius: '24px',
                    transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: surveyData.hideCreator ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Собирать данные Telegram - ЗАКОММЕНТИРОВАНО НА БУДУЩЕЕ */}
              {/* <div style={{
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
              </div> */}

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
                     Добавить награду за участие в опросе
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
            disabled={surveyData.hideCreator}
            onChange={(e) => {
              // Проверяем конфликт с настройкой "Скрыть создателя"
              if (surveyData.hideCreator) {
                setMotivationValidationError('Нельзя включить мотивацию при скрытом создателе опроса');
                return;
              }
              
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
            cursor: surveyData.hideCreator ? 'not-allowed' : 'pointer',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: surveyData.motivationEnabled ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
            opacity: surveyData.hideCreator ? 0.5 : 1,
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
                  {/* Предупреждение о конфликте с настройкой "Скрыть создателя" */}
                  {surveyData.hideCreator && (
                    <div style={{ 
                      marginBottom: '16px', 
                      padding: '12px', 
                      backgroundColor: 'rgba(255, 59, 48, 0.1)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 59, 48, 0.3)'
                    }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#FF3B30', 
                        lineHeight: '1.4' 
                      }}>
                        ⚠️ Нельзя включить мотивацию при скрытом создателе опроса. Отключите настройку "Скрыть создателя опроса" для использования мотивации.
                      </div>
                    </div>
                  )}
                  
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
                  
                  {/* Ошибка валидации мотивации */}
                  {motivationValidationError && (
                    <div style={{ 
                      marginBottom: '16px', 
                      padding: '12px', 
                      backgroundColor: 'rgba(255, 59, 48, 0.1)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 59, 48, 0.3)'
                    }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#FF3B30', 
                        lineHeight: '1.4' 
                      }}>
                        ⚠️ {motivationValidationError}
                      </div>
                    </div>
                  )}
                  
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
                      {surveyData.motivationType === 'discount' && 'Описание скидки'}
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
                        surveyData.motivationType === 'discount' ? '20% скидка на следующий заказ' :
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

                  {/* Дополнительное поле только для промокода */}
                  {surveyData.motivationType === 'promo' && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        color: 'var(--tg-text-color)'
                      }}>
                        На что промокод и при каких условиях
                      </label>
                      <textarea
                        value={surveyData.motivationConditions || ''}
                        onChange={(e) => onDataChange('motivationConditions', e.target.value)}
                        placeholder="Например: Промокод на бесплатную доставку при заказе от 1000 рублей"
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
  validationErrors: Record<string, { scaleMin?: string; scaleMax?: string }>;
  validateScaleValues: (questionId: string, scaleMin?: number, scaleMax?: number) => void;
  onCreateWithAI: () => void;
}> = ({ questions, onQuestionChange, onAddQuestion, onDeleteQuestion, onDuplicateQuestion, onMoveQuestionUp, onMoveQuestionDown, onAddOption, onRemoveOption, onKeyboardStateChange, validationErrors, validateScaleValues, onCreateWithAI }) => {

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
                cursor: 'pointer',
                marginBottom: '12px',
                width: '160px',
                height: '40px'
              }}
            >
              Создать вопрос
            </button>
            
            <div style={{ 
              fontSize: '14px', 
              color: 'var(--tg-hint-color)', 
              marginBottom: '16px' 
            }}>
              или
            </div>
            
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* Летающие звездочки SVG */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '-16px',
                animation: 'float 2s ease-in-out infinite',
                animationDelay: '0s'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFA500" strokeWidth="1">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '-16px',
                animation: 'float 2s ease-in-out infinite',
                animationDelay: '1s'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFA500" strokeWidth="1">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </div>
              
              <button
                onClick={onCreateWithAI}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'gradientShift 3s ease infinite',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  width: '160px',
                  height: '40px'
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
                  Создать с ИИ
                </span>
              </button>
            </div>
            
            <div style={{ 
              fontSize: '12px', 
              color: 'var(--tg-hint-color)', 
              lineHeight: '1.4',
              maxWidth: '280px',
              margin: '15px auto 0 auto',
              textAlign: 'center'
            }}>
              Искусственный интеллект создаст готовый опрос по вашим требованиям. Требуется подписка.
            </div>
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
                      {/* Обычные варианты ответов */}
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
                      
                      {/* Вариант "Другое" - всегда внизу */}
                      {question.hasOtherOption && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                          <button
                            onClick={() => onQuestionChange(question.id, { hasOtherOption: false })}
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
                      )}
                      
                      {/* Кнопки добавления в одной строке */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => onAddOption(question.id)}
                          style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: '1px dashed var(--tg-section-separator-color)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: 'var(--tg-hint-color)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>+</span>
                          Добавить вариант
                        </button>
                        
                        <button
                          onClick={() => onQuestionChange(question.id, { hasOtherOption: !question.hasOtherOption })}
                          style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: '1px dashed var(--tg-section-separator-color)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: 'var(--tg-hint-color)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{question.hasOtherOption ? '✓' : '+'}</span>
                          Добавить «Другое»
                        </button>
                      </div>
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
                          value={question.scaleMin === undefined ? '' : question.scaleMin}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Разрешаем пустое значение для полного удаления
                            if (value === '') {
                              onQuestionChange(question.id, { scaleMin: undefined });
                              validateScaleValues(question.id, undefined, question.scaleMax);
                            } else {
                              const numValue = parseInt(value);
                              if (!isNaN(numValue)) {
                                // Не позволяем вводить значения меньше 1 или больше 99
                                if (numValue < 1) {
                                  onQuestionChange(question.id, { scaleMin: 1 });
                                  validateScaleValues(question.id, 1, question.scaleMax);
                                } else if (numValue > 99) {
                                  onQuestionChange(question.id, { scaleMin: 99 });
                                  validateScaleValues(question.id, 99, question.scaleMax);
                                } else {
                                  const currentMax = question.scaleMax || 10;
                                  // Если новое значение больше или равно максимуму, корректируем максимум
                                  if (numValue >= currentMax) {
                                    onQuestionChange(question.id, { 
                                      scaleMin: numValue,
                                      scaleMax: numValue + 1
                                    });
                                    validateScaleValues(question.id, numValue, numValue + 1);
                                  } else {
                                    onQuestionChange(question.id, { scaleMin: numValue });
                                    validateScaleValues(question.id, numValue, question.scaleMax);
                                  }
                                }
                              }
                            }
                          }}
                          min="1"
                          max="99"
                          enterKeyHint="done"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          onFocus={() => onKeyboardStateChange(true)}
                          onBlur={(e) => {
                            onKeyboardStateChange(false);
                            // Если поле пустое при потере фокуса, возвращаем 1
                            if (e.target.value === '') {
                              onQuestionChange(question.id, { scaleMin: 1 });
                              validateScaleValues(question.id, 1, question.scaleMax);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: validationErrors[question.id]?.scaleMin ? '1px solid #FF3B30' : 'none',
                            backgroundColor: 'var(--tg-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        {validationErrors[question.id]?.scaleMin && (
                          <div style={{
                            fontSize: '12px',
                            color: '#FF3B30',
                            marginTop: '4px'
                          }}>
                            {validationErrors[question.id].scaleMin}
                          </div>
                        )}
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
                          value={question.scaleMax === undefined ? '' : question.scaleMax}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Разрешаем пустое значение для полного удаления
                            if (value === '') {
                              onQuestionChange(question.id, { scaleMax: undefined });
                              validateScaleValues(question.id, question.scaleMin, undefined);
                            } else {
                              const numValue = parseInt(value);
                              if (!isNaN(numValue)) {
                                // Применяем ограничения только для финальных значений
                                if (numValue > 100) {
                                  onQuestionChange(question.id, { scaleMax: 100 });
                                  validateScaleValues(question.id, question.scaleMin, 100);
                                } else {
                                  const currentMin = question.scaleMin || 1;
                                  // Если новое значение меньше или равно минимуму, корректируем минимум
                                  if (numValue <= currentMin) {
                                    onQuestionChange(question.id, { 
                                      scaleMin: numValue - 1,
                                      scaleMax: numValue
                                    });
                                    validateScaleValues(question.id, numValue - 1, numValue);
                                  } else {
                                    onQuestionChange(question.id, { scaleMax: numValue });
                                    validateScaleValues(question.id, question.scaleMin, numValue);
                                  }
                                }
                              }
                            }
                          }}
                          min="2"
                          max="100"
                          enterKeyHint="done"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          onFocus={() => onKeyboardStateChange(true)}
                          onBlur={(e) => {
                            onKeyboardStateChange(false);
                            const value = e.target.value;
                            
                            if (value === '') {
                              // Если поле пустое при потере фокуса, устанавливаем значение по умолчанию
                              const currentMin = question.scaleMin || 1;
                              const defaultMax = currentMin > 9 ? currentMin + 1 : 10;
                              onQuestionChange(question.id, { scaleMax: defaultMax });
                              validateScaleValues(question.id, question.scaleMin, defaultMax);
                            } else {
                              const numValue = parseInt(value);
                              if (!isNaN(numValue)) {
                                // Применяем ограничение минимума только при потере фокуса
                                if (numValue < 2) {
                                  onQuestionChange(question.id, { scaleMax: 2 });
                                  validateScaleValues(question.id, question.scaleMin, 2);
                                }
                              }
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: validationErrors[question.id]?.scaleMax ? '1px solid #FF3B30' : 'none',
                            backgroundColor: 'var(--tg-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        {validationErrors[question.id]?.scaleMax && (
                          <div style={{
                            fontSize: '12px',
                            color: '#FF3B30',
                            marginTop: '4px'
                          }}>
                            {validationErrors[question.id].scaleMax}
                          </div>
                        )}
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

                {/* Отображение загруженной картинки (если есть) */}
                {question.imageUrl && (
                  <div style={{ marginBottom: '16px' }}>
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
                )}

                {/* Обязательный вопрос */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    position: 'relative',
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: '1px solid var(--tg-hint-color)',
                    backgroundColor: question.required ? 'var(--tg-button-color)' : 'transparent',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={question.required}
                      onChange={(e) => onQuestionChange(question.id, { required: e.target.checked })}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        margin: 0,
                        cursor: 'pointer'
                      }}
                    />
                    {question.required && (
                      <div style={{
                        position: 'absolute',
                        top: '35%',
                        left: '50%',
                        transform: 'translate(-50%, -90%)',
                        width: '10px',
                        height: '10px',
                        opacity: 1,
                        transition: 'opacity 0.2s ease'
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                  <label 
                    style={{
                      fontSize: '14px',
                      color: 'var(--tg-text-color)',
                      cursor: 'pointer'
                    }}
                    onClick={() => onQuestionChange(question.id, { required: !question.required })}
                  >
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
const renderQuestionInput = (question: Question, validationErrors?: Record<string, { scaleMin?: string; scaleMax?: string }>, onAnswerChange?: (answers: Record<string, any>) => void, answers?: Record<string, any>) => {
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
          value={answers?.[question.id] || ''}
          onChange={(e) => onAnswerChange?.({ ...answers, [question.id]: e.target.value })}
          style={baseStyle}
        />
      );
    
    case 'textarea':
      return (
        <textarea
          placeholder="Ваш ответ..."
          rows={4}
          enterKeyHint="done"
          value={answers?.[question.id] || ''}
          onChange={(e) => onAnswerChange?.({ ...answers, [question.id]: e.target.value })}
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
                border: `2px solid ${answers?.[question.id] === (option && option.trim() !== '' ? option : `Вариант ${index + 1}`) ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: answers?.[question.id] === (option && option.trim() !== '' ? option : `Вариант ${index + 1}`) ? 'var(--tg-button-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option}
                  checked={answers?.[question.id] === (option && option.trim() !== '' ? option : `Вариант ${index + 1}`)}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    cursor: 'pointer'
                  }}
                  onChange={() => {
                    // Используем option если он не пустой, иначе используем placeholder
                    const value = option && option.trim() !== '' ? option : `Вариант ${index + 1}`;
                    onAnswerChange?.({ ...answers, [question.id]: value });
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
                  opacity: answers?.[question.id] === (option && option.trim() !== '' ? option : `Вариант ${index + 1}`) ? 1 : 0,
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
          
          {/* Вариант "Другое" */}
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
                  border: `2px solid ${answers?.[question.id] === 'Другое' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: answers?.[question.id] === 'Другое' ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value="Другое"
                    checked={answers?.[question.id] === 'Другое'}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                    onChange={() => {
                      onAnswerChange?.({ ...answers, [question.id]: 'Другое' });
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
                    opacity: answers?.[question.id] === 'Другое' ? 1 : 0,
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
              
              {/* Поле для ввода текста */}
              {answers?.[question.id] === 'Другое' && (
                <div style={{ marginLeft: '32px' }}>
                  <input
                    type="text"
                    placeholder="Другое"
                    value={answers?.[`${question.id}_other`] || ''}
                    onChange={(e) => onAnswerChange?.({ ...answers, [`${question.id}_other`]: e.target.value })}
                    style={{
                      ...baseStyle,
                      border: !answers?.[`${question.id}_other`] ? '1px solid #ff4444' : '1px solid #b0b0b0',
                      backgroundColor: 'var(--tg-bg-color)'
                    }}
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  {!answers?.[`${question.id}_other`] && (
                    <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '4px' }}>
                      Пожалуйста, введите ваш ответ
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Кнопка "Отменить выбор" */}
          {answers?.[question.id] && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => onAnswerChange?.({ ...answers, [question.id]: null })}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--tg-section-bg-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Отменить выбор
              </button>
            </div>
          )}
        </div>
      );
    
    case 'multiple_choice':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(question.options || ['', '']).map((option, index) => {
            const currentAnswers = answers?.[question.id] || [];
            const actualValue = option && option.trim() !== '' ? option : `Вариант ${index + 1}`;
            const isChecked = currentAnswers.includes(actualValue);
            
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
                    name={`question_${question.id}_${index}`}
                    checked={isChecked}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                    onChange={(e) => {
                      const currentAnswers = answers?.[question.id] || [];
                      let newAnswers;
                      
                      if (e.target.checked) {
                        // Добавляем к выбранным
                        newAnswers = [...currentAnswers, actualValue];
                      } else {
                        // Убираем из выбранных
                        newAnswers = currentAnswers.filter((ans: string) => ans !== actualValue);
                      }
                      
                      onAnswerChange?.({ ...answers, [question.id]: newAnswers });
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
                  {option || `Вариант ${index + 1}`}
                </span>
              </label>
            );
          })}
          
          {/* Вариант "Другое" */}
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
                  border: `2px solid ${(answers?.[question.id] || []).includes('Другое') ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: (answers?.[question.id] || []).includes('Другое') ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    name={`question_${question.id}_other`}
                    checked={(answers?.[question.id] || []).includes('Другое')}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                    onChange={(e) => {
                      const currentAnswers = answers?.[question.id] || [];
                      let newAnswers;
                      
                      if (e.target.checked) {
                        // Добавляем к выбранным
                        newAnswers = [...currentAnswers, 'Другое'];
                      } else {
                        // Убираем из выбранных
                        newAnswers = currentAnswers.filter((ans: string) => ans !== 'Другое');
                        // Также очищаем текст "Другое"
                        onAnswerChange?.({ ...answers, [question.id]: newAnswers, [`${question.id}_other`]: '' });
                        return;
                      }
                      
                      onAnswerChange?.({ ...answers, [question.id]: newAnswers });
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -90%)',
                    width: '12px',
                    height: '12px',
                    opacity: (answers?.[question.id] || []).includes('Другое') ? 1 : 0,
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
              
              {/* Поле для ввода текста */}
              {(answers?.[question.id] || []).includes('Другое') && (
                <div style={{ marginLeft: '32px' }}>
                  <input
                    type="text"
                    placeholder="Другое"
                    value={answers?.[`${question.id}_other`] || ''}
                    onChange={(e) => onAnswerChange?.({ ...answers, [`${question.id}_other`]: e.target.value })}
                    style={{
                      ...baseStyle,
                      border: !answers?.[`${question.id}_other`] ? '1px solid #ff4444' : '1px solid #b0b0b0',
                      backgroundColor: 'var(--tg-bg-color)'
                    }}
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  {!answers?.[`${question.id}_other`] && (
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
      return <ScaleQuestionInput question={question} answers={answers} onAnswerChange={onAnswerChange} validationErrors={validationErrors} />;
    
    case 'rating':
      return <RatingQuestionInput question={question} answers={answers} onAnswerChange={onAnswerChange} />;
    
    case 'boolean':
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
                border: `2px solid ${answers?.[question.id] === 'yes' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: answers?.[question.id] === 'yes' ? 'var(--tg-button-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={answers?.[question.id] === 'yes'}
                  onChange={() => onAnswerChange?.({ ...answers, [question.id]: 'yes' })}
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
                  opacity: answers?.[question.id] === 'yes' ? 1 : 0,
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
                border: `2px solid ${answers?.[question.id] === 'no' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: answers?.[question.id] === 'no' ? 'var(--tg-button-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={answers?.[question.id] === 'no'}
                  onChange={() => onAnswerChange?.({ ...answers, [question.id]: 'no' })}
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
                  opacity: answers?.[question.id] === 'no' ? 1 : 0,
                  transition: 'opacity 0.2s ease'
                }} />
              </div>
              <span style={{ color: 'var(--tg-text-color)' }}>Нет</span>
            </label>
          </div>
          
          {/* Кнопка "Отменить выбор" */}
          {answers?.[question.id] && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => onAnswerChange?.({ ...answers, [question.id]: null })}
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
    
    case 'date':
      return (
        <input
          type="date"
          placeholder="Дата"
          value={answers?.[question.id] || ''}
          onChange={(e) => onAnswerChange?.({ ...answers, [question.id]: e.target.value })}
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
          value={answers?.[question.id] || ''}
          onChange={(e) => onAnswerChange?.({ ...answers, [question.id]: e.target.value })}
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
  validationErrors: Record<string, { scaleMin?: string; scaleMax?: string }>;
  previewAnswers: Record<string, any>;
}> = ({ surveyData, questions, validationErrors, previewAnswers, onAnswerChange, answers }) => {
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
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap'
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
                      margin: '0 0 12px 0',
                      whiteSpace: 'pre-wrap'
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
                  
                  {renderQuestionInput(question, validationErrors, onAnswerChange, answers)}
                </div>
              ))}
            </div>
            
            {/* Кнопка отправки */}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  const requiredQuestions = questions.filter(q => q.required);
                  
                  // Проверяем ответы на обязательные вопросы
                  const unansweredRequired = requiredQuestions.filter(question => {
                    const answer = previewAnswers[question.id];
                    
                    switch (question.type) {
                      case 'text':
                      case 'textarea':
                        return !answer || answer.trim() === '';
                      
                      case 'single_choice':
                        if (!answer) return true;
                        // Если выбран вариант "Другое", проверяем заполненность поля
                        if (answer === 'Другое') {
                          const otherAnswer = previewAnswers[`${question.id}_other`];
                          return !otherAnswer || otherAnswer.trim() === '';
                        }
                        return false;
                      
                      case 'multiple_choice':
                        if (!answer || !Array.isArray(answer) || answer.length === 0) return true;
                        // Если выбран вариант "Другое", проверяем заполненность поля
                        if (answer.includes('Другое')) {
                          const otherAnswer = previewAnswers[`${question.id}_other`];
                          return !otherAnswer || otherAnswer.trim() === '';
                        }
                        return false;
                      
                      case 'scale':
                        // Для шкалы считаем что ответ есть если есть значение (по умолчанию 5)
                        return answer === undefined || answer === null;
                      
                      case 'rating':
                        return !answer || answer === 0;
                      
                      case 'boolean':
                        return answer === undefined || answer === null;
                      
                      case 'date':
                        return !answer;
                      
                      case 'number':
                        return answer === undefined || answer === null || answer === '';
                      
                      default:
                        return !answer;
                    }
                  });
                  
                  // Дополнительно проверяем все вопросы с выбранным вариантом "Другое"
                  const unansweredOtherOptions = questions.filter(question => {
                    const answer = previewAnswers[question.id];
                    
                    // Проверяем single_choice с "Другое"
                    if (question.type === 'single_choice' && answer === 'Другое') {
                      const otherAnswer = previewAnswers[`${question.id}_other`];
                      return !otherAnswer || otherAnswer.trim() === '';
                    }
                    
                    // Проверяем multiple_choice с "Другое"
                    if (question.type === 'multiple_choice' && answer && Array.isArray(answer) && answer.includes('Другое')) {
                      const otherAnswer = previewAnswers[`${question.id}_other`];
                      return !otherAnswer || otherAnswer.trim() === '';
                    }
                    
                    return false;
                  });
                  
                  if (unansweredRequired.length === 0 && unansweredOtherOptions.length === 0) {
                    alert('Опрос успешно пройден!');
                  } else if (unansweredRequired.length > 0) {
                    alert('Пожалуйста, ответьте на все обязательные вопросы');
                  } else {
                    alert('Пожалуйста, заполните выбранные поля "Другое"');
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

// Компонент для шкалы
const ScaleQuestionInput: React.FC<{
  question: Question;
  answers?: Record<string, any>;
  onAnswerChange?: (answers: Record<string, any>) => void;
  validationErrors?: Record<string, { scaleMin?: string; scaleMax?: string }>;
}> = ({ question, answers, onAnswerChange, validationErrors }) => {
  // Проверяем корректность значений
  const minValue = question.scaleMin || 1;
  const maxValue = question.scaleMax || 10;
  
  // Проверяем есть ли ошибки валидации или некорректные значения
  const hasErrors = validationErrors && validationErrors[question.id] && 
    (validationErrors[question.id].scaleMin || validationErrors[question.id].scaleMax);
  
  const isInvalidRange = minValue < 1 || minValue > 99 || maxValue < 2 || maxValue > 100 || minValue >= maxValue;
  
  // Если есть ошибки или некорректный диапазон, используем значения по умолчанию
  const min = (hasErrors || isInvalidRange) ? 1 : minValue;
  const max = (hasErrors || isInvalidRange) ? 10 : maxValue;
  const [scaleValue, setScaleValue] = useState(() => {
    const currentValue = answers?.[question.id];
    if (currentValue !== undefined) {
      return currentValue;
    }
    return Math.floor((min + max) / 2);
  });
  
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
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setScaleValue(value);
              onAnswerChange?.({ ...answers, [question.id]: value });
            }}
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
};

// Компонент для рейтинга
const RatingQuestionInput: React.FC<{
  question: Question;
  answers?: Record<string, any>;
  onAnswerChange?: (answers: Record<string, any>) => void;
}> = ({ question, answers, onAnswerChange }) => {
  const [rating, setRating] = useState(() => {
    const currentValue = answers?.[question.id];
    if (currentValue !== undefined) {
      return currentValue;
    }
    return 0;
  });
  
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
            onClick={() => {
              setRating(star);
              onAnswerChange?.({ ...answers, [question.id]: star });
            }}
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
};

export default SurveyCreatorPage;
