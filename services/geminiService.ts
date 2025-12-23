
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

const getBaseUrl = (): string | undefined => {
    const storedUrl = localStorage.getItem('gemini_base_url');
    return storedUrl && storedUrl.trim().length > 0 ? storedUrl : undefined;
};

const getApiKey = async (requireKeySelection: boolean): Promise<string | undefined> => {
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey && storedKey.trim().length > 0) return storedKey;
  if (window.aistudio) {
    if (requireKeySelection) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) { try { await window.aistudio.openSelectKey(); } catch (e) {} }
    }
    return process.env.API_KEY;
  }
  return process.env.API_KEY;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 格式化 API 错误信息
 */
const formatError = (error: any): string => {
  const msg = error?.message || String(error);
  
  // 识别配额超出 (429 Quota Exceeded)
  if (msg.includes('429') || msg.includes('Quota') || msg.includes('limit: 0') || msg.includes('RESOURCE_EXHAUSTED')) {
    return "API 配额已耗尽或触发频率限制。请稍后再试，或在设置中更换 API Key。 (Error 429: Quota Exceeded)";
  }
  
  // 识别服务不可用 (503)
  if (msg.includes('503') || msg.includes('Service Unavailable')) {
    return "Gemini 服务暂时不可用，请稍后重试。 (Error 503: Service Unavailable)";
  }

  // 识别安全过滤 (Safety)
  if (msg.includes('SAFETY') || msg.includes('blocked')) {
    return "请求被安全过滤器拦截，请尝试调整提示词。 (Blocked by Safety Filters)";
  }

  // 识别无效密钥 (401/403)
  if (msg.includes('401') || msg.includes('403') || msg.includes('API_KEY_INVALID')) {
    return "API Key 无效或权限不足，请检查设置。 (Error 401/403: Invalid API Key)";
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
      
      // 如果是明确的配额耗尽（limit: 0），不需要重试，直接抛出
      if (msg.includes('limit: 0') || msg.includes('Quota exceeded')) {
        throw new Error(formatError(error));
      }

      // 仅针对频率限制或临时服务错误进行指数退避重试
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
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);
  const imagePart = await fileToGenerativePart(imageFile);
  const instruction = includeCopywriting ? `[COPYWRITING MODE: ENABLED]` : `[COPYWRITING MODE: DISABLED]`;

  return retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [imagePart, { text: `Analyze this image and generate the prompt.\n${instruction}` }] },
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.4 },
      });
      return response.text || "";
  });
};

export const modifyPromptSubject = async (originalPrompt: string, newSubject: string): Promise<string> => {
  const apiKey = await getApiKey(false);
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);

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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
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
  if (modelName === 'nano-banana-2') {
      const baseUrl = getBaseUrl();
      const apiKey = await getApiKey(false);
      if (!apiKey || !baseUrl) throw new Error("代理 Nano 模型需要配置 API Key 和 Base URL。");
      let cleanBaseUrl = baseUrl.replace(/\/v1beta\/?$/, '').replace(/\/$/, '');
      const endpoint = `${cleanBaseUrl}/v1/images/generations`;
      const refImages = [...productReferenceImages, ...characterReferenceImages];
      const b64Images = await Promise.all(refImages.map(img => fileToBase64(img)));
      const validImages: string[] = [];
      for (let i = 0; i < count; i++) {
           const result = await retryOperation(async () => {
              const res = await fetch(endpoint, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                 body: JSON.stringify({ model: 'nano-banana-2', prompt: promptText, aspect_ratio: aspectRatio, image_size: imageSize, image: b64Images.length > 0 ? b64Images : undefined })
              });
              if (!res.ok) {
                  const errData = await res.json();
                  throw new Error(errData?.error?.message || "Nano API request failed");
              }
              const data = await res.json();
              return data.data?.[0]?.url;
           });
           if (result) validImages.push(result);
      }
      return validImages;
  }
  
  const apiKey = await getApiKey(modelName === 'gemini-3-pro-image-preview');
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);
  const ratioMap: Record<string, string> = { "1:1": "1:1", "4:3": "4:3", "3:4": "3:4", "16:9": "16:9", "9:16": "9:16" };
  const allParts: any[] = [{ text: promptText }];
  const validImages: string[] = [];
  const imageConfig: any = { aspectRatio: ratioMap[aspectRatio] || "1:1" };
  if (modelName === 'gemini-3-pro-image-preview' && imageSize) imageConfig.imageSize = imageSize;

  for (let i = 0; i < count; i++) {
     const result = await retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: modelName, 
            contents: { parts: allParts },
            config: { imageConfig }
        });
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        return part ? `data:${part.inlineData!.mimeType};base64,${part.inlineData!.data}` : null;
     });
     if (result) validImages.push(result);
  }
  return validImages;
};

export const generateImageModification = async (imageFile: File, promptText: string, count: number = 1): Promise<string[]> => {
  const apiKey = await getApiKey(false);
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);
  const imagePart = await fileToGenerativePart(imageFile);
  const validImages: string[] = [];
  for (let i = 0; i < count; i++) {
     const result = await retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, { text: promptText }] }
        });
        const p = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        return p ? `data:${p.inlineData!.mimeType};base64,${p.inlineData!.data}` : null;
     });
     if (result) validImages.push(result);
  }
  return validImages;
};
