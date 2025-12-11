
import { HolographicParams } from "./components/Visualizer/HolographicVisualizer";

export enum AppStep {
  ASSETS = 1,
  DIRECTOR = 2,
  PREVIEW = 3,
}

export type StyleCategory = 'Cinematic' | 'Anime/2D' | 'Digital/Glitch' | 'Artistic';
export type SubjectCategory = 'CHARACTER' | 'TEXT' | 'SYMBOL';
export type FrameType = 'body' | 'closeup'; // NEW: Distinguish full body from facial frames
export type SheetRole = 'base' | 'alt' | 'flourish'; // NEW: Which sheet did this come from?

export interface StylePreset {
  id: string;
  name: string;
  category: StyleCategory;
  description: string;
  promptModifier: string;
  thumbnail: string;
  hologramParams: HolographicParams; // Links style to background shader
}

export type EnergyLevel = 'low' | 'mid' | 'high';
export type UserTier = 'free' | 'pro';

// Flexible pose type string
export type PoseType = string;

export interface GeneratedFrame {
  url: string;
  pose: PoseType;
  energy: EnergyLevel;
  type?: FrameType; 
  role?: SheetRole; // NEW
  promptUsed?: string; 
}

export interface SavedProject {
    id: string;
    name: string;
    createdAt: number;
    frames: GeneratedFrame[];
    styleId: string;
    subjectCategory: SubjectCategory;
}

export interface AuthUser {
  uid: string; // Firebase UID
  name: string;
  email: string;
  photoURL: string;
}

export interface AppState {
  step: AppStep;
  user: AuthUser | null; // Auth state
  showAuthModal: boolean;
  showPaymentModal: boolean;
  
  userTier: UserTier;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  audioFile: File | null;
  audioPreviewUrl: string | null;
  selectedStyleId: string;
  
  // Advanced / Morphing State
  secondaryStyleId: string; // Target style to morph into
  morphIntensity: number;   // 0-100: Blend factor between Primary and Secondary
  reactivity: number;       // 0-100: Audio sensitivity
  
  motionPrompt: string; 
  motionPreset: string; // Added for dropdown
  useTurbo: boolean; // Toggle for speed vs quality
  superMode: boolean; // NEW: Paid 15-frame mode
  
  intensity: number; // 0-100 (Generation energy)
  duration: number; // seconds
  smoothness: number; // 0-100 (Hard cut vs Crossfade)
  stutter: number; // 0-100 (Probability of double-time moves)
  generatedFrames: GeneratedFrame[]; 
  subjectCategory: SubjectCategory; // NEW: Detected subject type
  isGenerating: boolean;
  credits: number;
}

export const DEFAULT_STATE: AppState = {
  step: AppStep.ASSETS,
  user: null,
  showAuthModal: false,
  showPaymentModal: false,
  
  userTier: 'free',
  imageFile: null,
  imagePreviewUrl: null,
  audioFile: null,
  audioPreviewUrl: null,
  selectedStyleId: 'neon-cyber',
  
  secondaryStyleId: '',
  morphIntensity: 0,
  reactivity: 80,

  motionPrompt: '', // Default empty for auto-analysis
  motionPreset: 'auto', 
  useTurbo: true, // Default to fast
  superMode: false, // Default off
  
  intensity: 80, // High default
  duration: 30,
  smoothness: 20, // Default slight smoothing
  stutter: 50, // Moderate stutter chance
  generatedFrames: [],
  subjectCategory: 'CHARACTER',
  isGenerating: false,
  credits: 0, // Start with 0, require login to get free credit
};
