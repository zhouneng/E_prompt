
import { RHNodeInfo } from '../types';

const RH_HOST = "https://www.runninghub.cn";

const getRHApiKey = () => localStorage.getItem('runninghub_api_key') || '';

/**
 * 上传资源文件（图片、音频、视频）到 RunningHub
 * 严格遵循手册：fileType 为 'input'
 */
export const uploadRHFile = async (file: File): Promise<string> => {
  const apiKey = getRHApiKey();
  if (!apiKey) throw new Error("RunningHub API Key is missing. Please set it in Settings.");

  const formData = new FormData();
  formData.append('apiKey', apiKey);
  formData.append('fileType', 'input');
  formData.append('file', file);

  const response = await fetch(`${RH_HOST}/task/openapi/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (data.code !== 0) throw new Error(data.msg || "File upload failed");
  
  // 返回云端文件名，用于填入 nodeInfoList 的 fieldValue
  return data.data.fileName; 
};

/**
 * 提交工作流任务
 * 严格遵循手册：所有字段转为 String，nodeInfoList 包含 nodeId, fieldName, fieldValue
 */
export const submitRHTask = async (workflowId: string, nodeInfoList: RHNodeInfo[]): Promise<string> => {
  const apiKey = getRHApiKey();
  if (!apiKey) throw new Error("RunningHub API Key is missing.");

  // 预处理：RunningHub 严格要求所有值为字符串
  const sanitizedList = nodeInfoList.map(node => ({
    nodeId: String(node.nodeId),
    fieldName: String(node.fieldName),
    fieldValue: String(node.fieldValue)
  }));

  const response = await fetch(`${RH_HOST}/task/openapi/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      workflowId,
      nodeInfoList: sanitizedList
    })
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`[RH Error ${data.code}] ${data.msg}`);
  }
  
  return data.data.taskId;
};

/**
 * 轮询任务生成结果
 * code 0: 成功获取结果
 * code 804: 运行中
 * code 813: 排队中
 * code 805: 任务失败（手册指出需查看 failedReason）
 */
export const pollRHTaskOutputs = async (taskId: string): Promise<{ code: number; data: any; msg: string }> => {
  const apiKey = getRHApiKey();
  const response = await fetch(`${RH_HOST}/task/openapi/outputs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      taskId
    })
  });
  return await response.json();
};
