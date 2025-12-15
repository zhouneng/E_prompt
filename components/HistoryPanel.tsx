import React from 'react';
import { HistoryItem } from '../types';
import { Button } from './Button';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onCopy: (text: string) => void;
  onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  history,
  onCopy,
  onClear
}) => {
  return (
    <>
       {/* Backdrop */}
       <div 
         className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
         onClick={onClose}
       />
       
       {/* Panel */}
       <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-900/95">
              <h2 className="text-xl font-bold text-slate-100 font-mono">
                <span className="text-cyan-500 mr-2">LOGS</span>
                ARCHIVE
              </h2>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {history.length === 0 ? (
                <div className="text-center text-slate-600 py-12 font-mono text-sm">
                  NO RECORDS FOUND
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 group hover:border-cyan-500/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-mono text-cyan-500/70">
                         {new Date(item.timestamp).toLocaleString()}
                       </span>
                       <button 
                         onClick={() => onCopy(item.prompt)}
                         className="text-xs bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white px-2 py-1 rounded transition-colors"
                       >
                         COPY
                       </button>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-4 font-mono leading-relaxed whitespace-pre-wrap">
                      {item.prompt.substring(0, 200)}...
                    </p>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="p-6 border-t border-slate-700 bg-slate-900">
                <Button variant="secondary" onClick={onClear} className="w-full text-sm">
                  Clear Archives
                </Button>
              </div>
            )}
          </div>
       </div>
    </>
  );
};