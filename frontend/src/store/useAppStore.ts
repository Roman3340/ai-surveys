import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Survey, Theme } from '../types';
import { surveyApi } from '../services/api';

interface AppStore {
  // Пользователь
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Тема
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Опросы пользователя (созданные)
  userSurveys: Survey[];
  setUserSurveys: (surveys: Survey[]) => void;
  addSurvey: (survey: Survey) => void;
  updateSurveyLocal: (surveyId: string, updates: Partial<Survey>) => void;
  removeSurvey: (surveyId: string) => void;
  
  // Опросы, в которых участвует пользователь
  participatedSurveys: Survey[];
  setParticipatedSurveys: (surveys: Survey[]) => void;
  
  // Текущий опрос (для прохождения)
  currentSurvey: Survey | null;
  setCurrentSurvey: (survey: Survey | null) => void;
  
  // ID опроса для приглашения (из startapp параметра)
  surveyInviteId: string | null;
  setSurveyInviteId: (id: string | null) => void;
  
  // Состояние загрузки и ошибки
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  
  // Очистка всех данных
  clearAll: () => void;
  
  // API методы
  loadUserSurveys: () => Promise<void>;
  createSurvey: (surveyData: any) => Promise<Survey>;
  updateSurvey: (surveyId: string, updates: any) => Promise<void>;
  deleteSurvey: (surveyId: string) => Promise<void>;
  publishSurvey: (surveyId: string) => Promise<void>;
  getSurveyShareLink: (surveyId: string) => Promise<{ share_url: string; qr_code: string }>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Начальное состояние
      user: null,
      theme: 'system',
      userSurveys: [],
      participatedSurveys: [],
      currentSurvey: null,
      surveyInviteId: null,
      isLoading: false,
      error: null,

      // Действия с пользователем
      setUser: (user) => set({ user }),

      // Действия с темой
      setTheme: (theme) => set({ theme }),

      // Действия с опросами
      setUserSurveys: (surveys) => set({ userSurveys: surveys }),
      
      addSurvey: (survey) => set((state) => ({
        userSurveys: [...state.userSurveys, survey]
      })),
      
      updateSurveyLocal: (surveyId, updates) => set((state) => ({
        userSurveys: state.userSurveys.map(survey =>
          survey.id === surveyId ? { ...survey, ...updates } : survey
        )
      })),
      
      removeSurvey: (surveyId) => set((state) => ({
        userSurveys: state.userSurveys.filter(survey => survey.id !== surveyId)
      })),

      // Опросы, в которых участвует пользователь
      setParticipatedSurveys: (surveys) => set({ participatedSurveys: surveys }),

      // Текущий опрос
      setCurrentSurvey: (survey) => set({ currentSurvey: survey }),

      // ID опроса для приглашения
      setSurveyInviteId: (id) => set({ surveyInviteId: id }),

      // Состояние
      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Очистка
      clearAll: () => set({
        user: null,
        userSurveys: [],
        currentSurvey: null,
        isLoading: false,
        error: null,
      }),

      // API методы
      loadUserSurveys: async () => {
        set({ isLoading: true, error: null });
        try {
          // Список опросов доступен публично; не требуем user/JWT
          const surveys = await surveyApi.getUserSurveys();
          set({ userSurveys: surveys, isLoading: false });
        } catch (error) {
          console.error('Ошибка загрузки опросов:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Ошибка загрузки опросов',
            isLoading: false 
          });
        }
      },

      createSurvey: async (surveyData) => {
        set({ isLoading: true, error: null });
        try {
          const user = useAppStore.getState().user;
          if (!user) {
            throw new Error('Пользователь не авторизован');
          }

          const survey = await surveyApi.createSurvey({
            ...surveyData
          });
          
          set((state) => ({
            userSurveys: [...state.userSurveys, survey],
            isLoading: false
          }));
          
          return survey;
        } catch (error) {
          console.error('Ошибка создания опроса:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Ошибка создания опроса',
            isLoading: false 
          });
          throw error;
        }
      },

      updateSurvey: async (surveyId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const user = useAppStore.getState().user;
          if (!user) {
            throw new Error('Пользователь не авторизован');
          }

          await surveyApi.updateSurvey(surveyId, updates);
          
          set((state) => ({
            userSurveys: state.userSurveys.map(survey =>
              survey.id === surveyId ? { ...survey, ...updates } : survey
            ),
            isLoading: false
          }));
        } catch (error) {
          console.error('Ошибка обновления опроса:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Ошибка обновления опроса',
            isLoading: false 
          });
          throw error;
        }
      },

      deleteSurvey: async (surveyId) => {
        set({ isLoading: true, error: null });
        try {
          const user = useAppStore.getState().user;
          if (!user) {
            throw new Error('Пользователь не авторизован');
          }

          await surveyApi.deleteSurvey(surveyId);
          
          set((state) => ({
            userSurveys: state.userSurveys.filter(survey => survey.id !== surveyId),
            isLoading: false
          }));
        } catch (error) {
          console.error('Ошибка удаления опроса:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Ошибка удаления опроса',
            isLoading: false 
          });
          throw error;
        }
      },

      publishSurvey: async (surveyId) => {
        set({ isLoading: true, error: null });
        try {
          const user = useAppStore.getState().user;
          if (!user) {
            throw new Error('Пользователь не авторизован');
          }

          await surveyApi.publishSurvey(surveyId);
          
          set((state) => ({
            userSurveys: state.userSurveys.map(survey =>
              survey.id === surveyId ? { ...survey, isPublished: true } : survey
            ),
            isLoading: false
          }));
        } catch (error) {
          console.error('Ошибка публикации опроса:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Ошибка публикации опроса',
            isLoading: false 
          });
          throw error;
        }
      },

      getSurveyShareLink: async (surveyId) => {
        set({ isLoading: true, error: null });
        try {
          const user = useAppStore.getState().user;
          if (!user) {
            throw new Error('Пользователь не авторизован');
          }

          const shareInfo = await surveyApi.getSurveyShareLink(surveyId);
          set({ isLoading: false });
          return shareInfo;
        } catch (error) {
          console.error('Ошибка получения ссылки:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Ошибка получения ссылки',
            isLoading: false 
          });
          throw error;
        }
      },
    }),
    {
      name: 'ai-surveys-storage',
      partialize: (state) => ({
        user: state.user,
        theme: state.theme,
        userSurveys: state.userSurveys,
        participatedSurveys: state.participatedSurveys,
      }),
    }
  )
);
