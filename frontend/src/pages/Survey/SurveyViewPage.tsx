import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Share2, 
  Copy, 
  QrCode, 
  Users, 
  Calendar, 
  Clock,
  Eye,
  BarChart3,
  Settings,
  Trash2
} from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { useAppStore } from '../../store/useAppStore';
import { QRCodeGenerator } from '../../components/ui/QRCodeGenerator';
import type { Survey } from '../../types';

export const SurveyViewPage: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const { hapticFeedback, showAlert } = useTelegram();
  const { userSurveys, removeSurvey } = useAppStore();
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [surveyUrl, setSurveyUrl] = useState('');

  // Загружаем опрос по ID
  useEffect(() => {
    if (surveyId) {
      const foundSurvey = userSurveys.find(s => s.id === surveyId);
      if (foundSurvey) {
        setSurvey(foundSurvey);
        // Генерируем URL для прохождения опроса
        const baseUrl = window.location.origin;
        const surveyUrl = `${baseUrl}/survey/${surveyId}/take`;
        setSurveyUrl(surveyUrl);
      } else {
        // Опрос не найден, возвращаемся на главную
        navigate('/');
      }
    }
  }, [surveyId, userSurveys, navigate]);

  // Настройка кнопки "Назад"
  useStableBackButton({
    onBack: () => navigate('/')
  });

  // Копирование ссылки
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      hapticFeedback?.success();
      showAlert?.('Ссылка скопирована в буфер обмена!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showAlert?.('Не удалось скопировать ссылку');
    }
  };

  // Поделиться ссылкой
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: survey?.title || 'Опрос',
          text: survey?.description || '',
          url: surveyUrl
        });
        hapticFeedback?.success();
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback - копируем ссылку
      handleCopyLink();
    }
  };

  // Удаление опроса
  const handleDeleteSurvey = () => {
    if (survey && window.confirm('Вы уверены, что хотите удалить этот опрос?')) {
      removeSurvey(survey.id);
      hapticFeedback?.success();
      navigate('/');
    }
  };

  // Переход к аналитике
  const handleViewAnalytics = () => {
    if (survey) {
      navigate(`/survey/${survey.id}/analytics`);
    }
  };

  if (!survey) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--tg-bg-color)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p style={{ color: 'var(--tg-hint-color)' }}>Загрузка опроса...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)'
    }}>
      {/* Заголовок */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        backgroundColor: 'var(--tg-section-bg-color)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tg-text-color)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0,
            flex: 1
          }}>
            {survey.title}
          </h1>
        </div>

        {survey.description && (
          <p style={{
            fontSize: '14px',
            color: 'var(--tg-hint-color)',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {survey.description}
          </p>
        )}
      </div>

      {/* Статистика опроса */}
      <div style={{ padding: '16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--tg-button-color)' }}>
              {survey.questions.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginTop: '4px' }}>
              Вопросов
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--tg-button-color)' }}>
              {survey.responses.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginTop: '4px' }}>
              Ответов
            </div>
          </div>
        </div>

        {/* Информация о создании */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0'
          }}>
            Информация об опросе
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="var(--tg-hint-color)" />
              <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                Создан: {new Date(survey.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--tg-hint-color)" />
              <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                Время: {new Date(survey.createdAt).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} color="var(--tg-hint-color)" />
              <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                Тип: {survey.settings.creationType === 'manual' ? 'Ручной' : 'ИИ'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: survey.isPublished ? '#34C759' : '#FF9500'
              }} />
              <span style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
                Статус: {survey.isPublished ? 'Опубликован' : 'Черновик'}
              </span>
            </div>
          </div>
        </div>

        {/* Ссылка на опрос */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0'
          }}>
            Ссылка на опрос
          </h3>

          <div style={{
            backgroundColor: 'var(--tg-bg-color)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--tg-section-separator-color)',
            marginBottom: '12px',
            wordBreak: 'break-all',
            fontSize: '12px',
            color: 'var(--tg-hint-color)'
          }}>
            {surveyUrl}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopyLink}
              style={{
                flex: 1,
                backgroundColor: 'var(--tg-button-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Copy size={16} />
              Копировать
            </button>

            <button
              onClick={handleShare}
              style={{
                flex: 1,
                backgroundColor: 'var(--tg-button-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Share2 size={16} />
              Поделиться
            </button>
          </div>
        </div>

        {/* QR-код */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0'
          }}>
            QR-код для быстрого доступа
          </h3>

          <button
            onClick={() => setShowQRCode(!showQRCode)}
            style={{
              backgroundColor: 'var(--tg-button-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              margin: '0 auto 16px auto'
            }}
          >
            <QrCode size={16} />
            {showQRCode ? 'Скрыть QR-код' : 'Показать QR-код'}
          </button>

          {showQRCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <QRCodeGenerator url={surveyUrl} size={200} />
              <p style={{
                fontSize: '12px',
                color: 'var(--tg-hint-color)',
                margin: '12px 0 0 0'
              }}>
                Отсканируйте QR-код для быстрого перехода к опросу
              </p>
            </motion.div>
          )}
        </div>

        {/* Действия */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleViewAnalytics}
            style={{
              backgroundColor: 'var(--tg-button-color)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <BarChart3 size={20} />
            Просмотреть аналитику
          </button>

          <button
            onClick={() => navigate(`/survey/${survey.id}/take`)}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--tg-button-color)',
              border: '2px solid var(--tg-button-color)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <Eye size={20} />
            Пройти опрос
          </button>

          <button
            onClick={handleDeleteSurvey}
            style={{
              backgroundColor: 'transparent',
              color: '#FF3B30',
              border: '2px solid #FF3B30',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <Trash2 size={20} />
            Удалить опрос
          </button>
        </div>
      </div>
    </div>
  );
};
