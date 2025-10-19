import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, Users, CheckCircle, ArrowRight, Play } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { saveDraft, saveSettings, saveQuestions } from '../../utils/surveyDraft';

interface TemplateQuestion {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  hasOtherOption?: boolean;
}

interface SurveyTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  questions: number;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  popularity: number;
  color: string;
  fullDescription: string;
  useCases: string[];
  questionsData: TemplateQuestion[];
  settings: {
    title: string;
    description: string;
    allowAnonymous: boolean;
    showProgress: boolean;
    randomizeQuestions: boolean;
    oneResponsePerUser: boolean;
    hideCreator: boolean;
  };
}

const templates: SurveyTemplate[] = [
  {
    id: 'customer-satisfaction',
    title: 'Удовлетворенность клиентов',
    description: 'Оцените качество обслуживания, продукта или сервиса. Получите обратную связь от ваших клиентов.',
    category: 'Бизнес',
    icon: '💼',
    questions: 8,
    estimatedTime: '3-5 мин',
    difficulty: 'easy',
    popularity: 95,
    color: '#4CAF50',
    fullDescription: 'Этот шаблон поможет вам собрать детальную обратную связь от клиентов о качестве вашего продукта или сервиса. Включает вопросы о общем удовлетворении, конкретных аспектах обслуживания и рекомендациях по улучшению.',
    useCases: [
      'Оценка качества продукта после покупки',
      'Анализ эффективности клиентского сервиса',
      'Сбор отзывов о новом товаре или услуге',
      'Мониторинг удовлетворенности постоянных клиентов'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'rating',
        title: 'Как бы вы оценили общее качество нашего продукта/услуги?',
        description: 'Оцените по 5-балльной шкале',
        required: true
      },
      {
        id: 'q2',
        type: 'single_choice',
        title: 'Как часто вы пользуетесь нашими услугами?',
        required: true,
        options: ['Ежедневно', 'Несколько раз в неделю', 'Раз в неделю', 'Раз в месяц', 'Реже']
      },
      {
        id: 'q3',
        type: 'scale',
        title: 'Насколько вы довольны скоростью обслуживания?',
        description: 'Оцените от 1 до 10',
        required: true,
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Очень медленно', max: 'Очень быстро' }
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        title: 'Что вам больше всего нравится в нашем сервисе?',
        description: 'Выберите все подходящие варианты',
        required: false,
        options: ['Качество продукта', 'Скорость доставки', 'Цены', 'Сервис поддержки', 'Удобство заказа', 'Ассортимент'],
        hasOtherOption: true
      },
      {
        id: 'q5',
        type: 'textarea',
        title: 'Что бы вы хотели улучшить в нашем сервисе?',
        description: 'Ваши предложения помогут нам стать лучше',
        required: false
      },
      {
        id: 'q6',
        type: 'boolean',
        title: 'Рекомендовали бы вы нас своим друзьям?',
        required: true
      },
      {
        id: 'q7',
        type: 'single_choice',
        title: 'Как вы узнали о нашем сервисе?',
        required: false,
        options: ['Социальные сети', 'Поиск в интернете', 'Рекомендации друзей', 'Реклама', 'Другое']
      },
      {
        id: 'q8',
        type: 'textarea',
        title: 'Дополнительные комментарии или предложения',
        required: false
      }
    ],
    settings: {
      title: 'Оценка удовлетворенности клиентов',
      description: 'Помогите нам улучшить качество обслуживания, поделившись своим мнением',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  },
  {
    id: 'employee-feedback',
    title: 'Обратная связь сотрудников',
    description: 'Узнайте мнение команды о рабочем процессе, условиях труда и атмосфере в компании.',
    category: 'HR',
    icon: '👥',
    questions: 12,
    estimatedTime: '5-7 мин',
    difficulty: 'medium',
    popularity: 88,
    color: '#2196F3',
    fullDescription: 'Этот шаблон предназначен для сбора обратной связи от сотрудников о различных аспектах работы в компании. Помогает выявить проблемы и улучшить рабочую атмосферу.',
    useCases: [
      'Ежеквартальная оценка рабочей атмосферы',
      'Анализ удовлетворенности после изменений в компании',
      'Сбор мнений о новых политиках или процедурах',
      'Оценка эффективности руководства'
    ],
    questionsData: [
      {
        id: 'q1',
        type: 'rating',
        title: 'Как бы вы оценили общую атмосферу в команде?',
        required: true
      },
      {
        id: 'q2',
        type: 'scale',
        title: 'Насколько вы удовлетворены своей текущей ролью?',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Полностью неудовлетворен', max: 'Полностью удовлетворен' },
        required: true
      },
      {
        id: 'q3',
        type: 'single_choice',
        title: 'Как часто вы чувствуете поддержку от руководства?',
        required: true,
        options: ['Всегда', 'Часто', 'Иногда', 'Редко', 'Никогда']
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        title: 'Какие аспекты работы вас больше всего мотивируют?',
        required: false,
        options: ['Зарплата и бонусы', 'Карьерные возможности', 'Интересные задачи', 'Команда', 'Гибкий график', 'Обучение и развитие'],
        hasOtherOption: true
      },
      {
        id: 'q5',
        type: 'boolean',
        title: 'Чувствуете ли вы, что ваше мнение учитывается при принятии решений?',
        required: true
      },
      {
        id: 'q6',
        type: 'scale',
        title: 'Оцените баланс между работой и личной жизнью',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: { min: 'Полностью нарушен', max: 'Идеальный баланс' },
        required: true
      },
      {
        id: 'q7',
        type: 'single_choice',
        title: 'Как часто вы получаете обратную связь о своей работе?',
        required: true,
        options: ['Еженедельно', 'Ежемесячно', 'Ежеквартально', 'Раз в полгода', 'Редко или никогда']
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        title: 'Что бы вы хотели улучшить в рабочем процессе?',
        required: false,
        options: ['Коммуникацию', 'Инструменты и технологии', 'Процессы', 'Обучение', 'Признание достижений'],
        hasOtherOption: true
      },
      {
        id: 'q9',
        type: 'textarea',
        title: 'Какие у вас есть предложения по улучшению работы команды?',
        required: false
      },
      {
        id: 'q10',
        type: 'boolean',
        title: 'Рекомендовали бы вы нашу компанию как место работы?',
        required: true
      },
      {
        id: 'q11',
        type: 'single_choice',
        title: 'Как вы оцениваете возможности для профессионального роста?',
        required: true,
        options: ['Отличные', 'Хорошие', 'Удовлетворительные', 'Плохие', 'Очень плохие']
      },
      {
        id: 'q12',
        type: 'textarea',
        title: 'Дополнительные комментарии или предложения',
        required: false
      }
    ],
    settings: {
      title: 'Обратная связь сотрудников',
      description: 'Ваше мнение важно для нас. Помогите улучшить рабочую атмосферу в компании',
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      hideCreator: false
    }
  }
  // Добавим остальные шаблоны позже
];

const TemplateDetailPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/templates'
  });

  const template = templates.find(t => t.id === templateId);

  if (!template) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
          Шаблон не найден
        </h1>
        <button
          onClick={() => navigate('/templates')}
          style={{
            backgroundColor: 'var(--tg-button-color)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Вернуться к шаблонам
        </button>
      </div>
    );
  }

  const handleUseTemplate = () => {
    hapticFeedback?.success();
    
    // Сохраняем данные шаблона в localStorage
    saveDraft({
      mode: 'manual',
      settings: {
        title: template.settings.title,
        description: template.settings.description,
        language: 'ru',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        maxParticipants: '',
        allowAnonymous: template.settings.allowAnonymous,
        showProgress: template.settings.showProgress,
        randomizeQuestions: template.settings.randomizeQuestions,
        oneResponsePerUser: template.settings.oneResponsePerUser,
        collectTelegramData: false,
        hideCreator: template.settings.hideCreator,
        creationType: 'manual',
        motivationEnabled: false,
        motivationType: 'discount',
        motivationDetails: '',
        motivationConditions: ''
      },
      questions: template.questionsData,
      updatedAt: Date.now()
    });

    // Переходим на страницу создания опроса
    navigate('/survey/create');
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легкий';
      case 'medium': return 'Средний';
      case 'hard': return 'Сложный';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return 'var(--tg-hint-color)';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '100px'
    }}>
      {/* Шапка */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        backgroundColor: 'var(--tg-bg-color)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: template.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {template.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: '0 0 4px 0',
              color: 'var(--tg-text-color)'
            }}>
              {template.title}
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)',
              margin: 0
            }}>
              {template.category}
            </p>
          </div>
        </div>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: 0,
          color: 'var(--tg-text-color)'
        }}>
          {template.description}
        </p>
      </div>

      {/* Основная информация */}
      <div style={{ padding: '20px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--tg-text-color)',
              marginBottom: '4px'
            }}>
              {template.questions}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--tg-hint-color)'
            }}>
              вопросов
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--tg-text-color)',
              marginBottom: '4px'
            }}>
              {template.estimatedTime}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--tg-hint-color)'
            }}>
              время
            </div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{
            flex: 1,
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: getDifficultyColor(template.difficulty)
            }} />
            <span style={{
              fontSize: '14px',
              color: 'var(--tg-text-color)'
            }}>
              {getDifficultyText(template.difficulty)}
            </span>
          </div>

          <div style={{
            flex: 1,
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Star size={16} color="var(--tg-hint-color)" />
            <span style={{
              fontSize: '14px',
              color: 'var(--tg-text-color)'
            }}>
              {template.popularity}% популярность
            </span>
          </div>
        </div>

        {/* Подробное описание */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: 'var(--tg-text-color)'
          }}>
            О шаблоне
          </h3>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.5',
            color: 'var(--tg-text-color)',
            margin: 0
          }}>
            {template.fullDescription}
          </p>
        </div>

        {/* Случаи использования */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: 'var(--tg-text-color)'
          }}>
            Когда использовать
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {template.useCases.map((useCase, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px 0'
              }}>
                <CheckCircle size={16} color="var(--tg-button-color)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{
                  fontSize: '14px',
                  color: 'var(--tg-text-color)',
                  lineHeight: '1.4'
                }}>
                  {useCase}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Предварительный просмотр вопросов */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: 'var(--tg-text-color)'
          }}>
            Вопросы в шаблоне
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {template.questionsData.slice(0, 3).map((question, index) => (
              <div key={question.id} style={{
                backgroundColor: 'var(--tg-section-bg-color)',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid var(--tg-section-separator-color)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: 'var(--tg-hint-color)'
                  }}>
                    {index + 1}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--tg-hint-color)',
                    textTransform: 'uppercase'
                  }}>
                    {question.type === 'rating' ? 'Оценка' :
                     question.type === 'single_choice' ? 'Выбор' :
                     question.type === 'multiple_choice' ? 'Множественный выбор' :
                     question.type === 'scale' ? 'Шкала' :
                     question.type === 'textarea' ? 'Текст' :
                     question.type === 'boolean' ? 'Да/Нет' : question.type}
                  </span>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--tg-text-color)',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {question.title}
                </p>
              </div>
            ))}
            {template.questionsData.length > 3 && (
              <div style={{
                textAlign: 'center',
                padding: '8px',
                color: 'var(--tg-hint-color)',
                fontSize: '14px'
              }}>
                и еще {template.questionsData.length - 3} вопросов...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Кнопка использования шаблона */}
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
          onClick={handleUseTemplate}
          style={{
            width: '100%',
            backgroundColor: 'var(--tg-button-color)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Play size={20} />
          Использовать шаблон
        </button>
      </div>
    </div>
  );
};

export default TemplateDetailPage;
