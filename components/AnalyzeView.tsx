import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadZone } from './UploadZone';
import { Button } from './Button';
import { generateImagePrompt, generateImagesFromPrompt } from '../services/geminiService';
import { AppState, ErrorState, HistoryItem } from '../types';

interface AnalyzeViewProps {
  onAddToHistory: (item: HistoryItem) => void;
  initialPrompt?: string;
  onViewImage: (url: string) => void;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ onAddToHistory, initialPrompt, onViewImage }) => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'ENGLISH' | 'CHINESE'>('ENGLISH');
  const resultRef = useRef<HTMLDivElement>(null);

  // Image Gen State
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [imageCount, setImageCount] = useState<number>(1);
  const [genImageError, setGenImageError] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
    setGeneratedImages([]);
    setError(null);
    setGenImageError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAppState(AppState.ANALYZING);
    setError(null);

    try {
      const prompt = await generateImagePrompt(selectedFile);
      setGeneratedPrompt(prompt);
      setAppState(AppState.SUCCESS);
      
      onAddToHistory({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        prompt: prompt
      });
      
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setAppState(AppState.ERROR);
      setError({ message: err.message || "Failed to analyze image." });
    }
  };

  const handleGenerateImages = async () => {
    if (!parsedContent.english) return;
    setIsGeneratingImage(true);
    setGenImageError(null);
    setGeneratedImages([]);
    
    try {
        const imageUrls = await generateImagesFromPrompt(parsedContent.english, imageCount);
        setGeneratedImages(imageUrls);
    } catch (e: any) {
        setGenImageError("Failed to generate images.");
    } finally {
        setIsGeneratingImage(false);
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
    setGeneratedImages([]);
    setGenImageError(null);
    setError(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {appState === AppState.IDLE && !selectedFile && (
        <div className="text-center mb-8 max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
            Decode The Visual Matrix
          </h2>
          <p className="text-slate-400 text-lg">
            Upload any image to reverse-engineer its DNA. We analyze lighting, composition, texture, and mood to generate the ultimate prompt.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-7xl mx-auto">
        <div className={`transition-all duration-500 ${selectedFile || appState === AppState.SUCCESS ? 'col-span-1 lg:sticky lg:top-28' : 'col-span-1 lg:col-span-2 lg:max-w-xl lg:mx-auto'}`}>
            {!selectedFile ? (
               appState === AppState.SUCCESS ? (
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-64 shadow-xl">
                      <div className="p-4 rounded-full bg-slate-800 mb-4 border border-slate-700">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                      </div>
                      <h3 className="text-slate-200 font-medium mb-2">Analyzing Shared Prompt</h3>
                      <Button variant="secondary" onClick={handleReset}>Upload New Image</Button>
                  </div>
               ) : (
                 <UploadZone onFileSelect={handleFileSelect} />
               )
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
                 {appState === AppState.ANALYZING && (
                  <div className="absolute inset-0 z-10 pointer-events-none bg-cyan-500/10">
                    <div className="w-full h-1 bg-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-scan"></div>
                  </div>
                )}
                <img src={previewUrl!} alt="Target" className="w-full h-auto object-cover max-h-[60vh]" />
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-900 to-transparent flex justify-between items-end">
                   <Button variant="secondary" onClick={handleReset} disabled={appState === AppState.ANALYZING} className="text-sm py-2">Change Image</Button>
                   {appState === AppState.IDLE && <Button onClick={handleAnalyze}>Init Sequence</Button>}
                   {appState === AppState.ERROR && <Button onClick={handleAnalyze}>Retry</Button>}
                </div>
              </div>
            )}
            {appState === AppState.ERROR && error && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">{error.message}</div>
            )}
        </div>

        {(appState === AppState.ANALYZING || appState === AppState.SUCCESS) && (
            <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
               <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 lg:p-8 shadow-2xl relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 relative z-10 gap-4 sm:gap-0">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-xl font-bold text-cyan-400 font-mono flex items-center gap-2">
                           <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                           GENERATED_PROMPT
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
                           <span className="animate-spin">⟳</span><span>ANALYZING_TOPOLOGY...</span>
                        </div>
                     </div>
                  ) : (
                    <div className="relative z-10">
                      <div className="prose prose-invert max-w-none mb-6">
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-sm lg:text-base border-l-2 border-cyan-500/50 pl-4 py-1">{activeTab === 'ENGLISH' ? parsedContent.english : parsedContent.chinese}</p>
                      </div>
                      
                      <div className="border-t border-slate-800 pt-6 flex flex-col gap-4">
                        {!isGeneratingImage && generatedImages.length === 0 && (
                             <div className="flex space-x-4 items-end">
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-500 font-mono">QUANTITY</label>
                                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                        {[1, 2, 3, 4].map(num => (
                                            <button key={num} onClick={() => setImageCount(num)} className={`px-3 py-1.5 text-sm font-mono rounded transition-all ${imageCount === num ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>{num}</button>
                                        ))}
                                    </div>
                                </div>
                                <Button onClick={handleGenerateImages} className="flex-grow">Generate Visual Preview ({imageCount})</Button>
                             </div>
                        )}
                        {isGeneratingImage && <Button disabled className="w-full">Generating {imageCount} Images...</Button>}
                        {generatedImages.length > 0 && (
                            <div className="flex justify-end">
                                <Button onClick={handleGenerateImages} variant="secondary" className="text-sm py-2 px-4">Regenerate ({imageCount})</Button>
                            </div>
                        )}
                      </div>
                    </div>
                  )}
               </div>

               {(isGeneratingImage || generatedImages.length > 0) && (
                   <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 lg:p-8 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <h3 className="text-lg font-bold text-slate-200 font-mono mb-6">VISUAL_PREVIEW</h3>
                       {isGeneratingImage ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {Array.from({length: imageCount}).map((_, i) => (
                                   <div key={i} className="aspect-video bg-slate-800 rounded-lg border border-slate-700 animate-pulse flex items-center justify-center">
                                     <p className="text-cyan-500 font-mono text-xs">RENDERING_{i+1}...</p>
                                   </div>
                               ))}
                           </div>
                       ) : genImageError ? (
                           <div className="p-4 bg-red-500/10 text-red-400 rounded-lg text-sm text-center">{genImageError}</div>
                       ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               {generatedImages.map((imgUrl, index) => (
                                   <div key={index} className="space-y-3 group cursor-pointer" onClick={() => onViewImage(imgUrl)}>
                                       <div className="rounded-lg overflow-hidden border border-slate-700 bg-black relative">
                                           <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors pointer-events-none z-10"></div>
                                           <img src={imgUrl} alt={`Generated Preview ${index + 1}`} className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500" />
                                       </div>
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>
               )}
            </div>
        )}
      </div>
    </div>
  );
};
