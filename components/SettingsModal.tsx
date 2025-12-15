import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentKey
}) => {
  const [key, setKey] = useState(currentKey);

  useEffect(() => {
    setKey(currentKey);
  }, [currentKey, isOpen]);

  const handleSave = () => {
    onSave(key);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-slate-100 font-mono mb-6 flex items-center">
          <svg className="w-6 h-6 text-cyan-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          SYSTEM CONFIGURATION
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-mono text-slate-400 mb-2">GEMINI API KEY</label>
            <input 
              type="password" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-sm transition-colors"
            />
            <p className="mt-2 text-xs text-slate-500">
              Your key is stored locally in your browser and used only for API requests.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={onClose} className="px-4 py-2 text-sm">Cancel</Button>
            <Button onClick={handleSave} className="px-4 py-2 text-sm">Save Configuration</Button>
          </div>
        </div>
      </div>
    </div>
  );
};