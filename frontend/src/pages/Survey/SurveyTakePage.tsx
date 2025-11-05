import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { surveyApi } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';
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
  validation?: {
    conditionalLogic?: ConditionalLogic;
  };
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
  
  // Состояния для scale и rating вопросов
  const [scaleValues, setScaleValues] = useState<Record<string, number>>({});
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({});
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  // Состояние для отслеживания загрузки изображений
  const [imageLoading, setImageLoading] = useState<{ [questionId: string]: boolean }>({});
  // Состояние для полноэкранного просмотра изображения
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  // Состояние для отслеживания открытия клавиатуры
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

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
        
        // Парсим validation если это строка JSON и конвертируем URL изображений
        const processedQuestions = response.questions.map((q: any) => {
          let validation = q.validation;
          
          // Если validation - строка, пытаемся распарсить
          if (typeof validation === 'string') {
            try {
              validation = JSON.parse(validation);
            } catch (e) {
              console.warn('Failed to parse validation as JSON:', e);
            }
          }
          
          // Конвертируем URL изображения если он есть (используем прокси)
          let imageUrl = q.imageUrl || q.image_url;
          if (imageUrl) {
            imageUrl = convertYandexDiskUrl(imageUrl);
          }
          
          return {
            ...q,
            validation,
            imageUrl
          };
        });
        
        const surveyWithProcessedQuestions = {
          ...response,
          questions: processedQuestions
        };
        
        setSurvey(surveyWithProcessedQuestions);
        
        // Перемешиваем вопросы один раз при загрузке
        if (response.settings?.randomizeQuestions) {
          const shuffled = [...processedQuestions].sort(() => Math.random() - 0.5);
          setShuffledQuestions(shuffled);
        } else {
          const sorted = [...processedQuestions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
          setShuffledQuestions(sorted);
        }
        
        // Отладка: проверяем структуру данных
        console.log('Survey questions loaded:', processedQuestions.map((q: Question) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          validation: q.validation,
          conditionalLogic: q.validation?.conditionalLogic,
          hasConditional: !!q.validation?.conditionalLogic
        })));
        
        // Скроллим к верху страницы
        window.scrollTo(0, 0);
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
      const newAnswers = {
        ...prev,
        [questionId]: value
      };
      
      // После изменения ответа проверяем видимость всех вопросов и очищаем ответы скрытых
      if (survey && shuffledQuestions.length > 0) {
        shuffledQuestions.forEach(question => {
          const isVisible = shouldShowQuestion(question, newAnswers);
          
          // Если вопрос скрыт и у него есть ответ - очищаем его
          if (!isVisible && question.id in newAnswers && question.id !== questionId) {
            delete newAnswers[question.id];
            // Также очищаем поле "Другое" если оно есть
            if (`${question.id}_other` in newAnswers) {
              delete newAnswers[`${question.id}_other`];
            }
          }
        });
      }
      
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

  // Функция проверки одного условия
  const checkCondition = (
    condition: Condition,
    answer: any
  ): boolean => {
    // Нормализуем значения для сравнения (приводим к строкам для текстовых сравнений)
    const normalizedAnswer = answer !== null && answer !== undefined ? String(answer).trim() : answer;
    const normalizedValue = condition.value !== null && condition.value !== undefined ? String(condition.value).trim() : condition.value;
    
    switch (condition.operator) {
      case 'equals':
        // Для числовых значений сравниваем как числа
        if (typeof answer === 'number' || typeof condition.value === 'number' || 
            (!isNaN(Number(answer)) && !isNaN(Number(condition.value)) && answer !== '' && condition.value !== '')) {
          return Number(answer) === Number(condition.value);
        }
        // Для строковых значений сравниваем с учетом нормализации
        return normalizedAnswer === normalizedValue;
      case 'not_equals':
        // Для числовых значений сравниваем как числа
        if (typeof answer === 'number' || typeof condition.value === 'number' || 
            (!isNaN(Number(answer)) && !isNaN(Number(condition.value)) && answer !== '' && condition.value !== '')) {
          return Number(answer) !== Number(condition.value);
        }
        // Для строковых значений сравниваем с учетом нормализации
        return normalizedAnswer !== normalizedValue;
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
  const shouldShowQuestion = (question: Question, currentAnswers: Record<string, any>): boolean => {
    // Проверяем, есть ли условная логика в разных возможных местах
    // Важно: validation может быть объектом напрямую или содержать conditionalLogic
    let validationObj = question.validation;
    
    // Если validation - строка, пытаемся распарсить
    if (typeof validationObj === 'string') {
      try {
        validationObj = JSON.parse(validationObj);
      } catch (e) {
        // Не критично, продолжаем
      }
    }
    
    const conditionalLogic = validationObj?.conditionalLogic || null;
    
    if (!conditionalLogic || !conditionalLogic.enabled) {
      return true; // Вопрос без условий всегда показывается
    }

    const logic = conditionalLogic;
    
    // Проверяем, что все условия полностью заполнены
    // Если хотя бы одно условие не имеет значения, всегда показываем вопрос
    const hasIncompleteConditions = logic.conditions.some((condition: Condition) => {
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
    const parentQuestion = shuffledQuestions.find((q: Question) => q.id === logic.dependsOn);
    
    // Если родительский вопрос имеет тип 'text' или 'textarea', всегда показываем вопрос
    if (parentQuestion && (parentQuestion.type === 'text' || parentQuestion.type === 'textarea')) {
      return true;
    }
    
    const dependsOnAnswer = currentAnswers[logic.dependsOn];

    if (dependsOnAnswer === undefined || dependsOnAnswer === null || dependsOnAnswer === '') {
      return false; // Если зависимый вопрос не отвечен, скрываем
    }

    // Проверяем условия
    const conditionResults = logic.conditions.map((condition: Condition) => {
      return checkCondition(condition, dependsOnAnswer);
    });

    // Применяем логический оператор
    let conditionMet = false;
    if (logic.logicOperator === 'AND') {
      conditionMet = conditionResults.every((result: boolean) => result);
    } else {
      conditionMet = conditionResults.some((result: boolean) => result);
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
    const competingQuestions = shuffledQuestions.filter((q: Question) => {
      const qConditionalLogic = q.validation?.conditionalLogic || 
                                (q.validation && typeof q.validation === 'object' && 'conditionalLogic' in q.validation ? (q.validation as any).conditionalLogic : null);
      return q.id !== question.id && 
             qConditionalLogic?.enabled && 
             qConditionalLogic.dependsOn === logic.dependsOn;
    });

    if (competingQuestions.length === 0) {
      return true; // Нет конкурентов - показываем
    }

    // Вычисляем "строгость" условий для приоритета
    const getConditionPriority = (q: Question): number => {
      const qConditionalLogic = q.validation?.conditionalLogic || 
                                (q.validation && typeof q.validation === 'object' && 'conditionalLogic' in q.validation ? (q.validation as any).conditionalLogic : null);
      if (!qConditionalLogic || qConditionalLogic.conditions.length === 0) return 0;
      const condition = qConditionalLogic.conditions[0];
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
      ...competingQuestions.map((q: Question) => getConditionPriority(q))
    );

    // Показываем только если у этого вопроса наивысший приоритет
    return currentPriority === maxPriority && currentPriority !== -Infinity;
  };

  
  const validateAllQuestions = (): boolean => {
    if (!survey) return false;
    
    const errors: Record<string, string> = {};
    
    shuffledQuestions.forEach(question => {
      // Проверяем только видимые вопросы
      const isVisible = shouldShowQuestion(question, answers);
      if (!isVisible) {
        return; // Пропускаем скрытые вопросы
      }
      
      const answer = answers[question.id];
      const otherAnswer = answers[`${question.id}_other`];
      
      // Проверяем обязательные вопросы
      if (question.isRequired) {
        let isEmpty = false;
        if (!answer) {
          isEmpty = true;
        } else if (typeof answer === 'string' && answer.trim() === '') {
          isEmpty = true;
        } else if (Array.isArray(answer) && answer.length === 0) {
          isEmpty = true;
        } else if (answer === 'Другое' && !otherAnswer?.trim()) {
          isEmpty = true;
        } else if (Array.isArray(answer) && answer.includes('Другое') && !otherAnswer?.trim()) {
          isEmpty = true;
        }

        if (isEmpty) {
          errors[question.id] = 'Это обязательный вопрос';
        }
      }
      
      // Проверяем валидацию "Другое" для всех вопросов (обязательных и необязательных)
      if (answer === 'Другое' && !otherAnswer?.trim()) {
        errors[question.id] = 'Пожалуйста, введите ваш ответ в поле "Другое"';
      } else if (Array.isArray(answer) && answer.includes('Другое') && !otherAnswer?.trim()) {
        errors[question.id] = 'Пожалуйста, введите ваш ответ в поле "Другое"';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!survey || !surveyId) return;

    if (!validateAllQuestions()) {
      hapticFeedback?.error();
      const firstErrorId = Object.keys(validationErrors)[0];
      if (firstErrorId) {
        document.getElementById(`question-${firstErrorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setSubmitting(true);
    hapticFeedback?.medium();
    
    try {
      // Отправляем только ответы на видимые вопросы
      const visibleQuestions = shuffledQuestions.filter(q => shouldShowQuestion(q, answers));
      const formattedAnswers = visibleQuestions.map(q => {
        let answerValue = answers[q.id] || null;
        
        if (answerValue === 'Другое') {
          answerValue = answers[`${q.id}_other`] || null;
        }
        
        if (Array.isArray(answerValue) && answerValue.includes('Другое')) {
          const otherText = answers[`${q.id}_other`] || '';
          answerValue = answerValue
            .map((a: string) => (a === 'Другое' ? otherText : a))
            .filter((a: string) => a && String(a).trim() !== '');
        }

        return {
          question_id: q.id,
          answer_value: answerValue
        };
      });

      // Всегда передаем user_id для проверки oneResponsePerUser
      // Анонимность контролируется флагом is_anonymous в бэкенде
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

    const baseStyle: React.CSSProperties = {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '8px',
      border: error ? '1px solid var(--tg-destructive-text-color)' : 'none',
      backgroundColor: 'var(--tg-section-bg-color)',
      color: 'var(--tg-text-color)',
      fontSize: '16px',
      outline: 'none'
    };

    // Text
    if (question.type === 'text') {
      return (
        <input
          type="text"
          placeholder="Ваш ответ..."
          value={answer || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          onFocus={() => setIsKeyboardOpen(true)}
          onBlur={() => setIsKeyboardOpen(false)}
          enterKeyHint="done"
          style={baseStyle}
        />
      );
    }

    // Textarea
    if (question.type === 'textarea') {
      return (
        <textarea
          placeholder="Ваш ответ..."
          rows={4}
          value={answer || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          onFocus={() => setIsKeyboardOpen(true)}
          onBlur={() => setIsKeyboardOpen(false)}
          enterKeyHint="done"
          style={{
            ...baseStyle,
            resize: 'vertical' as const
          }}
        />
      );
    }

    // Date
    if (question.type === 'date') {
      return (
        <input
          type="date"
          value={answer || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          onFocus={() => setIsKeyboardOpen(true)}
          onBlur={() => setIsKeyboardOpen(false)}
          enterKeyHint="done"
          style={baseStyle}
        />
      );
    }

    // Number
    if (question.type === 'number') {
      return (
        <input
          type="number"
          placeholder="Введите число..."
          value={answer || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          onFocus={() => setIsKeyboardOpen(true)}
          onBlur={() => setIsKeyboardOpen(false)}
          enterKeyHint="done"
          inputMode="numeric"
          style={baseStyle}
        />
      );
    }

    // Single Choice
    if (question.type === 'single_choice') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {question.options?.map((option: any, index: number) => {
            const optionText = typeof option === 'string' ? option : option.text;
            const isSelected = answer === optionText;
            
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
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: isSelected ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    checked={isSelected}
                    onChange={() => {
                      console.log(`Setting answer for ${question.id} to '${optionText}'`);
                      handleAnswerChange(question.id, optionText);
                    }}
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
                    opacity: isSelected ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                  }} />
                </div>
                <span style={{ 
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  flex: 1
                }}>
                  {optionText}
                </span>
              </label>
            );
          })}
          
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
                  border: `2px solid ${answer === 'Другое' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: answer === 'Другое' ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    checked={answer === 'Другое'}
                    onChange={() => handleAnswerChange(question.id, 'Другое')}
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
                    opacity: answer === 'Другое' ? 1 : 0,
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
              
              {answer === 'Другое' && (
                <div style={{ marginLeft: '32px' }}>
                  <input
                    type="text"
                    placeholder="Другое"
                    value={answers[`${question.id}_other`] || ''}
                    onChange={(e) => handleAnswerChange(`${question.id}_other`, e.target.value)}
                    onFocus={() => setIsKeyboardOpen(true)}
                    onBlur={() => setIsKeyboardOpen(false)}
                    enterKeyHint="done"
                    style={{
                      ...baseStyle,
                      border: !answers[`${question.id}_other`] ? '1px solid #ff4444' : '1px solid #b0b0b0',
                      backgroundColor: 'var(--tg-bg-color)'
                    }}
                  />
                  {!answers[`${question.id}_other`] && (
                    <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '4px' }}>
                      Пожалуйста, введите ваш ответ
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Кнопка "Отменить выбор" */}
          {answer && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleAnswerChange(question.id, null)}
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
    }

    // Multiple Choice
    if (question.type === 'multiple_choice') {
      const currentAnswers = Array.isArray(answer) ? answer : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {question.options?.map((option: any, index: number) => {
            const optionText = typeof option === 'string' ? option : option.text;
            const isChecked = currentAnswers.includes(optionText);
            
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
                    checked={isChecked}
                    onChange={(e) => {
                      const newAnswers = e.target.checked
                        ? [...currentAnswers, optionText]
                        : currentAnswers.filter((a: string) => a !== optionText);
                      handleAnswerChange(question.id, newAnswers);
                    }}
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
                  {optionText}
                </span>
              </label>
            );
          })}
          
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
                  border: `2px solid ${currentAnswers.includes('Другое') ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                  backgroundColor: currentAnswers.includes('Другое') ? 'var(--tg-button-color)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={currentAnswers.includes('Другое')}
                    onChange={(e) => {
                      const newAnswers = e.target.checked
                        ? [...currentAnswers, 'Другое']
                        : currentAnswers.filter((a: string) => a !== 'Другое');
                      
                      if (!e.target.checked) {
                        handleAnswerChange(`${question.id}_other`, '');
                      }
                      
                      handleAnswerChange(question.id, newAnswers);
                    }}
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
                    transform: 'translate(-50%, -90%)',
                    width: '12px',
                    height: '12px',
                    opacity: currentAnswers.includes('Другое') ? 1 : 0,
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
              
              {currentAnswers.includes('Другое') && (
                <div style={{ marginLeft: '32px' }}>
                  <input
                    type="text"
                    placeholder="Другое"
                    value={answers[`${question.id}_other`] || ''}
                    onChange={(e) => handleAnswerChange(`${question.id}_other`, e.target.value)}
                    onFocus={() => setIsKeyboardOpen(true)}
                    onBlur={() => setIsKeyboardOpen(false)}
                    enterKeyHint="done"
                    style={{
                      ...baseStyle,
                      border: !answers[`${question.id}_other`] ? '1px solid #ff4444' : '1px solid #b0b0b0',
                      backgroundColor: 'var(--tg-bg-color)'
                    }}
                  />
                  {!answers[`${question.id}_other`] && (
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
    }
    
    // Scale
    if (question.type === 'scale') {
      const scaleMin = question.scaleMin || 1;
      const scaleMax = question.scaleMax || 10;
      const scaleValue = scaleValues[question.id] ?? answer ?? Math.floor((scaleMin + scaleMax) / 2);
      
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
              color: scaleValue === scaleMin ? 'var(--tg-button-color)' : 'var(--tg-text-color)',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {scaleMin}
            </span>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="range"
                min={scaleMin}
                max={scaleMax}
                value={scaleValue}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setScaleValues(prev => ({ ...prev, [question.id]: value }));
                  handleAnswerChange(question.id, value);
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  background: '#666',
                  borderRadius: '4px',
                  outline: 'none',
                  appearance: 'none' as const
                }}
              />
            </div>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: scaleValue === scaleMax ? 'var(--tg-button-color)' : 'var(--tg-text-color)',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {scaleMax}
            </span>
          </div>
          
          {scaleValue !== scaleMin && scaleValue !== scaleMax && (
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
          
          {(question.scaleMinLabel || question.scaleMaxLabel) && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--tg-hint-color)'
            }}>
              <span>{question.scaleMinLabel || ''}</span>
              <span>{question.scaleMaxLabel || ''}</span>
            </div>
          )}
        </div>
      );
    }

    // Rating
    if (question.type === 'rating') {
      const maxRating = question.ratingMax || 5;
      const rating = ratingValues[question.id] ?? answer ?? 0;
      
      return (
        <div style={{ 
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--tg-section-separator-color)'
        }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {Array.from({ length: maxRating }, (_, i) => {
              const star = i + 1;
              return (
                <button
                  key={star}
                  onClick={() => {
                    console.log(`Setting rating for ${question.id} to ${star}`);
                    setRatingValues(prev => ({ ...prev, [question.id]: star }));
                    handleAnswerChange(question.id, star);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'transform 0.2s ease'
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
              );
            })}
          </div>
        </div>
      );
    }

    // Yes/No (на сервере это yes_no)
    if (question.type === 'yes_no') {
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
                border: `2px solid ${answer === 'yes' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: answer === 'yes' ? 'var(--tg-button-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={answer === 'yes'}
                  onChange={() => {
                    console.log(`Setting answer for ${question.id} to 'yes'`);
                    handleAnswerChange(question.id, 'yes');
                  }}
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
                  opacity: answer === 'yes' ? 1 : 0,
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
                border: `2px solid ${answer === 'no' ? 'var(--tg-button-color)' : 'var(--tg-hint-color)'}`,
                backgroundColor: answer === 'no' ? 'var(--tg-button-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={answer === 'no'}
                  onChange={() => {
                    console.log(`Setting answer for ${question.id} to 'no'`);
                    handleAnswerChange(question.id, 'no');
                  }}
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
                  opacity: answer === 'no' ? 1 : 0,
                  transition: 'opacity 0.2s ease'
                }} />
              </div>
              <span style={{ color: 'var(--tg-text-color)' }}>Нет</span>
            </label>
          </div>
          
          {/* Кнопка "Отменить выбор" */}
          {answer && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleAnswerChange(question.id, null)}
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
    }

    return <div>Неподдерживаемый тип вопроса</div>;
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
          <p style={{ color: 'var(--tg-hint-color)', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
            {error}
          </p>
          
          {/* Дополнительный текст */}
          <p style={{
            fontSize: '12px',
            color: 'var(--tg-hint-color)',
            marginTop: '24px',
            lineHeight: '1.5'
          }}>
            Хотите создать свой опрос?
            <br />
            <button
              onClick={() => navigate('/')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--tg-link-color)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'none',
                padding: '0',
                margin: '0'
              }}
            >
              Откройте главную страницу AI Surveys
            </button>
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
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' }}>{survey.title}</h1>
        {survey.description && <p style={{ fontSize: '14px', color: 'var(--tg-hint-color)', margin: 0, whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{survey.description}</p>}
      </div>

      <div style={{ padding: '0 20px 120px 20px' }}>
        <AnimatePresence>
          {shuffledQuestions.map((question, index) => {
            const isVisible = shouldShowQuestion(question, answers);
            
            // Скрываем условные вопросы, которые не должны показываться
            if (!isVisible) {
              return null;
            }
            
            // Правильная нумерация видимых вопросов
            const visibleIndex = shuffledQuestions.slice(0, index + 1).filter((q, i) => {
              if (i === index) return true; // Текущий вопрос
              return shouldShowQuestion(q, answers);
            }).length - 1;
            
            return (
              <motion.div
                key={question.id}
                id={`question-${question.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ 
                  paddingTop: '24px', 
                  borderBottom: index < shuffledQuestions.length - 1 ? '1px solid var(--tg-section-separator-color)' : 'none', 
                  paddingBottom: '24px'
                }}
              >
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                    {visibleIndex + 1}. {question.text}
                    {question.isRequired && <span style={{ color: 'var(--tg-destructive-text-color)', marginLeft: '4px' }}>*</span>}
                </h2>
                {question.description && <p style={{ fontSize: '14px', color: 'var(--tg-hint-color)', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{question.description}</p>}
                {validationErrors[question.id] && <p style={{ fontSize: '13px', color: 'var(--tg-destructive-text-color)', margin: '8px 0 0 0' }}>{validationErrors[question.id]}</p>}
            </div>

            {question.imageUrl && (
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
                onClick={() => setFullscreenImage(question.imageUrl || null)}
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
                    src={question.imageUrl} 
                    alt="Question illustration"
                    onLoadStart={() => {
                      setImageLoading(prev => ({ ...prev, [question.id]: true }));
                    }}
                    onLoad={() => {
                      console.log('Изображение успешно загружено:', question.imageUrl);
                      setImageLoading(prev => ({ ...prev, [question.id]: false }));
                    }}
                    onError={(e) => {
                      console.error('Ошибка загрузки изображения:', question.imageUrl);
                      const imgElement = e.currentTarget;
                      imgElement.style.display = 'none';
                      setImageLoading(prev => ({ ...prev, [question.id]: false }));
                      // Показываем сообщение об ошибке
                      const errorDiv = document.createElement('div');
                      errorDiv.textContent = 'Не удалось загрузить изображение';
                      errorDiv.style.cssText = 'padding: 20px; text-align: center; color: var(--tg-hint-color); background: var(--tg-section-bg-color); border-radius: 12px; border: 1px solid var(--tg-section-separator-color);';
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
              </div>
            )}

            <div>
              {renderQuestion(question)}
            </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!isKeyboardOpen && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px',
          backgroundColor: 'var(--tg-bg-color)', borderTop: '1px solid var(--tg-section-separator-color)',
          transition: 'transform 0.3s ease, opacity 0.3s ease'
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
      )}

      {/* Полноэкранный просмотр изображения */}
      <ImagePopup 
        imageUrl={fullscreenImage} 
        onClose={() => setFullscreenImage(null)} 
      />
    </div>
  );
}
