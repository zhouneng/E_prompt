
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// Helper to get Base URL from local storage
const getBaseUrl = (): string | undefined => {
    const storedUrl = localStorage.getItem('gemini_base_url');
    // If storedUrl is empty or null, return undefined to let SDK use default
    return storedUrl && storedUrl.trim().length > 0 ? storedUrl : undefined;
};

// Helper to get API Key with support for AI Studio environment AND custom proxies
const getApiKey = async (requireKeySelection: boolean): Promise<string | undefined> => {
  // 1. Priority: User manually entered key in Settings (typically for Proxy usage)
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey && storedKey.trim().length > 0) {
      return storedKey;
  }

  // 2. Official AI Studio Flow (Only if no custom key is set)
  if (window.aistudio) {
    if (requireKeySelection) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
           try {
             await window.aistudio.openSelectKey();
           } catch (e) {
             console.error("Failed to select key via AI Studio", e);
           }
        }
    }
    return process.env.API_KEY;
  }

  // 3. Fallback to environment variable
  return process.env.API_KEY;
};

// --- ROBUST RETRY LOGIC ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const status = error.status || error.response?.status;
      const msg = error.message || "";
      const isRateLimit = status === 429 || msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED');
      const isServerOverload = status === 503 || msg.includes('503') || msg.includes('Overloaded');

      if (isRateLimit || isServerOverload) {
        let waitTime = 0;
        const retryMatch = msg.match(/retry in (\d+(\.\d+)?)s/);
        
        if (retryMatch && retryMatch[1]) {
           waitTime = (parseFloat(retryMatch[1]) * 1000) + 1000;
           console.warn(`[API] Server requested wait: ${Math.round(waitTime/1000)}s`);
        } else {
           waitTime = baseDelay * Math.pow(2, i) + (Math.random() * 1000);
        }

        console.warn(`[API] Retrying attempt ${i + 1}/${maxRetries} in ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
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
    reader.onload = (e) => {
      if (e.target?.result) img.src = e.target.result as string;
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = reject;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1536; 
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error("Canvas context failed")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ inlineData: { data: base64Data.split(',')[1], mimeType: 'image/jpeg' } });
      } catch (error) { reject(error); }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    reader.readAsDataURL(file);
  });
};

const analyzeProductReference = async (apiKey: string, files: File[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);
  const parts = await Promise.all(files.map(fileToGenerativePart));
  
  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [...parts, { text: `
            ROLE: Forensic Product Authenticator.
            TASK: Extract a RIGID visual definition of the object.
            OUTPUT FORMAT: A dense, objective technical specification block. No artistic fluff.
            ` }]
      },
      config: { temperature: 0.1 }
    });
    return response.text || "";
  }).catch(e => {
     console.warn("Product analysis failed:", e);
     return "The specific product shown in the reference image.";
  });
};

const analyzeCharacterReference = async (apiKey: string, files: File[], mode: 'FACE_ID' | 'HEAD_ID' | 'FULL_BODY'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);
  const parts = await Promise.all(files.map(fileToGenerativePart));
  
  let systemPrompt = "";
  if (mode === 'FACE_ID') {
    systemPrompt = `ROLE: Forensic Biometric Examiner. TASK: Digital Face Mask description.`;
  } else if (mode === 'HEAD_ID') {
    systemPrompt = `ROLE: Lead Hair & Makeup Artist. TASK: Analyze Head unit (Face + Hair).`;
  } else {
    systemPrompt = `ROLE: Character Artist. TASK: Full Character Sheet.`;
  }

  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [...parts, { text: systemPrompt }] },
      config: { temperature: 0.1 }
    });
    return response.text || "";
  }).catch(e => {
    console.warn("Character analysis failed:", e);
    return "The character shown in the reference image.";
  });
};

export const generateImagePrompt = async (imageFile: File, includeCopywriting: boolean = false): Promise<string> => {
  const apiKey = await getApiKey(false);
  if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);
  const imagePart = await fileToGenerativePart(imageFile);

  const instruction = includeCopywriting 
    ? `[COPYWRITING MODE: ENABLED] IF VISIBLE TEXT EXISTS: Transcribe EXACTLY. IF NO TEXT: Generate fitting Title/Subtitle.`
    : `[COPYWRITING MODE: DISABLED] IGNORE ALL TEXT. Describe scene purely visually.`;

  return retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [imagePart, { text: `Analyze this image and generate the prompt.\n${instruction}` }] },
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.4 },
      });
      if (!response.text) throw new Error("No description generated.");
      return response.text;
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
  // --- SPECIAL HANDLING FOR PROXY MODEL NANO-BANANA-2 ---
  if (modelName === 'nano-banana-2') {
      const baseUrl = getBaseUrl();
      const apiKey = await getApiKey(false);
      if (!apiKey || !baseUrl) throw new Error("Proxy Nano model requires API Key and Base URL (Settings).");

      // Clean URL: Remove /v1beta if present, ensure no trailing slash
      let cleanBaseUrl = baseUrl.replace(/\/v1beta\/?$/, '').replace(/\/$/, '');
      const endpoint = `${cleanBaseUrl}/v1/images/generations`;

      const refImages = [...productReferenceImages, ...characterReferenceImages];
      const b64Images = await Promise.all(refImages.map(img => fileToBase64(img)));
      
      const validImages: string[] = [];

      for (let i = 0; i < count; i++) {
        try {
           if (i > 0) await delay(1000);
           
           const result = await retryOperation(async () => {
              const body = {
                 model: 'nano-banana-2',
                 prompt: promptText,
                 aspect_ratio: aspectRatio,
                 image_size: imageSize, 
                 image: b64Images.length > 0 ? b64Images : undefined
              };

              const res = await fetch(endpoint, {
                 method: 'POST',
                 headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                 },
                 body: JSON.stringify(body)
              });

              if (!res.ok) {
                 const errText = await res.text();
                 throw new Error(`Proxy API Error (${res.status}): ${errText}`);
              }

              const data = await res.json();
              // OpenAI format: { data: [{ url: "..." }] }
              if (data.data && data.data.length > 0 && data.data[0].url) {
                  return data.data[0].url;
              }
              throw new Error("Invalid response format from proxy.");
           });

           if (result) validImages.push(result);
        } catch (e) {
           console.error("Nano gen failed", e);
           throw e;
        }
      }
      return validImages;
  }

  // --- STANDARD GOOGLE SDK HANDLING ---
  
  const isCustomConfig = !!localStorage.getItem('gemini_api_key');
  const requirePaidKey = modelName === 'gemini-3-pro-image-preview' && !isCustomConfig;
  
  const apiKey = await getApiKey(requirePaidKey);
  if (!apiKey) throw new Error("API Key is missing.");
  
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);
  
  const ratioMap: Record<string, string> = { "1:1": "1:1", "4:3": "4:3", "3:4": "3:4", "16:9": "16:9", "9:16": "9:16", "21:9": "16:9", "3:2": "4:3", "2:3": "3:4" };
  const apiRatio = ratioMap[aspectRatio] || "1:1";

  // Pre-process reference images
  let productRefParts: any[] = [];
  if (productReferenceImages.length > 0) productRefParts = await Promise.all(productReferenceImages.map(fileToGenerativePart));

  let charRefParts: any[] = [];
  if (characterReferenceImages.length > 0) charRefParts = await Promise.all(characterReferenceImages.map(fileToGenerativePart));

  // Build Prompts
  let productSection = "";
  if (productReferenceImages.length > 0) {
    if (strictProductConsistency) {
        const desc = await analyzeProductReference(apiKey, productReferenceImages);
        productSection = `[PRIORITY 1: PRODUCT INTEGRITY (STRICT)]\nUSE PIXEL DATA AS GROUND TRUTH. Object Specs: "${desc}"`;
    } else {
        productSection = `[PRIORITY 1: PRODUCT INSPIRATION (LOOSE)]\nUse style/vibe of reference.`;
    }
  }

  let characterSection = "";
  if (characterReferenceImages.length > 0) {
    const desc = await analyzeCharacterReference(apiKey, characterReferenceImages, characterMode);
    characterSection = `[PRIORITY 2: CHARACTER IDENTITY]\nMode: ${characterMode}\nVisual DNA: "${desc}"`;
  }

  const finalPrompt = `
    ROLE: AI Compositor.
    ${productSection}
    ${characterSection}
    [PRIORITY 3: SCENE] USER PROMPT: "${promptText}"
    INSTRUCTION: Render immutable assets into scene.
  `;

  const allParts = [...productRefParts, ...charRefParts, { text: finalPrompt }];
  const validImages: string[] = [];
  let lastError: any = null;

  // Build Config
  const imageConfig: any = { aspectRatio: apiRatio };
  // Only add imageSize for official Pro model here
  if (modelName === 'gemini-3-pro-image-preview' && imageSize) {
      imageConfig.imageSize = imageSize;
  }

  // SEQUENTIAL EXECUTION (Fix for Rate Limits)
  for (let i = 0; i < count; i++) {
     try {
        if (i > 0) await delay(1000);

        const result = await retryOperation(async () => {
            const response = await ai.models.generateContent({
                model: modelName, 
                contents: { parts: allParts },
                config: {
                    imageConfig: imageConfig,
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                    ]
                }
            });

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            return null;
        });

        if (result) validImages.push(result);

     } catch (error: any) {
        console.error(`Failed to generate image ${i+1}/${count}:`, error);
        lastError = error;
     }
  }

  if (validImages.length === 0) {
     if (lastError) {
        const msg = lastError.message || JSON.stringify(lastError);
        if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
            throw new Error(`Permission Denied (403). The model '${modelName}' is not allowed for this API Key. If using a proxy, ensure you selected the correct model 'Nano v2'.`);
        }
        throw lastError;
     }
     throw new Error("Failed to generate any images. Check your API Key or Quota.");
  }

  return validImages;
};

export const generateImageModification = async (imageFile: File, promptText: string, count: number = 1): Promise<string[]> => {
  const apiKey = await getApiKey(false);
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey, baseUrl: getBaseUrl() } as any);
  const imagePart = await fileToGenerativePart(imageFile);
  
  const validImages: string[] = [];

  for (let i = 0; i < count; i++) {
      try {
        if (i > 0) await delay(1000);

        const result = await retryOperation(async () => {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, { text: promptText }] },
                config: {
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                    ]
                }
            });

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            return null;
        });

        if (result) validImages.push(result);

      } catch (error) {
         console.error(`Modification attempt ${i+1} failed`, error);
      }
  }

  if (validImages.length === 0) {
    throw new Error("Failed to modify image.");
  }

  return validImages;
};
