# 🎭 Настройка РЕАЛЬНЫХ анимаций эмодзи Telegram

## 📦 Установка зависимостей

```bash
cd frontend
npm install lottie-web @types/lottie-web
```

## 🔧 Как это работает

### 1. **Автоматическое извлечение в Telegram**
Когда приложение запускается в Telegram WebApp:
- `TelegramEmojiExtractor` автоматически ищет анимированные эмодзи в DOM
- Перехватывает сетевые запросы к `.tgs` и `.webm` файлам
- Извлекает Lottie данные из TGS файлов
- Кеширует анимации для повторного использования

### 2. **Fallback для браузера**
В обычном браузере:
- Используются предустановленные анимации
- CSS анимации как запасной вариант
- Плавная деградация функциональности

## 🎯 Использование

```tsx
import RealTelegramEmoji from './components/ui/RealTelegramEmoji';

// Простое использование
<RealTelegramEmoji emoji="💡" size="large" />

// С обработчиком клика
<RealTelegramEmoji 
  emoji="⚡" 
  size="medium" 
  onClick={() => console.log('Clicked!')}
  autoPlay={true}
/>
```

## 🔍 Поддерживаемые форматы

1. **TGS файлы** - Telegram Stickers (сжатый Lottie JSON)
2. **WebM видео** - Видео анимации эмодзи
3. **Lottie JSON** - Векторные анимации
4. **CSS Fallback** - Запасные CSS анимации

## 🚀 Извлечение новых анимаций

### Автоматически:
```typescript
// Компонент автоматически попытается извлечь анимацию
<RealTelegramEmoji emoji="🎉" />
```

### Принудительно:
```typescript
import { telegramEmojiExtractor } from './utils/telegramEmojiExtractor';

// Принудительное извлечение
const emojiData = await telegramEmojiExtractor.forceExtractEmoji('🎉');
```

## 📁 Структура файлов

```
frontend/
├── src/
│   ├── components/ui/
│   │   ├── RealTelegramEmoji.tsx    # Основной компонент
│   │   └── TelegramEmoji.tsx        # Старый компонент (fallback)
│   ├── utils/
│   │   └── telegramEmojiExtractor.ts # Экстрактор анимаций
│   └── styles/
│       └── globals.css              # Стили для анимаций
└── public/
    └── emoji-animations/            # Предустановленные анимации
        ├── lightbulb.json
        ├── lightning.json
        └── ...
```

## 🎬 Как получить больше анимаций

### Метод 1: Из Telegram Desktop
1. Откройте Telegram Desktop
2. Найдите анимированные эмодзи в чатах
3. Откройте DevTools (F12)
4. Во вкладке Network ищите запросы к `.tgs` файлам
5. Скачайте и конвертируйте в JSON

### Метод 2: Из Telegram Web
1. Откройте web.telegram.org
2. Используйте анимированные эмодзи
3. В DevTools найдите Lottie анимации
4. Экспортируйте JSON данные

### Метод 3: Автоматически через наш экстрактор
```typescript
// Запустите в консоли Telegram WebApp
const extractor = telegramEmojiExtractor;
await extractor.initialize();
const allEmojis = await extractor.getAllCachedEmojis();
console.log('Extracted emojis:', allEmojis);
```

## 🐛 Отладка

### Включить логирование:
```typescript
// В консоли браузера
localStorage.setItem('telegram-emoji-debug', 'true');
```

### Проверить статус:
```typescript
// В консоли
console.log('Telegram detected:', window.Telegram?.WebApp);
console.log('Cached emojis:', await telegramEmojiExtractor.getAllCachedEmojis());
```

## ⚡ Производительность

- Анимации кешируются после первой загрузки
- Lazy loading - анимации загружаются только при необходимости
- Автоматическая очистка памяти при размонтировании компонентов
- Оптимизированный рендеринг через Lottie-web

## 🎯 Результат

Теперь ваши эмодзи будут анимироваться **ТОЧНО ТАК ЖЕ** как в оригинальном Telegram! 🎉

### В Telegram WebApp:
- ✅ Оригинальные TGS анимации
- ✅ Векторная графика высокого качества
- ✅ Плавные 60fps анимации
- ✅ Автоматическое извлечение новых эмодзи

### В браузере:
- ✅ Предустановленные анимации
- ✅ CSS fallback анимации
- ✅ Полная совместимость
- ✅ Плавная деградация
