import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Copy, Share, X } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useAppStore } from '../../store/useAppStore';

export const SurveyPublishedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hapticFeedback } = useTelegram();
  const { getSurveyShareLink, isLoading } = useAppStore();
  
  const [shareData, setShareData] = useState<{
    share_url: string;
    qr_code: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const surveyId = searchParams.get('surveyId');

  useEffect(() => {
    if (surveyId) {
      loadShareData();
    }
  }, [surveyId]);

  const loadShareData = async () => {
    if (!surveyId) return;
    
    try {
      const data = await getSurveyShareLink(surveyId);
      setShareData(data);
    } catch (err) {
      console.error('Ошибка загрузки данных для распространения:', err);
      setError('Не удалось загрузить данные для распространения');
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
    if (!shareData?.share_url) return;
    
    hapticFeedback?.light();
    
    // Открываем Telegram для шаринга
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.share_url)}&text=${encodeURIComponent('Пройдите мой опрос!')}`;
    window.open(telegramUrl, '_blank');
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
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          ⏳
        </div>
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
      {/* Заголовок */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>
          ✅
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: '0 0 8px 0',
          color: 'var(--tg-text-color)'
        }}>
          Опрос опубликован!
        </h1>
        <p style={{
          fontSize: '16px',
          color: 'var(--tg-hint-color)',
          margin: '0',
          lineHeight: '1.4'
        }}>
          Теперь вы можете поделиться ссылкой с участниками
        </p>
      </div>

      {/* Ссылка для распространения */}
      <div style={{
        backgroundColor: 'var(--tg-section-bg-color)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 12px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔗 Ссылка для распространения
        </h3>
        
        <div style={{
          backgroundColor: 'var(--tg-bg-color)',
          border: '1px solid var(--tg-section-separator-color)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
          wordBreak: 'break-all',
          fontSize: '14px',
          color: 'var(--tg-hint-color)'
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
            borderRadius: '8px',
            padding: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.2s ease'
          }}
        >
          {copied ? (
            <>
              <CheckCircle size={16} />
              Скопировано!
            </>
          ) : (
            <>
              <Copy size={16} />
              Копировать ссылку
            </>
          )}
        </button>
      </div>

      {/* QR-код */}
      {shareData?.qr_code && (
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            📱 QR-код
          </h3>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <img 
              src={shareData.qr_code} 
              alt="QR код для опроса"
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                borderRadius: '8px'
              }}
            />
          </div>
          
          <p style={{
            fontSize: '14px',
            color: 'var(--tg-hint-color)',
            margin: '0',
            lineHeight: '1.4'
          }}>
            Отсканируйте QR-код для быстрого доступа к опросу
          </p>
        </div>
      )}

      {/* Кнопки действий */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={handleShareTelegram}
          style={{
            width: '100%',
            backgroundColor: '#0088cc',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Share size={20} />
          Поделиться в Telegram
        </button>
      </div>

      {/* Кнопка закрыть */}
      <button
        onClick={handleClose}
        style={{
          width: '100%',
          backgroundColor: 'var(--tg-section-bg-color)',
          color: 'var(--tg-text-color)',
          border: 'none',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <X size={20} />
        Закрыть
      </button>
    </div>
  );
};
