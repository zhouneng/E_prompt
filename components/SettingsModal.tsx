
import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, baseUrl?: string) => void;
  currentKey: string;
}

const BASE_URL_PRESETS = [
  { label: 'Google Official (Default)', value: '' },
  { label: 'T8Star Proxy (ai.t8star.cn)', value: 'https://ai.t8star.cn' },
  { label: 'Custom URL...', value: 'custom' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentKey
}) => {
  const [key, setKey] = useState(currentKey);
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('gemini_base_url') || '');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    setKey(currentKey);
    const storedUrl = localStorage.getItem('gemini_base_url') || '';
    setBaseUrl(storedUrl);
    
    // Determine preset selection based on stored URL
    const match = BASE_URL_PRESETS.find(p => p.value === storedUrl);
    if (match) {
        setSelectedPreset(storedUrl);
    } else if (storedUrl) {
        setSelectedPreset('custom');
    } else {
        setSelectedPreset('');
    }
  }, [currentKey, isOpen]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setSelectedPreset(val);
      if (val !== 'custom') {
          setBaseUrl(val);
      } else {
          setBaseUrl(''); // Clear for custom entry or keep previous? Clearing is safer to force entry
      }
  };

  const handleSave = () => {
    // If the user enters a URL but forgets 'https://', add it for them
    let finalBaseUrl = baseUrl.trim();
    if (finalBaseUrl && !finalBaseUrl.startsWith('http')) {
        finalBaseUrl = 'https://' + finalBaseUrl;
    }
    // Remove trailing slash if present to avoid double slashes issues
    if (finalBaseUrl.endsWith('/')) {
        finalBaseUrl = finalBaseUrl.slice(0, -1);
    }

    localStorage.setItem('gemini_base_url', finalBaseUrl);
    onSave(key, finalBaseUrl);
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
        
        <div className="space-y-6">
          {/* API KEY Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">API KEY (令牌)</label>
            <input 
              type="password" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 font-mono text-sm transition-all"
            />
          </div>

          {/* Base URL Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">API BASE URL (代理地址)</label>
                <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded font-bold">OPTIONAL</span>
            </div>
            
            {/* Preset Selector */}
            <div className="relative mb-3">
                <select 
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 text-sm appearance-none cursor-pointer font-bold"
                >
                    {BASE_URL_PRESETS.map(preset => (
                        <option key={preset.label} value={preset.value}>{preset.label}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>

            {/* Custom Input (Visible if Custom selected or matching no preset) */}
            {selectedPreset === 'custom' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <input 
                    type="text" 
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="e.g. https://your-proxy.com"
                    className="w-full bg-white border border-primary-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 font-mono text-sm transition-all shadow-sm"
                    autoFocus
                    />
                </div>
            )}

            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              默认为 Google 官方地址。如需使用中转服务 (如 ai.t8star.cn)，请在上方选择或输入。<br/>
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-50">
            <Button variant="ghost" onClick={onClose} className="px-6">Cancel</Button>
            <Button onClick={handleSave} className="px-6">Save Settings</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
