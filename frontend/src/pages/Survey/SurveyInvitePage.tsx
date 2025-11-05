import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { user, hapticFeedback, isReady } = useTelegram();
  
  const [survey, setSurvey] = useState<SurveyPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Функция для преобразования сообщений бэкенда в локализованные
  const localizeMessage = useCallback((message: string | undefined): string => {
    if (!message) return t('surveyInvite.participationMessages.unavailable');
    
    // Определяем тип сообщения по ключевым словам
    if (message.includes('уже участвовали') || message.includes('already participated')) {
      return t('surveyInvite.participationMessages.alreadyParticipated');
    }
    if (message.includes('завершён') || message.includes('completed') || message.includes('завершен')) {
      return t('surveyInvite.participationMessages.completed');
    }
    if (message.includes('не опубликован') || message.includes('not published')) {
      return t('surveyInvite.participationMessages.draft');
    }
    if (message.includes('архивирован') || message.includes('archived')) {
      return t('surveyInvite.participationMessages.archived');
    }
    if (message.includes('Достигнуто максимальное') || message.includes('Maximum number of participants')) {
      // Извлекаем число из сообщения
      const match = message.match(/(\d+)/);
      const count = match ? match[1] : '';
      return t('surveyInvite.participationMessages.maxParticipants', { count });
    }
    
    // Если сообщение не распознано, возвращаем как есть или дефолтное
    return message;
  }, [t]);

  // Функция для обработки ошибок API
  const localizeError = useCallback((errorDetail: string | undefined): string => {
    if (!errorDetail) return t('surveyInvite.notFound');
    
    // Проверяем формат "Опрос с ID {id} не найден"
    const match = errorDetail.match(/Опрос с ID (\d+) не найден|Survey with ID (\d+) not found/i);
    if (match) {
      const id = match[1] || match[2];
      return t('surveyInvite.notFoundWithId', { id });
    }
    
    return errorDetail;
  }, [t]);

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
        const errorDetail = e?.response?.data?.detail;
        setError(localizeError(errorDetail) || t('surveyTake.loadError'));
      } finally {
        setLoading(false);
      }
    };
    loadSurvey();
  }, [surveyId, user, isReady, localizeError, t]);

  const handleParticipate = () => {
    if (!survey?.canParticipate) {
      const localizedMessage = localizeMessage(survey?.participationMessage);
      alert(localizedMessage);
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
        background: 'var(--tg-bg-color)',
        marginTop: '-125px' // Компенсируем padding-top у body
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
          <p style={{ color: 'var(--tg-hint-color)' }}>{t('surveyInvite.loading')}</p>
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
        padding: '20px',
        marginTop: '-125px' // Компенсируем padding-top у body
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <p style={{ color: 'var(--tg-text-color)', fontSize: '16px', marginBottom: '8px' }}>
            {t('surveyInvite.notFound')}
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
            {t('surveyInvite.wantToCreate')}
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
              {t('surveyInvite.openHomePage')}
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
        padding: '10px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '-125px' // Компенсируем padding-top у body
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
                  {t('surveyInvite.anonymousTag')}
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
                        marginLeft: '-100px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        textAlign: 'center',
                        lineHeight: '1.3',
                        maxWidth: '200px'
                      }}
                    >
                      {t('surveyInvite.anonymousPopover')}
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
                  {t('surveyInvite.rewardTag')}
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
                        marginLeft: '-100px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        textAlign: 'center',
                        lineHeight: '1.3',
                        maxWidth: '200px'
                      }}
                    >
                      <div style={{ marginBottom: '8px' }}>
                        {survey.settings.motivationType === 'discount' && `💰 ${survey.settings.motivationDetails || t('surveyCreator.settings.rewardTypes.discount')}`}
                        {survey.settings.motivationType === 'promo' && `🛒 ${survey.settings.motivationDetails || t('surveyCreator.settings.rewardTypes.promo')}`}
                        {survey.settings.motivationType === 'stars' && `⭐ ${survey.settings.motivationDetails || '50'} ${t('surveyCreator.settings.rewardTypes.stars')}`}
                        {survey.settings.motivationType === 'gift' && `🎁 ${survey.settings.motivationDetails || t('surveyCreator.settings.rewardTypes.gift')}`}
                        {survey.settings.motivationType === 'other' && survey.settings.motivationDetails}
                      </div>
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#a0a0a0',
                        lineHeight: '1.3',
                        borderTop: '1px solid #48484a',
                        paddingTop: '6px'
                      }}>
                        {t('surveyInvite.rewardNotice')}
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
                  {t('surveyInvite.oneResponseTag')}
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
                        marginLeft: '-100px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        textAlign: 'center',
                        lineHeight: '1.3',
                        maxWidth: '200px'
                      }}
                    >
                      {t('surveyInvite.oneResponsePopover')}
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
                  {t('surveyInvite.randomTag')}
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
                        marginLeft: '-100px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        textAlign: 'center',
                        lineHeight: '1.3',
                        maxWidth: '200px'
                      }}
                    >
                      {t('surveyInvite.randomPopover')}
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
                  {t('surveyInvite.hiddenCreatorTag')}
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
                        marginLeft: '-100px',
                        marginBottom: '8px',
                        background: '#2c2c2e',
                        border: '1px solid #48484a',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        textAlign: 'center',
                        lineHeight: '1.3'
                      }}
                    >
                      {t('surveyInvite.hiddenCreatorPopover')}
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
                  {t('surveyInvite.settingsTag')}
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
                        {t('surveyInvite.settingsTitle')}
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '8px 12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🔒 <span style={{ fontSize: '11px' }}>{t('surveyCreator.settings.anonymous')}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                          {t('surveyInvite.anonymousDescription')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🎁 <span style={{ fontSize: '11px' }}>{t('surveyCreator.settings.motivation')}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                          {t('surveyInvite.rewardDescription')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🔄 <span style={{ fontSize: '11px' }}>{t('surveyCreator.settings.oneResponsePerUser')}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                          {t('surveyInvite.oneResponseDescription')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🎲 <span style={{ fontSize: '11px' }}>{t('surveyCreator.settings.randomizeQuestions')}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                          {t('surveyInvite.randomDescription')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🎭 <span style={{ fontSize: '11px' }}>{t('surveyCreator.settings.hideCreator')}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
                          {t('surveyInvite.hiddenCreatorDescription')}
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
                        {t('surveyInvite.hashtagsNote')}
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
            {t('surveyInvite.clickForDetails')}
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
              {survey.creatorUsername 
                ? t('surveyInvite.organizerLabel', { username: survey.creatorUsername })
                : t('surveyInvite.organizerLabelNoUsername')
              }
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
              {t('surveyInvite.startSurvey')}
            </button>
            
            {/* Текст согласия */}
            <p style={{
              fontSize: '11px',
              color: 'var(--tg-hint-color)',
              textAlign: 'center',
              lineHeight: '1.4',
              margin: 0
            }}>
              {t('surveyInvite.privacyAgreement1')}{' '}
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
                {t('surveyInvite.dataPolicy')}
              </a>
              {' '}{t('surveyInvite.and')}{' '}
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
                {t('surveyInvite.privacyPolicy')}
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
              {localizeMessage(survey.participationMessage)}
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

