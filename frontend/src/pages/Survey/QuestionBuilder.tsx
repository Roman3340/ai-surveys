import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Image, GripVertical, ChevronDown } from 'lucide-react';
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
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

const QuestionBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirm, hapticFeedback } = useTelegram();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

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

  const handleBack = () => {
    if (questions.length > 0) {
      showConfirm('Все вопросы будут удалены. Вы уверены?').then((confirmed: boolean) => {
        if (confirmed) {
          navigate(-1);
        }
      });
    } else {
      navigate(-1);
    }
  };

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

  const renderQuestionEditor = (question: Question) => {
    const isEditing = editingQuestion === question.id;
    const questionTypeInfo = questionTypes.find(t => t.value === question.type);

    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          border: isEditing ? '2px solid #007AFF' : '1px solid var(--tg-section-separator-color)',
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
              onFocus={() => setEditingQuestion(question.id)}
              placeholder="Вопрос"
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
              placeholder="Описание (необязательно)"
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
                options: ['single_choice', 'multiple_choice'].includes(e.target.value) ? ['Вариант 1'] : []
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

          {/* Кнопка загрузки изображения */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'transparent',
              color: 'var(--tg-hint-color)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <Image size={16} />
            Картинка
          </button>
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
                    placeholder={`Вариант ${index + 1}`}
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
              backgroundColor: 'rgba(0, 122, 255, 0.2)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '80%',
                height: '100%',
                backgroundColor: '#007AFF',
                borderRadius: '3px'
              }} />
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

      {/* Фиксированные кнопки снизу */}
      {questions.length > 0 && (
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
              padding: '16px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Назад
          </button>
          <button
            onClick={handlePreview}
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
            Предпросмотр
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionBuilder;
