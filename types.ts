
export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface AnalysisResult {
  prompt: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
}

export interface ErrorState {
  message: string;
}

export type Language = 'EN' | 'CN' | 'RU';

export interface LightboxItem {
  id: string;
  url: string;
  prompt?: string;
  title?: string;     // e.g. "Christmas Portrait"
  model?: string;     // e.g. "Gemini Flash"
  ratio?: string;     // e.g. "3:4"
  tags?: string[];    // e.g. ["Photography", "Portrait"]
  timestamp?: number;
}

// Add global window type for AI Studio integration
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
