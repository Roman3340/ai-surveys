import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Share, ArrowLeft, BarChart3 } from 'lucide-react';
import { surveyApi, questionApi } from '../../services/api';
import type { SurveyShareResponse } from '../../services/api';
import type { Survey } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { AnimatedTabs } from '../../components/ui/AnimatedTabs';

export default function SurveyAnalyticsPage() {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const { hapticFeedback } = useTelegram();
  useStableBackButton({ targetRoute: '/' });

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [share, setShare] = useState<SurveyShareResponse | null>(null);
  const [stats, setStats] = useState<{ total_responses: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'analytics'>('overview');
  const [questions, setQuestions] = useState<any[]>([]);
  const [responsesPage, setResponsesPage] = useState<any[] | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        const s = await surveyApi.getSurvey(surveyId, false);
        setSurvey(s);
        const sh = await surveyApi.getSurveyShareLink(surveyId);
        setShare(sh);
        const st = await surveyApi.getSurveyStats(surveyId);
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
      setLoading(true);
      if (survey.isPublished) await surveyApi.unpublishSurvey(surveyId);
      else await surveyApi.publishSurvey(surveyId);
      const fresh = await surveyApi.getSurvey(surveyId, false);
      setSurvey(fresh);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError('Не удалось изменить статус публикации');
      setLoading(false);
    }
  };

  const closeSurvey = async () => {
    if (!survey || !surveyId) return;
    try {
      if (!window.confirm('Завершить опрос? Новые ответы приниматься не будут.')) return;
      setLoading(true);
      await fetch(`${import.meta.env.VITE_API_BASE || '/api'}/surveys/${surveyId}/close`, { method: 'POST', headers: { 'Authorization': '' } } as any);
      const fresh = await surveyApi.getSurvey(surveyId, false);
      setSurvey(fresh);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError('Не удалось завершить опрос');
      setLoading(false);
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
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'var(--tg-link-color)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Назад
        </button>
        <div>Ошибка: {error || 'Опрос не найден'}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 16 }}>
      <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'var(--tg-link-color)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Назад
      </button>

      <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px 0' }}>{survey.title}</h1>
      {survey.description && <p style={{ color: 'var(--tg-hint-color)', marginTop: 0 }}>{survey.description}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 16 }}>
        <div style={{ background: survey.isPublished ? '#34C759' : 'var(--tg-hint-color)', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>{survey.isPublished ? 'Активен' : 'Черновик'}</div>
        <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--tg-hint-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart3 size={14} /> {survey.questions.length} вопросов
        </div>
        <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--tg-hint-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Ответов: {stats?.total_responses ?? 0}
        </div>
      </div>

      <AnimatedTabs
        tabs={[
          { id: 'overview', label: 'Обзор' },
          { id: 'questions', label: 'Вопросы' },
          { id: 'analytics', label: 'Аналитика' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
        style={{ marginBottom: 12 }}
      />

      {activeTab === 'overview' && (
        <>
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Распространение</h3>
            <div style={{ border: '1px solid var(--tg-section-separator-color)', borderRadius: 8, padding: 12, marginBottom: 12, color: 'var(--tg-hint-color)', wordBreak: 'break-all' }}>
              {share?.share_url || '—'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCopy} style={{ flex: 1, background: 'var(--tg-button-color)', color: 'var(--tg-button-text-color)', border: 'none', borderRadius: 8, padding: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Copy size={16} /> {copied ? 'Скопировано' : 'Скопировать ссылку'}
              </button>
              <button onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(share?.share_url || '')}`, '_blank')} style={{ flex: 1, background: '#0088cc', color: 'white', border: 'none', borderRadius: 8, padding: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Share size={16} /> Поделиться
              </button>
            </div>
            {share?.qr_code && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <img src={share.qr_code} alt="QR" style={{ maxWidth: 200, borderRadius: 8 }} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={togglePublish} style={{ flex: 1, background: 'var(--tg-section-bg-color)', color: 'var(--tg-text-color)', border: 'none', borderRadius: 12, padding: 12, fontWeight: 600 }}>
              {survey.isPublished ? 'Снять с публикации' : 'Опубликовать'}
            </button>
            <button onClick={closeSurvey} style={{ flex: 1, background: '#ff3b30', color: 'white', border: 'none', borderRadius: 12, padding: 12, fontWeight: 600 }}>
              Завершить опрос
            </button>
          </div>
        </>
      )}

      {activeTab === 'questions' && (
        <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 12 }}>
          {questions.length === 0 ? (
            <div style={{ color: 'var(--tg-hint-color)' }}>Вопросов нет</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {questions.map((q) => (
                <div key={q.id} style={{ border: '1px solid var(--tg-section-separator-color)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{q.text}</div>
                  <div style={{ color: 'var(--tg-hint-color)', fontSize: 12 }}>
                    Тип: {q.type} • {q.is_required ? 'обязательный' : 'необязательный'} • Порядок: {q.order_index}
                    {q.has_other_option ? ' • есть «Другое»' : ''}
                  </div>
                  {(q.type === 'single_choice' || q.type === 'multiple_choice') && Array.isArray(q.options) && q.options.length > 0 && (
                    <div style={{ marginTop: 6, color: 'var(--tg-hint-color)', fontSize: 12 }}>Опции: {q.options.join(', ')}</div>
                  )}
                  {q.type === 'scale' && (
                    <div style={{ marginTop: 6, color: 'var(--tg-hint-color)', fontSize: 12 }}>Шкала: {q.scale_min}–{q.scale_max} ({q.scale_min_label || ''} / {q.scale_max_label || ''})</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 12 }}>
          <div style={{ marginBottom: 12, color: 'var(--tg-hint-color)' }}>Всего ответов: {stats?.total_responses ?? 0}</div>
          {(stats?.total_responses ?? 0) === 0 ? (
            <div style={{ color: 'var(--tg-hint-color)' }}>Пока нет ответов — аналитика будет доступна после первых прохождений.</div>
          ) : (
            <>
              <button onClick={loadResponses} style={{ background: 'var(--tg-button-color)', color: 'var(--tg-button-text-color)', border: 'none', borderRadius: 8, padding: 10, fontWeight: 600 }}>
                Показать ответы (20)
              </button>
              {responsesPage && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {responsesPage.map((r) => (
                    <div key={r.id} style={{ border: '1px solid var(--tg-section-separator-color)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--tg-hint-color)' }}>id: {r.id}</div>
                      <div>Анонимно: {r.is_anonymous ? 'да' : 'нет'}</div>
                      <div>Завершён: {r.completed_at ? new Date(r.completed_at).toLocaleString() : '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}


