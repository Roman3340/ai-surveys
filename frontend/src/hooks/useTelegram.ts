import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import type { TelegramUserData } from '../types';
import { getTelegramWebApp, isTelegramEnvironment } from '../utils/mockTelegram';

// Глобальный менеджер для управления BackButton (вне компонента для предотвращения пересоздания)
const createBackButtonManager = () => {
  let currentCallbackId: string | null = null;
  let isShown = false;
  let currentCallback: (() => void) | null = null;
  
  return {
    setCallback: (callback: () => void, callbackId: string) => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
        
      // Если уже установлен этот callback, не переустанавливаем
      if (currentCallbackId === callbackId && currentCallback === callback) {
        return;
      }
      
      // Очищаем предыдущий callback
      if (currentCallback) {
        tg.BackButton.offClick(currentCallback);
      }
      
      // Устанавливаем новый callback
      currentCallback = callback;
      tg.BackButton.onClick(callback);
      currentCallbackId = callbackId;
      console.log('BackButton callback set for:', callbackId);
    },
    
    clearCallback: (callbackId: string) => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
        
      if (currentCallbackId === callbackId && currentCallback) {
        tg.BackButton.offClick(currentCallback);
        currentCallback = null;
        currentCallbackId = null;
        console.log('BackButton callback cleared for:', callbackId);
      }
    },
    
    show: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
        
      if (!isShown) {
        tg.BackButton.show();
        isShown = true;
        console.log('BackButton shown');
      }
    },
    
    hide: () => {
      const tg = isTelegramEnvironment() 
        ? (WebApp as unknown as TelegramWebApp)
        : getTelegramWebApp();
        
      if (isShown) {
        tg.BackButton.hide();
        isShown = false;
        console.log('BackButton hidden');
      }
    }
  };
};

const globalBackButtonManager = createBackButtonManager();

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
    isVisible?: boolean;
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
      try {
        if (tg.BackButton) {
          globalBackButtonManager.show();
        }
      } catch (error) {
        console.error('Error showing BackButton:', error);
      }
    },
    hide: () => {
      try {
        if (tg.BackButton) {
          globalBackButtonManager.hide();
        }
      } catch (error) {
        console.error('Error hiding BackButton:', error);
      }
    },
    onClick: (callback: () => void, callbackId?: string) => {
      try {
        if (tg.BackButton) {
          // Используем URL как уникальный ID если не передан
          const id = callbackId || window.location.pathname;
          globalBackButtonManager.setCallback(callback, id);
        }
      } catch (error) {
        console.error('Error setting BackButton onClick:', error);
      }
    },
    offClick: (callbackId?: string) => {
      try {
        if (tg.BackButton) {
          // Используем URL как уникальный ID если не передан
          const id = callbackId || window.location.pathname;
          globalBackButtonManager.clearCallback(id);
        }
      } catch (error) {
        console.error('Error removing BackButton onClick:', error);
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
