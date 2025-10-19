import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  TrendingUp, 
  Lightbulb, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader2,
  Brain
} from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { surveyApi, aiAnalytics } from '../../services/api';

interface AnalyticsData {
  metrics?: {
    total_responses: number;
    completion_rate: number;
    sentiment_analysis: {
      positive_percentage: number;
      negative_percentage: number;
      neutral_percentage: number;
    };
    key_metrics: {
      average_rating: number | null;
      most_common_issues: string[];
      satisfaction_score: number;
    };
  };
  insights?: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
    confidence: number;
    data: any;
  }>;
  visualizations?: {
    sentiment_chart: {
      positive: number;
      negative: number;
      neutral: number;
    };
    response_timeline: Array<{
      date: string;
      count: number;
    }>;
    question_analysis: Array<{
      question_id: string;
      question_text: string;
      response_rate: number;
      sentiment: string;
      key_themes: string[];
    }>;
  };
}

interface ProgressData {
  status: string;
  progress: number;
  message: string;
  timestamp?: number;
  error?: string;
}

const AIAnalyticsPage: React.FC = () => {
  // Стили для страницы
  const styles = `
    /* AI Analytics Page Styles */
    .ai-analytics-page {
      min-height: 100vh;
      background: var(--tg-theme-bg-color);
      color: var(--tg-theme-text-color);
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      padding: 16px;
      background: var(--tg-theme-secondary-bg-color);
      border-bottom: 1px solid var(--tg-theme-section-separator-color);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .back-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .back-button:hover {
      background: var(--tg-theme-hint-color);
    }

    .back-button .icon {
      width: 20px;
      height: 20px;
      color: var(--tg-theme-text-color);
    }

    .header-content {
      flex: 1;
      margin: 0 16px;
    }

    .header-content h1 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: var(--tg-theme-text-color);
    }

    .survey-title {
      font-size: 14px;
      color: var(--tg-theme-hint-color);
      margin: 4px 0 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .action-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      background: var(--tg-theme-button-color);
      color: var(--tg-theme-button-text-color);
      border-radius: 8px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .action-button:hover {
      opacity: 0.8;
    }

    .action-button .icon {
      width: 18px;
      height: 18px;
    }

    /* Error Message */
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      margin: 16px;
      background: #fee;
      color: #c33;
      border-radius: 8px;
      border: 1px solid #fcc;
    }

    .error-message .icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* Loading State */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .loading-spinner {
      margin-bottom: 16px;
    }

    .spinner-icon {
      width: 48px;
      height: 48px;
      color: var(--tg-theme-button-color);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 16px;
      color: var(--tg-theme-hint-color);
    }

    /* Generating State */
    .generating-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .generating-spinner {
      margin-bottom: 16px;
    }

    .generating-spinner .spinner-icon {
      width: 48px;
      height: 48px;
      color: var(--tg-theme-button-color);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
    }

    .generating-text {
      font-size: 16px;
      color: var(--tg-theme-text-color);
      margin-bottom: 16px;
    }

    .progress-bar {
      width: 200px;
      height: 4px;
      background: var(--tg-theme-hint-color);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .progress-fill {
      height: 100%;
      background: var(--tg-theme-button-color);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .generating-note {
      font-size: 14px;
      color: var(--tg-theme-hint-color);
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      color: var(--tg-theme-hint-color);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--tg-theme-text-color);
    }

    .empty-state p {
      font-size: 14px;
      color: var(--tg-theme-hint-color);
      margin: 0 0 24px 0;
    }

    .generate-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--tg-theme-button-color);
      color: var(--tg-theme-button-text-color);
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .generate-button:hover {
      opacity: 0.8;
    }

    .generate-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .generate-button .button-icon {
      width: 18px;
      height: 18px;
    }

    /* Tabs */
    .analytics-tabs {
      display: flex;
      background: var(--tg-theme-secondary-bg-color);
      border-bottom: 1px solid var(--tg-theme-section-separator-color);
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .analytics-tabs::-webkit-scrollbar {
      display: none;
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border: none;
      background: transparent;
      color: var(--tg-theme-hint-color);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
    }

    .tab-button:hover {
      color: var(--tg-theme-text-color);
    }

    .tab-button.active {
      color: var(--tg-theme-button-color);
      border-bottom-color: var(--tg-theme-button-color);
    }

    .tab-button .icon {
      width: 16px;
      height: 16px;
    }

    /* Content */
    .analytics-content {
      padding: 20px;
    }

    /* Metrics */
    .metrics-grid {
      display: grid;
      gap: 16px;
    }

    .metric-card {
      background: var(--tg-theme-section-bg-color);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--tg-theme-section-separator-color);
    }

    .metric-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: var(--tg-theme-text-color);
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--tg-theme-section-separator-color);
    }

    .metric-item:last-child {
      border-bottom: none;
    }

    .metric-label {
      font-size: 14px;
      color: var(--tg-theme-hint-color);
    }

    .metric-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--tg-theme-text-color);
    }

    /* Sentiment Bars */
    .sentiment-bars {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sentiment-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
    }

    .sentiment-bar.positive {
      background: #d4edda;
      color: #155724;
    }

    .sentiment-bar.neutral {
      background: #e2e3e5;
      color: #383d41;
    }

    .sentiment-bar.negative {
      background: #f8d7da;
      color: #721c24;
    }

    .sentiment-label {
      font-weight: 500;
    }

    .sentiment-value {
      font-weight: 600;
    }

    /* Issues List */
    .issues-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .issue-item {
      padding: 6px 0;
      font-size: 14px;
      color: var(--tg-theme-text-color);
      border-bottom: 1px solid var(--tg-theme-section-separator-color);
    }

    .issue-item:last-child {
      border-bottom: none;
    }

    /* Insights */
    .insights-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .insight-card {
      background: var(--tg-theme-section-bg-color);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--tg-theme-section-separator-color);
    }

    .insight-card.critical_problem {
      border-left: 4px solid #dc3545;
    }

    .insight-card.opportunity {
      border-left: 4px solid #28a745;
    }

    .insight-card.trend {
      border-left: 4px solid #007bff;
    }

    .insight-card.recommendation {
      border-left: 4px solid #ffc107;
    }

    .insight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .insight-type {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .insight-type .icon {
      width: 18px;
      height: 18px;
    }

    .insight-type .icon.critical {
      color: #dc3545;
    }

    .insight-type .icon.opportunity {
      color: #28a745;
    }

    .insight-type .icon.trend {
      color: #007bff;
    }

    .insight-type .icon.recommendation {
      color: #ffc107;
    }

    .type-label {
      font-size: 16px;
      font-weight: 600;
      color: var(--tg-theme-text-color);
    }

    .priority-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .priority-badge.high {
      background: #f8d7da;
      color: #721c24;
    }

    .priority-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .priority-badge.low {
      background: #d1ecf1;
      color: #0c5460;
    }

    .insight-description {
      font-size: 14px;
      color: var(--tg-theme-text-color);
      line-height: 1.5;
      margin-bottom: 8px;
    }

    .insight-confidence {
      font-size: 12px;
      color: var(--tg-theme-hint-color);
    }

    /* Visualizations */
    .visualization-card {
      background: var(--tg-theme-section-bg-color);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--tg-theme-section-separator-color);
      margin-bottom: 16px;
    }

    .visualization-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: var(--tg-theme-text-color);
    }

    /* Sentiment Chart */
    .sentiment-chart {
      display: flex;
      align-items: end;
      gap: 8px;
      height: 120px;
      padding: 0 8px;
    }

    .chart-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: end;
      align-items: center;
      border-radius: 4px 4px 0 0;
      position: relative;
      min-height: 20px;
    }

    .chart-bar.positive {
      background: #d4edda;
    }

    .chart-bar.neutral {
      background: #e2e3e5;
    }

    .chart-bar.negative {
      background: #f8d7da;
    }

    .bar-label {
      position: absolute;
      bottom: -20px;
      font-size: 12px;
      color: var(--tg-theme-hint-color);
      white-space: nowrap;
    }

    .bar-value {
      position: absolute;
      top: -20px;
      font-size: 12px;
      font-weight: 600;
      color: var(--tg-theme-text-color);
    }

    /* Question Analysis */
    .question-analysis {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .question-item {
      background: var(--tg-theme-bg-color);
      border-radius: 8px;
      padding: 12px;
      border: 1px solid var(--tg-theme-section-separator-color);
    }

    .question-text {
      font-size: 14px;
      font-weight: 500;
      color: var(--tg-theme-text-color);
      margin-bottom: 8px;
    }

    .question-metrics {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .sentiment-indicator {
      font-size: 16px;
    }

    .response-rate {
      font-size: 12px;
      color: var(--tg-theme-hint-color);
    }

    .question-themes {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .theme-tag {
      padding: 2px 6px;
      background: var(--tg-theme-button-color);
      color: var(--tg-theme-button-text-color);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .page-header {
        padding: 12px;
      }
      
      .header-content h1 {
        font-size: 16px;
      }
      
      .analytics-content {
        padding: 16px;
      }
      
      .tab-button {
        padding: 10px 12px;
        font-size: 13px;
      }
      
      .tab-button .icon {
        width: 14px;
        height: 14px;
      }
    }
  `;
  const navigate = useNavigate();
  const { user, hapticFeedback } = useTelegram();
  const [activeTab, setActiveTab] = useState<'metrics' | 'insights' | 'visualizations'>('metrics');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [surveyTitle, setSurveyTitle] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const { surveyId } = useParams();

  // Настраиваем кнопку "Назад"
  useStableBackButton({ targetRoute: '/' });

  useEffect(() => {
    console.log('AIAnalyticsPage mounted, surveyId:', surveyId);
    if (!surveyId) {
      console.error('SurveyId is undefined in AIAnalyticsPage');
      navigate('/');
      return;
    }

    loadAnalytics();
    loadSurveyInfo();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [surveyId]);

  const loadSurveyInfo = async () => {
    if (!surveyId) return;
    try {
      const response = await surveyApi.getSurvey(surveyId);
      setSurveyTitle(response.title);
    } catch (err) {
      console.error('Ошибка загрузки информации об опросе:', err);
    }
  };

  const loadAnalytics = async () => {
    if (!surveyId) return;
    try {
      setLoading(true);
      setError(null);

      const response = await aiAnalytics.getAnalytics(surveyId);
      console.log('Analytics response:', response.data);
      
      if (response.data.status === 'cached' || response.data.status === 'completed') {
        setAnalyticsData(response.data.data);
        setGenerating(false);
        setLoading(false);
      } else if (response.data.status === 'generating') {
        setGenerating(true);
        setProgress(response.data.progress);
        connectWebSocket();
      } else {
        // Аналитика не найдена
        setAnalyticsData(null);
        setGenerating(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err);
      setError('Не удалось загрузить аналитику');
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `ws://localhost:8000/ws/analytics-progress/${surveyId}?telegram_id=${user?.id}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket подключен');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const progressData: ProgressData = JSON.parse(event.data);
        setProgress(progressData);

        if (progressData.status === 'completed') {
          setGenerating(false);
          loadAnalytics(); // Перезагружаем аналитику
          if (wsRef.current) {
            wsRef.current.close();
          }
        } else if (progressData.status === 'error') {
          setGenerating(false);
          setError(progressData.error || 'Ошибка генерации');
          if (wsRef.current) {
            wsRef.current.close();
          }
        }
      } catch (err) {
        console.error('Ошибка парсинга WebSocket сообщения:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket отключен');
    };
  };

  const generateAnalytics = async () => {
    if (!surveyId) return;
    try {
      setGenerating(true);
      setError(null);
      hapticFeedback?.medium?.();

      await aiAnalytics.generateAnalytics(surveyId);
      
      // Подключаемся к WebSocket для отслеживания прогресса
      connectWebSocket();
    } catch (err) {
      console.error('Ошибка запуска генерации:', err);
      setError('Не удалось запустить генерацию аналитики');
      setGenerating(false);
    }
  };

  const refreshAnalytics = async () => {
    hapticFeedback?.light?.();
    await loadAnalytics();
  };

  const exportAnalytics = async (format: string) => {
    try {
      hapticFeedback?.medium?.();
      // TODO: Реализовать экспорт
      console.log(`Экспорт в формате ${format}`);
    } catch (err) {
      console.error('Ошибка экспорта:', err);
    }
  };

  const renderMetrics = () => {
    if (!analyticsData?.metrics) return null;

    const { metrics } = analyticsData;

    return (
      <div className="analytics-content">
        <div className="metrics-grid">
          {/* Общая статистика */}
          <div className="metric-card">
            <h3>Общая статистика</h3>
            <div className="metric-item">
              <span className="metric-label">Всего ответов:</span>
              <span className="metric-value">{metrics.total_responses}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Завершенность:</span>
              <span className="metric-value">{(metrics.completion_rate * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Анализ тональности */}
          <div className="metric-card">
            <h3>Тональность ответов</h3>
            <div className="sentiment-bars">
              <div className="sentiment-bar positive">
                <div className="sentiment-label">Позитивные</div>
                <div className="sentiment-value">{metrics.sentiment_analysis.positive_percentage}%</div>
              </div>
              <div className="sentiment-bar neutral">
                <div className="sentiment-label">Нейтральные</div>
                <div className="sentiment-value">{metrics.sentiment_analysis.neutral_percentage}%</div>
              </div>
              <div className="sentiment-bar negative">
                <div className="sentiment-label">Негативные</div>
                <div className="sentiment-value">{metrics.sentiment_analysis.negative_percentage}%</div>
              </div>
            </div>
          </div>

          {/* Ключевые метрики */}
          <div className="metric-card">
            <h3>Ключевые показатели</h3>
            {metrics.key_metrics.average_rating && (
              <div className="metric-item">
                <span className="metric-label">Средняя оценка:</span>
                <span className="metric-value">{metrics.key_metrics.average_rating.toFixed(1)}</span>
              </div>
            )}
            <div className="metric-item">
              <span className="metric-label">Удовлетворенность:</span>
              <span className="metric-value">{metrics.key_metrics.satisfaction_score}/10</span>
            </div>
          </div>

          {/* Частые проблемы */}
          {metrics.key_metrics.most_common_issues.length > 0 && (
            <div className="metric-card">
              <h3>Частые проблемы</h3>
              <ul className="issues-list">
                {metrics.key_metrics.most_common_issues.map((issue, index) => (
                  <li key={index} className="issue-item">{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInsights = () => {
    if (!analyticsData?.insights) return null;

    const { insights } = analyticsData;

    return (
      <div className="analytics-content">
        <div className="insights-list">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              className={`insight-card ${insight.type}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="insight-header">
                <div className="insight-type">
                  {insight.type === 'critical_problem' && <AlertCircle className="icon critical" />}
                  {insight.type === 'opportunity' && <Lightbulb className="icon opportunity" />}
                  {insight.type === 'trend' && <TrendingUp className="icon trend" />}
                  {insight.type === 'recommendation' && <CheckCircle className="icon recommendation" />}
                  <span className="type-label">{insight.title}</span>
                </div>
                <div className={`priority-badge ${insight.priority}`}>
                  {insight.priority === 'high' && 'Высокий'}
                  {insight.priority === 'medium' && 'Средний'}
                  {insight.priority === 'low' && 'Низкий'}
                </div>
              </div>
              <div className="insight-description">
                {insight.description}
              </div>
              <div className="insight-confidence">
                Уверенность: {(insight.confidence * 100).toFixed(0)}%
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderVisualizations = () => {
    if (!analyticsData?.visualizations) return null;

    const { visualizations } = analyticsData;

    return (
      <div className="analytics-content">
        {/* График тональности */}
        <div className="visualization-card">
          <h3>Распределение тональности</h3>
          <div className="sentiment-chart">
            <div className="chart-bar positive" style={{ height: `${visualizations.sentiment_chart.positive}%` }}>
              <span className="bar-label">Позитивные</span>
              <span className="bar-value">{visualizations.sentiment_chart.positive}%</span>
            </div>
            <div className="chart-bar neutral" style={{ height: `${visualizations.sentiment_chart.neutral}%` }}>
              <span className="bar-label">Нейтральные</span>
              <span className="bar-value">{visualizations.sentiment_chart.neutral}%</span>
            </div>
            <div className="chart-bar negative" style={{ height: `${visualizations.sentiment_chart.negative}%` }}>
              <span className="bar-label">Негативные</span>
              <span className="bar-value">{visualizations.sentiment_chart.negative}%</span>
            </div>
          </div>
        </div>

        {/* Анализ по вопросам */}
        {visualizations.question_analysis.length > 0 && (
          <div className="visualization-card">
            <h3>Анализ по вопросам</h3>
            <div className="question-analysis">
              {visualizations.question_analysis.map((question, index) => (
                <div key={index} className="question-item">
                  <div className="question-text">{question.question_text}</div>
                  <div className="question-metrics">
                    <span className={`sentiment-indicator ${question.sentiment}`}>
                      {question.sentiment === 'positive' && '😊'}
                      {question.sentiment === 'negative' && '😞'}
                      {question.sentiment === 'neutral' && '😐'}
                    </span>
                    <span className="response-rate">
                      Ответов: {(question.response_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                  {question.key_themes.length > 0 && (
                    <div className="question-themes">
                      {question.key_themes.map((theme, themeIndex) => (
                        <span key={themeIndex} className="theme-tag">{theme}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="loading-container">
      <div className="loading-spinner">
        <Loader2 className="spinner-icon" />
      </div>
      <div className="loading-text">Загружаем аналитику...</div>
    </div>
  );

  const renderGeneratingState = () => (
    <div className="generating-container">
      <div className="generating-spinner">
        <Brain className="spinner-icon" />
      </div>
      <div className="generating-text">{progress?.message || 'Генерируем аналитику...'}</div>
      {progress && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      )}
      <div className="generating-note">
        Вы можете покинуть страницу и вернуться позже
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="empty-state">
      <Brain className="empty-icon" />
      <h3>ИИ аналитика не найдена</h3>
      <p>Запустите генерацию аналитики для получения инсайтов</p>
      <button 
        className="generate-button"
        onClick={generateAnalytics}
        disabled={generating}
      >
        {generating ? (
          <>
            <Loader2 className="button-icon" />
            Генерируется...
          </>
        ) : (
          <>
            <Brain className="button-icon" />
            Получить ИИ аналитику
          </>
        )}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="ai-analytics-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft className="icon" />
          </button>
          <h1>ИИ Аналитика</h1>
        </div>
        {renderLoadingState()}
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="ai-analytics-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft className="icon" />
        </button>
        <div className="header-content">
          <h1>ИИ Аналитика</h1>
          <p className="survey-title">{surveyTitle}</p>
        </div>
        <div className="header-actions">
          <button 
            className="action-button"
            onClick={refreshAnalytics}
            title="Обновить"
          >
            <RefreshCw className="icon" />
          </button>
          <button 
            className="action-button"
            onClick={() => exportAnalytics('json')}
            title="Экспорт"
          >
            <Download className="icon" />
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle className="icon" />
          {error}
        </div>
      )}

      {generating ? (
        renderGeneratingState()
      ) : !analyticsData ? (
        renderEmptyState()
      ) : (
        <>
          {/* Табы */}
          <div className="analytics-tabs">
            <button
              className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              <TrendingUp className="icon" />
              Основные показатели
            </button>
            <button
              className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              <Lightbulb className="icon" />
              Ценные инсайты
            </button>
            <button
              className={`tab-button ${activeTab === 'visualizations' ? 'active' : ''}`}
              onClick={() => setActiveTab('visualizations')}
            >
              <BarChart3 className="icon" />
              Визуализация
            </button>
          </div>

          {/* Контент */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'metrics' && renderMetrics()}
              {activeTab === 'insights' && renderInsights()}
              {activeTab === 'visualizations' && renderVisualizations()}
            </motion.div>
          </AnimatePresence>
        </>
      )}
      </div>
    </>
  );
};

export default AIAnalyticsPage;
