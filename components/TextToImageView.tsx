
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './Button';
import { generateImagesFromPrompt } from '../services/geminiService';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface GeneratedImage {
  url: string;
  prompt: string;
}

interface TextToImageViewProps {
  onViewImage: (url: string, prompt: string) => void;
  initialPrompt?: string;
  language: Language;
}

export const TextToImageView: React.FC<TextToImageViewProps> = ({ onViewImage, initialPrompt, language }) => {
  const t = TRANSLATIONS[language].txt2img;
  const [prompt, setPrompt] = useState("");
  const [imageCount, setImageCount] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [isCustomRatio, setIsCustomRatio] = useState(false);
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  
  // Reference Images State (Subject/Consistency)
  const [refImages, setRefImages] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [isDraggingRef, setIsDraggingRef] = useState(false);
  
  // Composition Reference State
  const [compImage, setCompImage] = useState<File | null>(null);
  const [compPreview, setCompPreview] = useState<string | null>(null);
  const [compStrength, setCompStrength] = useState<number>(60);
  const [isDraggingComp, setIsDraggingComp] = useState(false);
  
  // Mode Toggles
  const [maintainSubject, setMaintainSubject] = useState(false);
  const [replaceProduct, setReplaceProduct] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compInputRef = useRef<HTMLInputElement>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      refPreviews.forEach(url => URL.revokeObjectURL(url));
      if (compPreview) URL.revokeObjectURL(compPreview);
    };
  }, [refPreviews, compPreview]);

  // Reset modes if reference images are removed
  useEffect(() => {
    if (refImages.length === 0) {
      setMaintainSubject(false);
      setReplaceProduct(false);
    }
  }, [refImages]);

  const aspectRatios = [
    { label: "1:1", value: "1:1", icon: "square" },
    { label: "4:3", value: "4:3", icon: "landscape" },
    { label: "3:4", value: "3:4", icon: "portrait" },
    { label: "16:9", value: "16:9", icon: "landscape-wide" },
    { label: "9:16", value: "9:16", icon: "portrait-tall" },
    { label: "21:9", value: "21:9", icon: "cinema" },
    { label: "3:2", value: "3:2", icon: "photo" },
    { label: "2:3", value: "2:3", icon: "photo-portrait" },
  ];

  const getClosestRatio = (w: number, h: number): string => {
    const target = w / h;
    const supported = [
      { key: "1:1", val: 1 },
      { key: "4:3", val: 4/3 },
      { key: "3:4", val: 3/4 },
      { key: "16:9", val: 16/9 },
      { key: "9:16", val: 9/16 },
    ];
    
    // Find closest
    return supported.reduce((prev, curr) => {
      return (Math.abs(curr.val - target) < Math.abs(prev.val - target) ? curr : prev);
    }).key;
  };

  // --- Reference Images Handlers ---
  const handleRefImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processRefFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processRefFiles = (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setRefImages(prev => [...prev, ...validFiles]);
    setRefPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRefDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingRef) setIsDraggingRef(true);
  }, [isDraggingRef]);

  const handleRefDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingRef(false);
  }, []);

  const handleRefDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRef(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processRefFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const removeRefImage = (index: number) => {
    URL.revokeObjectURL(refPreviews[index]);
    setRefImages(prev => prev.filter((_, i) => i !== index));
    setRefPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // --- Composition Image Handlers ---
  const handleCompImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processCompFile(e.target.files[0]);
      if (compInputRef.current) compInputRef.current.value = '';
    }
  };

  const processCompFile = (file: File) => {
      if (!file.type.startsWith('image/')) return;
      setCompImage(file);
      setCompPreview(URL.createObjectURL(file));
  };

  const handleCompDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingComp) setIsDraggingComp(true);
  }, [isDraggingComp]);

  const handleCompDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingComp(false);
  }, []);

  const handleCompDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingComp(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCompFile(e.dataTransfer.files[0]);
    }
  }, []);

  const removeCompImage = () => {
    if (compPreview) URL.revokeObjectURL(compPreview);
    setCompImage(null);
    setCompPreview(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);

    // Determine ratio
    let targetRatio = aspectRatio;
    if (isCustomRatio) {
      targetRatio = getClosestRatio(customWidth, customHeight);
    }

    try {
      const images = await generateImagesFromPrompt(
          prompt, 
          imageCount, 
          targetRatio, 
          refImages,
          maintainSubject,
          replaceProduct,
          compImage,
          compStrength
      );
      // Prepend new images to existing list (Newest First), attaching current prompt to them
      const newImages = images.map(url => ({ url, prompt: prompt }));
      setGeneratedImages(prev => [...newImages, ...prev]);
    } catch (e: any) {
      setError(e.message || "Failed to generate images.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearGallery = () => {
    if (window.confirm("Clear all generated images?")) {
      setGeneratedImages([]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-100 font-mono tracking-wider">{t.title}</h2>
        <p className="text-slate-400 text-sm mt-2">{t.subtitle}</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <div className="space-y-6">
          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-mono text-cyan-500 mb-2">{t.promptInput}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reference Images Section */}
            <div>
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-mono text-cyan-500">{t.refImages}</label>
                   <span className="text-[10px] text-slate-500 font-mono">{t.optional}</span>
                </div>
                
                <div className="flex flex-wrap gap-3">
                   {/* Upload Button (Drag Zone) */}
                   <label
                     onDragOver={handleRefDragOver}
                     onDragLeave={handleRefDragLeave}
                     onDrop={handleRefDrop}
                     className={`
                       w-20 h-20 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center group cursor-pointer
                       ${isDraggingRef 
                         ? 'border-cyan-500 bg-cyan-500/10 scale-105 shadow-lg shadow-cyan-500/20' 
                         : 'border-slate-700 bg-slate-950 hover:bg-slate-900 hover:border-cyan-500'}
                     `}
                   >
                     <svg className={`w-6 h-6 mb-1 transition-colors ${isDraggingRef ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                     </svg>
                     <span className={`text-[9px] font-mono text-center leading-none transition-colors ${isDraggingRef ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-500'}`}>{t.addRef}</span>
                     <input
                       type="file"
                       ref={fileInputRef}
                       onChange={handleRefImageSelect}
                       multiple
                       accept="image/*"
                       className="hidden"
                     />
                   </label>

                   {/* Previews */}
                   {refPreviews.map((url, idx) => (
                     <div key={idx} className="relative w-20 h-20 group animate-in fade-in zoom-in duration-200">
                        <img src={url} alt="Ref" className="w-full h-full object-cover rounded-lg border border-slate-700" />
                        <button
                          onClick={() => removeRefImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                     </div>
                   ))}
                </div>

                {/* Reference Modes */}
                {refImages.length > 0 && (
                    <div className="w-full mt-4 space-y-3">
                        <label className={`flex items-start space-x-3 cursor-pointer group p-2 rounded-lg border transition-all ${maintainSubject ? 'bg-slate-800/80 border-cyan-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}>
                            <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${maintainSubject ? 'bg-cyan-600 border-cyan-500' : 'bg-slate-900 border-slate-600'}`}>
                                {maintainSubject && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={maintainSubject} 
                                onChange={(e) => setMaintainSubject(e.target.checked)} 
                            />
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-mono font-bold mb-0.5 transition-colors ${maintainSubject ? 'text-cyan-400' : 'text-slate-300'}`}>{t.productIntegrity}</span>
                            </div>
                        </label>

                        <label className={`flex items-start space-x-3 cursor-pointer group p-2 rounded-lg border transition-all ${replaceProduct ? 'bg-slate-800/80 border-purple-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-600'} ${!maintainSubject ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${replaceProduct ? 'bg-purple-600 border-purple-500' : 'bg-slate-900 border-slate-600'}`}>
                                {replaceProduct && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={replaceProduct} 
                                onChange={(e) => setReplaceProduct(e.target.checked)} 
                                disabled={!maintainSubject}
                            />
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-mono font-bold mb-0.5 transition-colors ${replaceProduct ? 'text-purple-400' : 'text-slate-300'}`}>{t.replaceProduct}</span>
                            </div>
                        </label>
                    </div>
                )}
            </div>

            {/* Composition Reference Section */}
            <div>
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-mono text-cyan-500">{t.compRef}</label>
                   <span className="text-[10px] text-slate-500 font-mono">{t.optional}</span>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                         {/* Upload Button (Drag Zone) */}
                         <label
                           onDragOver={handleCompDragOver}
                           onDragLeave={handleCompDragLeave}
                           onDrop={handleCompDrop}
                           className={`
                             w-20 h-20 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center group flex-shrink-0 cursor-pointer
                             ${isDraggingComp
                               ? 'border-cyan-500 bg-cyan-500/10 scale-105 shadow-lg shadow-cyan-500/20' 
                               : compImage 
                                 ? 'border-cyan-500 bg-cyan-900/10' 
                                 : 'border-slate-700 bg-slate-950 hover:bg-slate-900 hover:border-cyan-500'}
                           `}
                         >
                           <svg className={`w-6 h-6 mb-1 transition-colors ${isDraggingComp ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                           </svg>
                           <span className={`text-[9px] font-mono text-center leading-none transition-colors ${isDraggingComp ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-500'}`}>{compImage ? 'CHANGE' : 'ADD'}</span>
                           <input
                             type="file"
                             ref={compInputRef}
                             onChange={handleCompImageSelect}
                             accept="image/*"
                             className="hidden"
                           />
                         </label>

                         {compPreview && (
                            <div className="relative w-20 h-20 group flex-shrink-0 animate-in fade-in zoom-in duration-200">
                                <img src={compPreview} alt="Comp Ref" className="w-full h-full object-cover rounded-lg border border-cyan-500/50" />
                                <button
                                  onClick={removeCompImage}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                         )}

                         {compImage && (
                             <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-400 font-mono leading-tight mb-2">
                                  {t.compRefDesc}
                                </p>
                             </div>
                         )}
                    </div>

                    {/* Slider for Strength */}
                    {compImage && (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                             <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-mono text-cyan-400 font-bold">{t.strength}</label>
                                <span className="text-[10px] font-mono text-slate-300">{compStrength}%</span>
                             </div>
                             <input 
                               type="range" 
                               min="0" 
                               max="100" 
                               value={compStrength} 
                               onChange={(e) => setCompStrength(Number(e.target.value))}
                               className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none"
                             />
                             <div className="flex justify-between mt-1 text-[9px] text-slate-600 font-mono">
                                <span>LOOSE</span>
                                <span>BALANCED</span>
                                <span>STRICT</span>
                             </div>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Aspect Ratio / Dimensions Selector */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-mono text-cyan-500">{t.dimensions}</label>
              <div className="flex bg-slate-950 rounded p-1 border border-slate-800">
                <button
                  onClick={() => setIsCustomRatio(false)}
                  className={`px-3 py-1 text-xs font-mono rounded ${!isCustomRatio ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t.presets}
                </button>
                <button
                  onClick={() => setIsCustomRatio(true)}
                  className={`px-3 py-1 text-xs font-mono rounded ${isCustomRatio ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t.custom}
                </button>
              </div>
            </div>

            {!isCustomRatio ? (
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`
                      flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-xs font-mono
                      ${aspectRatio === ratio.value 
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}
                    `}
                  >
                    <span className="mb-1 block">{ratio.label}</span>
                    <div className={`border border-current rounded-sm
                      ${ratio.value === '1:1' ? 'w-4 h-4' : ''}
                      ${ratio.value === '4:3' || ratio.value === '3:2' ? 'w-5 h-4' : ''}
                      ${ratio.value === '16:9' || ratio.value === '21:9' ? 'w-6 h-3' : ''}
                      ${ratio.value === '3:4' || ratio.value === '2:3' ? 'w-3 h-5' : ''}
                      ${ratio.value === '9:16' ? 'w-3 h-6' : ''}
                    `}></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4">
                 <div className="flex-1 w-full">
                    <label className="text-xs text-slate-500 font-mono mb-1 block">{t.width}</label>
                    <input 
                      type="number" 
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                 </div>
                 <div className="text-slate-600 font-mono pt-4">X</div>
                 <div className="flex-1 w-full">
                    <label className="text-xs text-slate-500 font-mono mb-1 block">{t.height}</label>
                    <input 
                      type="number" 
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                 </div>
                 <div className="text-xs text-slate-500 font-mono pt-4 sm:ml-4">
                    {t.closestRatio}: <span className="text-cyan-400">{getClosestRatio(customWidth, customHeight)}</span>
                 </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
               <span className="text-xs text-slate-500 font-mono">{t.quantity}</span>
               <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                 {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      onClick={() => setImageCount(num)}
                      className={`w-8 h-8 rounded text-sm font-mono transition-all ${
                        imageCount === num 
                        ? 'bg-cyan-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                 ))}
               </div>
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {isGenerating ? t.generating : t.generate}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-center font-mono text-sm">
          {error}
        </div>
      )}

      {/* Gallery Header & Clear Button */}
      {generatedImages.length > 0 && (
        <div className="flex justify-between items-center border-b border-slate-800 pb-2 mt-8">
           <h3 className="text-slate-200 font-mono text-sm">{TRANSLATIONS[language].analyze.sessionGallery} ({generatedImages.length})</h3>
           <button 
             onClick={handleClearGallery}
             className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1"
           >
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             {t.clear}
           </button>
        </div>
      )}

      {(isGenerating || generatedImages.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isGenerating && Array.from({length: imageCount}).map((_, i) => (
             <div key={`loading-${i}`} className={`bg-slate-900 rounded-xl border border-slate-700 animate-pulse flex flex-col items-center justify-center overflow-hidden relative aspect-square`}>
               <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4 relative z-10"></div>
               <p className="text-cyan-500 font-mono text-xs relative z-10">{t.processing}_{i+1}...</p>
               <div className="absolute inset-0 opacity-10" 
                    style={{backgroundImage: 'linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
               </div>
             </div>
          ))}

          {generatedImages.map((img, idx) => (
            <div 
              key={`img-${idx}`} 
              className="group relative rounded-xl overflow-hidden border border-slate-700 cursor-pointer shadow-2xl bg-black aspect-square"
              onClick={() => onViewImage(img.url, img.prompt)}
            >
              <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors pointer-events-none z-10"></div>
              <img src={img.url} alt={`Generated ${idx}`} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-mono px-2 py-1 rounded backdrop-blur-sm opacity-50 group-hover:opacity-100 transition-opacity">
                #{generatedImages.length - idx}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <p className="text-white text-xs font-mono">{t.clickToEnlarge}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
