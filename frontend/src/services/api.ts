/**
 * API сервис для работы с бэкендом
 */
import axios from 'axios';
import type { Survey } from '../types';

// Базовый URL API
const API_BASE_URL = 'http://localhost:8001/api';

// Создаем экземпляр axios с базовой конфигурацией
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерфейсы для API
export interface CreateSurveyRequest {
  title: string;
  description?: string;
  is_public?: boolean;
  settings?: Record<string, any>;
  creator_telegram_id: number;
}

export interface UpdateSurveyRequest {
  title?: string;
  description?: string;
  is_public?: boolean;
  settings?: Record<string, any>;
}

export interface SurveyCanEditResponse {
  can_edit: boolean;
  can_edit_questions: boolean;
  reason?: string;
}

export interface SurveyShareResponse {
  share_url: string;
  qr_code: string;
}

// API методы
export const surveyApi = {
  /**
   * Получить опросы пользователя
   */
  async getUserSurveys(creatorTelegramId: number): Promise<Survey[]> {
    const response = await api.get(`/surveys?creator_telegram_id=${creatorTelegramId}`);
    return response.data;
  },

  /**
   * Создать новый опрос
   */
  async createSurvey(surveyData: CreateSurveyRequest): Promise<Survey> {
    const response = await api.post('/surveys', surveyData);
    return response.data;
  },

  /**
   * Получить опрос по ID
   */
  async getSurvey(surveyId: string): Promise<Survey> {
    const response = await api.get(`/surveys/${surveyId}`);
    return response.data;
  },

  /**
   * Обновить опрос
   */
  async updateSurvey(
    surveyId: string, 
    surveyData: UpdateSurveyRequest, 
    creatorTelegramId: number
  ): Promise<Survey> {
    const response = await api.put(`/surveys/${surveyId}?creator_telegram_id=${creatorTelegramId}`, surveyData);
    return response.data;
  },

  /**
   * Удалить опрос
   */
  async deleteSurvey(surveyId: string, creatorTelegramId: number): Promise<void> {
    await api.delete(`/surveys/${surveyId}?creator_telegram_id=${creatorTelegramId}`);
  },

  /**
   * Опубликовать опрос
   */
  async publishSurvey(surveyId: string, creatorTelegramId: number): Promise<void> {
    await api.post(`/surveys/${surveyId}/publish?creator_telegram_id=${creatorTelegramId}`);
  },

  /**
   * Снять опрос с публикации
   */
  async unpublishSurvey(surveyId: string, creatorTelegramId: number): Promise<void> {
    await api.post(`/surveys/${surveyId}/unpublish?creator_telegram_id=${creatorTelegramId}`);
  },

  /**
   * Проверить возможность редактирования опроса
   */
  async canEditSurvey(surveyId: string, creatorTelegramId: number): Promise<SurveyCanEditResponse> {
    const response = await api.get(`/surveys/${surveyId}/can-edit?creator_telegram_id=${creatorTelegramId}`);
    return response.data;
  },

  /**
   * Получить ссылку для распространения опроса
   */
  async getSurveyShareLink(surveyId: string, creatorTelegramId: number): Promise<SurveyShareResponse> {
    const response = await api.get(`/surveys/${surveyId}/share?creator_telegram_id=${creatorTelegramId}`);
    return response.data;
  },
};

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export default api;
