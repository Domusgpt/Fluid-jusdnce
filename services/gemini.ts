import { GoogleGenAI } from "@google/genai";
import { GeneratedFrame, PoseType, EnergyLevel, SubjectCategory, FrameType, SheetRole } from "../types";

// Use environment variable. Fallback for dev.
const API_KEY = process.env.API_KEY || '';

// --- UTILITIES ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error("FileReader result was not a string"));
        };
        reader.onerror = (error) => reject(new Error("File reading failed"));
    });
};

// Optimized resize for Gemini 384px Input cost saving
const resizeImage = (file: File, maxDim: number = 384): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file || !(file instanceof File)) return reject(new Error("Invalid file"));

        let url = '';
        try { url = URL.createObjectURL(file); } catch (e) { 
            return fileToBase64(file).then(resolve).catch(reject); 
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) { height *= maxDim / width; width = maxDim; }
                } else {
                    if (height > maxDim) { width *= maxDim / height; height = maxDim; }
                }

                canvas.width = Math.floor(width);
                canvas.height = Math.floor(height);
                const ctx = canvas.getContext('2d');
                if (!ctx) { 
                    URL.revokeObjectURL(url); 
                    return fileToBase64(file).then(resolve).catch(reject); 
                }
                
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8); 
                URL.revokeObjectURL(url);
                resolve(dataUrl);
            } catch (e) {
                URL.revokeObjectURL(url);
                fileToBase64(file).then(resolve).catch(reject);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            fileToBase64(file).then(resolve).catch(reject);
        };
        img.src = url;
    });
};

export const fileToGenericBase64 = async (file: File): Promise<string> => {
  try { return await resizeImage(file); } 
  catch (e) { return await fileToBase64(file); }
};

// --- DETERMINISTIC SLICER (PURE MATH) ---
const sliceSpriteSheet = (base64Image: string, rows: number, cols: number): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // 1. Determine the "Active Square"
            const size = Math.min(img.width, img.height);
            const startX = (img.width - size) / 2;
            const startY = (img.height - size) / 2;

            // 2. Calculate Cell Size
            const rawCellW = size / cols;
            const rawCellH = size / rows;
            
            // 3. Safety Inset (The "Bleed" Fix)
            const insetFactor = 0.08; 
            const insetX = rawCellW * insetFactor;
            const insetY = rawCellH * insetFactor;
            const drawW = rawCellW * (1 - 2 * insetFactor);
            const drawH = rawCellH * (1 - 2 * insetFactor);

            const frames: string[] = [];
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(drawW);
            canvas.height = Math.floor(drawH);
            const ctx = canvas.getContext('2d');
            
            if(!ctx) { reject("Canvas context failed"); return; }

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const sx = startX + (c * rawCellW) + insetX;
                    const sy = startY + (r * rawCellH) + insetY;

                    ctx.drawImage(img, sx, sy, drawW, drawH, 0, 0, canvas.width, canvas.height);
                    frames.push(canvas.toDataURL('image/jpeg', 0.95));
                }
            }
            resolve(frames);
        };
        img.onerror = reject;
        img.src = base64Image;
    });
};

// --- MIRROR UTILITY ---
const mirrorFrame = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve(dataUrl);
            }
        };
        img.src = dataUrl;
    });
};

// --- PROMPT ENGINEERING ---
const constructDynamicPrompt = (
    category: SubjectCategory, 
    role: SheetRole, 
    stylePrompt: string, 
    motionPrompt: string
): string => {
    
    // 1. Strict Architecture - VISUAL DIAGRAM
    const arch = `
    ROLE: Professional 2D Game Asset Artist.
    TASK: Generate a 4x4 SPRITE SHEET (16 distinct frames) on a seamless WHITE background.

    [VISUAL STRUCTURE DIAGRAM]
    _______________________________________________________
    |             |             |             |             |
    |   [ P1 ]    |   [ P2 ]    |   [ P3 ]    |   [ P4 ]    |  <-- ROW 1: IDLE
    |_____________|_____________|_____________|_____________|
    |             |             |             |             |
    |   [ P5 ]    |   [ P6 ]    |   [ P7 ]    |   [ P8 ]    |  <-- ROW 2: LEFT
    |_____________|_____________|_____________|_____________|
    |             |             |             |             |
    |   [ P9 ]    |   [ P10 ]   |   [ P11 ]   |   [ P12 ]   |  <-- ROW 3: RIGHT
    |_____________|_____________|_____________|_____________|
    |             |             |             |             |
    |   [ P13 ]   |   [ P14 ]   |   [ P15 ]   |   [ P16 ]   |  <-- ROW 4: ACTION
    |_____________|_____________|_____________|_____________|

    STRICT GENERATION RULES:
    1. NO GRID LINES: The final output must be 16 characters floating on a pure white background. NO DRAWN BORDERS.
    2. SAFETY MARGIN: The subject must be centered in its invisible cell with at least 20% padding.
    3. NO CLIPPING: Hands/feet/hair must NEVER touch the edge of the imaginary grid cell.
    4. CONSISTENCY: Keep the character size and proportions identical across all 16 frames.
    `;

    // 2. Choreography Planning
    let choreography = "";
    if (category === 'CHARACTER') {
        choreography = `
        CHOREOGRAPHY PLAN:
        ROW 1 (Frames 1-4): IDLE & BREATHING. Front-facing, subtle movement.
        ROW 2 (Frames 5-8): MOVING LEFT. Stepping or leaning Left.
        ROW 3 (Frames 9-12): MOVING RIGHT. Stepping or leaning Right.
        ROW 4 (Frames 13-16): HIGH ENERGY / JUMP. Power pose or Jump.
        `;
    } else if (category === 'TEXT') {
        choreography = `
        KINETIC TYPE PLAN:
        ROW 1: Base Legible. ROW 2: Skew Left (Blur). ROW 3: Skew Right (Blur). ROW 4: Distortion/Glitch.
        `;
    } else { 
        choreography = `
        ANIMATION PLAN:
        ROW 1: Pulse. ROW 2: Rotate Left. ROW 3: Rotate Right. ROW 4: Burst/Glow.
        `;
    }

    // 3. Style Injection
    const style = `
    VISUAL STYLE: ${stylePrompt}.
    CONTEXT: ${motionPrompt}.
    IMPORTANT: Flat, clear lighting. Production-ready asset.
    `;
    
    // 4. Role Specific Adjustments
    let roleInstruction = "";
    if (role === 'flourish') {
        roleInstruction = `\nVARIATION MODE: FLOURISH. Generate EXAGGERATED, HIGH-ENERGY versions of the moves. More dynamic action lines.`;
    } else if (role === 'alt') {
        roleInstruction = `\nVARIATION MODE: ALTERNATE. Generate different angles or timing for the same moves.`;
    }

    return `${arch}\n${choreography}\n${style}\n${roleInstruction}`;
};

// --- GENERATION UNIT ---
const generateSingleSheet = async (
    ai: GoogleGenAI,
    role: SheetRole,
    imageBase64: string,
    stylePrompt: string,
    motionPrompt: string,
    category: SubjectCategory,
    styleReferenceBase64?: string
): Promise<{ frames: GeneratedFrame[], sheetBase64?: string }> => {
    
    const rows = 4;
    const cols = 4;
    
    let systemPrompt = constructDynamicPrompt(category, role, stylePrompt, motionPrompt);

    // INJECT CONSISTENCY INSTRUCTION
    if (styleReferenceBase64) {
        systemPrompt += `
        \n\n[STYLE CONSISTENCY ENFORCEMENT]
        You have been provided with TWO images.
        Image 1: The Source Identity.
        Image 2: A 'Reference Sprite Sheet' (STYLE TARGET).
        TASK: Generate a NEW sprite sheet (Role: ${role}) that matches the STYLE of Image 2.
        - Same pixel art/brush style.
        - Same color palette and lighting.
        - CONSISTENCY IS CRITICAL.
        `;
    }

    console.log(`[Gemini] Planning ${role} sheet for ${category}...`);

    try {
        const parts: any[] = [
            { text: systemPrompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
        ];

        if (styleReferenceBase64) {
            const cleanRef = styleReferenceBase64.includes(',') ? styleReferenceBase64.split(',')[1] : styleReferenceBase64;
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanRef } });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                { role: 'user', parts: parts }
            ],
            config: {
                imageConfig: { aspectRatio: "1:1" }
            }
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) throw new Error("No content returned");
        
        const part = candidate.content.parts.find(p => p.inlineData?.data);
        const spriteSheetBase64 = part?.inlineData?.data;

        if (!spriteSheetBase64) throw new Error("No image data in response");

        // Deterministic Slice
        const rawFrames = await sliceSpriteSheet(`data:image/jpeg;base64,${spriteSheetBase64}`, rows, cols);
        
        // Parallel Frame Processing (Metadata + Mirroring)
        const processPromises = rawFrames.map(async (frameData, i) => {
             const results: GeneratedFrame[] = [];
             let energy: EnergyLevel = 'mid';
             let type: FrameType = 'body';
             const row = Math.floor(i / cols); 

             if (row === 0) energy = 'low';      
             else if (row === 1) energy = 'mid'; 
             else if (row === 2) energy = 'mid'; 
             else if (row === 3) {
                 energy = 'high'; 
                 if (category === 'CHARACTER' && Math.random() > 0.6) type = 'closeup';
             }

             let poseName = `${role}_${i}`;
             if (category === 'CHARACTER') {
                 if (row === 1) poseName += '_left';
                 if (row === 2) poseName += '_right';
             }

             results.push({
                 url: frameData,
                 pose: poseName,
                 energy,
                 type,
                 role
             });
             
             // Mirroring Logic
             if (category === 'CHARACTER' && type === 'body') {
                 if (row === 1 || row === 2) {
                     const mirrored = await mirrorFrame(frameData);
                     const mirrorSuffix = poseName.includes('left') ? 'right_mirror' : 'left_mirror';
                     results.push({
                        url: mirrored,
                        pose: poseName.replace(/left|right/, mirrorSuffix), 
                        energy,
                        type,
                        role
                     });
                 }
             }
             return results;
        });

        const nestedFrames = await Promise.all(processPromises);
        return { frames: nestedFrames.flat(), sheetBase64: spriteSheetBase64 };

    } catch (e) {
        console.error(`Sheet generation failed (${role}):`, e);
        return { frames: [], sheetBase64: undefined }; 
    }
};

export const generateDanceFrames = async (
  imageBase64: string,
  stylePrompt: string,
  motionPrompt: string,
  useTurbo: boolean,
  superMode: boolean,
  explicitCategory?: SubjectCategory
): Promise<{ frames: GeneratedFrame[], category: SubjectCategory }> => {

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  let category: SubjectCategory = 'CHARACTER';
  if (explicitCategory) category = explicitCategory;
  else {
      const low = motionPrompt.toLowerCase();
      if (low.includes('text') || low.includes('font')) category = 'TEXT';
      else if (low.includes('logo') || low.includes('icon')) category = 'SYMBOL';
  }
  
  // STRATEGY:
  // 1. TURBO: Base Sheet Only (Fastest).
  // 2. QUALITY: Base Sheet -> Alt Sheet (Sequential, ensuring consistency).
  // 3. SUPER: Base Sheet -> [Alt + Flourish] (Parallel, max variety).

  // STEP 1: GENERATE BASE SHEET (Source of Truth)
  console.time("BaseGen");
  const baseResult = await generateSingleSheet(ai, 'base', imageBase64, stylePrompt, motionPrompt, category);
  console.timeEnd("BaseGen");
  
  let allFrames = baseResult.frames;
  if (baseResult.frames.length === 0 || !baseResult.sheetBase64) throw new Error("Base generation failed.");

  const baseRef = `data:image/jpeg;base64,${baseResult.sheetBase64}`;
  const expansionPromises: Promise<any>[] = [];

  // STEP 2: EXPANSION
  if (superMode) {
      console.log("[Gemini] Super Mode: Launching parallel expansion...");
      expansionPromises.push(
          generateSingleSheet(ai, 'alt', imageBase64, stylePrompt, motionPrompt, category, baseRef)
      );
      expansionPromises.push(
          generateSingleSheet(ai, 'flourish', imageBase64, stylePrompt, motionPrompt, category, baseRef)
      );
  } else if (!useTurbo) {
      console.log("[Gemini] Quality Mode: Queuing sequential expansion...");
      // In this async flow, pushing to promise array after Base is done IS sequential relative to Base.
      expansionPromises.push(
          generateSingleSheet(ai, 'alt', imageBase64, stylePrompt, motionPrompt, category, baseRef)
      );
  }

  if (expansionPromises.length > 0) {
      console.time("ExpansionGen");
      const results = await Promise.all(expansionPromises);
      console.timeEnd("ExpansionGen");
      
      results.forEach(res => {
          if (res.frames.length > 0) {
              allFrames = [...allFrames, ...res.frames];
          }
      });
  }

  if (allFrames.length === 0) throw new Error("Generation produced no valid frames.");

  return { frames: allFrames, category };
};
