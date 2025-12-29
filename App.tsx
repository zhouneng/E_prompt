
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/TabNavigation';
import { HistoryPanel } from './components/HistoryPanel';
import { AnalyzeView } from './components/AnalyzeView';
import { TextToImageView } from './components/TextToImageView';
import { ImageToImageView } from './components/ImageToImageView';
import { PresetView } from './components/PresetView';
import { ReferenceToImageView } from './components/ReferenceToImageView';
import { RunningHubView } from './components/RunningHubView';
import { EcommerceKVView } from './components/EcommerceKVView';
import { SettingsModal } from './components/SettingsModal';
import { Button } from './components/Button';
import { HistoryItem, Language, LightboxItem } from './types';
import { addMetadataToBase64Image } from './utils/imageUtils';

interface LightboxState {
  items: LightboxItem[];
  currentIndex: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('ANALYZE');
  const [language, setLanguage] = useState<Language>('CN'); 
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    setLightboxData(null);
  };

  const currentItem = lightboxData ? lightboxData.items[lightboxData.currentIndex] : null;

  const downloadImage = async (withPrompt: boolean) => {
    if (!currentItem) return;
    let finalUrl = currentItem.url;
    let filename = `generated-${Date.now()}`;
    if (withPrompt && currentItem.prompt) {
      try {
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
    return { en: text, cn: text };
  }, [currentItem?.prompt]);

  const showTabs = parsedPrompt.en !== parsedPrompt.cn;

  return (
    <div className="flex h-screen bg-[#fcfcfc] font-sans text-gray-800 overflow-hidden">
      
      {/* Sidebar - Fixed Left */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        language={language}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
         <Header 
            onToggleHistory={() => setIsHistoryOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            language={language}
            onSetLanguage={setLanguage}
         />

         <main className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
            <div className={activeTab === 'ANALYZE' ? 'block h-full' : 'hidden'}>
                <AnalyzeView 
                    onAddToHistory={handleAddToHistory} 
                    initialPrompt={initialPrompt} 
                    onViewImage={(items, index) => setLightboxData({ items, currentIndex: index })}
                    onSendToTxt2Img={(p) => { setTransferredPrompt(p); setActiveTab('RUNNINGHUB'); }}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    language={language}
                />
            </div>
            
            <div className={activeTab === 'ECOMMERCE' ? 'block h-full' : 'hidden'}>
                <EcommerceKVView 
                    onViewImage={(items, index) => setLightboxData({ items, currentIndex: index })}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    language={language}
                />
            </div>

            <div className={activeTab === 'RUNNINGHUB' ? 'block h-full' : 'hidden'}>
                <RunningHubView 
                    onViewImage={(items, index) => setLightboxData({ items, currentIndex: index })}
                    initialPrompt={transferredPrompt}
                    language={language}
                />
            </div>

            <div className={activeTab === 'TXT2IMG' ? 'block h-full' : 'hidden'}>
                <TextToImageView 
                  onViewImage={(items, index) => setLightboxData({ items, currentIndex: index })} 
                  initialPrompt={transferredPrompt}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  language={language}
                />
            </div>

            <div className={activeTab === 'REF2IMG' ? 'block h-full' : 'hidden'}>
                <ReferenceToImageView 
                  onViewImage={(items, index) => setLightboxData({ items, currentIndex: index })} 
                  language={language}
                />
            </div>

            <div className={activeTab === 'IMG2IMG' ? 'block h-full' : 'hidden'}>
                <ImageToImageView 
                  onViewImage={(items, index) => setLightboxData({ items, currentIndex: index })} 
                  language={language}
                />
            </div>

            <div className={activeTab === 'PRESETS' ? 'block h-full' : 'hidden'}>
                <PresetView 
                   onViewImage={(items, index) => setLightboxData({ items, currentIndex: index })} 
                   language={language}
                />
            </div>
         </main>
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
      />

      {/* Lightbox Modal */}
      {lightboxData && currentItem && (
          <div 
            className="fixed inset-0 z-[60] bg-white/30 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setLightboxData(null)}
          >
             <button className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-white text-gray-500 hover:text-gray-900 transition-all z-50 shadow-sm" onClick={() => setLightboxData(null)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>

             {lightboxData.items.length > 1 && (
               <>
                 <button onClick={handlePrev} disabled={lightboxData.currentIndex === 0} className="absolute left-6 top-1/2 -translate-y-1/2 p-4 text-gray-400 hover:text-gray-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all z-50 hover:bg-white/50 rounded-full">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                 </button>
                 <button onClick={handleNext} disabled={lightboxData.currentIndex === lightboxData.items.length - 1} className="absolute right-6 top-1/2 -translate-y-1/2 p-4 text-gray-400 hover:text-gray-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all z-50 hover:bg-white/50 rounded-full">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                 </button>
               </>
             )}
             
             <div className="flex flex-col lg:flex-row bg-white rounded-3xl shadow-2xl overflow-hidden max-w-[1400px] w-full h-[85vh] border border-gray-100" onClick={(e) => e.stopPropagation()}>
               <div className="flex-1 bg-gray-50/50 flex items-center justify-center p-8 relative group">
                  <div className="absolute inset-0 pattern-grid opacity-5 pointer-events-none"></div>
                  <img src={currentItem.url} alt="Generated" className="max-w-full max-h-full object-contain rounded-lg shadow-soft transition-transform duration-300 group-hover:scale-[1.01]" />
                  {lightboxData.items.length > 1 && (
                     <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur text-gray-500 font-mono text-xs px-4 py-1.5 rounded-full shadow-sm border border-gray-100">{lightboxData.currentIndex + 1} / {lightboxData.items.length}</div>
                  )}
               </div>
               <div className="w-full lg:w-[420px] bg-white flex flex-col border-l border-gray-100 relative">
                  <div className="p-6 border-b border-gray-50">
                     <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{currentItem.title || "Generated Artwork"}</h2>
                     <div className="flex flex-wrap gap-2 mb-4">
                        {currentItem.model && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-md font-bold uppercase tracking-wider">{currentItem.model}</span>}
                        {currentItem.ratio && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-md font-bold uppercase tracking-wider">{currentItem.ratio}</span>}
                         {currentItem.tags?.map(tag => <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-md font-bold uppercase tracking-wider">{tag}</span>)}
                     </div>
                     {currentItem.prompt && showTabs && (
                       <div className="flex bg-gray-100 rounded-lg p-1">
                          <button onClick={() => setLightboxTab('EN')} className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${lightboxTab === 'EN' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>EN</button>
                          <button onClick={() => setLightboxTab('CN')} className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${lightboxTab === 'CN' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>中文</button>
                       </div>
                     )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-white">
                      {currentItem.prompt ? <div className="text-gray-600 font-mono text-xs leading-relaxed whitespace-pre-wrap">{showTabs ? (lightboxTab === 'EN' ? parsedPrompt.en : parsedPrompt.cn) : currentItem.prompt}</div> : <div className="flex flex-col items-center justify-center h-full text-gray-300 italic text-sm"><span>No prompt data available</span></div>}
                  </div>
                  <div className="p-6 bg-white border-t border-gray-50 space-y-3">
                      <Button variant="secondary" onClick={() => currentItem.prompt && handleSendToTxt2Img(currentItem.prompt)} className="w-full h-11 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold flex items-center justify-center gap-2" disabled={!currentItem.prompt}>
                         <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                         Generate with this Prompt
                      </Button>
                      <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => downloadImage(false)} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Save Image</button>
                         <button onClick={() => downloadImage(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors" title="Embeds prompt in PNG"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>Save + Meta</button>
                      </div>
                  </div>
               </div>
             </div>
          </div>
      )}
    </div>
  );
}

export default App;
