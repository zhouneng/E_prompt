
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
         className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
         onClick={onClose}
       />
       
       {/* Panel */}
       <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 font-sans">
                <span className="text-primary-500 mr-2">●</span>
                HISTORY
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
              {history.length === 0 ? (
                <div className="text-center text-gray-400 py-12 text-sm">
                  No records found.
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 group hover:border-primary-200 hover:shadow-sm transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-bold text-primary-400">
                         {new Date(item.timestamp).toLocaleString()}
                       </span>
                       <button 
                         onClick={() => onCopy(item.prompt)}
                         className="text-xs bg-gray-100 hover:bg-primary-500 text-gray-500 hover:text-white px-3 py-1 rounded-full transition-colors font-bold"
                       >
                         COPY
                       </button>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {item.prompt}
                    </p>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-white">
                <Button variant="secondary" onClick={onClear} className="w-full text-sm">
                  Clear All History
                </Button>
              </div>
            )}
          </div>
       </div>
    </>
  );
};
