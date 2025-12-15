
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { TabNavigation, TabType } from './components/TabNavigation';
import { HistoryPanel } from './components/HistoryPanel';
import { AnalyzeView } from './components/AnalyzeView';
import { TextToImageView } from './components/TextToImageView';
import { ImageToImageView } from './components/ImageToImageView';
import { SettingsModal } from './components/SettingsModal';
import { Button } from './components/Button';
import { HistoryItem, Language } from './types';
import { addMetadataToBase64Image } from './utils/imageUtils';
import { TRANSLATIONS } from './constants';

interface LightboxItem {
  url: string;
  prompt?: string;
}

interface LightboxState {
  items: LightboxItem[];
  currentIndex: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('ANALYZE');
  const [language, setLanguage] = useState<Language>('CN'); 
  const t = TRANSLATIONS[language].lightbox;
  
  // Settings / API Key State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('prompt_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  });

  // Prompt Passing State
  const [transferredPrompt, setTransferredPrompt] = useState<string>("");

  // Shared Prompt Logic (URL Params)
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPrompt = params.get('p');
    if (sharedPrompt) {
      try {
        setInitialPrompt(decodeURIComponent(sharedPrompt));
      } catch (e) {
        console.error("Failed to decode prompt", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('prompt_history', JSON.stringify(history));
  }, [history]);

  // Lightbox State
  const [lightboxData, setLightboxData] = useState<LightboxState | null>(null);
  const [lightboxTab, setLightboxTab] = useState<'EN' | 'CN'>('EN');

  // Navigation Logic
  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxData && lightboxData.currentIndex < lightboxData.items.length - 1) {
      setLightboxData({ ...lightboxData, currentIndex: lightboxData.currentIndex + 1 });
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxData && lightboxData.currentIndex > 0) {
      setLightboxData({ ...lightboxData, currentIndex: lightboxData.currentIndex - 1 });
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxData) return;
      
      switch(e.key) {
        case 'ArrowRight':
          if (lightboxData.currentIndex < lightboxData.items.length - 1) {
             setLightboxData(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null);
          }
          break;
        case 'ArrowLeft':
          if (lightboxData.currentIndex > 0) {
             setLightboxData(prev => prev ? { ...prev, currentIndex: prev.currentIndex - 1 } : null);
          }
          break;
        case 'Escape':
          setLightboxData(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxData]);

  const handleAddToHistory = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearHistory = () => {
    if (window.confirm("Delete all history?")) setHistory([]);
  };

  const handleSendToTxt2Img = (prompt: string) => {
    setTransferredPrompt(prompt);
    setActiveTab('TXT2IMG');
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const currentItem = lightboxData ? lightboxData.items[lightboxData.currentIndex] : null;

  const downloadImage = async (withPrompt: boolean) => {
    if (!currentItem) return;

    let finalUrl = currentItem.url;
    let filename = `generated-${Date.now()}`;

    if (withPrompt && currentItem.prompt) {
      try {
        // Embed prompt into PNG metadata
        finalUrl = await addMetadataToBase64Image(currentItem.url, currentItem.prompt);
        filename += '-with-prompt';
      } catch (e) {
        console.error("Failed to embed metadata", e);
        alert("Could not embed prompt metadata. Downloading raw image.");
      }
    }

    const link = document.createElement('a');
    link.href = finalUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to parse prompt for Lightbox
  const parsedPrompt = useMemo(() => {
    if (!currentItem?.prompt) return { en: '', cn: '' };
    const text = currentItem.prompt;
    const engMarker = '## English Prompt';
    const cnMarker = '## Chinese Prompt';
    
    if (text.includes(engMarker) && text.includes(cnMarker)) {
        const parts = text.split(cnMarker);
        const en = parts[0].replace(engMarker, '').trim();
        const cn = parts[1].trim();
        return { en, cn };
    }
    // Fallback
    return { en: text, cn: text };
  }, [currentItem?.prompt]);

  const showTabs = parsedPrompt.en !== parsedPrompt.cn;

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans text-gray-800">
      <Header 
        onToggleHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        language={language}
        onSetLanguage={setLanguage}
      />

      <div className="container mx-auto px-4 sm:px-6 pt-6">
          <TabNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            language={language}
          />
      </div>

      <HistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onCopy={handleCopy}
        onClear={clearHistory}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveApiKey}
        currentKey={apiKey}
      />

      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
        <div className={activeTab === 'ANALYZE' ? 'block' : 'hidden'}>
            <AnalyzeView 
                onAddToHistory={handleAddToHistory} 
                initialPrompt={initialPrompt} 
                onViewImage={(url) => setLightboxData({ items: [{ url }], currentIndex: 0 })}
                onSendToTxt2Img={handleSendToTxt2Img}
                language={language}
            />
        </div>
        
        <div className={activeTab === 'TXT2IMG' ? 'block' : 'hidden'}>
            <TextToImageView 
              onViewImage={(index, items) => setLightboxData({ items, currentIndex: index })} 
              initialPrompt={transferredPrompt}
              language={language}
            />
        </div>

        <div className={activeTab === 'IMG2IMG' ? 'block' : 'hidden'}>
            <ImageToImageView 
              onViewImage={(index, items) => setLightboxData({ items, currentIndex: index })} 
              language={language}
            />
        </div>
      </main>

      {/* Lightbox Modal (Split View with Nav) */}
      {lightboxData && currentItem && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setLightboxData(null)}
          >
             {/* Close Button */}
             <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-50" onClick={() => setLightboxData(null)}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>

             {/* Navigation Buttons (Left/Right) */}
             {lightboxData.items.length > 1 && (
               <>
                 <button 
                   onClick={handlePrev}
                   disabled={lightboxData.currentIndex === 0}
                   className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all z-50 hover:bg-white/10 rounded-full"
                 >
                   <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                 </button>
                 <button 
                   onClick={handleNext}
                   disabled={lightboxData.currentIndex === lightboxData.items.length - 1}
                   className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all z-50 hover:bg-white/10 rounded-full"
                 >
                   <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                 </button>
               </>
             )}
             
             <div 
               className="flex flex-col lg:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden max-w-6xl w-full max-h-[90vh]" 
               onClick={(e) => e.stopPropagation()}
             >
               {/* Left: Image (Dark bg for contrast) */}
               <div className="flex-1 bg-black/5 flex items-center justify-center p-4 min-h-[400px] lg:min-h-0 relative">
                  <div className="absolute inset-0 pattern-grid opacity-10 pointer-events-none"></div>
                  <img 
                   src={currentItem.url} 
                   alt={`Generated ${lightboxData.currentIndex + 1}`} 
                   className="max-w-full max-h-full object-contain rounded shadow-sm" 
                  />
                  {/* Counter */}
                  {lightboxData.items.length > 1 && (
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md">
                        {lightboxData.currentIndex + 1} / {lightboxData.items.length}
                     </div>
                  )}
               </div>
               
               {/* Right: Prompt & Actions */}
               <div className="w-full lg:w-[400px] bg-white flex flex-col border-l border-gray-100">
                  <div className="p-6 border-b border-gray-100">
                     <h3 className="text-lg font-bold text-gray-800 mb-4">{t.promptTitle}</h3>
                     
                     {/* Toggle */}
                     {currentItem.prompt && showTabs && (
                       <div className="flex bg-gray-100 rounded-lg p-1 mb-2">
                          <button 
                            onClick={() => setLightboxTab('EN')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${lightboxTab === 'EN' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            English
                          </button>
                          <button 
                            onClick={() => setLightboxTab('CN')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${lightboxTab === 'CN' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            中文 (Chinese)
                          </button>
                       </div>
                     )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                      {currentItem.prompt ? (
                          <div className="prose prose-sm max-w-none text-gray-600 font-mono text-xs leading-relaxed">
                              {showTabs ? (
                                  lightboxTab === 'EN' ? parsedPrompt.en : parsedPrompt.cn
                              ) : (
                                  currentItem.prompt
                              )}
                          </div>
                      ) : (
                          <div className="text-gray-400 text-sm italic text-center mt-10">
                              No prompt data available for this image.
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-gray-100 space-y-3 bg-white">
                      <Button onClick={() => downloadImage(true)} className="w-full text-sm py-2 h-10" disabled={!currentItem.prompt}>
                          {t.downloadWithMeta}
                      </Button>
                      <Button variant="secondary" onClick={() => downloadImage(false)} className="w-full text-sm py-2 h-10">
                          {t.downloadImage}
                      </Button>
                  </div>
               </div>
             </div>
          </div>
      )}
    </div>
  );
}

export default App;
