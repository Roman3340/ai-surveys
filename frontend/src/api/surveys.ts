// API клиент для работы с опросами

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface CreateSurveyRequest {
  title: string;
  description?: string;
  creatorId: number;
  creationType: 'manual' | 'ai';
  questions: QuestionData[];
  settings: SurveySettingsData;
}

export interface QuestionData {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  order: number;
  options?: Array<{ id: string; text: string; order: number }>;
  validation?: Record<string, any>;
}

export interface SurveySettingsData {
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  maxParticipants?: string;
  motivation?: string;
  rewardValue?: string;
  rewardDescription?: string;
}

export interface SurveyResponse {
  survey: {
    id: number;
    title: string;
    description?: string;
    user_id: number;
    creation_type: string;
    is_published: boolean;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
  };
  questions: Array<{
    id: number;
    survey_id: number;
    type: string;
    title: string;
    description?: string;
    required: boolean;
    order: number;
    options?: any[];
    validation?: Record<string, any>;
    created_at: string;
  }>;
  message: string;
}

export interface UserSurvey {
  id: number;
  title: string;
  description?: string;
  user_id: number;
  creation_type: string;
  is_published: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

class SurveysAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async createSurvey(surveyData: CreateSurveyRequest): Promise<SurveyResponse> {
    return this.request<SurveyResponse>('/surveys/complete', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  }

  async getUserSurveys(userId: number): Promise<UserSurvey[]> {
    return this.request<UserSurvey[]>(`/surveys/user/${userId}`);
  }

  async getSurvey(surveyId: number): Promise<UserSurvey> {
    return this.request<UserSurvey>(`/surveys/${surveyId}`);
  }

  async updateSurvey(surveyId: number, updates: Partial<UserSurvey>): Promise<UserSurvey> {
    return this.request<UserSurvey>(`/surveys/${surveyId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSurvey(surveyId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/surveys/${surveyId}`, {
      method: 'DELETE',
    });
  }
}

export const surveysAPI = new SurveysAPI();
