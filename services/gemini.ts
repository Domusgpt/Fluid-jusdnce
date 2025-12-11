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
            // If the AI returns a non-square image, we crop to the center square.
            const size = Math.min(img.width, img.height);
            const startX = (img.width - size) / 2;
            const startY = (img.height - size) / 2;

            // 2. Calculate Cell Size
            const rawCellW = size / cols;
            const rawCellH = size / rows;
            
            // 3. Safety Inset (The "Bleed" Fix)
            // Aggressive inset to prevent vertical double-frame issues.
            // We assume the subject is centered in the cell.
            const insetFactor = 0.08; // 8% cut from each side
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
                    
                    // Math: Grid Start + Inset
                    const sx = startX + (c * rawCellW) + insetX;
                    const sy = startY + (r * rawCellH) + insetY;

                    ctx.drawImage(
                        img, 
                        sx, sy, drawW, drawH,    // Source
                        0, 0, canvas.width, canvas.height // Dest
                    );
                    
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
    
    // 1. Strict Architecture - VISUAL DIAGRAM & CONSTRAINTS
    // We use an ASCII diagram to force the AI to understand the 4x4 grid structure spatially.
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
    1. NO GRID LINES: The lines in the diagram above are for layout reference only. The final output must be 16 characters floating on a pure white background. NO DRAWN BORDERS.
    2. SAFETY MARGIN (PADDING): The subject (shown as [ Px ]) must be centered in its invisible cell with at least 20% white space padding on all sides.
    3. NO CLIPPING: Hands, feet, and hair must NEVER touch the edge of the imaginary grid cell. Scale the character down if necessary to fit dynamic poses.
    4. CONSISTENCY: Keep the character size and proportions identical across all 16 frames.
    `;

    // 2. Choreography Planning (The Soul)
    // Maps rows to specific functions so the App knows how to use them.
    let choreography = "";

    if (category === 'CHARACTER') {
        choreography = `
        CHOREOGRAPHY PLAN:
        ROW 1 (Frames 1-4): IDLE & BREATHING.
           - Front-facing. Subtle movements. 
           - Feet planted firmly.
        ROW 2 (Frames 5-8): MOVING LEFT.
           - Stepping or leaning Left. 
           - Arms countering motion. Ensure limbs stay inside the cell padding.
        ROW 3 (Frames 9-12): MOVING RIGHT.
           - Stepping or leaning Right.
           - Arms countering motion. Ensure limbs stay inside the cell padding.
        ROW 4 (Frames 13-16): HIGH ENERGY / JUMP.
           - Power pose or Jump.
           - CRITICAL: If jumping, make the character smaller to ensure they don't hit the top of the grid cell.
        `;
    } 
    else if (category === 'TEXT') {
        choreography = `
        KINETIC TYPE PLAN:
        ROW 1: Base Legible State. Clean.
        ROW 2: Skew/Italicize Left with Motion Blur lines.
        ROW 3: Skew/Italicize Right with Motion Blur lines.
        ROW 4: Heavy Distortion / Explosion / Glitch / Fragments.
        *IMPORTANT*: Keep text centered and contained within the grid cells.
        `;
    } 
    else { // SYMBOL/LOGO
        choreography = `
        ANIMATION PLAN:
        ROW 1: Base State (Pulse).
        ROW 2: Rotate Left (-30deg) with trail.
        ROW 3: Rotate Right (+30deg) with trail.
        ROW 4: Activation (Glow/Burst/High Contrast).
        *IMPORTANT*: Keep the symbol small enough to rotate without clipping the grid edges.
        `;
    }

    // 3. Style Injection
    const style = `
    VISUAL STYLE: ${stylePrompt}.
    CONTEXT: ${motionPrompt}.
    IMPORTANT: Ensure consistent character features and FLAT, CLEAR LIGHTING across all 16 frames. 
    The goal is a production-ready sprite sheet that can be sliced automatically.
    `;

    return `${arch}\n${choreography}\n${style}`;
};

// --- GENERATION UNIT ---
const generateSingleSheet = async (
    ai: GoogleGenAI,
    role: SheetRole,
    imageBase64: string,
    stylePrompt: string,
    motionPrompt: string,
    category: SubjectCategory
): Promise<GeneratedFrame[]> => {
    
    const rows = 4;
    const cols = 4;
    
    const systemPrompt = constructDynamicPrompt(category, role, stylePrompt, motionPrompt);

    console.log(`[Gemini] Planning ${role} sheet for ${category}...`);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                { role: 'user', parts: [
                    { text: systemPrompt },
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
                ]}
            ],
            config: {
                imageConfig: { aspectRatio: "1:1" }
            }
        });

        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("No candidate returned");
        
        let spriteSheetBase64: string | undefined;
        if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                    spriteSheetBase64 = part.inlineData.data;
                    break;
                }
            }
        }

        if (!spriteSheetBase64) throw new Error("No image data in response");

        // Deterministic Slice
        const rawFrames = await sliceSpriteSheet(`data:image/jpeg;base64,${spriteSheetBase64}`, rows, cols);
        const finalFrames: GeneratedFrame[] = [];

        // Map Grid Index to Energy Level based on the Choreography Plan
        for (let i = 0; i < rawFrames.length; i++) {
            let energy: EnergyLevel = 'mid';
            let type: FrameType = 'body';
            const row = Math.floor(i / cols); // 0, 1, 2, 3
            
            // Logic must match the Choreography Plan above
            if (row === 0) energy = 'low';      // Idle
            else if (row === 1) energy = 'mid'; // Left
            else if (row === 2) energy = 'mid'; // Right
            else if (row === 3) {
                energy = 'high'; // Impact
                if (category === 'CHARACTER' && Math.random() > 0.6) type = 'closeup'; // Row 4 can be abstract
            }

            let poseName = `${role}_${i}`;
            
            // Tag direction for the brain
            if (category === 'CHARACTER') {
                if (row === 1) poseName += '_left';
                if (row === 2) poseName += '_right';
            }

            finalFrames.push({
                url: rawFrames[i],
                pose: poseName,
                energy,
                type,
                role
            });
            
            // Mirroring Logic - "The Free Frames"
            // We mirror Row 1 (Idle) and Row 4 (Impact) sometimes too for variation, 
            // but definitely Row 2 & 3 to get the opposite direction.
            if (category === 'CHARACTER' && type === 'body') {
                 // Always mirror the directional rows to fill out the movement
                 if (row === 1 || row === 2) {
                     const mirrored = await mirrorFrame(rawFrames[i]);
                     const mirrorSuffix = poseName.includes('left') ? 'right_mirror' : 'left_mirror';
                     finalFrames.push({
                        url: mirrored,
                        pose: poseName.replace(/left|right/, mirrorSuffix), 
                        energy,
                        type,
                        role
                     });
                 }
            }
        }
        
        return finalFrames;

    } catch (e) {
        console.error(`Sheet generation failed (${role}):`, e);
        return []; 
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
  
  const promises: Promise<GeneratedFrame[]>[] = [];

  // Generate Base Sheet
  promises.push(generateSingleSheet(ai, 'base', imageBase64, stylePrompt, motionPrompt, category));

  // If Super Mode, generate a second sheet for Variations ("alt")
  if (superMode) {
     promises.push(generateSingleSheet(ai, 'alt', imageBase64, stylePrompt, motionPrompt, category));
  }

  const results = await Promise.all(promises);
  const allFrames = results.flat();

  if (allFrames.length === 0) throw new Error("Generation produced no valid frames.");

  return { frames: allFrames, category };
};