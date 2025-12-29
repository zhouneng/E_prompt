
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadZone } from './UploadZone';
import { Button } from './Button';
import { generateImagePrompt, modifyPromptSubject, transferVisualFeatures, TransferOptions } from '../services/geminiService';
import { AppState, ErrorState, HistoryItem, Language, LightboxItem } from '../types';
import { TRANSLATIONS } from '../constants';

interface AnalyzeViewProps {
  onAddToHistory: (item: HistoryItem) => void;
  initialPrompt?: string;
  onViewImage: (items: LightboxItem[], index: number) => void;
  onSendToTxt2Img: (prompt: string) => void;
  onOpenSettings: () => void;
  language: Language;
}

interface PromptVersion {
  id: string;
  prompt: string;
  modifierType: 'ORIGINAL' | 'SUBJECT' | 'DNA_TRANSFER';
  modifierValue?: string;
  timestamp: number;
}

interface AnalyzedRecord {
  id: string;
  file: File | null;
  imageUrl: string;
  versions: PromptVersion[];
  currentVersionIndex: number;
  timestamp: number;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ 
  onAddToHistory, 
  initialPrompt, 
  onViewImage,
  onSendToTxt2Img,
  onOpenSettings,
  language
}) => {
  const t = TRANSLATIONS[language].analyze;
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  
  const [subjectModifier, setSubjectModifier] = useState("");
  const [isModifying, setIsModifying] = useState(false);

  const [refFile, setRefFile] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferOptions, setTransferOptions] = useState<TransferOptions>({
    character: true,
    clothing: true,
    accessories: false,
    shoes: false,
    product: false,
    background: false
  });
  
  const [activeTab, setActiveTab] = useState<'ENGLISH' | 'CHINESE'>('ENGLISH');
  const [includeCopywriting, setIncludeCopywriting] = useState(false); 
  const [isDraggingOverImage, setIsDraggingOverImage] = useState(false);
  const [isDraggingOverRef, setIsDraggingOverRef] = useState(false);
  const imageDragCounter = useRef(0);
  const refDragCounter = useRef(0);

  const [currentRecord, setCurrentRecord] = useState<AnalyzedRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPrompt && appState === AppState.IDLE) {
      const initialVersion: PromptVersion = { id: 'orig', prompt: initialPrompt, modifierType: 'ORIGINAL', timestamp: Date.now() };
      setCurrentRecord({
        id: crypto.randomUUID(),
        file: null,
        imageUrl: '',
        versions: [initialVersion],
        currentVersionIndex: 0,
        timestamp: Date.now()
      });
      setAppState(AppState.SUCCESS);
    }
  }, [initialPrompt]);

  const activeVersion = currentRecord?.versions[currentRecord.currentVersionIndex];
  const currentPrompt = activeVersion?.prompt || "";

  const parsedContent = useMemo(() => {
    if (!currentPrompt) return { english: '', chinese: null };
    const engMarker = '## English Prompt';
    const cnMarker = '## Chinese Prompt';
    if (currentPrompt.includes(engMarker) && currentPrompt.includes(cnMarker)) {
       const parts = currentPrompt.split(cnMarker);
       const englishPart = parts[0].replace(engMarker, '').trim();
       const chinesePart = parts[1].trim();
       return { english: englishPart, chinese: chinesePart };
    }
    return { english: currentPrompt, chinese: null };
  }, [currentPrompt]);

  const activePromptText = useMemo(() => {
    if (activeTab === 'ENGLISH') return parsedContent.english;
    return parsedContent.chinese || parsedContent.english;
  }, [activeTab, parsedContent]);

  const handleFileSelect = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setAppState(AppState.IDLE);
    setCurrentRecord(null);
    setError(null);
    setSubjectModifier("");
    setRefFile(null);
    setRefPreview(null);
    performAnalysis(file, includeCopywriting, url);
  };

  const handleRefFileSelect = (file: File) => {
    if (refPreview) URL.revokeObjectURL(refPreview);
    setRefFile(file);
    setRefPreview(URL.createObjectURL(file));
  };

  const performAnalysis = async (file: File, useCopywriting: boolean, customPreview?: string) => {
    const url = customPreview || previewUrl;
    if (!url) return;
    setAppState(AppState.ANALYZING);
    setError(null);
    try {
      const prompt = await generateImagePrompt(file, useCopywriting);
      const initialVersion: PromptVersion = { id: 'orig', prompt, modifierType: 'ORIGINAL', timestamp: Date.now() };
      const newRecord: AnalyzedRecord = {
        id: crypto.randomUUID(),
        file: file,
        imageUrl: url,
        versions: [initialVersion],
        currentVersionIndex: 0,
        timestamp: Date.now()
      };
      setCurrentRecord(newRecord);
      setAppState(AppState.SUCCESS);
      onAddToHistory({ id: newRecord.id, timestamp: Date.now(), prompt: prompt });
    } catch (err: any) {
      setAppState(AppState.ERROR);
      setError({ message: err.message || "Failed to analyze image." });
    }
  };

  const handleApplyModification = async () => {
    if (!currentRecord || !activeVersion || !subjectModifier.trim() || isModifying) return;
    setIsModifying(true);
    try {
      const basePrompt = activeVersion.prompt;
      const modifiedPrompt = await modifyPromptSubject(basePrompt, subjectModifier);
      const newVersion: PromptVersion = {
        id: crypto.randomUUID(),
        prompt: modifiedPrompt,
        modifierType: 'SUBJECT',
        modifierValue: subjectModifier,
        timestamp: Date.now()
      };
      setCurrentRecord(prev => prev ? ({
        ...prev,
        versions: [...prev.versions, newVersion],
        currentVersionIndex: prev.versions.length
      }) : null);
      setSubjectModifier(""); 
    } catch (err: any) {
      alert(err.message || "Modification failed.");
    } finally {
      setIsModifying(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!currentRecord || !activeVersion || !refFile || isTransferring) return;
    setIsTransferring(true);
    try {
      const basePrompt = activeVersion.prompt;
      const transferredPrompt = await transferVisualFeatures(basePrompt, refFile, transferOptions);
      const newVersion: PromptVersion = {
        id: crypto.randomUUID(),
        prompt: transferredPrompt,
        modifierType: 'DNA_TRANSFER',
        timestamp: Date.now()
      };
      setCurrentRecord(prev => prev ? ({
        ...prev,
        versions: [...prev.versions, newVersion],
        currentVersionIndex: prev.versions.length
      }) : null);
    } catch (err: any) {
      alert(err.message || "DNA Transfer failed.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleVersionSwitch = (index: number) => {
    if (!currentRecord) return;
    setCurrentRecord({ ...currentRecord, currentVersionIndex: index });
  };

  const toggleTransferOption = (key: keyof TransferOptions) => {
    setTransferOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  };

  const handleImageDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    imageDragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDraggingOverImage(true);
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    imageDragCounter.current--;
    if (imageDragCounter.current <= 0) { imageDragCounter.current = 0; setIsDraggingOverImage(false); }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingOverImage(false);
    imageDragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  };

  const handleRefDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    refDragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDraggingOverRef(true);
  };

  const handleRefDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    refDragCounter.current--;
    if (refDragCounter.current <= 0) { refDragCounter.current = 0; setIsDraggingOverRef(false); }
  };

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingOverRef(false);
    refDragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleRefFileSelect(file);
  };

  return (
    <div className="animate-in fade-in duration-500 h-full">
      {!selectedFile ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-8">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">{t.title}</h2>
              <p className="text-gray-500 text-lg font-medium">{t.subtitle}</p>
            </div>
            <div className="w-full max-w-xl">
               <UploadZone onFileSelect={handleFileSelect} language={language} />
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full items-start">
            <div className="xl:col-span-4 flex flex-col gap-6 sticky top-0">
               <div 
                  className={`bg-white p-2 rounded-[2.5rem] shadow-soft border transition-all duration-300 relative group overflow-hidden ${isDraggingOverImage ? 'border-primary-500 ring-4 ring-primary-100' : 'border-gray-100'}`}
                  onDragEnter={handleImageDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
               >
                  <div className="relative rounded-[2rem] overflow-hidden bg-gray-50 flex justify-center items-center h-[50vh] xl:h-[60vh]">
                    <img 
                      src={previewUrl!} 
                      alt="Target" 
                      className={`max-w-full max-h-full object-contain cursor-pointer transition-transform duration-500 ${isDraggingOverImage ? 'scale-95 opacity-50 grayscale' : 'scale-100'}`} 
                      onClick={() => onViewImage([{ url: previewUrl!, id: 'preview', prompt: activePromptText }], 0)} 
                    />
                    {isDraggingOverImage && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                         <div className="bg-white/90 backdrop-blur-md p-6 rounded-full shadow-2xl scale-110 mb-4">
                           <span className="text-4xl">📥</span>
                         </div>
                         <p className="text-lg font-black text-primary-600 tracking-tighter uppercase bg-white/80 px-4 py-1 rounded-full">{t.dropToReplace}</p>
                      </div>
                    )}
                    {!isDraggingOverImage && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {t.changeImage}
                      </button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" accept="image/*" />
                  </div>
               </div>

               <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-soft space-y-4">
                   <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                          <span className="text-lg">✨</span>
                          {t.copywriting}
                       </span>
                       <button 
                          onClick={() => setIncludeCopywriting(!includeCopywriting)} 
                          disabled={appState === AppState.ANALYZING}
                          className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${includeCopywriting ? 'bg-primary-500' : 'bg-gray-200'}`}
                       >
                          <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${includeCopywriting ? 'translate-x-5' : 'translate-x-0'}`}></div>
                       </button>
                   </div>
                   <Button 
                      onClick={() => performAnalysis(selectedFile!, includeCopywriting)} 
                      isLoading={appState === AppState.ANALYZING}
                      className="w-full h-12 rounded-xl text-sm font-bold shadow-glow"
                   >
                      {appState === AppState.ANALYZING ? t.analyzing : (appState === AppState.SUCCESS ? "RE-ANALYZE" : t.initSequence)}
                   </Button>
               </div>
            </div>

            <div className="xl:col-span-8 space-y-6 pb-20">
               {appState === AppState.ANALYZING ? (
                 <div className="space-y-6">
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-soft animate-pulse">
                        <div className="h-8 bg-gray-100 rounded-xl w-1/3 mb-6"></div>
                        <div className="space-y-3">
                           <div className="h-4 bg-gray-100 rounded-lg w-full"></div>
                           <div className="h-4 bg-gray-100 rounded-lg w-full"></div>
                           <div className="h-4 bg-gray-100 rounded-lg w-3/4"></div>
                        </div>
                    </div>
                 </div>
               ) : appState === AppState.ERROR ? (
                 <div className="bg-red-50/80 border border-red-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl font-black">!</div>
                    <div className="space-y-2 max-w-lg">
                       <h3 className="text-xl font-bold text-red-700">Analysis Failed</h3>
                       <p className="text-sm text-red-600 font-medium leading-relaxed">{error?.message}</p>
                    </div>
                    {error?.message?.includes("Quota") && (
                       <Button onClick={onOpenSettings} className="bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/30">
                          Open Settings to Set API Key
                       </Button>
                    )}
                    <button onClick={() => performAnalysis(selectedFile!, includeCopywriting)} className="text-red-500 text-xs font-bold hover:underline">Try Again</button>
                 </div>
               ) : currentRecord ? (
                 <div className="space-y-8 animate-in slide-in-from-right-8 duration-700">
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 lg:p-10 shadow-soft relative overflow-hidden">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-6">
                          <div className="flex items-center space-x-6">
                              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                                 {t.generatedPrompt}
                              </h3>
                              {parsedContent.chinese && (
                                  <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                                      <button onClick={() => setActiveTab('ENGLISH')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'ENGLISH' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>EN</button>
                                      <button onClick={() => setActiveTab('CHINESE')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'CHINESE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>中文</button>
                                  </div>
                              )}
                          </div>
                          
                          {currentRecord.versions.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[300px] pb-1">
                              {currentRecord.versions.map((v, i) => (
                                 <button 
                                   key={v.id} 
                                   onClick={() => handleVersionSwitch(i)}
                                   className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all shrink-0 flex items-center gap-2 ${currentRecord.currentVersionIndex === i ? 'bg-primary-600 border-primary-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                 >
                                   <span className="opacity-60">{v.modifierType === 'ORIGINAL' ? 'ORIG' : 'V'+i}</span>
                                   <span className="truncate max-w-[80px]">{v.modifierValue || (v.modifierType === 'DNA_TRANSFER' ? '🧬 DNA SWAP' : t.original)}</span>
                                 </button>
                              ))}
                            </div>
                          )}
                       </div>

                       <div className="bg-gray-50/50 rounded-3xl p-6 mb-8 border border-gray-100 ring-4 ring-primary-50/50">
                           <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm lg:text-base font-medium selection:bg-primary-500 selection:text-white">
                             {activePromptText}
                           </p>
                           <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                              <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Base version: </span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{activeVersion?.modifierType}</span>
                           </div>
                       </div>
                       
                       <div className="flex gap-4">
                           <Button onClick={() => onSendToTxt2Img(activePromptText)} variant="secondary" className="flex-1 h-12 flex items-center justify-center space-x-2 rounded-2xl group text-sm">
                             <span className="font-bold">{t.importToTxt2Img}</span>
                             <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                           </Button>
                           <Button onClick={() => { navigator.clipboard.writeText(activePromptText); alert('Copied!'); }} variant="ghost" className="flex-1 h-12 rounded-2xl font-bold text-sm">COPY</Button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-900 rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[380px]">
                           <div>
                              <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 text-xl border border-primary-500/20">🔍</div>
                                <div>
                                  <h4 className="text-sm font-black text-white uppercase tracking-widest">{t.modifySubject}</h4>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Cumulative modification</p>
                                </div>
                              </div>
                              <div className="relative mb-6">
                                 <input 
                                   type="text" 
                                   value={subjectModifier}
                                   onChange={(e) => setSubjectModifier(e.target.value)}
                                   onKeyDown={(e) => e.key === 'Enter' && handleApplyModification()}
                                   placeholder={t.modifyPlaceholder}
                                   className="w-full h-14 bg-gray-800/50 border border-gray-700 rounded-2xl px-6 text-white text-sm focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600 focus:ring-4 focus:ring-primary-500/10"
                                   disabled={isModifying || isTransferring}
                                 />
                              </div>
                           </div>
                           <Button 
                              onClick={handleApplyModification} 
                              isLoading={isModifying}
                              disabled={!subjectModifier.trim() || isTransferring}
                              className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic"
                           >
                              {isModifying ? t.modifying : t.applyModification}
                           </Button>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[380px]">
                           <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500 text-xl border border-primary-100">🧬</div>
                                  <div>
                                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">{t.featureTransfer}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Inherited DNA swap</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-4 mb-4">
                                 <div 
                                   className={`relative w-24 h-24 shrink-0 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center ${isDraggingOverRef ? 'border-primary-500 bg-primary-50 scale-105 shadow-glow' : 'border-gray-200 bg-gray-50 hover:border-primary-300'}`}
                                   onClick={() => !isTransferring && refFileInputRef.current?.click()}
                                   onDragEnter={handleRefDragEnter}
                                   onDragOver={handleDragOver}
                                   onDragLeave={handleRefDragLeave}
                                   onDrop={handleRefDrop}
                                 >
                                    {refPreview ? (
                                      <img src={refPreview} alt="Reference" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        <span className="text-[8px] font-black text-gray-400 mt-1 uppercase tracking-tighter">Drop Ref</span>
                                      </div>
                                    )}
                                    {isDraggingOverRef && (
                                       <div className="absolute inset-0 bg-primary-500/10 flex items-center justify-center pointer-events-none">
                                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"><span className="text-primary-500 text-xl font-bold">+</span></div>
                                       </div>
                                    )}
                                    <input type="file" ref={refFileInputRef} onChange={(e) => e.target.files?.[0] && handleRefFileSelect(e.target.files[0])} className="hidden" accept="image/*" />
                                 </div>
                                 <div className="flex-1">
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['character', 'clothing', 'accessories', 'shoes', 'product', 'background'] as const).map(key => (
                                           <button 
                                              key={key}
                                              onClick={() => toggleTransferOption(key)}
                                              className={`flex items-center gap-2 px-2 py-2 rounded-lg border text-[9px] font-black transition-all ${transferOptions[key] ? 'bg-primary-500 border-primary-500 text-white shadow-sm scale-[1.02]' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                           >
                                              <div className={`w-1.5 h-1.5 rounded-full ${transferOptions[key] ? 'bg-white animate-pulse' : 'bg-gray-200'}`}></div>
                                              {key === 'character' ? t.featChar : key === 'clothing' ? t.featCloth : key === 'accessories' ? t.featAccess : key === 'shoes' ? t.featShoes : key === 'product' ? t.featProduct : t.featBackground}
                                           </button>
                                        ))}
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <Button 
                              onClick={handleExecuteTransfer}
                              isLoading={isTransferring}
                              disabled={!refPreview || isModifying || isTransferring || Object.values(transferOptions).every(v => v === false)}
                              className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic bg-gray-800 border-none shadow-none hover:bg-black"
                           >
                              {isTransferring ? t.transferring : t.transferBtn}
                           </Button>
                        </div>
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-4 min-h-[400px]">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    <p className="text-sm font-medium">Ready to Decode.</p>
                 </div>
               )}
            </div>
        </div>
      )}
    </div>
  );
};
