import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import RealTelegramEmoji from '../../components/ui/RealTelegramEmoji';
import { getAIDraft, saveAIUserType, clearAITypeData } from '../../utils/surveyDraft';
import CenteredPageContainer from '../../components/layout/CenteredPageContainer';

interface AISurveyPageProps {}

const AISurveyPage: React.FC<AISurveyPageProps> = () => {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const [selectedType, setSelectedType] = useState<'business' | 'personal' | null>(null);

  // Загружаем данные из черновика при монтировании
  useEffect(() => {
    const draft = getAIDraft();
    if (draft?.userType) {
      setSelectedType(draft.userType);
    }
  }, []);

  const handleNext = () => {
    if (!selectedType) return;
    
    hapticFeedback?.light();
    
    // Очищаем данные противоположного типа при переходе
    clearAITypeData(selectedType);
    
    if (selectedType === 'business') {
      navigate('/survey/create/ai/business');
    } else {
      navigate('/survey/create/ai/personal');
    }
  };

  const handleSelectType = (type: 'business' | 'personal') => {
    hapticFeedback?.light();
    setSelectedType(type);
    saveAIUserType(type);
  };

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/survey/create'
  });

  // Прокрутка к верху при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '100px'
    }}>
      {/* Основной контент */}
      <div style={{ padding: '24px 16px' }}>
        <CenteredPageContainer>
        {/* Заголовок с эмодзи */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            color: 'var(--tg-text-color)'
          }}>
            Для чего создаём опрос?
          </h1>
          <RealTelegramEmoji 
            emoji="🤖" 
            size="large" 
            onClick={() => console.log('🤖 clicked!')}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '16px',
            marginBottom: '24px'
          }}>
            {/* Прогресс-бар */}
            <div style={{
              width: '280px',
              height: '6px',
              backgroundColor: 'rgba(244, 109, 0, 0.2)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '30%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
                  borderRadius: '3px'
                }}
              />
            </div>
          </div>
          <p style={{
            fontSize: '16px',
            color: 'var(--tg-hint-color)',
            margin: '0',
            lineHeight: '1.4'
          }}>
            Выберите подходящий вариант, чтобы мы могли задать правильные вопросы для создания опроса
          </p>
        </motion.div>
      </CenteredPageContainer>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              backgroundColor: '#FFD60A',
              borderRadius: '12px'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              backgroundColor: '#34C759',
              borderRadius: '12px'
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
        <CenteredPageContainer>
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
        </CenteredPageContainer>
      </div>
    </div>
  );
};

export default AISurveyPage;