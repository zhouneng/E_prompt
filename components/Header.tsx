
import React from 'react';
import { APP_TITLE, APP_SUBTITLE } from '../constants';
import { Language } from '../types';

interface HeaderProps {
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleHistory, onOpenSettings, language, onSetLanguage }) => {
  return (
    <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 border-b border-gray-100/80">
      <div className="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center space-x-3">
          {/* Pink Bird Icon Mock */}
          <div className="text-primary-600">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <span className="text-primary-600">图像反推工具箱</span>
              <span className="text-gray-300">|</span>
              <span className="text-primary-600">EKKO</span>
            </h1>
          </div>
        </div>
        
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
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
             <span>API Key</span>
          </button>
          
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          </div>
        </div>
      </div>
    </header>
  );
};
