
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UploadZone } from './UploadZone';
import { Button } from './Button';
import { generateImagePrompt } from '../services/geminiService';
import { AppState, ErrorState, HistoryItem, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface AnalyzeViewProps {
  onAddToHistory: (item: HistoryItem) => void;
  initialPrompt?: string;
  onViewImage: (url: string) => void;
  onSendToTxt2Img: (prompt: string) => void;
  language: Language;
}

interface AnalyzedRecord {
  id: string;
  file: File | null;
  imageUrl: string;
  prompt: string;
  timestamp: number;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ 
  onAddToHistory, 
  initialPrompt, 
  onViewImage,
  onSendToTxt2Img,
  language
}) => {
  const t = TRANSLATIONS[language].analyze;
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'ENGLISH' | 'CHINESE'>('ENGLISH');
  const [isDragging, setIsDragging] = useState(false);
  const [includeCopywriting, setIncludeCopywriting] = useState(false); 
  
  // Gallery State
  const [gallery, setGallery] = useState<AnalyzedRecord[]>([]);

  const resultRef = useRef<HTMLDivElement>(null);

  // Handle initial prompt from shared URL
  useEffect(() => {
    if (initialPrompt && appState === AppState.IDLE) {
      setGeneratedPrompt(initialPrompt);
      setAppState(AppState.SUCCESS);
      setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [initialPrompt]);

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

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAppState(AppState.IDLE);
    setGeneratedPrompt("");
    setError(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFileSelect(file);
      }
    }
  }, []);

  // Core analysis logic extracted for reuse
  const performAnalysis = async (file: File, useCopywriting: boolean) => {
    if (!previewUrl) return;
    setAppState(AppState.ANALYZING);
    setError(null);

    try {
      const prompt = await generateImagePrompt(file, useCopywriting);
      setGeneratedPrompt(prompt);
      setAppState(AppState.SUCCESS);
      
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        prompt: prompt
      };
      
      onAddToHistory(newItem);

      // Add to local gallery
      setGallery(prev => [{
        id: newItem.id,
        file: file,
        imageUrl: previewUrl,
        prompt: prompt,
        timestamp: Date.now()
      }, ...prev]);
      
      // Auto-scroll logic slightly delayed to ensure DOM render
      setTimeout(() => {
        // Only scroll if we are not already near the result (improves UX on toggle)
        const resultEl = resultRef.current;
        if (resultEl) {
           const rect = resultEl.getBoundingClientRect();
           if (rect.top > window.innerHeight) {
              resultEl.scrollIntoView({ behavior: 'smooth' });
           }
        }
      }, 100);
    } catch (err: any) {
      setAppState(AppState.ERROR);
      setError({ message: err.message || "Failed to analyze image." });
    }
  };

  // Initial Analysis Button Click
  const handleAnalyzeClick = () => {
    if (selectedFile) {
      performAnalysis(selectedFile, includeCopywriting);
    }
  };

  // Toggle Switch Handler - Only updates state, DOES NOT auto-analyze
  const handleToggleCopywriting = () => {
    setIncludeCopywriting(!includeCopywriting);
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
  };

  const handleTransfer = () => {
      const promptToTransfer = activeTab === 'ENGLISH' 
        ? parsedContent.english 
        : (parsedContent.chinese || parsedContent.english);
        
      onSendToTxt2Img(promptToTransfer);
  };

  const handleRestoreFromGallery = (record: AnalyzedRecord) => {
    setSelectedFile(record.file);
    setPreviewUrl(record.imageUrl);
    setGeneratedPrompt(record.prompt);
    setAppState(AppState.SUCCESS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteFromGallery = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setGallery(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {appState === AppState.IDLE && !selectedFile && (
        <div className="text-center mb-8 max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
            {t.title}
          </h2>
          <p className="text-slate-400 text-lg">
            {t.subtitle}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-7xl mx-auto">
        
        {/* Left Column: Image Input */}
        <div className={`transition-all duration-500 ${selectedFile || appState === AppState.SUCCESS ? 'col-span-1 lg:sticky lg:top-28' : 'col-span-1 lg:col-span-2 lg:max-w-xl lg:mx-auto'}`}>
            {!selectedFile ? (
               appState === AppState.SUCCESS ? (
                  // Placeholder when in success state but somehow file is gone (rare edge case or specific flow)
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-64 shadow-xl">
                      <Button variant="secondary" onClick={handleReset}>{t.changeImage}</Button>
                  </div>
               ) : (
                 <UploadZone onFileSelect={handleFileSelect} language={language} />
               )
            ) : (
              <div className="flex flex-col gap-4">
                {/* Image Container with Drag & Drop */}
                <div 
                  className={`relative rounded-2xl overflow-hidden border bg-slate-900 shadow-2xl group transition-all duration-300 ${isDragging ? 'border-cyan-500 ring-2 ring-cyan-500/50 scale-[1.01]' : 'border-slate-700'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                   {/* Drag Overlay */}
                   {isDragging && (
                      <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center m-2 rounded-xl border-2 border-dashed border-cyan-500 pointer-events-none">
                         <div className="flex flex-col items-center text-cyan-400 font-mono animate-bounce">
                             <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                             <span className="font-bold tracking-wider">{t.dropToReplace}</span>
                         </div>
                      </div>
                   )}

                   {appState === AppState.ANALYZING && (
                    <div className="absolute inset-0 z-10 pointer-events-none bg-cyan-500/10">
                      <div className="w-full h-1 bg-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-scan"></div>
                    </div>
                  )}
                  
                  <img 
                    src={previewUrl!} 
                    alt="Target" 
                    className="w-full h-auto object-cover max-h-[60vh] cursor-pointer" 
                    onClick={() => onViewImage(previewUrl!)}
                  />
                  
                  {/* Internal Controls Overlay (Change Image Button Only) */}
                   <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="secondary" onClick={handleReset} disabled={appState === AppState.ANALYZING} className="text-xs py-1 px-3 h-8 shadow-lg !bg-slate-900/80 backdrop-blur">
                        {t.changeImage}
                      </Button>
                   </div>
                </div>

                {/* Control Bar Below Image */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg animate-in fade-in slide-in-from-top-2">
                   {/* Copywriting Toggle */}
                   <button 
                      onClick={handleToggleCopywriting}
                      disabled={appState === AppState.ANALYZING}
                      className={`
                         flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-300 w-full sm:w-auto
                         ${includeCopywriting 
                           ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400' 
                           : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}
                         ${appState === AppState.ANALYZING ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                   >
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${includeCopywriting ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                         <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-300 ${includeCopywriting ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs font-mono font-bold tracking-wide">
                        {includeCopywriting ? t.copywritingOn : t.copywritingOff}
                      </span>
                   </button>

                   {/* Analyze Button */}
                   {appState === AppState.ANALYZING ? (
                     <div className="text-xs font-mono text-cyan-500 animate-pulse px-4">
                       {t.analyzingText}
                     </div>
                   ) : (
                     <Button onClick={handleAnalyzeClick} className="w-full sm:w-auto shadow-cyan-500/20">
                       {appState === AppState.SUCCESS ? "RE-ANALYZE" : (appState === AppState.ERROR ? t.retry : t.initSequence)}
                     </Button>
                   )}
                </div>

                {appState === AppState.ERROR && error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono text-center">{error.message}</div>
                )}
              </div>
            )}
        </div>

        {/* Right Column: Results */}
        {(appState === AppState.ANALYZING || appState === AppState.SUCCESS) && (
            <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
               <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 lg:p-8 shadow-2xl relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 relative z-10 gap-4 sm:gap-0">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-xl font-bold text-cyan-400 font-mono flex items-center gap-2">
                           <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                           {t.generatedPrompt}
                        </h3>
                        {parsedContent.chinese && (
                            <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
                                <button onClick={() => setActiveTab('ENGLISH')} className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${activeTab === 'ENGLISH' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>EN</button>
                                <button onClick={() => setActiveTab('CHINESE')} className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${activeTab === 'CHINESE' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>CN</button>
                            </div>
                        )}
                    </div>
                    {appState === AppState.SUCCESS && (
                      <div className="flex space-x-2">
                         <button onClick={handleShare} className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:text-white">
                            <span>{shareFeedback ? 'Copied' : 'Share'}</span>
                         </button>
                         <button onClick={() => handleCopy(activeTab === 'ENGLISH' ? parsedContent.english : (parsedContent.chinese || parsedContent.english))} className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:text-white">
                           <span>{copyFeedback ? 'Copied' : 'Copy'}</span>
                         </button>
                      </div>
                    )}
                  </div>

                  {appState === AppState.ANALYZING ? (
                     <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center space-x-3 text-cyan-500/70 text-sm font-mono">
                           <span className="animate-spin">⟳</span><span>{t.analyzingText}</span>
                        </div>
                     </div>
                  ) : (
                    <div className="relative z-10">
                      <div className="prose prose-invert max-w-none mb-6">
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-sm lg:text-base border-l-2 border-cyan-500/50 pl-4 py-1">{activeTab === 'ENGLISH' ? parsedContent.english : parsedContent.chinese}</p>
                      </div>
                      
                      <div className="border-t border-slate-800 pt-6">
                        <Button onClick={handleTransfer} className="w-full flex items-center justify-center space-x-2">
                            <span>{t.importToTxt2Img}</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </Button>
                      </div>
                    </div>
                  )}
               </div>
            </div>
        )}
      </div>

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <div className="mt-16 pt-8 border-t border-slate-800 max-w-7xl mx-auto">
            <h3 className="text-lg font-mono text-slate-400 mb-6 flex items-center">
               <span className="w-2 h-2 bg-slate-600 rounded-full mr-3"></span>
               {t.sessionGallery} ({gallery.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
               {gallery.map((item) => (
                  <div 
                    key={item.id} 
                    className="relative group bg-slate-900 border border-slate-800 rounded-lg overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-900/20"
                    onClick={() => handleRestoreFromGallery(item)}
                  >
                     <div className="aspect-square relative">
                        <img src={item.imageUrl} alt="Gallery" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                             <span className="text-white text-xs font-mono px-2 py-1 bg-slate-900/80 rounded border border-slate-600">{t.restore}</span>
                        </div>
                     </div>
                     <div className="p-2">
                        <p className="text-[10px] text-slate-500 font-mono truncate">{new Date(item.timestamp).toLocaleTimeString()}</p>
                     </div>
                     <button 
                       onClick={(e) => handleDeleteFromGallery(e, item.id)}
                       className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                       title="Remove"
                     >
                       <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                  </div>
               ))}
            </div>
        </div>
      )}
    </div>
  );
};
