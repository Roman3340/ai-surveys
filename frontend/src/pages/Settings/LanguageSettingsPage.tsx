import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';

interface LanguageSettingsPageProps {}

const LanguageSettingsPage: React.FC<LanguageSettingsPageProps> = () => {
  const navigate = useNavigate();
  const { backButton, hapticFeedback } = useTelegram();
  const [selectedLanguage, setSelectedLanguage] = useState('ru');

  // Настройка нативной кнопки назад Telegram
  useEffect(() => {
    if (backButton) {
      const handleBackClick = () => {
        navigate('/settings', { replace: true });
      };

      backButton.show();
      backButton.onClick(handleBackClick);

      return () => {
        backButton.offClick(handleBackClick);
        backButton.hide();
      };
    }
  }, [backButton, navigate]);

  const handleLanguageChange = (langCode: string) => {
    hapticFeedback?.light();
    setSelectedLanguage(langCode);
    // Здесь можно добавить логику для сохранения языка в store
  };

  const languageOptions = [
    {
      code: 'ru',
      name: 'RU Русский',
      englishName: 'Russian'
    },
    {
      code: 'en',
      name: 'US English',
      englishName: 'English'
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
          Язык
        </h1>
      </div>

      {/* Опции языка */}
      <div style={{ padding: '16px' }}>
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {languageOptions.map((option, index) => {
            const isSelected = selectedLanguage === option.code;
            
            return (
              <button
                key={option.code}
                onClick={() => handleLanguageChange(option.code)}
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
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: '500' }}>{option.name}</div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'var(--tg-hint-color)',
                    marginTop: '2px'
                  }}>
                    {option.englishName}
                  </div>
                </div>
                {isSelected && (
                  <Check size={20} color="white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LanguageSettingsPage;
