import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Share, Settings, Edit, Check, X, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { surveyApi, questionApi } from '../../services/api';
import type { SurveyShareResponse } from '../../services/api';
import type { Survey, SurveySettings } from '../../types';
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
  const [editingSettings, setEditingSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState<SurveySettings | null>(null);

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
        setEditedSettings(s.settings);
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

  const handleStatusChange = async (newStatus: string) => {
    if (!survey || !surveyId) return;
    
    if (newStatus === 'completed') {
      const confirmed = window.confirm('Опрос будет завершён и закрыт для ответов. Продолжить?');
      if (!confirmed) return;
    }
    
    if (newStatus === 'draft') {
      const confirmed = window.confirm('Снять опрос с публикации? Пользователи не смогут на него отвечать.');
      if (!confirmed) return;
    }

    try {
      await surveyApi.updateSurveyStatus(surveyId, newStatus);
      const fresh = await surveyApi.getSurvey(surveyId);
      setSurvey(fresh);
      hapticFeedback?.success();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.detail || 'Не удалось изменить статус');
    }
  };

  const handleSaveSettings = async () => {
    if (!survey || !surveyId || !editedSettings) return;
    try {
      await surveyApi.updateSurveySettings(surveyId, editedSettings);
      const fresh = await surveyApi.getSurvey(surveyId);
      setSurvey(fresh);
      setEditedSettings(fresh.settings);
      setEditingSettings(false);
      hapticFeedback?.success();
      alert('Настройки успешно обновлены!');
    } catch (e) {
      console.error(e);
      alert('Не удалось сохранить настройки');
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
    switch (survey.status) {
      case 'active':
        return { text: 'Активен', color: '#34C759' };
      case 'draft':
        return { text: 'Черновик', color: '#8E8E93' };
      case 'completed':
        return { text: 'Завершён', color: '#007AFF' };
      case 'archived':
        return { text: 'Архив', color: '#FF9500' };
      default:
        return { text: survey.status, color: '#8E8E93' };
    }
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
    <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 12, paddingBottom: 80 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, flex: 1 }}>{survey.title}</h1>
          {statusBadge && (
            <div style={{ background: statusBadge.color, color: 'white', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
              {statusBadge.text}
            </div>
          )}
        </div>
        {survey.description && (
          <p style={{ color: 'var(--tg-hint-color)', margin: '8px 0 0 0', fontSize: 14, lineHeight: 1.4 }}>{survey.description}</p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tg-hint-color)' }}>
            📝 {survey.questions?.length || 0} {(survey.questions?.length || 0) === 1 ? 'вопрос' : 'вопросов'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tg-hint-color)' }}>
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
        style={{ marginBottom: 12 }}
      />

      {/* Таб: Обзор */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Управление статусом */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 14, padding: 14 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>Статус опроса</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {survey.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  style={{
                    background: '#34C759',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: 12,
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Check size={16} /> Опубликовать
                </button>
              )}
              {survey.status === 'active' && (
                <>
                  {canEdit && (
                    <button
                      onClick={() => handleStatusChange('draft')}
                      style={{
                        background: '#8E8E93',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        padding: 12,
                        fontWeight: 600,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <X size={16} /> Перевести в черновик
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusChange('completed')}
                    style={{
                      background: '#007AFF',
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      padding: 12,
                      fontWeight: 600,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Check size={16} /> Завершить опрос
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Распространение - показываем всегда если есть share */}
          {share && (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 14, padding: 14 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>Распространение</h3>
              <div style={{ background: 'var(--tg-bg-color)', borderRadius: 10, padding: 10, marginBottom: 10, wordBreak: 'break-all', fontSize: 13, color: 'var(--tg-hint-color)' }}>
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
                    borderRadius: 10,
                    padding: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
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
                    borderRadius: 10,
                    padding: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Share size={16} /> Поделиться
                </button>
              </div>
              {share.qr_code && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <img src={share.qr_code} alt="QR" style={{ maxWidth: 180, borderRadius: 10, border: '1px solid var(--tg-section-separator-color)' }} />
                </div>
              )}
            </div>
          )}

          {/* Настройки опроса */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: settingsExpanded ? 12 : 0 }}>
              <button
                onClick={() => {
                  setSettingsExpanded(!settingsExpanded);
                  hapticFeedback?.light();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 0,
                  color: 'var(--tg-text-color)',
                  cursor: 'pointer',
                }}
              >
                <Settings size={18} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Настройки опроса</h3>
                {settingsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {settingsExpanded && (
                <button
                  onClick={() => {
                    if (editingSettings) {
                      handleSaveSettings();
                    } else {
                      setEditingSettings(true);
                    }
                    hapticFeedback?.light();
                  }}
                  style={{
                    background: editingSettings ? '#34C759' : 'var(--tg-button-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  {editingSettings ? <><Save size={14} /> Сохранить</> : <><Edit size={14} /> Редактировать</>}
                </button>
              )}
            </div>
            {settingsExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Показывать прогресс</span>
                  {editingSettings ? (
                    <input
                      type="checkbox"
                      checked={editedSettings?.showProgress || false}
                      onChange={(e) => setEditedSettings({ ...editedSettings!, showProgress: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{settings.showProgress ? 'Да' : 'Нет'}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Один ответ на пользователя</span>
                  {editingSettings ? (
                    <input
                      type="checkbox"
                      checked={editedSettings?.oneResponsePerUser || false}
                      onChange={(e) => setEditedSettings({ ...editedSettings!, oneResponsePerUser: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{settings.oneResponsePerUser ? 'Да' : 'Нет'}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Анонимность</span>
                  {editingSettings ? (
                    <input
                      type="checkbox"
                      checked={editedSettings?.allowAnonymous || false}
                      onChange={(e) => setEditedSettings({ ...editedSettings!, allowAnonymous: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{settings.allowAnonymous ? 'Разрешена' : 'Запрещена'}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Сбор Telegram-данных</span>
                  {editingSettings ? (
                    <input
                      type="checkbox"
                      checked={editedSettings?.collectTelegramData || false}
                      onChange={(e) => setEditedSettings({ ...editedSettings!, collectTelegramData: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{settings.collectTelegramData ? 'Да' : 'Нет'}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)', alignItems: 'center' }}>
                  <span style={{ color: 'var(--tg-hint-color)' }}>Перемешать вопросы</span>
                  {editingSettings ? (
                    <input
                      type="checkbox"
                      checked={editedSettings?.randomizeQuestions || false}
                      onChange={(e) => setEditedSettings({ ...editedSettings!, randomizeQuestions: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{settings.randomizeQuestions ? 'Да' : 'Нет'}</span>
                  )}
                </div>
                {(settings.maxParticipants || editingSettings) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Макс. участников</span>
                    {editingSettings ? (
                      <input
                        type="number"
                        value={editedSettings?.maxParticipants || ''}
                        onChange={(e) => setEditedSettings({ ...editedSettings!, maxParticipants: e.target.value })}
                        style={{ width: 80, padding: 6, borderRadius: 6, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.maxParticipants}</span>
                    )}
                  </div>
                )}
                {(settings.endDate || editingSettings) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-section-separator-color)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Дата окончания</span>
                    {editingSettings ? (
                      <input
                        type="date"
                        value={editedSettings?.endDate || ''}
                        onChange={(e) => setEditedSettings({ ...editedSettings!, endDate: e.target.value })}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.endDate ? new Date(settings.endDate).toLocaleDateString() : '—'}</span>
                    )}
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
            <div style={{ background: '#E3F2FD', color: '#1976D2', borderRadius: 10, padding: 12, fontSize: 13 }}>
              ℹ️ Редактирование вопросов пока не реализовано. Скоро добавим!
            </div>
          )}
          {!canEdit && (
            <div style={{ background: '#FFF3CD', color: '#856404', borderRadius: 10, padding: 12, fontSize: 13 }}>
              ⚠️ Редактирование невозможно — есть ответы на опрос
            </div>
          )}
          {questions.length === 0 ? (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 10, padding: 20, textAlign: 'center', color: 'var(--tg-hint-color)' }}>
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
                    padding: 14,
                    border: '1px solid var(--tg-section-separator-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        minWidth: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: 'var(--tg-button-color)',
                        color: 'var(--tg-button-text-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{q.text}</div>
                      {q.description && (
                        <div style={{ color: 'var(--tg-hint-color)', fontSize: 13, marginBottom: 8 }}>{q.description}</div>
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
                            <div key={i} style={{ fontSize: 13, padding: '4px 0' }}>
                              {i + 1}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div style={{ marginTop: 8, padding: 8, background: 'var(--tg-bg-color)', borderRadius: 8, fontSize: 13 }}>
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
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 14, padding: 14 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>Общая статистика</h3>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--tg-button-color)' }}>
              {stats?.total_responses ?? 0}
            </div>
            <div style={{ color: 'var(--tg-hint-color)', fontSize: 13 }}>Всего ответов</div>
          </div>
          {(stats?.total_responses ?? 0) === 0 ? (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 20, textAlign: 'center', color: 'var(--tg-hint-color)' }}>
              Пока нет ответов — аналитика будет доступна после первых прохождений
            </div>
          ) : (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 14 }}>
              <button
                onClick={loadResponses}
                style={{
                  background: 'var(--tg-button-color)',
                  color: 'var(--tg-button-text-color)',
                  border: 'none',
                  borderRadius: 10,
                  padding: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  width: '100%',
                }}
              >
                Показать ответы (20)
              </button>
              {responsesPage && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {responsesPage.map((r) => (
                    <div key={r.id} style={{ background: 'var(--tg-bg-color)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--tg-hint-color)', marginBottom: 4 }}>ID: {r.id}</div>
                      <div style={{ fontSize: 13 }}>Анонимно: {r.is_anonymous ? 'Да' : 'Нет'}</div>
                      <div style={{ fontSize: 13, color: 'var(--tg-hint-color)' }}>
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
