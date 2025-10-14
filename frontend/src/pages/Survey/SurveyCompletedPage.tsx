import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';

export default function SurveyCompletedPage() {
  const location = useLocation();
  const { close, hapticFeedback } = useTelegram();

  const hasReward = location.state?.hasReward || false;
  const creatorUsername = location.state?.creatorUsername;

  useEffect(() => {
    hapticFeedback?.success();
  }, [hapticFeedback]);

  const handleClose = () => {
    hapticFeedback?.light();
    close();
  };

  const handleContactCreator = () => {
    if (creatorUsername) {
      window.open(`https://t.me/${creatorUsername}`, '_blank');
      hapticFeedback?.light();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--tg-bg-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        style={{
          width: '100%',
          maxWidth: '400px'
        }}
      >
        {/* Анимированный эмодзи успеха */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{ marginBottom: '32px' }}
        >
          <TelegramEmoji emoji="🎉" size="large" />
        </motion.div>

        {/* Заголовок */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--tg-text-color)',
            marginBottom: '16px',
            lineHeight: '1.3'
          }}
        >
          Спасибо за участие!
        </motion.h1>

        {/* Описание */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            fontSize: '16px',
            color: 'var(--tg-hint-color)',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}
        >
          Ваши ответы успешно отправлены.
          <br />
          Организатор опроса получит их и сможет ознакомиться с результатами.
        </motion.p>

        {/* Кнопка связи с создателем */}
        {hasReward && creatorUsername && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleContactCreator}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: 'var(--tg-section-bg-color)',
              color: 'var(--tg-text-color)',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            💬 Связаться с организатором
          </motion.button>
        )}

        {/* Кнопка закрытия */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={handleClose}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'var(--tg-button-color)',
            color: 'var(--tg-button-text-color)',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          Закрыть
        </motion.button>

        {/* Дополнительный текст */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            fontSize: '12px',
            color: 'var(--tg-hint-color)',
            marginTop: '24px',
            lineHeight: '1.5'
          }}
        >
          Хотите создать свой опрос?
          <br />
          <Link to="/" style={{ color: 'var(--tg-link-color)', textDecoration: 'none', fontWeight: '500' }}>
            Откройте главную страницу AI Surveys
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}

