import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import RealTelegramEmoji from '../../components/ui/RealTelegramEmoji';
import { getAIDraft, saveAIAdvancedSettings } from '../../utils/surveyDraft';

interface AIAdvancedSettingsPageProps {}

const AIAdvancedSettingsPage: React.FC<AIAdvancedSettingsPageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [settingsType, setSettingsType] = useState<'standard' | 'advanced'>('standard');

  // Загружаем состояние выпадающего списка из черновика
  useEffect(() => {
    const draft = getAIDraft();
    if (draft?.advancedSettings) {
      setSettingsType('advanced');
    }
  }, []);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Расширенные настройки
  const [advancedSettings, setAdvancedSettings] = useState({
    allowAnonymous: false,
    showProgress: false,
    randomizeQuestions: false,
    oneResponsePerUser: true,
    collectTelegramData: false,
    maxParticipants: '',
    endDate: '',
    endTime: '',
    surveyTitle: '',
    surveyDescription: ''
  });

  // Загружаем данные из черновика при монтировании
  useEffect(() => {
    const draft = getAIDraft();
    if (draft?.advancedSettings) {
      setAdvancedSettings(draft.advancedSettings);
    }
  }, []);

  const handleNext = () => {
    // Сохраняем настройки в черновик
    saveAIAdvancedSettings(settingsType === 'advanced' ? advancedSettings : undefined);
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

  // Функция для получения текущего времени в МСК
  const getMoscowTime = () => {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Moscow"}));
    return moscowTime;
  };

  // Функция для валидации и установки времени окончания
  const handleEndDateChange = (date: string) => {
    if (!date) {
      // Если дата очищена, очищаем и время
      const newSettings = { 
        ...advancedSettings, 
        endDate: '',
        endTime: ''
      };
      setAdvancedSettings(newSettings);
      saveAIAdvancedSettings(newSettings);
      return;
    }

    const today = getMoscowTime();
    const selectedDate = new Date(date);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    if (selectedDateOnly < todayDate) {
      // Если дата в прошлом, не устанавливаем
      return;
    }

    let defaultTime = '12:00';
    
    // Если выбранная дата - сегодня, устанавливаем текущее время + 1 час
    if (selectedDateOnly.getTime() === todayDate.getTime()) {
      const currentHour = today.getHours();
      const nextHour = (currentHour + 1) % 24;
      defaultTime = `${nextHour.toString().padStart(2, '0')}:00`;
    }

    const newSettings = { 
      ...advancedSettings, 
      endDate: date,
      endTime: advancedSettings.endTime || defaultTime
    };
    setAdvancedSettings(newSettings);
    saveAIAdvancedSettings(newSettings);
  };

  // Функция для обновления настроек с автоматическим сохранением
  const updateAdvancedSettings = (updates: Partial<typeof advancedSettings>) => {
    const newSettings = { ...advancedSettings, ...updates };
    setAdvancedSettings(newSettings);
    saveAIAdvancedSettings(newSettings);
  };

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: (() => {
      const draft = getAIDraft();
      if (draft?.userType === 'business') {
        return '/survey/create/ai/business';
      } else if (draft?.userType === 'personal') {
        return '/survey/create/ai/personal';
      }
      return '/survey/create/ai';
    })()
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
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Анонимные ответы
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)', lineHeight: '1.3' }}>
                      Разрешить участникам отвечать анонимно
                    </div>
                  </div>
                  <button
                    onClick={() => updateAdvancedSettings({ allowAnonymous: !advancedSettings.allowAnonymous })}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.allowAnonymous ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: advancedSettings.allowAnonymous ? 'none' : '1px solid var(--tg-hint-color)',
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

                {/* Показывать прогресс - ЗАКОММЕНТИРОВАНО НА БУДУЩЕЕ */}
                {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Показывать прогресс
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)', lineHeight: '1.3' }}>
                      Отображать участникам прогресс прохождения
                    </div>
                  </div>
                  <button
                    onClick={() => updateAdvancedSettings({ showProgress: !advancedSettings.showProgress })}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.showProgress ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: advancedSettings.showProgress ? 'none' : '1px solid var(--tg-hint-color)',
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
                </div> */}

                {/* Перемешивать вопросы */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Перемешивать вопросы
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)', lineHeight: '1.3' }}>
                      Случайный порядок вопросов для каждого участника
                    </div>
                  </div>
                  <button
                    onClick={() => updateAdvancedSettings({ randomizeQuestions: !advancedSettings.randomizeQuestions })}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.randomizeQuestions ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: advancedSettings.randomizeQuestions ? 'none' : '1px solid var(--tg-hint-color)',
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
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Один ответ на пользователя
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)', lineHeight: '1.3' }}>
                      Запретить повторное участие
                    </div>
                  </div>
                  <button
                    onClick={() => updateAdvancedSettings({ oneResponsePerUser: !advancedSettings.oneResponsePerUser })}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.oneResponsePerUser ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: advancedSettings.oneResponsePerUser ? 'none' : '1px solid var(--tg-hint-color)',
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

                {/* Собирать данные Telegram - ЗАКОММЕНТИРОВАНО НА БУДУЩЕЕ */}
                {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                      Собирать данные Telegram
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)', lineHeight: '1.3' }}>
                      Получать информацию о пользователе из Telegram
                    </div>
                  </div>
                  <button
                    onClick={() => updateAdvancedSettings({ collectTelegramData: !advancedSettings.collectTelegramData })}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      backgroundColor: advancedSettings.collectTelegramData ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)',
                      border: advancedSettings.collectTelegramData ? 'none' : '1px solid var(--tg-hint-color)',
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
                </div> */}

                {/* Максимальное количество участников */}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    Максимальное количество участников
                  </div>
                  <input
                    type="number"
                    value={advancedSettings.maxParticipants}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value) >= 0 && !isNaN(parseInt(value)))) {
                        updateAdvancedSettings({ maxParticipants: value });
                      }
                    }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Не ограничено"
                    inputMode="numeric"
                    pattern="[0-9]*"
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

                {/* Дата и время окончания */}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    Дата окончания
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={advancedSettings.endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--tg-section-separator-color)',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                    />
                    <input
                      type="time"
                      value={advancedSettings.endTime}
                      onChange={(e) => updateAdvancedSettings({ endTime: e.target.value })}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--tg-section-separator-color)',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                    />
                    {(advancedSettings.endDate || advancedSettings.endTime) && (
                      <button
                        type="button"
                        onClick={() => setAdvancedSettings(prev => ({ 
                          ...prev, 
                          endDate: '',
                          endTime: ''
                        }))}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--tg-section-separator-color)',
                          backgroundColor: 'var(--tg-section-bg-color)',
                          color: 'var(--tg-hint-color)',
                          fontSize: '14px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--tg-hint-color)';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--tg-section-bg-color)';
                          e.currentTarget.style.color = 'var(--tg-hint-color)';
                        }}
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--tg-hint-color)', 
                    marginTop: '4px',
                    lineHeight: '1.3'
                  }}>
                    Время устанавливать необязательно. Если не указано, опрос будет работать до тех пор, пока вы его не завершите вручную. Время указывается по МСК.
                  </div>
                </div>

                {/* Название опроса */}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    Название опроса
                  </div>
                  <input
                    type="text"
                    value={advancedSettings.surveyTitle}
                    onChange={(e) => updateAdvancedSettings({ surveyTitle: e.target.value })}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Оставьте пустым для автогенерации"
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

                {/* Описание опроса */}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    Описание опроса
                  </div>
                  <textarea
                    value={advancedSettings.surveyDescription}
                    onChange={(e) => updateAdvancedSettings({ surveyDescription: e.target.value })}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Оставьте пустым для автогенерации"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--tg-section-separator-color)',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: '80px'
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
