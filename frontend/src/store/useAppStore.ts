import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Survey, Theme } from '../types';

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
  updateSurvey: (surveyId: string, updates: Partial<Survey>) => void;
  removeSurvey: (surveyId: string) => void;
  
  // Опросы, в которых участвует пользователь
  participatedSurveys: Survey[];
  setParticipatedSurveys: (surveys: Survey[]) => void;
  
  // Текущий опрос (для прохождения)
  currentSurvey: Survey | null;
  setCurrentSurvey: (survey: Survey | null) => void;
  
  // Состояние загрузки и ошибки
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  
  // Очистка всех данных
  clearAll: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Начальное состояние
      user: null,
      theme: 'light',
      userSurveys: [
        // Моковые созданные опросы
        {
          id: '1',
          title: 'Опрос о качестве сервиса',
          description: 'Помогите нам улучшить наш сервис',
          creatorId: 123456789,
          isPublished: true,
          isPublic: true,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          questions: [
            {
              id: 'q1',
              surveyId: '1',
              type: 'single_choice',
              title: 'Как вы оцениваете наш сервис?',
              required: true,
              order: 1,
              options: [
                { id: 'o1', text: 'Отлично', order: 1 },
                { id: 'o2', text: 'Хорошо', order: 2 },
                { id: 'o3', text: 'Удовлетворительно', order: 3 },
                { id: 'o4', text: 'Плохо', order: 4 }
              ]
            }
          ],
          responses: [
            {
              id: 'r1',
              surveyId: '1',
              userId: 111,
              isAnonymous: false,
              answers: [{ questionId: 'q1', value: 'Отлично' }],
              completedAt: '2024-01-16T12:00:00Z'
            },
            {
              id: 'r2',
              surveyId: '1',
              userId: 222,
              isAnonymous: false,
              answers: [{ questionId: 'q1', value: 'Хорошо' }],
              completedAt: '2024-01-16T14:00:00Z'
            }
          ],
          settings: {
            allowAnonymous: true,
            showProgress: true,
            randomizeQuestions: false,
            oneResponsePerUser: true,
            collectTelegramData: true,
            creationType: 'manual' as const
          }
        },
        {
          id: '2',
          title: 'Исследование потребностей клиентов',
          description: 'Черновик опроса для маркетингового исследования',
          creatorId: 123456789,
          isPublished: false,
          isPublic: false,
          createdAt: '2024-01-10T09:30:00Z',
          updatedAt: '2024-01-12T15:45:00Z',
          questions: [
            {
              id: 'q2',
              surveyId: '2',
              type: 'text',
              title: 'Что бы вы хотели улучшить в нашем продукте?',
              required: true,
              order: 1
            }
          ],
          responses: [],
          settings: {
            allowAnonymous: false,
            showProgress: true,
            randomizeQuestions: false,
            oneResponsePerUser: true,
            collectTelegramData: true,
            creationType: 'manual' as const
          }
        }
      ],
      participatedSurveys: [
        // Моковые опросы в которых участвует пользователь
        {
          id: '3',
          title: 'iPhone Black Titanium',
          description: 'Розыгрыш iPhone 15 Pro в цвете Black Titanium',
          creatorId: 987654321,
          isPublished: true,
          isPublic: true,
          createdAt: '2024-01-05T08:00:00Z',
          updatedAt: '2024-01-05T08:00:00Z',
          questions: [
            {
              id: 'q3',
              surveyId: '3',
              type: 'single_choice',
              title: 'Какой цвет iPhone вам больше нравится?',
              required: true,
              order: 1,
              options: [
                { id: 'o5', text: 'Black Titanium', order: 1 },
                { id: 'o6', text: 'White Titanium', order: 2 },
                { id: 'o7', text: 'Blue Titanium', order: 3 },
                { id: 'o8', text: 'Natural Titanium', order: 4 }
              ]
            }
          ],
          responses: [],
          settings: {
        allowAnonymous: true,
        showProgress: true,
        randomizeQuestions: false,
        oneResponsePerUser: true,
        collectTelegramData: true,
        creationType: 'manual' as const,
            reward: {
              type: 'custom',
              value: 'iPhone 15 Pro Black Titanium',
              description: 'Главный приз розыгрыша'
            }
          }
        },
        {
          id: '4',
          title: 'Опрос о предпочтениях в еде',
          description: 'Исследование вкусовых предпочтений',
          creatorId: 555666777,
          isPublished: true,
          isPublic: true,
          createdAt: '2024-01-08T12:00:00Z',
          updatedAt: '2024-01-08T12:00:00Z',
          questions: [
            {
              id: 'q4',
              surveyId: '4',
              type: 'multiple_choice',
              title: 'Какие кухни вам нравятся?',
              required: true,
              order: 1,
              options: [
                { id: 'o9', text: 'Итальянская', order: 1 },
                { id: 'o10', text: 'Японская', order: 2 },
                { id: 'o11', text: 'Французская', order: 3 },
                { id: 'o12', text: 'Мексиканская', order: 4 }
              ]
            }
          ],
          responses: [],
          settings: {
            allowAnonymous: false,
            showProgress: true,
            randomizeQuestions: false,
            oneResponsePerUser: true,
            collectTelegramData: true,
            creationType: 'manual' as const
          }
        }
      ],
      currentSurvey: null,
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
      
      updateSurvey: (surveyId, updates) => set((state) => ({
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
