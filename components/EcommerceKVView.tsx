
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadZone } from './UploadZone';
import { Button } from './Button';
import { generateEcommercePlan } from '../services/geminiService';
import { Language, LightboxItem, AppState } from '../types';
import { TRANSLATIONS } from '../constants';

interface EcommerceKVViewProps {
  onViewImage: (items: LightboxItem[], index: number) => void;
  language: Language;
}

const STYLE_OPTIONS = [
  { id: 'auto', name: 'AI 智能推荐', desc: '基于产品图自动匹配最佳视觉风格' },
  { id: 'Magazine Editorial Style', name: '杂志编辑', desc: '高级感、留白、粗衬线标题' },
  { id: 'Watercolor Art Style', name: '水彩艺术', desc: '柔和晕染、手绘质感、治愈系' },
  { id: 'Future Tech Style', name: '科技未来', desc: '蓝光效果、几何图形、数据感' },
  { id: 'Retro Film Style', name: '复古胶片', desc: '暖调颗粒、怀旧、经典氛围' },
  { id: 'Nordic Minimalist Style', name: '极简北欧', desc: '性冷淡风、大留白、平衡感' },
  { id: 'Neon Cyberpunk Style', name: '霓虹赛博', desc: '高饱和对比、未来都市、暗色底' },
  { id: 'Organic Nature Style', name: '自然有机', desc: '大地色系、植物元素、环保理念' },
];

export const EcommerceKVView: React.FC<EcommerceKVViewProps> = ({ onViewImage, language }) => {
  const t = TRANSLATIONS[language].ecommerce;
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [resultText, setResultText] = useState<string>("");
  
  // Step State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [visualStyle, setVisualStyle] = useState<string>("auto");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileSelect = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAppState(AppState.IDLE);
    setResultText("");
    setCurrentStep(2);
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setAppState(AppState.ANALYZING);
    try {
      const result = await generateEcommercePlan(selectedFile, visualStyle);
      setResultText(result);
      setAppState(AppState.SUCCESS);
      setCurrentStep(3);
    } catch (e: any) {
      alert(e.message || "Generation failed");
      setAppState(AppState.ERROR);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Full plan copied!");
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 pb-12">
       
       {/* Step Indicator */}
       <div className="max-w-5xl mx-auto w-full mb-12">
          <div className="flex items-center justify-between relative px-10">
             <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
             {[1, 2, 3].map((s) => (
                <div key={s} className="relative z-10 flex flex-col items-center">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-300 ${currentStep >= s ? 'bg-primary-500 text-white shadow-glow' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                      {s}
                   </div>
                   <span className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${currentStep >= s ? 'text-primary-500' : 'text-gray-300'}`}>
                      {s === 1 ? 'Upload' : s === 2 ? 'Strategy' : 'Plan'}
                   </span>
                </div>
             ))}
          </div>
       </div>

       {currentStep === 1 && (
         <div className="flex flex-col items-center justify-center flex-1 gap-8 py-10">
             <div className="text-center max-w-2xl mx-auto space-y-4">
               <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">{t.title}</h2>
               <p className="text-gray-500 text-lg font-medium">{t.subtitle}</p>
             </div>
             <div className="w-full max-w-2xl px-6">
                <UploadZone onFileSelect={handleFileSelect} language={language} />
             </div>
         </div>
       )}

       {currentStep >= 2 && (
         <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full items-start max-w-[1600px] mx-auto w-full px-6">
            
            {/* LEFT: Product Info & Config */}
            <div className="xl:col-span-4 flex flex-col gap-6 sticky top-24">
               <div className="bg-white p-3 rounded-[2.5rem] shadow-soft border border-gray-100 overflow-hidden group">
                  <div className="relative rounded-[2rem] overflow-hidden bg-gray-50 flex justify-center items-center h-[35vh]">
                    <img src={previewUrl!} alt="Product" className="max-w-full max-h-full object-contain p-4" />
                    <button onClick={() => setCurrentStep(1)} className="absolute top-4 left-4 bg-white/90 px-4 py-2 rounded-full text-[10px] font-black text-gray-400 hover:text-primary-500 shadow-sm transition-all uppercase tracking-widest">Back</button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-4 right-4 bg-primary-500 text-white px-4 py-2 rounded-full shadow-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest"
                    >
                        Replace Image
                    </button>
                    <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" accept="image/*" />
                  </div>
               </div>

               <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-soft space-y-8">
                   <div>
                      <div className="flex items-center justify-between mb-6">
                         <label className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">{t.styleLabel}</label>
                         <span className="text-[10px] text-primary-500 font-bold bg-primary-50 px-2 py-0.5 rounded-md">Pixmiller Ref</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                         {STYLE_OPTIONS.map((opt) => (
                           <button 
                              key={opt.id} 
                              onClick={() => setVisualStyle(opt.id)}
                              className={`text-left p-4 rounded-2xl border transition-all duration-200 group ${visualStyle === opt.id ? 'bg-primary-500 border-primary-500 text-white shadow-glow' : 'bg-gray-50 border-gray-50 text-gray-700 hover:bg-white hover:border-primary-100'}`}
                           >
                              <div className={`text-xs font-black uppercase tracking-widest mb-1 ${visualStyle === opt.id ? 'text-white' : 'text-gray-900'}`}>{opt.name}</div>
                              <div className={`text-[10px] font-bold ${visualStyle === opt.id ? 'text-primary-50' : 'text-gray-400'}`}>{opt.desc}</div>
                           </button>
                         ))}
                      </div>
                   </div>

                   <Button 
                      onClick={handleGenerate} 
                      isLoading={appState === AppState.ANALYZING}
                      className="w-full h-16 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] italic shadow-glow"
                   >
                      {appState === AppState.ANALYZING ? t.analyzing : t.generate}
                   </Button>
               </div>
            </div>

            {/* RIGHT: Results / Analysis Report */}
            <div className="xl:col-span-8 space-y-6 pb-20">
               {appState === AppState.ANALYZING ? (
                 <div className="bg-white border border-gray-100 rounded-[2.5rem] p-12 shadow-soft flex flex-col items-center justify-center min-h-[500px] text-center space-y-8 animate-in fade-in duration-500">
                    <div className="relative">
                       <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center animate-pulse">
                          <svg className="w-12 h-12 text-primary-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-25"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Surgically analyzing your product DNA...</h3>
                       <p className="text-gray-400 text-sm max-w-sm font-medium">Extracting brand essence, identifying core features, and designing 10-poster KV architecture.</p>
                    </div>
                 </div>
               ) : appState === AppState.SUCCESS ? (
                 <div className="animate-in slide-in-from-right-8 duration-700 space-y-8">
                    <div className="bg-white border border-gray-100 rounded-[3rem] p-12 shadow-soft relative overflow-hidden">
                       {/* Background Pattern */}
                       <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-[12rem] font-black italic tracking-tighter">KV</div>
                       
                       <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50 relative z-10">
                          <div>
                            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{t.resultTitle}</h3>
                            <p className="text-[10px] text-primary-400 font-bold uppercase tracking-[0.3em] mt-2">10 Posters System • {visualStyle}</p>
                          </div>
                          <Button variant="ghost" onClick={() => handleCopy(resultText)} className="px-6 h-12 text-[10px] font-black bg-gray-50 hover:bg-gray-100 rounded-2xl tracking-widest uppercase">
                             Copy All DNA
                          </Button>
                       </div>
                       
                       <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-medium relative z-10 selection:bg-primary-100">
                          {resultText}
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="bg-white border border-gray-100 rounded-[3rem] border-dashed flex flex-col items-center justify-center min-h-[500px] text-gray-200">
                    <div className="w-32 h-32 mb-6 bg-gray-50 rounded-[2.5rem] flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em]">Strategy pending deployment</p>
                 </div>
               )}
            </div>
         </div>
       )}
    </div>
  );
};
