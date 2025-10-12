import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { authWithTelegramInitData } from './utils/api'
import WebApp from '@twa-dev/sdk'
import { getTelegramWebApp, isTelegramEnvironment } from './utils/mockTelegram'
import { useAppStore } from './store/useAppStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Фоновая авторизация по initData (если пользователь уже запускал бот).
;(async () => {
  try {
    const tg = isTelegramEnvironment() ? (WebApp as unknown as any) : getTelegramWebApp()
    const initData: string = tg?.initData || ''
    if (!initData) return

    await authWithTelegramInitData(initData)

    // Сохраняем пользователя из initDataUnsafe (для фронтовой логики)
    const u = tg?.initDataUnsafe?.user
    if (u) {
      useAppStore.getState().setUser({
        id: 0,
        telegramId: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        username: u.username,
        languageCode: u.language_code,
        createdAt: new Date().toISOString(),
      })
    }
  } catch (e) {
    console.warn('Auth skipped:', e)
  }
})()
