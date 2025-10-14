import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import RealTelegramEmoji from '../../components/ui/RealTelegramEmoji';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { getDraft, saveSettings } from '../../utils/surveyDraft';

const ManualSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  const [surveyData, setSurveyData] = useState(() => {
    const draft = getDraft();
    return {
      title: draft?.settings?.title || '',
      description: draft?.settings?.description || '',
      language: draft?.settings?.language || 'ru',
      startDate: draft?.settings?.startDate || '',
      startTime: draft?.settings?.startTime || '',
      endDate: draft?.settings?.endDate || '',
      endTime: draft?.settings?.endTime || '',
      maxParticipants: draft?.settings?.maxParticipants || ''
    };
  });


  const handleNext = () => {
    // Сохраняем данные опроса в черновик
    saveSettings({
      ...surveyData,
      // Добавляем настройки по умолчанию для опроса
      allowAnonymous: false,
      showProgress: false,
      randomizeQuestions: false,
      oneResponsePerUser: true,
      collectTelegramData: false,
      creationType: 'manual',
      motivationEnabled: false,
      motivationType: 'discount',
      motivationDetails: ''
    });
    navigate('/survey/create/manual/settings', {
      state: surveyData
    });
  };

  const handleSurveyDataChange = (field: string, value: any) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsKeyboardActive(true);
    // Прокручиваем к полю ввода
    setTimeout(() => {
      e.target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 300);
  };

  const handleInputBlur = () => {
    // Задержка чтобы клавиатура успела скрыться
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
      // Сохраняем текущие данные перед возвратом
      saveSettings({
        ...surveyData,
        allowAnonymous: false,
        showProgress: false,
        randomizeQuestions: false,
        oneResponsePerUser: true,
        collectTelegramData: false,
        creationType: 'manual',
        motivationEnabled: false,
        motivationType: 'discount',
        motivationDetails: ''
      });
      navigate('/survey/create', { replace: true });
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
      paddingBottom: '80px' // Место для фиксированной кнопки
    }}
    className={isKeyboardActive ? 'keyboard-active' : ''}
    >
       {/* Шапка */}
       <div style={{
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         padding: '16px',
         borderBottom: '1px solid var(--tg-section-separator-color)',
         backgroundColor: 'var(--tg-bg-color)',
         position: 'sticky',
         top: 0,
         zIndex: 10
       }}>
         <h1 style={{
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
          <div style={{ marginBottom: '10px' }}>
            <RealTelegramEmoji 
              emoji="📝" 
              size="large" 
              onClick={() => console.log('📝 clicked!')}
            />
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
              backgroundColor: 'rgba(244, 109, 0, 0.2)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '20%' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
                    borderRadius: '3px'
                  }}
                />
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
               onKeyDown={handleKeyDown}
               placeholder="Оценка качества продукции"
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
             <textarea
               value={surveyData.description}
               onChange={(e) => handleSurveyDataChange('description', e.target.value)}
               onFocus={handleInputFocus}
               onBlur={handleInputBlur}
               onKeyDown={handleKeyDown}
               placeholder="Опционально"
               enterKeyHint="done"
               rows={4}
               style={{
                 width: '100%',
                 padding: '12px 16px',
                 borderRadius: '8px',
                 border: '1px solid var(--tg-section-separator-color)',
                 backgroundColor: 'var(--tg-section-bg-color)',
                 color: 'var(--tg-text-color)',
                 fontSize: '16px',
                 outline: 'none',
                 resize: 'vertical',
                 fontFamily: 'inherit'
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