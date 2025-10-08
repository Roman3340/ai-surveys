import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import CreateSurveyPage from './pages/Survey/CreateSurveyPage';
import SurveyCreatorPage from './pages/Survey/SurveyCreatorPage';
import AISurveyPage from './pages/Survey/AISurveyPage';
import AIBusinessPage from './pages/Survey/AIBusinessPage';
import AIPersonalPage from './pages/Survey/AIPersonalPage';
import AIAdvancedSettingsPage from './pages/Survey/AIAdvancedSettingsPage';
import { SurveyPublishedPage } from './pages/Survey/SurveyPublishedPage';
import MotivationPage from './pages/Survey/MotivationPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ThemeSettingsPage from './pages/Settings/ThemeSettingsPage';
import LanguageSettingsPage from './pages/Settings/LanguageSettingsPage';
import { useTelegram } from './hooks/useTelegram';
import { useAppStore } from './store/useAppStore';
import { DevTools } from './components/DevTools';
import './styles/globals.css';

function App() {
  const { isReady, theme: telegramTheme } = useTelegram();
  const { theme: appTheme } = useAppStore();
  const isInitialized = useRef(false);

  // Синхронизация темы
  useEffect(() => {
    if (isReady) {
      // Определяем финальную тему
      let finalTheme = appTheme;
      
      if (appTheme === 'system') {
        finalTheme = telegramTheme; // Используем тему из Telegram для системной
      }
      
      // Устанавливаем тему в DOM
      document.documentElement.setAttribute('data-theme', finalTheme);
      console.log('Theme applied:', finalTheme, 'from app theme:', appTheme);
      
      // Отмечаем что инициализация завершена
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [isReady, telegramTheme, appTheme]);

  // Дополнительный эффект для принудительного применения темы при изменении appTheme
  useEffect(() => {
    if (isInitialized.current) {
      let finalTheme = appTheme;
      
      if (appTheme === 'system') {
        finalTheme = telegramTheme;
      }
      
      document.documentElement.setAttribute('data-theme', finalTheme);
      console.log('Theme force applied:', finalTheme, 'from app theme:', appTheme);
    }
  }, [appTheme, telegramTheme]);

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/survey/create" element={<CreateSurveyPage />} />
          <Route path="/survey/create/manual" element={<SurveyCreatorPage />} />
          <Route path="/survey/create/ai" element={<AISurveyPage />} />
          <Route path="/survey/create/ai/business" element={<AIBusinessPage />} />
          <Route path="/survey/create/ai/personal" element={<AIPersonalPage />} />
          <Route path="/survey/create/ai/advanced-settings" element={<AIAdvancedSettingsPage />} />
          <Route path="/survey/create/ai/motivation" element={<MotivationPage />} />
          <Route path="/survey/published" element={<SurveyPublishedPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/theme" element={<ThemeSettingsPage />} />
          <Route path="/settings/language" element={<LanguageSettingsPage />} />
        </Routes>
        <DevTools />
      </div>
    </Router>
  );
}

export default App;