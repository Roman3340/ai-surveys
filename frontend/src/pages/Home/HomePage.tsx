import { useEffect, useState } from 'react';
import { Plus, Monitor, Settings, HelpCircle } from 'lucide-react';
import { AnimatedTabs } from '../../components/ui/AnimatedTabs';
import { useTelegram } from '../../hooks/useTelegram';
import { useAppStore } from '../../store/useAppStore';
import { isTelegramEnvironment } from '../../utils/mockTelegram';
import type { Survey } from '../../types';

export const HomePage = () => {
  const { user: telegramUser, hapticFeedback, theme } = useTelegram();
  const { user, userSurveys, participatedSurveys, setUser, setTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<'created' | 'participated'>('created');

  // Синхронизация темы с Telegram
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  // Создание пользователя из Telegram данных
  useEffect(() => {
    if (telegramUser && !user) {
      const newUser = {
        id: Date.now(), // Временно, пока нет бэкенда
        telegramId: telegramUser.id,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName,
        username: telegramUser.username,
        createdAt: new Date().toISOString(),
      };
      setUser(newUser);
    }
  }, [telegramUser, user, setUser]);

  const handleCreateSurvey = () => {
    hapticFeedback.light();
    // TODO: Навигация к созданию опроса
    console.log('Создание опроса');
  };

  const handleViewAnalytics = (survey: Survey) => {
    hapticFeedback.light();
    // TODO: Навигация к аналитике
    console.log('Просмотр аналитики для:', survey.title);
  };

  const handleViewTopSurveys = () => {
    hapticFeedback.light();
    // TODO: Навигация к топу опросов
    console.log('Топ опросов');
  };

  const displayedSurveys = activeTab === 'created' ? userSurveys : participatedSurveys;
  const recentSurveys = displayedSurveys.slice(0, 3);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--tg-bg-color)' }}>
      {/* Заголовок */}
      <div style={{ 
        backgroundColor: 'var(--tg-bg-color)', 
        padding: '32px 16px 24px 16px'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: 'var(--tg-text-color)',
          margin: '0 0 4px 0'
        }}>
          👋 Привет, {user?.firstName || 'Пользователь'}!
        </h1>
        <p style={{ 
          fontSize: '15px', 
          color: 'var(--tg-hint-color)',
          margin: '0 0 24px 0'
        }}>
          Создавайте опросы и получайте ценные инсайты
        </p>
        {/* Индикатор среды разработки */}
        {!isTelegramEnvironment() && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#8e8e93'
          }}>
            <Monitor style={{ width: '12px', height: '12px' }} />
            Режим разработки в браузере
            <span style={{ color: '#8b5cf6' }}>• DevTools справа внизу</span>
          </div>
        )}
        
        {/* Главная кнопка создания в шапке */}
        <button
          onClick={handleCreateSurvey}
          style={{
            width: '100%',
            backgroundColor: 'var(--tg-button-color)',
            color: 'var(--tg-button-text-color)',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '17px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          ⚡ Новый опрос
        </button>
      </div>

      {/* Основной контент */}
      <main style={{ padding: '0 16px 16px 16px' }}>

        {/* Дополнительные действия */}
        <button
          onClick={handleViewTopSurveys}
          style={{
            width: '100%',
            backgroundColor: 'var(--tg-section-bg-color)',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontSize: '28px' }}>⚡</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              fontSize: '17px',
              fontWeight: '600',
              color: 'var(--tg-text-color)',
              margin: '0 0 2px 0'
            }}>
              Топ опросов
            </h3>
            <p style={{ 
              fontSize: '13px',
              color: 'var(--tg-hint-color)',
              margin: 0
            }}>
              Популярные опросы сообщества
            </p>
          </div>
        </button>

        {/* Мои опросы */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            paddingLeft: '4px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--tg-text-color)',
              margin: 0
            }}>
              📊 Опросы
            </h2>
            {displayedSurveys.length > 3 && (
              <button style={{
                color: 'var(--tg-link-color)',
                fontSize: '15px',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}>
                Все
              </button>
            )}
          </div>

          {/* Вкладки */}
          <AnimatedTabs
            tabs={[
              { id: 'created', label: 'Созданные' },
              { id: 'participated', label: 'Где участвую?' }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => {
              setActiveTab(tabId as 'created' | 'participated');
              hapticFeedback.selection();
            }}
            style={{ marginBottom: '16px' }}
          />

          {recentSurveys.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--tg-section-bg-color)',
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{
                fontSize: '17px',
                fontWeight: '600',
                color: 'var(--tg-text-color)',
                margin: '0 0 8px 0'
              }}>
                {activeTab === 'created' ? 'Пока нет созданных опросов' : 'Пока что нет активных опросов'}
              </h3>
              <p style={{
                fontSize: '13px',
                color: 'var(--tg-hint-color)',
                margin: '0 0 24px 0',
                lineHeight: '18px'
              }}>
                {activeTab === 'created' 
                  ? 'Создайте свой первый опрос, чтобы начать собирать обратную связь'
                  : 'Участвуйте в опросах других пользователей'
                }
              </p>
              <button 
                onClick={handleCreateSurvey} 
                style={{
                  backgroundColor: 'var(--tg-button-color)',
                  color: 'var(--tg-button-text-color)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                Создать опрос
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentSurveys.map((survey) => (
                <button
                  key={survey.id}
                  onClick={() => handleViewAnalytics(survey)}
                  style={{
                    backgroundColor: 'var(--tg-section-bg-color)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ fontSize: '24px' }}>📊</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: 'var(--tg-text-color)',
                        margin: '0 0 4px 0'
                      }}>
                        {survey.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          backgroundColor: survey.isPublished ? '#e8f5e8' : '#fff8e1',
                          color: survey.isPublished ? '#2e7d32' : '#f57c00',
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          {survey.isPublished ? 'Завершен' : 'Черновик'}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--tg-hint-color)'
                        }}>
                          {survey.responses?.length || 0} ответов
                        </span>
                      </div>
                    </div>
                  </div>
                  <span style={{
                    color: 'var(--tg-link-color)',
                    fontSize: '13px',
                    fontWeight: '400'
                  }}>
                    Подробнее
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Нижняя панель */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '32px',
          paddingBottom: '16px'
        }}>
          <button 
            onClick={() => {
              hapticFeedback.light();
              console.log('Настройки');
            }}
            style={{
              flex: 1,
              backgroundColor: 'var(--tg-section-bg-color)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--tg-text-color)'
            }}
          >
            <Settings style={{ width: '20px', height: '20px' }} />
            Настройки
          </button>
          
          <button 
            onClick={() => {
              hapticFeedback.light();
              console.log('Поддержка');
            }}
            style={{
              flex: 1,
              backgroundColor: 'var(--tg-section-bg-color)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--tg-text-color)'
            }}
          >
            <HelpCircle style={{ width: '20px', height: '20px' }} />
            Поддержка
          </button>
        </div>
      </main>
    </div>
  );
};
