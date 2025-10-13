import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { surveyApi } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';

interface SurveyPublicData {
  id: string;
  title: string;
  description?: string;
  status: string;
  maxParticipants?: number;
  settings: any;
  questions: any[];
  creatorUsername?: string;
  creatorTelegramId: number;
  responsesCount: number;
  canParticipate: boolean;
  participationMessage?: string;
}

export default function SurveyInvitePage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { user, hapticFeedback, isReady } = useTelegram();
  
  const [survey, setSurvey] = useState<SurveyPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSurvey = async () => {
      if (!surveyId) return;
      
      // Ждем пока Telegram WebApp инициализируется
      if (!isReady) return;
      
      try {
        setLoading(true);
        const response = await surveyApi.getSurveyPublic(surveyId, user?.id);
        setSurvey(response);
      } catch (e: any) {
        console.error(e);
        setError(e?.response?.data?.detail || 'Не удалось загрузить опрос');
      } finally {
        setLoading(false);
      }
    };
    loadSurvey();
  }, [surveyId, user, isReady]);

  const handleParticipate = () => {
    if (!survey?.canParticipate) {
      alert(survey?.participationMessage || 'Участие в опросе недоступно');
      return;
    }
    hapticFeedback?.medium();
    navigate(`/survey/${surveyId}/take`);
  };

  const handleContactCreator = () => {
    if (survey) {
      const url = survey.creatorUsername 
        ? `https://t.me/${survey.creatorUsername}` 
        : `tg://user?id=${survey.creatorTelegramId}`;
      window.open(url, '_blank');
      hapticFeedback?.light();
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--tg-bg-color)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid var(--tg-button-color)', 
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ color: 'var(--tg-hint-color)' }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--tg-bg-color)',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <p style={{ color: 'var(--tg-text-color)', fontSize: '16px', marginBottom: '8px' }}>
            Опрос не найден
          </p>
          <p style={{ color: 'var(--tg-hint-color)', fontSize: '14px' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--tg-bg-color)',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}
      >
        {/* Анимированный эмодзи */}
        <div style={{ marginBottom: '24px' }}>
          <TelegramEmoji emoji="📝" size="large" />
        </div>

        {/* Название опроса */}
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: 'var(--tg-text-color)',
          marginBottom: '12px',
          lineHeight: '1.3'
        }}>
          {survey.title}
        </h1>

        {/* Описание */}
        {survey.description && (
          <p style={{ 
            fontSize: '15px', 
            color: 'var(--tg-hint-color)',
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            {survey.description}
          </p>
        )}

        {/* Мотивация */}
        {survey.settings?.motivationEnabled && (
          <div style={{
            background: 'rgba(255, 165, 0, 0.1)',
            border: '2px solid rgba(255, 165, 0, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎁</div>
            <div style={{ 
              fontSize: '15px', 
              fontWeight: '600',
              color: 'var(--tg-text-color)',
              marginBottom: '8px'
            }}>
              Награда за участие
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: 'var(--tg-text-color)',
              marginBottom: '12px'
            }}>
              {survey.settings.motivationType === 'stars' && `⭐ ${survey.settings.motivationDetails || '50'} звёзд Telegram`}
              {survey.settings.motivationType === 'promo_code' && `💎 ${survey.settings.motivationDetails || 'Промокод на скидку'}`}
              {survey.settings.motivationType === 'gift' && `🎁 ${survey.settings.motivationDetails || 'Подарок'}`}
              {survey.settings.motivationType === 'other' && survey.settings.motivationDetails}
            </div>
            <div style={{ 
              fontSize: '11px', 
              color: 'var(--tg-hint-color)',
              fontStyle: 'italic'
            }}>
              Все награды выдаются организаторами опроса. AI Surveys не участвует в их хранении и передаче.
            </div>
          </div>
        )}

        {/* Организатор */}
        <button
          onClick={handleContactCreator}
          style={{
            width: '100%',
            background: 'var(--tg-section-bg-color)',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '14px', color: 'var(--tg-text-color)' }}>
            👤 Организатор: {survey.creatorUsername ? `@${survey.creatorUsername}` : 'Пользователь Telegram'}
          </span>
        </button>

        {/* Кнопка участия */}
        {survey.canParticipate ? (
          <button
            onClick={handleParticipate}
            style={{
              width: '100%',
              background: 'var(--tg-button-color)',
              color: 'var(--tg-button-text-color)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            📝 Начать опрос
          </button>
        ) : (
          <div style={{
            background: 'var(--tg-section-bg-color)',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--tg-hint-color)',
              margin: 0
            }}>
              {survey.participationMessage}
            </p>
          </div>
        )}
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

