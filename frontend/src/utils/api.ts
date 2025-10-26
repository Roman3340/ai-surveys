import axios from 'axios';

// API Configuration with fallback
const PRIMARY_API = import.meta.env.VITE_API_BASE || 'https://ai-surveys.ru/api';
const FALLBACK_API = import.meta.env.VITE_API_FALLBACK || 'http://localhost:8000/api';

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

// Проверяем доступность основного API при загрузке
if (typeof window !== 'undefined') {
  checkApiHealth(PRIMARY_API).then(isHealthy => {
    if (!isHealthy) {
      console.warn('[API] Primary API недоступен, переключаемся на fallback');
      activeApiBase = FALLBACK_API;
    } else {
      console.info('[API] Используем основной API:', PRIMARY_API);
    }
  });
}

const API_BASE = activeApiBase;

// Диагностика: выводим базовый URL
if (typeof window !== 'undefined') {
  console.info('[API] base URL:', API_BASE);
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

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

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


