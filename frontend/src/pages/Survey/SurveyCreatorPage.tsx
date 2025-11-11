import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, HelpCircle, Eye, Plus, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { getDraft, saveSettings, saveQuestions, clearDraft } from '../../utils/surveyDraft';
import { useAppStore } from '../../store/useAppStore';
import { questionApi, uploadApi } from '../../services/api';
import ImagePopup from '../../components/ui/ImagePopup';

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
  tempImagePath?: string; // Временный путь к изображению для загрузки в Яндекс Диск
  validation?: Record<string, any>;
  scaleMin?: number; // Для scale
  scaleMax?: number; // Для scale
  scaleLabels?: { min: string; max: string }; // Для scale
  hasOtherOption?: boolean; // Для варианта "Другое"
  conditionalLogic?: ConditionalLogic; // Условия показа этого вопроса
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
  const { t } = useTranslation();
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
      // Приводим типы DraftQuestion к Question (условная логика уже совместима)
      setQuestions(draft.questions as Question[]);
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
        errors.scaleMin = t('surveyCreator.questions.validation.scaleMinLess');
      } else if (scaleMin > 99) {
        errors.scaleMin = t('surveyCreator.questions.validation.scaleMinMore');
      }
    }
    
    if (scaleMax !== undefined) {
      if (scaleMax < 2) {
        errors.scaleMax = t('surveyCreator.questions.validation.scaleMaxLess');
      } else if (scaleMax > 100) {
        errors.scaleMax = t('surveyCreator.questions.validation.scaleMaxMore');
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
        title: `${question.title} (${t('surveyCreator.questions.duplicate')})`
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
      
      // Если вопрос стал первым и у него была условная логика - сбрасываем её
      if (index === 1 && newQuestions[0].conditionalLogic?.enabled) {
        newQuestions[0] = { ...newQuestions[0], conditionalLogic: undefined };
      }
      
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
      setMotivationValidationError(t('surveyCreator.settings.motivationError'));
      return false;
    }

    // Проверяем что описание заполнено для всех типов
    if (!surveyData.motivationDetails || surveyData.motivationDetails.trim() === '') {
      if (surveyData.motivationType === 'stars') {
        setMotivationValidationError(t('surveyCreator.settings.rewardDetails.stars'));
      } else {
        setMotivationValidationError(t('surveyCreator.settings.rewardDetails.other'));
      }
      return false;
    }

    // Для звезд дополнительно проверяем что число >= 1
    if (surveyData.motivationType === 'stars') {
      const starsCount = parseInt(surveyData.motivationDetails);
      if (isNaN(starsCount) || starsCount < 1) {
        setMotivationValidationError(t('surveyCreator.settings.rewardDetails.stars'));
        return false;
      }
    }

    // Для промокода нужен также промокод
    if (surveyData.motivationType === 'promo') {
      if (!surveyData.motivationConditions || surveyData.motivationConditions.trim() === '') {
        setMotivationValidationError(t('surveyCreator.settings.promoConditions'));
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
        
        // Сначала создаем маппинг временных ID на реальные UUID
        // Ключ: временный ID вопроса, значение: реальный UUID
        const questionIdMap: Record<string, string> = {};
        
        // Создаем вопросы последовательно и обновляем маппинг
        for (let index = 0; index < questions.length; index++) {
          const q = questions[index];
          const optionsClean = (q.options || []).filter((opt) => opt && opt.trim() !== '');
          
          // Объединяем validation и conditionalLogic в одно поле validation
          let validationWithConditional = {
            ...(q.validation || {}),
            ...(q.conditionalLogic ? { conditionalLogic: q.conditionalLogic } : {})
          };
          
          // Если есть conditionalLogic с dependsOn, и это временный ID, обновляем его на реальный UUID
          if (validationWithConditional.conditionalLogic?.dependsOn && questionIdMap[validationWithConditional.conditionalLogic.dependsOn]) {
            validationWithConditional = {
              ...validationWithConditional,
              conditionalLogic: {
                ...validationWithConditional.conditionalLogic,
                dependsOn: questionIdMap[validationWithConditional.conditionalLogic.dependsOn]
              }
            };
          }
          
          const payload = {
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
            validation: Object.keys(validationWithConditional).length > 0 ? validationWithConditional : undefined,
            image_url: q.imageUrl,
            image_name: q.imageName,
            has_other_option: q.hasOtherOption || false,
          } as const;
          
          // Создаем вопрос БЕЗ изображения (если оно есть, оно временное)
          // Изображение будет загружено в Яндекс Диск после создания вопроса
          const payloadWithoutImage = {
            ...payload,
            image_url: undefined,
            image_name: undefined
          };
          
          // Создаем вопрос и получаем его реальный UUID
          const createdQuestion = await questionApi.createQuestion(payloadWithoutImage as any);
          
          // Сохраняем маппинг: временный ID -> реальный UUID
          questionIdMap[q.id] = createdQuestion.id;
        }
        
        // Второй проход: загружаем изображения в Яндекс Диск и обновляем вопросы
        for (let index = 0; index < questions.length; index++) {
          const q = questions[index];
          const realQuestionId = questionIdMap[q.id];
          
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
              // Продолжаем публикацию даже если изображение не загрузилось
            }
          } else if (q.imageUrl && realQuestionId) {
            // Если изображение уже есть (не временное), просто обновляем вопрос
            await questionApi.updateQuestion(realQuestionId, {
              image_url: q.imageUrl,
              image_name: q.imageName
            });
          }
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
      alert(t('surveyCreator.publishError'));
      setIsPublishing(false);
    }
  };

  // Переключение табов
  const switchTab = (tab: TabType) => {
    if (isPublishing) return; // Блокируем переключение во время публикации
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
            {t('surveyCreator.tabs.settings')}
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
            disabled={isPublishing}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'settings' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'settings' ? 'white' : 'var(--tg-text-color)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              opacity: isPublishing ? 0.5 : 1
            }}
          >
            <Settings size={14} />
            {t('surveyCreator.tabs.settings')}
          </button>
          
          <button
            onClick={() => switchTab('questions')}
            disabled={isPublishing}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'questions' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'questions' ? 'white' : 'var(--tg-text-color)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              opacity: isPublishing ? 0.5 : 1
            }}
          >
            <HelpCircle size={14} />
            {t('surveyCreator.tabs.questions')}
          </button>
          
          <button
            onClick={() => switchTab('preview')}
            disabled={isPublishing}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'preview' ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === 'preview' ? 'white' : 'var(--tg-text-color)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              opacity: isPublishing ? 0.5 : 1
            }}
          >
            <Eye size={14} />
            {t('surveyCreator.tabs.preview')}
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
              hapticFeedback={hapticFeedback}
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
            backgroundColor: (isReadyToPublish && !isPublishing) ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: (isReadyToPublish && !isPublishing) ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: (isReadyToPublish && !isPublishing) ? 1 : 0.5
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
              {t('surveyCreator.publish')}...
            </>
          ) : (
            `📊 ${t('surveyCreator.publish')}`
          )}
        </button>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        
        {!isReadyToPublish && (
          <p style={{
            fontSize: '12px',
            color: 'var(--tg-hint-color)',
            textAlign: 'center',
            margin: '8px 0 0 0'
          }}>
            {t('surveyCreator.questions.empty')}
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
  const { t } = useTranslation();
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
          📝 {t('surveyCreator.settings.basicInfo')}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--tg-text-color)'
          }}>
            {t('surveyCreator.settings.title')}
          </label>
          <input
            type="text"
            value={surveyData.title}
            onChange={(e) => onDataChange('title', e.target.value)}
            placeholder={t('surveyCreator.settings.titlePlaceholder')}
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
            {t('surveyCreator.settings.description')}
          </label>
          <textarea
            value={surveyData.description}
            onChange={(e) => onDataChange('description', e.target.value)}
            placeholder={t('surveyCreator.settings.descriptionPlaceholder')}
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
          <span>⚙️ {t('surveyCreator.settings.advanced')}</span>
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
                {t('surveyCreator.settings.language')}
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
                <option value="ru">🇷🇺 {t('surveyCreator.language.ru')}</option>
                <option value="en">🇺🇸 {t('surveyCreator.language.en')}</option>
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
                  {t('surveyCreator.settings.endDate')}
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
                  {t('surveyCreator.settings.maxParticipants')}
                </label>
                <input
                  type="number"
                  value={surveyData.maxParticipants}
                  onChange={(e) => onDataChange('maxParticipants', e.target.value)}
                  placeholder={t('surveyCreator.settings.maxParticipantsPlaceholder')}
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
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{t('surveyCreator.settings.anonymous')}</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      {t('surveyCreator.settings.anonymousDesc')}
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
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{t('surveyCreator.settings.randomizeQuestions')}</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      {t('surveyCreator.settings.randomizeQuestionsDesc')}
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
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{t('surveyCreator.settings.oneResponsePerUser')}</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      {t('surveyCreator.settings.oneResponsePerUserDesc')}
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
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{t('surveyCreator.settings.hideCreator')}</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      {t('surveyCreator.settings.hideCreatorDesc')}
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
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{t('surveyCreator.settings.motivation')}</div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                     {t('surveyCreator.settings.motivationDesc')}
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
                        ⚠️ {t('surveyCreator.settings.motivationWarning')}
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
                      ⚠️ {t('surveyCreator.settings.motivationNotice')}
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
                      {t('surveyCreator.settings.rewardType')}
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
                      <option value="discount">{t('surveyCreator.settings.rewardTypes.discount')}</option>
                      <option value="promo">{t('surveyCreator.settings.rewardTypes.promo')}</option>
                      <option value="stars">{t('surveyCreator.settings.rewardTypes.stars')}</option>
                      <option value="gift">{t('surveyCreator.settings.rewardTypes.gift')}</option>
                      <option value="other">{t('surveyCreator.settings.rewardTypes.other')}</option>
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
                      {surveyData.motivationType === 'discount' && t('surveyCreator.settings.rewardDetails.discount')}
                      {surveyData.motivationType === 'promo' && t('surveyCreator.settings.rewardDetails.promo')}
                      {surveyData.motivationType === 'stars' && t('surveyCreator.settings.rewardDetails.stars')}
                      {surveyData.motivationType === 'gift' && t('surveyCreator.settings.rewardDetails.gift')}
                      {surveyData.motivationType === 'other' && t('surveyCreator.settings.rewardDetails.other')}
                    </label>
                    <input
                      type="text"
                      value={surveyData.motivationDetails}
                      onChange={(e) => onDataChange('motivationDetails', e.target.value)}
                      placeholder={
                        surveyData.motivationType === 'discount' ? t('surveyCreator.settings.rewardPlaceholders.discount') :
                        surveyData.motivationType === 'promo' ? t('surveyCreator.settings.rewardPlaceholders.promo') :
                        surveyData.motivationType === 'stars' ? t('surveyCreator.settings.rewardPlaceholders.stars') :
                        surveyData.motivationType === 'gift' ? t('surveyCreator.settings.rewardPlaceholders.gift') :
                        t('surveyCreator.settings.rewardPlaceholders.other')
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
                        {t('surveyCreator.settings.promoConditions')}
                      </label>
                      <textarea
                        value={surveyData.motivationConditions || ''}
                        onChange={(e) => onDataChange('motivationConditions', e.target.value)}
                        placeholder={t('surveyCreator.settings.promoConditionsPlaceholder')}
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
  hapticFeedback?: { success?: () => void; error?: () => void };
}> = ({ questions, onQuestionChange, onAddQuestion, onDeleteQuestion, onDuplicateQuestion, onMoveQuestionUp, onMoveQuestionDown, onAddOption, onRemoveOption, onKeyboardStateChange, validationErrors, validateScaleValues, hapticFeedback }) => {
  const { t } = useTranslation();
  // Состояние для отслеживания загрузки изображений для каждого вопроса
  const [uploadingImages, setUploadingImages] = useState<{ [questionId: string]: boolean }>({});
  // Состояние для полноэкранного просмотра изображения
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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
            ❓ {t('surveyCreator.questions.title')} ({questions.length})
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
              {t('surveyCreator.questions.emptyFirst')}
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
              {t('surveyCreator.questions.addQuestion')}
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
                  flexDirection: 'column',
                  gap: '4px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--tg-hint-color)'
                      }}>
                        {t('surveyCreator.questions.questionLabel', { number: index + 1 })}
                      </span>
                      {question.conditionalLogic?.enabled && (
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--tg-button-color)',
                          backgroundColor: 'rgba(88, 101, 242, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          🔀 {t('surveyCreator.questions.conditionalLabel')}
                        </span>
                      )}
                      
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
                  
                  {/* Подсказка о родительском вопросе для условных */}
                  {question.conditionalLogic?.enabled && (() => {
                    const parentQuestion = questions.find(q => q.id === question.conditionalLogic?.dependsOn);
                    if (!parentQuestion) return null;
                    
                    const parentIndex = questions.findIndex(q => q.id === parentQuestion.id);
                    return (
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--tg-link-color)',
                        fontStyle: 'italic',
                        marginLeft: '0',
                        lineHeight: '1.3'
                      }}>
                        {t('surveyCreator.questions.dependsOnQuestion', { number: parentIndex + 1, title: parentQuestion.title || t('surveyCreator.questions.noTitle') })}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Поле для ввода вопроса */}
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={question.title}
                    onChange={(e) => onQuestionChange(question.id, { title: e.target.value })}
                    placeholder={t('surveyCreator.questions.titlePlaceholder')}
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
                    placeholder={t('surveyCreator.questions.descriptionPlaceholder')}
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
                    <option value="text">📝 {t('surveyCreator.questions.types.text')}</option>
                    <option value="textarea">📄 {t('surveyCreator.questions.types.textarea')}</option>
                    <option value="single_choice">🔘 {t('surveyCreator.questions.types.single_choice')}</option>
                    <option value="multiple_choice">☑️ {t('surveyCreator.questions.types.multiple_choice')}</option>
                    <option value="scale">📊 {t('surveyCreator.questions.types.scale')}</option>
                    <option value="rating">⭐️ {t('surveyCreator.questions.types.rating')}</option>
                    <option value="boolean">✅ {t('surveyCreator.questions.types.boolean')}</option>
                    <option value="date">📅 {t('surveyCreator.questions.types.date')}</option>
                    <option value="number">🔟 {t('surveyCreator.questions.types.number')}</option>
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
                      {t('surveyCreator.questions.options')}
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
                            placeholder={t('surveyCreator.questions.option', { number: index + 1 })}
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
                            value={t('surveyCreator.questions.other')}
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
                          {t('surveyCreator.questions.addOption')}
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
                          {t('surveyCreator.questions.addOther')}
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
                      {t('surveyCreator.questions.scaleSettings')}
                    </label>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: 'var(--tg-hint-color)',
                          marginBottom: '4px'
                        }}>
                          {t('surveyCreator.questions.scaleFrom')}
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
                          {t('surveyCreator.questions.scaleTo')}
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
                          {t('surveyCreator.questions.scaleMinLabel')}
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
                          placeholder={t('surveyCreator.questions.scaleMinLabelPlaceholder')}
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
                          {t('surveyCreator.questions.scaleMaxLabel')}
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
                          placeholder={t('surveyCreator.questions.scaleMaxLabelPlaceholder')}
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

                {/* Загрузка изображения */}
                {!question.imageUrl && (
                  <div style={{ marginBottom: '16px' }}>
                    {uploadingImages[question.id] ? (
                      // Показываем лоадер при загрузке
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        padding: '12px',
                        border: '2px dashed var(--tg-section-separator-color)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--tg-section-bg-color)'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid var(--tg-section-separator-color)',
                          borderTop: '2px solid var(--tg-button-color)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        <span style={{ color: 'var(--tg-hint-color)', fontSize: '14px' }}>
                          {t('surveyCreator.questions.image.uploading')}
                        </span>
                        <style>{`
                          @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                          }
                        `}</style>
                      </div>
                    ) : (
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px',
                        border: '2px dashed var(--tg-section-separator-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: 'var(--tg-section-bg-color)',
                        transition: 'all 0.2s ease'
                      }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            try {
                              // Устанавливаем состояние загрузки
                              setUploadingImages(prev => ({ ...prev, [question.id]: true }));
                              
                              // Проверяем размер файла перед загрузкой
                              if (file.size > 10 * 1024 * 1024) { // 10MB
                                setUploadingImages(prev => ({ ...prev, [question.id]: false }));
                                alert(t('surveyCreator.questions.image.fileTooLarge'));
                                const errorFn = hapticFeedback?.error;
                                if (errorFn) {
                                  errorFn();
                                }
                                e.target.value = '';
                                return;
                              }
                              
                              // Проверяем тип файла
                              if (!file.type || !file.type.startsWith('image/')) {
                                setUploadingImages(prev => ({ ...prev, [question.id]: false }));
                                alert(t('surveyCreator.questions.image.invalidFile'));
                                const errorFn = hapticFeedback?.error;
                                if (errorFn) {
                                  errorFn();
                                }
                                e.target.value = '';
                                return;
                              }
                              
                              const result = await uploadApi.uploadImage(file);
                              
                              if (!result || !result.url) {
                                throw new Error(t('surveyCreator.questions.image.serverError'));
                              }
                              
                              // Получаем полный URL для отображения
                              // API возвращает путь вида /api/uploads/file/temp/...
                              let fullUrl = result.url;
                              
                              if (!fullUrl.startsWith('http')) {
                                // Если путь относительный, получаем базовый URL API
                                const getApiBase = (window as any).__GET_API_BASE_URL__;
                                let apiBaseUrl = getApiBase ? getApiBase() : ((window as any).__API_BASE_URL__ || window.location.origin);
                                
                                // Убираем /api из конца apiBaseUrl если он есть
                                if (apiBaseUrl.endsWith('/api')) {
                                  apiBaseUrl = apiBaseUrl.slice(0, -4);
                                }
                                
                                // Если путь начинается с /api, убираем его и добавляем к базовому URL
                                if (fullUrl.startsWith('/api')) {
                                  fullUrl = `${apiBaseUrl}${fullUrl}`;
                                } else {
                                  // Иначе добавляем базовый URL API
                                  fullUrl = `${apiBaseUrl}/api${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
                                }
                              }
                              
                              onQuestionChange(question.id, {
                                imageUrl: fullUrl,
                                imageName: result.filename,
                                tempImagePath: result.temp_path
                              });
                              const successFn = hapticFeedback?.success;
                              if (successFn) {
                                successFn();
                              }
                              
                              // Сбрасываем состояние загрузки
                              setUploadingImages(prev => ({ ...prev, [question.id]: false }));
                            } catch (error: any) {
                              console.error('Ошибка загрузки изображения:', error);
                              
                              // Сбрасываем состояние загрузки при ошибке
                              setUploadingImages(prev => ({ ...prev, [question.id]: false }));
                              
                              let errorMessage = t('surveyCreator.questions.image.uploadFailed');
                              
                              if (error?.response?.data?.detail) {
                                errorMessage = error.response.data.detail;
                              } else if (error?.message) {
                                errorMessage = error.message;
                              } else if (error?.response?.status === 413) {
                                errorMessage = t('surveyCreator.questions.image.fileTooBig');
                              } else if (error?.response?.status === 400) {
                                errorMessage = error?.response?.data?.detail || t('surveyCreator.questions.image.invalidFormat');
                              }
                              
                              alert(errorMessage);
                              const errorFn = hapticFeedback?.error;
                              if (errorFn) {
                                errorFn();
                              }
                            }
                            
                            // Сбрасываем input
                            e.target.value = '';
                          }}
                        />
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tg-hint-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21,15 16,10 5,21"></polyline>
                        </svg>
                        <span style={{ color: 'var(--tg-hint-color)', fontSize: '14px' }}>
                          {t('surveyCreator.questions.image.add')}
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* Отображение загруженной картинки (если есть) */}
                {question.imageUrl && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
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
                    onClick={() => setFullscreenImage(question.imageUrl || null)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    >
                      <img
                        src={question.imageUrl}
                        alt={t('surveyCreator.questions.image.uploaded')}
                        onError={(e) => {
                          console.error('Ошибка загрузки изображения:', question.imageUrl);
                          // Показываем сообщение об ошибке
                          const imgElement = e.currentTarget;
                          imgElement.style.display = 'none';
                          const errorDiv = document.createElement('div');
                          errorDiv.textContent = t('surveyCreator.questions.image.error');
                          errorDiv.style.cssText = 'padding: 20px; text-align: center; color: var(--tg-hint-color); background: var(--tg-section-bg-color); border-radius: 8px;';
                          imgElement.parentElement?.appendChild(errorDiv);
                        }}
                        onLoad={() => {
                          console.log('Изображение успешно загружено:', question.imageUrl);
                        }}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFullscreenImage(question.imageUrl || null);
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuestionChange(question.id, { 
                            imageUrl: undefined, 
                            imageName: undefined,
                            tempImagePath: undefined
                          });
                        }}
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
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--tg-hint-color)',
                      margin: '6px 0 0 0',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      {t('surveyCreator.questions.image.clickToView')}
                    </p>
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
                    {t('surveyCreator.questions.required')}
                  </label>
                </div>

                {/* Условная логика - только для вопросов после первого */}
                {index > 0 && (
                  <ConditionalLogicEditor
                    question={question}
                    allQuestions={questions}
                    currentIndex={index}
                    onConditionChange={(conditionalLogic) => {
                      onQuestionChange(question.id, { conditionalLogic });
                    }}
                  />
                )}
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
                  {t('surveyCreator.questions.addQuestion')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Полноэкранный просмотр изображения */}
        <ImagePopup 
          imageUrl={fullscreenImage} 
          onClose={() => setFullscreenImage(null)} 
        />
      </div>
    </motion.div>
  );
};

// Компонент редактора условной логики
const ConditionalLogicEditor: React.FC<{
  question: Question;
  allQuestions: Question[];
  currentIndex: number;
  onConditionChange: (conditionalLogic: ConditionalLogic | undefined) => void;
}> = ({ question, allQuestions, currentIndex, onConditionChange }) => {
  const { t } = useTranslation();
  // Получаем доступные вопросы для зависимости (только предыдущие)
  const availableQuestions = allQuestions.slice(0, currentIndex);
  
  // Получаем доступные операторы для выбранного типа вопроса
  const getAvailableOperators = (dependsOnType: string): Array<{ value: ConditionalOperator; label: string }> => {
    switch (dependsOnType) {
      case 'single_choice':
      case 'boolean':
        return [
          { value: 'equals', label: t('surveyCreator.questions.conditional.operators.equals') },
          { value: 'not_equals', label: t('surveyCreator.questions.conditional.operators.not_equals') }
        ];
      case 'multiple_choice':
        return [
          { value: 'contains', label: t('surveyCreator.questions.conditional.operators.contains') },
          { value: 'not_contains', label: t('surveyCreator.questions.conditional.operators.not_contains') }
        ];
      case 'scale':
      case 'number':
        return [
          { value: 'equals', label: t('surveyCreator.questions.conditional.operators.equals') },
          { value: 'greater_than', label: t('surveyCreator.questions.conditional.operators.greater_than') },
          { value: 'less_than', label: t('surveyCreator.questions.conditional.operators.less_than') },
          { value: 'greater_or_equal', label: t('surveyCreator.questions.conditional.operators.greater_or_equal') },
          { value: 'less_or_equal', label: t('surveyCreator.questions.conditional.operators.less_or_equal') }
        ];
      case 'rating':
        return [
          { value: 'equals', label: t('surveyCreator.questions.conditional.operators.equals') },
          { value: 'greater_than', label: t('surveyCreator.questions.conditional.operators.greater_than') },
          { value: 'less_than', label: t('surveyCreator.questions.conditional.operators.less_than') },
          { value: 'greater_or_equal', label: t('surveyCreator.questions.conditional.operators.greater_or_equal') },
          { value: 'less_or_equal', label: t('surveyCreator.questions.conditional.operators.less_or_equal') }
        ];
      case 'date':
        return [
          { value: 'date_on', label: t('surveyCreator.questions.conditional.operators.date_on') },
          { value: 'date_after', label: t('surveyCreator.questions.conditional.operators.date_after') },
          { value: 'date_before', label: t('surveyCreator.questions.conditional.operators.date_before') }
        ];
      default:
        return [];
    }
  };

  const dependsOnQuestion = availableQuestions.find(q => q.id === question.conditionalLogic?.dependsOn);
  const availableOperators = dependsOnQuestion ? getAvailableOperators(dependsOnQuestion.type) : [];
  
  // Получаем значения для выбора в зависимости от типа вопроса
  const getConditionValueOptions = (dependsOnQuestion: Question): Array<{ value: string | number; label: string }> => {
    if (!dependsOnQuestion) return [];
    
    switch (dependsOnQuestion.type) {
      case 'single_choice':
        return (dependsOnQuestion.options || []).filter(opt => opt.trim()).map(opt => ({ value: opt, label: opt }));
      case 'multiple_choice':
        return (dependsOnQuestion.options || []).filter(opt => opt.trim()).map(opt => ({ value: opt, label: opt }));
      case 'boolean':
        return [
          { value: 'yes', label: t('surveyCreator.questions.conditional.values.yes', { defaultValue: 'Да' }) },
          { value: 'no', label: t('surveyCreator.questions.conditional.values.no', { defaultValue: 'Нет' }) }
        ];
      case 'scale':
        const min = dependsOnQuestion.scaleMin || 1;
        const max = dependsOnQuestion.scaleMax || 10;
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
      // Правильно инициализируем условие с корректным значением
      const firstQuestion = availableQuestions[0];
      if (!firstQuestion) return;
      
      const operators = getAvailableOperators(firstQuestion.type);
      const defaultValue = firstQuestion.type === 'scale' || firstQuestion.type === 'rating' || firstQuestion.type === 'number'
        ? (firstQuestion.scaleMin || 1)
        : firstQuestion.type === 'boolean'
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
        ? (selectedQuestion.scaleMin || 1)
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
    // Для числовых типов, если значение - пустая строка, преобразуем в 0 при сохранении
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
        ? (dependsOnQuestion.scaleMin || 1)
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
    return null; // Нет доступных вопросов для зависимости
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
          cursor: 'pointer',
          flex: 1,
          minWidth: 0
        }} onClick={handleToggleCondition}>
          <span>🔀</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('surveyCreator.questions.conditional.title')}
          </span>
        </label>
        <label style={{
          position: 'relative',
          display: 'inline-block',
          width: '40px',
          height: '20px',
          flexShrink: 0
        }}>
          <input
            type="checkbox"
            checked={question.conditionalLogic?.enabled || false}
            onChange={handleToggleCondition}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute',
            cursor: 'pointer',
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
              {t('surveyCreator.questions.conditional.dependsOn')}
            </label>
            <select
              value={question.conditionalLogic.dependsOn}
              onChange={(e) => handleDependsOnChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              {availableQuestions.map(q => (
                <option key={q.id} value={q.id}>
                  {q.title || t('surveyCreator.questions.questionLabel', { number: allQuestions.findIndex(qq => qq.id === q.id) + 1 })}
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
                    {t('surveyCreator.questions.conditional.textUnavailable')}
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
                  alignItems: 'center'
                }}>
                  {conditionIndex > 0 && (
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--tg-hint-color)',
                      fontWeight: '500',
                      minWidth: '30px'
                    }}>
                      {question.conditionalLogic?.logicOperator === 'AND' ? t('surveyCreator.questions.conditional.logic.AND', { defaultValue: 'И' }) : t('surveyCreator.questions.conditional.logic.OR', { defaultValue: 'ИЛИ' })}
                    </span>
                  )}
                  
                  <select
                    value={condition.operator}
                    onChange={(e) => handleOperatorChange(conditionIndex, e.target.value as ConditionalOperator)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '13px',
                      outline: 'none'
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
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  ) : dependsOnQuestion.type === 'number' ? (
                    <input
                      type="number"
                      value={condition.value === 0 ? '' : condition.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Позволяем пустую строку для возможности очистки поля
                        if (value === '' || value === '-') {
                          // Храним как пустую строку временно, чтобы можно было стереть
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
                        // Если поле пустое при потере фокуса, устанавливаем 0
                        if (e.target.value === '' || e.target.value === '-') {
                          handleValueChange(conditionIndex, 0);
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        maxWidth: '120px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <select
                      value={typeof condition.value === 'string' || typeof condition.value === 'number' ? condition.value.toString() : ''}
                      onChange={(e) => {
                        const valueOptions = getConditionValueOptions(dependsOnQuestion);
                        const selected = valueOptions.find(opt => opt.value.toString() === e.target.value);
                        handleValueChange(conditionIndex, selected?.value || e.target.value);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    >
                      {getConditionValueOptions(dependsOnQuestion).map(opt => (
                        <option key={opt.value.toString()} value={opt.value.toString()}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {question.conditionalLogic && question.conditionalLogic.conditions.length > 1 && (
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

                  {dependsOnQuestion.type === 'multiple_choice' && question.conditionalLogic && question.conditionalLogic.conditions.length < 5 && (
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
                      + {t('surveyCreator.questions.conditional.addCondition')}
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
                          ⚠️ {t('surveyCreator.questions.conditional.incompleteWarning')}
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
                        💡 {t('surveyCreator.questions.conditional.completeInfo')}
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

// Функция для рендеринга разных типов вопросов
const renderQuestionInput = (question: Question, t: (key: string, options?: any) => string, validationErrors?: Record<string, { scaleMin?: string; scaleMax?: string }>, onAnswerChange?: (answers: Record<string, any>) => void, answers?: Record<string, any>) => {
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
          placeholder={t('surveyCreator.preview.answerPlaceholder')}
          enterKeyHint="done"
          value={answers?.[question.id] || ''}
          onChange={(e) => onAnswerChange?.({ ...answers, [question.id]: e.target.value })}
          style={baseStyle}
        />
      );
    
    case 'textarea':
      return (
        <textarea
          placeholder={t('surveyCreator.preview.answerPlaceholder')}
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
                border: `2px solid ${answers?.[question.id] === (option && option.trim() !== '' ? option : t('surveyCreator.preview.option', { number: index + 1 })) ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: answers?.[question.id] === (option && option.trim() !== '' ? option : t('surveyCreator.preview.option', { number: index + 1 })) ? 'var(--tg-button-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option}
                  checked={answers?.[question.id] === (option && option.trim() !== '' ? option : t('surveyCreator.preview.option', { number: index + 1 }))}
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
                    const value = option && option.trim() !== '' ? option : t('surveyCreator.preview.option', { number: index + 1 });
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
                  opacity: answers?.[question.id] === (option && option.trim() !== '' ? option : t('surveyCreator.preview.option', { number: index + 1 })) ? 1 : 0,
                  transition: 'opacity 0.2s ease'
                }} />
              </div>
              <span style={{ 
                color: 'var(--tg-text-color)',
                fontSize: '16px',
                flex: 1
              }}>
                {option || t('surveyCreator.preview.option', { number: index + 1 })}
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
                  border: `2px solid ${answers?.[question.id] === t('surveyCreator.preview.other') ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: answers?.[question.id] === t('surveyCreator.preview.other') ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={t('surveyCreator.preview.other')}
                    checked={answers?.[question.id] === t('surveyCreator.preview.other')}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                    onChange={() => {
                      onAnswerChange?.({ ...answers, [question.id]: t('surveyCreator.preview.other') });
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
                    opacity: answers?.[question.id] === t('surveyCreator.preview.other') ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                  }} />
                </div>
                <span style={{ 
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  flex: 1
                }}>
                  {t('surveyCreator.preview.other')}
                </span>
              </label>
              
              {/* Поле для ввода текста */}
              {answers?.[question.id] === t('surveyCreator.preview.other') && (
                <div style={{ marginLeft: '32px' }}>
                  <input
                    type="text"
                    placeholder={t('surveyCreator.preview.otherPlaceholder')}
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
                      {t('surveyCreator.preview.otherRequired')}
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
                {t('surveyCreator.preview.cancel')}
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
            const actualValue = option && option.trim() !== '' ? option : t('surveyCreator.preview.option', { number: index + 1 });
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
                  {option || t('surveyCreator.preview.option', { number: index + 1 })}
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
                  border: `2px solid ${(answers?.[question.id] || []).includes(t('surveyCreator.preview.other')) ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: (answers?.[question.id] || []).includes(t('surveyCreator.preview.other')) ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    name={`question_${question.id}_other`}
                    checked={(answers?.[question.id] || []).includes(t('surveyCreator.preview.other'))}
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
                      const otherText = t('surveyCreator.preview.other');
                      
                      if (e.target.checked) {
                        // Добавляем к выбранным
                        newAnswers = [...currentAnswers, otherText];
                      } else {
                        // Убираем из выбранных
                        newAnswers = currentAnswers.filter((ans: string) => ans !== otherText);
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
                    opacity: (answers?.[question.id] || []).includes(t('surveyCreator.preview.other')) ? 1 : 0,
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
                  {t('surveyCreator.preview.other')}
                </span>
              </label>
              
              {/* Поле для ввода текста */}
              {(answers?.[question.id] || []).includes(t('surveyCreator.preview.other')) && (
                <div style={{ marginLeft: '32px' }}>
                  <input
                    type="text"
                    placeholder={t('surveyCreator.preview.otherPlaceholder')}
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
                      {t('surveyCreator.preview.otherRequired')}
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
              <span style={{ color: 'var(--tg-text-color)' }}>{t('surveyCreator.preview.yes')}</span>
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
              <span style={{ color: 'var(--tg-text-color)' }}>{t('surveyCreator.preview.no')}</span>
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
          placeholder={t('surveyCreator.preview.datePlaceholder')}
          value={answers?.[question.id] || ''}
          onChange={(e) => onAnswerChange?.({ ...answers, [question.id]: e.target.value })}
          style={baseStyle}
        />
      );
    
    case 'number':
      return (
        <input
          type="number"
          placeholder={t('surveyCreator.preview.numberPlaceholder')}
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
          placeholder={t('surveyCreator.preview.answerPlaceholder')}
          enterKeyHint="done"
          style={baseStyle}
        />
      );
  }
};

// Функция проверки одного условия
const checkCondition = (
  condition: Condition,
  answer: any
): boolean => {
  switch (condition.operator) {
    case 'equals':
      // Для числовых значений сравниваем как числа
      if (typeof answer === 'number' || typeof condition.value === 'number' || 
          (!isNaN(Number(answer)) && !isNaN(Number(condition.value)))) {
        return Number(answer) === Number(condition.value);
      }
      return answer === condition.value;
    case 'not_equals':
      // Для числовых значений сравниваем как числа
      if (typeof answer === 'number' || typeof condition.value === 'number' || 
          (!isNaN(Number(answer)) && !isNaN(Number(condition.value)))) {
        return Number(answer) !== Number(condition.value);
      }
      return answer !== condition.value;
    case 'contains':
      return Array.isArray(answer) && answer.includes(condition.value);
    case 'not_contains':
      return !Array.isArray(answer) || !answer.includes(condition.value);
    case 'greater_than':
      return Number(answer) > Number(condition.value);
    case 'less_than':
      return Number(answer) < Number(condition.value);
    case 'greater_or_equal':
      return Number(answer) >= Number(condition.value);
    case 'less_or_equal':
      return Number(answer) <= Number(condition.value);
    case 'date_after':
      return new Date(answer) > new Date(condition.value as string);
    case 'date_before':
      return new Date(answer) < new Date(condition.value as string);
    case 'date_on':
      return new Date(answer).toDateString() === new Date(condition.value as string).toDateString();
    default:
      return true;
  }
};

// Функция проверки, должен ли вопрос быть показан
const shouldShowQuestion = (question: Question, answers: Record<string, any>, allQuestions: Question[] = []): boolean => {
  if (!question.conditionalLogic?.enabled) {
    return true; // Вопрос без условий всегда показывается
  }

  const logic = question.conditionalLogic;
  
  // Проверяем, что все условия полностью заполнены
  // Если хотя бы одно условие не имеет значения, всегда показываем вопрос
  const hasIncompleteConditions = logic.conditions.some(condition => {
    // Проверяем, что значение не пустое
    if (condition.value === undefined || condition.value === null || condition.value === '') {
      return true; // Неполное условие
    }
    // Для массивов проверяем, что массив не пустой
    if (Array.isArray(condition.value) && condition.value.length === 0) {
      return true; // Неполное условие
    }
    return false;
  });
  
  if (hasIncompleteConditions) {
    return true; // Условие не полностью заполнено - всегда показываем
  }
  
  // Находим родительский вопрос
  const parentQuestion = allQuestions.find(q => q.id === logic.dependsOn);
  
  // Если родительский вопрос имеет тип 'text' или 'textarea', всегда показываем вопрос
  if (parentQuestion && (parentQuestion.type === 'text' || parentQuestion.type === 'textarea')) {
    return true;
  }
  
  const dependsOnAnswer = answers[logic.dependsOn];

  if (dependsOnAnswer === undefined || dependsOnAnswer === null) {
    return false; // Если зависимый вопрос не отвечен, скрываем
  }

  // Проверяем условия
  const conditionResults = logic.conditions.map(condition => {
    return checkCondition(condition, dependsOnAnswer);
  });

  // Применяем логический оператор
  let conditionMet = false;
  if (logic.logicOperator === 'AND') {
    conditionMet = conditionResults.every(result => result);
  } else {
    conditionMet = conditionResults.some(result => result);
  }

  if (!conditionMet) {
    return false;
  }

  // Если условие выполнено, проверяем приоритет для числовых типов
  // parentQuestion уже найден выше
  if (!parentQuestion || !['scale', 'rating', 'number'].includes(parentQuestion.type)) {
    // Для нечисловых типов или если родительский вопрос не найден - показываем без проверки приоритета
    return true;
  }

  // Находим все вопросы, зависящие от того же вопроса
  const competingQuestions = allQuestions.filter(q => 
    q.id !== question.id && 
    q.conditionalLogic?.enabled && 
    q.conditionalLogic.dependsOn === logic.dependsOn
  );

  if (competingQuestions.length === 0) {
    return true; // Нет конкурентов - показываем
  }

  // Вычисляем "строгость" условий для приоритета
  // Чем больше значение в условии >=, тем выше приоритет
  // Чем меньше значение в условие <=, тем выше приоритет
  const getConditionPriority = (q: Question): number => {
    if (!q.conditionalLogic || q.conditionalLogic.conditions.length === 0) return 0;
    const condition = q.conditionalLogic.conditions[0];
    const conditionValue = Number(condition.value);
    
    // Проверяем, выполняется ли условие конкурента
    const competitorMet = checkCondition(condition, dependsOnAnswer);
    if (!competitorMet) {
      return -Infinity; // Условие не выполнено - низкий приоритет
    }

    // Приоритет для >=: чем больше значение, тем выше приоритет
    if (condition.operator === 'greater_or_equal') {
      return conditionValue;
    }
    // Приоритет для >: чем больше значение, тем выше приоритет
    if (condition.operator === 'greater_than') {
      return conditionValue + 0.1; // Немного выше чем >= для того же значения
    }
    // Приоритет для <=: чем меньше значение, тем выше приоритет (обратная логика)
    if (condition.operator === 'less_or_equal') {
      return -conditionValue;
    }
    // Приоритет для <: чем меньше значение, тем выше приоритет
    if (condition.operator === 'less_than') {
      return -(conditionValue + 0.1);
    }
    // Для == приоритет средний
    if (condition.operator === 'equals') {
      return 0;
    }
    
    return 0;
  };

  const currentPriority = getConditionPriority(question);
  const maxPriority = Math.max(
    currentPriority,
    ...competingQuestions.map(q => getConditionPriority(q))
  );

  // Показываем только если у этого вопроса наивысший приоритет
  return currentPriority === maxPriority && currentPriority !== -Infinity;
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
  const { t } = useTranslation();
  // Используем answers для проверки условий (это текущие ответы в предпросмотре)
  const currentAnswers = answers || previewAnswers;
  // Состояние для полноэкранного просмотра изображения
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
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
          👀 {t('surveyCreator.preview.title')}
        </h3>
        
        {questions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--tg-hint-color)'
          }}>
            <Eye size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '16px' }}>
              {t('surveyCreator.preview.empty')}
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
                {surveyData.title || t('surveyCreator.preview.defaultTitle')}
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
            <AnimatePresence>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {questions
                .map((question, index) => {
                  const isConditional = question.conditionalLogic?.enabled;
                  const isVisible = shouldShowQuestion(question, currentAnswers, questions);
                  return { question, index, isConditional, isVisible };
                })
                .filter(({ isConditional, isVisible }) => !isConditional || isVisible)
                .map(({ question, index }) => {
                  // Правильная нумерация видимых вопросов
                  const visibleIndex = questions.slice(0, index + 1).filter((q, i) => {
                    if (i === index) return true; // Текущий вопрос
                    const qIsConditional = q.conditionalLogic?.enabled;
                    return !qIsConditional || shouldShowQuestion(q, currentAnswers, questions);
                  }).length - 1;
                  
                  return (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ 
                      marginBottom: '20px'
                    }}
                  >
                  <label style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: 'var(--tg-text-color)'
                  }}>
                    {visibleIndex + 1}. {question.title || t('surveyCreator.preview.noTitle')}
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
                      <div style={{
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
                      onClick={() => setFullscreenImage(question.imageUrl || null)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      >
                        <img
                          src={question.imageUrl}
                          alt={t('surveyCreator.preview.imageAlt')}
                          onError={(e) => {
                            console.error('Ошибка загрузки изображения в предпросмотре:', question.imageUrl);
                            const imgElement = e.currentTarget;
                            imgElement.style.display = 'none';
                          }}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenImage(question.imageUrl || null);
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
                        {t('surveyCreator.preview.imageClick')}
                      </p>
                    </div>
                  )}
                  
                  {renderQuestionInput(question, t, validationErrors, onAnswerChange, answers)}
                  </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
            
            {/* Кнопка отправки */}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  const requiredQuestions = questions.filter(q => q.required);
                  
                  // Проверяем ответы на обязательные вопросы (только видимые)
                  const visibleRequiredQuestions = requiredQuestions.filter(q => shouldShowQuestion(q, answers || previewAnswers));
                  const unansweredRequired = visibleRequiredQuestions.filter(question => {
                    const answer = previewAnswers[question.id];
                    
                    switch (question.type) {
                      case 'text':
                      case 'textarea':
                        return !answer || answer.trim() === '';
                      
                      case 'single_choice':
                        if (!answer) return true;
                        // Если выбран вариант "Другое", проверяем заполненность поля
                        if (answer === t('surveyCreator.preview.other')) {
                          const otherAnswer = previewAnswers[`${question.id}_other`];
                          return !otherAnswer || otherAnswer.trim() === '';
                        }
                        return false;
                      
                      case 'multiple_choice':
                        if (!answer || !Array.isArray(answer) || answer.length === 0) return true;
                        // Если выбран вариант "Другое", проверяем заполненность поля
                        if (answer.includes(t('surveyCreator.preview.other'))) {
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
                    const otherText = t('surveyCreator.preview.other');
                    
                    // Проверяем single_choice с "Другое"
                    if (question.type === 'single_choice' && answer === otherText) {
                      const otherAnswer = previewAnswers[`${question.id}_other`];
                      return !otherAnswer || otherAnswer.trim() === '';
                    }
                    
                    // Проверяем multiple_choice с "Другое"
                    if (question.type === 'multiple_choice' && answer && Array.isArray(answer) && answer.includes(otherText)) {
                      const otherAnswer = previewAnswers[`${question.id}_other`];
                      return !otherAnswer || otherAnswer.trim() === '';
                    }
                    
                    return false;
                  });
                  
                  if (unansweredRequired.length === 0 && unansweredOtherOptions.length === 0) {
                    alert(t('surveyCreator.preview.success'));
                  } else if (unansweredRequired.length > 0) {
                    alert(t('surveyCreator.preview.requiredError'));
                  } else {
                    alert(t('surveyCreator.preview.otherError'));
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
                {t('surveyCreator.preview.submit')}
              </button>
            </div>
          </div>
        )}

        {/* Полноэкранный просмотр изображения */}
        <ImagePopup 
          imageUrl={fullscreenImage} 
          onClose={() => setFullscreenImage(null)} 
        />
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
