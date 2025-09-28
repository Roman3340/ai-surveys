// Моковые данные Telegram для разработки в браузере

export const MOCK_TELEGRAM_USER = {
  id: 123456789,
  firstName: 'Иван',
  lastName: 'Петров',
  username: 'ivan_petrov',
  languageCode: 'ru',
};

export const MOCK_TELEGRAM_DATA = {
  initData: 'mock_init_data',
  initDataUnsafe: {
    user: MOCK_TELEGRAM_USER,
    start_param: null,
  },
  colorScheme: 'light' as const,
  themeParams: {
    bg_color: '#ffffff',
    text_color: '#000000',
    hint_color: '#708499',
    link_color: '#2481cc',
    button_color: '#2481cc',
    button_text_color: '#ffffff',
  },
  isExpanded: true,
  viewportHeight: 600,
  ready: () => console.log('Telegram WebApp ready (mock)'),
  expand: () => console.log('Telegram WebApp expand (mock)'),
  close: () => console.log('Telegram WebApp close (mock)'),
  showAlert: (message: string) => {
    console.log('Telegram Alert (mock):', message);
    alert(message);
  },
  showConfirm: (message: string) => {
    console.log('Telegram Confirm (mock):', message);
    return Promise.resolve(confirm(message));
  },
  hapticFeedback: {
    impactOccurred: (style: string) => 
      console.log(`Haptic feedback (mock): ${style}`),
    notificationOccurred: (type: string) => 
      console.log(`Haptic notification (mock): ${type}`),
    selectionChanged: () => 
      console.log('Haptic selection changed (mock)'),
  },
  BackButton: {
    show: () => console.log('BackButton show (mock)'),
    hide: () => console.log('BackButton hide (mock)'),
    onClick: (callback: () => void) => {
      console.log('BackButton onClick (mock)');
      // В реальной разработке можно добавить слушатель на клавишу Escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          callback();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    },
    offClick: (callback: () => void) => {
      console.log('BackButton offClick (mock)');
      // Удаляем слушатель
      document.removeEventListener('keydown', () => callback());
    },
  },
};

// Проверка, запущено ли приложение в Telegram
export const isTelegramEnvironment = (): boolean => {
  // Проверяем несколько критериев:
  // 1. Есть ли объект Telegram.WebApp
  // 2. Есть ли реальные данные пользователя (не пустые)
  // 3. Есть ли initData от Telegram
  const tg = (window as any).Telegram?.WebApp;
  
  if (!tg) return false;
  
  // В настоящем Telegram всегда есть initData или пользователь
  const hasRealData = tg.initData || tg.initDataUnsafe?.user?.id;
  
  // Проверяем, не является ли это просто SDK загруженным в браузере
  const isRealTelegram = hasRealData && tg.platform !== undefined;
  
  return !!isRealTelegram;
};

// Получение Telegram WebApp или мока
export const getTelegramWebApp = () => {
  if (isTelegramEnvironment()) {
    return (window as any).Telegram.WebApp;
  }
  return MOCK_TELEGRAM_DATA;
};
