
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

/**
 * 获取用户配置的代理地址
 */
const getBaseUrl = (): string | undefined => {
    const storedUrl = localStorage.getItem('gemini_base_url');
    return storedUrl && storedUrl.trim().length > 0 ? storedUrl : undefined;
};

/**
 * 获取 API Key。优先使用 localStorage 中的 Key，
 * 如果没有则使用环境注入的 process.env.API_KEY。
 */
const getApiKey = async (requireKeySelection: boolean): Promise<string | undefined> => {
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey && storedKey.trim().length > 0) return storedKey;

  // 对于 Pro 模型且在特定环境下，尝试调起官方选密钥弹窗
  if (requireKeySelection && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      try { await window.aistudio.openSelectKey(); } catch (e) {}
    }
  }
  
  return process.env.API_KEY;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 格式化 API 错误信息
 */
const formatError = (error: any): string => {
  const msg = error?.message || String(error);
  
  if (msg.includes('429') || msg.includes('Quota') || msg.includes('limit: 0') || msg.includes('RESOURCE_EXHAUSTED')) {
    return "API 配额已耗尽或触发频率限制。请稍后再试，或在设置中检查您的 API Key/代理设置。 (Error 429: Quota Exceeded)";
  }
  
  if (msg.includes('503') || msg.includes('Service Unavailable')) {
    return "Gemini 服务暂时不可用，请稍后重试。 (Error 503: Service Unavailable)";
  }

  if (msg.includes('SAFETY') || msg.includes('blocked')) {
    return "请求被安全过滤器拦截，请尝试调整提示词。 (Blocked by Safety Filters)";
  }

  if (msg.includes('401') || msg.includes('403') || msg.includes('API_KEY_INVALID') || msg.includes('Requested entity was not found')) {
    return "API Key 无效或权限不足，请在设置中检查。 (Error 401/403: Invalid API Key)";
  }

  return msg;
};

async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 2, baseDelay: number = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try { 
      return await operation(); 
    } catch (error: any) {
      lastError = error;
      const msg = error.message || "";
      if (msg.includes('limit: 0') || msg.includes('Quota exceeded')) {
        throw new Error(formatError(error));
      }
      if (msg.includes('429') || msg.includes('503') || msg.includes('RESOURCE_EXHAUSTED')) {
        await delay(baseDelay * Math.pow(2, i));
        continue;
      }
      throw new Error(formatError(error));
    }
  }
  throw new Error(formatError(lastError));
}

const fileToGenerativePart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) img.src = e.target.result as string; };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > 1536 || height > 1536) {
        const r = Math.min(1536/width, 1536/height);
        width *= r; height *= r;
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve({ inlineData: { data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' } });
    };
    reader.readAsDataURL(file);
  });
};

export const generateImagePrompt = async (imageFile: File, includeCopywriting: boolean = false): Promise<string> => {
  const apiKey = await getApiKey(false);
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);
  const imagePart = await fileToGenerativePart(imageFile);
  const instruction = includeCopywriting ? `[COPYWRITING MODE: ENABLED]` : `[COPYWRITING MODE: DISABLED]`;

  return retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, { text: `Analyze this image and generate the prompt.\n${instruction}` }] },
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.4 },
      });
      return response.text || "";
  });
};

export const modifyPromptSubject = async (originalPrompt: string, newSubject: string): Promise<string> => {
  const apiKey = await getApiKey(false);
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);

  const editInstruction = `
    ROLE: World-Class Visual Prompt Editor.
    TASK: Precisely swap the main subject of a prompt while keeping the entire visual DNA intact.
    GUIDELINES: Replace subject while keeping style/technical DNA. Output in ## English Prompt and ## Chinese Prompt formats.
  `;

  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [{ text: `Original Prompt:\n${originalPrompt}\n\nModification Request: Change the main subject to "${newSubject}"` }] }
      ],
      config: { systemInstruction: editInstruction, temperature: 0.3 }
    });
    return response.text || "";
  });
};

export const generateImagesFromPrompt = async (
  promptText: string, 
  count: number = 1,
  aspectRatio: string = "1:1",
  productReferenceImages: File[] = [],
  characterReferenceImages: File[] = [],
  characterMode: 'FACE_ID' | 'HEAD_ID' | 'FULL_BODY' = 'FULL_BODY',
  modelName: string = 'gemini-2.5-flash-image',
  strictProductConsistency: boolean = true,
  imageSize?: '1K' | '2K' | '4K'
): Promise<string[]> => {
  let effectiveModel = modelName === 'nano-banana-2' ? 'gemini-2.5-flash-image' : modelName;
  if (imageSize === '2K' || imageSize === '4K') {
    effectiveModel = 'gemini-3-pro-image-preview';
  }

  const isPro = effectiveModel === 'gemini-3-pro-image-preview' || effectiveModel.startsWith('imagen-');
  const apiKey = await getApiKey(isPro);
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);
  
  const ratioMap: Record<string, string> = { "1:1": "1:1", "4:3": "4:3", "3:4": "3:4", "16:9": "16:9", "9:16": "9:16" };
  const validImages: string[] = [];
  const imageConfig: any = { aspectRatio: ratioMap[aspectRatio] || "1:1" };
  if (effectiveModel === 'gemini-3-pro-image-preview' && imageSize) {
    imageConfig.imageSize = imageSize;
  }

  if (effectiveModel.startsWith('imagen-')) {
    for (let i = 0; i < count; i++) {
        const result = await retryOperation(async () => {
            const response = await ai.models.generateImages({
                model: effectiveModel,
                prompt: promptText,
                config: { numberOfImages: 1, aspectRatio: imageConfig.aspectRatio as any }
            });
            const b64 = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${b64}`;
        });
        if (result) validImages.push(result);
    }
    return validImages;
  }

  const refParts: any[] = [];
  for (const file of [...productReferenceImages, ...characterReferenceImages]) {
      const b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      refParts.push({ inlineData: { data: b64, mimeType: file.type } });
  }

  for (let i = 0; i < count; i++) {
     const result = await retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: effectiveModel, 
            contents: { parts: [...refParts, { text: promptText }] },
            config: { imageConfig }
        });
        
        for (const candidate of (response.candidates || [])) {
          for (const part of (candidate.content?.parts || [])) {
            if (part.inlineData) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
        return null;
     });
     if (result) validImages.push(result);
  }
  return validImages;
};

export const generateImageModification = async (imageFile: File, promptText: string, count: number = 1): Promise<string[]> => {
  const apiKey = await getApiKey(false);
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);
  const imagePart = await fileToGenerativePart(imageFile);
  const validImages: string[] = [];

  for (let i = 0; i < count; i++) {
     const result = await retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, { text: promptText }] }
        });
        
        for (const candidate of (response.candidates || [])) {
          for (const part of (candidate.content?.parts || [])) {
            if (part.inlineData) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
        return null;
     });
     if (result) validImages.push(result);
  }
  return validImages;
};
