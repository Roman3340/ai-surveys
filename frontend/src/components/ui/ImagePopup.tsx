import React from 'react';

interface ImagePopupProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePopup: React.FC<ImagePopupProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        ×
      </button>
      <img
        src={imageUrl}
        alt="Fullscreen view"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImagePopup;

