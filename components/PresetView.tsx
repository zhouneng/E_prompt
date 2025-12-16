
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { generateImagesFromPrompt } from '../services/geminiService';
import { Language, LightboxItem } from '../types';
import { TRANSLATIONS, PRESET_TEMPLATES } from '../constants';
import { ModelCard, RatioIcon } from './GenerationCommon';

interface PresetViewProps {
  onViewImage: (items: LightboxItem[], index: number) => void;
  language: Language;
}

export const PresetView: React.FC<PresetViewProps> = ({ onViewImage, language }) => {
  const t = TRANSLATIONS[language].presets;
  const tCommon = TRANSLATIONS[language].txt2img; // Reuse some translations like "Gallery"
  const templates = PRESET_TEMPLATES;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false); // New state for collapsible selector
  
  // Model & Ratio State
  const [selectedModel, setSelectedModel] = useState<'STANDARD' | 'PRO' | 'NANO'>('NANO');
  const [selectedResolution, setSelectedResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<string>("3:4");
  const [activeRatioId, setActiveRatioId] = useState<string>("3:4");
  
  // Renamed from faceImage/facePreview to refImage/refPreview to be more generic (Portrait or Product)
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<LightboxItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up URL object
  useEffect(() => {
    return () => {
      if (refPreview) URL.revokeObjectURL(refPreview);
    };
  }, [refPreview]);

  // Handle Smart Ratio Logic (simplified for PresetView, mainly to detect portrait/landscape if user picks Smart)
  useEffect(() => {
    if (activeRatioId === 'smart' && refPreview) {
        const img = new Image();
        img.onload = () => {
            const r = img.width / img.height;
            if (r >= 1.7) setAspectRatio("16:9");
            else if (r >= 1.3) setAspectRatio("4:3");
            else if (r <= 0.6) setAspectRatio("9:16");
            else if (r <= 0.8) setAspectRatio("3:4");
            else setAspectRatio("1:1");
        };
        img.src = refPreview;
    }
  }, [activeRatioId, refPreview]);

  const ratios = [
      { id: 'smart', label: language === 'CN' ? '智能' : 'Smart', w: 1024, h: 1024 },
      { id: '1:1', label: '1:1', w: 1024, h: 1024 },
      { id: '3:4', label: '3:4', w: 768, h: 1024 },
      { id: '9:16', label: '9:16', w: 864, h: 1536 },
      { id: '4:3', label: '4:3', w: 1024, h: 768 },
      { id: '16:9', label: '16:9', w: 1536, h: 864 },
  ];

  const handleRatioSelect = (item: typeof ratios[0]) => {
      setActiveRatioId(item.id);
      if (item.id !== 'smart') {
          setAspectRatio(item.id);
      } else {
          if (!refPreview) {
              setAspectRatio('3:4'); // Default fallback for presets
          }
      }
  };

  const handleFileSelect = (file: File) => {
    setRefImage(file);
    const url = URL.createObjectURL(file);
    setRefPreview(url);
    setError(null);
  };

  const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const isProductMode = currentTemplate.type === 'PRODUCT';

  const handleGenerate = async () => {
    if (!refImage) {
        setError(isProductMode ? "Please upload a product photo first." : "Please upload a face photo first.");
        return;
    }
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    setIsGenerating(true);
    setError(null);

    // Determine Model ID
    let modelId = 'gemini-2.5-flash-image';
    if (selectedModel === 'PRO') modelId = 'gemini-3-pro-image-preview';
    if (selectedModel === 'NANO') modelId = 'nano-banana-2';

    try {
      // Determine args based on mode
      const products = isProductMode ? [refImage] : [];
      const chars = isProductMode ? [] : [refImage];
      const charMode = isProductMode ? 'FULL_BODY' : 'FACE_ID'; // FACE_ID for portraits
      const strictProduct = isProductMode ? true : false;
      
      const images = await generateImagesFromPrompt(
          template.prompt, 
          1, 
          aspectRatio, 
          products, 
          chars, 
          charMode, 
          modelId, 
          strictProduct,
          selectedResolution // Pass resolution
      );
      
      const newItems: LightboxItem[] = images.map(url => ({ 
        id: crypto.randomUUID(),
        url, 
        prompt: template.prompt,
        title: template.title[language],
        model: selectedModel,
        ratio: aspectRatio,
        tags: [isProductMode ? 'Product' : 'Portrait', 'Preset'],
        timestamp: Date.now()
      }));

      // Add to beginning of gallery
      setGallery(prev => [...newItems, ...prev]);

    } catch (e: any) {
      setError(e.message || "Failed to generate image.");
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

  // --- Drag & Drop Logic ---
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
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-12">
       
       <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[650px]">
          
          {/* LEFT: CONTROLS */}
          <div className="w-full lg:w-[450px] flex flex-col gap-6 bg-white rounded-3xl p-6 shadow-soft border border-gray-100">
              
              <div className="flex items-center gap-2 mb-2">
                 <span className="text-xl">📸</span>
                 <h2 className="text-lg font-bold text-gray-800 tracking-tight">{t.title}</h2>
              </div>

              {/* Collapsible Style Selector */}
              <div className="relative z-20">
                  <h3 className="text-xs font-bold text-gray-400 mb-2 tracking-wider">{t.selectStyle}</h3>
                  
                  {/* Selected / Trigger Button */}
                  <button 
                      onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                      className={`
                          w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between
                          bg-gradient-to-r ${currentTemplate.color} text-white shadow-md border-transparent
                      `}
                  >
                      <div className="flex items-center gap-3">
                          <div className="text-2xl filter drop-shadow-sm">{currentTemplate.icon}</div>
                          <div>
                              <div className="font-bold text-sm leading-tight">{currentTemplate.title[language]}</div>
                              <div className="text-[10px] opacity-90 leading-tight mt-0.5">{currentTemplate.description[language].substring(0, 30)}...</div>
                          </div>
                      </div>
                      <svg className={`w-5 h-5 transition-transform duration-300 ${isSelectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                  </button>

                  {/* Dropdown List */}
                  {isSelectorOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1 space-y-1">
                          {templates.map(tmpl => (
                              <button
                                key={tmpl.id}
                                onClick={() => {
                                    setSelectedTemplateId(tmpl.id);
                                    setIsSelectorOpen(false);
                                }}
                                className={`
                                    w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors
                                    ${selectedTemplateId === tmpl.id ? 'bg-gray-50' : 'hover:bg-gray-50'}
                                `}
                              >
                                  <div className="text-xl w-8 text-center">{tmpl.icon}</div>
                                  <div>
                                      <div className={`text-sm font-bold ${selectedTemplateId === tmpl.id ? 'text-primary-600' : 'text-gray-700'}`}>
                                          {tmpl.title[language]}
                                      </div>
                                  </div>
                                  {selectedTemplateId === tmpl.id && (
                                      <svg className="w-4 h-4 text-primary-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  )}
                              </button>
                          ))}
                      </div>
                  )}
                  {isSelectorOpen && (
                      <div className="fixed inset-0 z-[-1]" onClick={() => setIsSelectorOpen(false)}></div>
                  )}
              </div>

              {/* Model Selector Section */}
              <div className="space-y-3 pt-2 border-t border-gray-50">
                   <h3 className="text-xs font-bold text-gray-400 tracking-wider">{language === 'CN' ? 'AI 模型引擎' : 'AI MODEL ENGINE'}</h3>
                   <div className="grid grid-cols-3 gap-2">
                        {/* Standard Flash */}
                        <ModelCard 
                            label="Flash"
                            description={language === 'CN' ? '原生极速' : 'Fast'}
                            isSelected={selectedModel === 'STANDARD'}
                            onClick={() => setSelectedModel('STANDARD')}
                        />
                        {/* Official Pro */}
                        <ModelCard 
                            label="Pro"
                            description={language === 'CN' ? '高画质' : 'Quality'}
                            isSelected={selectedModel === 'PRO'}
                            onClick={() => setSelectedModel('PRO')}
                            color="purple"
                        />
                        {/* Proxy Nano */}
                        <ModelCard 
                            label="Nano"
                            description={language === 'CN' ? '代理' : 'Proxy'}
                            isSelected={selectedModel === 'NANO'}
                            onClick={() => setSelectedModel('NANO')}
                            badge="OPT"
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
                                   QUALITY
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

              {/* Aspect Ratio Section */}
              <div className="space-y-3 pt-2 border-t border-gray-50">
                   <h3 className="text-xs font-bold text-gray-400 tracking-wider">{language === 'CN' ? '画幅比例' : 'ASPECT RATIO'}</h3>
                   <div className="grid grid-cols-6 gap-1 bg-[#1a1c22] p-2 rounded-xl shadow-inner">
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
                              </button>
                            );
                        })}
                   </div>
              </div>

              {/* Image Upload */}
              <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-gray-50">
                  <h3 className="text-xs font-bold text-gray-400 mb-2 tracking-wider">
                     {isProductMode ? t.uploadProduct || "UPLOAD PRODUCT" : t.uploadFace}
                  </h3>
                  
                  <div 
                      className={`
                          flex-1 relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden bg-gray-50 flex items-center justify-center
                          ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}
                      `}
                      onClick={() => fileInputRef.current?.click()}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                  >
                      {refPreview ? (
                          <>
                             <img src={refPreview} alt="Reference" className="absolute inset-0 w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center group">
                                 <div className="bg-white/90 backdrop-blur text-gray-800 px-3 py-1 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-lg">
                                     Replace Photo
                                 </div>
                             </div>
                             {/* Remove Button */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); setRefImage(null); setRefPreview(null); }}
                                className="absolute top-2 right-2 bg-white text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50"
                             >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                          </>
                      ) : (
                          <div className="text-center p-6">
                              <div className="w-12 h-12 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm text-primary-400 mb-3 border border-gray-100">
                                  {isProductMode ? (
                                      // Product Icon
                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                  ) : (
                                      // Face Icon
                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  )}
                              </div>
                              <p className="text-sm font-bold text-gray-600">
                                  {isProductMode ? 'Click to upload product' : 'Click to upload selfie'}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                  {isProductMode ? 'Clear view on simple background' : 'Clear front face works best'}
                              </p>
                          </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" accept="image/*" />
                  </div>

                  {error && (
                      <div className="mt-4 p-3 bg-red-50 text-red-500 text-xs rounded-lg text-center border border-red-100">
                          {error}
                      </div>
                  )}

                  <div className="mt-4">
                      <Button 
                          onClick={handleGenerate} 
                          disabled={isGenerating || !refImage}
                          isLoading={isGenerating}
                          className="w-full h-14 rounded-xl text-base font-bold shadow-glow"
                      >
                          {isGenerating ? t.processing : t.generate}
                      </Button>
                  </div>
              </div>
          </div>

          {/* RIGHT: SINGLE RESULT */}
          <div className="flex-1 bg-white rounded-3xl p-8 shadow-soft border border-gray-100 flex flex-col relative overflow-hidden">
              <h3 className="text-xl font-bold text-primary-500 mb-6">{t.result}</h3>
              
              <div className="flex-1 flex items-center justify-center h-full min-h-[500px]">
                  {isGenerating ? (
                      <div className="flex flex-col items-center">
                         <div className="w-16 h-16 border-4 border-gray-100 border-t-primary-400 rounded-full animate-spin mb-4"></div>
                         <p className="text-gray-400 text-sm animate-pulse tracking-wide">{t.processing}</p>
                      </div>
                  ) : activeImage ? (
                      <div className="relative group w-full h-full flex items-center justify-center">
                          <img 
                            src={activeImage.url} 
                            alt="Result" 
                            className="max-w-full max-h-[600px] object-contain rounded-xl shadow-lg cursor-pointer"
                            onClick={() => onViewImage(gallery, 0)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none rounded-xl"></div>
                          <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                             <button 
                               onClick={() => onViewImage(gallery, 0)}
                               className="bg-white text-gray-800 px-5 py-2.5 rounded-full shadow-lg text-sm font-bold flex items-center gap-2"
                             >
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                               Full View
                             </button>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center text-gray-400 space-y-4">
                          <div className="w-24 h-24 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                             <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <p className="text-sm">Generated image will appear here.</p>
                      </div>
                  )}
              </div>
          </div>
       </div>

       {/* BOTTOM: GALLERY */}
       {gallery.length > 0 && (
          <div className="w-full bg-white rounded-3xl p-8 shadow-soft border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-bold text-gray-800">{tCommon.galleryTitle}</h3>
                 <span className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-1 rounded-full">{gallery.length} ITEMS</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {gallery.map((item, index) => (
                      <div key={item.id} className="group relative aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden border border-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all">
                          <img 
                            src={item.url} 
                            alt="Gallery Item" 
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                            onClick={() => onViewImage(gallery, index)}
                          />
                          <button 
                             onClick={(e) => handleDelete(item.id, e)}
                             className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                             title={tCommon.delete}
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
