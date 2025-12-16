import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './Button';
import { generateImagesFromPrompt } from '../services/geminiService';
import { Language, LightboxItem } from '../types';
import { TRANSLATIONS } from '../constants';
import { ModelCard, RatioIcon } from './GenerationCommon';

interface TextToImageViewProps {
  onViewImage: (items: LightboxItem[], index: number) => void;
  initialPrompt?: string;
  language: Language;
}

export const TextToImageView: React.FC<TextToImageViewProps> = ({ onViewImage, initialPrompt, language }) => {
  const t = TRANSLATIONS[language].txt2img;
  
  // --- Input State ---
  const [prompt, setPrompt] = useState("");
  const [imageCount, setImageCount] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [activeRatioId, setActiveRatioId] = useState<string>("1:1");
  const [customWidth, setCustomWidth] = useState<number>(2048);
  const [customHeight, setCustomHeight] = useState<number>(2048);
  
  // Model State
  // STANDARD = Flash 2.5
  // PRO = Official Pro 3.0
  // NANO = Proxy Nano-Banana-2
  const [selectedModel, setSelectedModel] = useState<'STANDARD' | 'PRO' | 'NANO'>('NANO');
  const [selectedResolution, setSelectedResolution] = useState<'1K' | '2K' | '4K'>('1K');
  
  // --- Reference State ---
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [productConsistencyEnabled, setProductConsistencyEnabled] = useState(true);
  
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);

  // Drag State
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [isDraggingRef, setIsDraggingRef] = useState(false);

  const mainInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  
  // --- Output State ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Gallery State ---
  const [gallery, setGallery] = useState<LightboxItem[]>(() => {
    try {
      const saved = localStorage.getItem('txt2img_gallery');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ROBUST LOCALSTORAGE HANDLING
  useEffect(() => {
    const timer = setTimeout(() => {
        try {
            localStorage.setItem('txt2img_gallery', JSON.stringify(gallery));
        } catch (e) {
            console.warn("LocalStorage quota exceeded.");
            try {
                const latest = gallery.slice(0, 1);
                localStorage.setItem('txt2img_gallery', JSON.stringify(latest));
            } catch (e2) {}
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [gallery]);

  const ratios = [
      { id: 'smart', label: language === 'CN' ? '智能' : 'Smart', w: 1024, h: 1024 },
      { id: '21:9', label: '21:9', w: 1536, h: 640 },
      { id: '16:9', label: '16:9', w: 1536, h: 864 },
      { id: '3:2', label: '3:2', w: 1216, h: 810 }, 
      { id: '4:3', label: '4:3', w: 1024, h: 768 },
      { id: '1:1', label: '1:1', w: 1024, h: 1024 },
      { id: '3:4', label: '3:4', w: 768, h: 1024 },
      { id: '2:3', label: '2:3', w: 810, h: 1216 },
      { id: '9:16', label: '9:16', w: 864, h: 1536 },
  ];

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    return () => {
      if (mainPreview) URL.revokeObjectURL(mainPreview);
      if (refPreview) URL.revokeObjectURL(refPreview);
    };
  }, [mainPreview, refPreview]);

  // Handle Smart Ratio Logic
  useEffect(() => {
    if (activeRatioId === 'smart' && mainPreview) {
        const img = new Image();
        img.onload = () => {
            setCustomWidth(img.width);
            setCustomHeight(img.height);
            const r = img.width / img.height;
            if (r >= 1.7) setAspectRatio("16:9");
            else if (r >= 1.3) setAspectRatio("4:3");
            else if (r <= 0.6) setAspectRatio("9:16");
            else if (r <= 0.8) setAspectRatio("3:4");
            else setAspectRatio("1:1");
        };
        img.src = mainPreview;
    }
  }, [activeRatioId, mainPreview]);

  const processFile = (file: File, type: 'MAIN' | 'REF') => {
      if (!file.type.startsWith('image/')) return;
      
      const url = URL.createObjectURL(file);
      if (type === 'MAIN') {
        setMainImage(file);
        setMainPreview(url);
      } else {
        setRefImage(file);
        setRefPreview(url);
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'MAIN' | 'REF') => {
    if (e.target.files && e.target.files.length > 0) {
        processFile(e.target.files[0], type);
        e.target.value = ''; 
    }
  };

  const handleDragEnter = (type: 'MAIN' | 'REF') => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'MAIN') setIsDraggingMain(true);
      else setIsDraggingRef(true);
  };

  const handleDragLeave = (type: 'MAIN' | 'REF') => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      if (type === 'MAIN') setIsDraggingMain(false);
      else setIsDraggingRef(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (type: 'MAIN' | 'REF') => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'MAIN') setIsDraggingMain(false);
      else setIsDraggingRef(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFile(e.dataTransfer.files[0], type);
      }
  };

  const handleRatioSelect = (item: typeof ratios[0]) => {
      setActiveRatioId(item.id);
      if (item.id !== 'smart') {
          setCustomWidth(item.w);
          setCustomHeight(item.h);
          setAspectRatio(item.id);
      } else {
          if (!mainPreview) {
              setCustomWidth(1024);
              setCustomHeight(1024);
              setAspectRatio('1:1');
          }
      }
  };

  const handleCustomInput = (type: 'W' | 'H', val: string) => {
      const num = parseInt(val) || 0;
      if (type === 'W') setCustomWidth(num);
      else setCustomHeight(num);
      setActiveRatioId('custom');
      
      const w = type === 'W' ? num : customWidth;
      const h = type === 'H' ? num : customHeight;
      if (w > 0 && h > 0) {
        const ratio = w / h;
        let closest = '1:1';
        let minDiff = Infinity;
        const targets = [
             {r: 1, id: '1:1'}, {r: 1.33, id: '4:3'}, {r: 0.75, id: '3:4'}, 
             {r: 1.77, id: '16:9'}, {r: 0.56, id: '9:16'}
        ];
        
        targets.forEach(t => {
            const diff = Math.abs(ratio - t.r);
            if (diff < minDiff) {
                minDiff = diff;
                closest = t.id;
            }
        });
        setAspectRatio(closest);
      }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);

    const products = mainImage ? [mainImage] : [];
    const chars = refImage ? [refImage] : [];
    
    // MAP selection to model ID
    let modelId = 'gemini-2.5-flash-image';
    if (selectedModel === 'PRO') modelId = 'gemini-3-pro-image-preview';
    if (selectedModel === 'NANO') modelId = 'nano-banana-2'; // Proxy model ID

    try {
      const images = await generateImagesFromPrompt(
          prompt, 
          imageCount, 
          aspectRatio, 
          products,
          chars,
          'FULL_BODY',
          modelId,
          productConsistencyEnabled,
          selectedResolution // Pass resolution (works for PRO and NANO)
      );
      
      const newItems: LightboxItem[] = images.map(url => ({ 
        id: crypto.randomUUID(),
        url, 
        prompt: prompt,
        title: "Generated Image",
        model: selectedModel,
        ratio: aspectRatio,
        tags: ['Text-to-Image', selectedModel, selectedResolution],
        timestamp: Date.now()
      }));

      setGallery(prev => [...newItems, ...prev].slice(0, 12));

    } catch (e: any) {
      setError(e.message || "Failed to generate images.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Delete this image?')) {
        setGallery(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleOpenLightbox = (index: number) => {
    onViewImage(gallery, index);
  };

  const activeImage = gallery.length > 0 ? gallery[0] : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[800px]">
        
        {/* --- LEFT COLUMN: FORM --- */}
        <div className="w-full lg:w-[500px] flex flex-col gap-6 bg-white rounded-3xl p-6 shadow-soft border border-gray-100">
            
            {/* Prompt Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary-600 font-bold text-lg">
                    <span className="text-xl">✍️</span>
                    <h3>{t.title}</h3>
                </div>
                <div className="relative">
                    <textarea 
                      value={prompt} 
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t.promptPlaceholder}
                      className="w-full h-24 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                    ></textarea>
                </div>
            </div>

            {/* Model Selector Section */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-800">{language === 'CN' ? 'AI 模型引擎' : 'AI Model Engine'}</h4>
                </div>
                
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                        {/* Standard Flash */}
                        <ModelCard 
                            label="Flash 2.5"
                            description={language === 'CN' ? '原生极速' : 'Native Fast'}
                            isSelected={selectedModel === 'STANDARD'}
                            onClick={() => setSelectedModel('STANDARD')}
                        />
                        {/* Official Pro */}
                        <ModelCard 
                            label="Pro 3.0"
                            description={language === 'CN' ? '原生高画质' : 'Official HQ'}
                            isSelected={selectedModel === 'PRO'}
                            onClick={() => setSelectedModel('PRO')}
                            color="purple"
                        />
                        {/* Proxy Nano */}
                        <ModelCard 
                            label="Nano v2"
                            description={language === 'CN' ? '第三方代理' : 'Proxy Opt'}
                            isSelected={selectedModel === 'NANO'}
                            onClick={() => setSelectedModel('NANO')}
                            badge="PROXY"
                            color="blue"
                        />
                    </div>

                    {/* Pro/Nano Resolution Selector */}
                    {(selectedModel === 'PRO' || selectedModel === 'NANO') && (
                       <div className={`
                          border rounded-xl p-3 animate-in fade-in slide-in-from-top-2 duration-300
                          ${selectedModel === 'PRO' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}
                       `}>
                           <div className="flex items-center justify-between mb-2">
                               <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${selectedModel === 'PRO' ? 'text-purple-700' : 'text-blue-700'}`}>
                                   {t.resolution || 'QUALITY'}
                                   <span>✨</span>
                               </label>
                           </div>
                           <div className="grid grid-cols-3 gap-2">
                               {(['1K', '2K', '4K'] as const).map(res => (
                                   <button
                                       key={res}
                                       onClick={() => setSelectedResolution(res)}
                                       className={`
                                           py-1.5 rounded-lg text-xs font-bold transition-all border
                                           ${selectedResolution === res 
                                               ? (selectedModel === 'PRO' ? 'bg-purple-500 border-purple-600 text-white' : 'bg-blue-500 border-blue-600 text-white')
                                               : 'bg-white text-gray-600 border-gray-200'}
                                       `}
                                   >
                                       {res}
                                   </button>
                               ))}
                           </div>
                       </div>
                    )}
                </div>
            </div>

            {/* Aspect Ratio Section */}
            <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2">{language === 'CN' ? '画幅比例' : 'Aspect Ratio'}</h4>
                <div className="bg-[#1a1c22] rounded-xl p-4 space-y-4 shadow-inner">
                    <div className="grid grid-cols-5 sm:grid-cols-9 gap-1">
                        {ratios.map((r) => {
                            const isActive = activeRatioId === r.id;
                            return (
                              <button
                                  key={r.id}
                                  onClick={() => handleRatioSelect(r)}
                                  className={`
                                      flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all duration-200
                                      ${isActive ? 'bg-[#2c2f38] shadow-md' : 'hover:bg-[#2c2f38]/50'}
                                  `}
                                  title={r.label}
                              >
                                  <div className="mb-1">
                                      <RatioIcon id={r.id} active={isActive} />
                                  </div>
                                  <span className={`text-[9px] font-medium tracking-wide ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                      {r.label}
                                  </span>
                              </button>
                            );
                        })}
                    </div>
                    
                    {/* Custom Input Section */}
                    <div className="pt-2 border-t border-gray-700/50">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.custom || "CUSTOM"}</span>
                             {activeRatioId === 'custom' && <span className="text-[9px] bg-primary-900/30 text-primary-400 px-1.5 rounded border border-primary-800/50">ACTIVE: {aspectRatio}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="relative flex-1">
                               <input 
                                  type="number" 
                                  value={customWidth}
                                  onChange={(e) => handleCustomInput('W', e.target.value)}
                                  className={`w-full bg-[#2c2f38] border ${activeRatioId === 'custom' ? 'border-primary-500/50 text-white' : 'border-transparent text-gray-400'} rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary-500 transition-colors`}
                                  placeholder="Width"
                               />
                               <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 font-bold">W</span>
                           </div>
                           <span className="text-gray-600 font-mono text-xs">x</span>
                           <div className="relative flex-1">
                               <input 
                                  type="number" 
                                  value={customHeight}
                                  onChange={(e) => handleCustomInput('H', e.target.value)}
                                  className={`w-full bg-[#2c2f38] border ${activeRatioId === 'custom' ? 'border-primary-500/50 text-white' : 'border-transparent text-gray-400'} rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary-500 transition-colors`}
                                  placeholder="Height"
                               />
                               <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 font-bold">H</span>
                           </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quantity Section */}
            <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2">{t.quantity}</h4>
                <div className="bg-[#1a1c22] rounded-xl p-2 shadow-inner flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                        <button
                            key={num}
                            onClick={() => setImageCount(num)}
                            className={`
                                flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 font-mono
                                ${imageCount === num 
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                                    : 'bg-[#2c2f38] text-gray-500 hover:bg-[#363a45] hover:text-gray-300'}
                            `}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reference Images Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                         <label className="text-xs font-bold text-gray-800">{t.productRef}</label>
                         <div className="flex items-center gap-2">
                             <button 
                                 onClick={() => setProductConsistencyEnabled(!productConsistencyEnabled)}
                                 className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${productConsistencyEnabled ? 'bg-primary-500' : 'bg-gray-300'}`}
                             >
                                 <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ${productConsistencyEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                             </button>
                         </div>
                    </div>
                    <div 
                      className={`
                          relative w-full aspect-[4/5] bg-gray-50 border-2 border-dashed rounded-xl transition-all cursor-pointer group flex flex-col items-center justify-center text-center p-4 overflow-hidden
                          ${isDraggingMain ? 'border-primary-500 bg-primary-50 scale-[1.02]' : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50'}
                      `}
                      onClick={() => mainInputRef.current?.click()}
                      onDragEnter={handleDragEnter('MAIN')}
                      onDragLeave={handleDragLeave('MAIN')}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop('MAIN')}
                    >
                        {mainPreview ? (
                            <>
                               <img src={mainPreview} alt="Main" className="absolute inset-0 w-full h-full object-cover rounded-xl z-0" />
                               {isDraggingMain && (
                                  <div className="absolute inset-0 bg-primary-500/20 z-10 flex items-center justify-center backdrop-blur-sm">
                                     <span className="text-white font-bold drop-shadow-md">{t.dropToReplace}</span>
                                  </div>
                               )}
                            </>
                        ) : (
                            <>
                              <div className={`mb-2 transition-colors ${isDraggingMain ? 'text-primary-500' : 'text-gray-300 group-hover:text-primary-400'}`}>
                                  <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                              <span className="text-xs text-gray-500 font-medium pointer-events-none">{isDraggingMain ? 'Drop here' : t.addProduct}</span>
                            </>
                        )}
                        <input type="file" ref={mainInputRef} onChange={(e) => handleInputChange(e, 'MAIN')} className="hidden" accept="image/*" />
                        {mainPreview && !isDraggingMain && (
                           <button 
                              onClick={(e) => {e.stopPropagation(); setMainImage(null); setMainPreview(null);}} 
                              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-red-50 text-red-400 z-20"
                           >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                           </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-800">{t.charRef}</label>
                    <div 
                      className={`
                          relative w-full aspect-[4/5] bg-gray-50 border-2 border-dashed rounded-xl transition-all cursor-pointer group flex flex-col items-center justify-center text-center p-4 overflow-hidden
                          ${isDraggingRef ? 'border-primary-500 bg-primary-50 scale-[1.02]' : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50'}
                      `}
                      onClick={() => refInputRef.current?.click()}
                      onDragEnter={handleDragEnter('REF')}
                      onDragLeave={handleDragLeave('REF')}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop('REF')}
                    >
                        {refPreview ? (
                            <>
                              <img src={refPreview} alt="Ref" className="absolute inset-0 w-full h-full object-cover rounded-xl z-0" />
                              {isDraggingRef && (
                                  <div className="absolute inset-0 bg-primary-500/20 z-10 flex items-center justify-center backdrop-blur-sm">
                                     <span className="text-white font-bold drop-shadow-md">{t.dropToReplace}</span>
                                  </div>
                               )}
                            </>
                        ) : (
                            <>
                              <div className={`mb-2 transition-colors ${isDraggingRef ? 'text-primary-500' : 'text-gray-300 group-hover:text-primary-400'}`}>
                                  <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                              <span className="text-xs text-gray-500 font-medium pointer-events-none">{isDraggingRef ? 'Drop here' : t.addChar}</span>
                            </>
                        )}
                        <input type="file" ref={refInputRef} onChange={(e) => handleInputChange(e, 'REF')} className="hidden" accept="image/*" />
                        {refPreview && !isDraggingRef && (
                           <button 
                              onClick={(e) => {e.stopPropagation(); setRefImage(null); setRefPreview(null);}} 
                              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-red-50 text-red-400 z-20"
                           >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                           </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="mt-auto space-y-4">
                {error && <div className="text-xs text-red-500 bg-red-50 p-2 rounded text-center">{error}</div>}

                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !prompt} 
                  className="w-full h-14 text-base font-bold rounded-xl shadow-glow" 
                  isLoading={isGenerating}
                >
                   ★ {t.generate}
                </Button>
            </div>
        </div>

        {/* --- RIGHT COLUMN: RESULT --- */}
        <div className="flex-1 bg-white rounded-3xl p-8 shadow-soft border border-gray-100 flex flex-col relative overflow-hidden">
            <h3 className="text-xl font-bold text-primary-500 mb-6">{language === 'CN' ? '结果' : 'Result'}</h3>
            
            <div className="flex-1 flex items-center justify-center">
                {isGenerating ? (
                    <div className="flex flex-col items-center">
                       <div className="w-16 h-16 border-4 border-gray-100 border-t-primary-400 rounded-full animate-spin mb-4"></div>
                       <p className="text-gray-400 text-sm animate-pulse">{t.generating}</p>
                    </div>
                ) : activeImage ? (
                    <div className="relative group w-full h-full flex items-center justify-center">
                        <img 
                          src={activeImage.url} 
                          alt="Result" 
                          className="max-w-full max-h-[700px] object-contain rounded-xl shadow-lg cursor-pointer"
                          onClick={() => handleOpenLightbox(0)}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none rounded-xl"></div>
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => handleOpenLightbox(0)}
                             className="bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg text-sm font-bold"
                           >
                             {t.clickToEnlarge}
                           </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 space-y-4">
                        <div className="w-24 h-24 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                           <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <p className="text-sm">{language === 'CN' ? '您生成的图像将显示在这里。' : 'Your generated images will be displayed here.'}</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- GALLERY SECTION --- */}
      {gallery.length > 0 && (
          <div className="w-full bg-white rounded-3xl p-8 shadow-soft border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-bold text-gray-800">{t.galleryTitle}</h3>
                 <span className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-1 rounded-full">{gallery.length} ITEMS</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {gallery.map((item, index) => (
                      <div key={item.id} className="group relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all">
                          <img 
                            src={item.url} 
                            alt="Gallery Item" 
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                            onClick={() => handleOpenLightbox(index)}
                          />
                          <button 
                             onClick={(e) => handleDelete(item.id, e)}
                             className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                             title={t.delete}
                          >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};
