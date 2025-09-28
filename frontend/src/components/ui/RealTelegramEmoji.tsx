import React, { useEffect, useState, useRef } from 'react';
import { telegramEmojiExtractor } from '../../utils/telegramEmojiExtractor';
import type { TelegramEmojiData } from '../../utils/telegramEmojiExtractor';
import { useTelegram } from '../../hooks/useTelegram';

interface RealTelegramEmojiProps {
  emoji: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
  autoPlay?: boolean;
}

const RealTelegramEmoji: React.FC<RealTelegramEmojiProps> = ({
  emoji,
  size = 'medium',
  className = '',
  onClick,
  autoPlay = true
}) => {
  const { isTelegram } = useTelegram();
  const [emojiData, setEmojiData] = useState<TelegramEmojiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);

  const sizeMap = {
    small: { width: 32, height: 32, fontSize: '24px' },
    medium: { width: 64, height: 64, fontSize: '48px' },
    large: { width: 80, height: 80, fontSize: '64px' }
  };

  const currentSize = sizeMap[size];

  useEffect(() => {
    loadEmojiAnimation();
  }, [emoji]);

  const loadEmojiAnimation = async () => {
    setIsLoading(true);
    
    try {
      // Пытаемся получить оригинальную анимацию из Telegram
      let data = await telegramEmojiExtractor.getEmojiAnimation(emoji);
      
      if (!data && isTelegram) {
        // Если данных нет, пытаемся извлечь принудительно
        console.log(`🔍 Force extracting animation for: ${emoji}`);
        data = await telegramEmojiExtractor.forceExtractEmoji(emoji);
      }

      if (data) {
        setEmojiData(data);
        console.log(`✅ Loaded Telegram animation for: ${emoji}`, data);
        
        // Если есть Lottie данные, рендерим анимацию
        if (data.lottieData && containerRef.current) {
          await renderLottieAnimation(data.lottieData);
        }
      } else {
        console.log(`⚠️ No Telegram animation found for: ${emoji}, using fallback`);
        setEmojiData({ emoji });
      }
    } catch (error) {
      console.error('Failed to load emoji animation:', error);
      setEmojiData({ emoji });
    } finally {
      setIsLoading(false);
    }
  };

  const renderLottieAnimation = async (lottieData: any) => {
    try {
      // Динамически импортируем lottie-web только при необходимости
      const lottie = await import('lottie-web');
      
      if (containerRef.current && lottieData) {
        // Очищаем предыдущую анимацию
        if (animationRef.current) {
          animationRef.current.destroy();
        }

        // Создаём новую Lottie анимацию
        animationRef.current = lottie.default.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: autoPlay,
          autoplay: autoPlay,
          animationData: lottieData,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet'
          }
        });

        // Обработчики событий
        animationRef.current.addEventListener('complete', () => {
          setIsAnimating(false);
        });

        animationRef.current.addEventListener('loopComplete', () => {
          if (!autoPlay) {
            setIsAnimating(false);
          }
        });

        console.log('🎬 Lottie animation loaded successfully');
      }
    } catch (error) {
      console.error('Failed to render Lottie animation:', error);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }

    // Запускаем анимацию при клике
    if (animationRef.current && !isAnimating) {
      setIsAnimating(true);
      animationRef.current.goToAndPlay(0);
    }
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
      }
    };
  }, []);

  // Если есть оригинальная анимация Telegram
  if (emojiData?.lottieData || emojiData?.animationUrl) {
    return (
      <div
        ref={containerRef}
        onClick={handleClick}
        className={`real-telegram-emoji ${className}`}
        style={{
          width: currentSize.width,
          height: currentSize.height,
          cursor: onClick ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: currentSize.fontSize,
              opacity: 0.5
            }}
          >
            {emoji}
          </div>
        )}
        
        {/* Контейнер для Lottie анимации будет заполнен автоматически */}
      </div>
    );
  }

  // Если есть URL видео анимации
  if (emojiData?.webmUrl) {
    return (
      <div
        onClick={handleClick}
        className={`real-telegram-emoji ${className}`}
        style={{
          width: currentSize.width,
          height: currentSize.height,
          cursor: onClick ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <video
          src={emojiData.webmUrl}
          width={currentSize.width}
          height={currentSize.height}
          autoPlay={autoPlay}
          loop={autoPlay}
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
    );
  }

  // Fallback: обычный эмодзи с CSS анимацией
  return (
    <div
      onClick={handleClick}
      className={`telegram-emoji-fallback ${className}`}
      style={{
        width: currentSize.width,
        height: currentSize.height,
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: currentSize.fontSize,
        position: 'relative',
        transition: 'transform 0.2s ease',
        animation: autoPlay ? 'emoji-bounce 3s ease-in-out infinite' : 'none'
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {emoji}
      
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#007AFF',
            animation: 'pulse 1s ease-in-out infinite'
          }}
        />
      )}
    </div>
  );
};

export default RealTelegramEmoji;
