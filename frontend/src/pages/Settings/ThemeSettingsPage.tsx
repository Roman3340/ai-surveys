import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';

interface ThemeSettingsPageProps {}

const ThemeSettingsPage: React.FC<ThemeSettingsPageProps> = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useAppStore();
  const { hapticFeedback } = useTelegram();

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/settings'
  });

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    hapticFeedback?.light();
    setTheme(newTheme);
  };

  const themeOptions = [
    {
      value: 'system' as const,
      name: t('settings.theme.system.name'),
      description: t('settings.theme.system.description'),
      icon: Monitor
    },
    {
      value: 'light' as const,
      name: t('settings.theme.light.name'),
      description: t('settings.theme.light.description'),
      icon: Sun
    },
    {
      value: 'dark' as const,
      name: t('settings.theme.dark.name'),
      description: t('settings.theme.dark.description'),
      icon: Moon
    }
  ];

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
          {t('settings.theme.title')}
        </h1>
      </div>

      {/* Опции темы */}
      <div style={{ padding: '16px' }}>
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {themeOptions.map((option, index) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  backgroundColor: isSelected ? 'var(--tg-accent-text-color)' : 'transparent',
                  color: isSelected ? 'white' : 'var(--tg-text-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '16px',
                  borderTop: index > 0 ? '1px solid var(--tg-section-separator-color)' : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'var(--tg-hint-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={18} color={isSelected ? 'white' : 'var(--tg-text-color)'} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: '500' }}>{option.name}</div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'var(--tg-hint-color)',
                    marginTop: '2px'
                  }}>
                    {option.description}
                  </div>
                </div>
                {isSelected && (
                  <Check size={18} color="white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemeSettingsPage;
