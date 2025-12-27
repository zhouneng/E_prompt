
import React from 'react';
import { Language } from '../types';

export const Header: React.FC<{
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
}> = ({ onToggleHistory, onOpenSettings, language, onSetLanguage }) => {
  return (
    <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 border-b border-gray-100/80 px-6 h-16 flex items-center justify-end w-full">
        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-gray-100 rounded-full p-1">
            {(['EN', 'CN', 'RU'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onSetLanguage(lang)}
                className={`
                  px-3 py-1 text-[10px] font-bold rounded-full transition-all
                  ${language === lang 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                {lang}
              </button>
            ))}
          </div>

          <button 
            onClick={onToggleHistory}
            className="flex items-center space-x-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">HISTORY</span>
          </button>

          <button 
            onClick={onOpenSettings}
            className="flex items-center space-x-2 text-xs font-bold text-gray-800 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-full transition-colors"
          >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
    </header>
  );
};
