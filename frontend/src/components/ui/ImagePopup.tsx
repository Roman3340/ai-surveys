import React from 'react';
import { useTranslation } from 'react-i18next';

interface ImagePopupProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePopup: React.FC<ImagePopupProps> = ({ imageUrl, onClose }) => {
  const { t } = useTranslation();
  if (!imageUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '90vw',
          maxHeight: '90vh',
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid var(--tg-section-separator-color)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: '#fff',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
            lineHeight: '1'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
          }}
        >
          ×
        </button>
        <img
          src={imageUrl}
          alt={t('imagePopup.fullscreenView')}
          style={{
            maxWidth: 'calc(90vw - 64px)',
            maxHeight: 'calc(90vh - 64px)',
            objectFit: 'contain',
            borderRadius: '8px'
          }}
        />
      </div>
    </div>
  );
};

export default ImagePopup;