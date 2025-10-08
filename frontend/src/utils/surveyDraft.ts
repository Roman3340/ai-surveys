// Утилита для хранения черновика опроса в localStorage

export type DraftMode = 'manual' | 'ai' | null;

export interface DraftQuestion {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: string[]; // Для single_choice и multiple_choice
  imageUrl?: string;
  imageName?: string;
  validation?: Record<string, any>;
  scaleMin?: number; // Для scale
  scaleMax?: number; // Для scale
  scaleLabels?: { min: string; max: string }; // Для scale
}

export interface SurveyDraft {
  mode: DraftMode;
  settings: {
    title: string;
    description: string;
    language: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    maxParticipants: string;
    allowAnonymous: boolean;
    showProgress: boolean;
    randomizeQuestions: boolean;
    oneResponsePerUser: boolean;
    collectTelegramData: boolean;
    creationType: 'manual';
    motivationEnabled: boolean;
    motivationType: string;
    motivationDetails: string;
    motivationConditions?: string;
  } | null;
  questions: DraftQuestion[];
  updatedAt: number;
}

// Интерфейс для ИИ-опросов
export interface AISurveyDraft {
  mode: 'ai';
  currentStep: 'type' | 'business' | 'personal' | 'advanced' | 'motivation';
  userType?: 'business' | 'personal';
  businessData?: {
    businessSphere: string;
    targetAudience: string;
    surveyGoal: string;
    questionCount: number;
    questionTypes: string[];
  };
  personalData?: {
    topic: string;
    audience: string;
    purpose: string;
    questionCount: number;
    questionTypes: string[];
  };
  advancedSettings?: {
    allowAnonymous: boolean;
    showProgress: boolean;
    randomizeQuestions: boolean;
    oneResponsePerUser: boolean;
    collectTelegramData: boolean;
    maxParticipants: string;
    endDate: string;
    endTime: string;
    surveyTitle: string;
    surveyDescription: string;
  };
  motivationData?: {
    motivationEnabled: boolean;
    motivationType: string;
    motivationDetails: string;
    motivationConditions?: string;
    rewardDescription?: string;
    rewardValue?: string;
    [key: string]: any; // Для дополнительных полей
  };
  updatedAt: number;
}

const STORAGE_KEY = 'surveyDraft';
const AI_STORAGE_KEY = 'aiSurveyDraft';

export function getDraft(): SurveyDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SurveyDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(partial: Partial<SurveyDraft>) {
  const current = getDraft() || {
    mode: null as DraftMode,
    settings: null,
    questions: [] as DraftQuestion[],
    updatedAt: Date.now()
  };
  const next: SurveyDraft = {
    ...current,
    ...partial,
    updatedAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('surveySettings');
}

export function hasDraft(): boolean {
  return !!getDraft();
}

export function saveMode(mode: DraftMode) {
  saveDraft({ mode });
}

export function saveSettings(settings: {
  title: string;
  description: string;
  language: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  maxParticipants: string;
  allowAnonymous: boolean;
  showProgress: boolean;
  randomizeQuestions: boolean;
  oneResponsePerUser: boolean;
  collectTelegramData: boolean;
  creationType: 'manual';
  motivationEnabled: boolean;
  motivationType: string;
  motivationDetails: string;
  motivationConditions?: string;
}) {
  saveDraft({ settings });
}


export function saveQuestions(questions: DraftQuestion[]) {
  saveDraft({ questions });
}

// Функции для ИИ-опросов
export function getAIDraft(): AISurveyDraft | null {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AISurveyDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAIDraft(partial: Partial<AISurveyDraft>) {
  const current = getAIDraft() || {
    mode: 'ai' as const,
    currentStep: 'type' as const,
    updatedAt: Date.now()
  };
  const next: AISurveyDraft = {
    ...current,
    ...partial,
    updatedAt: Date.now()
  };
  localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(next));
}

export function clearAIDraft() {
  localStorage.removeItem(AI_STORAGE_KEY);
}

export function hasAIDraft(): boolean {
  return !!getAIDraft();
}

export function saveAIStep(step: AISurveyDraft['currentStep']) {
  saveAIDraft({ currentStep: step });
}

export function saveAIUserType(userType: 'business' | 'personal') {
  saveAIDraft({ userType, currentStep: userType });
}

export function saveAIBusinessData(data: AISurveyDraft['businessData']) {
  saveAIDraft({ businessData: data, currentStep: 'advanced' });
}

export function saveAIPersonalData(data: AISurveyDraft['personalData']) {
  saveAIDraft({ personalData: data, currentStep: 'advanced' });
}

export function saveAIAdvancedSettings(settings: AISurveyDraft['advancedSettings']) {
  saveAIDraft({ advancedSettings: settings, currentStep: 'motivation' });
}

export function saveAIMotivationData(data: AISurveyDraft['motivationData']) {
  saveAIDraft({ motivationData: data });
}

export function clearAITypeData(type: 'business' | 'personal') {
  const draft = getAIDraft();
  if (!draft) return;
  
  if (type === 'business') {
    // Очищаем данные личного опроса и общие настройки
    saveAIDraft({ 
      personalData: undefined,
      advancedSettings: undefined,
      motivationData: undefined
    });
  } else {
    // Очищаем данные бизнес опроса и общие настройки
    saveAIDraft({ 
      businessData: undefined,
      advancedSettings: undefined,
      motivationData: undefined
    });
  }
}


