import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import RealTelegramEmoji from '../../components/ui/RealTelegramEmoji';
import { getDraft, hasDraft, clearDraft, saveMode } from '../../utils/surveyDraft';

const CreateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<'manual' | 'ai' | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    showConfirm: true,
    confirmMessage: 'Данные могут не сохраниться. Вы уверены, что хотите выйти?',
    targetRoute: '/'
  });

  // При входе на экран выбора: если есть черновик — предлагаем восстановить, иначе очищаем (гарантия нового опроса)
  useEffect(() => {
    if (hasDraft()) {
      setShowRestorePrompt(true);
    } else {
      clearDraft();
    }
  }, []);

  const handleCreateManual = () => {
    clearDraft();
    saveMode('manual');
    setSelectedOption('manual');
  };

  const handleCreateAI = () => {
    clearDraft();
    saveMode('ai');
    setSelectedOption('ai');
  };

  const handleNext = () => {
    if (selectedOption === 'manual') {
      navigate('/survey/create/manual');
    } else if (selectedOption === 'ai') {
      navigate('/survey/create/ai');
    }
  };

  // Восстановление черновика
  const handleRestoreDraft = () => {
    const draft = getDraft();
    setShowRestorePrompt(false);
    if (!draft) return;
    // Переходим сразу на релевантный шаг (минует этот экран)
    if (draft.mode === 'manual') {
      if (draft.questions && draft.questions.length > 0) {
        navigate('/survey/create/manual/questions', { replace: true });
      } else if (draft.motivation) {
        navigate('/survey/create/manual/motivation', { replace: true, state: draft.settings || {} });
      } else if (draft.settings) {
        navigate('/survey/create/manual', { replace: true, state: draft.settings });
      } else {
        navigate('/survey/create/manual', { replace: true });
      }
    } else if (draft.mode === 'ai') {
      // Для AI сейчас ведём на старт AI
      navigate('/survey/create/ai', { replace: true });
    } else {
      // Если mode не задан, считаем manual как дефолт
      navigate('/survey/create/manual', { replace: true });
    }
  };

  const handleDeclineRestore = () => {
    clearDraft();
    setShowRestorePrompt(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)'
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
          margin: 0,
          textAlign: 'center'
        }}>
          Как создадим опрос?
        </h1>
      </div>

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
          <RealTelegramEmoji 
            emoji="💡" 
            size="large" 
            onClick={() => console.log('💡 clicked!')}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'center',
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
              <div style={{
                width: '20%',
                height: '100%',
                background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
                borderRadius: '3px'
              }} />
            </div>
          </div>
        </motion.div>

        {/* Блок восстановления черновика */}
        {showRestorePrompt && (
          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              Найден незавершённый опрос
            </div>
            <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)', marginBottom: '12px' }}>
              Восстановить черновик и продолжить редактирование?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleRestoreDraft}
                style={{
                  flex: 1,
                  background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Да, восстановите
              </button>
              <button
                onClick={handleDeclineRestore}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  border: '1px solid var(--tg-section-separator-color)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Нет, спасибо
              </button>
            </div>
          </div>
        )}

        {/* Варианты создания */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          {/* Вручную */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div
              onClick={handleCreateManual}
              style={{
                backgroundColor: 'var(--tg-section-bg-color)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
                border: selectedOption === 'manual' ? '2px solid #F46D00' : '2px solid transparent'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{
                  fontSize: '24px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFD60A',
                  borderRadius: '10px',
                  marginTop: '2px'
                }}>
                  👨‍💻
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '4px',
                    color: 'var(--tg-text-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    Вручную
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${selectedOption === 'manual' ? '#F46D00' : 'var(--tg-section-separator-color)'}`,
                      background: selectedOption === 'manual' ? 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {selectedOption === 'manual' && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'white',
                          borderRadius: '50%'
                        }} />
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--tg-hint-color)',
                    lineHeight: '1.3'
                  }}>
                    Самостоятельно придумаю концепцию опроса и все вопросы
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* При помощи ИИ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div
              onClick={handleCreateAI}
              style={{
                backgroundColor: 'var(--tg-section-bg-color)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
                border: selectedOption === 'ai' ? '2px solid #F46D00' : '2px solid transparent'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{
                  fontSize: '24px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#34C759',
                  borderRadius: '10px',
                  marginTop: '2px'
                }}>
                  🤖
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '4px',
                    color: 'var(--tg-text-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    При помощи искусственного интеллекта
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${selectedOption === 'ai' ? '#F46D00' : 'var(--tg-section-separator-color)'}`,
                      background: selectedOption === 'ai' ? 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {selectedOption === 'ai' && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'white',
                          borderRadius: '50%'
                        }} />
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--tg-hint-color)',
                    lineHeight: '1.3'
                  }}>
                    Выберу ЦА из списка и опишу кратко желания - остальное сделает нейросеть
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Подсказка снизу */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            textAlign: 'center',
            marginTop: '32px',
            padding: '16px',
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            border: '1px solid var(--tg-section-separator-color)'
          }}
        >
          <p style={{
            color: 'var(--tg-hint-color)',
            fontSize: '14px',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Выберите тип опроса. Обратите внимание что разные типы предусматривают различный функционал.
          </p>
        </motion.div>

        {/* Кнопка "Вперед" */}
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
            disabled={!selectedOption}
            style={{
              width: '100%',
              background: selectedOption ? 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)' : 'var(--tg-section-separator-color)',
              color: selectedOption ? 'white' : 'var(--tg-hint-color)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedOption ? 'pointer' : 'not-allowed',
              opacity: selectedOption ? 1 : 0.6
            }}
          >
            Вперед
          </button>
        </div>
      </div>
    </div>
  );
};

// Временная переменная для демонстрации - пока только ручное создание активно
// const activeOption = 'manual';

export default CreateSurveyPage;