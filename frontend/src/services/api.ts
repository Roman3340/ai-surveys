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
    const response = await api.get(`/surveys/`); // устраняем 307 редирект
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
};

export const questionApi = {
  async createQuestion(data: CreateQuestionRequest) {
    const res = await api.post('/questions', data);
    return res.data;
  },
};

// Обработка ошибок
export default api;
