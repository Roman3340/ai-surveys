import React, { useEffect, useRef } from 'react';

interface QRCodeGeneratorProps {
  url: string;
  size?: number;
  className?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  url, 
  size = 200, 
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (!canvasRef.current) return;

      try {
        // Динамический импорт qrcode для уменьшения размера бандла
        const QRCode = (await import('qrcode')).default;
        
        await QRCode.toCanvas(canvasRef.current, url, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
        // Fallback - показываем URL как текст
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = '#333';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('QR Code', size / 2, size / 2 - 10);
          ctx.fillText('Generation', size / 2, size / 2 + 10);
          ctx.fillText('Failed', size / 2, size / 2 + 30);
        }
      }
    };

    generateQRCode();
  }, [url, size]);

  return (
    <div className={`qr-code-container ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          border: '1px solid var(--tg-section-separator-color)',
          borderRadius: '8px',
          backgroundColor: 'white'
        }}
      />
    </div>
  );
};
