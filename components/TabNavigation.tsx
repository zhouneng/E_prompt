
import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

export type TabType = 'ANALYZE' | 'TXT2IMG' | 'IMG2IMG' | 'PRESETS' | 'REF2IMG' | 'RUNNINGHUB';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  language: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, language }) => {
  const t = TRANSLATIONS[language].nav;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'ANALYZE', 
      label: t.reverse,
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    },
    {
      id: 'RUNNINGHUB',
      label: t.runninghub,
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    },
    { 
      id: 'TXT2IMG', 
      label: t.txt2img,
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
    {
      id: 'REF2IMG',
      label: t.ref2img,
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
    },
    { 
      id: 'IMG2IMG', 
      label: t.img2img,
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
    },
    {
      id: 'PRESETS',
      label: t.presets,
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
  ];

  return (
    <aside className="w-20 lg:w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col h-screen overflow-y-auto no-scrollbar transition-all duration-300 z-40">
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-center lg:justify-start px-0 lg:px-6 border-b border-gray-50/50">
            <div className="flex items-center gap-3">
                <div className="text-primary-600 bg-primary-50 p-2 rounded-xl">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                </div>
                <div className="hidden lg:block">
                    <h1 className="text-lg font-black text-gray-800 tracking-tighter leading-none">
                    EKKO
                    </h1>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">AIGC Toolbox</p>
                </div>
            </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-6 px-3 space-y-2">
            {tabs.map((tab) => (
            <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                w-full flex items-center gap-4 px-3 lg:px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative
                ${activeTab === tab.id 
                    ? 'bg-primary-50 text-primary-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                `}
                title={tab.label}
            >
                <div className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {tab.icon}
                </div>
                <span className="hidden lg:block">{tab.label}</span>
                
                {/* Active Indicator Strip */}
                {activeTab === tab.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary-500 rounded-r-full"></div>
                )}
            </button>
            ))}
        </div>

        {/* Footer / User */}
        <div className="p-4 border-t border-gray-50">
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-center lg:justify-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    U
                </div>
                <div className="hidden lg:block overflow-hidden">
                    <p className="text-xs font-bold text-gray-700 truncate">User Account</p>
                    <p className="text-[10px] text-gray-400 truncate">Pro Plan</p>
                </div>
            </div>
        </div>
    </aside>
  );
};
