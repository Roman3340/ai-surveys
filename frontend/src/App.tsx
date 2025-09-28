import { useEffect } from 'react';
import { HomePage } from './pages/Home/HomePage';
import { useTelegram } from './hooks/useTelegram';
import { useAppStore } from './store/useAppStore';
import { DevTools } from './components/DevTools';
import './styles/globals.css';

function App() {
  const { isReady, theme } = useTelegram();
  const { setTheme } = useAppStore();

  // Синхронизация темы с Telegram
  useEffect(() => {
    if (isReady) {
      setTheme(theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [isReady, theme, setTheme]);

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
    <div className="min-h-screen bg-primary">
      <HomePage />
      <DevTools />
    </div>
  );
}

export default App;