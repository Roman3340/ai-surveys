import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Share, Settings, Edit, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { surveyApi, questionApi } from '../../services/api';
import type { SurveyShareResponse } from '../../services/api';
import type { Survey } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { AnimatedTabs } from '../../components/ui/AnimatedTabs';

export default function SurveyAnalyticsPage() {
  const { surveyId } = useParams();
  const { hapticFeedback } = useTelegram();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [share, setShare] = useState<SurveyShareResponse | null>(null);
  const [stats, setStats] = useState<{ total_responses: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'analytics'>('overview');
  const [questions, setQuestions] = useState<any[]>([]);
  const [responsesPage, setResponsesPage] = useState<any[] | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState(false);

  useStableBackButton({ targetRoute: '/' });

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        const [s, sh, st] = await Promise.all([
          surveyApi.getSurvey(surveyId, false),
          surveyApi.getSurveyShareLink(surveyId).catch(() => null),
          surveyApi.getSurveyStats(surveyId),
        ]);
        setSurvey(s);
        setShare(sh);
        setStats(st as any);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить опрос');
        setLoading(false);
      }
    };
    load();
  }, [surveyId]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (activeTab !== 'questions' || !surveyId) return;
      try {
        const list = await questionApi.getSurveyQuestions(surveyId);
        setQuestions(list);
      } catch (e) {
        console.error(e);
      }
    };
    loadQuestions();
  }, [activeTab, surveyId]);

  const loadResponses = async () => {
    if (!surveyId) return;
    try {
      const page = await surveyApi.getSurveyResponses(surveyId, 20, 0);
      setResponsesPage(page);
    } catch (e) {
      console.error(e);
    }
  };

  const togglePublish = async () => {
    if (!survey || !surveyId) return;
    try {
      if (survey.isPublished) {
        const confirmed = window.confirm('Снять опрос с публикации? Пользователи не смогут на него отвечать.');
        if (!confirmed) return;
        await surveyApi.unpublishSurvey(surveyId);
      } else {
        await surveyApi.publishSurvey(surveyId);
      }
      const fresh = await surveyApi.getSurvey(surveyId);
      setSurvey(fresh);
      hapticFeedback?.success();
    } catch (e) {
      console.error(e);
      alert('Не удалось изменить статус публикации');
    }
  };

  const handleCopy = async () => {
    if (!share?.share_url) return;
    try {
      await navigator.clipboard.writeText(share.share_url);
      setCopied(true);
      hapticFeedback?.light();
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const getStatusBadge = () => {
    if (!survey) return null;
    if (survey.isPublished) {
      return { text: 'Активен', color: '#34C759' };
    }
    return { text: 'Черновик', color: '#8E8E93' };
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Загрузка...
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 20 }}>
        <div>Ошибка: {error || 'Опрос не найден'}</div>
      </div>
    );
  }

  const statusBadge = getStatusBadge();
  const canEdit = (stats?.total_responses ?? 0) === 0;
  const settings = survey.settings || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 16, paddingBottom: 80 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, flex: 1 }}>{survey.title}</h1>
          {statusBadge && (
            <div style={{ background: statusBadge.color, color: 'white', borderRadius: 12, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
              {statusBadge.text}
            </div>
          )}
        </div>
        {survey.description && (
          <p style={{ color: 'var(--tg-hint-color)', margin: '8px 0 0 0', fontSize: 15, lineHeight: 1.4 }}>{survey.description}</p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--tg-hint-color)' }}>
            📝 {survey.questions?.length || 0} {(survey.questions?.length || 0) === 1 ? 'вопрос' : 'вопросов'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--tg-hint-color)' }}>
            📊 {stats?.total_responses ?? 0} {((stats?.total_responses ?? 0) === 1 || (stats?.total_responses ?? 0) > 20) ? 'ответ' : 'ответов'}
          </div>
        </div>
      </div>

      {/* Табы */}
      <AnimatedTabs
        tabs={[
          { id: 'overview', label: 'Обзор' },
          { id: 'questions', label: 'Вопросы' },
          { id: 'analytics', label: 'Аналитика' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id as any);
          hapticFeedback?.light();
        }}
        style={{ marginBottom: 16 }}
      />

      {/* Таб: Обзор */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Управление публикацией */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 16, padding: 16 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 17, fontWeight: 600 }}>Управление опросом</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={togglePublish}
                style={{
                  background: survey.isPublished ? '#FF3B30' : '#34C759',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  fontWeight: 600,
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {survey.isPublished ? (
                  <><X size={18} /> Снять с публикации</>
                ) : (
                  <><Check size={18} /> Опубликовать</>
                )}
              </button>
            </div>
          </div>

          {/* Распространение */}
          {survey.isPublished && share && (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 16, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 17, fontWeight: 600 }}>Распространение</h3>
              <div style={{ background: 'var(--tg-bg-color)', borderRadius: 12, padding: 12, marginBottom: 12, wordBreak: 'break-all', fontSize: 14, color: 'var(--tg-hint-color)' }}>
                {share.share_url}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1,
                    background: 'var(--tg-button-color)',
                    color: 'var(--tg-button-text-color)',
                    border: 'none',
                    borderRadius: 12,
                    padding: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Copy size={16} /> {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(share.share_url)}`, '_blank')}
                  style={{
                    flex: 1,
                    background: '#0088cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Share size={16} /> Поделиться
                </button>
              </div>
              {share.qr_code && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <img src={share.qr_code} alt="QR" style={{ maxWidth: 200, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)' }} />
                </div>
              )}
            </div>
          )}

          {/* Настройки опроса */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 16, padding: 16 }}>
            <button
              onClick={() => {
                setSettingsExpanded(!settingsExpanded);
                hapticFeedback?.light();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 0,
                marginBottom: settingsExpanded ? 12 : 0,
                color: 'var(--tg-text-color)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={18} /> Настройки опроса
              </h3>
              {settingsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {settingsExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Показывать прогресс</span>
                  <span style={{ fontWeight: 500 }}>{settings.showProgress ? 'Да' : 'Нет'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Один ответ на пользователя</span>
                  <span style={{ fontWeight: 500 }}>{settings.oneResponsePerUser ? 'Да' : 'Нет'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Анонимность</span>
                  <span style={{ fontWeight: 500 }}>{settings.allowAnonymous ? 'Разрешена' : 'Запрещена'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Сбор Telegram-данных</span>
                  <span style={{ fontWeight: 500 }}>{settings.collectTelegramData ? 'Да' : 'Нет'}</span>
                </div>
                {settings.maxParticipants && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Макс. участников</span>
                    <span style={{ fontWeight: 500 }}>{settings.maxParticipants}</span>
                  </div>
                )}
                {settings.endDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Дата окончания</span>
                    <span style={{ fontWeight: 500 }}>{new Date(settings.endDate).toLocaleDateString()}</span>
                  </div>
                )}
                {settings.motivationEnabled && settings.motivationType && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Мотивация</span>
                    <span style={{ fontWeight: 500 }}>
                      {settings.motivationType === 'stars' && '⭐ Telegram Stars'}
                      {settings.motivationType === 'discount' && '🎁 Промокод'}
                      {settings.motivationType === 'gift' && '🎁 Подарок'}
                      {settings.motivationType === 'contest' && '🏆 Конкурс'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Таб: Вопросы */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {canEdit && (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--tg-hint-color)' }}>
                {editingQuestions ? 'Режим редактирования' : 'Вопросы можно редактировать'}
              </span>
              <button
                onClick={() => {
                  setEditingQuestions(!editingQuestions);
                  hapticFeedback?.light();
                }}
                style={{
                  background: editingQuestions ? '#FF3B30' : 'var(--tg-button-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {editingQuestions ? <><X size={16} /> Отмена</> : <><Edit size={16} /> Редактировать</>}
              </button>
            </div>
          )}
          {!canEdit && (
            <div style={{ background: '#FFF3CD', color: '#856404', borderRadius: 12, padding: 12, fontSize: 14 }}>
              ⚠️ Редактирование невозможно — есть ответы на опрос
            </div>
          )}
          {questions.length === 0 ? (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 20, textAlign: 'center', color: 'var(--tg-hint-color)' }}>
              Вопросов нет
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    background: 'var(--tg-section-bg-color)',
                    borderRadius: 12,
                    padding: 16,
                    border: editingQuestions ? '2px solid var(--tg-button-color)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <div
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--tg-button-color)',
                        color: 'var(--tg-button-text-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{q.text}</div>
                      {q.description && (
                        <div style={{ color: 'var(--tg-hint-color)', fontSize: 14, marginBottom: 8 }}>{q.description}</div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--tg-hint-color)' }}>
                        <span>Тип: {q.type}</span>
                        <span>•</span>
                        <span>{q.is_required ? 'Обязательный' : 'Необязательный'}</span>
                        {q.has_other_option && (
                          <>
                            <span>•</span>
                            <span>Есть «Другое»</span>
                          </>
                        )}
                      </div>
                      {(q.type === 'single_choice' || q.type === 'multiple_choice') && Array.isArray(q.options) && q.options.length > 0 && (
                        <div style={{ marginTop: 8, padding: 8, background: 'var(--tg-bg-color)', borderRadius: 8 }}>
                          <div style={{ fontSize: 12, color: 'var(--tg-hint-color)', marginBottom: 4 }}>Варианты:</div>
                          {q.options.map((opt: string, i: number) => (
                            <div key={i} style={{ fontSize: 14, padding: '4px 0' }}>
                              {i + 1}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div style={{ marginTop: 8, padding: 8, background: 'var(--tg-bg-color)', borderRadius: 8, fontSize: 14 }}>
                          Шкала: {q.scale_min}–{q.scale_max}
                          {(q.scale_min_label || q.scale_max_label) && (
                            <span style={{ color: 'var(--tg-hint-color)', marginLeft: 8 }}>
                              ({q.scale_min_label || '—'} / {q.scale_max_label || '—'})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Таб: Аналитика */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 16, padding: 16 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 17, fontWeight: 600 }}>Общая статистика</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--tg-button-color)' }}>
              {stats?.total_responses ?? 0}
            </div>
            <div style={{ color: 'var(--tg-hint-color)', fontSize: 14 }}>Всего ответов</div>
          </div>
          {(stats?.total_responses ?? 0) === 0 ? (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 20, textAlign: 'center', color: 'var(--tg-hint-color)' }}>
              Пока нет ответов — аналитика будет доступна после первых прохождений
            </div>
          ) : (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 16 }}>
              <button
                onClick={loadResponses}
                style={{
                  background: 'var(--tg-button-color)',
                  color: 'var(--tg-button-text-color)',
                  border: 'none',
                  borderRadius: 12,
                  padding: 12,
                  fontWeight: 600,
                  width: '100%',
                }}
              >
                Показать ответы (20)
              </button>
              {responsesPage && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {responsesPage.map((r) => (
                    <div key={r.id} style={{ background: 'var(--tg-bg-color)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--tg-hint-color)', marginBottom: 4 }}>ID: {r.id}</div>
                      <div style={{ fontSize: 14 }}>Анонимно: {r.is_anonymous ? 'Да' : 'Нет'}</div>
                      <div style={{ fontSize: 14, color: 'var(--tg-hint-color)' }}>
                        Завершён: {r.completed_at ? new Date(r.completed_at).toLocaleString('ru-RU') : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
