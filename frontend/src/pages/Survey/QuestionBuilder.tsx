import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Image, GripVertical, ChevronDown } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';
import type { QuestionType } from '../../types';

interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  imageUrl?: string;
  imageName?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

const QuestionBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { hapticFeedback, backButton } = useTelegram();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  const questionTypes = [
    { value: 'text', label: 'Короткий ответ', icon: '📝' },
    { value: 'textarea', label: 'Развёрнутый ответ', icon: '📄' },
    { value: 'single_choice', label: 'Один из списка', icon: '🔘' },
    { value: 'multiple_choice', label: 'Несколько из списка', icon: '☑️' },
    { value: 'scale', label: 'Шкала', icon: '📊' },
    { value: 'rating', label: 'Оценка звёздами', icon: '⭐' },
    { value: 'yes_no', label: 'Да/Нет', icon: '✅' },
    { value: 'date', label: 'Дата', icon: '📅' },
    { value: 'number', label: 'Число', icon: '🔢' }
  ];


  const addQuestion = () => {
    hapticFeedback?.light();
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'text',
      title: '',
      required: false,
      options: []
    };
    setQuestions(prev => [...prev, newQuestion]);
    setEditingQuestion(newQuestion.id);
    
    // Прокручиваем к новому вопросу
    setTimeout(() => {
      const questionElement = document.getElementById(`question-${newQuestion.id}`);
      if (questionElement) {
        questionElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (id: string) => {
    hapticFeedback?.light();
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (editingQuestion === id) {
      setEditingQuestion(null);
    }
  };

  const addOption = (questionId: string) => {
    updateQuestion(questionId, {
      options: [...(questions.find(q => q.id === questionId)?.options || []), '']
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = question.options.filter((_, index) => index !== optionIndex);
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const handlePreview = () => {
    if (questions.length === 0) {
      alert('Добавьте хотя бы один вопрос для предпросмотра');
      return;
    }

    // Проверяем, что все вопросы имеют заголовки
    const emptyQuestions = questions.filter(q => !q.title.trim());
    if (emptyQuestions.length > 0) {
      alert('Заполните заголовки всех вопросов');
      return;
    }

    // Получаем данные опроса из localStorage (сохраненные на предыдущих шагах)
    const surveySettings = JSON.parse(localStorage.getItem('surveySettings') || '{}');
    
    const surveyData = {
      title: surveySettings.title || 'Новый опрос',
      description: surveySettings.description || '',
      questions: questions,
      settings: surveySettings
    };

    hapticFeedback?.light();
    navigate('/survey/create/manual/preview', { 
      state: { surveyData }
    });
  };

  const handleInputFocus = () => {
    setIsKeyboardActive(true);
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

  // Стабильная функция для кнопки назад
  const handleBackClick = useCallback(() => {
    if (questions.length > 0) {
      try {
        const confirmed = window.confirm('Все вопросы будут удалены. Вы уверены?');
        if (confirmed) {
          navigate('/survey/create/manual', { replace: true });
        }
      } catch (error) {
        console.error('Error with confirm dialog:', error);
        navigate('/survey/create/manual', { replace: true });
      }
    } else {
      navigate('/survey/create/manual', { replace: true });
    }
  }, [navigate, questions.length]);

  // Прокрутка к верху при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Настройка нативной кнопки назад Telegram
  useEffect(() => {
    if (backButton) {
      const pageId = '/survey/create/manual/questions';
      backButton.show();
      backButton.onClick(handleBackClick, pageId);

      return () => {
        backButton.hide();
        backButton.offClick(pageId);
      };
    }
  }, [backButton, handleBackClick]);

  const handleImageUpload = (questionId: string) => {
    // Создаем скрытый input для выбора файла
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // В реальном приложении здесь будет загрузка на сервер
        // Пока просто показываем имя файла
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          updateQuestion(questionId, { 
            imageUrl: imageUrl,
            imageName: file.name 
          });
          hapticFeedback?.success();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const renderQuestionEditor = (question: Question) => {
    const isEditing = editingQuestion === question.id;
    const questionTypeInfo = questionTypes.find(t => t.value === question.type);

    return (
      <motion.div
        key={question.id}
        id={`question-${question.id}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          border: isEditing ? '2px solid #F46D00' : '1px solid var(--tg-section-separator-color)',
          position: 'relative'
        }}
      >
        {/* Заголовок вопроса */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <GripVertical
            size={20}
            style={{
              color: 'var(--tg-hint-color)',
              marginTop: '12px',
              cursor: 'grab'
            }}
          />
          <div style={{ flex: 1 }}>
             <input
               type="text"
               value={question.title}
               onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
               onFocus={() => {
                 setEditingQuestion(question.id);
                 handleInputFocus();
               }}
               onBlur={handleInputBlur}
               onKeyDown={handleKeyDown}
               placeholder="Вопрос"
               enterKeyHint="done"
               style={{
                 width: '100%',
                 fontSize: '16px',
                 fontWeight: '500',
                 padding: '12px 0',
                 border: 'none',
                 borderBottom: '2px solid var(--tg-section-separator-color)',
                 backgroundColor: 'transparent',
                 color: 'var(--tg-text-color)',
                 outline: 'none'
               }}
             />
            
            {/* Описание вопроса */}
            <input
              type="text"
              value={question.description || ''}
              onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder="Описание (необязательно)"
              enterKeyHint="done"
              style={{
                width: '100%',
                fontSize: '14px',
                padding: '8px 0',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--tg-hint-color)',
                outline: 'none',
                marginTop: '8px'
              }}
            />
          </div>
          
          {/* Кнопка удаления */}
          <button
            onClick={() => deleteQuestion(question.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tg-hint-color)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px'
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Тип вопроса */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <select
              value={question.type}
              onChange={(e) => updateQuestion(question.id, {
                type: e.target.value as QuestionType,
                options: ['single_choice', 'multiple_choice'].includes(e.target.value) ? [''] : []
              })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '14px',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={16} 
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

        {/* Кнопка загрузки изображения */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => handleImageUpload(question.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: question.imageUrl ? 'var(--tg-button-color)' : 'transparent',
              color: question.imageUrl ? 'var(--tg-button-text-color)' : 'var(--tg-hint-color)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <Image size={16} />
            {question.imageUrl ? question.imageName || 'Изображение загружено' : 'Картинка'}
          </button>

          {/* Предпросмотр загруженного изображения */}
          {question.imageUrl && (
            <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
              <img 
                src={question.imageUrl} 
                alt="Загруженное изображение"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
              <button
                onClick={() => updateQuestion(question.id, { imageUrl: undefined, imageName: undefined })}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#FF3B30',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Варианты ответов для множественного выбора */}
        {(['single_choice', 'multiple_choice'].includes(question.type)) && (
          <div style={{ marginBottom: '16px' }}>
            <AnimatePresence>
              {question.options?.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: question.type === 'single_choice' ? '50%' : '4px',
                    border: '2px solid var(--tg-section-separator-color)',
                    backgroundColor: 'var(--tg-section-bg-color)'
                  }} />
                   <input
                     type="text"
                     value={option}
                     onChange={(e) => updateOption(question.id, index, e.target.value)}
                     onFocus={handleInputFocus}
                     onBlur={handleInputBlur}
                     onKeyDown={handleKeyDown}
                     placeholder={`Вариант ${index + 1}`}
                     enterKeyHint="done"
                     style={{
                       flex: 1,
                       padding: '8px 12px',
                       borderRadius: '6px',
                       border: '1px solid var(--tg-section-separator-color)',
                       backgroundColor: 'var(--tg-bg-color)',
                       color: 'var(--tg-text-color)',
                       fontSize: '14px',
                       outline: 'none'
                     }}
                   />
                  {question.options && question.options.length > 1 && (
                    <button
                      onClick={() => removeOption(question.id, index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--tg-hint-color)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            <button
              onClick={() => addOption(question.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px dashed var(--tg-section-separator-color)',
                backgroundColor: 'transparent',
                color: 'var(--tg-hint-color)',
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <Plus size={16} />
              Добавить вариант
            </button>
          </div>
        )}

        {/* Шкала для типа scale */}
        {question.type === 'scale' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'var(--tg-bg-color)',
            borderRadius: '8px'
          }}>
            <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>1</span>
            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(num => (
                <div
                  key={num}
                  style={{
                    flex: 1,
                    height: '8px',
                    backgroundColor: 'var(--tg-section-separator-color)',
                    borderRadius: '4px'
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>5</span>
          </div>
        )}

        {/* Звёзды для рейтинга */}
        {question.type === 'rating' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'var(--tg-bg-color)',
            borderRadius: '8px'
          }}>
            {[1, 2, 3, 4, 5].map(num => (
              <div key={num} style={{ fontSize: '24px' }}>⭐</div>
            ))}
          </div>
        )}

        {/* Да/Нет для yes_no */}
        {question.type === 'yes_no' && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'var(--tg-bg-color)',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--tg-section-bg-color)',
              border: '1px solid var(--tg-section-separator-color)'
            }}>
              ✅ Да
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--tg-section-bg-color)',
              border: '1px solid var(--tg-section-separator-color)'
            }}>
              ❌ Нет
            </div>
          </div>
        )}

        {/* Обязательный вопрос */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid var(--tg-section-separator-color)'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: 'var(--tg-text-color)',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
              style={{ marginRight: '4px' }}
            />
            Обязательный вопрос
          </label>
          
          <div style={{
            fontSize: '12px',
            color: 'var(--tg-hint-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {questionTypeInfo?.icon} {questionTypeInfo?.label}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        paddingBottom: '80px'
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
           Создание вопросов
         </h1>
       </div>

      <div style={{ padding: '24px 16px' }} className="form-container">
        {/* Заголовок с прогрессом */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '32px' }}
        >
          <TelegramEmoji 
            emoji="🔧" 
            size="large" 
            animate={true}
            onClick={() => hapticFeedback?.light()}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '16px',
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
                animate={{ width: '80%' }}
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
            color: 'var(--tg-hint-color)',
            fontSize: '14px',
            margin: 0
          }}>
            Создайте вопросы для опроса
          </p>
        </motion.div>

        {/* Список вопросов */}
        <AnimatePresence>
          {questions.map(question => renderQuestionEditor(question))}
        </AnimatePresence>

        {/* Кнопка добавления вопроса */}
        <motion.button
          onClick={addQuestion}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: '2px dashed var(--tg-section-separator-color)',
            backgroundColor: 'transparent',
            color: 'var(--tg-hint-color)',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}
        >
          <Plus size={20} />
          Создать вопрос
        </motion.button>

        {/* Пустое состояние */}
        {questions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--tg-hint-color)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❓</div>
            <p style={{
              fontSize: '16px',
              margin: '0 0 20px 0',
              lineHeight: '1.4'
            }}>
              Добавьте первый вопрос для опроса
            </p>
          </motion.div>
        )}
      </div>


       {/* Фиксированная кнопка снизу */}
       {questions.length > 0 && (
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
             onClick={handlePreview}
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
             Предпросмотр
           </button>
         </div>
       )}
    </div>
  );
};

export default QuestionBuilder;
