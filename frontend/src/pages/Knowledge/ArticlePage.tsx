import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Target, Star, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';

interface ArticleContent {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  readTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number;
  color: string;
  tags: string[];
  content: {
    introduction: string;
    sections: Array<{
      title: string;
      content: string;
      tips?: string[];
      warnings?: string[];
    }>;
    conclusion: string;
    keyPoints: string[];
  };
}

const articles: ArticleContent[] = [
  {
    id: 'survey-design-basics',
    title: 'Основы создания эффективных опросов',
    description: 'Узнайте базовые принципы составления вопросов, которые помогут получить качественные ответы от респондентов.',
    category: 'Основы',
    icon: '📝',
    readTime: '5 мин',
    difficulty: 'beginner',
    popularity: 95,
    color: '#4CAF50',
    tags: ['основы', 'вопросы', 'структура'],
    content: {
      introduction: 'Создание эффективного опроса — это искусство, которое требует понимания психологии респондентов и принципов качественного исследования. В этой статье мы разберем основные принципы, которые помогут вам создавать опросы, дающие ценные и достоверные результаты.',
      sections: [
        {
          title: '1. Четко определите цель опроса',
          content: 'Перед тем как приступить к созданию вопросов, четко сформулируйте цель вашего исследования. Что именно вы хотите узнать? Какие решения планируете принимать на основе результатов?',
          tips: [
            'Запишите цель в одном предложении',
            'Определите ключевые метрики, которые нужно измерить',
            'Подумайте, как результаты повлияют на ваши действия'
          ]
        },
        {
          title: '2. Структурируйте опрос логично',
          content: 'Начинайте с общих вопросов и постепенно переходите к более специфичным. Это поможет респондентам войти в тему и дать более осмысленные ответы.',
          tips: [
            'Начните с простых демографических вопросов',
            'Переходите к основным темам исследования',
            'Завершите открытыми вопросами для дополнительных комментариев'
          ]
        },
        {
          title: '3. Используйте понятный язык',
          content: 'Избегайте жаргона, сложных терминов и двусмысленных формулировок. Вопросы должны быть понятны всем участникам опроса.',
          warnings: [
            'Не используйте профессиональную терминологию без объяснений',
            'Избегайте двойных отрицаний',
            'Проверьте, что вопрос имеет только одно толкование'
          ]
        },
        {
          title: '4. Ограничьте количество вопросов',
          content: 'Короткие опросы имеют более высокий процент завершения. Сосредоточьтесь на самом важном и исключите второстепенные вопросы.',
          tips: [
            'Цель: максимум 10-15 вопросов',
            'Время заполнения: не более 5-7 минут',
            'Каждый вопрос должен быть обоснован'
          ]
        }
      ],
      conclusion: 'Помните: качественный опрос — это не количество вопросов, а их релевантность и способность получить нужную информацию. Следуйте этим принципам, и ваши исследования будут более эффективными.',
      keyPoints: [
        'Четко определите цель перед созданием вопросов',
        'Используйте простой и понятный язык',
        'Ограничьте количество вопросов',
        'Тестируйте опрос на небольшой группе перед запуском'
      ]
    }
  },
  {
    id: 'data-analysis-basics',
    title: 'Анализ результатов опроса',
    description: 'Основы интерпретации данных, выявления трендов и принятия решений на основе результатов.',
    category: 'Анализ',
    icon: '📊',
    readTime: '8 мин',
    difficulty: 'intermediate',
    popularity: 85,
    color: '#9C27B0',
    tags: ['анализ', 'данные', 'интерпретация'],
    content: {
      introduction: 'Сбор данных — это только начало. Настоящая ценность опроса раскрывается при правильном анализе результатов. В этой статье мы разберем основные принципы анализа данных опросов и методы извлечения ценных инсайтов.',
      sections: [
        {
          title: '1. Подготовка данных к анализу',
          content: 'Перед началом анализа необходимо очистить и структурировать собранные данные. Это включает проверку на выбросы, обработку пропущенных значений и стандартизацию ответов.',
          tips: [
            'Проверьте данные на логические несоответствия',
            'Обработайте пропущенные значения',
            'Стандартизируйте текстовые ответы'
          ]
        },
        {
          title: '2. Описательная статистика',
          content: 'Начните с базовых статистических показателей: средние значения, медианы, моды и стандартные отклонения. Это даст общее представление о распределении ответов.',
          tips: [
            'Рассчитайте основные метрики для каждого вопроса',
            'Создайте визуализации для лучшего понимания',
            'Обратите внимание на выбросы'
          ]
        },
        {
          title: '3. Анализ трендов и паттернов',
          content: 'Ищите закономерности в данных: какие ответы встречаются чаще, есть ли корреляции между вопросами, какие группы респондентов дают схожие ответы.',
          tips: [
            'Группируйте респондентов по демографическим признакам',
            'Ищите корреляции между вопросами',
            'Анализируйте временные тренды'
          ]
        },
        {
          title: '4. Качественный анализ открытых вопросов',
          content: 'Текстовые ответы требуют особого подхода. Используйте кодирование, тематический анализ и извлечение ключевых фраз для выявления основных тем.',
          tips: [
            'Кодируйте ответы по темам',
            'Ищите повторяющиеся паттерны',
            'Цитируйте наиболее показательные ответы'
          ]
        }
      ],
      conclusion: 'Правильный анализ данных превращает сырые ответы в ценные инсайты. Не ограничивайтесь простой статистикой — ищите глубинные закономерности и неожиданные открытия.',
      keyPoints: [
        'Начинайте с очистки и подготовки данных',
        'Используйте визуализацию для лучшего понимания',
        'Ищите тренды и корреляции',
        'Не забывайте о качественном анализе текстов'
      ]
    }
  },
  {
    id: 'mobile-survey-optimization',
    title: 'Оптимизация опросов для мобильных устройств',
    description: 'Как адаптировать опросы для смартфонов и планшетов, чтобы получить максимальный отклик.',
    category: 'Технологии',
    icon: '📱',
    readTime: '4 мин',
    difficulty: 'beginner',
    popularity: 82,
    color: '#607D8B',
    tags: ['мобильные', 'адаптивность', 'UX'],
    content: {
      introduction: 'Большинство пользователей сегодня заполняют опросы на мобильных устройствах. Оптимизация для мобильных платформ критически важна для получения качественных данных и высокого процента отклика.',
      sections: [
        {
          title: '1. Адаптивный дизайн',
          content: 'Убедитесь, что ваш опрос корректно отображается на всех размерах экранов. Элементы должны быть достаточно большими для касания, а текст — читаемым.',
          tips: [
            'Используйте крупные кнопки и элементы управления',
            'Обеспечьте достаточные отступы между элементами',
            'Тестируйте на реальных устройствах'
          ]
        },
        {
          title: '2. Оптимизация длины',
          content: 'Мобильные пользователи менее терпеливы. Сократите количество вопросов и сделайте опрос максимально коротким.',
          tips: [
            'Ограничьте опрос 5-7 вопросами',
            'Используйте прогресс-бар',
            'Показывайте время заполнения'
          ]
        },
        {
          title: '3. Упрощение ввода',
          content: 'Минимизируйте необходимость ввода текста. Используйте выпадающие списки, переключатели и предустановленные варианты.',
          tips: [
            'Предпочитайте множественный выбор открытым вопросам',
            'Используйте автодополнение',
            'Предлагайте готовые варианты ответов'
          ]
        }
      ],
      conclusion: 'Мобильная оптимизация — не роскошь, а необходимость. Инвестируйте в удобство мобильного интерфейса, и ваши опросы станут более успешными.',
      keyPoints: [
        'Тестируйте на реальных мобильных устройствах',
        'Сокращайте количество вопросов',
        'Упрощайте ввод данных',
        'Обеспечивайте быструю загрузку'
      ]
    }
  },
  {
    id: 'question-types-guide',
    title: 'Типы вопросов и когда их использовать',
    description: 'Подробное руководство по выбору правильного типа вопроса для получения нужной информации.',
    category: 'Вопросы',
    icon: '❓',
    readTime: '7 мин',
    difficulty: 'intermediate',
    popularity: 92,
    color: '#2196F3',
    tags: ['типы', 'выбор', 'эффективность'],
    content: {
      introduction: 'Выбор правильного типа вопроса — ключ к получению качественных данных. Каждый тип вопроса имеет свои преимущества и ограничения. В этой статье мы разберем основные типы вопросов и ситуации, в которых их лучше использовать.',
      sections: [
        {
          title: 'Закрытые вопросы',
          content: 'Закрытые вопросы предлагают респондентам выбрать из заранее определенных вариантов ответов. Они легко анализируются и дают количественные данные.',
          tips: [
            'Используйте для измерения мнений и предпочтений',
            'Включайте вариант "Другое" с возможностью ввода текста',
            'Обеспечьте полный охват возможных ответов'
          ]
        },
        {
          title: 'Открытые вопросы',
          content: 'Открытые вопросы позволяют респондентам давать развернутые ответы своими словами. Они дают богатую качественную информацию.',
          tips: [
            'Используйте для изучения мнений и опыта',
            'Ограничьте количество открытых вопросов',
            'Предоставьте достаточно места для развернутого ответа'
          ]
        },
        {
          title: 'Шкалы оценок',
          content: 'Шкалы позволяют измерить интенсивность мнений, удовлетворенность или важность различных аспектов.',
          tips: [
            'Используйте нечетное количество пунктов (5, 7)',
            'Четко определите полюса шкалы',
            'Будьте последовательны в направлении шкалы'
          ]
        },
        {
          title: 'Ранжирование',
          content: 'Вопросы на ранжирование помогают понять приоритеты респондентов, попросив их упорядочить варианты по важности.',
          tips: [
            'Ограничьте количество элементов для ранжирования (максимум 7)',
            'Объясните критерии ранжирования',
            'Предоставьте четкие инструкции'
          ]
        }
      ],
      conclusion: 'Правильный выбор типа вопроса напрямую влияет на качество данных. Комбинируйте разные типы вопросов для получения полной картины.',
      keyPoints: [
        'Закрытые вопросы — для количественного анализа',
        'Открытые вопросы — для качественных инсайтов',
        'Шкалы — для измерения интенсивности',
        'Ранжирование — для определения приоритетов'
      ]
    }
  },
  {
    id: 'response-rate-optimization',
    title: 'Как повысить отклик на опросы',
    description: 'Проверенные методы увеличения количества ответов и улучшения качества данных.',
    category: 'Маркетинг',
    icon: '📈',
    readTime: '6 мин',
    difficulty: 'intermediate',
    popularity: 88,
    color: '#FF9800',
    tags: ['отклик', 'мотивация', 'стимулы'],
    content: {
      introduction: 'Низкий процент отклика — одна из главных проблем при проведении опросов. В этой статье мы рассмотрим проверенные стратегии, которые помогут увеличить количество ответов и улучшить качество данных.',
      sections: [
        {
          title: '1. Создайте привлекательный заголовок',
          content: 'Заголовок опроса — первое, что видят потенциальные участники. Он должен быть интересным, понятным и обещать ценность.',
          tips: [
            'Используйте эмоциональные слова',
            'Укажите время заполнения',
            'Подчеркните важность участия'
          ]
        },
        {
          title: '2. Объясните важность исследования',
          content: 'Люди охотнее участвуют в опросах, когда понимают, зачем это нужно и как их ответы будут использованы.',
          tips: [
            'Расскажите о целях исследования',
            'Объясните, как результаты повлияют на улучшения',
            'Покажите, что мнение каждого важно'
          ]
        },
        {
          title: '3. Выберите правильное время',
          content: 'Время отправки опроса может значительно повлиять на процент отклика. Учитывайте рабочие часы и личные предпочтения вашей аудитории.',
          tips: [
            'Избегайте понедельников и пятниц',
            'Лучшее время: вторник-четверг, 10:00-15:00',
            'Учитывайте часовые пояса'
          ]
        },
        {
          title: '4. Предложите стимулы',
          content: 'Небольшие поощрения могут значительно увеличить мотивацию к участию в опросе.',
          tips: [
            'Предложите скидки или бонусы',
            'Организуйте розыгрыш призов',
            'Поделитесь результатами исследования'
          ]
        }
      ],
      conclusion: 'Повышение отклика — это комплексная задача, требующая внимания к деталям. Следуйте этим принципам, и ваши опросы будут более успешными.',
      keyPoints: [
        'Инвестируйте в привлекательный дизайн',
        'Четко объясняйте цели исследования',
        'Выбирайте оптимальное время отправки',
        'Рассмотрите возможность стимулов'
      ]
    }
  }
];

export const ArticlePage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { } = useTelegram();

  const article = articles.find(a => a.id === articleId);

  if (!article) {
    return (
      <div style={{
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <h2 style={{ margin: '0 0 8px 0' }}>Статья не найдена</h2>
          <p style={{ color: 'var(--tg-hint-color)', margin: '0 0 20px 0' }}>
            Запрашиваемая статья не существует
          </p>
          <button
            onClick={() => navigate('/knowledge')}
            style={{
              backgroundColor: 'var(--tg-button-color)',
              color: 'var(--tg-button-text-color)',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Вернуться к статьям
          </button>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Начинающий';
      case 'intermediate': return 'Средний';
      case 'advanced': return 'Продвинутый';
      default: return 'Неизвестно';
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      minHeight: '100vh'
    }}>
      {/* Заголовок */}
      <div style={{
        padding: '20px 16px 16px 16px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--tg-bg-color)',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <button
            onClick={() => navigate('/knowledge')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tg-text-color)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: '0 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>{article.icon}</span>
              {article.title}
            </h1>
            <div style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)'
            }}>
              {article.category}
            </div>
          </div>
        </div>

        {/* Метаинформация */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--tg-hint-color)'
          }}>
            <Clock size={14} />
            {article.readTime}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: getDifficultyColor(article.difficulty)
          }}>
            <Target size={14} />
            {getDifficultyText(article.difficulty)}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--tg-hint-color)'
          }}>
            <Star size={14} fill="currentColor" />
            {article.popularity}%
          </div>
        </div>
      </div>

      {/* Содержимое статьи */}
      <div style={{ padding: '20px 16px' }}>
        {/* Введение */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          borderLeft: `4px solid ${article.color}`
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: 'var(--tg-text-color)'
          }}>
            Введение
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            margin: 0,
            color: 'var(--tg-text-color)'
          }}>
            {article.content.introduction}
          </p>
        </div>

        {/* Основные разделы */}
        {article.content.sections.map((section, index) => (
          <div key={index} style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid var(--tg-section-separator-color)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: '0 0 12px 0',
              color: 'var(--tg-text-color)'
            }}>
              {section.title}
            </h3>
            <p style={{
              fontSize: '16px',
              lineHeight: '1.6',
              margin: '0 0 16px 0',
              color: 'var(--tg-text-color)'
            }}>
              {section.content}
            </p>

            {/* Советы */}
            {section.tips && section.tips.length > 0 && (
              <div style={{
                backgroundColor: 'var(--tg-bg-color)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  color: '#4CAF50'
                }}>
                  <Lightbulb size={16} />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Советы:</span>
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {section.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} style={{ marginBottom: '8px' }}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Предупреждения */}
            {section.warnings && section.warnings.length > 0 && (
              <div style={{
                backgroundColor: 'var(--tg-bg-color)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #F44336'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  color: '#F44336'
                }}>
                  <AlertCircle size={16} />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Важно:</span>
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {section.warnings.map((warning, warningIndex) => (
                    <li key={warningIndex} style={{ marginBottom: '8px' }}>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {/* Ключевые моменты */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: `2px solid ${article.color}`
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            color: 'var(--tg-text-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={20} color={article.color} />
            Ключевые моменты
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            {article.content.keyPoints.map((point, index) => (
              <li key={index} style={{ marginBottom: '12px' }}>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Заключение */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          borderLeft: `4px solid ${article.color}`
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: 'var(--tg-text-color)'
          }}>
            Заключение
          </h3>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            margin: 0,
            color: 'var(--tg-text-color)'
          }}>
            {article.content.conclusion}
          </p>
        </div>
      </div>
    </div>
  );
};
