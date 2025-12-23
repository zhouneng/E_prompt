
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

  useEffect(() => {
    const timer = setTimeout(() => {
        try {
            localStorage.setItem('txt2img_gallery', JSON.stringify(gallery));
        } catch (e) {
            console.warn("LocalStorage quota exceeded.");
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

  const handleRatioSelect = (item: typeof ratios[0]) => {
      setActiveRatioId(item.id);
      if (item.id !== 'smart') {
          setAspectRatio(item.id);
      }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);

    const products = mainImage ? [mainImage] : [];
    const chars = refImage ? [refImage] : [];
    
    let modelId = 'gemini-2.5-flash-image';
    if (selectedModel === 'PRO') modelId = 'gemini-3-pro-image-preview';
    if (selectedModel === 'NANO') modelId = 'nano-banana-2';

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
          selectedResolution
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

  const activeImage = gallery.length > 0 ? gallery[0] : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[800px]">
        
        {/* --- LEFT COLUMN: FORM --- */}
        <div className="w-full lg:w-[500px] flex flex-col gap-6 bg-white rounded-3xl p-6 shadow-soft border border-gray-100">
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

            <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2">{language === 'CN' ? 'AI 模型引擎' : 'AI Model Engine'}</h4>
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                        <ModelCard label="Flash 2.5" description="Native Fast" isSelected={selectedModel === 'STANDARD'} onClick={() => setSelectedModel('STANDARD')} />
                        <ModelCard label="Pro 3.0" description="Official HQ" isSelected={selectedModel === 'PRO'} onClick={() => setSelectedModel('PRO')} color="purple" />
                        <ModelCard label="Nano v2" description="Proxy Opt" isSelected={selectedModel === 'NANO'} onClick={() => setSelectedModel('NANO')} badge="PROXY" color="blue" />
                    </div>
                    {(selectedModel === 'PRO' || selectedModel === 'NANO') && (
                       <div className={`border rounded-xl p-3 animate-in fade-in slide-in-from-top-2 duration-300 ${selectedModel === 'PRO' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}`}>
                           <div className="grid grid-cols-3 gap-2">
                               {(['1K', '2K', '4K'] as const).map(res => (
                                   <button key={res} onClick={() => setSelectedResolution(res)} className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedResolution === res ? (selectedModel === 'PRO' ? 'bg-purple-500 border-purple-600 text-white' : 'bg-blue-500 border-blue-600 text-white') : 'bg-white text-gray-600 border-gray-200'}`}>
                                       {res}
                                   </button>
                               ))}
                           </div>
                       </div>
                    )}
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2">{language === 'CN' ? '画幅比例' : 'Aspect Ratio'}</h4>
                <div className="bg-[#1a1c22] rounded-xl p-4 space-y-4 shadow-inner">
                    <div className="grid grid-cols-5 sm:grid-cols-9 gap-1">
                        {ratios.map((r) => (
                          <button key={r.id} onClick={() => handleRatioSelect(r)} className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all duration-200 ${activeRatioId === r.id ? 'bg-[#2c2f38] shadow-md' : 'hover:bg-[#2c2f38]/50'}`} title={r.label}>
                              <div className="mb-1"><RatioIcon id={r.id} active={activeRatioId === r.id} /></div>
                              <span className={`text-[9px] font-medium tracking-wide ${activeRatioId === r.id ? 'text-white' : 'text-gray-500'}`}>{r.label}</span>
                          </button>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2">{t.quantity}</h4>
                <div className="bg-[#1a1c22] rounded-xl p-2 shadow-inner flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                        <button key={num} onClick={() => setImageCount(num)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 font-mono ${imageCount === num ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-[#2c2f38] text-gray-500 hover:bg-[#363a45] hover:text-gray-300'}`}>
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Reference zones omitted for brevity, keeping same as before but focus is on Error UI */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-800">{t.productRef}</label>
                    <div className="relative w-full aspect-[4/5] bg-gray-50 border-2 border-dashed rounded-xl transition-all cursor-pointer group flex flex-col items-center justify-center text-center p-4 overflow-hidden border-gray-200 hover:border-primary-400" onClick={() => mainInputRef.current?.click()}>
                        {mainPreview ? <img src={mainPreview} alt="Main" className="absolute inset-0 w-full h-full object-cover rounded-xl" /> : <span className="text-[10px] text-gray-400">+ PRODUCT</span>}
                        <input type="file" ref={mainInputRef} onChange={(e) => handleInputChange(e, 'MAIN')} className="hidden" accept="image/*" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-800">{t.charRef}</label>
                    <div className="relative w-full aspect-[4/5] bg-gray-50 border-2 border-dashed rounded-xl transition-all cursor-pointer group flex flex-col items-center justify-center text-center p-4 overflow-hidden border-gray-200 hover:border-primary-400" onClick={() => refInputRef.current?.click()}>
                        {refPreview ? <img src={refPreview} alt="Ref" className="absolute inset-0 w-full h-full object-cover rounded-xl" /> : <span className="text-[10px] text-gray-400">+ CHARACTER</span>}
                        <input type="file" ref={refInputRef} onChange={(e) => handleInputChange(e, 'REF')} className="hidden" accept="image/*" />
                    </div>
                </div>
            </div>

            <div className="mt-auto">
                <Button onClick={handleGenerate} disabled={isGenerating || !prompt} className="w-full h-14 text-base font-bold rounded-xl shadow-glow" isLoading={isGenerating}>
                   ★ {t.generate}
                </Button>
            </div>
        </div>

        {/* --- RIGHT COLUMN: RESULT --- */}
        <div className="flex-1 bg-white rounded-3xl p-8 shadow-soft border border-gray-100 flex flex-col relative overflow-hidden">
            <h3 className="text-xl font-bold text-primary-500 mb-6">{language === 'CN' ? '生成预览' : 'Preview'}</h3>
            
            <div className="flex-1 flex items-center justify-center">
                {isGenerating ? (
                    <div className="flex flex-col items-center">
                       <div className="w-16 h-16 border-4 border-gray-100 border-t-primary-400 rounded-full animate-spin mb-4"></div>
                       <p className="text-gray-400 text-sm animate-pulse">{t.generating}</p>
                    </div>
                ) : error ? (
                    <div className="max-w-md w-full p-8 bg-red-50/50 rounded-3xl border border-red-100 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-2xl font-bold">!</div>
                        <h4 className="text-red-700 font-bold uppercase tracking-widest text-sm">Operation Failed</h4>
                        <p className="text-red-500 text-xs leading-relaxed font-medium">
                            {error}
                        </p>
                        <button onClick={handleGenerate} className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                           {language === 'CN' ? '重试请求' : 'Retry Request'}
                        </button>
                    </div>
                ) : activeImage ? (
                    <div className="relative group w-full h-full flex items-center justify-center">
                        <img src={activeImage.url} alt="Result" className="max-w-full max-h-[700px] object-contain rounded-xl shadow-lg cursor-pointer" onClick={() => onViewImage(gallery, 0)} />
                    </div>
                ) : (
                    <div className="text-center text-gray-400 space-y-4">
                        <div className="w-24 h-24 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 opacity-50">
                           <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {gallery.length > 0 && (
          <div className="w-full bg-white rounded-3xl p-8 shadow-soft border border-gray-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {gallery.map((item, index) => (
                      <div key={item.id} className="group relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all">
                          <img src={item.url} alt="Gallery Item" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" onClick={() => onViewImage(gallery, index)} />
                          <button onClick={(e) => handleDelete(item.id, e)} className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};
