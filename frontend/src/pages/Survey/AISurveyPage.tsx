import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';

interface AISurveyPageProps {}

const AISurveyPage: React.FC<AISurveyPageProps> = () => {
  const navigate = useNavigate();
  const { backButton, hapticFeedback } = useTelegram();
  const [selectedType, setSelectedType] = useState<'business' | 'personal' | null>(null);

  const handleNext = () => {
    if (!selectedType) return;
    
    hapticFeedback?.light();
    if (selectedType === 'business') {
      navigate('/survey/create/ai/business');
    } else {
      navigate('/survey/create/ai/personal');
    }
  };

  const handleSelectType = (type: 'business' | 'personal') => {
    hapticFeedback?.light();
    setSelectedType(type);
  };

  // Стабильная функция для кнопки назад
  const handleBackClick = useCallback(() => {
    navigate('/survey/create', { replace: true });
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '100px'
    }}>
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
          Для кого создаём опрос?
        </h1>
        <TelegramEmoji emoji="🤖" size="large" />
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
            animate={{ width: '25%' }}
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
          Выберите подходящий вариант, чтобы мы могли задать правильные вопросы для создания опроса
        </p>
      </div>

      {/* Варианты выбора */}
      <div style={{ padding: '0 16px' }}>
        {/* Для бизнеса */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectType('business')}
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            border: selectedType === 'business' ? '2px solid #F46D00' : '2px solid transparent',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {selectedType === 'business' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
              opacity: 0.1,
              pointerEvents: 'none'
            }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              💼
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: '0 0 4px 0',
                color: 'var(--tg-text-color)'
              }}>
                Для бизнеса
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--tg-hint-color)',
                margin: 0,
                lineHeight: '1.3'
              }}>
                Исследование клиентов, сфера деятельности, целевая аудитория
              </p>
            </div>
            {selectedType === 'business' && (
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#F46D00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
            )}
          </div>
        </motion.div>

        {/* Для личных целей */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectType('personal')}
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            border: selectedType === 'personal' ? '2px solid #F46D00' : '2px solid transparent',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '32px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {selectedType === 'personal' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
              opacity: 0.1,
              pointerEvents: 'none'
            }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🙋‍♂️
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: '0 0 4px 0',
                color: 'var(--tg-text-color)'
              }}>
                Для личных целей
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--tg-hint-color)',
                margin: 0,
                lineHeight: '1.3'
              }}>
                Опросы друзей, мнения близких, личные исследования
              </p>
            </div>
            {selectedType === 'personal' && (
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#F46D00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Фиксированная кнопка снизу */}
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
          onClick={handleNext}
          disabled={!selectedType}
          style={{
            width: '100%',
            background: selectedType ? 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)' : 'var(--tg-hint-color)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: selectedType ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            opacity: selectedType ? 1 : 0.6
          }}
        >
          Далее
        </button>
      </div>
    </div>
  );
};

export default AISurveyPage;