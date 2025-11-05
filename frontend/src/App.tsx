import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import CreateSurveyPage from './pages/Survey/CreateSurveyPage';
import SurveyCreatorPage from './pages/Survey/SurveyCreatorPage';
import AISurveyPage from './pages/Survey/AISurveyPage';
import AIBusinessPage from './pages/Survey/AIBusinessPage';
import AIPersonalPage from './pages/Survey/AIPersonalPage';
import AIAdvancedSettingsPage from './pages/Survey/AIAdvancedSettingsPage';
import { SurveyPublishedPage } from './pages/Survey/SurveyPublishedPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ThemeSettingsPage from './pages/Settings/ThemeSettingsPage';
import ColorSettingsPage from './pages/Settings/ColorSettingsPage';
import LanguageSettingsPage from './pages/Settings/LanguageSettingsPage';
import SurveyAnalyticsPage from './pages/Survey/SurveyAnalyticsPage';
import SurveyInvitePage from './pages/Survey/SurveyInvitePage';
import SurveyTakePage from './pages/Survey/SurveyTakePage';
import SurveyCompletedPage from './pages/Survey/SurveyCompletedPage';
import AIAnalyticsPage from './pages/Survey/AIAnalyticsPage';
import { SurveyTemplatesPage } from './pages/Templates/SurveyTemplatesPage';
import TemplateDetailPage from './pages/Templates/TemplateDetailPage';
import { KnowledgeBasePage } from './pages/Knowledge/KnowledgeBasePage';
import { ArticlePage } from './pages/Knowledge/ArticlePage';
import { useTelegram } from './hooks/useTelegram';
import { useAppStore } from './store/useAppStore';
import { DevTools } from './components/DevTools';
import './styles/globals.css';

function AppRoutes() {
  const navigate = useNavigate();
  const { surveyInviteId, setSurveyInviteId } = useAppStore();
  
  // Редирект на страницу приглашения если есть surveyInviteId
  useEffect(() => {
    if (surveyInviteId) {
      navigate(`/survey/${surveyInviteId}/invite`);
      setSurveyInviteId(null); // Очищаем после редиректа
    }
  }, [surveyInviteId, navigate, setSurveyInviteId]);
  
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/survey/create" element={<CreateSurveyPage />} />
      <Route path="/survey/create/manual" element={<SurveyCreatorPage />} />
      <Route path="/survey/create/ai" element={<AISurveyPage />} />
      <Route path="/survey/create/ai/business" element={<AIBusinessPage />} />
      <Route path="/survey/create/ai/personal" element={<AIPersonalPage />} />
      <Route path="/survey/create/ai/advanced-settings" element={<AIAdvancedSettingsPage />} />
      <Route path="/survey/published" element={<SurveyPublishedPage />} />
      <Route path="/survey/:surveyId" element={<SurveyAnalyticsPage />} />
      <Route path="/survey/:surveyId/ai-analytics" element={<AIAnalyticsPage />} />
      <Route path="/survey/:surveyId/invite" element={<SurveyInvitePage />} />
      <Route path="/survey/:surveyId/take" element={<SurveyTakePage />} />
      <Route path="/survey/:surveyId/completed" element={<SurveyCompletedPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/theme" element={<ThemeSettingsPage />} />
      <Route path="/settings/color" element={<ColorSettingsPage />} />
      <Route path="/settings/language" element={<LanguageSettingsPage />} />
      <Route path="/templates" element={<SurveyTemplatesPage />} />
      <Route path="/templates/:templateId" element={<TemplateDetailPage />} />
      <Route path="/knowledge" element={<KnowledgeBasePage />} />
      <Route path="/knowledge/article/:articleId" element={<ArticlePage />} />
    </Routes>
  );
}

function App() {
  const { isReady, theme: telegramTheme, forceExpand } = useTelegram();
  const { theme: appTheme, color: appColor } = useAppStore();
  const isInitialized = useRef(false);

  // Синхронизация темы и принудительное расширение
  useEffect(() => {
    if (isReady) {
      // Принудительное расширение для полного экрана
      forceExpand();
      
      // Определяем финальную тему
      let finalTheme = appTheme;
      
      if (appTheme === 'system') {
        finalTheme = telegramTheme; // Используем тему из Telegram для системной
      }
      
      // Устанавливаем тему и цвет в DOM
      document.documentElement.setAttribute('data-theme', finalTheme);
      document.documentElement.setAttribute('data-color', appColor);
      console.log('Theme applied:', finalTheme, 'from app theme:', appTheme);
      console.log('Color applied:', appColor);
      
      // Отмечаем что инициализация завершена
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [isReady, telegramTheme, appTheme, appColor, forceExpand]);

  // Дополнительный эффект для принудительного применения темы при изменении appTheme
  useEffect(() => {
    if (isInitialized.current) {
      let finalTheme = appTheme;
      
      if (appTheme === 'system') {
        finalTheme = telegramTheme;
      }
      
      document.documentElement.setAttribute('data-theme', finalTheme);
      document.documentElement.setAttribute('data-color', appColor);
      console.log('Theme force applied:', finalTheme, 'from app theme:', appTheme);
      console.log('Color force applied:', appColor);
    }
  }, [appTheme, telegramTheme, appColor]);

  // Показываем загрузку пока Telegram WebApp не готов
  if (!isReady) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-md"></div>
          <p className="text-secondary">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <Router basename={import.meta.env.PROD ? '/ai-surveys' : ''}>
      <div className="min-h-screen bg-primary">
        <AppRoutes />
        <DevTools />
      </div>
    </Router>
  );
}

export default App;