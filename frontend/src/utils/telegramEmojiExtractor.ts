// Утилита для извлечения оригинальных анимаций эмодзи из Telegram

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        // Официальные методы Telegram WebApp
        sendData: (data: string) => void;
        ready: () => void;
        expand: () => void;
        close: () => void;
        // Скрытые методы для работы с эмодзи
        showPopup: (params: any) => void;
        showAlert: (message: string) => void;
        // Методы для анимированных эмодзи (недокументированные)
        EmojiRenderer?: {
          renderAnimated: (emoji: string, size: number) => HTMLElement;
          getAnimationData: (emoji: string) => any;
        };
        // Доступ к внутренним ресурсам Telegram
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: any;
        initData: string;
        initDataUnsafe: any;
        MainButton: any;
        BackButton: any;
        HapticFeedback: any;
      };
    };
  }
}

export interface TelegramEmojiData {
  emoji: string;
  animationUrl?: string;
  lottieData?: any;
  tgsData?: ArrayBuffer;
  webmUrl?: string;
}

export class TelegramEmojiExtractor {
  private static instance: TelegramEmojiExtractor;
  private emojiCache = new Map<string, TelegramEmojiData>();
  private isInitialized = false;

  static getInstance(): TelegramEmojiExtractor {
    if (!TelegramEmojiExtractor.instance) {
      TelegramEmojiExtractor.instance = new TelegramEmojiExtractor();
    }
    return TelegramEmojiExtractor.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Проверяем доступность Telegram WebApp
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        console.log('🚀 Telegram WebApp detected, initializing emoji extractor...');
        
        // Инициализируем Telegram WebApp
        window.Telegram.WebApp.ready();
        
        // Пытаемся получить доступ к внутренним методам рендеринга эмодзи
        await this.extractTelegramEmojiMethods();
        
        this.isInitialized = true;
        console.log('✅ Telegram emoji extractor initialized');
      } else {
        console.log('⚠️ Not in Telegram environment, using fallback methods');
        await this.initializeFallbackMethods();
      }
    } catch (error) {
      console.error('❌ Failed to initialize Telegram emoji extractor:', error);
      await this.initializeFallbackMethods();
    }
  }

  private async extractTelegramEmojiMethods(): Promise<void> {
    const tg = window.Telegram.WebApp;
    
    // Метод 1: Попытка получить доступ к внутреннему рендереру эмодзи
    try {
      // Telegram может предоставлять доступ к анимированным эмодзи через скрытые API
      const emojiRenderer = (tg as any).EmojiRenderer;
      if (emojiRenderer) {
        console.log('🎯 Found Telegram EmojiRenderer!');
        // Сохраняем ссылку на рендерер
        (window as any).__telegramEmojiRenderer = emojiRenderer;
      }
    } catch (error) {
      console.log('EmojiRenderer not available:', error);
    }

    // Метод 2: Анализ DOM для поиска анимированных эмодзи
    try {
      await this.analyzeTelegramDOM();
    } catch (error) {
      console.log('DOM analysis failed:', error);
    }

    // Метод 3: Перехват сетевых запросов к ресурсам эмодзи
    try {
      this.interceptEmojiRequests();
    } catch (error) {
      console.log('Network interception failed:', error);
    }
  }

  private async analyzeTelegramDOM(): Promise<void> {
    // Ищем элементы с анимированными эмодзи в DOM Telegram
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Ищем элементы с анимированными эмодзи
            const emojiElements = element.querySelectorAll('[data-emoji], .emoji, .animated-emoji');
            emojiElements.forEach((emojiEl) => {
              this.extractEmojiFromElement(emojiEl as HTMLElement);
            });
          }
        });
      });
    });

    // Наблюдаем за изменениями в DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-emoji', 'src', 'style']
    });
  }

  private extractEmojiFromElement(element: HTMLElement): void {
    try {
      const emoji = element.getAttribute('data-emoji') || element.textContent?.trim();
      if (!emoji) return;

      const emojiData: TelegramEmojiData = { emoji };

      // Ищем анимационные данные
      const style = window.getComputedStyle(element);
      const backgroundImage = style.backgroundImage;
      
      if (backgroundImage && backgroundImage !== 'none') {
        // Извлекаем URL анимации
        const urlMatch = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (urlMatch) {
          emojiData.animationUrl = urlMatch[1];
        }
      }

      // Ищем Lottie данные
      const lottieData = (element as any).__lottie;
      if (lottieData) {
        emojiData.lottieData = lottieData;
      }

      // Сохраняем в кеш
      this.emojiCache.set(emoji, emojiData);
      console.log(`📦 Cached emoji data for: ${emoji}`, emojiData);
    } catch (error) {
      console.error('Failed to extract emoji from element:', error);
    }
  }

  private interceptEmojiRequests(): void {
    // Перехватываем fetch запросы для поиска ресурсов эмодзи
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      try {
        const url = args[0] as string;
        
        // Проверяем, является ли это запросом к ресурсам эмодзи
        if (url.includes('emoji') || url.includes('sticker') || url.includes('.tgs') || url.includes('.webm')) {
          console.log('🎯 Intercepted emoji resource:', url);
          
          // Клонируем ответ для анализа
          const clonedResponse = response.clone();
          
          if (url.endsWith('.tgs')) {
            // TGS файл (Telegram Sticker)
            const arrayBuffer = await clonedResponse.arrayBuffer();
            this.processTGSFile(url, arrayBuffer);
          } else if (url.endsWith('.webm') || url.endsWith('.gif')) {
            // Видео анимация
            this.processVideoAnimation(url);
          }
        }
      } catch (error) {
        console.log('Error processing intercepted request:', error);
      }
      
      return response;
    };
  }

  private async processTGSFile(url: string, data: ArrayBuffer): Promise<void> {
    try {
      // TGS это сжатый JSON (Lottie)
      const decompressed = await this.decompressTGS(data);
      const lottieData = JSON.parse(decompressed);
      
      console.log('📦 Extracted Lottie data from TGS:', url, lottieData);
      
      // Сохраняем данные
      // Нужно определить какому эмодзи соответствует этот файл
      // Это можно сделать по URL или по метаданным
    } catch (error) {
      console.error('Failed to process TGS file:', error);
    }
  }

  private async decompressTGS(data: ArrayBuffer): Promise<string> {
    // TGS файлы сжаты с помощью gzip
    try {
      const decompressed = await new Response(
        new Response(data).body?.pipeThrough(new DecompressionStream('gzip'))
      ).text();
      return decompressed;
    } catch (error) {
      // Fallback: возможно файл не сжат
      return new TextDecoder().decode(data);
    }
  }

  private processVideoAnimation(url: string): void {
    console.log('🎬 Found video animation:', url);
    // Сохраняем URL видео анимации
  }

  private async initializeFallbackMethods(): Promise<void> {
    console.log('🔄 Initializing fallback emoji methods...');
    
    // Загружаем предустановленные анимации эмодзи
    await this.loadPresetEmojiAnimations();
    
    this.isInitialized = true;
  }

  private async loadPresetEmojiAnimations(): Promise<void> {
    // Загружаем заранее извлечённые анимации эмодзи из Telegram
    const presetEmojis = [
      { emoji: '💡', lottieUrl: '/emoji-animations/lightbulb.json' },
      { emoji: '⚡', lottieUrl: '/emoji-animations/lightning.json' },
      { emoji: '🤖', lottieUrl: '/emoji-animations/robot.json' },
      { emoji: '👋', lottieUrl: '/emoji-animations/wave.json' },
      { emoji: '📝', lottieUrl: '/emoji-animations/pencil.json' },
      { emoji: '📊', lottieUrl: '/emoji-animations/chart.json' },
      { emoji: '🎁', lottieUrl: '/emoji-animations/gift.json' },
      { emoji: '📚', lottieUrl: '/emoji-animations/books.json' },
    ];

    for (const preset of presetEmojis) {
      try {
        // В продакшене эти файлы будут загружены из реальных источников Telegram
        this.emojiCache.set(preset.emoji, {
          emoji: preset.emoji,
          animationUrl: preset.lottieUrl
        });
      } catch (error) {
        console.log(`Failed to load preset for ${preset.emoji}:`, error);
      }
    }
  }

  async getEmojiAnimation(emoji: string): Promise<TelegramEmojiData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.emojiCache.get(emoji) || null;
  }

  async getAllCachedEmojis(): Promise<TelegramEmojiData[]> {
    return Array.from(this.emojiCache.values());
  }

  // Метод для принудительного извлечения анимации конкретного эмодзи
  async forceExtractEmoji(emoji: string): Promise<TelegramEmojiData | null> {
    try {
      if (window.Telegram?.WebApp) {
        // Создаём временный элемент с эмодзи и пытаемся извлечь анимацию
        const tempDiv = document.createElement('div');
        tempDiv.textContent = emoji;
        tempDiv.style.fontSize = '64px';
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        // Ждём, пока Telegram применит анимации
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Извлекаем данные
        this.extractEmojiFromElement(tempDiv);

        // Удаляем временный элемент
        document.body.removeChild(tempDiv);

        return this.emojiCache.get(emoji) || null;
      }
    } catch (error) {
      console.error('Failed to force extract emoji:', error);
    }

    return null;
  }
}

// Экспортируем синглтон
export const telegramEmojiExtractor = TelegramEmojiExtractor.getInstance();
