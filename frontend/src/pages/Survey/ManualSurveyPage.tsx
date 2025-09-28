import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import TelegramEmoji from '../../components/ui/TelegramEmoji';
import { Button } from '../../components/ui/Button';
// import type { QuestionType } from '../../types'; // Временно не используется

// Временно убираем неиспользуемый интерфейс
// interface Question {
//   id: string;
//   type: QuestionType;
//   title: string;
//   required: boolean;
//   options?: string[];
// }

const ManualSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirm } = useTelegram();

  // Состояние формы
  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    endDate: '',
    maxParticipants: '',
    isAnonymous: false,
    hasReward: false,
    rewardType: 'promo_code' as 'promo_code' | 'stars' | 'custom',
    rewardValue: '',
    rewardDescription: ''
  });

  // Убираем неиспользуемые состояния пока что
  // const [questions, setQuestions] = useState<Question[]>([]);
  // const [showQuestionForm, setShowQuestionForm] = useState(false);
  // const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const handleBack = () => {
    showConfirm('Данные могут не сохраниться. Вы уверены, что хотите выйти?').then((confirmed: boolean) => {
      if (confirmed) {
        navigate(-1);
      }
    });
  };

  const handleSurveyDataChange = (field: string, value: any) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  // Убираем неиспользуемые функции пока что
  // const addQuestion = () => { ... };
  // const saveQuestion = (question: Question) => { ... };
  // const deleteQuestion = (id: string) => { ... };
  // const handleCreateSurvey = () => { ... };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--tg-bg-color)',
      color: 'var(--tg-text-color)'
    }}>
      {/* Шапка */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid var(--tg-section-separator-color)',
        backgroundColor: 'var(--tg-bg-color)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--tg-button-color)',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{
          marginLeft: '12px',
          fontSize: '20px',
          fontWeight: '600',
          margin: 0
        }}>
          Основные настройки
        </h1>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '32px' }}
        >
          <TelegramEmoji emoji="📝" size="large" />
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: '16px 0 8px 0'
          }}>
            Основные настройки
          </h2>
        </motion.div>

        {/* Основные поля */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Название: Опрос о предпочтениях в еде
            </label>
            <input
              type="text"
              value={surveyData.title}
              onChange={(e) => handleSurveyDataChange('title', e.target.value)}
              placeholder="Опрос о предпочтениях в еде"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Язык опроса: 🇷🇺 Русский
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: 'var(--tg-section-bg-color)',
                color: 'var(--tg-text-color)',
                fontSize: '16px'
              }}
            >
              <option value="ru">🇷🇺 Русский</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Выбрать пост
            </label>
            <Button
              variant="outline"
              onClick={() => {}}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '12px 16px'
              }}
            >
              Выбрать пост для опроса
            </Button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Текст кнопки поста:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <Button variant="primary" size="sm">Участвовать</Button>
              <Button variant="outline" size="sm">Принять участие</Button>
              <Button variant="outline" size="sm">Участвую!</Button>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--tg-hint-color)',
              margin: 0
            }}>
              Укажите название, пост и текст для кнопки вашего опроса.
            </p>
          </div>

          {/* Настройки */}
          <div style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              margin: 0
            }}>
              Настройки опроса
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                marginBottom: '8px'
              }}>
                Дата окончания (необязательно)
              </label>
              <input
                type="date"
                value={surveyData.endDate}
                onChange={(e) => handleSurveyDataChange('endDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                marginBottom: '8px'
              }}>
                Максимальное количество участников
              </label>
              <input
                type="number"
                value={surveyData.maxParticipants}
                onChange={(e) => handleSurveyDataChange('maxParticipants', e.target.value)}
                placeholder="Без ограничений"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={surveyData.isAnonymous}
                  onChange={(e) => handleSurveyDataChange('isAnonymous', e.target.checked)}
                  style={{ marginRight: '12px' }}
                />
                Анонимные ответы
              </label>
            </div>

            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={surveyData.hasReward}
                  onChange={(e) => handleSurveyDataChange('hasReward', e.target.checked)}
                  style={{ marginRight: '12px' }}
                />
                Награда за участие
              </label>
            </div>

            {surveyData.hasReward && (
              <div style={{ marginTop: '16px', paddingLeft: '24px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <select
                    value={surveyData.rewardType}
                    onChange={(e) => handleSurveyDataChange('rewardType', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--tg-section-separator-color)',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '16px'
                    }}
                  >
                    <option value="promo_code">Промокод</option>
                    <option value="stars">Звёзды Telegram</option>
                    <option value="custom">Другое</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={surveyData.rewardValue}
                  onChange={(e) => handleSurveyDataChange('rewardValue', e.target.value)}
                  placeholder="Значение награды"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--tg-section-separator-color)',
                    backgroundColor: 'var(--tg-bg-color)',
                    color: 'var(--tg-text-color)',
                    fontSize: '16px',
                    marginBottom: '12px'
                  }}
                />
                <input
                  type="text"
                  value={surveyData.rewardDescription}
                  onChange={(e) => handleSurveyDataChange('rewardDescription', e.target.value)}
                  placeholder="Описание награды"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--tg-section-separator-color)',
                    backgroundColor: 'var(--tg-bg-color)',
                    color: 'var(--tg-text-color)',
                    fontSize: '16px'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Кнопки снизу */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px'
        }}>
          <Button
            variant="outline"
            onClick={handleBack}
            style={{ flex: 1 }}
          >
            Назад
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/survey/create/manual/questions')}
            style={{ flex: 1 }}
          >
            Вперед
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManualSurveyPage;
