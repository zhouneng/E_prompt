
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// Helper to get API Key
const getApiKey = (): string | undefined => {
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey) return storedKey;
  return process.env.API_KEY;
};

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

// Internal helper to get a text description of the product from the reference image
const analyzeProductReference = async (apiKey: string, files: File[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const parts = await Promise.all(files.map(fileToGenerativePart));
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          ...parts,
          { text: "You are a Forensic Product Analyst. Analyze the MAIN SUBJECT in this image for a high-fidelity 3D reconstruction task.\n\nOUTPUT REQUIREMENTS:\n1. VISUAL DNA: Describe the exact shape, material properties (e.g., brushed aluminum, matte plastic), colors (hex codes if approximating), and textures.\n2. BRANDING IDENTITY: Transcribe EVERY visible logo, text, label, or graphic EXACTLY as it appears. Note fonts and positioning.\n3. STRUCTURAL DETAILS: List buttons, seams, caps, handles, ports, or unique geometry.\n\nOUTPUT FORMAT: A single, dense, highly descriptive paragraph focusing ONLY on the product. Do not describe the background." }
        ]
      },
      config: {
        temperature: 0.2, // Low temperature for precision
      }
    });
    return response.text || "";
  } catch (e) {
    console.error("Product analysis failed", e);
    return "The product shown in the reference image.";
  }
};

export const generateImagePrompt = async (imageFile: File, includeCopywriting: boolean = false): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");

  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(imageFile);

  let copywritingInstruction = "";
  if (includeCopywriting) {
    copywritingInstruction = `
    [COPYWRITING MODE: ENABLED]
    CRITICAL INSTRUCTION FOR TEXT/COPY ANALYSIS:
    1. IF VISIBLE TEXT EXISTS: You MUST transcribe it EXACTLY. Describe the font, color, styling, and position of the text (e.g., "Neon red sign saying 'OPEN'").
    2. IF NO TEXT EXISTS (CRITICAL): You MUST creatively GENERATE a fitting Title and Subtitle based on the visual mood and content of the image. 
       - Imagine this image is a poster or magazine cover. What would the headline be?
       - GENERATE a "Title" (short, punchy) and a "Subtitle" (descriptive).
       - INSTRUCTION: Explicitly include these generated text elements in the final prompt description as if they are part of the image's design (e.g., "A cinematic title 'FUTURE CITY' appears in bold white sans-serif font at the bottom...").
    `;
  } else {
    copywritingInstruction = `
    [COPYWRITING MODE: DISABLED]
    CRITICAL INSTRUCTION FOR TEXT ANALYSIS:
    1. IGNORE ALL TEXT: Do NOT include any specific text content, logos, letters, or slogans found in the image in the final prompt.
    2. CLEAN OUTPUT: Describe the scene purely visually. Treat text elements as if they don't exist, or describe the object/surface without the writing. The goal is a clean, text-free image generation.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [
            imagePart,
            { text: `Analyze this image and generate the prompt.\n${copywritingInstruction}` }
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
  aspectRatio: string = "1:1",
  referenceImages: File[] = [],
  maintainSubject: boolean = false,
  replaceProduct: boolean = false,
  compositionImage: File | null = null,
  compositionStrength: number = 50
): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");

  const ai = new GoogleGenAI({ apiKey });
  
  // Map user-requested ratios to Gemini supported ratios
  const ratioMap: Record<string, string> = {
    "1:1": "1:1",
    "4:3": "4:3",
    "3:4": "3:4",
    "16:9": "16:9",
    "9:16": "9:16",
    "21:9": "16:9",
    "3:2": "4:3",
    "2:3": "3:4",
  };

  const apiRatio = ratioMap[aspectRatio] || "1:1";

  // Prepare reference images if they exist
  const refImageParts = referenceImages.length > 0 
    ? await Promise.all(referenceImages.map(fileToGenerativePart))
    : [];

  const compImagePart = compositionImage ? await fileToGenerativePart(compositionImage) : null;
  
  let finalPrompt = promptText;
  
  // Handle Consistency/Replacement Logic
  if ((replaceProduct || maintainSubject) && referenceImages.length > 0) {
    const productDescription = await analyzeProductReference(apiKey, referenceImages);

    if (replaceProduct) {
      finalPrompt = `[TASK: PRODUCT REPLACEMENT]
[PRIORITY: HIGH FIDELITY PRODUCT RENDERING]

SOURCE PRODUCT SPECIFICATIONS (From Reference Image):
"${productDescription}"

TARGET SCENE:
"${promptText}"

INSTRUCTIONS:
1. IDENTIFY the object in the TARGET SCENE that needs to be replaced.
2. REPLACE it with the SOURCE PRODUCT described above.
3. APPEARANCE: The inserted product MUST look exactly like the reference image: Same details, same logos, same materials.
4. INTEGRATION: Apply the lighting, shadows, and reflections of the TARGET SCENE to the inserted product.
`;
    } else {
      // maintainSubject
      finalPrompt = `[TASK: PRODUCT PHOTOGRAPHY - STRICT CONSISTENCY]
[REFERENCE IMAGE IS GROUND TRUTH]

SUBJECT SPECIFICATIONS (MUST MATCH EXACTLY):
"${productDescription}"

SCENE / BACKGROUND DESCRIPTION:
"${promptText}"

EXECUTION RULES:
1. **SUBJECT INTEGRITY**: You are a photocopier for the main subject. The object in the final image must be indistinguishable from the reference image.
2. **DETAILS**: Preserve all logos, text, button placements, and material textures found in the SUBJECT SPECIFICATIONS.
3. **CONFLICT RESOLUTION**: If "SCENE / BACKGROUND DESCRIPTION" suggests changing the subject (e.g. "make it blue"), IGNORE IT. The reference image overrides text prompts regarding the subject's appearance.
4. **COMPOSITION**: Place this exact subject into the environment described.
`;
    }
  }

  // Handle Composition Logic
  if (compositionImage) {
    const adherenceLevel = compositionStrength > 80 ? "EXTREME" : compositionStrength > 50 ? "HIGH" : "MODERATE";
    const instructionStrength = compositionStrength > 70 
      ? "Strictly follow the perspective, camera angle, and blocking of this image." 
      : "Use the general layout and depth of this image as inspiration, but feel free to adapt it to fit the new subject naturally.";

    finalPrompt += `\n\n[COMPOSITION & LAYOUT INSTRUCTION]
1. A separate REFERENCE IMAGE for COMPOSITION is provided.
2. ROLE: Use this composition image for structural layout, camera angle, perspective, and framing.
3. STRENGTH: ${compositionStrength}/100 (${adherenceLevel}). ${instructionStrength}
4. CONTENT: DO NOT COPY the specific pixels, textures, or exact objects from the composition image.
5. COMBINATION: Place the MAIN SUBJECT defined above into this geometric layout.
${replaceProduct ? "6. CRITICAL: The object in the composition image is just a placeholder geometry. DO NOT RENDER IT. Render the TARGET PRODUCT in its place." : ""}
`;
  }

  // PARALLEL EXECUTION (Restored Speed)
  const promises = Array.from({ length: count }).map(async () => {
    try {
      const parts: any[] = [...refImageParts];
      if (compImagePart) {
        parts.push(compImagePart);
      }
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts
        },
        config: {
          imageConfig: {
            aspectRatio: apiRatio
          },
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
    } catch (error) {
      console.error("Single Image Gen Error:", error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  const validImages = results.filter((img): img is string => img !== null);

  if (validImages.length === 0) {
    throw new Error("Failed to generate any images. Please try again or reduce quantity.");
  }

  return validImages;
};

export const generateImageModification = async (imageFile: File, promptText: string, count: number = 1): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");

  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(imageFile);
  
  // PARALLEL EXECUTION (Restored Speed)
  const promises = Array.from({ length: count }).map(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            imagePart,
            { text: promptText }
          ]
        },
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
    } catch (error) {
      console.error("Image Modification Error:", error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  const validImages = results.filter((img): img is string => img !== null);

  if (validImages.length === 0) {
    throw new Error("Failed to modify image. Please try again.");
  }

  return validImages;
};
