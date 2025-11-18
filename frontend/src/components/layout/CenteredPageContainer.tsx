import React from 'react';

interface CenteredPageContainerProps {
  children: React.ReactNode;
  /**
   * Максимальная ширина содержимого в пикселях или иных единицах.
   * По умолчанию 720px — оптимально для десктопа, но на мобильных ширина будет 100%.
   */
  maxWidth?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CenteredPageContainer({
  children,
  maxWidth = 720,
  className,
  style,
}: CenteredPageContainerProps) {
  const resolvedMaxWidth =
    typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: resolvedMaxWidth,
        margin: '0 auto',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

