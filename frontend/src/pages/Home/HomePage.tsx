import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, HelpCircle, BarChart3, Users } from 'lucide-react';
import { AnimatedTabs } from '../../components/ui/AnimatedTabs';
import { useTelegram } from '../../hooks/useTelegram';
import { useAppStore } from '../../store/useAppStore';
import type { Survey } from '../../types';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user: telegramUser, hapticFeedback } = useTelegram();
  const { user, userSurveys, participatedSurveys, setUser, loadUserSurveys, loadParticipatedSurveys, isLoading, error } = useAppStore();
  const [activeTab, setActiveTab] = useState<'created' | 'participated'>('created');

  // Создание пользователя из Telegram данных
  useEffect(() => {
    if (telegramUser && !user) {
      const newUser = {
        id: Date.now(),
        telegramId: telegramUser.id,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName,
        username: telegramUser.username,
        createdAt: new Date().toISOString(),
      };
      setUser(newUser);
    }
  }, [telegramUser, user, setUser]);

  // Загрузка опросов пользователя
  useEffect(() => {
    // Загружаем список один раз на монтировании,
    // и повторно после успешной авторизации (см. кнопку Авторизоваться)
    loadUserSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Загрузка опросов участия после авторизации
  useEffect(() => {
    if (user && user.telegramId) {
      // Добавляем небольшую задержку, чтобы авторизация точно завершилась
      const timer = setTimeout(() => {
        loadParticipatedSurveys();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, loadParticipatedSurveys]);


  const handleCreateSurvey = () => {
    hapticFeedback?.light();
    navigate('/survey/create');
  };

  const handleSettings = () => {
    hapticFeedback?.light();
    navigate('/settings');
    // Прокручиваем к верху при переходе
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleViewAnalytics = (survey: Survey) => {
    hapticFeedback?.light();
    navigate(`/survey/${survey.id}`);
  };

  const handleViewParticipatedSurvey = () => {
    // Опросы участия не кликабельны
    hapticFeedback?.light();
  };

  const handleViewTopSurveys = () => {
    hapticFeedback?.light();
    console.log('Топ опросов');
  };

  const displayedSurveys = activeTab === 'created' ? userSurveys : participatedSurveys;

  const tabs = [
    { id: 'created' as const, label: 'Созданные' },
    { id: 'participated' as const, label: 'Где участвую?' }
  ];

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div style={{
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      minHeight: '100vh',
      padding: '0'
    }}>
      {/* Шапка с приветствием */}
      <div style={{
        padding: '24px 16px 16px 16px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          👋 Привет, {user?.firstName || telegramUser?.firstName || 'Роман'}!
        </h1>
      </div>

      {/* Кнопки действий */}
      <div style={{ padding: '0 16px' }}>
        {/* Приветствие и кнопка статуса */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--tg-hint-color)' }}>
            Создавай опросы и получай ценные инсайты
          </div>
          
          {/* Маленькая кнопка "Повысить статус" */}
          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid var(--tg-section-separator-color)'
          }}
          onClick={() => {
            hapticFeedback?.light();
            console.log('Повысить статус');
          }}>
            <span style={{ fontSize: '14px' }}>💎</span>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Повысить статус</span>
            <div style={{
              fontSize: '10px',
              background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              NEW
            </div>
          </div>
        </div>

        {/* Главная кнопка "Новый опрос" */}
        <button
          onClick={handleCreateSurvey}
          style={{
            width: '100%',
            background: 'linear-gradient(0deg, rgb(244, 109, 0) 0%, rgb(244, 109, 0) 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '30px',
            transition: 'transform 0.1s ease',
            marginBottom: '24px'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          ⚡ Новый опрос
        </button>
      </div>

      {/* Информационные блоки */}
      <div style={{
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Топ опросов */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer'
        }}
        onClick={handleViewTopSurveys}>
          <div style={{
            fontSize: '24px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            ⚡
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '2px'
            }}>
              Топ опросов
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)'
            }}>
              Популярные опросы сообщества
            </div>
          </div>
        </div>

        {/* База знаний */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer'
        }}>
          <div style={{
            fontSize: '24px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            📚
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '2px'
            }}>
              База знаний
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)'
            }}>
              Как собрать качественную обратную связь
            </div>
          </div>
        </div>
      </div>

      {/* Секция "Опросы" с табами */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Опросы
          </h2>
          <button style={{
            background: 'none',
            border: 'none',
            color: 'var(--tg-link-color)',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: '500'
          }}>
            Все
          </button>
        </div>

        {/* Табы */}
        <AnimatedTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId: string) => setActiveTab(tabId as 'created' | 'participated')}
        />

        {/* Список опросов */}
        <div style={{ marginTop: '16px' }}>
          {isLoading ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--tg-hint-color)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                ⏳
              </div>
              <p style={{
                fontSize: '16px',
                margin: '0',
                lineHeight: '1.4'
              }}>
                Загрузка опросов...
              </p>
            </div>
          ) : error ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--tg-hint-color)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                ❌
              </div>
              <p style={{
                fontSize: '16px',
                margin: '0 0 20px 0',
                lineHeight: '1.4'
              }}>
                {error}
              </p>
              <button 
                onClick={() => loadUserSurveys()} 
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
                🔄 Попробовать снова
              </button>
            </div>
          ) : displayedSurveys.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayedSurveys.slice(0, 3).map((survey) => (
                <div
                  key={survey.id}
                  onClick={activeTab === 'created' ? () => handleViewAnalytics(survey) : handleViewParticipatedSurvey}
                  style={{
                    backgroundColor: 'var(--tg-section-bg-color)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: activeTab === 'created' ? 'pointer' : 'default',
                    transition: 'transform 0.1s ease'
                  }}
                  onMouseDown={activeTab === 'created' ? (e) => e.currentTarget.style.transform = 'scale(0.98)' : undefined}
                  onMouseUp={activeTab === 'created' ? (e) => e.currentTarget.style.transform = 'scale(1)' : undefined}
                  onMouseLeave={activeTab === 'created' ? (e) => e.currentTarget.style.transform = 'scale(1)' : undefined}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: 0,
                      flex: 1,
                      lineHeight: '1.3'
                    }}>
                      {survey.title}
                    </h3>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--tg-hint-color)',
                      marginLeft: '12px',
                      whiteSpace: 'nowrap'
                    }}>
                      {activeTab === 'created' 
                        ? formatDate(survey.publishedAt || survey.createdAt)
                        : formatDate((survey as any).participated_at)
                      }
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '8px'
                  }}>
                    {activeTab === 'created' ? (
                      <>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '14px',
                          color: 'var(--tg-hint-color)'
                        }}>
                          <Users size={14} />
                          {survey.responsesCount ?? survey.responses?.length ?? 0}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '14px',
                          color: 'var(--tg-hint-color)'
                        }}>
                          <BarChart3 size={14} />
                          {survey.questions.length} вопр.
                        </div>
                        {(() => {
                          const statusMap: Record<string, { text: string; color: string }> = {
                            active: { text: 'Активен', color: '#34C759' },
                            draft: { text: 'Черновик', color: '#8E8E93' },
                            completed: { text: 'Завершён', color: '#FF6B6B' },
                            archived: { text: 'Архив', color: '#FF9500' }
                          };
                          const statusInfo = statusMap[survey.status] || { text: survey.status, color: '#8E8E93' };
                          return (
                            <div style={{
                              backgroundColor: statusInfo.color,
                              color: 'white',
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: '500'
                            }}>
                              {statusInfo.text}
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '14px',
                        color: 'var(--tg-hint-color)'
                      }}>
                        <BarChart3 size={14} />
                        {survey.questions.length} вопр.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--tg-hint-color)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {activeTab === 'created' ? '📝' : '📋'}
              </div>
              <p style={{
                fontSize: '16px',
                margin: '0 0 20px 0',
                lineHeight: '1.4'
              }}>
                {activeTab === 'created' 
                  ? 'Создайте свой первый опрос'
                  : 'Вы еще не участвовали в опросах'
                }
              </p>
              {activeTab === 'created' && (
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
                  📊 Создать опрос
                </button>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Подробнее */}
      {displayedSurveys.length > 3 && (
        <div style={{
          padding: '16px',
          textAlign: 'center'
        }}>
          <button style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            color: 'var(--tg-text-color)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            width: '100%'
          }}>
            Подробнее
          </button>
        </div>
      )}

      {/* Нижняя панель с кнопками */}
      <div style={{
        padding: '20px 16px 40px 16px',
        marginTop: '20px',
        borderTop: '1px solid var(--tg-section-separator-color)',
        display: 'flex',
        gap: '12px'
      }}>
        <button 
          onClick={handleSettings}
          style={{
          flex: 1,
          backgroundColor: 'var(--tg-section-bg-color)',
          color: 'var(--tg-text-color)',
          border: 'none',
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '17px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Settings size={20} />
          Настройки
        </button>
        <button style={{
          flex: 1,
          backgroundColor: 'var(--tg-section-bg-color)',
          color: 'var(--tg-text-color)',
          border: 'none',
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '17px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <HelpCircle size={20} />
          Поддержка
        </button>
      </div>
    </div>
  );
};