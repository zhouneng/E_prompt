
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
  nodeTitle: string;
  displayNodeTitle?: string; // 用户自定义的节点显示名称
  fieldName: string;
  displayFieldName?: string; // 用户自定义的字段显示名称
  fieldValue: string;
  originalValue: string;
}

export interface RHPreset {
  id: string;
  name: string;
  workflowId: string;
  nodeList: RHNodeInfo[];
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
