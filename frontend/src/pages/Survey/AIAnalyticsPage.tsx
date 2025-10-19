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
  // Основные метрики
  metrics?: {
    total_responses?: number;
    completion_rate?: number;
    sentiment_analysis?: {
      positive_percentage: number;
      negative_percentage: number;
      neutral_percentage: number;
    };
    key_metrics?: {
      average_rating: number | null;
      most_common_issues: string[];
      satisfaction_score: number;
    };
  };
  
  // Инсайты
  insights?: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
    confidence: number;
    data: any;
  }>;
  
  // Критические проблемы и возможности
  critical_problem?: {
    title: string;
    description: string;
    priority: string;
    confidence: number;
  };
  opportunity?: {
    title: string;
    description: string;
    priority: string;
    confidence: number;
  };
  
  // Визуализации
  visualizations?: {
    sentiment_chart?: {
      positive: number;
      negative: number;
      neutral: number;
    };
    response_timeline?: Array<{
      date: string;
      count: number;
    }>;
    question_analysis?: Array<{
      question_id: string;
      question_text: string;
      response_rate: number;
      sentiment: string;
      key_themes: string[];
    }>;
  };
  
  // Прямые данные для визуализаций (для обратной совместимости)
  sentiment_chart?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  question_analysis?: Array<{
    question_id: string;
    question_text: string;
    response_rate: number;
    sentiment: string;
    key_themes: string[];
  }>;
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
      padding: 60px 20px;
      text-align: center;
    }

    .loading-spinner {
      margin-bottom: 24px;
      position: relative;
    }

    /* Красивый оранжевый лоадер */
    .orange-loader {
      width: 60px;
      height: 60px;
      position: relative;
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
      background: linear-gradient(45deg, #ff6b35, #f7931e);
      animation-delay: 0s;
    }

    .orange-loader::after {
      width: 40px;
      height: 40px;
      background: linear-gradient(45deg, #ff8c42, #ffa726);
      top: 10px;
      left: 10px;
      animation-delay: 0.3s;
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
      color: #ff6b35;
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
      color: #ff6b35;
      animation: brainPulse 2s ease-in-out infinite;
    }

    @keyframes brainPulse {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1);
        color: #ff6b35;
      }
      50% { 
        opacity: 0.8; 
        transform: scale(1.1);
        color: #ff8c42;
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
      background: rgba(255, 107, 53, 0.2);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 16px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #ff6b35, #ff8c42, #ffa726);
      border-radius: 3px;
      transition: width 0.3s ease;
      box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
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
      color: #ff6b35;
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
      background: linear-gradient(135deg, #ff6b35, #ff8c42);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
    }

    .generate-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
    }

    .generate-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: 0 2px 8px rgba(255, 107, 53, 0.2);
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
  const [activeTab, setActiveTab] = useState<'metrics' | 'insights' | 'visualizations'>('metrics');
  const tabsRef = useRef<HTMLDivElement>(null);
  
  const handleTabClick = (tab: 'metrics' | 'insights' | 'visualizations') => {
    setActiveTab(tab);
    
    // Прокручиваем табы
    if (tabsRef.current) {
      if (tab === 'metrics') {
        // Прокручиваем влево для первого таба
        tabsRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (tab === 'visualizations') {
        // Прокручиваем вправо для последнего таба
        tabsRef.current.scrollTo({ left: tabsRef.current.scrollWidth, behavior: 'smooth' });
      }
    }
  };
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

    // Получаем базовый URL - если страница загружена по HTTPS, используем wss://
    const isHttps = window.location.protocol === 'https:';
    const baseUrl = window.location.hostname === 'localhost' 
      ? (isHttps ? 'wss://localhost:8000' : 'ws://localhost:8000')
      : (isHttps ? `wss://${window.location.hostname}` : `ws://${window.location.hostname}`);
    const wsUrl = `${baseUrl}/ws/analytics-progress/${surveyId}?telegram_id=${user.id}`;
    console.log(`Подключаемся к WebSocket (попытка ${retryCount + 1}):`, wsUrl);
    console.log('Протокол страницы:', window.location.protocol);
    console.log('Используем HTTPS:', isHttps);
    console.log('SurveyId:', surveyId);
    console.log('User ID:', user.id);
    
    try {
      wsRef.current = new WebSocket(wsUrl);
    } catch (err) {
      console.error('Ошибка создания WebSocket:', err);
      setError('Не удается создать WebSocket соединение');
      return;
    }

    wsRef.current.onopen = () => {
      console.log('WebSocket подключен');
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
          setLoading(true);
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
          setError(progressData.error || 'Ошибка генерации');
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
      setError('Ошибка подключения к серверу. Проверьте, что бэкенд запущен на порту 8000');
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket отключен:', event.code, event.reason);
      console.log('Коды закрытия: 1000=нормальное, 1001=уход со страницы, 1006=неожиданное закрытие, 4000=отсутствует telegram_id, 4001=пользователь не найден, 4002=внутренняя ошибка');
      
      if (event.code === 1006) {
        if (retryCount < 3) {
          console.log(`Попытка переподключения ${retryCount + 1}/3 через 2 секунды...`);
          setTimeout(() => {
            connectWebSocket(retryCount + 1);
          }, 2000);
        } else {
          setError('WebSocket соединение неожиданно закрыто. Проверьте: 1) Запущен ли бэкенд на порту 8000, 2) Правильный ли URL, 3) Нет ли проблем с сетью');
        }
      } else if (event.code === 4000) {
        setError('Ошибка: отсутствует telegram_id');
      } else if (event.code === 4001) {
        setError('Ошибка: пользователь не найден');
      } else if (event.code === 4002) {
        setError('Ошибка сервера');
      } else if (event.code !== 1000 && event.code !== 1001) {
        setError(`Соединение потеряно (код: ${event.code})`);
      }
    };
  };

  const testWebSocket = async () => {
    console.log('Тестируем WebSocket подключение...');
    
    // Сначала проверяем, доступен ли сервер
    try {
      const isHttps = window.location.protocol === 'https:';
      const baseUrl = window.location.hostname === 'localhost' 
        ? (isHttps ? 'https://localhost:8000' : 'http://localhost:8000')
        : (isHttps ? `https://${window.location.hostname}` : `http://${window.location.hostname}`);
      const healthUrl = `${baseUrl}/health`;
      console.log('Проверяем доступность сервера:', healthUrl);
      console.log('Протокол страницы:', window.location.protocol);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        // Для SSL сертификатов добавляем ignore certificate errors
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('Сервер доступен, подключаемся к WebSocket...');
        connectWebSocket();
      } else {
        console.error('Health check failed:', response.status, response.statusText);
        setError(`Сервер недоступен (HTTP ${response.status}). Проверьте, что бэкенд запущен с SSL сертификатами.`);
      }
    } catch (err) {
      console.error('Ошибка проверки сервера:', err);
      // Попробуем подключиться к WebSocket напрямую, если health check не работает
      console.log('Health check не работает, пробуем подключиться к WebSocket напрямую...');
      connectWebSocket();
    }
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
    if (!analyticsData) return null;

    // Извлекаем данные из правильной структуры
    const metrics = analyticsData.metrics || {};
    const visualizations = analyticsData.visualizations || {};
    
    // Отладочная информация
    console.log('AnalyticsData:', analyticsData);
    console.log('Metrics:', metrics);
    console.log('Total responses:', metrics.total_responses);

    return (
      <div className="analytics-content">
        <div className="metrics-grid">
          {/* Общая статистика */}
          <div className="metric-card">
            <h3>Общая статистика</h3>
            <div className="metric-item">
              <span className="metric-label">Прохождений опроса:</span>
              <span className="metric-value">{metrics.total_responses || 0}</span>
            </div>
          </div>

          {/* Анализ тональности */}
          <div className="metric-card">
            <h3>Тональность ответов</h3>
            <div className="sentiment-bars">
              <div className="sentiment-bar positive">
                <div className="sentiment-label">Позитивные</div>
                <div className="sentiment-value">
                  {metrics.sentiment_analysis?.positive_percentage !== null && metrics.sentiment_analysis?.positive_percentage !== undefined 
                    ? `${metrics.sentiment_analysis.positive_percentage}%`
                    : visualizations.sentiment_chart?.positive !== null && visualizations.sentiment_chart?.positive !== undefined
                    ? `${visualizations.sentiment_chart.positive}%`
                    : 'Н/Д'}
                </div>
              </div>
              <div className="sentiment-bar neutral">
                <div className="sentiment-label">Нейтральные</div>
                <div className="sentiment-value">
                  {metrics.sentiment_analysis?.neutral_percentage !== null && metrics.sentiment_analysis?.neutral_percentage !== undefined 
                    ? `${metrics.sentiment_analysis.neutral_percentage}%`
                    : visualizations.sentiment_chart?.neutral !== null && visualizations.sentiment_chart?.neutral !== undefined
                    ? `${visualizations.sentiment_chart.neutral}%`
                    : 'Н/Д'}
                </div>
              </div>
              <div className="sentiment-bar negative">
                <div className="sentiment-label">Негативные</div>
                <div className="sentiment-value">
                  {metrics.sentiment_analysis?.negative_percentage !== null && metrics.sentiment_analysis?.negative_percentage !== undefined 
                    ? `${metrics.sentiment_analysis.negative_percentage}%`
                    : visualizations.sentiment_chart?.negative !== null && visualizations.sentiment_chart?.negative !== undefined
                    ? `${visualizations.sentiment_chart.negative}%`
                    : 'Н/Д'}
                </div>
              </div>
            </div>
          </div>

          {/* Ключевые метрики */}
          {(metrics.key_metrics?.average_rating || metrics.key_metrics?.satisfaction_score) && (
            <div className="metric-card">
              <h3>Ключевые показатели</h3>
              {metrics.key_metrics?.average_rating && (
                <div className="metric-item">
                  <span className="metric-label">Средняя оценка:</span>
                  <span className="metric-value">{metrics.key_metrics.average_rating.toFixed(1)}/5</span>
                </div>
              )}
              {metrics.key_metrics?.satisfaction_score && (
                <div className="metric-item">
                  <span className="metric-label">Удовлетворенность:</span>
                  <span className="metric-value">{metrics.key_metrics.satisfaction_score}%</span>
                </div>
              )}
            </div>
          )}

          {/* Частые проблемы */}
          {metrics.key_metrics?.most_common_issues && metrics.key_metrics.most_common_issues.length > 0 && (
            <div className="metric-card">
              <h3>Частые проблемы</h3>
              <ul className="issues-list">
                {metrics.key_metrics.most_common_issues.map((issue: string, index: number) => (
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
    if (!analyticsData) return null;

    // Извлекаем инсайты из правильной структуры
    const insights = analyticsData.insights || [];
    
    // Если инсайтов нет в стандартной структуре, попробуем найти их в других местах
    if (insights.length === 0) {
      // Ищем инсайты в других частях данных
      const allInsights = [];
      
      // Проверяем, есть ли критические проблемы
      if (analyticsData.critical_problem) {
        allInsights.push({
          type: 'critical_problem',
          title: analyticsData.critical_problem.title || 'Критическая проблема',
          description: analyticsData.critical_problem.description || '',
          priority: analyticsData.critical_problem.priority || 'high',
          confidence: analyticsData.critical_problem.confidence || 0.8
        });
      }
      
      // Проверяем, есть ли возможности
      if (analyticsData.opportunity) {
        allInsights.push({
          type: 'opportunity',
          title: analyticsData.opportunity.title || 'Возможность',
          description: analyticsData.opportunity.description || '',
          priority: analyticsData.opportunity.priority || 'medium',
          confidence: analyticsData.opportunity.confidence || 0.7
        });
      }
      
      if (allInsights.length === 0) return null;
      
      return (
        <div className="analytics-content">
          <div className="insights-list">
            {allInsights.map((insight, index) => (
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
                    {insight.type === 'positive_feedback' && <CheckCircle className="icon positive_feedback" />}
                    {insight.type === 'success' && <CheckCircle className="icon success" />}
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
    }

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
                  {insight.type === 'positive_feedback' && <CheckCircle className="icon positive_feedback" />}
                  {insight.type === 'success' && <CheckCircle className="icon success" />}
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
    if (!analyticsData) return null;

    // Извлекаем данные из правильной структуры
    const visualizations = analyticsData.visualizations || {};
    const sentimentChart = visualizations.sentiment_chart || analyticsData.sentiment_chart || { positive: 0, negative: 0, neutral: 0 };
    const questionAnalysis = visualizations.question_analysis || analyticsData.question_analysis || [];

    return (
      <div className="analytics-content">
        {/* График тональности */}
        <div className="visualization-card">
          <h3>Распределение тональности</h3>
          <div className="sentiment-chart">
            <div className="chart-bar positive" style={{ height: `${Math.max(sentimentChart.positive || 0, 5)}%` }}>
              <span className="bar-label">Позитивные</span>
              <span className="bar-value">{sentimentChart.positive !== null && sentimentChart.positive !== undefined ? `${sentimentChart.positive}%` : 'Н/Д'}</span>
            </div>
            <div className="chart-bar neutral" style={{ height: `${Math.max(sentimentChart.neutral || 0, 5)}%` }}>
              <span className="bar-label">Нейтральные</span>
              <span className="bar-value">{sentimentChart.neutral !== null && sentimentChart.neutral !== undefined ? `${sentimentChart.neutral}%` : 'Н/Д'}</span>
            </div>
            <div className="chart-bar negative" style={{ height: `${Math.max(sentimentChart.negative || 0, 5)}%` }}>
              <span className="bar-label">Негативные</span>
              <span className="bar-value">{sentimentChart.negative !== null && sentimentChart.negative !== undefined ? `${sentimentChart.negative}%` : 'Н/Д'}</span>
            </div>
          </div>
        </div>

        {/* Анализ по вопросам */}
        {questionAnalysis.length > 0 && (
          <div className="visualization-card">
            <h3>Анализ по вопросам</h3>
            <div className="question-analysis">
              {questionAnalysis.map((question: any, index: number) => (
                <div key={index} className="question-item">
                  <div className="question-text">{question.question_text}</div>
                  <div className="question-metrics">
                    <span className={`sentiment-indicator ${question.sentiment}`}>
                      {question.sentiment === 'positive' && '😊'}
                      {question.sentiment === 'negative' && '😞'}
                      {question.sentiment === 'neutral' && '😐'}
                    </span>
                    <span className="response-rate">
                      Ответов: {question.response_rate ? (question.response_rate * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  {question.key_themes && question.key_themes.length > 0 && (
                    <div className="question-themes">
                      {question.key_themes.map((theme: string, themeIndex: number) => (
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
        <div className="orange-loader"></div>
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
            onClick={testWebSocket}
            title="Тест WebSocket"
          >
            <Brain className="icon" />
          </button>
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
          <div className="analytics-tabs" ref={tabsRef}>
            <button
              className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => handleTabClick('metrics')}
            >
              <TrendingUp className="icon" />
              Основные показатели
            </button>
            <button
              className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => handleTabClick('insights')}
            >
              <Lightbulb className="icon" />
              Ценные инсайты
            </button>
            <button
              className={`tab-button ${activeTab === 'visualizations' ? 'active' : ''}`}
              onClick={() => handleTabClick('visualizations')}
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
