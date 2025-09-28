import { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Sun, Moon, User, Smartphone } from 'lucide-react';
import { Button } from './ui/Button';
import { useAppStore } from '../store/useAppStore';
import { isTelegramEnvironment } from '../utils/mockTelegram';

export const DevTools = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useAppStore();

  // Отладочная информация
  const isTelegram = isTelegramEnvironment();
  console.log('DevTools - isTelegramEnvironment:', isTelegram);
  console.log('DevTools - window.Telegram:', (window as any).Telegram);

  // Показываем инструменты разработки только в браузере
  if (isTelegram) {
    return null;
  }

  return (
    <>
      {/* Кнопка открытия - максимально простая */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          width: '60px',
          height: '60px',
          backgroundColor: '#8b5cf6',
          borderRadius: '50%',
          border: '3px solid white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings style={{ color: 'white', width: '24px', height: '24px' }} />
      </div>


      {/* Панель инструментов */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            zIndex: 999999,
            backgroundColor: 'var(--tg-section-bg-color)',
            border: '2px solid #8b5cf6',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            minWidth: '200px'
          }}
        >
            <div className="flex flex-col gap-md min-w-[200px]">
              <div className="flex items-center gap-sm text-sm text-secondary">
                <Smartphone className="w-4 h-4" />
                Режим разработки
              </div>

              {/* Переключатель темы */}
              <div className="space-y-sm">
                <p className="text-sm font-medium text-primary">Тема:</p>
                <div className="flex gap-sm">
                  <Button
                    onClick={() => {
                      setTheme('light');
                      document.documentElement.setAttribute('data-theme', 'light');
                    }}
                    variant={theme === 'light' ? 'primary' : 'outline'}
                    size="sm"
                    leftIcon={<Sun className="w-4 h-4" />}
                  >
                    Светлая
                  </Button>
                  <Button
                    onClick={() => {
                      setTheme('dark');
                      document.documentElement.setAttribute('data-theme', 'dark');
                    }}
                    variant={theme === 'dark' ? 'primary' : 'outline'}
                    size="sm"
                    leftIcon={<Moon className="w-4 h-4" />}
                  >
                    Тёмная
                  </Button>
                </div>
              </div>

              {/* Информация о пользователе */}
              <div className="space-y-sm">
                <p className="text-sm font-medium text-primary">Тестовый пользователь:</p>
                <div className="flex items-center gap-sm text-sm text-secondary">
                  <User className="w-4 h-4" />
                  Иван Петров (@ivan_petrov)
                </div>
              </div>

              {/* Заметка */}
              <div className="text-xs text-secondary border-t pt-sm">
                💡 В Telegram эта панель не отображается
              </div>
            </div>
        </div>
      )}
    </>
  );
};
