import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';

interface AIBusinessPageProps {}

const AIBusinessPage: React.FC<AIBusinessPageProps> = () => {
  const navigate = useNavigate();
  const { backButton } = useTelegram();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  const [formData, setFormData] = useState({
    businessSphere: '',
    targetAudience: '',
    surveyGoal: '',
    questionCount: 5,
    questionTypes: [] as string[]
  });
  
  const [showQuestionTypes, setShowQuestionTypes] = useState(false);
  const [customQuestionCount, setCustomQuestionCount] = useState('');

  const handleNext = () => {
    navigate('/survey/create/ai/motivation', { 
      state: { ...formData, userType: 'business' }
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsKeyboardActive(true);
    setTimeout(() => {
      e.target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 300);
  };

  const handleInputBlur = () => {
    setTimeout(() => setIsKeyboardActive(false), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
      setIsKeyboardActive(false);
    }
  };

  const handleQuestionTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  // Стабильная функция для кнопки назад
  const handleBackClick = useCallback(() => {
    navigate('/survey/create/ai', { replace: true });
  }, [navigate]);

  // Настройка нативной кнопки назад Telegram
  useEffect(() => {
    if (backButton) {
      backButton.show();
      backButton.onClick(handleBackClick);

      return () => {
        backButton.hide();
        backButton.offClick(handleBackClick);
      };
    }
  }, [backButton, handleBackClick]);

  const businessSpheres = [
    { value: 'cafe', label: 'Кафе' },
    { value: 'online_shop', label: 'Онлайн-магазин' },
    { value: 'fitness', label: 'Фитнес' },
    { value: 'beauty', label: 'Красота и здоровье' },
    { value: 'education', label: 'Образование' },
    { value: 'services', label: 'Услуги' },
    { value: 'retail', label: 'Розничная торговля' },
    { value: 'tech', label: 'IT и технологии' },
    { value: 'other', label: 'Другое' }
  ];

  const questionTypeOptions = [
    { id: 'text', label: 'Текст', emoji: '📝' },
    { id: 'single_choice', label: 'Один вариант', emoji: '🔘' },
    { id: 'multiple_choice', label: 'Несколько вариантов', emoji: '☑️' },
    { id: 'scale', label: 'Шкала оценки', emoji: '📊' },
    { id: 'yes_no', label: 'Да/Нет', emoji: '✅' },
    { id: 'rating', label: 'Рейтинг', emoji: '⭐' }
  ];

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        paddingBottom: '100px'
      }}
      className={isKeyboardActive ? 'keyboard-active' : ''}
    >
      {/* Заголовок */}
      <div style={{
        padding: '24px 16px 16px 16px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          color: 'var(--tg-text-color)'
        }}>
          Настройки для бизнеса
        </h1>
        <TelegramEmoji emoji="💼" size="large" />
      </div>

      {/* Прогресс-бар */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--tg-section-separator-color)'
      }}>
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'rgba(244, 109, 0, 0.2)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '50%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
              borderRadius: '2px'
            }}
          />
        </div>
      </div>

      {/* Описание */}
      <div style={{
        padding: '16px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '16px',
          color: 'var(--tg-hint-color)',
          margin: '0',
          lineHeight: '1.4'
        }}>
          Расскажите о вашем бизнесе, чтобы мы создали подходящий опрос
        </p>
      </div>

      {/* Контент */}
      <div style={{ padding: '0 16px' }} className="form-container">
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          {/* Сфера бизнеса */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Сфера бизнеса:
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={formData.businessSphere}
                onChange={(e) => handleInputChange('businessSphere', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">Выберите сферу</option>
                {businessSpheres.map(sphere => (
                  <option key={sphere.value} value={sphere.value}>
                    {sphere.label}
                  </option>
                ))}
              </select>
              <ChevronDown 
                size={20} 
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--tg-hint-color)',
                  pointerEvents: 'none'
                }}
              />
            </div>
          </div>

          {/* Целевая аудитория */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Целевая аудитория:
            </label>
             <textarea
               value={formData.targetAudience}
               onChange={(e) => handleInputChange('targetAudience', e.target.value)}
               onFocus={handleInputFocus}
               onBlur={handleInputBlur}
               onKeyDown={handleKeyDown}
               placeholder="Кто будет отвечать (клиенты кафе, подписчики канала и т.д.)"
               enterKeyHint="done"
               rows={3}
               style={{
                 width: '100%',
                 padding: '12px 16px',
                 borderRadius: '8px',
                 border: '2px solid var(--tg-section-separator-color)',
                 backgroundColor: 'var(--tg-section-bg-color)',
                 color: 'var(--tg-text-color)',
                 fontSize: '16px',
                 resize: 'vertical',
                 outline: 'none'
               }}
             />
          </div>

          {/* Цель опроса */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Цель опроса:
            </label>
             <textarea
               value={formData.surveyGoal}
               onChange={(e) => handleInputChange('surveyGoal', e.target.value)}
               onFocus={handleInputFocus}
               onBlur={handleInputBlur}
               onKeyDown={handleKeyDown}
               placeholder="Что нужно узнать (причины отказа, удовлетворённость сервисом)"
               enterKeyHint="done"
               rows={3}
               style={{
                 width: '100%',
                 padding: '12px 16px',
                 borderRadius: '8px',
                 border: '2px solid var(--tg-section-separator-color)',
                 backgroundColor: 'var(--tg-section-bg-color)',
                 color: 'var(--tg-text-color)',
                 fontSize: '16px',
                 resize: 'vertical',
                 outline: 'none'
               }}
             />
          </div>

          {/* Количество вопросов */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Количество вопросов:
            </label>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {[3, 5, 7, 10].map(count => (
                <button
                  key={count}
                  onClick={() => {
                    handleInputChange('questionCount', count);
                    setCustomQuestionCount('');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `2px solid ${formData.questionCount === count && !customQuestionCount ? '#F46D00' : 'var(--tg-section-separator-color)'}`,
                    backgroundColor: 'transparent',
                    color: 'var(--tg-text-color)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {count}
                </button>
              ))}
              <input
                type="number"
                value={customQuestionCount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 25)) {
                    setCustomQuestionCount(value);
                    if (value !== '') {
                      handleInputChange('questionCount', parseInt(value));
                    }
                  }
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder="Своё"
                min="1"
                max="25"
                style={{
                  width: '60px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `2px solid ${customQuestionCount ? '#F46D00' : 'var(--tg-section-separator-color)'}`,
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '14px',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />
            </div>
          </div>

          {/* Типы вопросов */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Предполагаемые типы вопросов (необязательно):
            </label>
            
            {/* Кнопка выбора типов */}
            <button
              onClick={() => setShowQuestionTypes(!showQuestionTypes)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: showQuestionTypes ? '12px' : '0'
              }}
            >
              <span>
                {formData.questionTypes.length > 0 
                  ? `Выбрано типов: ${formData.questionTypes.length}` 
                  : 'Выбрать типы'}
              </span>
              <ChevronDown 
                size={20} 
                style={{
                  transform: showQuestionTypes ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              />
            </button>

            {/* Раскрывающийся список */}
            {showQuestionTypes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)'
                }}
              >
                {questionTypeOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => handleQuestionTypeToggle(option.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${formData.questionTypes.includes(option.id) ? '#F46D00' : 'var(--tg-section-separator-color)'}`,
                      backgroundColor: formData.questionTypes.includes(option.id) ? 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)' : 'transparent',
                      color: formData.questionTypes.includes(option.id) ? 'white' : 'var(--tg-text-color)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{option.emoji}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Фиксированная кнопка снизу */}
      <div
        className="fixed-buttons"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
          backgroundColor: 'var(--tg-bg-color)',
          borderTop: '1px solid var(--tg-section-separator-color)',
          transform: isKeyboardActive ? 'translateY(100%)' : 'translateY(0)',
          opacity: isKeyboardActive ? 0 : 1,
          transition: 'all 0.3s ease'
        }}
      >
        <button
          onClick={handleNext}
          style={{
            width: '100%',
            background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Далее
        </button>
      </div>
    </div>
  );
};

export default AIBusinessPage;
