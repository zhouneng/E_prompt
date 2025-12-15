import React from 'react';

export type TabType = 'ANALYZE' | 'TXT2IMG' | 'IMG2IMG';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'ANALYZE', 
      label: 'Reverse Engineer',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    },
    { 
      id: 'TXT2IMG', 
      label: 'Text to Image',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
    { 
      id: 'IMG2IMG', 
      label: 'Image to Image',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
    },
  ];

  return (
    <div className="flex justify-center p-4">
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300
              ${activeTab === tab.id 
                ? 'bg-slate-800 text-cyan-400 shadow-lg shadow-cyan-900/20 border border-slate-600' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
