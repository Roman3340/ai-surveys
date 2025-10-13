/**
 * API сервис для работы с бэкендом
 */
import type { Survey } from '../types';
import { api } from '../utils/api';

// Интерфейсы для API
export interface CreateSurveyRequest {
  title: string;
  description?: string;
  is_public?: boolean;
  settings?: Record<string, any>;
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

// Вопросы
export interface CreateQuestionRequest {
  survey_id: string;
  type: string;
  text: string;
  description?: string;
  is_required: boolean;
  order_index: number;
  options?: any;
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
  rating_max?: number;
  validation?: Record<string, any>;
  image_url?: string;
  image_name?: string;
  has_other_option?: boolean;
}

// API методы
export const surveyApi = {
  /**
   * Получить опросы пользователя
   */
  async getUserSurveys(): Promise<Survey[]> {
    const response = await api.get(`/surveys/`, undefined as any); // устраняем 307 редирект; skipAuth проставим через request interceptor
    return response.data;
  },

  /**
   * Создать новый опрос
   */
  async createSurvey(surveyData: CreateSurveyRequest): Promise<Survey> {
    const response = await api.post('/surveys/', surveyData);
    return response.data;
  },

  /**
   * Получить опрос по ID
   */
  async getSurvey(surveyId: string, includeResponses = false): Promise<Survey> {
    const response = await api.get(`/surveys/${surveyId}` + (includeResponses ? `?include_responses=true` : ''));
    return response.data;
  },

  /**
   * Обновить опрос
   */
  async updateSurvey(
    surveyId: string, 
    surveyData: UpdateSurveyRequest
  ): Promise<Survey> {
    const response = await api.put(`/surveys/${surveyId}`, surveyData);
    return response.data;
  },

  /**
   * Удалить опрос
   */
  async deleteSurvey(surveyId: string): Promise<void> {
    await api.delete(`/surveys/${surveyId}`);
  },

  /**
   * Опубликовать опрос
   */
  async publishSurvey(surveyId: string): Promise<void> {
    await api.post(`/surveys/${surveyId}/publish`);
  },

  /**
   * Снять опрос с публикации
   */
  async unpublishSurvey(surveyId: string): Promise<void> {
    await api.post(`/surveys/${surveyId}/unpublish`);
  },

  /**
   * Проверить возможность редактирования опроса
   */
  async canEditSurvey(surveyId: string): Promise<SurveyCanEditResponse> {
    const response = await api.get(`/surveys/${surveyId}/can-edit`);
    return response.data;
  },

  /**
   * Получить ссылку для распространения опроса
   */
  async getSurveyShareLink(surveyId: string): Promise<SurveyShareResponse> {
    const response = await api.get(`/surveys/${surveyId}/share`);
    return response.data;
  },

  async getSurveyStats(surveyId: string): Promise<{ total_responses: number; completed_today?: number | null; average_time_seconds?: number | null; }> {
    const response = await api.get(`/surveys/${surveyId}/stats`);
    return response.data;
  },

  async getSurveyResponses(surveyId: string, limit = 20, offset = 0): Promise<any[]> {
    const response = await api.get(`/surveys/${surveyId}/responses`, { params: { limit, offset } as any });
    return response.data;
  },

  /**
   * Обновить настройки опроса
   */
  async updateSurveySettings(surveyId: string, settings: any): Promise<Survey> {
    const response = await api.put(`/surveys/${surveyId}/settings`, settings);
    return response.data;
  },

  /**
   * Изменить статус опроса
   */
  async updateSurveyStatus(surveyId: string, status: string): Promise<{ message: string }> {
    const response = await api.post(`/surveys/${surveyId}/status`, { status });
    return response.data;
  },

  /**
   * Получить опрос для публичного доступа (без авторизации)
   */
  async getSurveyPublic(surveyId: string, participantTelegramId?: number): Promise<any> {
    const params = participantTelegramId ? { participant_telegram_id: participantTelegramId } : {};
    const response = await api.get(`/surveys/${surveyId}/public`, { params });
    return response.data;
  },
};

export const questionApi = {
  async createQuestion(data: CreateQuestionRequest) {
    const res = await api.post('/questions/', data);
    return res.data;
  },
  async getSurveyQuestions(surveyId: string) {
    const res = await api.get(`/questions/survey/${surveyId}`);
    return res.data as any[];
  },
  async updateQuestion(questionId: string, data: any) {
    const res = await api.put(`/questions/${questionId}`, data);
    return res.data;
  },
};

// Обработка ошибок
export default api;
