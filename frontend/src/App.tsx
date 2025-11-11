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
import DevelopmentPage from './pages/Development/DevelopmentPage';
import { useTelegram } from './hooks/useTelegram';
import { useAppStore } from './store/useAppStore';
import { DevTools } from './components/DevTools';
import { changeLanguage } from './i18n/config';
import './i18n/config'; // Инициализация i18n
import './styles/globals.css';
import { useLocation } from 'react-router-dom';

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { surveyInviteId, setSurveyInviteId } = useAppStore();
  const { user, isReady } = useTelegram();
  
  // ID разработчиков
  const DEVELOPER_TELEGRAM_IDS = ["649712397"]; // "8257858398"
  
  // Проверяем, является ли текущий путь публичным (для опросов)
  const isPublicRoute = location.pathname.includes('/invite') || 
                        location.pathname.includes('/take') || 
                        location.pathname.includes('/completed');
  
  // Проверяем доступ (только после загрузки данных пользователя)
  const isDeveloper = user?.id && DEVELOPER_TELEGRAM_IDS.includes(user.id.toString());
  
  // Редирект на страницу приглашения если есть surveyInviteId
  useEffect(() => {
    if (surveyInviteId) {
      navigate(`/survey/${surveyInviteId}/invite`);
      setSurveyInviteId(null); // Очищаем после редиректа
    }
  }, [surveyInviteId, navigate, setSurveyInviteId]);
  
  // Если это публичный маршрут, всегда разрешаем доступ
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/survey/:surveyId/invite" element={<SurveyInvitePage />} />
        <Route path="/survey/:surveyId/take" element={<SurveyTakePage />} />
        <Route path="/survey/:surveyId/completed" element={<SurveyCompletedPage />} />
      </Routes>
    );
  }
  
  // Если данные пользователя загружены и это не разработчик, показываем страницу разработки
  if (isReady && !isDeveloper) {
    return <DevelopmentPage />;
  }
  
  // Если данные еще не загружены, показываем загрузку (для непубличных маршрутов)
  if (!isReady && !isPublicRoute) {
    return (
      <>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--tg-bg-color)'
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
            <p style={{ color: 'var(--tg-hint-color)' }}>Загрузка...</p>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }
  
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
  const { isReady, theme: telegramTheme, forceExpand, languageCode: telegramLanguageCode } = useTelegram();
  const { theme: appTheme, color: appColor, language, setLanguage } = useAppStore();
  const isInitialized = useRef(false);

  // Автоматическое определение языка из Telegram при первом запуске (если язык не установлен вручную)
  useEffect(() => {
    if (isReady && telegramLanguageCode && !isInitialized.current) {
      // Проверяем, был ли язык установлен вручную пользователем
      const stored = localStorage.getItem('ai-surveys-storage');
      let wasLanguageSetManually = false;
      
      try {
        if (stored) {
          const parsed = JSON.parse(stored);
          wasLanguageSetManually = !!parsed.state?.language;
        }
      } catch (e) {
        console.error('Error checking manual language setting:', e);
      }
      
      // Если язык не был установлен вручную, устанавливаем из Telegram
      if (!wasLanguageSetManually) {
        const telegramLang = telegramLanguageCode.split('-')[0].toLowerCase();
        if (telegramLang === 'en' || telegramLang === 'ru') {
          console.log('Auto-setting language from Telegram:', telegramLang);
          setLanguage(telegramLang as 'ru' | 'en');
        }
      }
    }
  }, [isReady, telegramLanguageCode, setLanguage]);

  // Синхронизация темы, цвета и языка при инициализации
  useEffect(() => {
    if (isReady) {
      // Принудительное расширение для полного экрана
      forceExpand();
      
      // Синхронизируем язык
      changeLanguage(language);
      
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
      console.log('Language applied:', language);
      
      // Отмечаем что инициализация завершена
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [isReady, telegramTheme, appTheme, appColor, language, forceExpand]);

  // Дополнительный эффект для принудительного применения темы, цвета и языка при изменении
  useEffect(() => {
    if (isInitialized.current) {
      // Синхронизируем язык при изменении
      changeLanguage(language);
      
      let finalTheme = appTheme;
      
      if (appTheme === 'system') {
        finalTheme = telegramTheme;
      }
      
      document.documentElement.setAttribute('data-theme', finalTheme);
      document.documentElement.setAttribute('data-color', appColor);
      console.log('Theme force applied:', finalTheme, 'from app theme:', appTheme);
      console.log('Color force applied:', appColor);
      console.log('Language force applied:', language);
    }
  }, [appTheme, telegramTheme, appColor, language]);

  // Показываем загрузку пока Telegram WebApp не готов
  // Используем статический текст, так как i18n может быть еще не инициализирован
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