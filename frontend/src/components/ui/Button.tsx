import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    leftIcon,
    rightIcon,
    className,
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded transition-fast
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-95
    `;

    const variants = {
      primary: `
        bg-blue-500 hover:bg-blue-600 text-white
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-gray-100 hover:bg-gray-200 text-gray-900
        border border-gray-300
      `,
      outline: `
        border border-current hover:bg-opacity-10 hover:bg-current text-blue-500
        bg-transparent
      `,
      ghost: `
        hover:bg-gray-100 text-gray-700
        bg-transparent
      `,
      destructive: `
        bg-red-500 hover:bg-red-600 text-white
        shadow-sm hover:shadow-md
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15 }}
        {...(props as any)}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}
        {!isLoading && leftIcon && leftIcon}
        {children}
        {!isLoading && rightIcon && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
