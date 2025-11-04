import axios from 'axios';

// API Configuration with fallback
const PRIMARY_API = 'https://ai-surveys.ru/api';
const FALLBACK_API = 'http://localhost:8000/api';

// Отладочная информация
console.log('[DEBUG] VITE_API_BASE:', import.meta.env.VITE_API_BASE);
console.log('[DEBUG] VITE_API_FALLBACK:', import.meta.env.VITE_API_FALLBACK);
console.log('[DEBUG] PRIMARY_API:', PRIMARY_API);
console.log('[DEBUG] FALLBACK_API:', FALLBACK_API);

// Функция для проверки доступности API
async function checkApiHealth(apiUrl: string): Promise<boolean> {
  try {
    const healthUrl = apiUrl.replace('/api', '/health');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(healthUrl, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Определяем активный API
let activeApiBase = PRIMARY_API;

// Создаем API instance с начальным URL
const api = axios.create({
  baseURL: PRIMARY_API,
  timeout: 30000,
});

// Сохраняем базовый URL для использования в других местах
if (typeof window !== 'undefined') {
  (window as any).__API_BASE_URL__ = PRIMARY_API;
  // Также сохраняем функцию для получения актуального URL
  (window as any).__GET_API_BASE_URL__ = () => activeApiBase;
}

// Экспортируем api
export { api };

// Проверяем доступность основного API при загрузке
if (typeof window !== 'undefined') {
  // Сначала пробуем основной API
  console.info('[API] Пробуем основной API:', PRIMARY_API);
  
  // Проверяем доступность с задержкой
  setTimeout(() => {
    checkApiHealth(PRIMARY_API).then(isHealthy => {
      if (!isHealthy) {
        console.warn('[API] Primary API недоступен, переключаемся на fallback');
        activeApiBase = FALLBACK_API;
        api.defaults.baseURL = FALLBACK_API;
      } else {
        console.info('[API] Основной API работает, остаемся на нем');
      }
    }).catch(() => {
      console.warn('[API] Ошибка проверки Primary API, переключаемся на fallback');
      activeApiBase = FALLBACK_API;
      api.defaults.baseURL = FALLBACK_API;
    });
  }, 1000);
}

// Диагностика: выводим базовый URL
if (typeof window !== 'undefined') {
  console.info('[API] base URL:', api.defaults.baseURL);
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem('access_token', token);
  else localStorage.removeItem('access_token');
}

export function getAccessToken() {
  return accessToken || localStorage.getItem('access_token');
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  // помечаем публичные GET без авторизации ТОЛЬКО для списка '/surveys' или '/surveys/'
  const isGet = config.method?.toUpperCase() === 'GET';
  const u = config.url || '';
  const isPublicGet = isGet && (u === '/surveys' || u === '/surveys/');
  const skipAuth = (config as any).skipAuth === true || isPublicGet;
  if (token && !skipAuth) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Если ошибка сети и мы используем основной API, переключаемся на fallback
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED' || !error.response) {
      if (activeApiBase === PRIMARY_API) {
        console.warn('[API] Сетевая ошибка, переключаемся на fallback');
        switchToFallbackApi();
        // Повторяем запрос с fallback API
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);

// Функция для переключения API
export function switchToFallbackApi() {
  activeApiBase = FALLBACK_API;
  api.defaults.baseURL = FALLBACK_API;
  console.warn('[API] Переключились на fallback API:', FALLBACK_API);
}

export function switchToPrimaryApi() {
  activeApiBase = PRIMARY_API;
  api.defaults.baseURL = PRIMARY_API;
  console.info('[API] Переключились на основной API:', PRIMARY_API);
}

// Функция для получения текущего API
export function getCurrentApiBase() {
  return activeApiBase;
}

export async function authWithTelegramInitData(initData: string) {
  const res = await api.post('/auth/telegram', { init_data: initData });
  setAccessToken(res.data.access_token);
  return res.data;
}


