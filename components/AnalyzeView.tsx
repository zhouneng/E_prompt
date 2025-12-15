
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
  const [activeTab, setActiveTab] = useState<'ENGLISH' | 'CHINESE'>('ENGLISH');
  const [includeCopywriting, setIncludeCopywriting] = useState(false); 
  const [isDragging, setIsDragging] = useState(false);
  
  const [gallery, setGallery] = useState<AnalyzedRecord[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

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

      setGallery(prev => [{
        id: newItem.id,
        file: file,
        imageUrl: previewUrl,
        prompt: prompt,
        timestamp: Date.now()
      }, ...prev]);
      
      setTimeout(() => {
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

  const handleAnalyzeClick = () => {
    if (selectedFile) {
      performAnalysis(selectedFile, includeCopywriting);
    }
  };

  const handleTransfer = () => {
      const promptToTransfer = activeTab === 'ENGLISH' 
        ? parsedContent.english 
        : (parsedContent.chinese || parsedContent.english);
        
      onSendToTxt2Img(promptToTransfer);
  };

  // --- Drag & Drop for Replacement ---
  const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
              handleFileSelect(file);
          }
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {appState === AppState.IDLE && !selectedFile && (
        <div className="text-center mb-8 max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-bold text-gray-800">
            {t.title}
          </h2>
          <p className="text-gray-500 text-lg">
            {t.subtitle}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className={`transition-all duration-500 w-full`}>
            {!selectedFile ? (
               appState === AppState.SUCCESS ? (
                  <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center flex flex-col items-center justify-center h-64 shadow-soft">
                      <Button variant="secondary" onClick={() => { setSelectedFile(null); setPreviewUrl(null); setAppState(AppState.IDLE); }}>{t.changeImage}</Button>
                  </div>
               ) : (
                 <UploadZone onFileSelect={handleFileSelect} language={language} />
               )
            ) : (
              <div className="flex flex-col gap-4">
                <div 
                    className={`bg-white p-2 rounded-3xl shadow-soft border transition-all relative ${isDragging ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-100'}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                  <div className="relative rounded-2xl overflow-hidden bg-gray-50">
                     <div className="w-full bg-gray-50 flex justify-center">
                        <img 
                          src={previewUrl!} 
                          alt="Target" 
                          className="max-w-full max-h-[60vh] object-contain cursor-pointer" 
                          onClick={() => onViewImage(previewUrl!)}
                        />
                     </div>
                     {isDragging && (
                        <div className="absolute inset-0 bg-primary-500/20 z-10 flex items-center justify-center backdrop-blur-sm pointer-events-none">
                           <p className="text-white font-bold text-lg drop-shadow-md">{t.dropToReplace || "Drop to Replace"}</p>
                        </div>
                     )}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-soft">
                   <button 
                      onClick={() => setIncludeCopywriting(!includeCopywriting)}
                      disabled={appState === AppState.ANALYZING}
                      className={`
                         flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-300 w-full sm:w-auto font-medium text-sm
                         ${includeCopywriting 
                           ? 'bg-primary-50 border-primary-200 text-primary-600' 
                           : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}
                      `}
                   >
                      {t.copywriting}: {includeCopywriting ? 'ON' : 'OFF'}
                   </button>

                   {appState === AppState.ANALYZING ? (
                     <div className="text-sm font-bold text-primary-500 animate-pulse px-4">
                       ANALYZING...
                     </div>
                   ) : (
                     <Button onClick={handleAnalyzeClick} className="w-full sm:w-auto">
                       {appState === AppState.SUCCESS ? "RE-ANALYZE" : (appState === AppState.ERROR ? t.retry : t.initSequence)}
                     </Button>
                   )}
                </div>

                {appState === AppState.ERROR && error && (
                  <div className="p-4 rounded-xl bg-red-50 text-red-500 text-sm font-medium text-center border border-red-100">{error.message}</div>
                )}
              </div>
            )}
        </div>

        {(appState === AppState.ANALYZING || appState === AppState.SUCCESS) && (
            <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
               <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-soft relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 relative z-10 gap-4 sm:gap-0">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                           <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                           {t.generatedPrompt}
                        </h3>
                        {parsedContent.chinese && (
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button onClick={() => setActiveTab('ENGLISH')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'ENGLISH' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>EN</button>
                                <button onClick={() => setActiveTab('CHINESE')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'CHINESE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>CN</button>
                            </div>
                        )}
                    </div>
                  </div>

                  {appState === AppState.ANALYZING ? (
                     <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                     </div>
                  ) : (
                    <div className="relative z-10">
                      <div className="prose max-w-none mb-8">
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm lg:text-base">{activeTab === 'ENGLISH' ? parsedContent.english : parsedContent.chinese}</p>
                      </div>
                      
                      <Button onClick={handleTransfer} className="w-full flex items-center justify-center space-x-2">
                            <span>{t.importToTxt2Img}</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </Button>
                    </div>
                  )}
               </div>
            </div>
        )}
      </div>
    </div>
  );
};
