import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import type { AppColor } from '../../types';

interface ColorSettingsPageProps {}

const ColorSettingsPage: React.FC<ColorSettingsPageProps> = () => {
  const { t } = useTranslation();
  const { color, setColor } = useAppStore();
  const { hapticFeedback } = useTelegram();

  // Используем стабильный хук для кнопки назад
  useStableBackButton({
    targetRoute: '/settings'
  });

  const handleColorChange = (newColor: AppColor) => {
    hapticFeedback?.light();
    setColor(newColor);
  };

  const colorOptions: Array<{ value: AppColor; name: string; color: string }> = [
    {
      value: 'orange',
      name: t('settings.color.colors.orange'),
      color: '#F46D00'
    },
    {
      value: 'dark-green',
      name: t('settings.color.colors.dark-green'),
      color: '#2D8659'
    },
    {
      value: 'blue',
      name: t('settings.color.colors.blue'),
      color: '#007AFF'
    },
    {
      value: 'burgundy',
      name: t('settings.color.colors.burgundy'),
      color: '#8B1538'
    },
    {
      value: 'purple',
      name: t('settings.color.colors.purple'),
      color: '#AF52DE'
    },
    {
      value: 'teal',
      name: t('settings.color.colors.teal'),
      color: '#00C2D4'
    },
    {
      value: 'pink',
      name: t('settings.color.colors.pink'),
      color: '#FF2D55'
    },
    {
      value: 'cyan',
      name: t('settings.color.colors.cyan'),
      color: '#5AC8FA'
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
          {t('settings.color.title')}
        </h1>
      </div>

      {/* Опции цвета */}
      <div style={{ padding: '16px' }}>
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {colorOptions.map((option, index) => {
            const isSelected = color === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => handleColorChange(option.value)}
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
                  backgroundColor: option.color,
                  border: isSelected ? '2px solid white' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isSelected && (
                    <Check size={18} color="white" />
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: '500' }}>{option.name}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ColorSettingsPage;

