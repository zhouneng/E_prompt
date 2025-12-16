
import React, { useState, useEffect, useCallback } from 'react';
import { UploadZone } from './UploadZone';
import { Button } from './Button';
import { generateImageModification } from '../services/geminiService';
import { Language, LightboxItem } from '../types';
import { TRANSLATIONS } from '../constants';

interface ImageToImageViewProps {
  onViewImage: (items: LightboxItem[], index: number) => void;
  language: Language;
}

export const ImageToImageView: React.FC<ImageToImageViewProps> = ({ onViewImage, language }) => {
  const t = TRANSLATIONS[language].img2img;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [imageCount, setImageCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<LightboxItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setGeneratedImages([]);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!selectedFile || !prompt.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const images = await generateImageModification(selectedFile, prompt, imageCount);
      const newImages = images.map(url => ({ 
        id: crypto.randomUUID(), 
        url, 
        prompt,
        title: "Modified Image",
        tags: ["Image-to-Image", "Gemini Flash"],
        timestamp: Date.now()
      }));
      setGeneratedImages(prev => [...newImages, ...prev]);
    } catch (e: any) {
      setError(e.message || "Failed to process image modification.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrompt("");
    setGeneratedImages([]);
    setError(null);
  };

  // --- Drag & Drop Logic for Replacement ---
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

  // Pass all generated images to lightbox so user can swipe between them
  const handleOpenLightbox = (index: number) => {
     onViewImage(generatedImages, index);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Column */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-800">{t.sourceImage}</h3>
          {!selectedFile ? (
            <div className="bg-white p-2 rounded-3xl border border-gray-100 shadow-soft">
               <UploadZone onFileSelect={handleFileSelect} language={language} />
            </div>
          ) : (
            <div 
                className={`bg-white p-2 rounded-3xl border transition-all relative group shadow-soft ${isDragging ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-100'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
               <div className="relative rounded-2xl overflow-hidden">
                 <img src={previewUrl!} alt="Source" className="w-full h-auto max-h-[400px] object-cover" />
                 
                 {/* Drag Overlay */}
                 {isDragging && (
                    <div className="absolute inset-0 bg-primary-500/20 z-10 flex items-center justify-center backdrop-blur-sm">
                       <p className="text-white font-bold text-lg drop-shadow-md">{t.dropToReplace || "Drop to Replace"}</p>
                    </div>
                 )}

                 {!isDragging && (
                     <button 
                       onClick={handleReset}
                       className="absolute top-2 right-2 bg-white text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors shadow-md z-20"
                     >
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                 )}
               </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-soft">
             <label className="block text-xs font-bold text-gray-500 mb-2">{t.modPrompt}</label>
             <textarea
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder={t.modPlaceholder}
               className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-colors mb-4 resize-none"
             />

             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-1">
                  {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        onClick={() => setImageCount(num)}
                        className={`w-8 h-8 rounded text-sm font-bold transition-all ${
                          imageCount === num 
                          ? 'bg-white text-primary-500 shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {num}
                      </button>
                  ))}
               </div>
               <Button 
                 onClick={handleGenerate} 
                 disabled={!selectedFile || !prompt.trim() || isGenerating}
                 className="w-full sm:w-auto"
               >
                 {isGenerating ? t.processing : t.generate}
               </Button>
             </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded-xl font-medium text-sm text-center border border-red-100">
              {error}
            </div>
          )}
        </div>

        {/* Output Column */}
        <div className="space-y-6">
           <h3 className="text-xl font-bold text-gray-800">Preview</h3>
           {isGenerating ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({length: imageCount}).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-50 rounded-2xl border border-gray-200 animate-pulse flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-300 rounded-full animate-spin mb-3"></div>
                    </div>
                  ))}
              </div>
           ) : generatedImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  {generatedImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="group relative rounded-2xl overflow-hidden border border-gray-100 cursor-pointer shadow-soft"
                      onClick={() => handleOpenLightbox(idx)}
                    >
                      <img src={img.url} alt={`Modified ${idx}`} className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
              </div>
           ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 bg-white">
                 <svg className="w-16 h-16 opacity-30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <p className="font-medium text-sm">{t.outputPreview}</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
