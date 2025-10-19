import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Target, Star } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';

interface Article {
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
}

const articles: Article[] = [
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
    tags: ['основы', 'вопросы', 'структура']
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
    tags: ['типы', 'выбор', 'эффективность']
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
    tags: ['отклик', 'мотивация', 'стимулы']
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
    tags: ['анализ', 'данные', 'интерпретация']
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
    tags: ['мобильные', 'адаптивность', 'UX']
  },
  {
    id: 'bias-prevention',
    title: 'Как избежать предвзятости в опросах',
    description: 'Распространенные ошибки, которые искажают результаты, и способы их предотвращения.',
    category: 'Методология',
    icon: '⚖️',
    readTime: '6 мин',
    difficulty: 'advanced',
    popularity: 78,
    color: '#F44336',
    tags: ['предвзятость', 'ошибки', 'качество']
  },
  {
    id: 'segmentation-strategies',
    title: 'Сегментация аудитории в опросах',
    description: 'Как правильно разделить аудиторию на группы для получения более точных и релевантных данных.',
    category: 'Стратегия',
    icon: '🎯',
    readTime: '5 мин',
    difficulty: 'intermediate',
    popularity: 80,
    color: '#795548',
    tags: ['сегментация', 'аудитория', 'таргетинг']
  },
  {
    id: 'survey-timing',
    title: 'Оптимальное время для проведения опросов',
    description: 'Когда лучше всего запускать опросы, чтобы получить максимальный отклик и качественные ответы.',
    category: 'Планирование',
    icon: '⏰',
    readTime: '3 мин',
    difficulty: 'beginner',
    popularity: 75,
    color: '#FF5722',
    tags: ['время', 'планирование', 'эффективность']
  }
];

const categories = [
  { id: 'all', name: 'Все', icon: '📚' },
  { id: 'Основы', name: 'Основы', icon: '📝' },
  { id: 'Вопросы', name: 'Вопросы', icon: '❓' },
  { id: 'Анализ', name: 'Анализ', icon: '📊' },
  { id: 'Маркетинг', name: 'Маркетинг', icon: '📈' },
  { id: 'Стратегия', name: 'Стратегия', icon: '🎯' },
  { id: 'Технологии', name: 'Технологии', icon: '📱' },
  { id: 'Методология', name: 'Методология', icon: '⚖️' },
  { id: 'Планирование', name: 'Планирование', icon: '⏰' }
];

export const KnowledgeBasePage = () => {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const categoriesRef = useRef<HTMLDivElement>(null);

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || 
      article.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCategorySelect = (categoryId: string) => {
    hapticFeedback?.light();
    setSelectedCategory(categoryId);
    
    // Прокручиваем к выбранной категории
    setTimeout(() => {
      if (categoriesRef.current) {
        const selectedButton = categoriesRef.current.querySelector(`[data-category="${categoryId}"]`) as HTMLElement;
        if (selectedButton) {
          selectedButton.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }
    }, 100);
  };

  const handleArticleClick = (article: Article) => {
    hapticFeedback?.light();
    navigate(`/knowledge/article/${article.id}`);
  };

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
      minHeight: '100vh',
      padding: '0'
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
          marginBottom: '16px'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📚 База знаний
          </h1>
        </div>

        {/* Поиск */}
        <div style={{
          position: 'relative',
          marginBottom: '16px'
        }}>
          <input
            type="text"
            placeholder="Поиск статей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'var(--tg-section-bg-color)',
              border: '1px solid var(--tg-section-separator-color)',
              borderRadius: '12px',
              color: 'var(--tg-text-color)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>

        {/* Категории */}
        <div 
          ref={categoriesRef}
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px'
          }}
        >
          {categories.map(category => (
            <button
              key={category.id}
              data-category={category.id}
              onClick={() => handleCategorySelect(category.id)}
              style={{
                background: selectedCategory === category.id 
                  ? 'var(--tg-button-color)' 
                  : 'var(--tg-section-bg-color)',
                color: selectedCategory === category.id 
                  ? 'var(--tg-button-text-color)' 
                  : 'var(--tg-text-color)',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <span>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Список статей */}
      <div style={{
        padding: '16px'
      }}>
        {filteredArticles.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--tg-hint-color)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              🔍
            </div>
            <p style={{
              fontSize: '16px',
              margin: '0',
              lineHeight: '1.4'
            }}>
              Статьи не найдены
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {filteredArticles.map(article => (
              <div
                key={article.id}
                onClick={() => handleArticleClick(article)}
                style={{
                  backgroundColor: 'var(--tg-section-bg-color)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                  border: '1px solid var(--tg-section-separator-color)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {/* Цветная полоса */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: article.color
                }} />

                {/* Заголовок и иконка */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    fontSize: '32px',
                    lineHeight: '1'
                  }}>
                    {article.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      margin: '0 0 4px 0',
                      color: 'var(--tg-text-color)'
                    }}>
                      {article.title}
                    </h3>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--tg-hint-color)',
                      marginBottom: '8px'
                    }}>
                      {article.category}
                    </div>
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

                {/* Описание */}
                <p style={{
                  fontSize: '14px',
                  color: 'var(--tg-text-color)',
                  lineHeight: '1.5',
                  margin: '0 0 16px 0'
                }}>
                  {article.description}
                </p>

                {/* Теги */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '16px'
                }}>
                  {article.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-hint-color)',
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Метаинформация */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  marginBottom: '16px'
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
                </div>

                {/* Кнопка чтения */}
                <div style={{
                  padding: '12px',
                  backgroundColor: article.color,
                  color: 'white',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <BookOpen size={16} />
                  Читать статью
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
