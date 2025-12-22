
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { generateImagesFromPrompt } from '../services/geminiService';
import { Language, LightboxItem } from '../types';
import { TRANSLATIONS } from '../constants';
import { ModelCard } from './GenerationCommon';

interface ReferenceToImageViewProps {
  onViewImage: (items: LightboxItem[], index: number) => void;
  language: Language;
}

export const ReferenceToImageView: React.FC<ReferenceToImageViewProps> = ({ onViewImage, language }) => {
  const t = TRANSLATIONS[language].ref2img;
  const tCommon = TRANSLATIONS[language].txt2img;
  
  const [prompt, setPrompt] = useState("");
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  
  const [selectedModel, setSelectedModel] = useState<'STANDARD' | 'PRO' | 'NANO'>('NANO');
  const [selectedResolution, setSelectedResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [imageCount, setImageCount] = useState<number>(1);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<LightboxItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (refPreview) URL.revokeObjectURL(refPreview);
    };
  }, [refPreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setRefImage(file);
      const url = URL.createObjectURL(file);
      setRefPreview(url);
    }
  };

  const handleCreate = async () => {
    if (!prompt.trim() && !refImage) return;
    setIsGenerating(true);
    setError(null);

    let modelId = 'gemini-2.5-flash-image';
    if (selectedModel === 'PRO') modelId = 'gemini-3-pro-image-preview';
    if (selectedModel === 'NANO') modelId = 'nano-banana-2';

    try {
      const products = refImage ? [refImage] : [];
      const images = await generateImagesFromPrompt(
          prompt, 
          imageCount, 
          aspectRatio, 
          products, 
          [], 
          'FULL_BODY', 
          modelId, 
          true,
          selectedResolution
      );
      
      const newItems: LightboxItem[] = images.map(url => ({ 
        id: crypto.randomUUID(),
        url, 
        prompt: prompt,
        title: "Reference Gen",
        model: selectedModel,
        ratio: aspectRatio,
        tags: ['Reference-to-Image'],
        timestamp: Date.now()
      }));

      setGallery(prev => [...newItems, ...prev]);

    } catch (e: any) {
      setError(e.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeImage = gallery.length > 0 ? gallery[0] : null;

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-full min-h-[800px] bg-[#1a1c22] rounded-3xl overflow-hidden border border-gray-800 shadow-2xl">
      
      {/* LEFT SIDEBAR: CONTROLS */}
      <div className="w-full lg:w-[400px] flex flex-col bg-[#111318] border-r border-gray-800 p-6 overflow-y-auto no-scrollbar">
        
        {/* Toggle-like header (Decorative based on screenshot) */}
        <div className="flex bg-[#2c2f38] p-1 rounded-xl mb-6">
           <button className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#3d414d] text-white shadow-sm">{t.title}</button>
           <button className="flex-1 py-2 text-xs font-bold rounded-lg text-gray-500 hover:text-gray-300 transition-colors" disabled>{language === 'CN' ? '文生图片' : 'Text-to-Image'}</button>
        </div>

        {/* Reference Image Container */}
        <div className="bg-[#1a1c22] rounded-2xl p-4 mb-6 border border-gray-800/50">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-200">{t.refLabel}</h3>
              <div className="flex gap-2">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="text-[10px] bg-[#2c2f38] text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-[#3d414d] transition-colors"
                 >
                   + {language === 'CN' ? '图片' : 'Image'}
                 </button>
                 <button className="text-[10px] bg-[#2c2f38] text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-[#3d414d] transition-colors" disabled>
                   {language === 'CN' ? '主体库' : 'Assets'}
                 </button>
              </div>
           </div>
           
           <div 
             className="relative aspect-video rounded-xl border-2 border-dashed border-gray-700 bg-[#111318] flex items-center justify-center cursor-pointer group overflow-hidden"
             onClick={() => fileInputRef.current?.click()}
           >
              {refPreview ? (
                  <img src={refPreview} alt="Ref" className="w-full h-full object-cover" />
              ) : (
                  <div className="text-center p-4">
                     <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     <p className="text-[10px] text-gray-500 leading-tight">{t.refHint}</p>
                  </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
           </div>
        </div>

        {/* Prompt Input */}
        <div className="mb-6">
           <textarea 
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
             placeholder={t.promptLabel}
             className="w-full h-40 bg-[#1a1c22] border border-gray-800 rounded-2xl p-4 text-xs text-gray-300 focus:outline-none focus:border-primary-500/50 resize-none transition-colors"
           />
        </div>

        {/* Secondary Controls Grid */}
        <div className="space-y-4">
           {/* Model Dropdown */}
           <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t.model}</span>
              <div className="flex gap-1">
                 {['STANDARD', 'PRO', 'NANO'].map(m => (
                    <button 
                      key={m} 
                      onClick={() => setSelectedModel(m as any)}
                      className={`px-2 py-1 text-[10px] rounded border transition-all ${selectedModel === m ? 'bg-primary-500/10 border-primary-500 text-primary-400' : 'bg-[#1a1c22] border-gray-800 text-gray-600 hover:border-gray-700'}`}
                    >
                      {m === 'STANDARD' ? 'Flash' : (m === 'PRO' ? 'Pro' : 'Nano')}
                    </button>
                 ))}
              </div>
           </div>

           {/* Quality Selector */}
           <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t.quality}</span>
              <select 
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
                className="bg-[#1a1c22] border border-gray-800 rounded-lg text-[10px] text-gray-300 px-3 py-1 focus:outline-none"
              >
                 <option value="1K">1080p (1K)</option>
                 <option value="2K">2K</option>
                 <option value="4K">4K</option>
              </select>
           </div>

           {/* Aspect Ratio */}
           <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t.ratio}</span>
              <select 
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="bg-[#1a1c22] border border-gray-800 rounded-lg text-[10px] text-gray-300 px-3 py-1 focus:outline-none"
              >
                 <option value="1:1">1:1 Square</option>
                 <option value="16:9">16:9 Landscape</option>
                 <option value="9:16">9:16 Portrait</option>
                 <option value="4:3">4:3 TV</option>
                 <option value="3:4">3:4 Photo</option>
              </select>
           </div>

           {/* Quantity */}
           <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t.quantity}</span>
              <div className="flex bg-[#2c2f38] p-0.5 rounded-lg">
                 {[1, 2, 3, 4].map(num => (
                    <button 
                      key={num} 
                      onClick={() => setImageCount(num)}
                      className={`w-8 py-1 text-[10px] font-bold rounded-md transition-all ${imageCount === num ? 'bg-[#3d414d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {num}
                    </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Create Button */}
        <div className="mt-auto pt-6">
           <Button 
             onClick={handleCreate}
             disabled={isGenerating || (!prompt.trim() && !refImage)}
             isLoading={isGenerating}
             className="w-full h-12 bg-gray-800 text-white border-none hover:bg-gray-700 font-bold rounded-xl"
           >
             {t.create}
           </Button>
           {error && <p className="mt-2 text-[10px] text-red-500 text-center">{error}</p>}
        </div>
      </div>

      {/* RIGHT CONTENT AREA: PREVIEW */}
      <div className="flex-1 bg-[#1a1c22] flex flex-col relative">
         
         {/* Top Meta info (Decorative based on screenshot) */}
         <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
            <input type="checkbox" className="w-4 h-4 rounded bg-[#2c2f38] border-gray-700" />
            <span className="text-xs text-gray-400">{language === 'CN' ? '进行中' : 'In Progress'}</span>
         </div>

         {/* Main Viewport */}
         <div className="flex-1 flex flex-col items-center justify-center p-12">
            {isGenerating ? (
               <div className="flex flex-col items-center animate-in fade-in duration-300">
                  <div className="w-16 h-16 border-4 border-gray-800 border-t-primary-500 rounded-full animate-spin mb-6"></div>
                  <p className="text-gray-500 text-sm animate-pulse tracking-widest">{t.generating}</p>
               </div>
            ) : activeImage ? (
               <div className="relative group max-w-full max-h-full">
                  <img 
                    src={activeImage.url} 
                    alt="Result" 
                    className="max-w-full max-h-[600px] object-contain rounded-2xl shadow-2xl cursor-pointer"
                    onClick={() => onViewImage(gallery, 0)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-2xl flex items-center justify-center pointer-events-none">
                     <span className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                        {language === 'CN' ? '点击查看大图' : 'View Full Image'}
                     </span>
                  </div>
               </div>
            ) : (
               <div className="text-center opacity-50 space-y-4 flex flex-col items-center">
                  {/* Decorative placeholder svg from screenshot vibe */}
                  <div className="w-48 h-48 relative mb-4">
                     <svg className="w-full h-full text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-gray-600 text-sm">{t.emptyState}</p>
               </div>
            )}
         </div>

         {/* Bottom Gallery (If session has history) */}
         {gallery.length > 1 && (
            <div className="p-6 bg-[#111318]/50 border-t border-gray-800">
               <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {gallery.map((item, idx) => (
                     <div 
                       key={item.id} 
                       onClick={() => onViewImage(gallery, idx)}
                       className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden border cursor-pointer transition-all ${idx === 0 ? 'border-primary-500 scale-105 shadow-glow' : 'border-gray-800 hover:border-gray-600'}`}
                     >
                        <img src={item.url} className="w-full h-full object-cover" alt="prev" />
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>
    </div>
  );
};
