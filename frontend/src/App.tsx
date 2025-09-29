import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import CreateSurveyPage from './pages/Survey/CreateSurveyPage';
import ManualSurveyPage from './pages/Survey/ManualSurveyPage';
import AISurveyPage from './pages/Survey/AISurveyPage';
import QuestionBuilder from './pages/Survey/QuestionBuilder';
import SurveyPreview from './pages/Survey/SurveyPreview';
import SettingsPage from './pages/Settings/SettingsPage';
import ThemeSettingsPage from './pages/Settings/ThemeSettingsPage';
import LanguageSettingsPage from './pages/Settings/LanguageSettingsPage';
import { useTelegram } from './hooks/useTelegram';
import { useAppStore } from './store/useAppStore';
import { DevTools } from './components/DevTools';
import './styles/globals.css';

function App() {
  const { isReady, theme: telegramTheme } = useTelegram();
  const { theme: appTheme, setTheme } = useAppStore();

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
      console.log('Theme applied:', finalTheme);
    }
  }, [isReady, telegramTheme, appTheme]);

  // Инициализация темы при первом запуске
  useEffect(() => {
    if (isReady && !appTheme) {
      setTheme('system'); // По умолчанию системная тема
    }
  }, [isReady, appTheme, setTheme]);

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
          <Route path="/survey/create/manual/questions" element={<QuestionBuilder />} />
          <Route path="/survey/create/manual/preview" element={<SurveyPreview />} />
          <Route path="/survey/create/ai" element={<AISurveyPage />} />
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