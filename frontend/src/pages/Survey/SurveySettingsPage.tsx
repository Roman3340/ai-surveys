import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, ArrowLeft, ArrowRight, Users, Eye, Shuffle, Lock, Gift } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { getDraft, saveSettings } from '../../utils/surveyDraft';
import type { SurveySettings } from '../../types';

interface SurveySettingsData {
  title: string;
  description: string;
  settings: SurveySettings;
}

const SurveySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hapticFeedback } = useTelegram();
  
  const [formData, setFormData] = useState<SurveySettingsData>({
    title: '',
    description: '',
    settings: {
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      collectTelegramData: true,
      maxParticipants: undefined,
      endDate: undefined,
      creationType: 'manual'
    }
  });

  // Прокрутка к верху при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Загружаем данные из state или черновика
  useEffect(() => {
    const data = location.state?.surveyData;
    if (data) {
      setFormData(data);
    } else {
      // Загружаем из черновика
      const draft = getDraft();
      if (draft?.settings) {
        const settings = draft.settings;
        setFormData(prev => ({
          ...prev,
          title: settings.title || '',
          description: settings.description || '',
          settings: { 
            ...prev.settings, 
            ...settings,
            // Убеждаемся что все настройки опроса присутствуют
            allowAnonymous: settings.allowAnonymous ?? true,
            showProgress: settings.showProgress ?? true,
            randomizeQuestions: settings.randomizeQuestions ?? false,
            oneResponsePerUser: settings.oneResponsePerUser ?? true,
            collectTelegramData: settings.collectTelegramData ?? true,
            maxParticipants: settings.maxParticipants,
            endDate: settings.endDate,
            creationType: 'manual' as const
          }
        }));
      }
    }
  }, [location.state]);

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/survey/create/manual'
  });

  const handleInputChange = (field: keyof SurveySettingsData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingsChange = (field: keyof SurveySettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  const handleNext = () => {
    hapticFeedback?.light();
    
    // Сохраняем все данные в черновик
    saveSettings({
      title: formData.title,
      description: formData.description,
      // Основные настройки из предыдущей страницы (из location.state)
      language: (location.state?.surveyData as any)?.language || 'ru',
      startDate: (location.state?.surveyData as any)?.startDate,
      startTime: (location.state?.surveyData as any)?.startTime,
      endDate: formData.settings.endDate,
      endTime: (location.state?.surveyData as any)?.endTime,
      maxParticipants: formData.settings.maxParticipants,
      // Настройки опроса
      allowAnonymous: formData.settings.allowAnonymous,
      showProgress: formData.settings.showProgress,
      randomizeQuestions: formData.settings.randomizeQuestions,
      oneResponsePerUser: formData.settings.oneResponsePerUser,
      collectTelegramData: formData.settings.collectTelegramData,
      creationType: 'manual'
    });
    
    // Переходим к мотивации
    navigate('/survey/create/manual/motivation', {
      state: { surveyData: formData }
    });
  };

  const handleBack = () => {
    hapticFeedback?.light();
    navigate('/survey/create/manual');
  };

  const isFormValid = formData.title.trim().length > 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '100px'
    }}>
      {/* Шапка */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        backgroundColor: 'var(--tg-bg-color)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <Settings size={20} color="var(--tg-button-color)" />
          <h1 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: 0
          }}>
            Настройки опроса
          </h1>
        </div>
        
        <div style={{
          fontSize: '14px',
          color: 'var(--tg-hint-color)',
          lineHeight: '1.4'
        }}>
          Настройте основные параметры и ограничения для вашего опроса
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Основная информация */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}
        >
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📝 Основная информация
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'var(--tg-text-color)'
            }}>
              Название опроса *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Введите название опроса..."
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
          
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'var(--tg-text-color)'
            }}>
              Описание (необязательно)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Краткое описание опроса..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '16px',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>
        </motion.div>

        {/* Настройки опроса */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}
        >
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚙️ Настройки опроса
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Анонимные ответы */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--tg-section-separator-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Users size={20} color="var(--tg-button-color)" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Анонимные ответы</div>
                  <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                    Разрешить участникам отвечать анонимно
                  </div>
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={formData.settings.allowAnonymous}
                  onChange={(e) => handleSettingsChange('allowAnonymous', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: formData.settings.allowAnonymous ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                  borderRadius: '24px',
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: formData.settings.allowAnonymous ? '27px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }} />
                </span>
              </label>
            </div>

            {/* Показывать прогресс */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--tg-section-separator-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Eye size={20} color="var(--tg-button-color)" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Показывать прогресс</div>
                  <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                    Отображать прогресс прохождения опроса
                  </div>
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={formData.settings.showProgress}
                  onChange={(e) => handleSettingsChange('showProgress', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: formData.settings.showProgress ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                  borderRadius: '24px',
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: formData.settings.showProgress ? '27px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }} />
                </span>
              </label>
            </div>

            {/* Перемешивать вопросы */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--tg-section-separator-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shuffle size={20} color="var(--tg-button-color)" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Перемешивать вопросы</div>
                  <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                    Случайный порядок вопросов для каждого участника
                  </div>
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={formData.settings.randomizeQuestions}
                  onChange={(e) => handleSettingsChange('randomizeQuestions', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: formData.settings.randomizeQuestions ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                  borderRadius: '24px',
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: formData.settings.randomizeQuestions ? '27px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }} />
                </span>
              </label>
            </div>

            {/* Один ответ на пользователя */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--tg-section-separator-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Lock size={20} color="var(--tg-button-color)" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Один ответ на пользователя</div>
                  <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                    Запретить повторное участие
                  </div>
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={formData.settings.oneResponsePerUser}
                  onChange={(e) => handleSettingsChange('oneResponsePerUser', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: formData.settings.oneResponsePerUser ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                  borderRadius: '24px',
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: formData.settings.oneResponsePerUser ? '27px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }} />
                </span>
              </label>
            </div>

            {/* Собирать данные Telegram */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Gift size={20} color="var(--tg-button-color)" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>Собирать данные Telegram</div>
                  <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                    Получать информацию о пользователе Telegram
                  </div>
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={formData.settings.collectTelegramData}
                  onChange={(e) => handleSettingsChange('collectTelegramData', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: formData.settings.collectTelegramData ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                  borderRadius: '24px',
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: formData.settings.collectTelegramData ? '27px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }} />
                </span>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Ограничения */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}
        >
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Ограничения
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Максимальное количество участников */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--tg-text-color)'
              }}>
                Максимальное количество участников
              </label>
              <input
                type="number"
                value={formData.settings.maxParticipants || ''}
                onChange={(e) => handleSettingsChange('maxParticipants', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Без ограничений"
                min="1"
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
            
            {/* Дата окончания */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--tg-text-color)'
              }}>
                Дата окончания опроса
              </label>
              <input
                type="datetime-local"
                value={formData.settings.endDate || ''}
                onChange={(e) => handleSettingsChange('endDate', e.target.value || undefined)}
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
      </div>

      {/* Навигация */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        backgroundColor: 'var(--tg-bg-color)',
        borderTop: '1px solid var(--tg-section-separator-color)',
        display: 'flex',
        gap: '12px'
      }}>
        <button
          onClick={handleBack}
          style={{
            flex: 1,
            backgroundColor: 'var(--tg-section-bg-color)',
            color: 'var(--tg-text-color)',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <ArrowLeft size={16} />
          Назад
        </button>
        
        <button
          onClick={handleNext}
          disabled={!isFormValid}
          style={{
            flex: 1,
            backgroundColor: isFormValid ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
            color: 'var(--tg-button-text-color)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: isFormValid ? 1 : 0.5
          }}
        >
          Далее
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default SurveySettingsPage;
