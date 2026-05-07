import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertCircle, Brain, Lightbulb, Link2, RefreshCw } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { aiAnalytics, surveyApi } from '../../services/api';
import CenteredPageContainer from '../../components/layout/CenteredPageContainer';

type Priority = 'high' | 'medium' | 'low';
type Strength = 'strong' | 'medium' | 'weak';

interface EvidenceItem {
  response_id?: string | null;
  question_id?: string | null;
  quote: string;
}

interface InsightV3 {
  id: string;
  kind: 'problem' | 'opportunity' | 'positive' | 'trend';
  title: string;
  description: string;
  priority: Priority;
  confidence: number;
  support_count: number;
  evidence?: EvidenceItem[];
  affected_question_ids?: string[];
}

interface RecommendationV3 {
  id: string;
  title: string;
  rationale: string;
  expected_impact: Priority;
  linked_problem_ids?: string[];
  evidence?: EvidenceItem[];
}

interface RelationshipV3 {
  id: string;
  from_signal: { question_id?: string | null; label: string };
  to_signal: { question_id?: string | null; label: string };
  strength: Strength;
  support_count: number;
  evidence?: EvidenceItem[];
  business_implication: string;
}

interface AnalyticsDataV3 {
  version: 3;
  overview: {
    total_responses: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
      confidence: number;
      coverage_text_responses: number;
      notes?: string | null;
    };
  } | null;
  insights: InsightV3[];
  recommendations: RecommendationV3[];
  relationships: RelationshipV3[];
  data_quality: {
    sample_mode: 'small' | 'normal';
    total_responses: number;
    text_responses: number;
    notes?: string | null;
  } | null;
}

interface ProgressData {
  status: string;
  progress: number;
  message: string;
  error?: string;
}

const AIAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const { user, hapticFeedback } = useTelegram();
  useStableBackButton({ targetRoute: '/' });

  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'recommendations' | 'relationships'>('overview');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsDataV3 | null>(null);
  const [surveyTitle, setSurveyTitle] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const generatingRef = useRef<boolean>(false);

  const fetchSurveyTitle = async () => {
    if (!surveyId) return;
    try {
      const s = await surveyApi.getSurvey(surveyId);
      setSurveyTitle(s.title);
    } catch {
      // не критично
    }
  };

  const loadAnalytics = async () => {
    if (!surveyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await aiAnalytics.getAnalytics(surveyId);

      if (res.data.status === 'cached' || res.data.status === 'completed') {
        const data = res.data.data as AnalyticsDataV3;
        setAnalytics(data?.version === 3 ? data : null);
        setGenerating(false);
        generatingRef.current = false;
      } else if (res.data.status === 'generating') {
        setGenerating(true);
        generatingRef.current = true;
        setProgress(res.data.progress);
        connectWebSocket();
        startPolling();
      } else {
        setAnalytics(null);
        setGenerating(false);
        generatingRef.current = false;
      }
    } catch (e) {
      console.error(e);
      setError(t('aiAnalytics.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!surveyId) {
      navigate('/');
      return;
    }
    fetchSurveyTitle();
    loadAnalytics();
    return () => {
      wsRef.current?.close();
      if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  const connectWebSocket = () => {
    if (!surveyId || !user?.id) return;
    try {
      wsRef.current?.close();
      // TODO: позже можно сделать baseUrl динамическим как в api.ts
      const wsUrl = `wss://ai-surveys.ru/ws/analytics-progress/${surveyId}?telegram_id=${user.id}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onmessage = (event) => {
        try {
          const p: ProgressData = JSON.parse(event.data);
          setProgress(p);
          if (p.status === 'completed') {
            setGenerating(false);
            generatingRef.current = false;
            if (pollingIntervalRef.current) {
              window.clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setTimeout(() => loadAnalytics(), 800);
            wsRef.current?.close();
          }
          if (p.status === 'error') {
            setGenerating(false);
            generatingRef.current = false;
            setError(p.error || t('aiAnalytics.errors.generationError'));
            wsRef.current?.close();
          }
        } catch {
          // ignore parse errors
        }
      };
      wsRef.current.onerror = () => {
        // не падаем, polling всё подхватит
      };
    } catch (e) {
      console.warn('WS init failed', e);
    }
  };

  const startPolling = () => {
    if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = window.setInterval(async () => {
      if (!surveyId || !generatingRef.current) {
        if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        return;
      }
      try {
        const res = await aiAnalytics.getAnalytics(surveyId);
        if (res.data.status === 'cached' || res.data.status === 'completed') {
          setGenerating(false);
          generatingRef.current = false;
          if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setTimeout(() => loadAnalytics(), 200);
        } else if (res.data.status === 'generating' && res.data.progress) {
          setProgress(res.data.progress);
        }
      } catch {
        // ignore
      }
    }, 2500);
  };

  const generateAnalytics = async () => {
    if (!surveyId) return;
    try {
      setGenerating(true);
      generatingRef.current = true;
      setError(null);
      hapticFeedback?.medium?.();
      connectWebSocket();
      await aiAnalytics.generateAnalytics(surveyId);
      startPolling();
    } catch (e) {
      console.error(e);
      setGenerating(false);
      generatingRef.current = false;
      setError(t('aiAnalytics.errors.generateError'));
    }
  };

  const refresh = async () => {
    hapticFeedback?.light?.();
    await loadAnalytics();
  };

  const pill = (priority: Priority) => {
    const bg =
      priority === 'high' ? 'rgba(255,59,48,0.12)' :
      priority === 'medium' ? 'rgba(255,149,0,0.14)' :
      'rgba(52,199,89,0.12)';
    const color =
      priority === 'high' ? '#ff3b30' :
      priority === 'medium' ? '#ff9500' :
      '#34c759';
    return { bg, color };
  };

  const formatPriorityRu = (p: Priority) => (p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий');
  const formatStrengthRu = (s: Strength) => (s === 'strong' ? 'Сильная' : s === 'medium' ? 'Средняя' : 'Слабая');

  const quotesLimit = (totalResponses: number | undefined) => {
    const n = totalResponses ?? 0;
    if (n > 100) return 15;
    if (n >= 15) return 10;
    return 6;
  };

  const disclaimer = (
    <div style={{ padding: '10px 16px 20px 16px', color: 'var(--tg-hint-color)', fontSize: 12, lineHeight: 1.4 }}>
      {t('aiAnalytics.v3.disclaimer')}
    </div>
  );

  const renderOverview = () => {
    const o = analytics?.overview;
    const dq = analytics?.data_quality;
    if (!o) return null;

    const s = o.sentiment;
    const totalText = dq?.text_responses ?? s.coverage_text_responses ?? 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
        {dq?.sample_mode === 'small' && (
          <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)', color: 'var(--tg-hint-color)', fontSize: 13, lineHeight: 1.4 }}>
            {dq.notes || t('aiAnalytics.v3.smallSample')}
          </div>
        )}

        <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)' }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('aiAnalytics.v3.mainMetrics')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
            <span style={{ color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.metrics.totalResponses')}</span>
            <span style={{ fontWeight: 700 }}>{o.total_responses}</span>
          </div>
        </div>

        <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)' }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('aiAnalytics.v3.sentimentTitle')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.metrics.positive')}</span>
              <span style={{ fontWeight: 700 }}>{s.positive}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.metrics.neutral')}</span>
              <span style={{ fontWeight: 700 }}>{s.neutral}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.metrics.negative')}</span>
              <span style={{ fontWeight: 700 }}>{s.negative}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.v3.sentimentConfidence')}</span>
              <span style={{ fontWeight: 700 }}>{Math.round((s.confidence ?? 0) * 100)}%</span>
            </div>
            <div style={{ color: 'var(--tg-hint-color)' }}>
              {t('aiAnalytics.v3.sentimentCoverage', { count: totalText })}
            </div>
            {s.notes && (
              <div style={{ color: 'var(--tg-hint-color)' }}>{s.notes}</div>
            )}
          </div>
        </div>

        {analytics?.insights?.length ? (
          <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('aiAnalytics.v3.topInsights')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analytics.insights
                .filter((x) => x.kind === 'problem')
                .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'high' ? -1 : 1))
                .slice(0, 3)
                .map((ins) => (
                  <div key={ins.id} style={{ fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>{ins.title}</div>
                      <div style={{ padding: '2px 8px', borderRadius: 999, background: pill(ins.priority).bg, color: pill(ins.priority).color, fontSize: 12, fontWeight: 700 }}>
                        {formatPriorityRu(ins.priority)}
                      </div>
                    </div>
                    <div style={{ color: 'var(--tg-hint-color)', marginTop: 4 }}>{ins.description}</div>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {analytics?.insights?.some((x) => x.kind === 'positive') ? (
          <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('aiAnalytics.v3.topPositives')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analytics.insights
                .filter((x) => x.kind === 'positive')
                .slice(0, 3)
                .map((ins) => (
                  <div key={ins.id} style={{ fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>{ins.title}</div>
                      <div style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(52,199,89,0.12)', color: '#34c759', fontSize: 12, fontWeight: 700 }}>
                        {t('aiAnalytics.v3.positive')}
                      </div>
                    </div>
                    <div style={{ color: 'var(--tg-hint-color)', marginTop: 4 }}>{ins.description}</div>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {analytics?.insights?.some((x) => x.kind === 'trend') ? (
          <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('aiAnalytics.v3.topTrends')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analytics.insights
                .filter((x) => x.kind === 'trend')
                .slice(0, 3)
                .map((ins) => (
                  <div key={ins.id} style={{ fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>{ins.title}</div>
                      <div style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(0,122,255,0.12)', color: '#007aff', fontSize: 12, fontWeight: 700 }}>
                        {t('aiAnalytics.v3.trend')}
                      </div>
                    </div>
                    <div style={{ color: 'var(--tg-hint-color)', marginTop: 4 }}>{ins.description}</div>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {disclaimer}
      </div>
    );
  };

  const renderInsights = () => {
    const items = (analytics?.insights || []).filter((x) => x.kind === 'problem');
    if (!items.length) return <div style={{ padding: 16, color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.v3.empty')}</div>;
    const limit = quotesLimit(analytics?.overview?.total_responses);
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((ins) => (
          <div key={ins.id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>{ins.title}</div>
              <div style={{ padding: '2px 8px', borderRadius: 999, background: pill(ins.priority).bg, color: pill(ins.priority).color, fontSize: 12, fontWeight: 800 }}>
                {formatPriorityRu(ins.priority)}
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>{ins.description}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--tg-hint-color)' }}>
              {t('aiAnalytics.v3.supportCount', { count: ins.support_count })} · {t('aiAnalytics.v3.confidence', { value: Math.round((ins.confidence || 0) * 100) })}
            </div>
            {ins.evidence?.length ? (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ins.evidence.slice(0, limit).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--tg-hint-color)' }}>
                    “{e.quote}”
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {disclaimer}
      </div>
    );
  };

  const renderRecommendations = () => {
    const items = analytics?.recommendations || [];
    if (!items.length) return <div style={{ padding: 16, color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.v3.empty')}</div>;
    const limit = quotesLimit(analytics?.overview?.total_responses);
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((r) => (
          <div key={r.id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>{r.title}</div>
              <div style={{ padding: '2px 8px', borderRadius: 999, background: pill(r.expected_impact).bg, color: pill(r.expected_impact).color, fontSize: 12, fontWeight: 800 }}>
                {formatPriorityRu(r.expected_impact)}
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>{r.rationale}</div>
            {r.evidence?.length ? (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {r.evidence.slice(0, limit).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--tg-hint-color)' }}>
                    “{e.quote}”
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {disclaimer}
      </div>
    );
  };

  const renderRelationships = () => {
    const items = analytics?.relationships || [];
    if (!items.length) return <div style={{ padding: 16, color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.v3.empty')}</div>;
    const limit = quotesLimit(analytics?.overview?.total_responses);
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((rel) => (
          <div key={rel.id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tg-section-separator-color)', background: 'var(--tg-section-bg-color)' }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {rel.from_signal.label} → {rel.to_signal.label}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--tg-hint-color)' }}>
              {t('aiAnalytics.v3.relationshipMeta', { strength: formatStrengthRu(rel.strength), count: rel.support_count })}
            </div>
            <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>{rel.business_implication}</div>
            {rel.evidence?.length ? (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rel.evidence.slice(0, limit).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--tg-hint-color)' }}>
                    “{e.quote}”
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {disclaimer}
      </div>
    );
  };

  const header = (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--tg-section-bg-color)', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', borderRadius: 10, cursor: 'pointer' }}
        >
          <ArrowLeft size={20} color="var(--tg-text-color)" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800 }}>{t('aiAnalytics.title')}</div>
          <div style={{ fontSize: 12, color: 'var(--tg-hint-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{surveyTitle}</div>
        </div>
        <button
          onClick={refresh}
          style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', border: 'none', background: 'var(--tg-button-color)', color: 'var(--tg-button-text-color)', borderRadius: 10, cursor: 'pointer' }}
          title={t('aiAnalytics.refresh')}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px 14px', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: t('aiAnalytics.v3.tabs.overview'), icon: <Brain size={16} /> },
          { id: 'insights', label: t('aiAnalytics.v3.tabs.insights'), icon: <AlertCircle size={16} /> },
          { id: 'recommendations', label: t('aiAnalytics.v3.tabs.recommendations'), icon: <Lightbulb size={16} /> },
          { id: 'relationships', label: t('aiAnalytics.v3.tabs.relationships'), icon: <Link2 size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 999,
              border: `1px solid var(--tg-section-separator-color)`,
              background: activeTab === tab.id ? 'var(--tg-button-color)' : 'transparent',
              color: activeTab === tab.id ? 'var(--tg-button-text-color)' : 'var(--tg-text-color)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)' }}>
        {header}
        <CenteredPageContainer>
          <div style={{ padding: 24, color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.loading')}</div>
        </CenteredPageContainer>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)' }}>
      {header}
      <CenteredPageContainer>
        {error && (
          <div style={{ margin: 14, padding: 12, borderRadius: 12, border: '1px solid #fcc', background: '#fee', color: '#c33', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {generating ? (
          <div style={{ padding: 24, color: 'var(--tg-hint-color)' }}>
            <div style={{ fontWeight: 800, color: 'var(--tg-text-color)' }}>{t('aiAnalytics.generating')}</div>
            <div style={{ marginTop: 8 }}>{progress?.message}</div>
            {progress ? (
              <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: 'var(--tg-section-separator-color)', overflow: 'hidden' }}>
                <div style={{ width: `${progress.progress}%`, height: '100%', background: 'var(--tg-button-color)' }} />
              </div>
            ) : null}
          </div>
        ) : !analytics ? (
          <div style={{ padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t('aiAnalytics.notFound')}</div>
            <div style={{ marginTop: 8, color: 'var(--tg-hint-color)' }}>{t('aiAnalytics.notFoundDescription')}</div>
            <button
              onClick={generateAnalytics}
              style={{ marginTop: 16, width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--tg-button-color)', color: 'var(--tg-button-text-color)', fontWeight: 900, cursor: 'pointer' }}
            >
              {t('aiAnalytics.generateButton')}
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'insights' && renderInsights()}
              {activeTab === 'recommendations' && renderRecommendations()}
              {activeTab === 'relationships' && renderRelationships()}
            </motion.div>
          </AnimatePresence>
        )}
      </CenteredPageContainer>
    </div>
  );
};

export default AIAnalyticsPage;
