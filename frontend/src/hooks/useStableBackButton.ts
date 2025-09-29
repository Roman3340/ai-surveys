import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from './useTelegram';

interface UseStableBackButtonOptions {
  onBack?: () => void;
  showConfirm?: boolean;
  confirmMessage?: string;
  targetRoute?: string;
}

// Глобальный реестр для отслеживания инициализированных страниц
const initializedPages = new Set<string>();

export const useStableBackButton = (options: UseStableBackButtonOptions = {}) => {
  const navigate = useNavigate();
  const { backButton } = useTelegram();
  const pageIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  const {
    onBack,
    showConfirm = false,
    confirmMessage = 'Вы уверены, что хотите выйти?',
    targetRoute
  } = options;

  // Стабильная функция для обработки нажатия кнопки назад
  const handleBackClick = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (showConfirm) {
      try {
        const confirmed = window.confirm(confirmMessage);
        if (confirmed) {
          if (targetRoute) {
            navigate(targetRoute, { replace: true });
          } else {
            navigate(-1);
          }
        }
      } catch (error) {
        console.error('Error with confirm dialog:', error);
        if (targetRoute) {
          navigate(targetRoute, { replace: true });
        } else {
          navigate(-1);
        }
      }
    } else {
      if (targetRoute) {
        navigate(targetRoute, { replace: true });
      } else {
        navigate(-1);
      }
    }
  };

  // Настройка кнопки назад только один раз при монтировании компонента
  useEffect(() => {
    if (backButton && !isInitializedRef.current) {
      const currentPageId = window.location.pathname;
      
      // Проверяем, не инициализирована ли уже эта страница
      if (initializedPages.has(currentPageId)) {
        return;
      }
      
      pageIdRef.current = currentPageId;
      
      backButton.show();
      backButton.onClick(handleBackClick, currentPageId);
      isInitializedRef.current = true;
      initializedPages.add(currentPageId);

      console.log('BackButton initialized for:', currentPageId);

      return () => {
        if (pageIdRef.current && initializedPages.has(pageIdRef.current)) {
          backButton.offClick(pageIdRef.current);
          backButton.hide();
          isInitializedRef.current = false;
          initializedPages.delete(pageIdRef.current);
          pageIdRef.current = null;
          console.log('BackButton cleaned up for:', currentPageId);
        }
      };
    }
  }, []); // Пустой массив зависимостей - выполняется только при монтировании

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (backButton && pageIdRef.current && initializedPages.has(pageIdRef.current)) {
        backButton.offClick(pageIdRef.current);
        backButton.hide();
        isInitializedRef.current = false;
        initializedPages.delete(pageIdRef.current);
        pageIdRef.current = null;
      }
    };
  }, [backButton]);
};
