import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { surveyApi } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';

interface SurveyPublicData {
  id: string;
  title: string;
  description?: string;
  status: string;
  maxParticipants?: number;
  settings: any;
  questions: any[];
  creatorUsername?: string;
  creatorTelegramId: number;
  responsesCount: number;
  canParticipate: boolean;
  participationMessage?: string;
}

export default function SurveyInvitePage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { user, hapticFeedback, isReady } = useTelegram();
  
  const [survey, setSurvey] = useState<SurveyPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<string | null>(null);

  useEffect(() => {
    const loadSurvey = async () => {
      if (!surveyId) return;
      
      // Ждем пока Telegram WebApp инициализируется
      if (!isReady) return;
      
      try {
        setLoading(true);
        const response = await surveyApi.getSurveyPublic(surveyId, user?.id);
        setSurvey(response);
      } catch (e: any) {
        console.error(e);
        setError(e?.response?.data?.detail || 'Не удалось загрузить опрос');
      } finally {
        setLoading(false);
      }
    };
    loadSurvey();
  }, [surveyId, user, isReady]);

  const handleParticipate = () => {
    if (!survey?.canParticipate) {
      alert(survey?.participationMessage || 'Участие в опросе недоступно');
      return;
    }
    hapticFeedback?.medium();
    navigate(`/survey/${surveyId}/take`);
  };

  const handleContactCreator = () => {
    if (survey) {
      const url = survey.creatorUsername 
        ? `https://t.me/${survey.creatorUsername}` 
        : `tg://user?id=${survey.creatorTelegramId}`;
      window.open(url, '_blank');
      hapticFeedback?.light();
    }
  };

  const handlePopoverClick = (type: string) => {
    console.log('Popover clicked:', type); // Debug log
    setActivePopover(activePopover === type ? null : type);
    hapticFeedback?.light();
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--tg-bg-color)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid var(--tg-button-color)', 
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ color: 'var(--tg-hint-color)' }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--tg-bg-color)',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <p style={{ color: 'var(--tg-text-color)', fontSize: '16px', marginBottom: '8px' }}>
            Опрос не найден
          </p>
          <p style={{ color: 'var(--tg-hint-color)', fontSize: '14px', marginBottom: '24px' }}>
            {error}
          </p>
          
          {/* Дополнительный текст */}
          <p style={{
            fontSize: '12px',
            color: 'var(--tg-hint-color)',
            marginTop: '24px',
            lineHeight: '1.5'
          }}>
            Хотите создать свой опрос?
            <br />
            <button
              onClick={() => navigate('/')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--tg-link-color)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'none',
                padding: '0',
                margin: '0'
              }}
            >
              Откройте главную страницу AI Surveys
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setActivePopover(null)}
      style={{ 
        minHeight: '100vh', 
        background: 'var(--tg-bg-color)',
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}
      >
        {/* Анимированный эмодзи */}
        <div style={{ marginBottom: '24px' }}>
          <TelegramEmoji emoji="📝" size="large" />
        </div>

        {/* Название опроса */}
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: 'var(--tg-text-color)',
          marginBottom: '20px',
          lineHeight: '1.3'
        }}>
          {survey.title}
        </h1>

        {/* Хэштеги с настройками */}
        <div style={{ marginBottom: '20px', width: '100%' }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px', 
            justifyContent: 'center',
            marginBottom: '8px'
          }}>
            {/* Анонимность */}
            {survey.settings?.allowAnonymous && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('anonymous');
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('anonymous');
                  }}
                  style={{
                    background: 'rgba(52, 199, 89, 0.15)',
                    border: '1px solid rgba(52, 199, 89, 0.3)',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#34C759',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🔒 Анонимность
                </button>
                <AnimatePresence>
                  {activePopover === 'anonymous' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginLeft: '-90px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '12px',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        minWidth: '180px',
                        maxWidth: '250px',
                        textAlign: 'center'
                      }}
                    >
                      Ваши ответы будут анонимными
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Награда */}
            {survey.settings?.motivationEnabled && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('reward');
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('reward');
                  }}
                  style={{
                    background: 'rgba(255, 165, 0, 0.15)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#FF9500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🎁 Награда
                </button>
                <AnimatePresence>
                  {activePopover === 'reward' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginLeft: '-90px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '12px',
                        color: '#ffffff',
                        whiteSpace: 'normal',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        minWidth: '200px',
                        maxWidth: '280px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ marginBottom: '8px' }}>
                        {survey.settings.motivationType === 'discount' && `💰 ${survey.settings.motivationDetails || 'Скидка'}`}
                        {survey.settings.motivationType === 'promo' && `🛒 ${survey.settings.motivationDetails || 'Промокод'}`}
                        {survey.settings.motivationType === 'stars' && `⭐ ${survey.settings.motivationDetails || '50'} звёзд Telegram`}
                        {survey.settings.motivationType === 'gift' && `🎁 ${survey.settings.motivationDetails || 'Подарок'}`}
                        {survey.settings.motivationType === 'other' && survey.settings.motivationDetails}
                      </div>
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#a0a0a0',
                        lineHeight: '1.3',
                        borderTop: '1px solid #48484a',
                        paddingTop: '6px'
                      }}>
                        Все награды выдаются организаторами опроса. AI Surveys не участвует в их хранении и передаче.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Один ответ */}
            {survey.settings?.oneResponsePerUser && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('oneResponse');
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('oneResponse');
                  }}
                  style={{
                    background: 'rgba(0, 122, 255, 0.15)',
                    border: '1px solid rgba(0, 122, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#007AFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🔄 Один ответ
                </button>
                <AnimatePresence>
                  {activePopover === 'oneResponse' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginLeft: '-90px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '12px',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        minWidth: '180px',
                        maxWidth: '250px',
                        textAlign: 'center'
                      }}
                    >
                      Можно участвовать только один раз
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Случайный порядок */}
            {survey.settings?.randomizeQuestions && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('random');
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('random');
                  }}
                  style={{
                    background: 'rgba(255, 45, 85, 0.15)',
                    border: '1px solid rgba(255, 45, 85, 0.3)',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#FF2D55',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🎲 Случайный порядок
                </button>
                <AnimatePresence>
                  {activePopover === 'random' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginLeft: '-90px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '12px',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        minWidth: '180px',
                        maxWidth: '250px',
                        textAlign: 'center'
                      }}
                    >
                      Вопросы будут в случайном порядке
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Скрытый создатель */}
            {survey.settings?.hideCreator && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('hidden');
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePopoverClick('hidden');
                  }}
                  style={{
                    background: 'rgba(138, 43, 226, 0.15)',
                    border: '1px solid rgba(138, 43, 226, 0.3)',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#8A2BE2',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🎭 Скрытый создатель
                </button>
                <AnimatePresence>
                  {activePopover === 'hidden' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginLeft: '-90px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '12px',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        minWidth: '180px',
                        maxWidth: '250px',
                        textAlign: 'center'
                      }}
                    >
                      Создатель опроса предпочел скрыть свою личность
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Информативный хэштег - всегда показывается */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePopoverClick('info');
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePopoverClick('info');
                }}
                style={{
                  background: 'rgba(142, 142, 147, 0.15)',
                  border: '1px solid rgba(142, 142, 147, 0.3)',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#8E8E93',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ℹ️ Настройки
              </button>
              <AnimatePresence>
                {activePopover === 'info' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginLeft: '-150px',
                      marginBottom: '8px',
                      background: '#2c2c2e',
                      border: '1px solid #48484a',
                      borderRadius: '8px',
                      padding: '16px',
                      fontSize: '12px',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      zIndex: 9999,
                      minWidth: '300px',
                      maxWidth: '350px',
                      textAlign: 'left',
                      lineHeight: '1.5'
                    }}
                  >
                    <div style={{ marginBottom: '12px', fontWeight: '600', fontSize: '13px' }}>
                      Возможные настройки опросов:
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '8px 12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🔒 <span style={{ fontSize: '11px' }}>Анонимность</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                        Ваш аккаунт скрыт
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🎁 <span style={{ fontSize: '11px' }}>Награда</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                        Подарок за участие
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🔄 <span style={{ fontSize: '11px' }}>Один ответ</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                        Пройти можно только один раз
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🎲 <span style={{ fontSize: '11px' }}>Случайный порядок</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                        Вопросы перемешаны
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🫥 <span style={{ fontSize: '11px' }}>Скрытый создатель</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                        Создатель скрыл свою личность
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#a0a0a0',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      borderTop: '1px solid #48484a',
                      paddingTop: '8px'
                    }}>
                      Если видите хэштеги - значит они включены
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Подсказка */}
          <p style={{ 
            fontSize: '11px', 
            color: 'var(--tg-hint-color)',
            textAlign: 'center',
            margin: 0
          }}>
            Нажмите на любой блок для подробностей
          </p>
        </div>

        {/* Организатор - скрывается если включена настройка "Скрыть создателя" */}
        {!survey.settings?.hideCreator && (
          <button
            onClick={handleContactCreator}
            style={{
              width: '100%',
              background: 'var(--tg-section-bg-color)',
              border: '1px solid var(--tg-section-separator-color)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--tg-text-color)' }}>
              👤 Организатор: {survey.creatorUsername ? `@${survey.creatorUsername}` : 'Пользователь Telegram'}
            </span>
          </button>
        )}

        {/* Кнопка участия */}
        {survey.canParticipate ? (
          <div style={{ width: '100%' }}>
            <button
              onClick={handleParticipate}
              style={{
                width: '100%',
                background: 'var(--tg-button-color)',
                color: 'var(--tg-button-text-color)',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                marginBottom: '12px'
              }}
            >
              📝 Начать опрос
            </button>
            
            {/* Текст согласия */}
            <p style={{
              fontSize: '11px',
              color: 'var(--tg-hint-color)',
              textAlign: 'center',
              lineHeight: '1.4',
              margin: 0
            }}>
              Запуская опрос вы соглашаетесь с{' '}
              <a 
                href="#" 
                style={{
                  color: 'var(--tg-link-color)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Открыть политику обработки данных
                }}
              >
                политикой обработки данных
              </a>
              {' '}и{' '}
              <a 
                href="#" 
                style={{
                  color: 'var(--tg-link-color)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Открыть политику конфиденциальности
                }}
              >
                политикой конфиденциальности
              </a>
            </p>
          </div>
        ) : (
          <div style={{
            background: 'var(--tg-section-bg-color)',
            border: '1px solid var(--tg-section-separator-color)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--tg-hint-color)',
              margin: 0
            }}>
              {survey.participationMessage}
            </p>
          </div>
        )}
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

