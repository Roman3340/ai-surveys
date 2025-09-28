import { motion } from 'framer-motion';

interface AnimatedEmojiProps {
  emoji: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

export const AnimatedEmoji = ({ 
  emoji, 
  size = 'md', 
  className = '',
  animate = true 
}: AnimatedEmojiProps) => {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl', 
    lg: 'text-6xl',
    xl: 'text-8xl'
  };

  const bounceAnimation = {
    initial: { scale: 0.8, rotate: -10 },
    animate: { 
      scale: [0.8, 1.1, 1],
      rotate: [-10, 5, 0],
      transition: {
        duration: 0.6,
        ease: "easeOut",
        times: [0, 0.6, 1]
      }
    },
    hover: {
      scale: 1.1,
      rotate: [0, -5, 5, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  };

  const staticAnimation = {
    initial: { scale: 1 },
    animate: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <motion.div
      className={`inline-block ${sizes[size]} ${className}`}
      variants={animate ? bounceAnimation : staticAnimation}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      style={{ 
        userSelect: 'none',
        cursor: 'pointer'
      }}
    >
      {emoji}
    </motion.div>
  );
};
