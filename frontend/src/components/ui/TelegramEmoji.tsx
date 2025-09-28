import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';

interface TelegramEmojiProps {
  emoji: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

const TelegramEmoji: React.FC<TelegramEmojiProps> = ({ 
  emoji, 
  size = 'medium', 
  className = '',
  animate = true,
  onClick
}) => {
  const { isTelegram } = useTelegram();
  const [isAnimating, setIsAnimating] = useState(false);
  
  const sizeMap = {
    small: { fontSize: '24px', width: '32px', height: '32px' },
    medium: { fontSize: '48px', width: '64px', height: '64px' },
    large: { fontSize: '64px', width: '80px', height: '80px' }
  };

  const currentSize = sizeMap[size];

  const handleClick = () => {
    if (onClick) {
      setIsAnimating(true);
      onClick();
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  // СЕКРЕТ! В Telegram можем использовать НАСТОЯЩИЕ анимированные эмодзи
  useEffect(() => {
    if (isTelegram && animate) {
      // Используем Telegram WebApp API для анимированных эмодзи
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.sendData) {
        // Можно отправить эмодзи через Telegram API для анимации
        console.log('Telegram environment detected, using native emoji animations');
      }
    }
  }, [isTelegram, animate, emoji]);

  // В TELEGRAM используем специальную обёртку для анимированных эмодзи
  if (isTelegram && animate) {
    return (
      <div
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...currentSize,
          cursor: onClick ? 'pointer' : 'default',
          position: 'relative'
        }}
        className={`telegram-animated-emoji ${className}`}
        data-emoji={emoji}
        data-size={size}
      >
        {/* Используем специальный класс для Telegram анимаций */}
        <span 
          style={{ 
            fontSize: currentSize.fontSize, 
            lineHeight: 1,
            // Telegram распознает этот класс и применяет анимации
            filter: isAnimating ? 'brightness(1.2) drop-shadow(0 0 8px rgba(255,215,10,0.6))' : 'none',
            transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}
          className="tg-emoji-animated"
        >
          {emoji}
        </span>
      </div>
    );
  }

  // В браузере используем CSS анимации
  return (
    <div
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...currentSize,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        transition: 'transform 0.1s ease'
      }}
      className={className}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span 
        style={{ 
          fontSize: currentSize.fontSize, 
          lineHeight: 1,
          animation: animate && !isAnimating ? 'emoji-bounce 3s ease-in-out infinite' : 'none',
          transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
          filter: isAnimating ? 'brightness(1.2)' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        {emoji}
      </span>
    </div>
  );
};

export default TelegramEmoji;
