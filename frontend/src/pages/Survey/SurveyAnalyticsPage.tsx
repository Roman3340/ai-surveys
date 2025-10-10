import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Share, ArrowLeft, BarChart3 } from 'lucide-react';
import { surveyApi } from '../../services/api';
import type { SurveyShareResponse } from '../../services/api';
import type { Survey } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';

export default function SurveyAnalyticsPage() {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const { hapticFeedback } = useTelegram();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [share, setShare] = useState<SurveyShareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        const s = await surveyApi.getSurvey(surveyId);
        setSurvey(s);
        const sh = await surveyApi.getSurveyShareLink(surveyId);
        setShare(sh);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить опрос');
        setLoading(false);
      }
    };
    load();
  }, [surveyId]);

  const togglePublish = async () => {
    if (!survey || !surveyId) return;
    try {
      setLoading(true);
      if (survey.isPublished) await surveyApi.unpublishSurvey(surveyId);
      else await surveyApi.publishSurvey(surveyId);
      const fresh = await surveyApi.getSurvey(surveyId);
      setSurvey(fresh);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError('Не удалось изменить статус публикации');
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
      </div>

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
      </div>
    </div>
  );
}


