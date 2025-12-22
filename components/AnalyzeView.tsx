
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadZone } from './UploadZone';
import { Button } from './Button';
import { generateImagePrompt, modifyPromptSubject } from '../services/geminiService';
import { AppState, ErrorState, HistoryItem, Language, LightboxItem } from '../types';
import { TRANSLATIONS } from '../constants';

interface AnalyzeViewProps {
  onAddToHistory: (item: HistoryItem) => void;
  initialPrompt?: string;
  onViewImage: (items: LightboxItem[], index: number) => void;
  onSendToTxt2Img: (prompt: string) => void;
  language: Language;
}

interface PromptVersion {
  id: string;
  prompt: string;
  subjectModifier: string;
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
  language
}) => {
  const t = TRANSLATIONS[language].analyze;
  
  // App Core State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  
  // Modification State
  const [subjectModifier, setSubjectModifier] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'ENGLISH' | 'CHINESE'>('ENGLISH');
  const [includeCopywriting, setIncludeCopywriting] = useState(false); 
  const [isDraggingOverImage, setIsDraggingOverImage] = useState(false);
  const imageDragCounter = useRef(0);

  const [currentRecord, setCurrentRecord] = useState<AnalyzedRecord | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPrompt && appState === AppState.IDLE) {
      const initialVersion: PromptVersion = { id: 'orig', prompt: initialPrompt, subjectModifier: '', timestamp: Date.now() };
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

  const handleFileSelect = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    
    setSelectedFile(file);
    setPreviewUrl(url);
    setAppState(AppState.IDLE);
    setCurrentRecord(null);
    setError(null);
    setSubjectModifier("");
    
    // 立即执行分析逻辑
    performAnalysis(file, includeCopywriting, url);
  };

  const performAnalysis = async (file: File, useCopywriting: boolean, customPreview?: string) => {
    const url = customPreview || previewUrl;
    if (!url) return;
    
    setAppState(AppState.ANALYZING);
    setError(null);

    try {
      const prompt = await generateImagePrompt(file, useCopywriting);
      const initialVersion: PromptVersion = { id: 'orig', prompt, subjectModifier: '', timestamp: Date.now() };
      
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

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setAppState(AppState.ERROR);
      setError({ message: err.message || "Failed to analyze image." });
    }
  };

  const handleApplyModification = async () => {
    if (!currentRecord || !subjectModifier.trim() || isModifying) return;
    setIsModifying(true);
    
    try {
      const originalPrompt = currentRecord.versions[0].prompt;
      const modifiedPrompt = await modifyPromptSubject(originalPrompt, subjectModifier);
      
      const newVersion: PromptVersion = {
        id: crypto.randomUUID(),
        prompt: modifiedPrompt,
        subjectModifier: subjectModifier,
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

  const handleVersionSwitch = (index: number) => {
    if (!currentRecord) return;
    setCurrentRecord({ ...currentRecord, currentVersionIndex: index });
  };

  // --- 局部拖拽优化逻辑 ---
  const handleImageDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    imageDragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOverImage(true);
    }
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    imageDragCounter.current--;
    if (imageDragCounter.current <= 0) {
      imageDragCounter.current = 0;
      setIsDraggingOverImage(false);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverImage(false);
    imageDragCounter.current = 0;
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 min-h-[60vh]">
      
      {appState === AppState.IDLE && !selectedFile && (
        <div className="text-center mb-8 max-w-2xl mx-auto space-y-4">
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">{t.title}</h2>
          <p className="text-gray-500 text-lg font-medium">{t.subtitle}</p>
        </div>
      )}

      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="w-full">
            {!selectedFile ? (
               <UploadZone onFileSelect={handleFileSelect} language={language} />
            ) : (
              <div className="flex flex-col gap-4">
                {/* 仅在此容器内感应拖拽，不再使用全屏感应 */}
                <div 
                  className={`bg-white p-2 rounded-3xl shadow-soft border transition-all duration-300 relative group overflow-hidden ${isDraggingOverImage ? 'border-primary-500 ring-4 ring-primary-100' : 'border-gray-100'}`}
                  onDragEnter={handleImageDragEnter}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                >
                  <div className="relative rounded-2xl overflow-hidden bg-gray-50 flex justify-center h-[50vh]">
                    <img 
                      src={previewUrl!} 
                      alt="Target" 
                      className={`max-w-full h-full object-contain cursor-pointer transition-transform duration-500 ${isDraggingOverImage ? 'scale-95 opacity-50 grayscale' : 'scale-100'}`} 
                      onClick={() => onViewImage([{ url: previewUrl!, id: 'preview', prompt: currentPrompt }], 0)} 
                    />
                    
                    {/* 局部拖拽反馈浮层 */}
                    {isDraggingOverImage && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                         <div className="bg-white/90 backdrop-blur-md p-6 rounded-full shadow-2xl scale-110 mb-4">
                           <span className="text-4xl">📥</span>
                         </div>
                         <p className="text-lg font-black text-primary-600 tracking-tighter uppercase bg-white/80 px-4 py-1 rounded-full">{t.dropToReplace}</p>
                      </div>
                    )}

                    {/* 更换图片快捷按钮 (非拖拽时可见) */}
                    {!isDraggingOverImage && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {language === 'CN' ? '更换图片' : 'Change Image'}
                      </button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" accept="image/*" />
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-soft">
                   <button 
                      onClick={() => setIncludeCopywriting(!includeCopywriting)} 
                      disabled={appState === AppState.ANALYZING} 
                      className={`flex items-center gap-3 px-6 py-2 rounded-full border transition-all text-xs font-bold ${includeCopywriting ? 'bg-primary-50 border-primary-200 text-primary-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}`}
                   >
                      <span className={includeCopywriting ? 'animate-pulse' : ''}>✨</span>
                      {t.copywriting}: {includeCopywriting ? 'ON' : 'OFF'}
                   </button>
                   {appState === AppState.ANALYZING ? (
                      <div className="flex items-center gap-3 text-sm font-bold text-primary-500 animate-pulse px-4 uppercase tracking-widest">
                         <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         {t.analyzing}
                      </div>
                   ) : (
                      <Button onClick={() => performAnalysis(selectedFile!, includeCopywriting)} className="w-full sm:w-auto h-11 px-8 rounded-full">{appState === AppState.SUCCESS ? "RE-ANALYZE" : t.initSequence}</Button>
                   )}
                </div>
              </div>
            )}
        </div>

        {currentRecord && (
            <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full space-y-6">
               
               {/* 结果展示卡片 */}
               <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 lg:p-12 shadow-soft relative overflow-hidden group">
                  
                  {/* 版本指令回显 */}
                  {activeVersion?.subjectModifier && (
                    <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
                       <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-primary-50 border border-primary-100 rounded-2xl text-primary-700">
                          <span className="text-lg">🔄</span>
                          <span className="text-sm font-bold">{language === 'CN' ? '修改主体为' : 'Swapped subject to'}: <span className="underline decoration-primary-300 decoration-2 underline-offset-4">{activeVersion.subjectModifier}</span></span>
                       </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-6">
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
                    
                    {/* 版本历史导航 */}
                    {currentRecord.versions.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[350px] pb-1">
                        {currentRecord.versions.map((v, i) => (
                           <button 
                             key={v.id} 
                             onClick={() => handleVersionSwitch(i)}
                             className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all shrink-0 flex items-center gap-2 ${currentRecord.currentVersionIndex === i ? 'bg-primary-600 border-primary-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                           >
                             <span className="opacity-60">{i === 0 ? 'ORIG' : 'V'+i}</span>
                             <span className="truncate max-w-[80px]">{i === 0 ? t.original : v.subjectModifier}</span>
                           </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative z-10">
                    <div className="bg-gray-50/50 rounded-3xl p-6 mb-8 border border-gray-100">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm lg:text-base font-medium selection:bg-primary-500 selection:text-white">
                        {activeTab === 'ENGLISH' ? parsedContent.english : (parsedContent.chinese || parsedContent.english)}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button onClick={() => onSendToTxt2Img(currentPrompt)} variant="secondary" className="w-full h-12 flex items-center justify-center space-x-2 rounded-2xl group">
                        <span className="font-bold">{t.importToTxt2Img}</span>
                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </Button>
                      <Button onClick={() => { navigator.clipboard.writeText(currentPrompt); alert('Copied!'); }} variant="ghost" className="w-full h-12 rounded-2xl font-bold">COPY TO CLIPBOARD</Button>
                    </div>
                  </div>
                  
                  {/* 水印 */}
                  <div className="absolute -bottom-10 -right-10 opacity-[0.05] pointer-events-none select-none text-[10rem] font-black italic tracking-tighter">DECODE</div>
               </div>

               {/* 主体手术控制台 */}
               <div className="bg-gray-900 rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl animate-in fade-in duration-700 ring-1 ring-white/5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 text-xl border border-primary-500/20">✨</div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">{t.modifySubject}</h4>
                        <p className="text-[10px] text-gray-500 font-bold">SMART SURGICAL SWAP ENGINE</p>
                      </div>
                    </div>
                    {isModifying && <div className="text-[10px] text-primary-400 animate-pulse font-black uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-ping"></div> Synthesizing...</div>}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                       <input 
                         type="text" 
                         value={subjectModifier}
                         onChange={(e) => setSubjectModifier(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleApplyModification()}
                         placeholder={t.modifyPlaceholder}
                         className="w-full h-14 bg-gray-800/50 border border-gray-700 rounded-2xl pl-6 pr-12 text-white text-sm focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600 focus:ring-4 focus:ring-primary-500/10"
                         disabled={isModifying}
                       />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                       </div>
                    </div>
                    <Button 
                      onClick={handleApplyModification} 
                      isLoading={isModifying}
                      disabled={!subjectModifier.trim()}
                      className="whitespace-nowrap h-14 px-8 rounded-2xl font-black text-sm uppercase tracking-wider"
                    >
                      {isModifying ? t.modifying : t.applyModification}
                    </Button>
                  </div>
                  
                  <div className="mt-6 flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                     <span className="text-lg">💡</span>
                     <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                       {language === 'CN' 
                         ? '手术逻辑：AI 会精准定位画面主体并进行结构化替换，同时“强制锁定”原图的背景深度、光影色调及镜头语言。' 
                         : 'Surgical Logic: AI precisely locates the subject for replacement while "force-locking" the original background depth, lighting, and camera language.'}
                     </p>
                  </div>
               </div>
            </div>
        )}
      </div>
    </div>
  );
};
