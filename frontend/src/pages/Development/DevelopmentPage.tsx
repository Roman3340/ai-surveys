import { useTelegram } from '../../hooks/useTelegram';

export default function DevelopmentPage() {
  const { hapticFeedback } = useTelegram();

  const handleContactDeveloper = () => {
    hapticFeedback?.light();
    window.open('https://t.me/Roman3320', '_blank');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '80px',
        marginBottom: '32px',
        animation: 'spin 20s linear infinite'
      }}>
        ⚙️
      </div>
      
      <h1 style={{
        fontSize: '24px',
        fontWeight: '600',
        marginBottom: '16px',
        color: 'var(--tg-text-color)'
      }}>
        Приложение в разработке
      </h1>
      
      <p style={{
        fontSize: '16px',
        color: 'var(--tg-hint-color)',
        lineHeight: '1.5',
        maxWidth: '400px',
        marginBottom: '32px'
      }}>
        Мы активно работаем над улучшением приложения. 
        Скоро оно будет доступно для всех пользователей!
      </p>
      
      <button
        onClick={handleContactDeveloper}
        style={{
          backgroundColor: 'var(--tg-button-color)',
          color: 'var(--tg-button-text-color)',
          border: 'none',
          borderRadius: '12px',
          padding: '14px 28px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        Связаться с разработчиком
      </button>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

