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
  // Поля для опросов участия
  completed_at?: string;
  questions_count?: number;
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
  conditionalLogic?: ConditionalLogic;
}

// Условная логика для вопросов
export interface ConditionalLogic {
  // Для single_choice, yes_no - условия по конкретным ответам
  conditions?: ConditionalCondition[];
  
  // Для multiple_choice - тип условия
  conditionType?: 'any' | 'all' | 'count';
  options?: string[];
  minCount?: number;
  
  // Для scale, rating, number - условия по значениям
  valueConditions?: ValueCondition[];
  
  // Для date - условия по датам
  dateConditions?: DateCondition[];
}

export interface ConditionalCondition {
  optionValue?: string; // Для single_choice
  answer?: 'yes' | 'no'; // Для yes_no
  showQuestions: string[]; // IDs вопросов для показа
}

export interface ValueCondition {
  operator: 'less_than' | 'less_or_equal' | 'equal' | 'greater_or_equal' | 'greater_than' | 'range';
  value?: number; // Для одного значения
  min?: number; // Для range
  max?: number; // Для range
  showQuestions: string[];
}

export interface DateCondition {
  operator: 'before' | 'before_or_equal' | 'equal' | 'after_or_equal' | 'after' | 'range';
  date?: string;
  startDate?: string; // Для range
  endDate?: string; // Для range
  showQuestions: string[];
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
  hideCreator: boolean;
  reward?: SurveyReward;
  endDate?: string;
  maxParticipants?: string;
  creationType: 'manual' | 'ai';
  motivationEnabled?: boolean;
  motivationType?: 'stars' | 'discount' | 'gift' | 'contest' | 'promo' | 'other';
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
