import { useState, useRef, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedTabs = ({ tabs, activeTab, onTabChange, className = '', style = {} }: AnimatedTabsProps) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    const activeTabElement = tabRefs.current[activeIndex];
    
    if (activeTabElement) {
      setIndicatorStyle({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth
      });
    }
  }, [activeTab, tabs]);

  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        backgroundColor: 'var(--tg-section-bg-color)',
        borderRadius: '12px',
        padding: '4px',
        position: 'relative',
        ...style
      }}
    >
      {/* Анимированный индикатор */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          height: 'calc(100% - 8px)',
          backgroundColor: 'var(--tab-active-bg)',
          borderRadius: '8px',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1
        }}
      />
      
      {/* Вкладки */}
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={el => tabRefs.current[index] = el}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === tab.id ? 'var(--tab-active-text)' : 'var(--tg-hint-color)',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            zIndex: 2
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
