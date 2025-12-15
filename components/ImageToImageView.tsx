
import React, { useState, useEffect } from 'react';
import { UploadZone } from './UploadZone';
import { Button } from './Button';
import { generateImageModification } from '../services/geminiService';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface GeneratedImage {
  url: string;
  prompt: string;
}

interface ImageToImageViewProps {
  onViewImage: (url: string, prompt: string) => void;
  language: Language;
}

export const ImageToImageView: React.FC<ImageToImageViewProps> = ({ onViewImage, language }) => {
  const t = TRANSLATIONS[language].img2img;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [imageCount, setImageCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      const newImages = images.map(url => ({ url, prompt }));
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-100 font-mono tracking-wider">{t.title}</h2>
        <p className="text-slate-400 text-sm mt-2">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Column */}
        <div className="space-y-6">
          {!selectedFile ? (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700">
               <h3 className="text-sm font-mono text-cyan-500 mb-4">{t.sourceImage}</h3>
               <UploadZone onFileSelect={handleFileSelect} language={language} />
            </div>
          ) : (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 relative group">
               <h3 className="text-sm font-mono text-cyan-500 mb-4">{t.sourceImage}</h3>
               <div className="relative rounded-lg overflow-hidden border border-slate-800">
                 <img src={previewUrl!} alt="Source" className="w-full h-auto max-h-[400px] object-cover" />
                 <button 
                   onClick={handleReset}
                   className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-500/80 text-white p-2 rounded-full transition-colors"
                 >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
            </div>
          )}

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700">
             <label className="block text-xs font-mono text-cyan-500 mb-2">{t.modPrompt}</label>
             <textarea
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder={t.modPlaceholder}
               className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 focus:border-cyan-500 focus:outline-none transition-colors mb-4"
             />

             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-500 font-mono">{t.count}</span>
                  <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                    {[1, 2, 3, 4].map(num => (
                        <button
                          key={num}
                          onClick={() => setImageCount(num)}
                          className={`w-8 h-8 rounded text-sm font-mono transition-all ${
                            imageCount === num 
                            ? 'bg-cyan-600 text-white' 
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
                 disabled={!selectedFile || !prompt.trim() || isGenerating}
                 className="w-full sm:w-auto"
               >
                 {isGenerating ? t.processing : t.generate}
               </Button>
             </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg font-mono text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Output Column */}
        <div className="space-y-6">
           {isGenerating ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({length: imageCount}).map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-900 rounded-xl border border-slate-700 animate-pulse flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-3"></div>
                      <p className="text-cyan-500 font-mono text-xs">GENERATING_{i+1}...</p>
                    </div>
                  ))}
              </div>
           ) : generatedImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  {generatedImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="group relative rounded-xl overflow-hidden border border-slate-700 cursor-pointer bg-black"
                      onClick={() => onViewImage(img.url, img.prompt)}
                    >
                      <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors pointer-events-none z-10"></div>
                      <img src={img.url} alt={`Modified ${idx}`} className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
              </div>
           ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600">
                 <svg className="w-16 h-16 opacity-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <p className="font-mono text-sm">{t.outputPreview}</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
