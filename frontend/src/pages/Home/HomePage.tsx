import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, HelpCircle, BarChart3, Users, Trash2 } from 'lucide-react';
import { AnimatedTabs } from '../../components/ui/AnimatedTabs';
import { useTelegram } from '../../hooks/useTelegram';
import { useAppStore } from '../../store/useAppStore';
import type { Survey } from '../../types';

export const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: telegramUser, hapticFeedback } = useTelegram();
  const { user, userSurveys, participatedSurveys, setUser, loadUserSurveys, loadParticipatedSurveys, isLoading, error } = useAppStore();
  const [activeTab, setActiveTab] = useState<'created' | 'participated'>('created');
  const [showAllSurveys, setShowAllSurveys] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ survey: Survey | null; show: boolean }>({ survey: null, show: false });

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
    loadParticipatedSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

  const handleViewTemplates = () => {
    hapticFeedback?.light();
    navigate('/templates');
    // Прокручиваем к верху при переходе
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleViewKnowledgeBase = () => {
    hapticFeedback?.light();
    navigate('/knowledge');
  };

  const handleDeleteSurvey = (survey: Survey) => {
    hapticFeedback?.light();
    setDeleteConfirm({ survey, show: true });
  };

  const confirmDeleteSurvey = async () => {
    if (!deleteConfirm.survey) return;
    
    try {
      const { surveyApi } = await import('../../services/api');
      await surveyApi.deleteSurvey(deleteConfirm.survey.id);
      
      // Перезагружаем список опросов
      await loadUserSurveys();
      
      setDeleteConfirm({ survey: null, show: false });
      hapticFeedback?.success();
    } catch (error) {
      console.error('Ошибка при удалении опроса:', error);
      hapticFeedback?.error();
    }
  };

  const cancelDeleteSurvey = () => {
    setDeleteConfirm({ survey: null, show: false });
    hapticFeedback?.light();
  };

  const handleShowAllSurveys = () => {
    hapticFeedback?.light();
    setShowAllSurveys(true);
  };

  // Для таба "Где участвую" показываем только уникальные опросы
  const getUniqueParticipatedSurveys = (surveys: any[]) => {
    const uniqueSurveys = new Map();
    surveys.forEach(survey => {
      if (!uniqueSurveys.has(survey.id)) {
        uniqueSurveys.set(survey.id, survey);
      }
    });
    return Array.from(uniqueSurveys.values());
  };

  const displayedSurveys = activeTab === 'created' 
    ? userSurveys 
    : getUniqueParticipatedSurveys(participatedSurveys);

  const tabs = [
    { id: 'created' as const, label: t('home.tabs.created') },
    { id: 'participated' as const, label: t('home.tabs.participated') }
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
    <>
      <style>
        {`
          @keyframes lightray {
            0% {
              left: -100%;
            }
            100% {
              left: 200%;
            }
          }
        `}
      </style>
      <div style={{
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        minHeight: '100vh',
        padding: '0'
      }}>
      {/* Шапка с приветствием */}
      <div style={{
        padding: '4px 16px 16px 16px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          👋 {t('home.greeting', { name: user?.firstName || telegramUser?.firstName || 'Роман' })}
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
            {t('home.subtitle')}
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
            <span style={{ fontSize: '12px', fontWeight: '500' }}>{t('home.upgradeStatus')}</span>
            <div style={{
              fontSize: '10px',
              background: 'var(--tg-button-gradient)',
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
            background: 'var(--tg-button-gradient)',
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
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, hsla(0, 0%, 100%, 0.3), transparent)',
              animation: 'lightray 1.5s infinite'
            }}
          />
          ⚡ {t('home.newSurvey')}
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
        {/* Шаблоны опросов */}
        <div style={{
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer'
        }}
        onClick={handleViewTemplates}>
          <div style={{
            fontSize: '24px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            📋
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '2px'
            }}>
              {t('home.templates.title')}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)'
            }}>
              {t('home.templates.description')}
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
        }}
        onClick={handleViewKnowledgeBase}>
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
              {t('home.knowledgeBase.title')}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)'
            }}>
              {t('home.knowledgeBase.description')}
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
            📊 {t('home.surveys')}
          </h2>
          <button 
            onClick={handleShowAllSurveys}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tg-link-color)',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
            {t('home.all')}
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
                {t('home.loading')}
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
                🔄 {t('home.retry')}
              </button>
            </div>
          ) : displayedSurveys.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayedSurveys.slice(0, 3).map((survey) => (
                <div
                  key={survey.id}
                  onClick={activeTab === 'created' ? () => handleViewAnalytics(survey) : undefined}
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
                    {activeTab === 'created' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSurvey(survey);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FF3B30',
                          cursor: 'pointer',
                          padding: '4px',
                          marginLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--tg-hint-color)'
                    }}>
                      {activeTab === 'created' 
                        ? formatDate(survey.publishedAt || survey.createdAt)
                        : formatDate((survey as any).completed_at)
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
                          {survey.questions.length} {t('home.survey.questions')}
                        </div>
                        {(() => {
                          const statusMap: Record<string, { text: string; color: string }> = {
                            active: { text: t('home.survey.status.active'), color: '#34C759' },
                            draft: { text: t('home.survey.status.draft'), color: '#8E8E93' },
                            completed: { text: t('home.survey.status.completed'), color: '#FF6B6B' },
                            archived: { text: t('home.survey.status.archived'), color: '#FF9500' }
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
                        {(survey as any).questions_count || survey.questions?.length || 0} {t('home.survey.questions')}
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
                  ? t('home.empty.created')
                  : t('home.empty.participated')
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
                  📊 {t('home.empty.createButton')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>


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
          {t('home.buttons.settings')}
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
          {t('home.buttons.support')}
        </button>
      </div>

      {/* Popup подтверждения удаления */}
      {deleteConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--tg-bg-color)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '320px',
            width: '100%'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: '0 0 12px 0',
              color: 'var(--tg-text-color)'
            }}>
              {t('home.popup.deleteTitle')}
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)',
              margin: '0 0 20px 0',
              lineHeight: '1.4'
            }}>
              {t('home.popup.deleteMessage', { title: deleteConfirm.survey?.title })}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={cancelDeleteSurvey}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {t('home.popup.cancel')}
              </button>
              <button
                onClick={confirmDeleteSurvey}
                style={{
                  flex: 1,
                  backgroundColor: '#FF3B30',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {t('home.popup.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup всех опросов */}
      {showAllSurveys && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--tg-bg-color)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: 0,
                color: 'var(--tg-text-color)'
              }}>
                {activeTab === 'created' ? t('home.popup.allCreated') : t('home.popup.allParticipated')}
              </h3>
              <button
                onClick={() => setShowAllSurveys(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--tg-hint-color)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayedSurveys.map((survey) => (
                <div
                  key={survey.id}
                  onClick={activeTab === 'created' ? () => {
                    setShowAllSurveys(false);
                    handleViewAnalytics(survey);
                  } : undefined}
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
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: 0,
                      flex: 1,
                      lineHeight: '1.3'
                    }}>
                      {survey.title}
                    </h4>
                    {activeTab === 'created' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSurvey(survey);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FF3B30',
                          cursor: 'pointer',
                          padding: '4px',
                          marginLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--tg-hint-color)',
                    marginBottom: '8px'
                  }}>
                    {activeTab === 'created' 
                      ? formatDate(survey.publishedAt || survey.createdAt)
                      : formatDate((survey as any).completed_at)
                    }
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
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
                          {survey.questions.length} {t('home.survey.questions')}
                        </div>
                        {(() => {
                          const statusMap: Record<string, { text: string; color: string }> = {
                            active: { text: t('home.survey.status.active'), color: '#34C759' },
                            draft: { text: t('home.survey.status.draft'), color: '#8E8E93' },
                            completed: { text: t('home.survey.status.completed'), color: '#FF6B6B' },
                            archived: { text: t('home.survey.status.archived'), color: '#FF9500' }
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
                        {(survey as any).questions_count || survey.questions?.length || 0} {t('home.survey.questions')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};