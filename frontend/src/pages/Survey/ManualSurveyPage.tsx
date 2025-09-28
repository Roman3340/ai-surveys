import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import { useTelegram } from '../../hooks/useTelegram';

const ManualSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirm } = useTelegram();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  const [surveyData, setSurveyData] = useState({
    title: 'Оценка качества продукции',
    description: '',
    language: 'ru',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    maxParticipants: '',
    motivation: 'promo_code',
    rewardValue: '',
    rewardDescription: ''
  });

  const handleBack = () => {
    showConfirm('Данные могут не сохраниться. Вы уверены, что хотите выйти?').then((confirmed: boolean) => {
      if (confirmed) {
        navigate('/survey/create', { replace: true });
      }
    }).catch(() => {
      // Если showConfirm не работает, просто переходим
      navigate('/survey/create', { replace: true });
    });
  };

  const handleNext = () => {
    // Сохраняем данные опроса в localStorage для использования в следующих шагах
    localStorage.setItem('surveySettings', JSON.stringify(surveyData));
    navigate('/survey/create/manual/questions');
  };

  const handleSurveyDataChange = (field: string, value: any) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputFocus = () => {
    setIsKeyboardActive(true);
  };

  const handleInputBlur = () => {
    // Задержка чтобы клавиатура успела скрыться
    setTimeout(() => setIsKeyboardActive(false), 300);
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
      paddingBottom: '80px' // Место для фиксированной кнопки
    }}
    className={isKeyboardActive ? 'keyboard-active' : ''}
    >
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
          Основные настройки
        </h1>
      </div>

      <div style={{ padding: '24px 16px' }} className="form-container">
        {/* Заголовок с эмодзи и прогресс */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '32px' }}
        >
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
            animation: 'bounce-gentle 3s ease-in-out infinite'
          }}>
            📝
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px'
          }}>
            {/* Прогресс-бар */}
            <div style={{
              width: '280px',
              height: '6px',
              backgroundColor: 'rgba(0, 122, 255, 0.2)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '60%',
                height: '100%',
                backgroundColor: '#007AFF',
                borderRadius: '3px'
              }} />
            </div>
          </div>
        </motion.div>

        {/* Поля формы */}
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          {/* Название */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'var(--tg-text-color)'
            }}>
              Название:
            </label>
            <input
              type="text"
              value={surveyData.title}
              onChange={(e) => handleSurveyDataChange('title', e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Оценка качества продукции"
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

          {/* Описание */}
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
              value={surveyData.description}
              onChange={(e) => handleSurveyDataChange('description', e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Опционально"
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

          {/* Язык */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'var(--tg-text-color)'
            }}>
              Язык:
            </label>
            <div style={{
              position: 'relative'
            }}>
              <select
                value={surveyData.language}
                onChange={(e) => handleSurveyDataChange('language', e.target.value)}
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
                <option value="ru">🇷🇺 Русский</option>
                <option value="en">🇺🇸 English</option>
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

          {/* Дата начала */}
          <DateTimePicker
            label="Дата начала"
            value={surveyData.startDate}
            timeValue={surveyData.startTime}
            onChange={(date, time) => {
              handleSurveyDataChange('startDate', date);
              if (time) handleSurveyDataChange('startTime', time);
            }}
            placeholder="Сразу"
            disabled={false}
          />

          {/* Дата завершения */}
          <DateTimePicker
            label="Дата завершения"
            value={surveyData.endDate}
            timeValue={surveyData.endTime}
            onChange={(date, time) => {
              handleSurveyDataChange('endDate', date);
              if (time) handleSurveyDataChange('endTime', time);
            }}
            placeholder="Не указана"
          />

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
                value={surveyData.motivation}
                onChange={(e) => handleSurveyDataChange('motivation', e.target.value)}
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
                <option value="promo_code">Промокод на скидку</option>
                <option value="stars">Звёзды Telegram</option>
                <option value="gift">Подарок</option>
                <option value="none">Без мотивации</option>
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
        </div>
      </div>

      {/* Фиксированные кнопки снизу */}
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
          display: 'flex',
          gap: '12px'
        }}
      >
        <button
          onClick={handleBack}
          style={{
            flex: 1,
            backgroundColor: 'var(--tg-section-bg-color)',
            color: 'var(--tg-text-color)',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Назад
        </button>
        <button
          onClick={handleNext}
          style={{
            flex: 1,
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Вперед
        </button>
      </div>
    </div>
  );
};

export default ManualSurveyPage;