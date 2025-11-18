import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Sun, Moon, Globe, Trash2, Paintbrush } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import CenteredPageContainer from '../../components/layout/CenteredPageContainer';

interface SettingsPageProps {}

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme } = useAppStore();
  const { hapticFeedback } = useTelegram();

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/'
  });

  // Прокрутка к верху при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleThemeSelect = () => {
    hapticFeedback?.light();
    navigate('/settings/theme');
  };

  const handleLanguageSelect = () => {
    hapticFeedback?.light();
    navigate('/settings/language');
  };

  const handleColorSelect = () => {
    hapticFeedback?.light();
    navigate('/settings/color');
  };

  const handleClearCache = () => {
    hapticFeedback?.medium();
    if (window.confirm(t('settings.cache.confirmTitle'))) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const getCurrentThemeName = () => {
    switch (theme) {
      case 'light': return t('settings.theme.light.name');
      case 'dark': return t('settings.theme.dark.name');
      case 'system': return t('settings.theme.system.name');
      default: return t('settings.theme.system.name');
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
      <CenteredPageContainer>
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
          {t('settings.title')}
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
              background: 'var(--tg-button-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {theme === 'dark' ? <Moon size={18} color="white" /> : <Sun size={18} color="white" />}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: '500' }}>{t('settings.theme.name')}</div>
              <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>{getCurrentThemeName()}</div>
            </div>
            <ChevronRight size={18} color="var(--tg-hint-color)" />
          </button>
        </div>

        {/* Цвет */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <button
            onClick={handleColorSelect}
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
              background: 'var(--tg-button-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Paintbrush size={18} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: '500' }}>{t('settings.color.name')}</div>
              <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>{t('settings.color.description')}</div>
            </div>
            <ChevronRight size={18} color="var(--tg-hint-color)" />
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
              background: 'var(--tg-button-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Globe size={18} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: '500' }}>{t('settings.language.name')}</div>
              <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>{t('settings.language.description')}</div>
            </div>
            <ChevronRight size={18} color="var(--tg-hint-color)" />
          </button>
        </div>

        {/* Очистка кэша */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          overflow: 'hidden'
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
              background: 'var(--tg-button-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trash2 size={18} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: '500' }}>{t('settings.cache.name')}</div>
              <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>{t('settings.cache.description')}</div>
            </div>
            <ChevronRight size={18} color="var(--tg-hint-color)" />
          </button>
        </div>
      </div>
      </CenteredPageContainer>
    </div>
  );
};

export default SettingsPage;
