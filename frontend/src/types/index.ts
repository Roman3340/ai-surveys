// Основные типы приложения

export interface User {
  id: number;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  createdAt: string;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  creatorId: number;
  isPublished: boolean;
  isPublic: boolean;
  status: string;
  publishedAt?: string;
  maxParticipants?: number;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  responses?: SurveyResponse[];
  responsesCount?: number;
  settings: SurveySettings;
}

export interface Question {
  id: string;
  surveyId: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  order: number;
  options?: QuestionOption[];
  validation?: QuestionValidation;
  imageUrl?: string;
  imageName?: string;
  hasOtherOption?: boolean;
}

export type QuestionType = 
  | 'text' 
  | 'textarea' 
  | 'single_choice' 
  | 'multiple_choice' 
  | 'scale' 
  | 'rating' 
  | 'date' 
  | 'number'
  | 'yes_no';

export interface QuestionOption {
  id: string;
  text: string;
  order: number;
}

export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface SurveySettings {
  allowAnonymous: boolean;
  showProgress: boolean;
  randomizeQuestions: boolean;
  oneResponsePerUser: boolean;
  collectTelegramData: boolean;
  reward?: SurveyReward;
  endDate?: string;
  maxParticipants?: string;
  creationType: 'manual' | 'ai';
  motivationEnabled?: boolean;
  motivationType?: 'stars' | 'discount' | 'gift' | 'contest' | 'promo_code' | 'other';
  motivationDetails?: string;
  motivationConditions?: string;
}

export interface SurveyReward {
  type: 'promo_code' | 'stars' | 'custom';
  value: string;
  description: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId?: number;
  isAnonymous: boolean;
  answers: Answer[];
  completedAt: string;
  telegramData?: TelegramUserData;
}

export interface Answer {
  questionId: string;
  value: string | string[] | number;
}

export interface TelegramUserData {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

export interface AnalyticsData {
  totalResponses: number;
  completionRate: number;
  averageTime: number;
  questionAnalytics: QuestionAnalytics[];
  insights?: AIInsight[];
}

export interface QuestionAnalytics {
  questionId: string;
  responseCount: number;
  skipCount: number;
  averageRating?: number;
  topAnswers?: Array<{ value: string; count: number; percentage: number }>;
}

export interface AIInsight {
  type: 'trend' | 'recommendation' | 'warning' | 'highlight';
  title: string;
  description: string;
  confidence: number;
}

export type Theme = 'light' | 'dark' | 'system';

export interface AppState {
  user: User | null;
  theme: Theme;
  isLoading: boolean;
  error: string | null;
}
