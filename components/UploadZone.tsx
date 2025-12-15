
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
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
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
          border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 bg-white
          ${isDragging 
            ? 'border-primary-400 bg-primary-50 scale-[1.02]' 
            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className={`p-4 rounded-full bg-gray-50 mb-4 transition-transform ${isDragging ? 'scale-110' : ''} text-primary-500`}>
             <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="mb-2 text-xl font-bold text-gray-700">
            {t.uploadTitle}
          </p>
          <p className="text-sm text-gray-400">
            {t.uploadSubtitle}
          </p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleInputChange} 
        />
      </label>
    </div>
  );
};
