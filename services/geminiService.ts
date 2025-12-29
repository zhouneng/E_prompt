
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
 * 获取 API Key。
 */
const getApiKey = async (requireKeySelection: boolean): Promise<string | undefined> => {
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey && storedKey.trim().length > 0) return storedKey;

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
    return "API Quota Exceeded (429). The shared key is exhausted. Please click 'Settings' and enter your own Google Gemini API Key.";
  }
  if (msg.includes('503') || msg.includes('Service Unavailable')) {
    return "Gemini Service Unavailable (503). Please try again later.";
  }
  if (msg.includes('SAFETY') || msg.includes('blocked')) {
    return "Request blocked by safety filters. Please modify your image or prompt.";
  }
  return msg;
};

async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 2, baseDelay: number = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try { return await operation(); } catch (error: any) {
      lastError = error;
      const msg = error.message || "";
      // Don't retry if quota is exhausted (it won't fix itself in 2 seconds)
      if (msg.includes('limit: 0') || msg.includes('Quota exceeded') || msg.includes('429')) {
        throw new Error(formatError(error));
      }
      if (msg.includes('503') || msg.includes('RESOURCE_EXHAUSTED')) {
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
      if (width > 2048 || height > 2048) {
        const r = Math.min(2048/width, 2048/height);
        width *= r; height *= r;
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve({ inlineData: { data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1], mimeType: 'image/jpeg' } });
    };
    reader.readAsDataURL(file);
  });
};

export const generateImagePrompt = async (imageFile: File, includeCopywriting: boolean = false): Promise<string> => {
  const apiKey = await getApiKey(false); 
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);
  const imagePart = await fileToGenerativePart(imageFile);
  const copywritingHint = includeCopywriting ? `\n[ACTION: Also generate a catchy marketing copy based on this visual DNA]` : "";

  return retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: { 
          parts: [
            imagePart, 
            { text: `Reverse-engineer this image with extreme granular precision. Deconstruct its lighting, technical specs, and environment.${copywritingHint}` }
          ] 
        },
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.1, thinkingConfig: { thinkingBudget: 4096 } },
      });
      return response.text || "";
  });
};

export const modifyPromptSubject = async (originalPrompt: string, newSubject: string): Promise<string> => {
  const apiKey = await getApiKey(false);
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);
  const editInstruction = `ROLE: World-Class Visual Prompt Forensic Editor. TASK: Precisely swap the main subject of a prompt while surgically preserving the entire visual DNA (lighting, lens, style). Output strictly in ## English Prompt and ## Chinese Prompt formats.`;
  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Original DNA Prompt:\n${originalPrompt}\n\nModification Order: Surgically replace the main subject with "${newSubject}"` }] }],
      config: { systemInstruction: editInstruction, temperature: 0.2 }
    });
    return response.text || "";
  });
};

export interface TransferOptions {
  character: boolean;
  clothing: boolean;
  accessories: boolean;
  shoes: boolean;
  product: boolean;
  background: boolean;
}

export const transferVisualFeatures = async (
  originalPrompt: string, 
  refImage: File,
  options: TransferOptions
): Promise<string> => {
  const apiKey = await getApiKey(false);
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);
  const refPart = await fileToGenerativePart(refImage);

  const selectedTargets = [];
  if (options.character) selectedTargets.push("character traits (face, hair, body)");
  if (options.clothing) selectedTargets.push("clothing styles and fabric");
  if (options.accessories) selectedTargets.push("accessories and jewelry");
  if (options.shoes) selectedTargets.push("footwear");
  if (options.product) selectedTargets.push("product-specific details (branding, shape, materials)");
  if (options.background) selectedTargets.push("background/environment environment (location, landscape, setting)");

  const transferInstruction = `
    ROLE: Ultimate Forensic Visual DNA Transfuser.
    TASK: 
    1. Analyze the reference image for ONLY these features: ${selectedTargets.join(", ")}.
    2. If "background/environment" is requested, replace the original setting with the setting from the reference image, but MUST blend it naturally with the original prompt's lighting, mood, and camera perspective.
    3. Surgically replace selected elements in the "Original DNA Prompt" with these extracted features.
    4. PRESERVE EVERYTHING ELSE: The overall tone, cinematography, lighting quality, and artistic style of the original prompt must remain intact.
    5. Output strictly in ## English Prompt and ## Chinese Prompt formats.
  `;

  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          refPart,
          { text: `Original DNA Prompt:\n${originalPrompt}\n\nACTION: Extract specified features from this reference and transfuse them into the original prompt DNA.` }
        ]
      },
      config: { systemInstruction: transferInstruction, temperature: 0.1, thinkingConfig: { thinkingBudget: 4096 } }
    });
    return response.text || "";
  });
};

export const generateEcommercePlan = async (imageFile: File, style: string): Promise<string> => {
  const apiKey = await getApiKey(false);
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);
  const imagePart = await fileToGenerativePart(imageFile);
  const styleHint = style === 'auto' ? "AI-driven optimal aesthetic" : style;
  const planInstruction = `# ROLE: World-Class E-commerce Art Director. TASK: Create a high-fidelity 10-poster KV architecture for the product. DIRECTION: ${styleHint}. Output detailed strategies for 10 posters (Theme, Prompt, Copy).`;
  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [imagePart, { text: "Generate the 10-poster KV strategy." }] },
      config: { systemInstruction: planInstruction, temperature: 0.2, thinkingConfig: { thinkingBudget: 4096 } }
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
  if (imageSize === '2K' || imageSize === '4K') effectiveModel = 'gemini-3-pro-image-preview';
  const isPro = effectiveModel === 'gemini-3-pro-image-preview' || effectiveModel.startsWith('imagen-');
  const apiKey = await getApiKey(isPro);
  const ai = new GoogleGenAI({ apiKey: apiKey || '', baseUrl: getBaseUrl() } as any);
  const validImages: string[] = [];
  const imageConfig: any = { aspectRatio };
  if (effectiveModel === 'gemini-3-pro-image-preview' && imageSize) imageConfig.imageSize = imageSize;

  if (effectiveModel.startsWith('imagen-')) {
    for (let i = 0; i < count; i++) {
        const result = await retryOperation(async () => {
            const response = await ai.models.generateImages({ model: effectiveModel, prompt: promptText, config: { numberOfImages: 1, aspectRatio: imageConfig.aspectRatio as any } });
            return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
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
        const response = await ai.models.generateContent({ model: effectiveModel, contents: { parts: [...refParts, { text: promptText }] }, config: { imageConfig } });
        for (const candidate of (response.candidates || [])) {
          for (const part of (candidate.content?.parts || [])) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
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
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, { text: promptText }] } });
        for (const candidate of (response.candidates || [])) {
          for (const part of (candidate.content?.parts || [])) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
        return null;
     });
     if (result) validImages.push(result);
  }
  return validImages;
};
