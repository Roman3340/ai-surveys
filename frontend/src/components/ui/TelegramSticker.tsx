import { motion } from 'framer-motion';
import { isTelegramEnvironment } from '../../utils/mockTelegram';

interface TelegramStickerProps {
  /** URL стикера из Telegram или fallback эмодзи */
  stickerUrl?: string;
  fallbackEmoji: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

export const TelegramSticker = ({ 
  stickerUrl,
  fallbackEmoji,
  size = 'md', 
  className = '',
  animate = true 
}: TelegramStickerProps) => {
  const sizes = {
    sm: { width: 48, height: 48, fontSize: 'text-2xl' },
    md: { width: 64, height: 64, fontSize: 'text-4xl' }, 
    lg: { width: 96, height: 96, fontSize: 'text-6xl' },
    xl: { width: 128, height: 128, fontSize: 'text-8xl' }
  };


  // В Telegram показываем настоящий стикер
  if (isTelegramEnvironment() && stickerUrl) {
    return (
      <motion.div
        className={`inline-block ${className}`}
        initial={{ scale: animate ? 0.8 : 1 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.3 }}
        style={{ 
          userSelect: 'none',
          cursor: 'pointer'
        }}
      >
        <img
          src={stickerUrl}
          alt="Telegram Sticker"
          width={sizes[size].width}
          height={sizes[size].height}
          style={{ 
            width: sizes[size].width,
            height: sizes[size].height,
            objectFit: 'contain'
          }}
        />
      </motion.div>
    );
  }

  // В браузере показываем эмодзи
  return (
    <motion.div
      className={`inline-block ${sizes[size].fontSize} ${className}`}
      initial={{ scale: animate ? 0.8 : 1 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3 }}
      style={{ 
        userSelect: 'none',
        cursor: 'pointer'
      }}
    >
      {fallbackEmoji}
    </motion.div>
  );
};
