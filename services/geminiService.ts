
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

async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3, baseDelay: number = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try { return await operation(); } catch (error: any) {
      lastError = error;
      const msg = error.message || "";
      if (msg.includes('429') || msg.includes('503') || msg.includes('Quota')) {
        await delay(baseDelay * Math.pow(2, i));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
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

/**
 * Optimized Subject Swap Service
 */
export const modifyPromptSubject = async (originalPrompt: string, newSubject: string): Promise<string> => {
  const apiKey = await getApiKey(false);
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);

  const editInstruction = `
    ROLE: World-Class Visual Prompt Editor.
    TASK: Precisely swap the main subject of a prompt while keeping the entire visual DNA intact.
    
    GUIDELINES:
    1. CATEGORY IDENTIFICATION: Identify the category of "${newSubject}" (e.g., electronic device, person, mythical creature).
    2. SURGICAL SWAP: Replace the original subject (and its specific adjectives like "metallic projector") with "${newSubject}" and its appropriate high-end visual descriptors.
    3. DNA PRESERVATION: Keep the background, lighting (e.g., "sunset glow"), camera specs (e.g., "85mm f/1.8"), color grading, and technical quality keywords exactly as they are.
    4. LOGICAL COHERENCE: If the original subject was "on a wooden desk," the new subject should still be "on a wooden desk."
    
    OUTPUT FORMAT: Return both ## English Prompt and ## Chinese Prompt.
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
      if (!apiKey || !baseUrl) throw new Error("Proxy Nano model requires API Key and Base URL.");
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
        return response.candidates?.[0]?.content?.parts?.find(p => p.inlineData) ? `data:${response.candidates[0].content.parts.find(p => p.inlineData)!.inlineData!.mimeType};base64,${response.candidates[0].content.parts.find(p => p.inlineData)!.inlineData!.data}` : null;
     });
     if (result) validImages.push(result);
  }
  return validImages;
};

export const generateImageModification = async (imageFile: File, promptText: string, count: number = 1): Promise<string[]> => {
  const apiKey = await getApiKey(false);
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
