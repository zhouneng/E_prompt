
import React, { useCallback, useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  language?: Language;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, language = 'EN' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const t = TRANSLATIONS[language].analyze;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we are moving to a child element inside the container
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <label 
        className={`
          relative flex flex-col items-center justify-center w-full h-80 
          border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
          ${isDragging 
            ? 'border-cyan-500 bg-cyan-500/10 scale-[1.02]' 
            : 'border-slate-700 bg-slate-900 hover:border-cyan-500/50 hover:bg-slate-800'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className={`p-4 rounded-full bg-slate-800 mb-4 transition-transform ${isDragging ? 'scale-110' : ''}`}>
             <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="mb-2 text-xl font-medium text-slate-200">
            {t.uploadTitle}
          </p>
          <p className="text-sm text-slate-500">
            {t.uploadSubtitle}
          </p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleInputChange} 
        />
        
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-lg m-2"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-lg m-2"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-lg m-2"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/30 rounded-br-lg m-2"></div>
      </label>
    </div>
  );
};
