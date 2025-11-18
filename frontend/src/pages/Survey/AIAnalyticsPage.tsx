import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  TrendingUp, 
  Lightbulb, 
  BarChart3,
  AlertCircle,
  Loader2,
  Brain
} from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { surveyApi, aiAnalytics } from '../../services/api';
import CenteredPageContainer from '../../components/layout/CenteredPageContainer';

interface AnalyticsDataV2 {
  version: number;
  overview: {
    total_responses: number;
    completion_rate: number;
    average_rating: number | null;
    sentiment: { positive: number | null; neutral: number | null; negative: number | null };
  };
  themes: Array<{
    question_id: string;
    label: string;
    support_count: number;
    sentiment: { positive: number; neutral: number; negative: number };
    keywords: string[];
    quotes: string[];
  }>;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
    confidence: number;
    data?: any;
    evidence?: string[];
  }>;
  recommendations?: Array<{ title: string; rationale: string; expected_impact: string }>;
  drivers: Array<{ factor_type: 'option' | 'pair'; question_id: string; label: string; effect_rating: number; effect_negative_pp: number; support: number; lift?: number }>;
  questions: Array<{ question_id: string; question_text: string; question_type: string; stats: any }>;
  trends: Array<{ date: string; responses: number; avg_value: number | null }>;
}

interface ProgressData {
  status: string;
  progress: number;
  message: string;
  timestamp?: number;
  error?: string;
}

const AIAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  // Стили для страницы
  const styles = `
    /* AI Analytics Page Styles */
    .ai-analytics-page {
      min-height: 100vh;
      background: var(--tg-bg-color);
      color: var(--tg-text-color);
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      padding: 16px;
      background: var(--tg-section-bg-color);
      border-bottom: 1px solid var(--tg-section-separator-color);
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
      background: var(--tg-hint-color);
    }

    .back-button .icon {
      width: 20px;
      height: 20px;
      color: var(--tg-text-color);
    }

    .header-content {
      flex: 1;
      margin: 0 16px;
    }

    .header-content h1 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: var(--tg-text-color);
    }

    .survey-title {
      font-size: 12px;
      color: var(--tg-hint-color);
      margin: 4px 0 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
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
      background: var(--tg-button-color);
      color: var(--tg-button-text-color);
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
      min-height: 60vh;
      padding: 40px 20px;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      text-align: center;
    }

    .loading-spinner {
      position: relative;
      width: 80px;
      height: 80px;
    }

    /* Красивый лоадер */
    .orange-loader {
      width: 80px;
      height: 80px;
      position: relative;
    }

    .loading-text {
      font-size: 20px;
      color: var(--tg-theme-text-color);
      font-weight: 600;
      margin-bottom: 8px;
    }

    .loading-subtitle {
      font-size: 14px;
      color: var(--tg-theme-hint-color);
      opacity: 0.8;
    }

    .loading-dots {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .loading-dots span {
      width: 8px;
      height: 8px;
      background: var(--tg-button-color);
      border-radius: 50%;
      animation: loadingDots 1.4s ease-in-out infinite both;
    }

    .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
    .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
    .loading-dots span:nth-child(3) { animation-delay: 0s; }

    @keyframes loadingDots {
      0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
      }
      40% {
        transform: scale(1.2);
        opacity: 1;
      }
    }

    .orange-loader::before,
    .orange-loader::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .orange-loader::before {
      width: 60px;
      height: 60px;
      background: var(--tg-button-gradient);
      animation-delay: 0s;
    }

    .orange-loader::after {
      width: 40px;
      height: 40px;
      background: var(--tg-button-color);
      top: 10px;
      left: 10px;
      animation-delay: 0.3s;
      opacity: 0.8;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(0.8);
        opacity: 0.7;
      }
    }

    /* Альтернативный лоадер с вращением */
    .spinner-icon {
      width: 48px;
      height: 48px;
      color: var(--tg-button-color);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 16px;
      color: var(--tg-hint-color);
      margin-top: 8px;
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
      color: var(--tg-button-color);
      animation: brainPulse 2s ease-in-out infinite;
    }

    @keyframes brainPulse {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1);
        color: var(--tg-button-color);
      }
      50% { 
        opacity: 0.8; 
        transform: scale(1.1);
        color: var(--tg-button-color);
      }
    }

    .generating-text {
      font-size: 16px;
      color: var(--tg-text-color);
      margin-bottom: 16px;
    }

    .progress-bar {
      width: 200px;
      height: 6px;
      background: var(--tg-section-separator-color);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 16px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .progress-fill {
      height: 100%;
      background: var(--tg-button-gradient);
      border-radius: 3px;
      transition: width 0.3s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .generating-note {
      font-size: 14px;
      color: var(--tg-hint-color);
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
      color: var(--tg-button-color);
      margin-bottom: 16px;
      animation: gentlePulse 3s ease-in-out infinite;
    }

    @keyframes gentlePulse {
      0%, 100% {
        opacity: 0.7;
        transform: scale(1);
      }
      50% {
        opacity: 1;
        transform: scale(1.05);
      }
    }

    .empty-state h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--tg-text-color);
    }

    .empty-state p {
      font-size: 14px;
      color: var(--tg-hint-color);
      margin: 0 0 24px 0;
    }

    .generate-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--tg-button-gradient);
      color: var(--tg-button-text-color);
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .generate-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .generate-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .generate-button .button-icon {
      width: 18px;
      height: 18px;
    }

    /* Tabs */
    .analytics-tabs {
      display: flex;
      background: var(--tg-section-bg-color);
      border-bottom: 1px solid var(--tg-section-separator-color);
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
      color: var(--tg-hint-color);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
    }

    .tab-button:hover {
      color: var(--tg-text-color);
    }

    .tab-button.active {
      color: var(--tg-button-color);
      border-bottom-color: var(--tg-button-color);
    }

    .tab-button .icon {
      width: 16px;
      height: 16px;
    }

    /* Content */
    .analytics-content {
      padding: 16px;
    }

    /* Metrics */
    .metrics-grid {
      display: grid;
      gap: 16px;
    }

    .metric-card {
      background: var(--tg-section-bg-color);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--tg-section-separator-color);
    }

    .metric-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: var(--tg-text-color);
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--tg-section-separator-color);
    }

    .metric-item:last-child {
      border-bottom: none;
    }

    .metric-label {
      font-size: 14px;
      color: var(--tg-hint-color);
    }

    .metric-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--tg-text-color);
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
      color: var(--tg-text-color);
      border-bottom: 1px solid var(--tg-section-separator-color);
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
      background: var(--tg-section-bg-color);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--tg-section-separator-color);
    }

    .insight-card.critical_problem {
      border-left: 4px solid #dc3545;
    }

    .insight-card.opportunity {
      border-left: 4px solid #ffc107;
    }

    .insight-card.trend {
      border-left: 4px solid #007bff;
    }

    .insight-card.recommendation {
      border-left: 4px solid #ffc107;
    }

    .insight-card.positive_feedback {
      border-left: 4px solid #28a745;
    }

    .insight-card.success {
      border-left: 4px solid #28a745;
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
      color: #ffc107;
    }

    .insight-type .icon.trend {
      color: #007bff;
    }

    .insight-type .icon.recommendation {
      color: #ffc107;
    }

    .insight-type .icon.positive_feedback {
      color: #28a745;
    }

    .insight-type .icon.success {
      color: #28a745;
    }

    .type-label {
      font-size: 16px;
      font-weight: 600;
      color: var(--tg-text-color);
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
      color: var(--tg-text-color);
      line-height: 1.5;
      margin-bottom: 8px;
    }

    .insight-confidence {
      font-size: 12px;
      color: var(--tg-hint-color);
    }

    /* Visualizations */
    .visualization-card {
      background: var(--tg-section-bg-color);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--tg-section-separator-color);
      margin-bottom: 16px;
    }

    .visualization-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: var(--tg-text-color);
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
      transition: height 0.3s ease;
    }

    .chart-bar[style*="height: 0%"] {
      min-height: 0;
      opacity: 0.3;
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
      color: var(--tg-hint-color);
      white-space: nowrap;
    }

    .bar-value {
      position: absolute;
      top: -20px;
      font-size: 12px;
      font-weight: 600;
      color: var(--tg-text-color);
    }

    /* Question Analysis */
    .question-analysis {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .question-item {
      background: var(--tg-bg-color);
      border-radius: 8px;
      padding: 12px;
      border: 1px solid var(--tg-section-separator-color);
    }

    .question-text {
      font-size: 14px;
      font-weight: 500;
      color: var(--tg-text-color);
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
      color: var(--tg-hint-color);
    }

    .question-themes {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .theme-tag {
      padding: 2px 6px;
      background: var(--tg-button-color);
      color: var(--tg-button-text-color);
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
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'insights' | 'themes' | 'questions' | 'trends'>('overview');
  const tabsRef = useRef<HTMLDivElement>(null);
  
  const handleTabClick = (tab: 'overview' | 'drivers' | 'insights' | 'themes' | 'questions' | 'trends') => {
    setActiveTab(tab);
    
    // Прокручиваем табы
    if (tabsRef.current) {
      if (tab === 'overview') {
        // Прокручиваем влево для первого таба
        tabsRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (tab === 'trends') {
        // Прокручиваем вправо для последнего таба
        tabsRef.current.scrollTo({ left: tabsRef.current.scrollWidth, behavior: 'smooth' });
      }
    }
  };
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [surveyTitle, setSurveyTitle] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const generatingRef = useRef<boolean>(false);
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
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
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
        generatingRef.current = false;
        setLoading(false);
        setError(null);
        // Останавливаем polling, если он был запущен
        if (pollingIntervalRef.current) {
          window.clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else if (response.data.status === 'generating') {
        setGenerating(true);
        generatingRef.current = true;
        setProgress(response.data.progress);
        setError(null); // Очищаем ошибку, если генерация началась
        setLoading(false);
        connectWebSocket();
        // Запускаем polling как fallback, если WebSocket не работает
        startPolling();
      } else {
        // Аналитика не найдена
        setAnalyticsData(null);
        setGenerating(false);
        generatingRef.current = false;
        setLoading(false);
        // Останавливаем polling, если он был запущен
        if (pollingIntervalRef.current) {
          window.clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err);
      setError(t('aiAnalytics.errors.loadError'));
      setLoading(false);
    }
  };

  const connectWebSocket = (retryCount = 0) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Проверяем, что у нас есть необходимые данные
    if (!surveyId) {
      console.error('SurveyId не найден для WebSocket');
      return;
    }
    
    if (!user?.id) {
      console.error('User ID не найден для WebSocket');
      return;
    }

    // Получаем базовый URL - используем удаленный сервер
    const baseUrl = 'wss://ai-surveys.ru';
    const wsUrl = `${baseUrl}/ws/analytics-progress/${surveyId}?telegram_id=${user.id}`;
    console.log(`Подключаемся к WebSocket (попытка ${retryCount + 1}):`, wsUrl);
    console.log('Протокол страницы:', window.location.protocol);
    console.log('Используем WSS для SSL сервера');
    console.log('SurveyId:', surveyId);
    console.log('User ID:', user.id);
    
    try {
    wsRef.current = new WebSocket(wsUrl);
    } catch (err) {
      console.error('Ошибка создания WebSocket:', err);
      setError(t('aiAnalytics.errors.websocketError'));
      return;
    }

    wsRef.current.onopen = () => {
      console.log('WebSocket подключен');
      // Отправляем начальное сообщение для подтверждения подключения
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'connected' }));
      }
    };

    wsRef.current.onmessage = (event) => {
      try {
        console.log('WebSocket сообщение получено:', event.data);
        const progressData: ProgressData = JSON.parse(event.data);
        console.log('Обработанные данные прогресса:', progressData);
        setProgress(progressData);

        if (progressData.status === 'completed') {
          console.log('Генерация завершена, перезагружаем аналитику');
          setGenerating(false);
          generatingRef.current = false;
          setLoading(true);
          // Останавливаем polling
          if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Небольшая задержка перед перезагрузкой, чтобы данные успели сохраниться
          setTimeout(() => {
            loadAnalytics();
          }, 2000);
          if (wsRef.current) {
            wsRef.current.close();
          }
        } else if (progressData.status === 'error') {
          console.log('Ошибка генерации:', progressData.error);
          setGenerating(false);
          generatingRef.current = false;
          setError(progressData.error || t('aiAnalytics.errors.generationError'));
          // Останавливаем polling
          if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          if (wsRef.current) {
            wsRef.current.close();
          }
        } else {
          console.log('Обновление прогресса:', progressData.progress + '%', progressData.message);
        }
      } catch (err) {
        console.error('Ошибка парсинга WebSocket сообщения:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
      console.error('WebSocket URL был:', wsUrl);
      // Не показываем ошибку сразу, если генерация идет - используем polling
      if (!generatingRef.current) {
        setError(t('aiAnalytics.errors.connectionError'));
      } else {
        console.log('WebSocket ошибка, но генерация продолжается. Используем polling.');
        startPolling();
      }
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket отключен:', event.code, event.reason);
      console.log('Коды закрытия: 1000=нормальное, 1001=уход со страницы, 1005=без кода закрытия, 1006=неожиданное закрытие, 4000=отсутствует telegram_id, 4001=пользователь не найден, 4002=внутренняя ошибка');
      
      // Если генерация еще идет, не показываем ошибку, используем polling
      if (generatingRef.current) {
        console.log('WebSocket закрыт, но генерация продолжается. Используем polling для проверки статуса.');
        startPolling();
        return; // Не обрабатываем другие коды, если генерация идет
      }
      
      // Обработка кода 1005 (No Status Received) - обычно означает неожиданное закрытие
      if (event.code === 1005) {
        console.log('WebSocket закрыт без кода закрытия (1005). Используем polling для проверки статуса.');
        startPolling();
        return;
      }
      
      if (event.code === 1006) {
        if (retryCount < 3) {
          console.log(`Попытка переподключения ${retryCount + 1}/3 через 2 секунды...`);
          setTimeout(() => {
            connectWebSocket(retryCount + 1);
          }, 2000);
        } else {
          // Не показываем ошибку, если генерация идет - используем polling
          if (!generatingRef.current) {
            setError(t('aiAnalytics.errors.websocketClosed'));
          }
        }
      } else if (event.code === 4000) {
        if (!generatingRef.current) {
          setError(t('aiAnalytics.errors.noTelegramId'));
        }
      } else if (event.code === 4001) {
        if (!generatingRef.current) {
          setError(t('aiAnalytics.errors.userNotFound'));
        }
      } else if (event.code === 4002) {
        if (!generatingRef.current) {
          setError(t('aiAnalytics.errors.serverError'));
        }
      } else if (event.code !== 1000 && event.code !== 1001) {
        // Не показываем ошибку для других кодов, если генерация идет
        if (!generatingRef.current) {
          setError(t('aiAnalytics.errors.connectionLost', { code: event.code }));
        }
      }
    };
  };

  const startPolling = () => {
    // Останавливаем предыдущий polling, если он есть
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
    }
    
    // Polling каждые 3 секунды
    pollingIntervalRef.current = window.setInterval(async () => {
      if (!surveyId || !generatingRef.current) {
        // Если генерация не идет, останавливаем polling
        if (pollingIntervalRef.current) {
          window.clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      
      try {
        console.log('Polling статуса аналитики...');
        const response = await aiAnalytics.getAnalytics(surveyId);
        
        if (response.data.status === 'completed') {
          console.log('Генерация завершена (обнаружено через polling)');
          setGenerating(false);
          generatingRef.current = false;
          setLoading(true);
          
          // Останавливаем polling
          if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Загружаем аналитику
          setTimeout(() => {
            loadAnalytics();
          }, 500);
        } else if (response.data.status === 'error') {
          console.log('Ошибка генерации (обнаружено через polling)');
          setGenerating(false);
          generatingRef.current = false;
          setError(response.data.error || t('aiAnalytics.errors.generationError'));
          
          // Останавливаем polling
          if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (response.data.status === 'generating' && response.data.progress) {
          // Обновляем прогресс, если он есть
          console.log('Обновление прогресса через polling:', response.data.progress);
          setProgress(response.data.progress);
        }
      } catch (err) {
        console.error('Ошибка polling статуса:', err);
        // Не останавливаем polling при ошибке, продолжаем проверять
      }
    }, 3000);
  };


  const generateAnalytics = async () => {
    if (!surveyId) return;
    try {
      setGenerating(true);
      generatingRef.current = true;
      setError(null);
      hapticFeedback?.medium?.();

      // Сначала подключаемся к WebSocket, чтобы не пропустить начальные обновления прогресса
      await new Promise<void>((resolve) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          // Подключаемся к WebSocket
          connectWebSocket();
          
          // Ждем подключения
          if (wsRef.current) {
            const checkConnection = () => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log('WebSocket подключен, запускаем генерацию');
                resolve();
              } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
                // Продолжаем проверять
                setTimeout(checkConnection, 100);
              } else {
                // Не удалось подключиться, продолжаем без WebSocket
                console.warn('WebSocket не подключился, продолжаем без него');
                resolve();
              }
            };
            
            // Начинаем проверку через небольшой интервал
            setTimeout(checkConnection, 100);
            
            // Таймаут на случай проблем с подключением
            setTimeout(() => {
              if (wsRef.current?.readyState !== WebSocket.OPEN) {
                console.warn('WebSocket не подключился за 5 секунд, продолжаем без него');
                resolve();
              }
            }, 5000);
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      });

      // Теперь запускаем генерацию
      await aiAnalytics.generateAnalytics(surveyId);
      
      // После запуска генерации, если WebSocket не подключился, запускаем polling
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.log('WebSocket не подключен после запуска генерации, используем polling');
        startPolling();
      }
    } catch (err) {
      console.error('Ошибка запуска генерации:', err);
      setError(t('aiAnalytics.errors.generateError'));
      setGenerating(false);
      generatingRef.current = false;
      
      // Останавливаем polling при ошибке
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  const refreshAnalytics = async () => {
    hapticFeedback?.light?.();
    await loadAnalytics();
  };

  const exportAnalytics = async (format: string) => {
    try {
      hapticFeedback?.medium?.();
      if (!analyticsData) return;
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${surveyId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const rows: string[] = [];
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        // Overview
        rows.push(['section','key','value'].join(','));
        const o = analyticsData.overview;
        rows.push(['overview','total_responses', o.total_responses].join(','));
        rows.push(['overview','completion_rate', Math.round((o.completion_rate || 0)*100)+'%'].join(','));
        rows.push(['overview','average_rating', o.average_rating ?? ''].join(','));
        rows.push(['overview','sentiment_positive', (o.sentiment.positive ?? '')].join(','));
        rows.push(['overview','sentiment_neutral', (o.sentiment.neutral ?? '')].join(','));
        rows.push(['overview','sentiment_negative', (o.sentiment.negative ?? '')].join(','));
        // Drivers
        rows.push(['section','label','effect_rating','effect_negative_pp','support','lift'].join(','));
        for (const d of analyticsData.drivers) {
          rows.push(['driver', esc(d.label), d.effect_rating, d.effect_negative_pp, d.support, d.lift ?? ''].join(','));
        }
        // Themes
        rows.push(['section','question_id','label','support_count','pos','neu','neg'].join(','));
        for (const th of analyticsData.themes || []) {
          rows.push(['theme', th.question_id, esc(th.label), th.support_count, th.sentiment.positive, th.sentiment.neutral, th.sentiment.negative].join(','));
        }
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${surveyId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Ошибка экспорта:', err);
    }
  };

  const renderOverview = () => {
    if (!analyticsData) return null;
    const o = analyticsData.overview;
    return (
      <div className="analytics-content">
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>{t('aiAnalytics.metrics.generalStats')}</h3>
            <div className="metric-item">
              <span className="metric-label">{t('aiAnalytics.metrics.totalResponses')}</span>
              <span className="metric-value">{o.total_responses}</span>
            </div>
            {o.completion_rate != null && (
              <div className="metric-item">
                <span className="metric-label">{t('aiAnalytics.metrics.completionRate')}</span>
                <span className="metric-value">{Math.round((o.completion_rate || 0) * 100)}%</span>
              </div>
            )}
            <div className="metric-item">
              <span className="metric-label">{t('aiAnalytics.metrics.averageRating')}</span>
              <span className="metric-value">{o.average_rating ?? '—'}</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>{t('aiAnalytics.metrics.sentiment')}</h3>
            <div className="sentiment-bars">
              <div className="sentiment-bar positive">
                <div className="sentiment-label">{t('aiAnalytics.metrics.positive')}</div>
                <div className="sentiment-value">{o.sentiment.positive != null ? `${o.sentiment.positive}%` : t('aiAnalytics.metrics.notAvailable')}</div>
              </div>
              <div className="sentiment-bar neutral">
                <div className="sentiment-label">{t('aiAnalytics.metrics.neutral')}</div>
                <div className="sentiment-value">{o.sentiment.neutral != null ? `${o.sentiment.neutral}%` : t('aiAnalytics.metrics.notAvailable')}</div>
              </div>
              <div className="sentiment-bar negative">
                <div className="sentiment-label">{t('aiAnalytics.metrics.negative')}</div>
                <div className="sentiment-value">{o.sentiment.negative != null ? `${o.sentiment.negative}%` : t('aiAnalytics.metrics.notAvailable')}</div>
                </div>
              </div>
            </div>
          </div>

        {analyticsData.insights?.length > 0 && (
          <div className="insights-list" style={{ marginTop: 16 }}>
            {analyticsData.insights.slice(0, 3).map((insight, index) => (
              <motion.div key={index} className={`insight-card ${insight.type}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <div className="insight-header">
                  <div className="insight-type">
                    {insight.type === 'critical_problem' && <AlertCircle className="icon critical" />}
                    {insight.type === 'opportunity' && <Lightbulb className="icon opportunity" />}
                    <span className="type-label">{insight.title}</span>
                </div>
                  <div className={`priority-badge ${insight.priority}`}>{insight.priority}</div>
                </div>
                <div className="insight-description">{insight.description}</div>
                <div className="insight-confidence">{t('aiAnalytics.insights.confidence')} {(insight.confidence * 100).toFixed(0)}%</div>
              </motion.div>
            ))}
            </div>
          )}
      </div>
    );
  };

  const renderThemes = () => {
    if (!analyticsData) return null;
    const themes = analyticsData.themes || [];
    return (
      <div className="analytics-content">
        <div className="insights-list">
          {themes.map((th, index) => (
            <motion.div key={index} className={`insight-card`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <div className="insight-header">
                <div className="insight-type">
                  <TrendingUp className="icon trend" />
                  <span className="type-label">{th.label}</span>
                </div>
                <div className="priority-badge medium">{t('aiAnalytics.metrics.totalResponses')}: {th.support_count}</div>
              </div>
              <div className="sentiment-bars" style={{ marginBottom: 8 }}>
                <div className="sentiment-bar positive"><div className="sentiment-label">{t('aiAnalytics.metrics.positive')}</div><div className="sentiment-value">{th.sentiment.positive}</div></div>
                <div className="sentiment-bar neutral"><div className="sentiment-label">{t('aiAnalytics.metrics.neutral')}</div><div className="sentiment-value">{th.sentiment.neutral}</div></div>
                <div className="sentiment-bar negative"><div className="sentiment-label">{t('aiAnalytics.metrics.negative')}</div><div className="sentiment-value">{th.sentiment.negative}</div></div>
              </div>
              {th.quotes?.length > 0 && (
                <div className="question-themes">
                  {th.quotes.slice(0,3).map((q: string, i: number) => (
                    <span key={i} className="theme-tag">“{q}”</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderInsights = () => {
    if (!analyticsData) return null;
    const insights = analyticsData.insights || [];
    const drivers = analyticsData.drivers || [];

    const groupByType: Record<string, typeof insights> = {
      critical_problem: [],
      opportunity: [],
      trend: [],
      positive_feedback: [],
      success: [],
      recommendation: [],
    };
    for (const ins of insights) {
      const t = (ins.type || 'recommendation') as keyof typeof groupByType;
      if (!groupByType[t]) groupByType[t] = [] as any;
      groupByType[t].push(ins);
    }

    const findDriverMeta = (title: string) => {
      const tl = (title || '').toLowerCase();
      let best = null as any;
      for (const d of drivers) {
        const dl = (d.label || '').toLowerCase();
        // простая эвристика сопоставления
        if (tl && dl.includes(tl)) {
          best = d; break;
        }
        // поиск по значимому слову
        const token = tl.split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 5)[0];
        if (token && dl.includes(token)) best = d;
      }
      return best;
    };

    const renderGroup = (title: string, key: keyof typeof groupByType) => (
      <div className="visualization-card" key={key}>
        <h3>{title}</h3>
          <div className="insights-list">
          {groupByType[key].map((ins, idx) => {
            const meta = findDriverMeta(ins.title);
            const quotes: string[] = (ins.evidence || (ins as any).data?.evidence || []).slice(0, 2);
            return (
              <motion.div key={idx} className={`insight-card ${ins.type}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <div className="insight-header">
                  <div className="insight-type">
                    <span className="type-label">{ins.title}</span>
                  </div>
                  <div className={`priority-badge ${ins.priority}`}>{ins.priority}</div>
                  </div>
                <div className="insight-description">{ins.description}</div>
                {(meta || quotes.length > 0) && (
                  <div className="insight-confidence" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {meta && (
                      <>
                        <span>{t('aiAnalytics.visualizations.responses')}: {meta.support}</span>
                        <span>Δ rating: {meta.effect_rating > 0 ? '+' : ''}{meta.effect_rating}</span>
                        <span>Δ negative: {meta.effect_negative_pp > 0 ? '+' : ''}{meta.effect_negative_pp} п.п.</span>
                      </>
                    )}
                    {quotes.map((q: string, i: number) => (
                      <span key={i} style={{ opacity: 0.9 }}>“{q}”</span>
                    ))}
                </div>
                )}
              </motion.div>
            );
          })}
          </div>
        </div>
      );

    return (
      <div className="analytics-content">
        {renderGroup(t('aiAnalytics.insights.critical') || 'Критические проблемы', 'critical_problem')}
        {renderGroup(t('aiAnalytics.insights.opportunities') || 'Возможности', 'opportunity')}
        {renderGroup(t('aiAnalytics.insights.trends') || 'Тренды', 'trend')}
        {renderGroup(t('aiAnalytics.insights.positive') || 'Что нравится', 'positive_feedback')}
        {renderGroup(t('aiAnalytics.insights.success') || 'Успехи', 'success')}
        {renderGroup(t('aiAnalytics.insights.recommendations') || 'Рекомендации', 'recommendation')}
      </div>
    );
  };

  const renderDrivers = () => {
    if (!analyticsData) return null;
    const drivers = analyticsData.drivers || [];
    return (
      <div className="analytics-content">
        <div className="insights-list">
          {drivers.map((d, i) => (
            <div key={i} className="insight-card">
              <div className="insight-header">
                <div className="insight-type">
                  <BarChart3 className="icon" />
                  <span className="type-label">{d.label}</span>
                </div>
                {typeof d.lift === 'number' && (
                  <div className={`priority-badge medium`}>lift {d.lift}</div>
                )}
              </div>
              <div className="insight-description">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>{t('aiAnalytics.visualizations.responses')}: {d.support}</span>
                  <span>Δ rating: {d.effect_rating > 0 ? '+' : ''}{d.effect_rating}</span>
                  <span>Δ negative: {d.effect_negative_pp > 0 ? '+' : ''}{d.effect_negative_pp} п.п.</span>
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestions = () => {
    if (!analyticsData) return null;
    const qs = analyticsData.questions || [];
    return (
      <div className="analytics-content">
        <div className="question-analysis">
          {qs.map((q, idx) => {
            const stats = q.stats || {};
            // Отрисуем распределение как бар-чарт, если есть
            const distribution = stats.distribution as Record<string, number> | undefined;
            const entries = distribution ? Object.entries(distribution) : [];
            const maxVal = entries.length ? Math.max(...entries.map(([, v]) => Number(v))) : 0;
            return (
              <div key={idx} className="question-item">
                <div className="question-text">{q.question_text}</div>
                {entries.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entries.map(([label, value], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 120, fontSize: 12, color: 'var(--tg-hint-color)' }}>{label}</div>
                        <div style={{ flex: 1, background: 'var(--tg-section-separator-color)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${maxVal ? (Number(value) / maxVal) * 100 : 0}%`, height: 8, background: 'var(--tg-button-color)' }} />
            </div>
                        <div style={{ width: 32, textAlign: 'right', fontSize: 12 }}>{value}</div>
            </div>
                    ))}
                    {/* Итог одним предложением */}
                    {entries.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--tg-hint-color)' }}>
                        {t('aiAnalytics.questions.summary') || 'Итог'}: {entries.sort((a,b)=>b[1]-a[1])[0][0]} — {entries.sort((a,b)=>b[1]-a[1])[0][1]}
            </div>
                    )}
          </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--tg-hint-color)' }}>
                    {q.question_type === 'number' || q.question_type === 'rating' || q.question_type === 'scale' ? (
                      <>
                        <div>avg: {stats.avg ?? '—'}</div>
                        <div>median: {stats.median ?? '—'}</div>
                        <div>min/max: {stats.min ?? '—'} / {stats.max ?? '—'}</div>
                        <div>count: {stats.count ?? 0}</div>
                        {/* Итог одним предложением */}
                        <div>{t('aiAnalytics.questions.summary') || 'Итог'}: {stats.avg != null ? `в среднем ${stats.avg}` : t('aiAnalytics.metrics.notAvailable')}</div>
                      </>
                    ) : (
                      <div>count: {stats.count ?? 0}</div>
                    )}
        </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTrends = () => {
    if (!analyticsData) return null;
    const tr = analyticsData.trends || [];
    if (!tr || tr.length < 2) {
      return (
        <div className="analytics-content">
          <div className="visualization-card">
            <h3>{t('aiAnalytics.tabs.trends')}</h3>
            <div style={{ fontSize: 14, color: 'var(--tg-hint-color)' }}>
              {t('aiAnalytics.trends.notEnough') || 'Недостаточно данных для отображения тренда (нужно минимум 2 даты).'}
                  </div>
                    </div>
                </div>
      );
    }
    return (
      <div className="analytics-content">
        <div className="visualization-card">
          <h3>{t('aiAnalytics.tabs.trends')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(() => {
              const maxResp = tr.length ? Math.max(...tr.map(x => x.responses)) : 0;
              return tr.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 90, fontSize: 12, color: 'var(--tg-hint-color)' }}>{r.date}</div>
                  <div style={{ flex: 1, background: 'var(--tg-section-separator-color)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${maxResp ? (r.responses / maxResp) * 100 : 0}%`, height: 10, background: 'var(--tg-button-gradient)' }} />
            </div>
                  <div style={{ width: 80, textAlign: 'right', fontSize: 12 }}>{r.responses} | {r.avg_value ?? '—'}</div>
          </div>
              ));
            })()}
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="loading-container">
      <div className="loading-content">
      <div className="loading-spinner">
          <div className="orange-loader"></div>
      </div>
      <div className="loading-text">{t('aiAnalytics.loading')}</div>
        <div className="loading-subtitle">{t('aiAnalytics.loadingSubtitle')}</div>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );

  const renderGeneratingState = () => (
    <div className="generating-container">
      <div className="generating-spinner">
        <Brain className="spinner-icon" />
      </div>
      <div className="generating-text">{progress?.message || t('aiAnalytics.generating')}</div>
      {progress && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      )}
      <div className="generating-note">
        {t('aiAnalytics.generatingNote')}
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="empty-state">
      <Brain className="empty-icon" />
      <h3>{t('aiAnalytics.notFound')}</h3>
      <p>{t('aiAnalytics.notFoundDescription')}</p>
      <button 
        className="generate-button"
        onClick={generateAnalytics}
        disabled={generating}
      >
        {generating ? (
          <>
            <Loader2 className="button-icon" />
            {t('aiAnalytics.generatingButton')}
          </>
        ) : (
          <>
            <Brain className="button-icon" />
            {t('aiAnalytics.generateButton')}
          </>
        )}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="ai-analytics-page">
        <CenteredPageContainer>
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft className="icon" />
          </button>
          <h1>{t('aiAnalytics.title')}</h1>
        </div>
        {renderLoadingState()}
        </CenteredPageContainer>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="ai-analytics-page">
      <CenteredPageContainer>
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft className="icon" />
        </button>
        <div className="header-content">
          <h1>{t('aiAnalytics.title')}</h1>
          <p className="survey-title">{surveyTitle}</p>
        </div>
        <div className="header-actions">
          <button 
            className="action-button"
            onClick={refreshAnalytics}
            title={t('aiAnalytics.refresh')}
          >
            <RefreshCw className="icon" />
          </button>
          <button 
            className="action-button"
            onClick={() => exportAnalytics('json')}
            title={t('aiAnalytics.export')}
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
          <div className="analytics-tabs" ref={tabsRef}>
            <button
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabClick('overview')}
            >
              <TrendingUp className="icon" />
              {t('aiAnalytics.tabs.metrics')}
            </button>
            <button
              className={`tab-button ${activeTab === 'drivers' ? 'active' : ''}`}
              onClick={() => handleTabClick('drivers')}
            >
              <BarChart3 className="icon" />
              {t('aiAnalytics.tabs.visualizations')}
            </button>
            <button
              className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => handleTabClick('insights')}
            >
              <Lightbulb className="icon" />
              {t('aiAnalytics.tabs.insights')}
            </button>
            <button
              className={`tab-button ${activeTab === 'themes' ? 'active' : ''}`}
              onClick={() => handleTabClick('themes')}
            >
              <Brain className="icon" />
              Themes
            </button>
            <button
              className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => handleTabClick('questions')}
            >
              <BarChart3 className="icon" />
              Questions
            </button>
            <button
              className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
              onClick={() => handleTabClick('trends')}
            >
              <BarChart3 className="icon" />
              Trends
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
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'drivers' && renderDrivers()}
              {activeTab === 'insights' && renderInsights()}
              {activeTab === 'themes' && renderThemes()}
              {activeTab === 'questions' && renderQuestions()}
              {activeTab === 'trends' && renderTrends()}
            </motion.div>
          </AnimatePresence>
        </>
      )}
      </CenteredPageContainer>
      </div>
    </>
  );
};

export default AIAnalyticsPage;
