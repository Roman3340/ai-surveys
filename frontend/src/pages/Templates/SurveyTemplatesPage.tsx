import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Clock, TrendingUp, MessageCircle } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import CenteredPageContainer from '../../components/layout/CenteredPageContainer';

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
    color: '#4CAF50'
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
    color: '#2196F3'
  },
  {
    id: 'market-research',
    title: 'Маркетинговое исследование',
    description: 'Изучите предпочтения потребителей, узнайте о новых трендах и потребностях рынка.',
    category: 'Маркетинг',
    icon: '📊',
    questions: 15,
    estimatedTime: '8-10 мин',
    difficulty: 'hard',
    popularity: 92,
    color: '#FF9800'
  },
  {
    id: 'event-feedback',
    title: 'Оценка мероприятия',
    description: 'Соберите отзывы участников о проведенном событии, организации и содержании.',
    category: 'События',
    icon: '🎉',
    questions: 6,
    estimatedTime: '2-3 мин',
    difficulty: 'easy',
    popularity: 85,
    color: '#E91E63'
  },
  {
    id: 'product-feedback',
    title: 'Отзыв о продукте',
    description: 'Получите детальную оценку вашего товара или услуги от покупателей.',
    category: 'Продукт',
    icon: '🛍️',
    questions: 10,
    estimatedTime: '4-6 мин',
    difficulty: 'medium',
    popularity: 90,
    color: '#9C27B0'
  },
  {
    id: 'education-assessment',
    title: 'Оценка обучения',
    description: 'Проанализируйте эффективность образовательного процесса и качество преподавания.',
    category: 'Образование',
    icon: '🎓',
    questions: 9,
    estimatedTime: '3-4 мин',
    difficulty: 'easy',
    popularity: 82,
    color: '#607D8B'
  },
  {
    id: 'health-survey',
    title: 'Медицинский опрос',
    description: 'Соберите информацию о здоровье, симптомах или качестве медицинского обслуживания.',
    category: 'Здоровье',
    icon: '🏥',
    questions: 7,
    estimatedTime: '3-5 мин',
    difficulty: 'medium',
    popularity: 78,
    color: '#F44336'
  },
  {
    id: 'social-research',
    title: 'Социальное исследование',
    description: 'Изучите общественное мнение по важным социальным вопросам и проблемам.',
    category: 'Социология',
    icon: '🌍',
    questions: 14,
    estimatedTime: '6-8 мин',
    difficulty: 'hard',
    popularity: 75,
    color: '#795548'
  }
];

const getCategories = (t: any) => [
  { id: 'all', name: t('templates.categories.all'), icon: '📋' },
  { id: 'Бизнес', name: t('templates.categories.business'), icon: '💼' },
  { id: 'HR', name: t('templates.categories.hr'), icon: '👥' },
  { id: 'Маркетинг', name: t('templates.categories.marketing'), icon: '📊' },
  { id: 'События', name: t('templates.categories.events'), icon: '🎉' },
  { id: 'Продукт', name: t('templates.categories.product'), icon: '🛍️' },
  { id: 'Образование', name: t('templates.categories.education'), icon: '🎓' },
  { id: 'Здоровье', name: t('templates.categories.health'), icon: '🏥' },
  { id: 'Социология', name: t('templates.categories.sociology'), icon: '🌍' }
];

export const SurveyTemplatesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const categoriesRef = useRef<HTMLDivElement>(null);
  
  const categories = getCategories(t);

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/'
  });

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || 
      template.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleTemplateSelect = (template: SurveyTemplate) => {
    hapticFeedback?.light();
    navigate(`/templates/${template.id}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return t('templates.difficulty.easy');
      case 'medium': return t('templates.difficulty.medium');
      case 'hard': return t('templates.difficulty.hard');
      default: return t('templates.difficulty.unknown');
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      minHeight: '100vh',
      padding: '0'
    }}>
      <CenteredPageContainer>
        {/* Заголовок+поиск+категории */}
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
              📋 {t('templates.title')}
            </h1>
          </div>

          {/* Поиск */}
          <div style={{
            position: 'relative',
            marginBottom: '16px'
          }}>
            <input
              type="text"
              placeholder={t('templates.searchPlaceholder')}
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
      </CenteredPageContainer>
      <CenteredPageContainer>
        {/* Список шаблонов */}
        <div style={{ padding: '16px' }}>
          {filteredTemplates.length === 0 ? (
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
                {t('templates.notFound')}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
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
                    backgroundColor: template.color
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
                      {template.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 4px 0',
                        color: 'var(--tg-text-color)'
                      }}>
                        {template.title}
                      </h3>
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--tg-hint-color)',
                        marginBottom: '8px'
                      }}>
                        {template.category}
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
                      {template.popularity}%
                    </div>
                  </div>

                  {/* Описание */}
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--tg-text-color)',
                    lineHeight: '1.5',
                    margin: '0 0 16px 0'
                  }}>
                    {template.description}
                  </p>

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
                      <MessageCircle size={14} />
                      {template.questions} {t('templates.questions')}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: 'var(--tg-hint-color)'
                    }}>
                      <Clock size={14} />
                      {template.estimatedTime}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: getDifficultyColor(template.difficulty)
                    }}>
                      <TrendingUp size={14} />
                      {getDifficultyText(template.difficulty)}
                    </div>
                  </div>

                  {/* Кнопка использования */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: template.color,
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {t('templates.useTemplate')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CenteredPageContainer>
    </div>
  );
};
