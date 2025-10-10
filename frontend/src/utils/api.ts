import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
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


