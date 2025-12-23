
import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BASE_URL_PRESETS = [
  { label: 'Google Official (Default)', value: '' },
  { label: 'T8Star Proxy (ai.t8star.cn)', value: 'https://ai.t8star.cn' },
  { label: 'Custom URL...', value: 'custom' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [key, setKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('gemini_base_url') || '');
  const [rhKey, setRhKey] = useState(() => localStorage.getItem('runninghub_api_key') || '');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('gemini_api_key') || '';
      const storedUrl = localStorage.getItem('gemini_base_url') || '';
      const storedRhKey = localStorage.getItem('runninghub_api_key') || '';
      
      setKey(storedKey);
      setBaseUrl(storedUrl);
      setRhKey(storedRhKey);
      
      const match = BASE_URL_PRESETS.find(p => p.value === storedUrl);
      if (match) {
          setSelectedPreset(storedUrl);
      } else if (storedUrl) {
          setSelectedPreset('custom');
      } else {
          setSelectedPreset('');
      }
    }
  }, [isOpen]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setSelectedPreset(val);
      if (val !== 'custom') {
          setBaseUrl(val);
      }
  };

  const handleSave = () => {
    let finalBaseUrl = baseUrl.trim();
    if (finalBaseUrl && !finalBaseUrl.startsWith('http')) {
        finalBaseUrl = 'https://' + finalBaseUrl;
    }
    if (finalBaseUrl.endsWith('/')) {
        finalBaseUrl = finalBaseUrl.slice(0, -1);
    }

    localStorage.setItem('gemini_api_key', key.trim());
    localStorage.setItem('gemini_base_url', finalBaseUrl);
    localStorage.setItem('runninghub_api_key', rhKey.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100 overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <span className="w-2 h-6 bg-primary-500 rounded-full mr-3"></span>
            Global Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Gemini Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
              Gemini / Proxy Config
            </h3>
            
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Gemini API Key</label>
              <input 
                type="password" 
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100 font-mono text-sm transition-all"
              />
              <p className="text-[9px] text-gray-400 mt-1">Leave empty to use system default key.</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Base URL / Proxy</label>
              <div className="relative mb-2">
                  <select 
                      value={selectedPreset}
                      onChange={handlePresetChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm appearance-none cursor-pointer font-bold"
                  >
                      {BASE_URL_PRESETS.map(preset => <option key={preset.label} value={preset.value}>{preset.label}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
              {selectedPreset === 'custom' && (
                  <input 
                  type="text" 
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="e.g. https://your-proxy.com"
                  className="w-full bg-white border border-primary-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100 font-mono text-sm transition-all shadow-sm animate-in slide-in-from-top-2"
                  />
              )}
            </div>
          </div>

          {/* RunningHub Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              RunningHub API
            </h3>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">RH API Key</label>
              <input 
                type="password" 
                value={rhKey}
                onChange={(e) => setRhKey(e.target.value)}
                placeholder="RH_..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100 font-mono text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-50">
            <Button variant="ghost" onClick={onClose} className="px-6">Cancel</Button>
            <Button onClick={handleSave} className="px-6">Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
