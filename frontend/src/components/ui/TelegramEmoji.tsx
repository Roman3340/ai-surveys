import React from 'react';
import { useTelegram } from '../../hooks/useTelegram';

interface TelegramEmojiProps {
  emoji: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const TelegramEmoji: React.FC<TelegramEmojiProps> = ({ 
  emoji, 
  size = 'medium', 
  className = '' 
}) => {
  const { isTelegram } = useTelegram();

  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl'
  };

  // В Telegram используем анимированные эмодзи
  if (isTelegram) {
    return (
      <span 
        className={`inline-block ${sizeClasses[size]} ${className}`}
        style={{
          animation: 'telegram-emoji-bounce 2s ease-in-out infinite',
        }}
      >
        {emoji}
      </span>
    );
  }

  // В браузере обычные эмодзи с CSS анимацией
  return (
    <span 
      className={`inline-block ${sizeClasses[size]} ${className}`}
      style={{
        animation: 'bounce-gentle 3s ease-in-out infinite',
        transformOrigin: 'center',
      }}
    >
      {emoji}
    </span>
  );
};

// CSS анимации добавим в globals.css
export default TelegramEmoji;
