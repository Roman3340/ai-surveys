import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import type { TelegramUserData } from '../types';
import { getTelegramWebApp, isTelegramEnvironment } from '../utils/mockTelegram';

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUserData;
    start_param?: string;
  };
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
  hapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
}

export const useTelegram = () => {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUserData | null>(null);
  const [startParam, setStartParam] = useState<string | null>(null);

  useEffect(() => {
    // Используем реальный Telegram WebApp или мок для разработки
    const tg = isTelegramEnvironment() 
      ? (WebApp as unknown as TelegramWebApp)
      : getTelegramWebApp();
    
    // Инициализация Telegram WebApp
    tg.ready();
    tg.expand();
    
    // Получение данных пользователя
    if (tg.initDataUnsafe.user) {
      setUser(tg.initDataUnsafe.user);
    }
    
    // Получение стартового параметра (для прямых ссылок на опросы)
    if (tg.initDataUnsafe.start_param) {
      setStartParam(tg.initDataUnsafe.start_param);
    }
    
    setIsReady(true);
    
    // Логирование для отладки
    console.log('Telegram environment:', isTelegramEnvironment());
    console.log('User data:', tg.initDataUnsafe.user);
  }, []);

  const showAlert = (message: string) => {
    const tg = isTelegramEnvironment() 
      ? (WebApp as unknown as TelegramWebApp)
      : getTelegramWebApp();
    tg.showAlert(message);
  };

  const showConfirm = async (message: string): Promise<boolean> => {
    const tg = isTelegramEnvironment() 
      ? (WebApp as unknown as TelegramWebApp)
      : getTelegramWebApp();
    return tg.showConfirm(message);
  };

  const hapticFeedback = {
    light: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
      tg.hapticFeedback?.impactOccurred('light');
    },
    medium: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
      tg.hapticFeedback?.impactOccurred('medium');
    },
    heavy: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
      tg.hapticFeedback?.impactOccurred('heavy');
    },
    success: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
      tg.hapticFeedback?.notificationOccurred('success');
    },
    error: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
      tg.hapticFeedback?.notificationOccurred('error');
    },
    warning: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
      tg.hapticFeedback?.notificationOccurred('warning');
    },
    selection: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
      tg.hapticFeedback?.selectionChanged();
    },
  };

  const tg = isTelegramEnvironment() 
    ? (WebApp as unknown as TelegramWebApp)
    : getTelegramWebApp();
  
  const theme = tg.colorScheme;
  const themeParams = tg.themeParams;

  const close = () => {
    tg.close();
  };

  const backButton = {
    show: () => {
      if (tg.BackButton) {
        tg.BackButton.show();
      }
    },
    hide: () => {
      if (tg.BackButton) {
        tg.BackButton.hide();
      }
    },
    onClick: (callback: () => void) => {
      if (tg.BackButton) {
        tg.BackButton.onClick(callback);
      }
    },
    offClick: (callback: () => void) => {
      if (tg.BackButton) {
        tg.BackButton.offClick(callback);
      }
    },
  };

  return {
    isReady,
    user,
    startParam,
    theme,
    themeParams,
    isTelegram: isTelegramEnvironment(),
    showAlert,
    showConfirm,
    hapticFeedback,
    backButton,
    close,
  };
};
