
import React, { useState, useEffect } from 'react';
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

interface LightboxState {
  url: string;
  prompt?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('ANALYZE');
  const [language, setLanguage] = useState<Language>('CN'); // Default to Chinese as requested
  
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

  const downloadImage = async (withPrompt: boolean) => {
    if (!lightboxData) return;

    let finalUrl = lightboxData.url;
    let filename = `generated-${Date.now()}`;

    if (withPrompt && lightboxData.prompt) {
      try {
        // Embed prompt into PNG metadata
        finalUrl = await addMetadataToBase64Image(lightboxData.url, lightboxData.prompt);
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header 
        onToggleHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        language={language}
        onSetLanguage={setLanguage}
      />

      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        language={language}
      />

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

      <main className="flex-grow container mx-auto px-4 py-8">
        {/* 
          We use CSS display toggling ('hidden') instead of conditional rendering (&&).
          This ensures components stay mounted and preserve their state (images, inputs) 
          when the user switches tabs.
        */}
        <div className={activeTab === 'ANALYZE' ? 'block' : 'hidden'}>
            <AnalyzeView 
                onAddToHistory={handleAddToHistory} 
                initialPrompt={initialPrompt} 
                onViewImage={(url) => setLightboxData({ url })}
                onSendToTxt2Img={handleSendToTxt2Img}
                language={language}
            />
        </div>
        
        <div className={activeTab === 'TXT2IMG' ? 'block' : 'hidden'}>
            <TextToImageView 
              onViewImage={(url, prompt) => setLightboxData({ url, prompt })} 
              initialPrompt={transferredPrompt}
              language={language}
            />
        </div>

        <div className={activeTab === 'IMG2IMG' ? 'block' : 'hidden'}>
            <ImageToImageView 
              onViewImage={(url, prompt) => setLightboxData({ url, prompt })} 
              language={language}
            />
        </div>
      </main>

      {/* Lightbox Modal */}
      {lightboxData && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setLightboxData(null)}
          >
             <button className="absolute top-4 right-4 text-slate-400 hover:text-white" onClick={() => setLightboxData(null)}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             
             <div className="flex flex-col items-center max-w-7xl w-full" onClick={(e) => e.stopPropagation()}>
               <img 
                 src={lightboxData.url} 
                 alt="Full View" 
                 className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg border border-slate-700 mb-6" 
               />
               
               <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                   <Button 
                     variant="secondary"
                     onClick={() => downloadImage(false)}
                     className="flex items-center justify-center space-x-2"
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     <span>Download Image (Clean)</span>
                   </Button>
                   
                   <Button 
                     onClick={() => downloadImage(true)}
                     disabled={!lightboxData.prompt}
                     className="flex items-center justify-center space-x-2"
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                     <span>Download w/ Prompt</span>
                   </Button>
               </div>
               {lightboxData.prompt && (
                 <div className="mt-4 text-xs text-slate-500 font-mono max-w-2xl text-center truncate px-4">
                   Prompt: {lightboxData.prompt.substring(0, 100)}...
                 </div>
               )}
             </div>
          </div>
      )}

      <footer className="py-6 text-center border-t border-slate-900/50 bg-slate-950 mt-auto">
        <p className="text-slate-600 text-xs font-mono tracking-[0.2em]">CREATED BY EKKO</p>
      </footer>
    </div>
  );
}

export default App;
