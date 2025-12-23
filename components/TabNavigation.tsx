
import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

export type TabType = 'ANALYZE' | 'TXT2IMG' | 'IMG2IMG' | 'PRESETS' | 'REF2IMG';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  language: Language;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, language }) => {
  const t = TRANSLATIONS[language].nav;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'ANALYZE', 
      label: t.reverse,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    },
    { 
      id: 'TXT2IMG', 
      label: t.txt2img,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
    {
      id: 'REF2IMG',
      label: t.ref2img,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
    },
    { 
      id: 'IMG2IMG', 
      label: t.img2img,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
    },
    {
      id: 'PRESETS',
      label: t.presets,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
  ];

  return (
    <div className="flex items-center space-x-2 border-b border-gray-200 pb-1 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center space-x-2 px-6 py-2 rounded-t-lg text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap
              ${activeTab === tab.id 
                ? 'border-primary-500 text-primary-600 bg-red-50/50' 
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
    </div>
  );
};
