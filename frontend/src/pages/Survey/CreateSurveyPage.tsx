import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import RealTelegramEmoji from '../../components/ui/RealTelegramEmoji';

const CreateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirm } = useTelegram();

  const handleBack = () => {
    showConfirm('Данные могут не сохраниться. Вы уверены, что хотите выйти?').then((confirmed: boolean) => {
      if (confirmed) {
        navigate('/');
      }
    });
  };

  const handleCreateManual = () => {
    navigate('/survey/create/manual');
  };

  const handleCreateAI = () => {
    navigate('/survey/create/ai');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)'
    }}>
      {/* Шапка с кнопкой назад */}
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
            display: 'flex',
            alignItems: 'center',
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
              backgroundColor: 'var(--tg-section-separator-color)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '20%',
                height: '100%',
                backgroundColor: '#007AFF',
                borderRadius: '3px'
              }} />
            </div>
          </div>
        </motion.div>

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
                border: '2px solid #007AFF' // Активный вариант
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
                      border: '2px solid #007AFF',
                      backgroundColor: '#007AFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} />
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
                border: '1px solid var(--tg-section-separator-color)',
                opacity: 0.6
              }}
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
                  backgroundColor: '#8E8E93',
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
                    color: 'var(--tg-hint-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    При помощи искусственного интеллекта
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid var(--tg-section-separator-color)',
                      backgroundColor: 'transparent'
                    }} />
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
            onClick={handleCreateManual} // Пока только ручное создание активно
            style={{
              width: '100%',
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
    </div>
  );
};

// Временная переменная для демонстрации - пока только ручное создание активно
// const activeOption = 'manual';

export default CreateSurveyPage;