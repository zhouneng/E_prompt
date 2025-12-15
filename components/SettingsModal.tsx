
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="w-2 h-6 bg-primary-500 rounded-full mr-3"></span>
          Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-2">GEMINI API KEY</label>
            <input 
              type="password" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your API key here..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 font-mono text-sm transition-all"
            />
            <p className="mt-2 text-xs text-gray-400">
              Key is stored locally in your browser.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 mt-8">
            <Button variant="ghost" onClick={onClose} className="px-6">Cancel</Button>
            <Button onClick={handleSave} className="px-6">Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
