// Утилита для хранения черновика опроса в localStorage

export type DraftMode = 'manual' | 'ai' | null;

export interface DraftQuestion {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: any[];
  imageUrl?: string;
  imageName?: string;
  validation?: Record<string, any>;
}

export interface SurveyDraft {
  mode: DraftMode;
  settings: Record<string, any> | null;
  motivation: Record<string, any> | null;
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
    settings: null as Record<string, any> | null,
    motivation: null as Record<string, any> | null,
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
}

export function hasDraft(): boolean {
  return !!getDraft();
}

export function saveMode(mode: DraftMode) {
  saveDraft({ mode });
}

export function saveSettings(settings: Record<string, any>) {
  saveDraft({ settings });
}

export function saveMotivation(motivation: Record<string, any>) {
  saveDraft({ motivation });
}

export function saveQuestions(questions: DraftQuestion[]) {
  saveDraft({ questions });
}


