
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// Helper to get API Key with support for AI Studio environment
const getApiKey = async (requireKeySelection: boolean): Promise<string | undefined> => {
  // 1. Check for AI Studio environment (Required for Pro/Veo models in some contexts)
  if (window.aistudio) {
    // Only force selection if specifically required (Pro models)
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
    // After selection, the environment injects the key into process.env.API_KEY
    // We strictly return process.env.API_KEY here if we are in that environment.
    return process.env.API_KEY;
  }

  // 2. Local Storage (User Settings)
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey) return storedKey;

  // 3. Environment Variable (Vite/Build)
  return process.env.API_KEY;
};

// Helper to resize and convert File to Base64
// This prevents XHR errors with large payloads by resizing images > 1536px
const fileToGenerativePart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error("Failed to read file"));
      }
    };

    reader.onerror = reject;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1536; // Limit max dimension to avoid payload size issues

        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with 0.85 quality for balance of quality and size
        const base64Data = canvas.toDataURL('image/jpeg', 0.85);
        const base64Content = base64Data.split(',')[1];
        
        resolve({
          inlineData: {
            data: base64Content,
            mimeType: 'image/jpeg',
          },
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image for processing"));
    
    reader.readAsDataURL(file);
  });
};

// Internal helper to get a text description of the product from the reference image
// UPDATED: Now uses a stricter "Forensic" prompt to extract rigid visual details.
const analyzeProductReference = async (apiKey: string, files: File[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const parts = await Promise.all(files.map(fileToGenerativePart));
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          ...parts,
          { text: `
            ROLE: Forensic Product Authenticator.
            TASK: Extract a RIGID visual definition of the object in the image.
            
            CRITICAL OUTPUT RULES:
            1. GEOMETRY: Describe the EXACT shape topology (e.g., "cylindrical with a tapered neck," "cuboid with rounded corners").
            2. MATERIALS & FINISH: Define the surface physics (e.g., "brushed anodized aluminum," "glossy polycarbonate," "frosted glass").
            3. BRANDING (CRITICAL): Transcribe ALL logos and text EXACTLY as seen. Note font style and color.
            4. UNIQUE IDENTIFIERS: Mention specific scratches, buttons, seams, or design quirks that make this unique.
            
            OUTPUT FORMAT: A dense, objective technical specification block. No artistic fluff.
            ` }
        ]
      },
      config: {
        temperature: 0.1, // Near zero for absolute factual consistency
      }
    });
    return response.text || "";
  } catch (e) {
    console.error("Product analysis failed", e);
    return "The specific product shown in the reference image.";
  }
};

// Internal helper to get a text description of the character from the reference image
const analyzeCharacterReference = async (
  apiKey: string, 
  files: File[],
  mode: 'FACE_ID' | 'HEAD_ID' | 'FULL_BODY'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const parts = await Promise.all(files.map(fileToGenerativePart));
  
  let systemPrompt = "";

  if (mode === 'FACE_ID') {
    systemPrompt = `
      You are a Biometric Face Analyst. 
      Analyze the FACIAL FEATURES of the person in the images for a "Face Swap" operation.
      
      REQUIRED OUTPUT (Strictly Visual):
      - STRUCTURE: Face shape, bone structure, jawline definition.
      - EYES: Exact shape, color, eyelid type (e.g., monolid, hooded), distance.
      - NOSE: Bridge shape, tip definition, width.
      - MOUTH: Lip shape, fullness, cupid's bow.
      - SKIN: Tone (hex approx), texture (freckles, age marks), complexion.
      - DISTINCTIVE FEATURES: Moles, scars, dimples.
      
      INSTRUCTION: Ignore hair, clothing, and background. Focus 100% on the face mask area.
    `;
  } else if (mode === 'HEAD_ID') {
    systemPrompt = `
      You are a Digital Hairstylist & Face Analyst.
      Analyze the HEAD (Face + Hair) of the person.
      
      REQUIRED OUTPUT:
      - FACIAL BIOMETRICS: (Summary of eyes, nose, mouth, skin).
      - HAIR: Exact style, length, color code, texture (curly/straight), parting line, volume.
      - HEADWEAR: Describe if present.
      - GROOMING: Facial hair style and texture.
      
      INSTRUCTION: Ignore the body below the neck. Focus on the head as a complete unit.
    `;
  } else {
    // FULL_BODY
    systemPrompt = `
      You are a Lead Character Artist for a CGI Movie.
      Analyze the COMPLETE VISUAL IDENTITY of the character.
      
      REQUIRED OUTPUT (Comprehensive):
      1. BIOMETRICS: Face details, Skin tone, Age, Ethnicity, Height estimate, Body build (somatotype).
      2. HAIR & GROOMING: Full hairstyle description.
      3. APPAREL & OUTFIT (CRITICAL): Describe every piece of clothing visible. Fabric types (denim, silk), colors, fit (baggy, tight), patterns, and layering.
      4. ACCESSORIES: Jewelry, glasses, bags, footwear.
      
      INSTRUCTION: Create a "Character Sheet" description. This person must be replicable exactly in a new scene.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          ...parts,
          { text: systemPrompt }
        ]
      },
      config: {
        temperature: 0.2, // Low temperature for high accuracy
      }
    });
    return response.text || "";
  } catch (e) {
    console.error("Character analysis failed", e);
    return "The character shown in the reference image.";
  }
};

export const generateImagePrompt = async (imageFile: File, includeCopywriting: boolean = false): Promise<string> => {
  // Analyze View uses Standard text model, no need to force paid key selection
  const apiKey = await getApiKey(false);
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
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('403') || error.status === 403) {
      throw new Error("Permission Denied (403). Please check your API Key. Ensure the Generative AI API is enabled in your Google Cloud Project.");
    }
    throw error;
  }
};

export const generateImagesFromPrompt = async (
  promptText: string, 
  count: number = 1,
  aspectRatio: string = "1:1",
  productReferenceImages: File[] = [],
  characterReferenceImages: File[] = [],
  characterMode: 'FACE_ID' | 'HEAD_ID' | 'FULL_BODY' = 'FULL_BODY',
  modelName: string = 'gemini-2.5-flash-image'
): Promise<string[]> => {
  // Only require paid key selection if using Pro model
  const requirePaidKey = modelName === 'gemini-3-pro-image-preview';
  const apiKey = await getApiKey(requirePaidKey);

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

  // Prepare reference images (products)
  let productRefParts: any[] = [];
  try {
    productRefParts = productReferenceImages.length > 0 
      ? await Promise.all(productReferenceImages.map(fileToGenerativePart))
      : [];
  } catch (e) {
    console.error("Failed to process product reference images", e);
    throw new Error("Failed to process product reference images.");
  }

  // Prepare reference images (characters)
  let charRefParts: any[] = [];
  try {
    charRefParts = characterReferenceImages.length > 0
      ? await Promise.all(characterReferenceImages.map(fileToGenerativePart))
      : [];
  } catch (e) {
    console.error("Failed to process character reference images", e);
    throw new Error("Failed to process character reference images.");
  }

  // =========================================================
  // ADVANCED CONSISTENCY PROMPTING LOGIC - DIGITAL TWIN ENGINE
  // =========================================================

  let systemDirective = `
    ROLE: You are an advanced AI Image Generator specializing in "Product Photography Compositing" and "Character Replacement".
    
    CORE OPERATING MODE: VISUAL ANCHORING.
    You are NOT an artist drawing from memory. You are a compositor merging supplied assets into a new scene.
  `;

  // --- SECTION 1: PRODUCT (VISUAL TRUTH) ---
  let productSection = "";
  if (productReferenceImages.length > 0) {
    const productDescription = await analyzeProductReference(apiKey, productReferenceImages);
    productSection = `
    [PRIORITY 1: PRODUCT INTEGRITY (ABSOLUTE)]
    **INSTRUCTION**: The attached image(s) depict the "Hero Object".
    
    CRITICAL CONSTRAINT - VISUAL TRUTH:
    1. DO NOT reimagine the object.
    2. DO NOT use your internal training data for this type of object.
    3. YOU MUST USE THE PIXEL DATA FROM THE ATTACHED IMAGE AS THE GROUND TRUTH.
    
    CONFLICT RESOLUTION PROTOCOL:
    - IF the User Prompt describes the object's color, shape, or logo differently than the attached image -> **IGNORE THE USER PROMPT. OBEY THE IMAGE.**
    - ONLY apply lighting and perspective from the prompt. The object's identity (Logo, Geometry, Texture) is IMMUTABLE.
    
    Object Tech Specs (For confirmation only, Image data takes precedence):
    "${productDescription}"
    `;
  }

  // --- SECTION 2: CHARACTER (If applicable) ---
  let characterSection = "";
  if (characterReferenceImages.length > 0) {
    const characterDescription = await analyzeCharacterReference(apiKey, characterReferenceImages, characterMode);
    
    let fusionDirective = "";
    if (characterMode === 'FACE_ID') {
        fusionDirective = `
        **MODE: FACE SWAP / BIOMETRIC TRANSFER**
        - Graft the facial features from the Reference Image onto the body in the scene.
        - The FACE must match the Reference Image exactly (Eyes, Nose, Mouth, Structure).
        `;
    } else if (characterMode === 'HEAD_ID') {
        fusionDirective = `
        **MODE: HEAD REPLACEMENT**
        - Replace the entire head in the scene with the head from the Reference Image.
        - Preserve Hair, Face, and Headwear from the Reference.
        `;
    } else {
        // FULL_BODY
        fusionDirective = `
        **MODE: DIGITAL DOUBLE (FULL CONSISTENCY)**
        - The character in the output MUST be the exact same person wearing the exact same clothes as the Reference Image.
        - Do not change the outfit. Do not change the body type.
        - Treat the Reference Image as the "Actor" on set.
        `;
    }

    characterSection = `
    [PRIORITY 2: CHARACTER IDENTITY]
    ${fusionDirective}

    Character Visual DNA:
    "${characterDescription}"
    `;
  }

  // --- SECTION 3: TARGET SCENE ---
  const sceneSection = `
    [PRIORITY 3: SCENE & LIGHTING (MUTABLE)]
    USER PROMPT: "${promptText}"
    
    INSTRUCTION: Construct the environment, lighting, and mood described above. Place the IMMUTABLE PRODUCT/CHARACTER into this context.
  `;

  // Combine Final Prompt
  const finalPrompt = `
${systemDirective}

${productSection}

${characterSection}

${sceneSection}

[FINAL COMPOSITING STEP]
1. Lock the "Hero Object" (Product) geometry and texture from the image inputs.
2. Lock the "Character" biometrics from the image inputs.
3. Render them into the User Prompt's scene.
4. Ensure lighting interactions (shadows, reflections) match the scene but do not alter the object's inherent color or branding.
  `;

  // Determine Image Parts to send
  // Order matters: We provide images first to establish context, then the text to direct the usage.
  const allParts = [
      ...productRefParts, 
      ...charRefParts, 
      { text: finalPrompt }
  ];

  // PARALLEL EXECUTION
  const promises = Array.from({ length: count }).map(async () => {
    try {
      const response = await ai.models.generateContent({
        model: modelName, 
        contents: {
          parts: allParts
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
    } catch (error: any) {
      console.error("Single Image Gen Error:", error);
      if (error.message?.includes('403') || error.status === 403) {
          // If we are in AI Studio env, we can try to reset the key, but for now just throw specific message
          if (window.aistudio) {
             throw new Error("Permission Denied (403). The selected key may be invalid or missing permissions. Please reload to re-select key.");
          }
          throw new Error("Permission Denied (403). Your API Key cannot access this model. Please check billing or try 'Standard' model.");
      }
      return null;
    }
  });

  const results = await Promise.all(promises);
  const validImages = results.filter((img): img is string => img !== null);

  if (validImages.length === 0) {
    throw new Error("Failed to generate any images. Check console for details (e.g. 403 Permission Denied or safety blocks).");
  }

  return validImages;
};

export const generateImageModification = async (imageFile: File, promptText: string, count: number = 1): Promise<string[]> => {
  // Modification uses Standard image model, no need to force paid key selection
  const apiKey = await getApiKey(false);
  if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");

  const ai = new GoogleGenAI({ apiKey });
  
  // Use resized image part
  let imagePart;
  try {
     imagePart = await fileToGenerativePart(imageFile);
  } catch(e) {
     throw new Error("Failed to process input image.");
  }
  
  // PARALLEL EXECUTION
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
    } catch (error: any) {
      console.error("Image Modification Error:", error);
      if (error.message?.includes('403') || error.status === 403) {
          throw new Error("Permission Denied (403). Check your API Key permissions.");
      }
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
