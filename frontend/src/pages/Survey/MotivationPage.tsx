import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import RealTelegramEmoji from '../../components/ui/RealTelegramEmoji';

interface MotivationPageProps {}

interface MotivationData {
  motivation: string;
  rewardDescription: string;
  rewardValue: string;
  [key: string]: any; // Для дополнительных полей из previousData
}

const MotivationPage: React.FC<MotivationPageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hapticFeedback } = useTelegram();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  // Получаем данные из предыдущего шага
  const previousData = location.state || {};
  const isFromAI = location.pathname.includes('/ai/');

  const [motivationData, setMotivationData] = useState<MotivationData>({
    motivation: 'none',
    rewardDescription: '',
    rewardValue: '',
    ...previousData // Объединяем с данными из предыдущего шага
  });

  const handleNext = () => {
    // Сохраняем данные мотивации
    const allData = { ...motivationData };
    localStorage.setItem('motivationData', JSON.stringify(allData));

    if (isFromAI) {
      // Для AI - переходим к генерации
      navigate('/survey/create/ai/generate', { 
        state: allData
      });
    } else {
      // Для ручного создания - переходим к созданию вопросов
      navigate('/survey/create/manual/questions', {
        state: allData
      });
    }
  };

  const handleMotivationChange = (field: string, value: any) => {
    setMotivationData((prev: MotivationData) => ({ ...prev, [field]: value }));
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

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    onBack: () => {
      if (isFromAI) {
        navigate('/survey/create/ai', { replace: true });
      } else {
        navigate('/survey/create/manual', { replace: true });
      }
    }
  });

  // Прокрутка к верху при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
      {/* Основной контент */}
      <div style={{ padding: '24px 16px' }}>
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
            Мотивация
          </h1>
          <RealTelegramEmoji 
            emoji="🏆" 
            size="large" 
            onClick={() => console.log('🏆 clicked!')}
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
                animate={{ width: isFromAI ? '70%' : '60%' }}
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
            Добавьте мотивацию, чтобы повысить отклик на ваш опрос. Респонденты будут знать о награде заранее и охотнее примут участие.
          </p>
        </motion.div>
      </div>

      {/* Контент */}
      <div style={{ padding: '0 16px' }} className="form-container">
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          {/* Мотивация */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'var(--tg-text-color)'
            }}>
              Мотивация:
            </label>
            <div style={{
              position: 'relative'
            }}>
              <select
                value={motivationData.motivation}
                onChange={(e) => handleMotivationChange('motivation', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="none">Без мотивации</option>
                <option value="promo_code">Промокод на скидку</option>
                <option value="stars">Звёзды Telegram</option>
                <option value="gift">Подарок</option>
                <option value="other">Другое</option>
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

          {/* Поля для промокода */}
          {motivationData.motivation === 'promo_code' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: 'var(--tg-text-color)'
                }}>
                  Описание скидки:
                </label>
                <input
                  type="text"
                  value={motivationData.rewardDescription}
                  onChange={(e) => handleMotivationChange('rewardDescription', e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Скидка 20% на следующий заказ"
                  enterKeyHint="done"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--tg-section-separator-color)',
                    backgroundColor: 'var(--tg-section-bg-color)',
                    color: 'var(--tg-text-color)',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: 'var(--tg-text-color)'
                }}>
                  Промокод:
                </label>
                <input
                  type="text"
                  value={motivationData.rewardValue}
                  onChange={(e) => handleMotivationChange('rewardValue', e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="DISCOUNT20"
                  enterKeyHint="done"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--tg-section-separator-color)',
                    backgroundColor: 'var(--tg-section-bg-color)',
                    color: 'var(--tg-text-color)',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>
            </>
          )}

          {/* Поле для звёзд */}
          {motivationData.motivation === 'stars' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--tg-text-color)'
              }}>
                Количество звёзд:
              </label>
              <input
                type="number"
                value={motivationData.rewardValue}
                onChange={(e) => handleMotivationChange('rewardValue', e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder="50"
                enterKeyHint="done"
                inputMode="numeric"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Поле для подарка */}
          {motivationData.motivation === 'gift' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--tg-text-color)'
              }}>
                Описание подарка:
              </label>
              <input
                type="text"
                value={motivationData.rewardDescription}
                onChange={(e) => handleMotivationChange('rewardDescription', e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder="Бесплатная доставка"
                enterKeyHint="done"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Поле для "Другое" */}
          {motivationData.motivation === 'other' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--tg-text-color)'
              }}>
                Описание:
              </label>
              <input
                type="text"
                value={motivationData.rewardDescription}
                onChange={(e) => handleMotivationChange('rewardDescription', e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder="Укажите вашу мотивацию"
                enterKeyHint="done"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>
          )}
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
          borderTop: '1px solid var(--tg-section-separator-color)'
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
          {isFromAI ? 'Сгенерировать' : 'Продолжить'}
        </button>
      </div>
    </div>
  );
};

export default MotivationPage;
