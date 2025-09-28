import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';

const AISurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const { backButton } = useTelegram();

  const [formData, setFormData] = useState({
    businessSphere: '',
    targetAudience: '',
    surveyGoal: '',
    questionCount: '5',
    questionTypes: [] as string[]
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);


  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleQuestionTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
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

  // Настройка нативной кнопки назад Telegram
  useEffect(() => {
    const handleBackClick = () => {
      try {
        // Используем нативный confirm вместо showConfirm
        const confirmed = window.confirm('Данные могут не сохраниться. Вы уверены, что хотите выйти?');
        if (confirmed) {
          navigate('/survey/create', { replace: true });
        }
      } catch (error) {
        // Если что-то пошло не так, просто переходим
        console.error('Error with confirm dialog:', error);
        navigate('/survey/create', { replace: true });
      }
    };

    backButton.show();
    backButton.onClick(handleBackClick);

    return () => {
      backButton.hide();
      backButton.offClick(handleBackClick);
    };
  }, [backButton, navigate]);

  const businessSpheres = [
    { value: 'cafe', label: 'Кафе' },
    { value: 'online_shop', label: 'Онлайн-магазин' },
    { value: 'fitness', label: 'Фитнес' },
    { value: 'beauty', label: 'Красота' },
    { value: 'education', label: 'Образование' },
    { value: 'services', label: 'Услуги' },
    { value: 'other', label: 'Другое' }
  ];

  const questionCounts = [
    { value: '3', label: '3 вопроса' },
    { value: '5', label: '5 вопросов (по умолчанию)' },
    { value: '7', label: '7 вопросов' },
    { value: '10', label: '10 вопросов' }
  ];

  const questionTypeOptions = [
    { id: 'open', label: 'Открытые', description: 'Свободный ответ текстом' },
    { id: 'closed', label: 'Закрытые', description: 'Выбор из вариантов' },
    { id: 'scale', label: 'Шкала', description: 'Оценка от 1 до 5/10' }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '80px'
    }}>
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
           Создание с ИИ
         </h1>
       </div>


      <div style={{ padding: '24px 16px' }} className="form-container">
        {/* Заголовок */}
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
            🤖
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
                width: '40%',
                height: '100%',
                backgroundColor: '#007AFF',
                borderRadius: '3px'
              }} />
            </div>
          </div>
        </motion.div>

        {/* Форма */}
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
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
                  border: '1px solid var(--tg-section-separator-color)',
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
               placeholder="Кто будет отвечать (клиенты кафе, подписчики канала и т.д.)"
               enterKeyHint="done"
               rows={3}
               style={{
                 width: '100%',
                 padding: '12px 16px',
                 borderRadius: '8px',
                 border: '1px solid var(--tg-section-separator-color)',
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
               placeholder="Что нужно узнать (причины отказа, удовлетворённость сервисом)"
               enterKeyHint="done"
               rows={3}
               style={{
                 width: '100%',
                 padding: '12px 16px',
                 borderRadius: '8px',
                 border: '1px solid var(--tg-section-separator-color)',
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
              Желаемое количество вопросов:
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={formData.questionCount}
                onChange={(e) => handleInputChange('questionCount', e.target.value)}
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
                {questionCounts.map(count => (
                  <option key={count.value} value={count.value}>
                    {count.label}
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

          {/* Типы вопросов (опционально) */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '12px'
            }}>
              Типы предпочтительных вопросов (опционально):
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {questionTypeOptions.map(option => (
                <div
                  key={option.id}
                  onClick={() => handleQuestionTypeToggle(option.id)}
                  style={{
                    backgroundColor: 'var(--tg-section-bg-color)',
                    border: `1px solid ${formData.questionTypes.includes(option.id) ? '#007AFF' : 'var(--tg-section-separator-color)'}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      marginBottom: '2px'
                    }}>
                      {option.label}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--tg-hint-color)'
                    }}>
                      {option.description}
                    </div>
                  </div>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${formData.questionTypes.includes(option.id) ? '#007AFF' : 'var(--tg-section-separator-color)'}`,
                    backgroundColor: formData.questionTypes.includes(option.id) ? '#007AFF' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {formData.questionTypes.includes(option.id) && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
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
           transition: 'transform 0.3s ease, opacity 0.3s ease'
         }}
       >
         <button
           onClick={handleGenerate}
           disabled={!formData.businessSphere || !formData.targetAudience || !formData.surveyGoal || isGenerating}
           style={{
             width: '100%',
             backgroundColor: (!formData.businessSphere || !formData.targetAudience || !formData.surveyGoal) ? 'var(--tg-hint-color)' : '#007AFF',
             color: 'white',
             border: 'none',
             borderRadius: '12px',
             padding: '16px 24px',
             fontSize: '16px',
             fontWeight: '600',
             cursor: (!formData.businessSphere || !formData.targetAudience || !formData.surveyGoal) ? 'not-allowed' : 'pointer'
           }}
         >
           {isGenerating ? 'Генерируем...' : 'Сгенерировать'}
         </button>
       </div>
    </div>
  );
};

export default AISurveyPage;