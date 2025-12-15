import React, { useState } from 'react';
import { Button } from './Button';
import { generateImagesFromPrompt } from '../services/geminiService';

interface TextToImageViewProps {
  onViewImage: (url: string) => void;
}

export const TextToImageView: React.FC<TextToImageViewProps> = ({ onViewImage }) => {
  const [prompt, setPrompt] = useState("");
  const [imageCount, setImageCount] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const aspectRatios = [
    { label: "1:1", value: "1:1", icon: "square" },
    { label: "4:3", value: "4:3", icon: "landscape" },
    { label: "3:4", value: "3:4", icon: "portrait" },
    { label: "16:9", value: "16:9", icon: "landscape-wide" },
    { label: "9:16", value: "9:16", icon: "portrait-tall" },
    // These will be mapped to nearest supported ratios in the service
    { label: "21:9", value: "21:9", icon: "cinema" },
    { label: "3:2", value: "3:2", icon: "photo" },
    { label: "2:3", value: "2:3", icon: "photo-portrait" },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImages([]);
    setError(null);

    try {
      const images = await generateImagesFromPrompt(prompt, imageCount, aspectRatio);
      setGeneratedImages(images);
    } catch (e: any) {
      setError(e.message || "Failed to generate images.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-100 font-mono tracking-wider">TEXT TO IMAGE</h2>
        <p className="text-slate-400 text-sm mt-2">Transform your concepts into visual reality.</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <div className="space-y-6">
          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-mono text-cyan-500 mb-2">PROMPT INPUT</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate in detail..."
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <label className="block text-xs font-mono text-cyan-500 mb-3">ASPECT RATIO / DIMENSIONS</label>
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
                  {/* Simple CSS shapes for icons */}
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
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
               <span className="text-xs text-slate-500 font-mono">QUANTITY</span>
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
              {isGenerating ? 'Synthesizing...' : 'Generate Images'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-center font-mono text-sm">
          {error}
        </div>
      )}

      {(isGenerating || generatedImages.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isGenerating ? (
            Array.from({length: imageCount}).map((_, i) => (
               <div key={i} className={`bg-slate-900 rounded-xl border border-slate-700 animate-pulse flex flex-col items-center justify-center overflow-hidden relative
                 ${aspectRatio === '1:1' ? 'aspect-square' : ''}
                 ${aspectRatio === '16:9' || aspectRatio === '21:9' ? 'aspect-video' : ''}
                 ${aspectRatio === '9:16' ? 'aspect-[9/16]' : ''}
                 ${aspectRatio === '4:3' || aspectRatio === '3:2' ? 'aspect-[4/3]' : ''}
                 ${aspectRatio === '3:4' || aspectRatio === '2:3' ? 'aspect-[3/4]' : ''}
               `}>
                 <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4 relative z-10"></div>
                 <p className="text-cyan-500 font-mono text-xs relative z-10">PROCESSING_REQUEST_{i+1}...</p>
                 {/* Grid effect background */}
                 <div className="absolute inset-0 opacity-10" 
                      style={{backgroundImage: 'linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                 </div>
               </div>
            ))
          ) : (
            generatedImages.map((url, idx) => (
              <div 
                key={idx} 
                className={`group relative rounded-xl overflow-hidden border border-slate-700 cursor-pointer shadow-2xl bg-black
                   ${aspectRatio === '1:1' ? 'aspect-square' : ''}
                   ${aspectRatio === '16:9' || aspectRatio === '21:9' ? 'aspect-video' : ''}
                   ${aspectRatio === '9:16' ? 'aspect-[9/16]' : ''}
                   ${aspectRatio === '4:3' || aspectRatio === '3:2' ? 'aspect-[4/3]' : ''}
                   ${aspectRatio === '3:4' || aspectRatio === '2:3' ? 'aspect-[3/4]' : ''}
                `}
                onClick={() => onViewImage(url)}
              >
                <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors pointer-events-none z-10"></div>
                <img src={url} alt={`Generated ${idx}`} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <p className="text-white text-xs font-mono">CLICK TO ENLARGE</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};