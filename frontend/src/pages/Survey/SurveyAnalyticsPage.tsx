import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Share, Settings, ChevronDown, ChevronUp, Save, X, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { surveyApi, questionApi } from '../../services/api';
import type { SurveyShareResponse } from '../../services/api';
import type { Survey, SurveySettings, QuestionType } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { useStableBackButton } from '../../hooks/useStableBackButton';
import { AnimatedTabs } from '../../components/ui/AnimatedTabs';

interface EditableQuestion {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  is_required: boolean;
  order_index: number;
  options?: string[];
  has_other_option?: boolean;
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
  image_url?: string;
  image_name?: string;
}

export default function SurveyAnalyticsPage() {
  const { surveyId } = useParams();
  const { hapticFeedback } = useTelegram();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [share, setShare] = useState<SurveyShareResponse | null>(null);
  const [stats, setStats] = useState<{ total_responses: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'analytics'>('overview');
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [responsesPage, setResponsesPage] = useState<any[] | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState<SurveySettings | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<EditableQuestion[]>([]);

  useStableBackButton({ targetRoute: '/' });

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        const [s, sh, st] = await Promise.all([
          surveyApi.getSurvey(surveyId, false),
          surveyApi.getSurveyShareLink(surveyId).catch(() => null),
          surveyApi.getSurveyStats(surveyId),
        ]);
        setSurvey(s);
        setShare(sh);
        setStats(st as any);
        setEditedSettings(s.settings);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить опрос');
        setLoading(false);
      }
    };
    load();
  }, [surveyId]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (activeTab !== 'questions' || !surveyId) return;
      try {
        const list = await questionApi.getSurveyQuestions(surveyId);
        const mapped = list.map((q: any) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          description: q.description,
          is_required: q.is_required,
          order_index: q.order_index,
          options: Array.isArray(q.options) ? q.options : (q.options ? Object.values(q.options) : []),
          has_other_option: q.has_other_option,
          scale_min: q.scale_min,
          scale_max: q.scale_max,
          scale_min_label: q.scale_min_label,
          scale_max_label: q.scale_max_label,
          image_url: q.image_url,
          image_name: q.image_name
        }));
        setQuestions(mapped);
        setEditedQuestions(JSON.parse(JSON.stringify(mapped)));
      } catch (e) {
        console.error(e);
      }
    };
    loadQuestions();
  }, [activeTab, surveyId]);

  const loadResponses = async () => {
    if (!surveyId) return;
    try {
      const page = await surveyApi.getSurveyResponses(surveyId, 20, 0);
      setResponsesPage(page);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!survey || !surveyId) return;
    
    if (newStatus === 'completed') {
      const confirmed = window.confirm('Опрос будет завершён и закрыт для ответов. Продолжить?');
      if (!confirmed) return;
    }
    
    if (newStatus === 'draft') {
      const confirmed = window.confirm('Снять опрос с публикации? Пользователи не смогут на него отвечать.');
      if (!confirmed) return;
    }

    try {
      await surveyApi.updateSurveyStatus(surveyId, newStatus);
      const fresh = await surveyApi.getSurvey(surveyId);
      setSurvey(fresh);
      setShowStatusDropdown(false);
      hapticFeedback?.success();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.detail || 'Не удалось изменить статус');
    }
  };

  const handleSaveSettings = async () => {
    if (!survey || !surveyId || !editedSettings) return;
    try {
      const settingsToSend = {
        ...editedSettings,
        maxParticipants: survey.maxParticipants?.toString() || ''
      };
      await surveyApi.updateSurveySettings(surveyId, settingsToSend);
      const fresh = await surveyApi.getSurvey(surveyId);
      setSurvey(fresh);
      setEditedSettings(fresh.settings);
      setEditingSettings(false);
      hapticFeedback?.success();
      alert('Настройки успешно обновлены!');
    } catch (e) {
      console.error(e);
      alert('Не удалось сохранить настройки');
    }
  };

  const handleSaveQuestions = async () => {
    if (!surveyId) return;
    try {
      // Сохраняем каждый изменённый вопрос
      for (const q of editedQuestions) {
        await questionApi.updateQuestion(q.id, {
          type: q.type,
          text: q.text,
          description: q.description,
          is_required: q.is_required,
          order_index: q.order_index,
          options: q.options,
          has_other_option: q.has_other_option,
          scale_min: q.scale_min,
          scale_max: q.scale_max,
          scale_min_label: q.scale_min_label,
          scale_max_label: q.scale_max_label,
        });
      }
      
      // Перезагружаем вопросы
      const list = await questionApi.getSurveyQuestions(surveyId);
      const mapped = list.map((q: any) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        description: q.description,
        is_required: q.is_required,
        order_index: q.order_index,
        options: Array.isArray(q.options) ? q.options : (q.options ? Object.values(q.options) : []),
        has_other_option: q.has_other_option,
        scale_min: q.scale_min,
        scale_max: q.scale_max,
        scale_min_label: q.scale_min_label,
        scale_max_label: q.scale_max_label,
        image_url: q.image_url,
        image_name: q.image_name
      }));
      setQuestions(mapped);
      setEditedQuestions(JSON.parse(JSON.stringify(mapped)));
      setEditingQuestions(false);
      hapticFeedback?.success();
      alert('Вопросы успешно обновлены!');
    } catch (e) {
      console.error(e);
      alert('Не удалось сохранить вопросы');
    }
  };

  const updateEditedQuestion = (index: number, updates: Partial<EditableQuestion>) => {
    setEditedQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const addOption = (questionIndex: number) => {
    const q = editedQuestions[questionIndex];
    updateEditedQuestion(questionIndex, {
      options: [...(q.options || []), '']
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const q = editedQuestions[questionIndex];
    const newOptions = [...(q.options || [])];
    newOptions[optionIndex] = value;
    updateEditedQuestion(questionIndex, { options: newOptions });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const q = editedQuestions[questionIndex];
    const newOptions = (q.options || []).filter((_, i) => i !== optionIndex);
    updateEditedQuestion(questionIndex, { options: newOptions });
  };

  const handleCopy = async () => {
    if (!share?.share_url) return;
    try {
      await navigator.clipboard.writeText(share.share_url);
      setCopied(true);
      hapticFeedback?.light();
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const getStatusBadge = () => {
    if (!survey) return null;
    switch (survey.status) {
      case 'active':
        return { text: 'Активен', color: '#34C759' };
      case 'draft':
        return { text: 'Черновик', color: '#8E8E93' };
      case 'completed':
        return { text: 'Завершён', color: '#FF6B6B' };
      case 'archived':
        return { text: 'Архив', color: '#FF9500' };
      default:
        return { text: survey.status, color: '#8E8E93' };
    }
  };

  const questionTypes = [
    { value: 'text', label: 'Короткий ответ', icon: '📝' },
    { value: 'textarea', label: 'Развёрнутый ответ', icon: '📄' },
    { value: 'single_choice', label: 'Один из списка', icon: '🔘' },
    { value: 'multiple_choice', label: 'Несколько из списка', icon: '☑️' },
    { value: 'scale', label: 'Шкала', icon: '📊' },
    { value: 'rating', label: 'Оценка звёздами', icon: '⭐' },
    { value: 'yes_no', label: 'Да/Нет', icon: '✅' },
    { value: 'date', label: 'Дата', icon: '📅' },
    { value: 'number', label: 'Число', icon: '🔢' }
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Загрузка...
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 20 }}>
        <div>Ошибка: {error || 'Опрос не найден'}</div>
      </div>
    );
  }

  const statusBadge = getStatusBadge();
  const canEdit = (stats?.total_responses ?? 0) === 0;
  const settings = survey.settings || {};

  const renderQuestionEditor = (question: EditableQuestion, index: number) => {
    const disabled = !editingQuestions;

    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div
          style={{
            backgroundColor: 'var(--tg-section-bg-color)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            border: editingQuestions ? '2px solid var(--tg-button-color)' : '1px solid var(--tg-section-separator-color)',
          }}
        >
          {/* Заголовок вопроса */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                minWidth: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--tg-button-color)',
                color: 'var(--tg-button-text-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {index + 1}
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={question.text}
                onChange={(e) => updateEditedQuestion(index, { text: e.target.value })}
                disabled={disabled}
                placeholder="Вопрос"
                style={{
                  width: '100%',
                  fontSize: '16px',
                  fontWeight: '500',
                  padding: '12px 0',
                  border: 'none',
                  borderBottom: '2px solid var(--tg-section-separator-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--tg-text-color)',
                  outline: 'none',
                  opacity: disabled ? 0.6 : 1
                }}
              />
              
              <input
                type="text"
                value={question.description || ''}
                onChange={(e) => updateEditedQuestion(index, { description: e.target.value })}
                disabled={disabled}
                placeholder="Описание (необязательно)"
                style={{
                  width: '100%',
                  fontSize: '14px',
                  padding: '8px 0',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--tg-hint-color)',
                  outline: 'none',
                  marginTop: '8px',
                  opacity: disabled ? 0.6 : 1
                }}
              />
            </div>
          </div>

          {/* Тип вопроса */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', minWidth: '200px' }}>
              <select
                value={question.type}
                onChange={(e) => updateEditedQuestion(index, {
                  type: e.target.value as QuestionType,
                  options: ['single_choice', 'multiple_choice'].includes(e.target.value) ? [''] : []
                })}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--tg-section-separator-color)',
                  backgroundColor: 'var(--tg-section-bg-color)',
                  color: 'var(--tg-text-color)',
                  fontSize: '14px',
                  outline: 'none',
                  appearance: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1
                }}
              >
                {questionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown 
                size={16} 
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--tg-hint-color)',
                  pointerEvents: 'none'
                }}
              />
            </div>
          </div>

          {/* Варианты ответов для множественного выбора */}
          {(['single_choice', 'multiple_choice'].includes(question.type)) && (
            <div style={{ marginBottom: '16px' }}>
              <AnimatePresence>
                {question.options?.map((option, optIdx) => (
                  <motion.div
                    key={optIdx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: question.type === 'single_choice' ? '50%' : '4px',
                      border: '2px solid var(--tg-section-separator-color)',
                      backgroundColor: 'var(--tg-section-bg-color)'
                    }} />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, optIdx, e.target.value)}
                      disabled={disabled}
                      placeholder={`Вариант ${optIdx + 1}`}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--tg-section-separator-color)',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '14px',
                        outline: 'none',
                        opacity: disabled ? 0.6 : 1
                      }}
                    />
                    {!disabled && question.options && question.options.length > 1 && (
                      <button
                        onClick={() => removeOption(index, optIdx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--tg-hint-color)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {!disabled && (
                <>
                  <button
                    onClick={() => addOption(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px dashed var(--tg-section-separator-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--tg-hint-color)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      width: '100%',
                      justifyContent: 'center',
                      marginBottom: '8px'
                    }}
                  >
                    <Plus size={16} />
                    Добавить вариант
                  </button>

                  {/* Кнопка "Добавить вариант Другое" */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: question.has_other_option ? 'rgba(244, 109, 0, 0.1)' : 'transparent',
                    border: question.has_other_option ? '1px solid rgba(244, 109, 0, 0.3)' : '1px solid var(--tg-section-separator-color)',
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: 'var(--tg-text-color)',
                      cursor: 'pointer',
                      flex: 1
                    }}>
                      <input
                        type="checkbox"
                        checked={question.has_other_option || false}
                        onChange={(e) => updateEditedQuestion(index, { has_other_option: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--tg-button-color)',
                          cursor: 'pointer'
                        }}
                      />
                      <span>Вариант "Другое"</span>
                    </label>
                  </div>
                </>
              )}

              {/* Отображение если "Другое" включено (для disabled режима) */}
              {disabled && question.has_other_option && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(244, 109, 0, 0.1)',
                  border: '1px solid rgba(244, 109, 0, 0.3)',
                  fontSize: '14px',
                  color: 'var(--tg-text-color)',
                  marginTop: '8px'
                }}>
                  ✅ Вариант "Другое" включен
                </div>
              )}
            </div>
          )}

          {/* Шкала для типа scale */}
          {question.type === 'scale' && (
            <div style={{ marginBottom: '16px' }}>
              {!disabled && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '4px' }}>
                      Мин. значение
                    </label>
                    <input
                      type="number"
                      value={question.scale_min || 1}
                      onChange={(e) => updateEditedQuestion(index, { scale_min: parseInt(e.target.value) || 1 })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--tg-section-separator-color)',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '4px' }}>
                      Макс. значение
                    </label>
                    <input
                      type="number"
                      value={question.scale_max || 5}
                      onChange={(e) => updateEditedQuestion(index, { scale_max: parseInt(e.target.value) || 5 })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--tg-section-separator-color)',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              )}
              
              {!disabled && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '4px' }}>
                      Подпись к мин.
                    </label>
                    <input
                      type="text"
                      value={question.scale_min_label || ''}
                      onChange={(e) => updateEditedQuestion(index, { scale_min_label: e.target.value })}
                      placeholder="Не нравится"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--tg-section-separator-color)',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '4px' }}>
                      Подпись к макс.
                    </label>
                    <input
                      type="text"
                      value={question.scale_max_label || ''}
                      onChange={(e) => updateEditedQuestion(index, { scale_max_label: e.target.value })}
                      placeholder="Нравится"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--tg-section-separator-color)',
                        backgroundColor: 'var(--tg-bg-color)',
                        color: 'var(--tg-text-color)',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'var(--tg-bg-color)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', textAlign: 'center', minWidth: '60px' }}>
                  {question.scale_min || 1}
                  {question.scale_min_label && <div style={{ fontSize: '10px', marginTop: '2px' }}>{question.scale_min_label}</div>}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '8px',
                        backgroundColor: 'var(--tg-section-separator-color)',
                        borderRadius: '4px'
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', textAlign: 'center', minWidth: '60px' }}>
                  {question.scale_max || 5}
                  {question.scale_max_label && <div style={{ fontSize: '10px', marginTop: '2px' }}>{question.scale_max_label}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Обязательный вопрос */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid var(--tg-section-separator-color)'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: 'var(--tg-text-color)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1
            }}>
              <input
                type="checkbox"
                checked={question.is_required}
                onChange={(e) => updateEditedQuestion(index, { is_required: e.target.checked })}
                disabled={disabled}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: 'var(--tg-button-color)',
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              />
              Обязательный вопрос
            </label>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tg-bg-color)', color: 'var(--tg-text-color)', padding: 12, paddingBottom: 80 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, flex: 1 }}>{survey.title}</h1>
          {statusBadge && (
            <div style={{ background: statusBadge.color, color: 'white', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
              {statusBadge.text}
            </div>
          )}
        </div>
        {survey.description && (
          <p style={{ color: 'var(--tg-hint-color)', margin: '8px 0 0 0', fontSize: 14, lineHeight: 1.4 }}>{survey.description}</p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tg-hint-color)' }}>
            📝 {survey.questions?.length || 0} {(survey.questions?.length || 0) === 1 ? 'вопрос' : 'вопросов'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tg-hint-color)' }}>
            📊 {stats?.total_responses ?? 0} {((stats?.total_responses ?? 0) === 1 || (stats?.total_responses ?? 0) > 20) ? 'ответ' : 'ответов'}
          </div>
        </div>
      </div>

      {/* Табы */}
      <AnimatedTabs
        tabs={[
          { id: 'overview', label: 'Обзор' },
          { id: 'questions', label: 'Вопросы' },
          { id: 'analytics', label: 'Аналитика' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id as any);
          hapticFeedback?.light();
        }}
        style={{ marginBottom: 12 }}
      />

      {/* Таб: Обзор */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Управление статусом */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 14, padding: 14 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>Статус опроса</h3>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                style={{
                  width: '100%',
                  background: 'var(--tg-button-color)',
                  color: 'var(--tg-button-text-color)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span>{statusBadge?.text}</span>
                <ChevronDown size={18} />
              </button>
              {showStatusDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--tg-section-bg-color)',
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  overflow: 'hidden',
                  border: '1px solid var(--tg-section-separator-color)'
                }}>
                  {survey.status !== 'active' && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--tg-text-color)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--tg-section-separator-color)'
                      }}
                    >
                      ✅ Активировать
                    </button>
                  )}
                  {survey.status === 'active' && canEdit && (
                    <button
                      onClick={() => handleStatusChange('draft')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--tg-text-color)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--tg-section-separator-color)'
                      }}
                    >
                      📝 Перевести в черновик
                    </button>
                  )}
                  {survey.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange('completed')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--tg-text-color)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--tg-section-separator-color)'
                      }}
                    >
                      ✔️ Завершить опрос
                    </button>
                  )}
                  {survey.status !== 'archived' && (
                    <button
                      onClick={() => handleStatusChange('archived')}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--tg-text-color)',
                        cursor: 'pointer'
                      }}
                    >
                      📦 Архивировать
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Распространение */}
          {share && (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 14, padding: 14 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>Распространение</h3>
              <div style={{ background: 'var(--tg-bg-color)', borderRadius: 10, padding: 10, marginBottom: 10, wordBreak: 'break-all', fontSize: 13, color: 'var(--tg-hint-color)' }}>
                {share.share_url}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1,
                    background: 'var(--tg-button-color)',
                    color: 'var(--tg-button-text-color)',
                    border: 'none',
                    borderRadius: 10,
                    padding: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Copy size={16} /> {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(share.share_url)}`, '_blank')}
                  style={{
                    flex: 1,
                    background: '#0088cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Share size={16} /> Поделиться
                </button>
              </div>
              {share.qr_code && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <img src={share.qr_code} alt="QR" style={{ maxWidth: 180, borderRadius: 10, border: '1px solid var(--tg-section-separator-color)' }} />
                </div>
              )}
            </div>
          )}

          {/* Настройки опроса */}
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 14, padding: 14 }}>
            <button
              onClick={() => {
                setSettingsExpanded(!settingsExpanded);
                hapticFeedback?.light();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 0,
                marginBottom: settingsExpanded ? 12 : 0,
                color: 'var(--tg-text-color)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={18} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Настройки опроса</h3>
              </div>
              {settingsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            {settingsExpanded && (
              <>
                <button
                  onClick={() => {
                    if (editingSettings) {
                      handleSaveSettings();
                    } else {
                      setEditingSettings(true);
                    }
                    hapticFeedback?.light();
                  }}
                  style={{
                    background: editingSettings ? 'var(--tg-button-color)' : 'var(--tg-button-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: 12
                  }}
                >
                  {editingSettings ? <><Save size={16} /> Сохранить изменения</> : <>⚙️ Редактировать</>}
                </button>
                
                {editingSettings && (
                  <button
                    onClick={() => {
                      setEditingSettings(false);
                      setEditedSettings(survey.settings);
                      hapticFeedback?.light();
                    }}
                    style={{
                      background: '#8E8E93',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 16px',
                      fontWeight: 600,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      width: '100%',
                      marginBottom: 12
                    }}
                  >
                    <X size={16} /> Отменить
                  </button>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
                  {/* Показывать прогресс */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Показывать прогресс</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.showProgress || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, showProgress: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.showProgress ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '24px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '18px',
                            width: '18px',
                            left: editedSettings?.showProgress ? '28px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.showProgress ? 'Да' : 'Нет'}</span>
                    )}
                  </div>

                  {/* Один ответ на пользователя */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Один ответ на пользователя</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.oneResponsePerUser || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, oneResponsePerUser: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.oneResponsePerUser ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '24px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '18px',
                            width: '18px',
                            left: editedSettings?.oneResponsePerUser ? '28px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.oneResponsePerUser ? 'Да' : 'Нет'}</span>
                    )}
                  </div>

                  {/* Анонимность */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Анонимность</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.allowAnonymous || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, allowAnonymous: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.allowAnonymous ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '24px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '18px',
                            width: '18px',
                            left: editedSettings?.allowAnonymous ? '28px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.allowAnonymous ? 'Разрешена' : 'Запрещена'}</span>
                    )}
                  </div>

                  {/* Сбор Telegram-данных */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Сбор Telegram-данных</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.collectTelegramData || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, collectTelegramData: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.collectTelegramData ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '24px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '18px',
                            width: '18px',
                            left: editedSettings?.collectTelegramData ? '28px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.collectTelegramData ? 'Да' : 'Нет'}</span>
                    )}
                  </div>

                  {/* Перемешать вопросы */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Перемешать вопросы</span>
                    {editingSettings ? (
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                        <input
                          type="checkbox"
                          checked={editedSettings?.randomizeQuestions || false}
                          onChange={(e) => setEditedSettings({ ...editedSettings!, randomizeQuestions: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: editedSettings?.randomizeQuestions ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                          borderRadius: '24px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '18px',
                            width: '18px',
                            left: editedSettings?.randomizeQuestions ? '28px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{settings.randomizeQuestions ? 'Да' : 'Нет'}</span>
                    )}
                  </div>

                  {/* Макс. участников */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                    <span style={{ color: 'var(--tg-hint-color)' }}>Макс. участников</span>
                    <span style={{ fontWeight: 500 }}>{survey.maxParticipants || 'Не указано'}</span>
                  </div>

                  {/* Мотивация */}
                  {settings.motivationEnabled && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                        <span style={{ color: 'var(--tg-hint-color)' }}>Мотивация включена</span>
                        {editingSettings ? (
                          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                            <input
                              type="checkbox"
                              checked={editedSettings?.motivationEnabled || false}
                              onChange={(e) => setEditedSettings({ ...editedSettings!, motivationEnabled: e.target.checked })}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: editedSettings?.motivationEnabled ? 'var(--tg-button-color)' : 'var(--tg-hint-color)',
                              borderRadius: '24px',
                              transition: '0.3s'
                            }}>
                              <span style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                left: editedSettings?.motivationEnabled ? '28px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                transition: '0.3s'
                              }} />
                            </span>
                          </label>
                        ) : (
                          <span style={{ fontWeight: 500 }}>Да</span>
                        )}
                      </div>

                      {editingSettings && editedSettings?.motivationEnabled && (
                        <>
                          <div style={{ padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                            <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '8px' }}>
                              Тип мотивации
                            </label>
                            <select
                              value={editedSettings?.motivationType || 'discount'}
                              onChange={(e) => setEditedSettings({ ...editedSettings!, motivationType: e.target.value as any })}
                              style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--tg-section-separator-color)',
                                backgroundColor: 'var(--tg-bg-color)',
                                color: 'var(--tg-text-color)',
                                fontSize: '14px',
                                outline: 'none'
                              }}
                            >
                              <option value="stars">⭐ Telegram Stars</option>
                              <option value="discount">🎁 Промокод/скидка</option>
                              <option value="gift">🎁 Подарок</option>
                              <option value="contest">🏆 Конкурс</option>
                            </select>
                          </div>

                          {editedSettings?.motivationType === 'stars' && (
                            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                              <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '8px' }}>
                                Количество звёзд
                              </label>
                              <input
                                type="number"
                                value={editedSettings?.motivationDetails || ''}
                                onChange={(e) => setEditedSettings({ ...editedSettings!, motivationDetails: e.target.value })}
                                placeholder="100"
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--tg-section-separator-color)',
                                  backgroundColor: 'var(--tg-bg-color)',
                                  color: 'var(--tg-text-color)',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          )}

                          {(editedSettings?.motivationType === 'discount' || editedSettings?.motivationType === 'gift' || editedSettings?.motivationType === 'contest') && (
                            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                              <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '8px' }}>
                                Описание
                              </label>
                              <textarea
                                value={editedSettings?.motivationDetails || ''}
                                onChange={(e) => setEditedSettings({ ...editedSettings!, motivationDetails: e.target.value })}
                                placeholder="Опишите мотивацию..."
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--tg-section-separator-color)',
                                  backgroundColor: 'var(--tg-bg-color)',
                                  color: 'var(--tg-text-color)',
                                  fontSize: '14px',
                                  outline: 'none',
                                  resize: 'vertical',
                                  fontFamily: 'inherit'
                                }}
                              />
                            </div>
                          )}

                          <div style={{ padding: '10px 0' }}>
                            <label style={{ fontSize: '12px', color: 'var(--tg-hint-color)', display: 'block', marginBottom: '8px' }}>
                              Условия получения
                            </label>
                            <textarea
                              value={editedSettings?.motivationConditions || ''}
                              onChange={(e) => setEditedSettings({ ...editedSettings!, motivationConditions: e.target.value })}
                              placeholder="Укажите условия..."
                              rows={2}
                              style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--tg-section-separator-color)',
                                backgroundColor: 'var(--tg-bg-color)',
                                color: 'var(--tg-text-color)',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                              }}
                            />
                          </div>
                        </>
                      )}

                      {!editingSettings && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                            <span style={{ color: 'var(--tg-hint-color)' }}>Тип мотивации</span>
                            <span style={{ fontWeight: 500 }}>
                              {settings.motivationType === 'stars' && '⭐ Telegram Stars'}
                              {settings.motivationType === 'discount' && '🎁 Промокод'}
                              {settings.motivationType === 'gift' && '🎁 Подарок'}
                              {settings.motivationType === 'contest' && '🏆 Конкурс'}
                            </span>
                          </div>
                          {settings.motivationDetails && (
                            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--tg-section-separator-color)' }}>
                              <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginBottom: '4px' }}>Описание:</div>
                              <div style={{ fontSize: '14px', fontWeight: 500 }}>{settings.motivationDetails}</div>
                            </div>
                          )}
                          {settings.motivationConditions && (
                            <div style={{ padding: '10px 0' }}>
                              <div style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginBottom: '4px' }}>Условия:</div>
                              <div style={{ fontSize: '14px', fontWeight: 500 }}>{settings.motivationConditions}</div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Таб: Вопросы */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {canEdit && (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--tg-hint-color)' }}>
                  {editingQuestions ? 'Режим редактирования активен' : 'Редактирование доступно'}
                </span>
              </div>
              <button
                onClick={() => {
                  if (editingQuestions) {
                    handleSaveQuestions();
                  } else {
                    setEditingQuestions(true);
                  }
                  hapticFeedback?.light();
                }}
                style={{
                  background: editingQuestions ? 'var(--tg-button-color)' : 'var(--tg-button-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {editingQuestions ? <><Save size={16} /> Сохранить изменения</> : <>⚙️ Редактировать вопросы</>}
              </button>
              {editingQuestions && (
                <button
                  onClick={() => {
                    setEditingQuestions(false);
                    setEditedQuestions(JSON.parse(JSON.stringify(questions)));
                    hapticFeedback?.light();
                  }}
                  style={{
                    background: '#8E8E93',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <X size={16} /> Отменить
                </button>
              )}
            </div>
          )}
          {!canEdit && (
            <div style={{ background: '#FFF3CD', color: '#856404', borderRadius: 10, padding: 12, fontSize: 13 }}>
              ⚠️ Редактирование невозможно — есть ответы на опрос
            </div>
          )}
          {editedQuestions.length === 0 ? (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 10, padding: 20, textAlign: 'center', color: 'var(--tg-hint-color)' }}>
              Вопросов нет
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AnimatePresence>
                {editedQuestions.map((q, idx) => renderQuestionEditor(q, idx))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Таб: Аналитика */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 14, padding: 14 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>Общая статистика</h3>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--tg-button-color)' }}>
              {stats?.total_responses ?? 0}
            </div>
            <div style={{ color: 'var(--tg-hint-color)', fontSize: 13 }}>Всего ответов</div>
          </div>
          {(stats?.total_responses ?? 0) === 0 ? (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 20, textAlign: 'center', color: 'var(--tg-hint-color)' }}>
              Пока нет ответов — аналитика будет доступна после первых прохождений
            </div>
          ) : (
            <div style={{ background: 'var(--tg-section-bg-color)', borderRadius: 12, padding: 14 }}>
              <button
                onClick={loadResponses}
                style={{
                  background: 'var(--tg-button-color)',
                  color: 'var(--tg-button-text-color)',
                  border: 'none',
                  borderRadius: 10,
                  padding: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  width: '100%',
                }}
              >
                Показать ответы (20)
              </button>
              {responsesPage && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {responsesPage.map((r) => (
                    <div key={r.id} style={{ background: 'var(--tg-bg-color)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--tg-hint-color)', marginBottom: 4 }}>ID: {r.id}</div>
                      <div style={{ fontSize: 13 }}>Анонимно: {r.is_anonymous ? 'Да' : 'Нет'}</div>
                      <div style={{ fontSize: 13, color: 'var(--tg-hint-color)' }}>
                        Завершён: {r.completed_at ? new Date(r.completed_at).toLocaleString('ru-RU') : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
