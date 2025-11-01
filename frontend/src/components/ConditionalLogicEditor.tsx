import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ConditionalLogic, ConditionalCondition, ValueCondition, DateCondition } from '../types';

interface Question {
  id: string;
  type: string;
  title?: string;
  text?: string;
  required?: boolean;
  order?: number;
  orderIndex?: number;
  options?: string[];
  conditionalLogic?: ConditionalLogic | null;
}

interface ConditionalLogicEditorProps {
  question: Question;
  allQuestions: Question[];
  onConditionChange: (logic: ConditionalLogic | null) => void;
}

export const ConditionalLogicEditor: React.FC<ConditionalLogicEditorProps> = ({
  question,
  allQuestions,
  onConditionChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logic, setLogic] = useState<ConditionalLogic | null>(question.conditionalLogic || null);

  // Вопросы, которые можно показывать (только те, что идут после текущего)
  const currentOrder = question.order || question.orderIndex || 0;
  const availableQuestions = allQuestions.filter(q => {
    const qOrder = q.order || q.orderIndex || 0;
    return qOrder > currentOrder && q.id !== question.id;
  });

  useEffect(() => {
    setLogic(question.conditionalLogic || null);
  }, [question.conditionalLogic]);

  useEffect(() => {
    onConditionChange(logic);
  }, [logic, onConditionChange]);

  // Инициализация логики при первом открытии
  const handleEnable = () => {
    if (!logic) {
      const newLogic: ConditionalLogic = {};
      
      if (question.type === 'single_choice' || question.type === 'yes_no') {
        newLogic.conditions = [];
      } else if (question.type === 'multiple_choice') {
        newLogic.conditionType = 'any';
        newLogic.options = [];
      } else if (question.type === 'scale' || question.type === 'rating' || question.type === 'number') {
        newLogic.valueConditions = [];
      } else if (question.type === 'date') {
        newLogic.dateConditions = [];
      }
      
      setLogic(newLogic);
    }
    setIsExpanded(true);
  };

  const handleDisable = () => {
    setLogic(null);
    setIsExpanded(false);
  };

  // ========== Обработчики для single_choice ==========
  const addSingleChoiceCondition = () => {
    if (!logic) return;
    const newCondition: ConditionalCondition = {
      optionValue: question.options?.[0] || '',
      showQuestions: []
    };
    setLogic({
      ...logic,
      conditions: [...(logic.conditions || []), newCondition]
    });
  };

  const updateSingleChoiceCondition = (index: number, updates: Partial<ConditionalCondition>) => {
    if (!logic?.conditions) return;
    const updated = [...logic.conditions];
    updated[index] = { ...updated[index], ...updates };
    setLogic({ ...logic, conditions: updated });
  };

  const removeSingleChoiceCondition = (index: number) => {
    if (!logic?.conditions) return;
    const updated = logic.conditions.filter((_, i) => i !== index);
    setLogic({ ...logic, conditions: updated });
  };

  // ========== Обработчики для yes_no ==========
  const updateYesNoCondition = (answer: 'yes' | 'no', showQuestions: string[]) => {
    if (!logic) return;
    const updated = (logic.conditions || []).map(c => 
      c.answer === answer ? { ...c, showQuestions } : c
    );
    const exists = updated.some(c => c.answer === answer);
    if (!exists) {
      updated.push({ answer, showQuestions });
    }
    setLogic({ ...logic, conditions: updated });
  };

  // ========== Обработчики для multiple_choice ==========
  const updateMultipleChoiceCondition = (conditionType: 'any' | 'all' | 'count', options?: string[], minCount?: number) => {
    if (!logic) return;
    setLogic({
      ...logic,
      conditionType,
      options: conditionType === 'count' ? undefined : options,
      minCount: conditionType === 'count' ? minCount : undefined
    });
  };

  const toggleMultipleChoiceOption = (option: string) => {
    if (!logic) return;
    const currentOptions = logic.options || [];
    const updated = currentOptions.includes(option)
      ? currentOptions.filter(o => o !== option)
      : [...currentOptions, option];
    setLogic({ ...logic, options: updated });
  };

  // ========== Обработчики для scale/rating/number ==========
  const addValueCondition = () => {
    if (!logic) return;
    const newCondition: ValueCondition = {
      operator: 'equal',
      value: 0,
      showQuestions: []
    };
    setLogic({
      ...logic,
      valueConditions: [...(logic.valueConditions || []), newCondition]
    });
  };

  const updateValueCondition = (index: number, updates: Partial<ValueCondition>) => {
    if (!logic?.valueConditions) return;
    const updated = [...logic.valueConditions];
    updated[index] = { ...updated[index], ...updates };
    setLogic({ ...logic, valueConditions: updated });
  };

  const removeValueCondition = (index: number) => {
    if (!logic?.valueConditions) return;
    const updated = logic.valueConditions.filter((_, i) => i !== index);
    setLogic({ ...logic, valueConditions: updated });
  };

  // ========== Обработчики для date ==========
  const addDateCondition = () => {
    if (!logic) return;
    const newCondition: DateCondition = {
      operator: 'equal',
      date: new Date().toISOString().split('T')[0],
      showQuestions: []
    };
    setLogic({
      ...logic,
      dateConditions: [...(logic.dateConditions || []), newCondition]
    });
  };

  const updateDateCondition = (index: number, updates: Partial<DateCondition>) => {
    if (!logic?.dateConditions) return;
    const updated = [...logic.dateConditions];
    updated[index] = { ...updated[index], ...updates };
    setLogic({ ...logic, dateConditions: updated });
  };

  const removeDateCondition = (index: number) => {
    if (!logic?.dateConditions) return;
    const updated = logic.dateConditions.filter((_, i) => i !== index);
    setLogic({ ...logic, dateConditions: updated });
  };

  // Общий обработчик для выбора вопросов
  const toggleQuestionSelection = (questionIds: string[], questionId: string): string[] => {
    return questionIds.includes(questionId)
      ? questionIds.filter(id => id !== questionId)
      : [...questionIds, questionId];
  };

  // Рендер для выбора вопросов
  const renderQuestionSelector = (selectedIds: string[], onChange: (ids: string[]) => void) => {
    if (availableQuestions.length === 0) {
      return (
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--tg-section-bg-color)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--tg-hint-color)',
          textAlign: 'center'
        }}>
          Нет доступных вопросов для показа. Добавьте вопросы после этого.
        </div>
      );
    }

    return (
      <div style={{
        padding: '12px',
        backgroundColor: 'var(--tg-section-bg-color)',
        borderRadius: '8px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {availableQuestions.map(q => (
          <label
            key={q.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tg-bg-color)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(q.id)}
              onChange={() => onChange(toggleQuestionSelection(selectedIds, q.id))}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--tg-text-color)' }}>
              {q.title || q.text || `Вопрос ${q.order || q.orderIndex || ''}`}
            </span>
          </label>
        ))}
      </div>
    );
  };

  if (!isExpanded && !logic) {
    return (
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={handleEnable}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'var(--tg-section-bg-color)',
            border: '1px dashed var(--tg-section-separator-color)',
            borderRadius: '8px',
            color: 'var(--tg-text-color)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={16} />
          Настроить условную логику
        </button>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      backgroundColor: 'var(--tg-section-bg-color)',
      borderRadius: '12px',
      border: '1px solid var(--tg-section-separator-color)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>⚙️</span>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            margin: 0,
            color: 'var(--tg-text-color)'
          }}>
            Условная логика
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tg-hint-color)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={handleDisable}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tg-hint-color)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {/* Single Choice */}
          {question.type === 'single_choice' && (
            <div>
              <div style={{
                fontSize: '13px',
                color: 'var(--tg-hint-color)',
                marginBottom: '12px'
              }}>
                Настройте, какие вопросы показывать при выборе каждого варианта ответа
              </div>
              {(logic?.conditions || []).map((condition, index) => (
                <div key={index} style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--tg-bg-color)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        color: 'var(--tg-hint-color)',
                        marginBottom: '4px'
                      }}>
                        Если выбран вариант:
                      </label>
                      <select
                        value={condition.optionValue || ''}
                        onChange={(e) => updateSingleChoiceCondition(index, { optionValue: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'var(--tg-section-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '14px'
                        }}
                      >
                        {(question.options || []).map((opt, optIndex) => (
                          <option key={optIndex} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => removeSingleChoiceCondition(index)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--tg-hint-color)',
                        cursor: 'pointer',
                        padding: '8px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--tg-hint-color)',
                      marginBottom: '8px'
                    }}>
                      Показать вопросы:
                    </label>
                    {renderQuestionSelector(
                      condition.showQuestions,
                      (ids) => updateSingleChoiceCondition(index, { showQuestions: ids })
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addSingleChoiceCondition}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--tg-section-separator-color)',
                  borderRadius: '6px',
                  color: 'var(--tg-text-color)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                Добавить условие для другого варианта
              </button>
            </div>
          )}

          {/* Yes/No */}
          {question.type === 'yes_no' && (
            <div>
              <div style={{
                fontSize: '13px',
                color: 'var(--tg-hint-color)',
                marginBottom: '12px'
              }}>
                Настройте, какие вопросы показывать при ответе "Да" или "Нет"
              </div>
              {(['yes', 'no'] as const).map(answer => {
                const condition = logic?.conditions?.find(c => c.answer === answer);
                return (
                  <div key={answer} style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--tg-bg-color)',
                    borderRadius: '8px'
                  }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--tg-hint-color)',
                      marginBottom: '8px'
                    }}>
                      Если ответ "{answer === 'yes' ? 'Да' : 'Нет'}":
                    </label>
                    {renderQuestionSelector(
                      condition?.showQuestions || [],
                      (ids) => updateYesNoCondition(answer, ids)
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Multiple Choice */}
          {question.type === 'multiple_choice' && (
            <div>
              <div style={{
                fontSize: '13px',
                color: 'var(--tg-hint-color)',
                marginBottom: '12px'
              }}>
                Настройте условие показа вопросов в зависимости от выбранных вариантов
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--tg-hint-color)',
                  marginBottom: '8px'
                }}>
                  Тип условия:
                </label>
                <select
                  value={logic?.conditionType || 'any'}
                  onChange={(e) => updateMultipleChoiceCondition(e.target.value as 'any' | 'all' | 'count')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--tg-bg-color)',
                    color: 'var(--tg-text-color)',
                    fontSize: '14px'
                  }}
                >
                  <option value="any">Если выбран любой из вариантов</option>
                  <option value="all">Если выбраны все варианты</option>
                  <option value="count">Если выбрано N вариантов</option>
                </select>
              </div>

              {logic?.conditionType === 'count' ? (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    color: 'var(--tg-hint-color)',
                    marginBottom: '8px'
                  }}>
                    Минимум вариантов:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={question.options?.length || 1}
                    value={logic.minCount || 1}
                    onChange={(e) => updateMultipleChoiceCondition('count', undefined, parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'var(--tg-bg-color)',
                      color: 'var(--tg-text-color)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    color: 'var(--tg-hint-color)',
                    marginBottom: '8px'
                  }}>
                    Варианты:
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--tg-bg-color)',
                    borderRadius: '8px',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}>
                    {(question.options || []).map((opt, index) => (
                      <label
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(logic?.options || []).includes(opt)}
                          onChange={() => toggleMultipleChoiceOption(opt)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '13px' }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--tg-hint-color)',
                  marginBottom: '8px'
                }}>
                  Показать вопросы:
                </label>
                {renderQuestionSelector(
                  logic?.conditions?.[0]?.showQuestions || [],
                  (ids) => {
                    if (!logic) return;
                    setLogic({
                      ...logic,
                      conditions: [{ showQuestions: ids }]
                    });
                  }
                )}
              </div>
            </div>
          )}

          {/* Scale, Rating, Number */}
          {(question.type === 'scale' || question.type === 'rating' || question.type === 'number') && (
            <div>
              <div style={{
                fontSize: '13px',
                color: 'var(--tg-hint-color)',
                marginBottom: '12px'
              }}>
                Настройте условия показа вопросов в зависимости от значения ответа
              </div>
              {(logic?.valueConditions || []).map((condition, index) => (
                <div key={index} style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--tg-bg-color)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1, display: 'flex', gap: '8px', marginRight: '12px' }}>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateValueCondition(index, { 
                          operator: e.target.value as any,
                          // Очищаем min/max если не range
                          min: e.target.value === 'range' ? condition.min : undefined,
                          max: e.target.value === 'range' ? condition.max : undefined,
                          value: e.target.value === 'range' ? undefined : condition.value
                        })}
                        style={{
                          flex: condition.operator === 'range' ? 1 : 2,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'var(--tg-section-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '14px'
                        }}
                      >
                        <option value="less_than">&lt;</option>
                        <option value="less_or_equal">≤</option>
                        <option value="equal">=</option>
                        <option value="greater_or_equal">≥</option>
                        <option value="greater_than">&gt;</option>
                        <option value="range">Диапазон</option>
                      </select>
                      
                      {condition.operator === 'range' ? (
                        <>
                          <input
                            type="number"
                            placeholder="От"
                            value={condition.min || ''}
                            onChange={(e) => updateValueCondition(index, { 
                              min: parseInt(e.target.value) || undefined 
                            })}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'var(--tg-section-bg-color)',
                              color: 'var(--tg-text-color)',
                              fontSize: '14px'
                            }}
                          />
                          <input
                            type="number"
                            placeholder="До"
                            value={condition.max || ''}
                            onChange={(e) => updateValueCondition(index, { 
                              max: parseInt(e.target.value) || undefined 
                            })}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'var(--tg-section-bg-color)',
                              color: 'var(--tg-text-color)',
                              fontSize: '14px'
                            }}
                          />
                        </>
                      ) : (
                        <input
                          type="number"
                          value={condition.value || ''}
                          onChange={(e) => updateValueCondition(index, { 
                            value: parseInt(e.target.value) || undefined 
                          })}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'var(--tg-section-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '14px'
                          }}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => removeValueCondition(index)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--tg-hint-color)',
                        cursor: 'pointer',
                        padding: '8px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--tg-hint-color)',
                      marginBottom: '8px'
                    }}>
                      Показать вопросы:
                    </label>
                    {renderQuestionSelector(
                      condition.showQuestions,
                      (ids) => updateValueCondition(index, { showQuestions: ids })
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addValueCondition}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--tg-section-separator-color)',
                  borderRadius: '6px',
                  color: 'var(--tg-text-color)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                Добавить условие
              </button>
            </div>
          )}

          {/* Date */}
          {question.type === 'date' && (
            <div>
              <div style={{
                fontSize: '13px',
                color: 'var(--tg-hint-color)',
                marginBottom: '12px'
              }}>
                Настройте условия показа вопросов в зависимости от выбранной даты
              </div>
              {(logic?.dateConditions || []).map((condition, index) => (
                <div key={index} style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--tg-bg-color)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1, display: 'flex', gap: '8px', marginRight: '12px' }}>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateDateCondition(index, { 
                          operator: e.target.value as any,
                          startDate: e.target.value === 'range' ? condition.startDate : undefined,
                          endDate: e.target.value === 'range' ? condition.endDate : undefined,
                          date: e.target.value === 'range' ? undefined : condition.date
                        })}
                        style={{
                          flex: condition.operator === 'range' ? 1 : 2,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'var(--tg-section-bg-color)',
                          color: 'var(--tg-text-color)',
                          fontSize: '14px'
                        }}
                      >
                        <option value="before">Раньше</option>
                        <option value="before_or_equal">Раньше или равно</option>
                        <option value="equal">Равно</option>
                        <option value="after_or_equal">Позже или равно</option>
                        <option value="after">Позже</option>
                        <option value="range">Диапазон</option>
                      </select>
                      
                      {condition.operator === 'range' ? (
                        <>
                          <input
                            type="date"
                            value={condition.startDate || ''}
                            onChange={(e) => updateDateCondition(index, { 
                              startDate: e.target.value 
                            })}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'var(--tg-section-bg-color)',
                              color: 'var(--tg-text-color)',
                              fontSize: '14px'
                            }}
                          />
                          <input
                            type="date"
                            value={condition.endDate || ''}
                            onChange={(e) => updateDateCondition(index, { 
                              endDate: e.target.value 
                            })}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'var(--tg-section-bg-color)',
                              color: 'var(--tg-text-color)',
                              fontSize: '14px'
                            }}
                          />
                        </>
                      ) : (
                        <input
                          type="date"
                          value={condition.date || ''}
                          onChange={(e) => updateDateCondition(index, { 
                            date: e.target.value 
                          })}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'var(--tg-section-bg-color)',
                            color: 'var(--tg-text-color)',
                            fontSize: '14px'
                          }}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => removeDateCondition(index)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--tg-hint-color)',
                        cursor: 'pointer',
                        padding: '8px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'var(--tg-hint-color)',
                      marginBottom: '8px'
                    }}>
                      Показать вопросы:
                    </label>
                    {renderQuestionSelector(
                      condition.showQuestions,
                      (ids) => updateDateCondition(index, { showQuestions: ids })
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addDateCondition}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--tg-section-separator-color)',
                  borderRadius: '6px',
                  color: 'var(--tg-text-color)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                Добавить условие
              </button>
            </div>
          )}

          {/* Подсказка */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'rgba(244, 109, 0, 0.1)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--tg-hint-color)',
            lineHeight: '1.5'
          }}>
            💡 Вопросы будут показываться участникам опроса только если условие выполнено. Это поможет сократить время прохождения опроса.
          </div>
        </div>
      )}
    </div>
  );
};

