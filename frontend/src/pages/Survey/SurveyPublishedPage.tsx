import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Copy, Share, X, Download, Clock, HelpCircle, Users, QrCode } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useAppStore } from '../../store/useAppStore';
import { surveyApi } from '../../services/api';

interface SurveyData {
  id: string;
  title: string;
  description?: string;
  questions: any[];
  settings?: any;
  maxParticipants?: number;
}

export const SurveyPublishedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hapticFeedback } = useTelegram();
  const { getSurveyShareLink, isLoading } = useAppStore();
  
  const [shareData, setShareData] = useState<{
    share_url: string;
    qr_code: string;
  } | null>(null);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const surveyId = searchParams.get('surveyId');

  useEffect(() => {
    if (surveyId) {
      loadData();
    }
  }, [surveyId]);

  // Скроллим наверх при загрузке страницы
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadData = async () => {
    if (!surveyId) return;
    
    try {
      const [shareData, survey] = await Promise.all([
        getSurveyShareLink(surveyId),
        surveyApi.getSurvey(surveyId, false)
      ]);
      setShareData(shareData);
      setSurveyData(survey);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные опроса');
    }
  };

  const handleCopyLink = async () => {
    if (!shareData?.share_url) return;
    
    try {
      await navigator.clipboard.writeText(shareData.share_url);
      setCopied(true);
      hapticFeedback?.light();
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  const handleShareTelegram = () => {
    if (!shareData?.share_url || !surveyData) return;
    
    hapticFeedback?.light();
    
    // Создаем красивое сообщение без ссылки в тексте (с отступом после ссылки)
    const shareText = `\n📊 Пройдите пожалуйста мой опрос: "${surveyData.title}"\n\n💭 Ваше мнение очень важно для нас! ✨`;
    
    // Открываем Telegram для шаринга (ссылка будет добавлена автоматически)
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.share_url)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleDownloadQR = async () => {
    if (!shareData?.qr_code) return;
    
    setDownloading(true);
    hapticFeedback?.light();
    
    try {
      // Создаем canvas для конвертации QR-кода в PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // Конвертируем в blob и скачиваем
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `survey-qr-${surveyData?.title || 'code'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      };
      
      img.src = shareData.qr_code;
    } catch (error) {
      console.error('Ошибка скачивания QR-кода:', error);
    } finally {
      setDownloading(false);
    }
  };

  const getEstimatedTime = (questionsCount: number) => {
    // Примерное время: 30 секунд на вопрос
    const minutes = Math.ceil(questionsCount * 0.5);
    return minutes;
  };

  const handleClose = () => {
    hapticFeedback?.light();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ fontSize: '48px', marginBottom: '16px' }}
        >
          ⏳
        </motion.div>
        <p style={{
          fontSize: '16px',
          color: 'var(--tg-hint-color)',
          textAlign: 'center'
        }}>
          Подготовка ссылки для распространения...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          ❌
        </div>
        <p style={{
          fontSize: '16px',
          color: 'var(--tg-hint-color)',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          {error}
        </p>
        <button 
          onClick={handleClose}
          style={{
            backgroundColor: 'var(--tg-button-color)',
            color: 'var(--tg-button-text-color)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Заголовок с анимацией */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: '32px' }}
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{ fontSize: '64px', marginBottom: '16px' }}
        >
          🎉
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            fontSize: '28px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            color: 'var(--tg-text-color)',
            background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Опрос опубликован!
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            fontSize: '16px',
            color: 'var(--tg-hint-color)',
            margin: '0',
            lineHeight: '1.4'
          }}
        >
          Теперь вы можете поделиться ссылкой с участниками
        </motion.p>
      </motion.div>

      {/* Информация об опросе */}
      {surveyData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid var(--tg-section-separator-color)'
          }}
        >
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            color: 'var(--tg-text-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Информация об опросе
          </h3>
          
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 4px 0',
              color: 'var(--tg-text-color)'
            }}>
              {surveyData.title}
            </h4>
            {surveyData.description && (
              <p style={{
                fontSize: '14px',
                color: 'var(--tg-hint-color)',
                margin: '0 0 12px 0',
                lineHeight: '1.4'
              }}>
                {surveyData.description}
              </p>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: 'var(--tg-hint-color)'
            }}>
              <HelpCircle size={16} />
              <span>{surveyData.questions.length} вопросов</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: 'var(--tg-hint-color)'
            }}>
              <Clock size={16} />
              <span>~{getEstimatedTime(surveyData.questions.length)} мин</span>
            </div>
            {surveyData.maxParticipants && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: 'var(--tg-hint-color)'
              }}>
                <Users size={16} />
                <span>до {surveyData.maxParticipants} участников</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Ссылка для распространения */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid var(--tg-section-separator-color)'
        }}
      >
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 12px 0',
          color: 'var(--tg-text-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔗 Ссылка для распространения
        </h3>
        
        <div style={{
          backgroundColor: 'var(--tg-bg-color)',
          border: '1px solid var(--tg-section-separator-color)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '12px',
          wordBreak: 'break-all',
          fontSize: '14px',
          color: 'var(--tg-hint-color)',
          fontFamily: 'monospace'
        }}>
          {shareData?.share_url || 'Загрузка...'}
        </div>

        <button
          onClick={handleCopyLink}
          style={{
            width: '100%',
            backgroundColor: copied ? '#34C759' : 'var(--tg-button-color)',
            color: 'var(--tg-button-text-color)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: copied ? '0 4px 12px rgba(52, 199, 89, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          {copied ? (
            <>
              <CheckCircle size={18} />
              Скопировано!
            </>
          ) : (
            <>
              <Copy size={18} />
              Копировать ссылку
            </>
          )}
        </button>
      </motion.div>

      {/* QR-код */}
      {shareData?.qr_code && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
            border: '1px solid var(--tg-section-separator-color)'
          }}
        >
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            color: 'var(--tg-text-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <QrCode size={20} />
            QR-код
          </h3>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <img 
              src={shareData.qr_code} 
              alt="QR код для опроса"
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                borderRadius: '12px',
                border: '2px solid var(--tg-section-separator-color)'
              }}
            />
          </div>
          
          <p style={{
            fontSize: '14px',
            color: 'var(--tg-hint-color)',
            margin: '0 0 16px 0',
            lineHeight: '1.4'
          }}>
            Отсканируйте QR-код для быстрого доступа к опросу
          </p>

          <button
            onClick={handleDownloadQR}
            disabled={downloading}
            style={{
              width: '100%',
              backgroundColor: downloading ? 'var(--tg-hint-color)' : 'var(--tg-button-color)',
              color: 'var(--tg-button-text-color)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Download size={18} />
            {downloading ? 'Скачивание...' : 'Скачать QR-код'}
          </button>
        </motion.div>
      )}

      {/* Кнопки действий */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}
      >
        <button
          onClick={handleShareTelegram}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #0088cc, #0066aa)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0, 136, 204, 0.3)'
          }}
        >
          <Share size={20} />
          Поделиться в Telegram
        </button>
      </motion.div>

      {/* Кнопка закрыть */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        onClick={handleClose}
        style={{
          width: '100%',
          backgroundColor: 'var(--tg-section-bg-color)',
          color: 'var(--tg-text-color)',
          border: '1px solid var(--tg-section-separator-color)',
          borderRadius: '16px',
          padding: '16px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s ease'
        }}
      >
        <X size={20} />
        Закрыть
      </motion.button>
    </div>
  );
};
