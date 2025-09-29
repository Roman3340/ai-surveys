import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sun, Moon, Globe, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTelegram } from '../../hooks/useTelegram';

interface SettingsPageProps {}

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const navigate = useNavigate();
  const { theme } = useAppStore();
  const { backButton, hapticFeedback } = useTelegram();

  // Настройка нативной кнопки назад Telegram
  useEffect(() => {
    if (backButton) {
      const handleBackClick = () => {
        navigate('/', { replace: true });
      };

      backButton.show();
      backButton.onClick(handleBackClick);

      return () => {
        backButton.offClick(handleBackClick);
        backButton.hide();
      };
    }
  }, [backButton, navigate]);

  const handleThemeSelect = () => {
    hapticFeedback?.light();
    navigate('/settings/theme');
  };

  const handleLanguageSelect = () => {
    hapticFeedback?.light();
    navigate('/settings/language');
  };

  const handleClearCache = () => {
    hapticFeedback?.medium();
    if (window.confirm('Очистить кэш приложения? Все локальные данные будут удалены.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const getCurrentThemeName = () => {
    switch (theme) {
      case 'light': return 'Светлая';
      case 'dark': return 'Тёмная';
      case 'system': return 'Системная';
      default: return 'Системная';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      paddingBottom: '100px'
    }}>
      {/* Заголовок */}
      <div style={{
        padding: '20px 16px',
        textAlign: 'center',
        borderBottom: '1px solid var(--tg-section-separator-color)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: 0,
          color: 'var(--tg-text-color)'
        }}>
          Настройки
        </h1>
      </div>

      {/* Настройки */}
      <div style={{ padding: '16px' }}>
        
        {/* Тема */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <button
            onClick={handleThemeSelect}
            style={{
              width: '100%',
              padding: '16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--tg-text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {theme === 'dark' ? 
                <Moon size={18} color="white" /> : 
                <Sun size={18} color="white" />
              }
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: '500' }}>Тема</div>
              <div style={{ 
                fontSize: '14px', 
                color: 'var(--tg-hint-color)',
                marginTop: '2px'
              }}>
                {getCurrentThemeName()}
              </div>
            </div>
            <ChevronRight size={20} color="var(--tg-hint-color)" />
          </button>
        </div>

        {/* Язык */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <button
            onClick={handleLanguageSelect}
            style={{
              width: '100%',
              padding: '16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--tg-text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Globe size={18} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: '500' }}>Язык</div>
              <div style={{ 
                fontSize: '14px', 
                color: 'var(--tg-hint-color)',
                marginTop: '2px'
              }}>
                RU Русский
              </div>
            </div>
            <ChevronRight size={20} color="var(--tg-hint-color)" />
          </button>
        </div>

        {/* Очистить кэш */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <button
            onClick={handleClearCache}
            style={{
              width: '100%',
              padding: '16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--tg-text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#ff4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trash2 size={18} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: '500' }}>Очистить кэш</div>
              <div style={{ 
                fontSize: '14px', 
                color: 'var(--tg-hint-color)',
                marginTop: '2px'
              }}>
                Удалить все локальные данные
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
