import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
// Диагностика: выводим базовый URL и проверяем доступность /health в проде
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info('[API] base URL:', API_BASE);
  // health лежит на корне (а не под /api)
  const originBase = API_BASE.replace(/\/?api\/?$/, '');
  const healthUrl = `${originBase.replace(/\/$/, '')}/health`;
  if (import.meta.env.PROD) {
    fetch(healthUrl, { method: 'GET' }).catch(() => {
      // eslint-disable-next-line no-console
      console.warn('[API] health check failed:', healthUrl);
    });
  }
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

export async function authWithTelegramInitData(initData: string) {
  const res = await api.post('/auth/telegram', { init_data: initData });
  setAccessToken(res.data.access_token);
  return res.data;
}


