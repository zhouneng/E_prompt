
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

// --- RETRY LOGIC HELPER ---
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
      
      // Check for 429 (Too Many Requests) or 503 (Service Unavailable)
      const status = error.status || error.response?.status;
      const msg = error.message || "";
      const isRateLimit = status === 429 || msg.includes('429') || msg.includes('Quota exceeded');
      const isServerOverload = status === 503 || msg.includes('503') || msg.includes('Overloaded');

      if (isRateLimit || isServerOverload) {
        // Calculate delay with exponential backoff + jitter to prevent thundering herd
        // Attempt 1: ~2s, Attempt 2: ~4s, Attempt 3: ~8s
        const waitTime = baseDelay * Math.pow(2, i) + (Math.random() * 1000);
        console.warn(`API Rate Limit hit (Attempt ${i + 1}/${maxRetries}). Retrying in ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
        continue;
      }

      // If it's not a retryable error (e.g. 400 Bad Request, 403 Forbidden), throw immediately
      throw error;
    }
  }

  throw lastError;
}

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
  
  return retryOperation(async () => {
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
      // If it's a critical API error, let retryOperation handle it via re-throw
      // Otherwise fallback
      throw e; 
    }
  }).catch(e => {
     // Fallback only after retries fail
     console.warn("Product analysis final failure:", e);
     return "The specific product shown in the reference image.";
  });
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
      ROLE: Forensic Biometric Examiner.
      TASK: Generate a high-precision "Digital Face Mask" description for a deep-fake style face swap.
      
      CRITICAL OUTPUT SECTIONS:
      1. CRANIOFACIAL STRUCTURE: Exact jawline shape, cheekbone prominence, forehead width, chin topology.
      2. OCULAR GEOMETRY: Eye shape (almond, round, hooded), canthus angle, eyebrow arch & thickness, inter-pupillary distance impression.
      3. NASAL & ORAL: Bridge width, tip shape, lip volume, cupid's bow definition.
      4. DERMATOLOGY: Exact skin tone (hex), texture metrics (smooth/rough), age markers (crows feet, nasolabial folds), unique identifiers (moles, scars).
      
      INSTRUCTION: Output a rigid, clinical description. Ignore hair and clothing. Focus ONLY on the face mask area.
    `;
  } else if (mode === 'HEAD_ID') {
    systemPrompt = `
      ROLE: Lead Hair & Makeup Artist.
      TASK: Analyze the complete HEAD unit (Face + Hair) for a digital double.
      
      CRITICAL OUTPUT SECTIONS:
      1. FACE MESH: Summary of key identifiers (Eyes, Nose, Jaw, Skin).
      2. HAIR SIMULATION DATA:
         - Color (root to tip variations).
         - Texture (Type 1-4).
         - Style/Cut mechanics.
         - Hairline geometry.
         - Volume and weight.
      3. GROOMING: Facial hair density, coverage map, and style.
      
      INSTRUCTION: The goal is to transplant this exact head (face + full hair) onto a new body.
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

  return retryOperation(async () => {
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
          temperature: 0.1, // Near zero for biological accuracy
        }
      });
      return response.text || "";
    } catch (e) {
       throw e;
    }
  }).catch(e => {
    console.warn("Character analysis final failure:", e);
    return "The character shown in the reference image.";
  });
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

  return retryOperation(async () => {
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
  strictProductConsistency: boolean = true
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
    
    if (strictProductConsistency) {
        // Retry logic is already inside analyzeProductReference
        const productDescription = await analyzeProductReference(apiKey, productReferenceImages);
        productSection = `
        [PRIORITY 1: PRODUCT INTEGRITY (ABSOLUTE - STRICT MODE)]
        **INSTRUCTION**: The attached image(s) depict the "Hero Object" which MUST be inserted into the scene.
        
        CRITICAL CONSTRAINT - VISUAL TRUTH:
        1. DO NOT reimagine the object. It is NOT a generic item. It is THIS specific item.
        2. DO NOT use your internal training data for this type of object.
        3. YOU MUST USE THE PIXEL DATA FROM THE ATTACHED IMAGE AS THE GROUND TRUTH.
        4. PRESERVE BRANDING, LOGOS, AND GEOMETRY EXACTLY.
        
        CONFLICT RESOLUTION PROTOCOL:
        - IF the User Prompt describes the object's color, shape, or logo differently than the attached image -> **IGNORE THE USER PROMPT. OBEY THE IMAGE.**
        - ONLY apply lighting, environment, and perspective from the prompt. 
        - The object's identity (Logo, Geometry, Texture, Material) is IMMUTABLE.
        
        Object Tech Specs (For confirmation only, Image data takes precedence):
        "${productDescription}"
        `;
    } else {
        productSection = `
        [PRIORITY 1: PRODUCT INSPIRATION (LOOSE MODE)]
        **INSTRUCTION**: The attached image serves as a visual reference for the object.
        - Use the style, color palette, and general vibe of the reference object.
        - You MAY adapt the object to better fit the artistic direction of the prompt.
        - Exact branding or geometry preservation is NOT required if it conflicts with the scene.
        `;
    }
  }

  // --- SECTION 2: CHARACTER (If applicable) ---
  let characterSection = "";
  if (characterReferenceImages.length > 0) {
    // Retry logic is already inside analyzeCharacterReference
    const characterDescription = await analyzeCharacterReference(apiKey, characterReferenceImages, characterMode);
    
    let fusionDirective = "";
    if (characterMode === 'FACE_ID') {
        fusionDirective = `
        **OPERATION: PRECISION FACE SWAP**
        - TARGET: The character in the generated image.
        - SOURCE: The "Character Visual DNA" described below.
        - EXECUTION:
          1. OVERRIDE any facial descriptions in the USER PROMPT.
          2. The face MUST match the Reference Image exactly (Eyes, Nose, Mouth, Bone Structure).
          3. Blend the Reference Face seamlessly onto the body defined by the prompt.
          4. Match lighting, but preserve facial identity.
        `;
    } else if (characterMode === 'HEAD_ID') {
        fusionDirective = `
        **OPERATION: HEAD REPLACEMENT**
        - TARGET: The character's head.
        - EXECUTION:
          1. Replace the entire head (Face + Hair) with the Reference.
          2. Maintain the hairstyle EXACTLY as described in "Character Visual DNA".
          3. Ensure the head connects naturally to the body in the scene.
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

  // PARALLEL EXECUTION with individual retry
  const promises = Array.from({ length: count }).map(async (_, index) => {
    // Stagger starts slightly to reduce burst on free tier
    // But since retryOperation adds jitter, explicit staggered timeout is also good practice
    await delay(index * 500); 

    return retryOperation(async () => {
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
              // 403 is permission, not retryable usually (unless transient auth)
              if (window.aistudio) {
                throw new Error("Permission Denied (403). The selected key may be invalid or missing permissions. Please reload to re-select key.");
              }
              throw new Error("Permission Denied (403). Your API Key cannot access this model. Please check billing or try 'Standard' model.");
          }
          // Throw so retryOperation catches it
          throw error;
        }
    });
  });

  // Use allSettled to allow some images to succeed even if others fail after retries
  const results = await Promise.allSettled(promises);
  const validImages: string[] = [];
  
  results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
          validImages.push(result.value);
      }
  });

  if (validImages.length === 0) {
     // If all failed, check if we have a specific error message from the first failure
     const firstRejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
     const errorMessage = firstRejection?.reason?.message || "Failed to generate any images due to rate limits or errors.";
     throw new Error(errorMessage);
  }

  return validImages;
};

export const generateImageModification = async (imageFile: File, promptText: string, count: number = 1): Promise<string[]> => {
  // Modification uses Standard image model, no need to force paid key selection
  const apiKey = await getApiKey(false);
  if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");

  const ai = new GoogleGenAI({ apiKey });
  
  let imagePart;
  try {
     imagePart = await fileToGenerativePart(imageFile);
  } catch(e) {
     throw new Error("Failed to process input image.");
  }
  
  const promises = Array.from({ length: count }).map(async (_, index) => {
    await delay(index * 500); // Stagger
    
    return retryOperation(async () => {
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
          if (error.message?.includes('403') || error.status === 403) {
              throw new Error("Permission Denied (403). Check your API Key permissions.");
          }
          throw error;
        }
    });
  });

  const results = await Promise.allSettled(promises);
  const validImages: string[] = [];
  
  results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
          validImages.push(result.value);
      }
  });

  if (validImages.length === 0) {
    throw new Error("Failed to modify image. Please try again later (Rate Limit).");
  }

  return validImages;
};
