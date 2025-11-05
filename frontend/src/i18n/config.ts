import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from '../locales/ru.json';
import en from '../locales/en.json';

// Функция для получения языка из localStorage или дефолтного
const getStoredLanguage = (): string => {
  try {
    const stored = localStorage.getItem('ai-surveys-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.state?.language) {
        return parsed.state.language;
      }
    }
  } catch (e) {
    console.error('Error reading language from storage:', e);
  }
  return 'ru'; // Дефолтный язык
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

