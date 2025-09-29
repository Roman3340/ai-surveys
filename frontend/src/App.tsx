import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import CreateSurveyPage from './pages/Survey/CreateSurveyPage';
import ManualSurveyPage from './pages/Survey/ManualSurveyPage';
import AISurveyPage from './pages/Survey/AISurveyPage';
import AIBusinessPage from './pages/Survey/AIBusinessPage';
import AIPersonalPage from './pages/Survey/AIPersonalPage';
import QuestionBuilder from './pages/Survey/QuestionBuilder';
import SurveyPreview from './pages/Survey/SurveyPreview';
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
          <Route path="/survey/create/manual" element={<ManualSurveyPage />} />
          <Route path="/survey/create/manual/motivation" element={<MotivationPage />} />
          <Route path="/survey/create/manual/questions" element={<QuestionBuilder />} />
          <Route path="/survey/create/manual/preview" element={<SurveyPreview />} />
          <Route path="/survey/create/ai" element={<AISurveyPage />} />
          <Route path="/survey/create/ai/business" element={<AIBusinessPage />} />
          <Route path="/survey/create/ai/personal" element={<AIPersonalPage />} />
          <Route path="/survey/create/ai/motivation" element={<MotivationPage />} />
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