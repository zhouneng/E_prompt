import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateImagePrompt = async (imageFile: File): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing in environment variables.");

  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(imageFile);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [
            imagePart,
            { text: "Analyze this image and generate the prompt." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No description generated.");
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateImagesFromPrompt = async (
  promptText: string, 
  count: number = 1,
  aspectRatio: string = "1:1"
): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  
  // Map user-requested ratios to Gemini supported ratios
  // Gemini 2.5 Flash Image supports: "1:1", "3:4", "4:3", "9:16", "16:9"
  const ratioMap: Record<string, string> = {
    "1:1": "1:1",
    "4:3": "4:3",
    "3:4": "3:4",
    "16:9": "16:9",
    "9:16": "9:16",
    // Mapping unsupported to closest supported
    "21:9": "16:9",
    "3:2": "4:3",
    "2:3": "3:4",
  };

  const apiRatio = ratioMap[aspectRatio] || "1:1";
  
  const promises = Array.from({ length: count }).map(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: promptText }]
        },
        config: {
          imageConfig: {
            aspectRatio: apiRatio
          }
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
    } catch (error) {
      console.error("Single Image Gen Error:", error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  const validImages = results.filter((img): img is string => img !== null);

  if (validImages.length === 0) {
    throw new Error("Failed to generate any images.");
  }

  return validImages;
};

export const generateImageModification = async (imageFile: File, promptText: string, count: number = 1): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(imageFile);
  
  const promises = Array.from({ length: count }).map(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            imagePart,
            { text: promptText }
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
    } catch (error) {
      console.error("Image Modification Error:", error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  const validImages = results.filter((img): img is string => img !== null);

  if (validImages.length === 0) {
    throw new Error("Failed to generate any images.");
  }

  return validImages;
};