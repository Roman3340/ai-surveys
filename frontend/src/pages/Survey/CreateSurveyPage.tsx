import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';
import { Button } from '../../components/ui/Button';

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
          Создать опрос
        </h1>
      </div>

      {/* Основной контент */}
      <div style={{ padding: '24px 16px' }}>
        {/* Заголовок с анимированным эмодзи */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <TelegramEmoji emoji="💡" size="lg" />
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: '16px 0 8px 0'
          }}>
            Тип опроса
          </h2>
          <p style={{
            color: 'var(--tg-hint-color)',
            fontSize: '16px',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Выберите способ создания опроса. Обратите внимание что разные типы предусматривают различный функционал.
          </p>
        </motion.div>

        {/* Варианты создания */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          {/* Стандартный (ручной) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={handleCreateManual}
              style={{
                width: '100%',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: 'left',
                height: 'auto',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                borderRadius: '12px'
              }}
            >
              <div style={{ marginRight: '16px' }}>
                <TelegramEmoji emoji="📝" size="medium" />
              </div>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  color: 'var(--tg-text-color)'
                }}>
                  Стандартный
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--tg-hint-color)',
                  lineHeight: '1.3'
                }}>
                  Пользователям необходимо подписаться на каналы для участия
                </div>
              </div>
            </Button>
          </motion.div>

          {/* За бусты */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={handleCreateAI}
              style={{
                width: '100%',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: 'left',
                height: 'auto',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                borderRadius: '12px'
              }}
            >
              <div style={{ marginRight: '16px' }}>
                <TelegramEmoji emoji="⚡" size="medium" />
              </div>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  color: 'var(--tg-text-color)'
                }}>
                  За бусты
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--tg-hint-color)',
                  lineHeight: '1.3'
                }}>
                  Пользователям необходимо отдать буст для участия
                </div>
              </div>
            </Button>
          </motion.div>

          {/* За приглашения */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={handleCreateAI}
              style={{
                width: '100%',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: 'left',
                height: 'auto',
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                borderRadius: '12px'
              }}
            >
              <div style={{ marginRight: '16px' }}>
                <TelegramEmoji emoji="👥" size="medium" />
              </div>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  color: 'var(--tg-text-color)'
                }}>
                  За приглашения
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--tg-hint-color)',
                  lineHeight: '1.3'
                }}>
                  Пользователям необходимо пригласить друзей
                </div>
              </div>
            </Button>
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
      </div>
    </div>
  );
};

export default CreateSurveyPage;
