import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';
import { Button } from '../../components/ui/Button';

const AISurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirm } = useTelegram();

  const [formData, setFormData] = useState({
    businessType: '',
    topic: '',
    targetAudience: '',
    questionsCount: '5',
    hasReward: false,
    rewardType: 'promo_code' as 'promo_code' | 'stars' | 'custom',
    rewardValue: '',
    rewardDescription: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleBack = () => {
    showConfirm('Данные могут не сохраниться. Вы уверены, что хотите выйти?').then((confirmed: boolean) => {
      if (confirmed) {
        navigate(-1);
      }
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Имитация работы ИИ
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsGenerating(false);
    
    // Переход на страницу с сгенерированными вопросами
    navigate('/survey/create/ai/preview', { 
      state: { formData } 
    });
  };

  const businessTypes = [
    { value: 'restaurant', label: '🍕 Ресторан/Кафе', emoji: '🍕' },
    { value: 'retail', label: '🛍️ Розничная торговля', emoji: '🛍️' },
    { value: 'service', label: '🔧 Услуги', emoji: '🔧' },
    { value: 'beauty', label: '💄 Красота/Здоровье', emoji: '💄' },
    { value: 'education', label: '📚 Образование', emoji: '📚' },
    { value: 'fitness', label: '💪 Фитнес/Спорт', emoji: '💪' },
    { value: 'other', label: '🏢 Другое', emoji: '🏢' }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)'
    }}>
      {/* Шапка */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        backgroundColor: 'var(--tg-bg-color)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--tg-button-color)',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{
          marginLeft: '12px',
          fontSize: '20px',
          fontWeight: '600',
          margin: 0
        }}>
          Создание с ИИ
        </h1>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '32px' }}
        >
          <TelegramEmoji emoji="🤖" size="large" />
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: '16px 0 8px 0'
          }}>
            Создание с ИИ
          </h2>
          <p style={{
            color: 'var(--tg-hint-color)',
            fontSize: '16px',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Расскажите о вашем бизнесе, и ИИ создаст идеальный опрос для вас
          </p>
        </motion.div>

        {/* Форма */}
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          {/* Тип бизнеса */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '12px'
            }}>
              Тип вашего бизнеса
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => handleInputChange('businessType', e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '16px'
              }}
            >
              <option value="">Выберите тип бизнеса</option>
              {businessTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Тема опроса */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '12px'
            }}>
              О чём хотите узнать?
            </label>
            <textarea
              value={formData.topic}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              placeholder="Например: предпочтения клиентов в еде, оценка качества обслуживания, новые продукты..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Целевая аудитория */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '12px'
            }}>
              Кто ваши клиенты?
            </label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => handleInputChange('targetAudience', e.target.value)}
              placeholder="Например: молодые семьи, офисные работники, студенты..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Количество вопросов */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '12px'
            }}>
              Количество вопросов
            </label>
            <select
              value={formData.questionsCount}
              onChange={(e) => handleInputChange('questionsCount', e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '16px'
              }}
            >
              <option value="3">3 вопроса (быстро)</option>
              <option value="5">5 вопросов (оптимально)</option>
              <option value="8">8 вопросов (подробно)</option>
              <option value="10">10 вопросов (максимум)</option>
            </select>
          </div>

          {/* Награда */}
          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '16px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.hasReward}
                onChange={(e) => handleInputChange('hasReward', e.target.checked)}
                style={{ marginRight: '12px' }}
              />
              <TelegramEmoji emoji="🎁" size="small" />
              <span style={{ marginLeft: '8px' }}>Добавить награду за участие</span>
            </label>

            {formData.hasReward && (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <select
                    value={formData.rewardType}
                    onChange={(e) => handleInputChange('rewardType', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--tg-section-separator-color)',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px'
                    }}
                  >
                    <option value="promo_code">Промокод</option>
                    <option value="stars">Звёзды Telegram</option>
                    <option value="custom">Другое</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={formData.rewardValue}
                  onChange={(e) => handleInputChange('rewardValue', e.target.value)}
                  placeholder="Значение награды (например: 10% скидка)"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--tg-section-separator-color)',
                    backgroundColor: 'var(--tg-bg-color)',
                    color: 'var(--tg-text-color)',
                    fontSize: '16px',
                    marginBottom: '12px'
                  }}
                />
                <input
                  type="text"
                  value={formData.rewardDescription}
                  onChange={(e) => handleInputChange('rewardDescription', e.target.value)}
                  placeholder="Описание награды"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--tg-section-separator-color)',
                    backgroundColor: 'var(--tg-bg-color)',
                    color: 'var(--tg-text-color)',
                    fontSize: '16px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Кнопка генерации */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerate}
            disabled={!formData.businessType || !formData.topic || isGenerating}
            style={{
              width: '100%',
              marginBottom: '16px'
            }}
          >
            {isGenerating ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles 
                  size={20} 
                  style={{ 
                    marginRight: '8px',
                    animation: 'spin 1s linear infinite'
                  }} 
                />
                ИИ создаёт опрос...
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TelegramEmoji emoji="✨" size="small" />
                <span style={{ marginLeft: '8px' }}>Создать с ИИ</span>
              </div>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleBack}
            style={{ width: '100%' }}
          >
            Назад
          </Button>
        </div>

        {/* Подсказка */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          border: '1px solid var(--tg-section-separator-color)'
        }}>
          <TelegramEmoji emoji="💡" size="small" />
          <p style={{
            color: 'var(--tg-hint-color)',
            fontSize: '14px',
            margin: '8px 0 0 0',
            lineHeight: '1.4'
          }}>
            Чем подробнее вы опишете ваш бизнес и цели, тем точнее ИИ создаст опрос
          </p>
        </div>
      </div>
    </div>
  );
};

// CSS для анимации спиннера
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default AISurveyPage;
