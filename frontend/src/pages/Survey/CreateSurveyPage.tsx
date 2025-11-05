import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import RealTelegramEmoji from '../../components/ui/RealTelegramEmoji';
import { getDraft, hasDraft, clearDraft, saveMode, getAIDraft, hasAIDraft, clearAIDraft } from '../../utils/surveyDraft';

const CreateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<'survey' | 'test' | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/'
  });

  // При входе на экран выбора: если есть черновик — предлагаем восстановить, иначе очищаем (гарантия нового опроса)
  useEffect(() => {
    if (hasDraft() || hasAIDraft()) {
      setShowRestorePrompt(true);
    } else {
      clearDraft();
      clearAIDraft();
    }
  }, []);

  const handleCreateSurvey = () => {
    clearDraft();
    saveMode('manual');
    setSelectedOption('survey');
  };

  const handleCreateTest = () => {
    clearDraft();
    setSelectedOption('test');
    // TODO: Реализовать создание теста
    alert('Создание тестов будет реализовано позже');
  };

  const handleNext = () => {
    if (selectedOption === 'survey') {
      navigate('/survey/create/manual');
    } else if (selectedOption === 'test') {
      // TODO: Реализовать переход на создание теста
      alert('Создание тестов будет реализовано позже');
    }
  };

  // Восстановление черновика
  const handleRestoreDraft = () => {
    const draft = getDraft();
    const aiDraft = getAIDraft();
    setShowRestorePrompt(false);
    
    // Для manual режима всегда переходим на новую единую страницу
    if (draft && draft.mode === 'manual') {
      navigate('/survey/create/manual', { replace: true });
    } else if (aiDraft) {
      // Для AI определяем на какую страницу переходить
      switch (aiDraft.currentStep) {
        case 'type':
          navigate('/survey/create/ai', { replace: true });
          break;
        case 'business':
          navigate('/survey/create/ai/business', { replace: true });
          break;
        case 'personal':
          navigate('/survey/create/ai/personal', { replace: true });
          break;
        case 'advanced':
          navigate('/survey/create/ai/advanced-settings', { replace: true });
          break;
        default:
          navigate('/survey/create/ai', { replace: true });
      }
    } else {
      // Если mode не задан, считаем manual как дефолт
      navigate('/survey/create/manual', { replace: true });
    }
  };

  const handleDeclineRestore = () => {
    clearDraft();
    clearAIDraft();
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
          Создать опрос или тест?
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
            {(() => {
              const draft = getDraft();
              const aiDraft = getAIDraft();
              let title = '';
              if (draft?.mode === 'manual' && draft?.settings?.title) {
                title = draft.settings.title;
              } else if (aiDraft) {
                title = 'Опрос с ИИ';
              }
              return title ? (
                <div style={{ fontSize: '14px', color: 'var(--tg-text-color)', marginBottom: '8px', fontWeight: 500 }}>
                  «{title}»
                </div>
              ) : null;
            })()}
            <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)', marginBottom: '12px' }}>
              Восстановить черновик и продолжить редактирование?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleRestoreDraft}
                style={{
                  flex: 1,
                  background: 'var(--tg-button-gradient)',
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

        {/* Варианты создания - показываем только если нет черновика или пользователь отказался от восстановления */}
        {!showRestorePrompt && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
          {/* Создать опрос */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div
              onClick={handleCreateSurvey}
              style={{
                backgroundColor: 'var(--tg-section-bg-color)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
                border: selectedOption === 'survey' ? '2px solid var(--tg-button-color)' : '2px solid transparent'
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
                  📊
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
                    Создать опрос
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${selectedOption === 'survey' ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                      background: selectedOption === 'survey' ? 'var(--tg-button-gradient)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {selectedOption === 'survey' && (
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
                    Создать опрос для сбора обратной связи
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Создать тест */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div
              onClick={handleCreateTest}
              style={{
                backgroundColor: 'var(--tg-section-bg-color)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
                border: selectedOption === 'test' ? '2px solid var(--tg-button-color)' : '2px solid transparent'
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
                  ✅
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
                    Создать тест
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${selectedOption === 'test' ? 'var(--tg-button-color)' : 'var(--tg-section-separator-color)'}`,
                      background: selectedOption === 'test' ? 'var(--tg-button-gradient)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {selectedOption === 'test' && (
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
                    Создать тест с правильными ответами и оценкой
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
        )}


        {/* Кнопка "Вперед" - показываем только если нет черновика */}
        {!showRestorePrompt && (
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
                background: selectedOption ? 'var(--tg-button-gradient)' : 'var(--tg-section-separator-color)',
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
              Создать
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Временная переменная для демонстрации - пока только ручное создание активно
// const activeOption = 'manual';

export default CreateSurveyPage;