
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
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md p-6 sticky top-0 z-20 shadow-xl shadow-black/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-slate-100">{APP_TITLE}</h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">{APP_SUBTITLE}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
            {(['EN', 'CN', 'RU'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onSetLanguage(lang)}
                className={`
                  px-3 py-1 text-xs font-mono rounded transition-all
                  ${language === lang 
                    ? 'bg-slate-700 text-cyan-400 font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'}
                `}
              >
                {lang}
              </button>
            ))}
          </div>

          <button 
            onClick={onToggleHistory}
            className="flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-white transition-colors border border-slate-700 hover:border-cyan-500 px-3 py-1.5 rounded-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">HISTORY</span>
          </button>

          <button 
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors border border-slate-700 hover:border-cyan-500 rounded-lg"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full bg-cyan-500/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>SYSTEM ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  );
};
