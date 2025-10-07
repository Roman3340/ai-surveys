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

const STORAGE_KEY = 'surveyDraft';

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


