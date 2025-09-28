import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface DateTimePickerProps {
  label: string;
  value?: string;
  timeValue?: string;
  onChange: (date: string, time?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showTime?: boolean;
  defaultText?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  timeValue,
  onChange,
  placeholder = "Не указана",
  disabled = false,
  showTime = true,
  defaultText
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return placeholder;
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '00:00';
    return timeStr;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    onChange(newDate, timeValue);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    onChange(value || '', newTime);
  };

  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().slice(0, 5);

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontSize: '16px',
        fontWeight: '500',
        marginBottom: '8px',
        color: 'var(--tg-text-color)'
      }}>
        {label}:
      </label>
      
      <div style={{
        display: 'flex',
        gap: '12px'
      }}>
        {/* Поле даты */}
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            onClick={() => !disabled && setIsDateOpen(!isDateOpen)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--tg-section-separator-color)',
              backgroundColor: disabled ? 'var(--tg-section-separator-color)' : 'var(--tg-section-bg-color)',
              color: disabled ? 'var(--tg-hint-color)' : (value ? 'var(--tg-text-color)' : 'var(--tg-hint-color)'),
              fontSize: '16px',
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left'
            }}
          >
            <span>{defaultText || (value ? formatDate(value) : placeholder)}</span>
            <Calendar size={18} />
          </button>
          
          {isDateOpen && !disabled && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              backgroundColor: 'var(--tg-section-bg-color)',
              border: '1px solid var(--tg-section-separator-color)',
              borderRadius: '8px',
              marginTop: '4px',
              padding: '8px'
            }}>
              <input
                type="date"
                value={value || currentDate}
                min={currentDate}
                onChange={handleDateChange}
                onBlur={() => setTimeout(() => setIsDateOpen(false), 200)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--tg-text-color)',
                  fontSize: '16px',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Поле времени - показываем только если есть дата */}
        {showTime && value && (
          <div style={{ width: '100px', position: 'relative' }}>
            <button
              onClick={() => !disabled && setIsTimeOpen(!isTimeOpen)}
              disabled={disabled}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--tg-section-separator-color)',
                backgroundColor: disabled ? 'var(--tg-section-separator-color)' : 'var(--tg-section-bg-color)',
                color: disabled ? 'var(--tg-hint-color)' : 'var(--tg-text-color)',
                fontSize: '16px',
                outline: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left'
              }}
            >
              <span>{formatTime(timeValue || currentTime)}</span>
              <Clock size={16} />
            </button>
            
            {isTimeOpen && !disabled && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: 'var(--tg-section-bg-color)',
                border: '1px solid var(--tg-section-separator-color)',
                borderRadius: '8px',
                marginTop: '4px',
                padding: '8px'
              }}>
                <input
                  type="time"
                  value={timeValue || currentTime}
                  onChange={handleTimeChange}
                  onBlur={() => setTimeout(() => setIsTimeOpen(false), 200)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--tg-text-color)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
