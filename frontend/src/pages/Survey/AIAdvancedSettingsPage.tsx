import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import RealTelegramEmoji from '../../components/ui/RealTelegramEmoji';

interface AIAdvancedSettingsPageProps {}

const AIAdvancedSettingsPage: React.FC<AIAdvancedSettingsPageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [settingsType, setSettingsType] = useState<'standard' | 'advanced'>('standard');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Расширенные настройки
  const [advancedSettings, setAdvancedSettings] = useState({
    allowAnonymous: true,
    showProgress: true,
    randomizeQuestions: false,
    oneResponsePerUser: true,
    collectTelegramData: true,
    maxParticipants: '1000'
  });

  const handleNext = () => {
    navigate('/survey/create/ai/motivation', { 
      state: { 
        ...location.state,
        advancedSettings: settingsType === 'advanced' ? advancedSettings : null
      }
    });
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

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/survey/create/ai'
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
      paddingBottom: isKeyboardActive ? '0px' : '100px'
    }}>
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
            Расширенные настройки
          </h1>
          <RealTelegramEmoji 
            emoji="⚙️" 
            size="large" 
            onClick={() => console.log('⚙️ clicked!')}
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
                animate={{ width: '75%' }}
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
            Настраивать их необязательно и можно оставить по умолчанию
          </p>
        </motion.div>

        {/* Блок с настройками */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '32px'
          }}
        >
          <div
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '12px 0'
            }}
          >
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: '0 0 4px 0',
                color: 'var(--tg-text-color)'
              }}>
                Настройки опроса
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--tg-hint-color)',
                margin: 0
              }}>
                {settingsType === 'standard' ? 'Стандартные настройки' : 'Расширенные настройки'}
              </p>
            </div>
            <ChevronDown 
              size={20} 
              color="var(--tg-hint-color)"
              style={{
                transform: showSettingsDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>

          {showSettingsDropdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: '16px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => setSettingsType('standard')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: settingsType === 'standard' ? 'var(--tg-button-color)' : 'transparent',
                    color: settingsType === 'standard' ? 'white' : 'var(--tg-text-color)',
                    border: settingsType === 'standard' ? 'none' : '1px solid var(--tg-section-separator-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  Стандартные настройки
                </button>
                <button
                  onClick={() => setSettingsType('advanced')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: settingsType === 'advanced' ? 'var(--tg-button-color)' : 'transparent',
                    color: settingsType === 'advanced' ? 'white' : 'var(--tg-text-color)',
                    border: settingsType === 'advanced' ? 'none' : '1px solid var(--tg-section-separator-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  Расширенные настройки
                </button>
              </div>
            </motion.div>
          )}

          {/* Расширенные настройки */}
          {settingsType === 'advanced' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: '20px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Анонимные ответы */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Анонимные ответы
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Разрешить участникам отвечать анонимно
                    </div>
                  </div>
                  <button
                    onClick={() => setAdvancedSettings(prev => ({ ...prev, allowAnonymous: !prev.allowAnonymous }))}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.allowAnonymous ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: advancedSettings.allowAnonymous ? '22px' : '2px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                  </button>
                </div>

                {/* Показывать прогресс */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Показывать прогресс
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Отображать участникам прогресс прохождения
                    </div>
                  </div>
                  <button
                    onClick={() => setAdvancedSettings(prev => ({ ...prev, showProgress: !prev.showProgress }))}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.showProgress ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: advancedSettings.showProgress ? '22px' : '2px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                  </button>
                </div>

                {/* Перемешивать вопросы */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Перемешивать вопросы
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Случайный порядок вопросов для каждого участника
                    </div>
                  </div>
                  <button
                    onClick={() => setAdvancedSettings(prev => ({ ...prev, randomizeQuestions: !prev.randomizeQuestions }))}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.randomizeQuestions ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: advancedSettings.randomizeQuestions ? '22px' : '2px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                  </button>
                </div>

                {/* Один ответ на пользователя */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Один ответ на пользователя
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Запретить повторное участие
                    </div>
                  </div>
                  <button
                    onClick={() => setAdvancedSettings(prev => ({ ...prev, oneResponsePerUser: !prev.oneResponsePerUser }))}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.oneResponsePerUser ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: advancedSettings.oneResponsePerUser ? '22px' : '2px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                  </button>
                </div>

                {/* Собирать данные Telegram */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Собирать данные Telegram
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                      Получать информацию о пользователе из Telegram
                    </div>
                  </div>
                  <button
                    onClick={() => setAdvancedSettings(prev => ({ ...prev, collectTelegramData: !prev.collectTelegramData }))}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.collectTelegramData ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: advancedSettings.collectTelegramData ? '22px' : '2px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                  </button>
                </div>

                {/* Максимальное количество участников */}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    Максимальное количество участников
                  </div>
                  <input
                    type="number"
                    value={advancedSettings.maxParticipants}
                    onChange={(e) => setAdvancedSettings(prev => ({ ...prev, maxParticipants: e.target.value }))}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="1000"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--tg-section-separator-color)',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Фиксированная кнопка снизу */}
      {!isKeyboardActive && (
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
      )}
    </div>
  );
};

export default AIAdvancedSettingsPage;
