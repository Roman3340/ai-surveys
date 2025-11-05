import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from '../locales/ru.json';
import en from '../locales/en.json';

// Функция для получения языка из Telegram, localStorage или дефолтного
const getStoredLanguage = (): string => {
  // 1. Сначала проверяем, есть ли язык в localStorage (пользователь выбрал вручную)
  try {
    const stored = localStorage.getItem('ai-surveys-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.state?.language) {
        // Если пользователь уже выбрал язык вручную, используем его
        return parsed.state.language;
      }
    }
  } catch (e) {
    console.error('Error reading language from storage:', e);
  }
  
  // 2. Если язык не установлен вручную, проверяем Telegram
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.language_code) {
      const telegramLang = tg.initDataUnsafe.user.language_code;
      // Конвертируем код языка Telegram в наш формат (en, ru)
      // Telegram возвращает коды типа 'en', 'ru', 'en-US', 'ru-RU' и т.д.
      const langCode = telegramLang.split('-')[0].toLowerCase();
      if (langCode === 'en' || langCode === 'ru') {
        console.log('Auto-detected language from Telegram:', langCode);
        return langCode;
      }
    }
  } catch (e) {
    console.error('Error reading language from Telegram:', e);
  }
  
  // 3. Дефолтный язык
  return 'ru';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: {
        translation: ru
      },
      en: {
        translation: en
      }
    },
    lng: getStoredLanguage(), // Язык по умолчанию
    fallbackLng: 'ru', // Язык на случай, если перевод не найден
    interpolation: {
      escapeValue: false // React уже экранирует значения
    },
    react: {
      useSuspense: false // Не использовать Suspense для i18n
    }
  });

// Функция для изменения языка
export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
};

export default i18n;

