import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { Button } from './components/Button';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsModal } from './components/SettingsModal';
import { generateImagePrompt } from './services/geminiService';
import { AppState, ErrorState, HistoryItem } from './types';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'ENGLISH' | 'CHINESE'>('ENGLISH');
  const resultRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });

  // History State
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

  // Check for shared prompt in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPrompt = params.get('p');
    if (sharedPrompt) {
      try {
        const decoded = decodeURIComponent(sharedPrompt);
        setGeneratedPrompt(decoded);
        setAppState(AppState.SUCCESS);
        // Scroll to result after a short delay to ensure rendering
        setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      } catch (e) {
        console.error("Failed to decode shared prompt", e);
      }
    }
  }, []);

  useEffect(() => {
    // Cleanup preview URL to prevent memory leaks
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    localStorage.setItem('prompt_history', JSON.stringify(history));
  }, [history]);

  // Reset tab when new prompt is generated
  useEffect(() => {
    if (appState === AppState.SUCCESS) {
        setActiveTab('ENGLISH');
    }
  }, [appState]);

  const parsedContent = useMemo(() => {
    if (!generatedPrompt) return { english: '', chinese: null };
    
    const engMarker = '## English Prompt';
    const cnMarker = '## Chinese Prompt';
    
    if (generatedPrompt.includes(engMarker) && generatedPrompt.includes(cnMarker)) {
       const parts = generatedPrompt.split(cnMarker);
       const englishPart = parts[0].replace(engMarker, '').trim();
       const chinesePart = parts[1].trim();
       return { english: englishPart, chinese: chinesePart };
    }
    
    return { english: generatedPrompt, chinese: null };
  }, [generatedPrompt]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setError(null); // Clear potential missing key errors
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAppState(AppState.IDLE);
    setGeneratedPrompt("");
    setError(null);
    // Clear URL params on new file select
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    // Check API Key
    if (!apiKey) {
      setError({ message: "API Key required. Please configure it in Settings." });
      setIsSettingsOpen(true);
      return;
    }

    setAppState(AppState.ANALYZING);
    setError(null);

    try {
      const prompt = await generateImagePrompt(selectedFile, apiKey);
      setGeneratedPrompt(prompt);
      setAppState(AppState.SUCCESS);
      
      // Add to history
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        prompt: prompt
      };
      setHistory(prev => [newItem, ...prev]);
      
      // Smooth scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setAppState(AppState.ERROR);
      setError({ message: err.message || "Failed to analyze image. Please try again." });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleShare = () => {
    const params = new URLSearchParams();
    params.set('p', generatedPrompt);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    navigator.clipboard.writeText(url);
    setShareFeedback(true);
    setTimeout(() => setShareFeedback(false), 2000);
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setSelectedFile(null);
    setPreviewUrl(null);
    setGeneratedPrompt("");
    setError(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to delete all history?")) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header 
        onToggleHistory={() => setIsHistoryOpen(true)} 
        onOpenSettings={() => setIsSettingsOpen(true)}
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

      <main className="flex-grow container mx-auto px-4 py-8 lg:py-12">
        
        {/* Intro Text - Only show if idle and no shared prompt loaded */}
        {appState === AppState.IDLE && !selectedFile && (
          <div className="text-center mb-12 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
              Decode The Visual Matrix
            </h2>
            <p className="text-slate-400 text-lg">
              Upload any image to reverse-engineer its DNA. We analyze lighting, composition, texture, and mood to generate the ultimate prompt for Midjourney, DALL-E 3, and Stable Diffusion.
            </p>
          </div>
        )}

        {/* Upload & Preview Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-7xl mx-auto">
          
          {/* Left Column: Image Input */}
          <div className={`transition-all duration-500 ${selectedFile || appState === AppState.SUCCESS ? 'col-span-1 lg:sticky lg:top-28' : 'col-span-1 lg:col-span-2 lg:max-w-xl lg:mx-auto'}`}>
            {!selectedFile ? (
               // If we have a successful result (e.g. from share link) but no file, show a small "Upload New" placeholder or the upload zone
               appState === AppState.SUCCESS ? (
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-64 shadow-xl">
                      <div className="p-4 rounded-full bg-slate-800 mb-4">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                      </div>
                      <h3 className="text-slate-200 font-medium mb-2">Analyzing Shared Prompt</h3>
                      <p className="text-slate-500 text-sm mb-4">Upload a new image to start a fresh analysis.</p>
                      <Button variant="secondary" onClick={handleReset}>Upload New Image</Button>
                  </div>
               ) : (
                 <UploadZone onFileSelect={handleFileSelect} />
               )
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
                 {/* Scanning Overlay Effect */}
                 {appState === AppState.ANALYZING && (
                  <div className="absolute inset-0 z-10 pointer-events-none bg-cyan-500/10">
                    <div className="w-full h-1 bg-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-scan"></div>
                    <div className="absolute top-4 right-4 text-xs font-mono text-cyan-300 bg-slate-900/80 px-2 py-1 rounded border border-cyan-500/30">
                      SCANNING_VECTORS...
                    </div>
                  </div>
                )}
                
                <img 
                  src={previewUrl!} 
                  alt="Analysis Target" 
                  className="w-full h-auto object-cover max-h-[60vh]" 
                />
                
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-900 to-transparent flex justify-between items-end">
                   <Button 
                      variant="secondary" 
                      onClick={handleReset}
                      disabled={appState === AppState.ANALYZING}
                      className="text-sm py-2"
                   >
                     Change Image
                   </Button>
                   
                   {appState === AppState.IDLE && (
                      <Button onClick={handleAnalyze}>
                        Init Sequence
                      </Button>
                   )}
                   {appState === AppState.ERROR && (
                      <Button onClick={handleAnalyze}>
                        Retry
                      </Button>
                   )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {appState === AppState.ERROR && error && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error.message}</span>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          {(appState === AppState.ANALYZING || appState === AppState.SUCCESS) && (
            <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-16">
               <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 lg:p-8 shadow-2xl relative overflow-hidden group">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                     <svg className="w-32 h-32 text-cyan-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0L24 12L12 24L0 12L12 0Z" /></svg>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 relative z-10 gap-4 sm:gap-0">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-xl font-bold text-cyan-400 font-mono flex items-center gap-2">
                           <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                           GENERATED_PROMPT
                        </h3>
                        {parsedContent.chinese && (
                            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                <button
                                    onClick={() => setActiveTab('ENGLISH')}
                                    className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                                        activeTab === 'ENGLISH' 
                                        ? 'bg-cyan-600 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => setActiveTab('CHINESE')}
                                    className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                                        activeTab === 'CHINESE' 
                                        ? 'bg-cyan-600 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    CN
                                </button>
                            </div>
                        )}
                    </div>

                    {appState === AppState.SUCCESS && (
                      <div className="flex space-x-2">
                         <button 
                            onClick={handleShare}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              shareFeedback 
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                         >
                            {shareFeedback ? (
                                <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                <span>Link Copied</span>
                                </>
                            ) : (
                                <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                <span>Share</span>
                                </>
                            )}
                         </button>

                         <button 
                            onClick={() => handleCopy(activeTab === 'ENGLISH' ? parsedContent.english : (parsedContent.chinese || parsedContent.english))}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              copyFeedback 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                         >
                           {copyFeedback ? (
                             <>
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                               <span>Copy</span>
                             </>
                           ) : (
                             <>
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                               <span>Copy</span>
                             </>
                           )}
                         </button>
                      </div>
                    )}
                  </div>

                  {appState === AppState.ANALYZING ? (
                     <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-800 rounded w-4/5"></div>
                        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center space-x-3 text-cyan-500/70 text-sm font-mono">
                           <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           <span>ANALYZING_TOPOLOGY...</span>
                        </div>
                     </div>
                  ) : (
                    <div className="relative z-10">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-sm lg:text-base border-l-2 border-cyan-500/50 pl-4 py-1 animate-in fade-in duration-500 min-h-[100px]">
                          {activeTab === 'ENGLISH' ? parsedContent.english : parsedContent.chinese}
                        </p>
                      </div>
                      
                      <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500 font-mono">
                         <span>MODEL: GEMINI-2.5-FLASH</span>
                         <span>STATUS: COMPLETE</span>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center border-t border-slate-900/50">
        <p className="text-slate-600 text-xs font-mono tracking-[0.2em] hover:text-cyan-500/50 transition-colors cursor-default">
          CREATED BY EKKO
        </p>
      </footer>
    </div>
  );
}

export default App;