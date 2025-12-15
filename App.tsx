import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TabNavigation, TabType } from './components/TabNavigation';
import { HistoryPanel } from './components/HistoryPanel';
import { AnalyzeView } from './components/AnalyzeView';
import { TextToImageView } from './components/TextToImageView';
import { ImageToImageView } from './components/ImageToImageView';
import { Button } from './components/Button';
import { HistoryItem } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('ANALYZE');
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

  // Shared Prompt Logic
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleAddToHistory = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearHistory = () => {
    if (window.confirm("Delete all history?")) setHistory([]);
  };

  const downloadImage = (url: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-${Date.now()}.png`;
      link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header onToggleHistory={() => setIsHistoryOpen(true)} />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <HistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onCopy={handleCopy}
        onClear={clearHistory}
      />

      <main className="flex-grow container mx-auto px-4 py-8">
        {activeTab === 'ANALYZE' && (
            <AnalyzeView 
                onAddToHistory={handleAddToHistory} 
                initialPrompt={initialPrompt} 
                onViewImage={setLightboxImage}
            />
        )}
        {activeTab === 'TXT2IMG' && (
            <TextToImageView onViewImage={setLightboxImage} />
        )}
        {activeTab === 'IMG2IMG' && (
            <ImageToImageView onViewImage={setLightboxImage} />
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setLightboxImage(null)}
          >
             <button className="absolute top-4 right-4 text-slate-400 hover:text-white" onClick={() => setLightboxImage(null)}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             <img src={lightboxImage} alt="Full View" className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg border border-slate-700" onClick={(e) => e.stopPropagation()} />
             <div className="absolute bottom-8 flex gap-4">
                 <Button onClick={(e) => { e.stopPropagation(); downloadImage(lightboxImage); }}>Download Image</Button>
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
