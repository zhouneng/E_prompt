
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
  title?: string;
  model?: string;
  ratio?: string;
  tags?: string[];
  timestamp?: number;
}

export interface RHNodeInfo {
  nodeId: string;
  nodeTitle: string; // 新增：显示节点名称，如 "提示词"
  fieldName: string;
  fieldValue: string;
  originalValue: string; // 用于判断是否被修改
}

export interface RHTask {
  taskId: string;
  workflowKey: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  progress: number;
  resultUrls: string[];
  timestamp: number;
  errorMsg?: string;
  startTime?: number;
  endTime?: number;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
