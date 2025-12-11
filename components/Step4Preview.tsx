import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Video, Settings, Mic, MicOff, Maximize2, Minimize2, Upload, X, Loader2, Sliders, Package, Music, ChevronDown, ChevronUp, Activity, Download, FileVideo, Radio, Star, Camera } from 'lucide-react';
import { AppState, EnergyLevel } from '../types';
import { QuantumVisualizer } from './Visualizer/HolographicVisualizer';
import { generatePlayerHTML } from '../services/playerExport';
import { STYLE_PRESETS } from '../constants';

interface Step4Props {
  state: AppState;
  onGenerateMore: () => void;
  onSpendCredit: (amount: number) => boolean;
  onUploadAudio: (file: File) => void;
  onSaveProject: () => void;
}

export const Step4Preview: React.FC<Step4Props> = ({ state, onGenerateMore, onSpendCredit, onUploadAudio, onSaveProject }) => {
  // Canvases
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const charCanvasRef = useRef<HTMLCanvasElement>(null); 
  const containerRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Systems
  const hologramRef = useRef<QuantumVisualizer | null>(null);
  
  // Audio Graph
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  
  // Animation State
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  
  // RHYTHM & BRAIN STATE
  const lastSwitchTimeRef = useRef<number>(0); 
  const lastBeatTimeRef = useRef<number>(0);
  const lastSnareTimeRef = useRef<number>(0);
  const beatCounterRef = useRef<number>(0); // Tracks 1-2-3-4 pattern
  
  // Logic State
  const [brainState, setBrainState] = useState({
      intention: 'IDLE',
      nextDir: 'LEFT' as 'LEFT' | 'RIGHT' | 'HOLD',
      confidence: 0,
      activePoseName: 'BASE',
  });

  // Interpolation & Burst State
  const targetPoseRef = useRef<string>('base'); 
  const previousPoseRef = useRef<string>('base'); // For Virtual Frame Interp
  const transitionStartRef = useRef<number>(0); // Timestamp of transition start
  const transitionDurationRef = useRef<number>(100); // Dynamic interpolation time
  const transitionModeRef = useRef<'CUT' | 'FLOW'>('CUT'); // Logic for blending
  
  const burstModeUntilRef = useRef<number>(0);
  const lastMoveDirectionRef = useRef<'left' | 'right'>('right'); 
  
  // Virtual Camera & Physics
  const camZoomRef = useRef<number>(1.0);
  const camShakeXRef = useRef<number>(0);
  const camShakeYRef = useRef<number>(0);
  const camRotationRef = useRef<number>(0);
  const camPanXRef = useRef<number>(0); 
  const camPanYRef = useRef<number>(0);
  const swayPhaseRef = useRef<number>(0); // Smooth idle sway
  
  // FX Refs
  const moireAmountRef = useRef<number>(0); 
  const tearAmountRef = useRef<number>(0); 
  const flashIntensityRef = useRef<number>(0); // Lighting overlay intensity
  
  // Dynamic Frame Pools
  const [framesByEnergy, setFramesByEnergy] = useState<Record<EnergyLevel, string[]>>({ low: [], mid: [], high: [] });
  const [closeupFrames, setCloseupFrames] = useState<string[]>([]); 

  // Assets
  const poseImagesRef = useRef<Record<string, HTMLImageElement>>({}); 
  const [imagesReady, setImagesReady] = useState(false);
  
  // UI State
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [superCamActive, setSuperCamActive] = useState(true); 

  // Local Settings
  const [stutterChance, setStutterChance] = useState(state.stutter);
  
  // ---------------------------------------------------------------------------
  // 1. Initialize Hologram & Assets & Sort Frames
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Init Visualizer
    if (bgCanvasRef.current && !hologramRef.current) {
        try {
            hologramRef.current = new QuantumVisualizer(bgCanvasRef.current);
            const style = STYLE_PRESETS.find(s => s.id === state.selectedStyleId);
            if(style && style.hologramParams) {
                hologramRef.current.params = {...style.hologramParams};
            }
        } catch (e) {
            console.error("Failed to init hologram:", e);
        }
    }

    // Sort Frames
    const sorted: Record<EnergyLevel, string[]> = { low: [], mid: [], high: [] };
    const closeups: string[] = [];

    const framesToLoad = state.generatedFrames.length > 0 
      ? state.generatedFrames 
      : (state.imagePreviewUrl ? [{ url: state.imagePreviewUrl, pose: 'base', energy: 'low' as EnergyLevel, type: 'body' as const }] : []);

    framesToLoad.forEach(f => {
        if (f.type === 'closeup') {
            closeups.push(f.pose);
        } else {
            if (sorted[f.energy]) sorted[f.energy].push(f.pose);
        }
    });
    
    // Fallbacks
    if (sorted.low.length === 0 && framesToLoad.length > 0 && framesToLoad[0].type === 'body') sorted.low.push(framesToLoad[0].pose);
    if (sorted.mid.length === 0) sorted.mid = [...sorted.low]; 
    if (sorted.high.length === 0) sorted.high = [...sorted.mid]; 
    
    setFramesByEnergy(sorted);
    setCloseupFrames(closeups);

    // Load Images
    let loaded = 0;
    const newMap: Record<string, HTMLImageElement> = {};
    const total = framesToLoad.length;
    
    if (total === 0) {
        setImagesReady(true);
        return;
    }

    framesToLoad.forEach(f => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = f.url;
        img.onload = () => {
            newMap[f.pose] = img;
            loaded++;
            if (loaded === total) {
                poseImagesRef.current = newMap;
                setImagesReady(true);
            }
        };
        img.onerror = () => {
            console.warn(`Failed to load frame: ${f.pose}`);
            loaded++;
            if (loaded === total) {
                poseImagesRef.current = newMap;
                setImagesReady(true);
            }
        };
    });
  }, [state.generatedFrames, state.imagePreviewUrl, state.selectedStyleId]);

  useEffect(() => {
    return () => {
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Audio Engine
  // ---------------------------------------------------------------------------
  
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    setIsPlaying(false);
  }, [state.audioPreviewUrl]);

  const initAudioContext = () => {
      if (audioCtxRef.current) return audioCtxRef.current;
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024; // Faster FFT
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      analyser.connect(ctx.destination); 

      return ctx;
  };

  const toggleMic = async () => {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      if (isMicActive) {
          micStreamRef.current?.getTracks().forEach(t => t.stop());
          micStreamRef.current = null;
          setIsMicActive(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              micStreamRef.current = stream;
              const source = ctx.createMediaStreamSource(stream);
              
              if (analyserRef.current) {
                  source.connect(analyserRef.current);
                  analyserRef.current.disconnect(); 
              }
              
              setIsMicActive(true);
              setIsPlaying(true);
              if (audioRef.current) audioRef.current.pause(); 
          } catch (e) {
              console.error("Mic Access Denied", e);
              alert("Microphone access denied.");
          }
      }
  };

  const togglePlay = async () => {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      if (isMicActive) {
          setIsPlaying(!isPlaying);
          return;
      }

      if (state.audioPreviewUrl) {
          if (!audioRef.current) {
              const audio = new Audio();
              audio.crossOrigin = "anonymous";
              audio.src = state.audioPreviewUrl;
              audio.loop = true;
              
              const source = ctx.createMediaElementSource(audio);
              if (analyserRef.current) {
                  analyserRef.current.disconnect(); 
                  analyserRef.current.connect(ctx.destination);
                  source.connect(analyserRef.current);
              }
              audioRef.current = audio;
          }

          if (isPlaying) {
              audioRef.current.pause();
          } else {
              audioRef.current.play();
          }
          setIsPlaying(!isPlaying);
      } else {
          setIsPlaying(!isPlaying);
      }
  };

  // ---------------------------------------------------------------------------
  // 3. MAIN RENDER LOOP
  // ---------------------------------------------------------------------------
  const animate = useCallback((time: number) => {
    requestRef.current = requestAnimationFrame(animate);
    
    if (!startTimeRef.current) startTimeRef.current = time;
    
    const dt = Math.min((time - (lastFrameTimeRef.current || time)) / 1000, 0.1);
    lastFrameTimeRef.current = time;

    // --- 1. Audio Analysis ---
    let bass = 0, mid = 0, high = 0;
    
    if (isPlaying && analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Tuned Ranges
        bass = dataArray.slice(0, 8).reduce((a,b)=>a+b,0) / 8 / 255;  
        mid = dataArray.slice(15, 60).reduce((a,b)=>a+b,0) / 45 / 255; 
        high = dataArray.slice(100, 200).reduce((a,b)=>a+b,0) / 100 / 255; 
    } else if (isPlaying && !state.audioPreviewUrl && !isMicActive) {
        // Fallback Clock
        const bpm = 124;
        const beatDur = 60 / bpm;
        const now = time / 1000;
        const beatPos = (now % beatDur) / beatDur;
        bass = Math.pow(Math.max(0, 1 - beatPos * 4), 3); 
        mid = (now % (beatDur*2) > beatDur) && (beatPos < 0.2) ? 0.6 : 0; 
        high = Math.random() * 0.1;
    }

    // --- 2. Choreography Brain ---
    const now = time;
    const isBurst = now < burstModeUntilRef.current;
    
    // GATING
    const poseLockTime = isBurst ? 60 : 150; 
    const canSwitch = (now - lastSwitchTimeRef.current) > poseLockTime;

    // Reactivity Threshold
    const beatThreshold = 0.35; 
    const isBeatHit = bass > beatThreshold && canSwitch; 
    
    // Detect Snare (Mids) for Scanlines
    const isSnare = mid > 0.6;

    if (isPlaying) {
        
        // A. Standard Beat Hit
        if (isBeatHit) {
            lastBeatTimeRef.current = now;
            lastSwitchTimeRef.current = now;
            
            // PATTERN ENGINE (The Rhythm Brain)
            beatCounterRef.current = (beatCounterRef.current + 1) % 4;
            const isPatternCut = beatCounterRef.current < 2; // Beats 0, 1 = CUT. Beats 2, 3 = FLOW.
            
            const isHardHit = bass > 0.8;
            
            // Ping-Pong Direction Logic
            let nextDir: 'left' | 'right' = lastMoveDirectionRef.current === 'left' ? 'right' : 'left';
            if (Math.random() < 0.3) nextDir = lastMoveDirectionRef.current; 
            
            // Pool Selection
            let pool: string[] = [];
            
            if ((mid > 0.6 || high > 0.6) && closeupFrames.length > 0 && Math.random() > 0.5) {
                pool = closeupFrames;
            } else {
                 if (isHardHit) pool = framesByEnergy.high.length > 0 ? framesByEnergy.high : framesByEnergy.mid;
                 else pool = framesByEnergy.mid.length > 0 ? framesByEnergy.mid : framesByEnergy.low;
            }
            
            const dirPool = pool.filter(p => p.toLowerCase().includes(nextDir));
            const finalPool = dirPool.length > 0 ? dirPool : pool;
            
            if (finalPool.length > 0) {
                 const nextPose = finalPool[Math.floor(Math.random() * finalPool.length)];
                 
                 // Trigger Virtual Frame Transition
                 if (targetPoseRef.current !== nextPose) {
                     previousPoseRef.current = targetPoseRef.current;
                     targetPoseRef.current = nextPose;
                     transitionStartRef.current = now;
                     lastMoveDirectionRef.current = nextDir;
                     
                     // PATTERN LOGIC:
                     if (isHardHit || isPatternCut) {
                        transitionModeRef.current = 'CUT';
                        transitionDurationRef.current = 0; // Hard Cut
                     } else {
                        transitionModeRef.current = 'FLOW';
                        transitionDurationRef.current = 240; // Smooth Optical Flow Simulation
                     }

                     setBrainState(prev => ({
                         ...prev,
                         activePoseName: nextPose,
                         intention: transitionModeRef.current === 'CUT' ? 'IMPACT (CUT)' : 'GLIDE (FLOW)',
                         confidence: Math.round(bass * 100),
                         nextDir: nextDir === 'left' ? 'RIGHT' : 'LEFT'
                     }));
                 }
            }
            
            // Physics Impulse (Toned Down & More Rhythmic)
            if (superCamActive) {
                const shakeAmt = isHardHit ? 15 : 5; // Reduced shake
                
                // If cutting, we shake. If flowing, we don't shake, we Glide.
                if (transitionModeRef.current === 'CUT') {
                    camShakeXRef.current = (Math.random()-0.5) * shakeAmt;
                    camShakeYRef.current = (Math.random()-0.5) * shakeAmt;
                    camZoomRef.current = isHardHit ? 1.15 : 1.05; // Impact Zoom
                } else {
                    // During Flow, we add a velocity push to the Pan instead of shaking
                    camPanXRef.current += (nextDir === 'left' ? -20 : 20); 
                }
                
                // Lighting Flash triggered by beat
                if(isHardHit) {
                    flashIntensityRef.current = 0.8; 
                }
            }
        } 
        // B. Ambient / Idle Fallback
        else if (now - lastBeatTimeRef.current > 1500 && canSwitch && now - lastSwitchTimeRef.current > 1000) {
             lastSwitchTimeRef.current = now;
             const pool = framesByEnergy.low;
             if(pool.length > 0) {
                 const nextPose = pool[Math.floor(Math.random() * pool.length)];
                 if (targetPoseRef.current !== nextPose) {
                     previousPoseRef.current = targetPoseRef.current;
                     targetPoseRef.current = nextPose;
                     transitionStartRef.current = now;
                     transitionModeRef.current = 'FLOW';
                     transitionDurationRef.current = 800; // Super slow morph
                 }
             }
        }
        
        // C. Snare Logic (Reactive Scanlines)
        if (isSnare && now - lastSnareTimeRef.current > 800) {
             lastSnareTimeRef.current = now;
             moireAmountRef.current = 1.2; // Trigger Scanline/RGB Split
             if (Math.random() * 100 < stutterChance) {
                 burstModeUntilRef.current = now + 400;
             }
        }

        if (isBurst && canSwitch) {
            lastSwitchTimeRef.current = now;
            const pool = framesByEnergy.high.length > 0 ? framesByEnergy.high : framesByEnergy.mid;
            if(pool.length > 0) {
                 targetPoseRef.current = pool[Math.floor(Math.random() * pool.length)]; 
                 previousPoseRef.current = targetPoseRef.current; 
                 transitionModeRef.current = 'CUT';
                 transitionDurationRef.current = 0;
            }
        }
    }

    // --- 3. Physics & Camera ---
    
    const lerpSpeed = 6 * dt; 
    
    if (superCamActive) {
        // Sway Logic (Stillness)
        swayPhaseRef.current += dt * 0.5;
        const sway = Math.sin(swayPhaseRef.current) * 5;
        
        const energyInfluence = Math.min(1, bass * 2);
        
        // Target Pan incorporates the Sway AND any flow-based velocity
        const targetPanX = sway * (1 - energyInfluence);
        
        camPanXRef.current += (targetPanX - camPanXRef.current) * lerpSpeed;
        
        // Decay Impulses
        camShakeXRef.current *= (1 - lerpSpeed * 2);
        camShakeYRef.current *= (1 - lerpSpeed * 2);
        
        // Zoom Return
        // If we are in FLOW mode, we might want to hold the zoom slightly longer or "breathe"
        const targetZoom = (transitionModeRef.current === 'FLOW' && isPlaying) ? 1.05 : 1.0;
        camZoomRef.current += (targetZoom - camZoomRef.current) * (lerpSpeed * 0.5);
        
        // Effects Decay
        tearAmountRef.current *= 0.8;
        moireAmountRef.current *= 0.85; // Decay scanlines
        flashIntensityRef.current *= 0.85; // Decay lighting
    } else {
        camShakeXRef.current *= 0.9;
        camShakeYRef.current *= 0.9;
        camZoomRef.current += (1.0 - camZoomRef.current) * 0.1;
        camPanXRef.current *= 0.9;
    }

    // --- 4. Render ---
    if (hologramRef.current) {
        hologramRef.current.updateAudio({ bass, mid, high, energy: bass+mid });
        hologramRef.current.render(0); 
    }
    
    // Character Draw
    const charCtx = charCanvasRef.current?.getContext('2d');
    const charCanvas = charCanvasRef.current;

    if (charCtx && charCanvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = charCanvas.getBoundingClientRect();
        if (charCanvas.width !== rect.width * dpr || charCanvas.height !== rect.height * dpr) {
             charCanvas.width = rect.width * dpr;
             charCanvas.height = rect.height * dpr;
             charCtx.scale(dpr, dpr);
        }
        
        charCtx.clearRect(0,0, rect.width, rect.height);
        
        const renderFrame = (pose: string, opacity: number, offsetX: number = 0) => {
            if (opacity <= 0.01) return;
            
            const img = poseImagesRef.current[pose] || poseImagesRef.current['base'];
            if (img) {
                const cx = rect.width/2 + camShakeXRef.current + camPanXRef.current + offsetX;
                const cy = rect.height/2 + camShakeYRef.current + camPanYRef.current;
                const zoom = camZoomRef.current;
                
                const aspect = img.width / img.height;
                let dw = rect.width;
                let dh = dw / aspect;
                if (dh > rect.height) { dh = rect.height; dw = dh * aspect; }
                
                charCtx.save();
                charCtx.globalAlpha = opacity;
                
                // --- PASS 1: RGB SPLIT (Snare) ---
                if (superCamActive && moireAmountRef.current > 0.05) {
                    charCtx.save();
                    charCtx.translate(cx - 5 * moireAmountRef.current, cy);
                    charCtx.scale(zoom, zoom);
                    charCtx.globalCompositeOperation = 'screen';
                    charCtx.globalAlpha = 0.8 * moireAmountRef.current * opacity;
                    charCtx.drawImage(img, -dw/2, -dh/2, dw, dh);
                    charCtx.globalCompositeOperation = 'source-in';
                    charCtx.fillStyle = '#ff0000';
                    charCtx.fillRect(-dw/2, -dh/2, dw, dh);
                    charCtx.restore();

                    charCtx.save();
                    charCtx.translate(cx + 5 * moireAmountRef.current, cy);
                    charCtx.scale(zoom, zoom);
                    charCtx.globalCompositeOperation = 'screen';
                    charCtx.globalAlpha = 0.8 * moireAmountRef.current * opacity;
                    charCtx.drawImage(img, -dw/2, -dh/2, dw, dh);
                    charCtx.globalCompositeOperation = 'source-in';
                    charCtx.fillStyle = '#0000ff';
                    charCtx.fillRect(-dw/2, -dh/2, dw, dh);
                    charCtx.restore();
                    
                    charCtx.save();
                    charCtx.translate(cx, cy);
                    charCtx.scale(zoom, zoom);
                    charCtx.beginPath();
                    for(let i=0; i<dh; i+=4) {
                        charCtx.rect(-dw/2, -dh/2 + i, dw, 1);
                    }
                    charCtx.clip();
                    charCtx.drawImage(img, -dw/2, -dh/2, dw, dh);
                    charCtx.restore();
                }

                // --- PASS 2: MAIN IMAGE ---
                charCtx.save();
                charCtx.translate(cx, cy);
                charCtx.scale(zoom, zoom);
                
                if (tearAmountRef.current > 0.1) {
                     const slices = 8;
                     const hSlice = dh / slices;
                     const ihSlice = img.height / slices;
                     for(let i=0; i<slices; i++) {
                         const shift = (Math.random()-0.5) * 40 * tearAmountRef.current;
                         charCtx.drawImage(
                             img, 
                             0, i*ihSlice, img.width, ihSlice, // Source
                             -dw/2 + shift, -dh/2 + (i*hSlice), dw, hSlice // Dest
                         );
                     }
                } else {
                     charCtx.drawImage(img, -dw/2, -dh/2, dw, dh);
                }
                
                // --- PASS 3: DYNAMIC LIGHTING ---
                if (superCamActive && flashIntensityRef.current > 0.05) {
                    charCtx.globalCompositeOperation = 'overlay'; 
                    charCtx.globalAlpha = flashIntensityRef.current * opacity;
                    charCtx.fillStyle = '#ffeebb'; 
                    charCtx.fillRect(-dw/2, -dh/2, dw, dh);
                    
                    if (flashIntensityRef.current > 0.5) {
                        charCtx.globalCompositeOperation = 'lighter';
                        charCtx.globalAlpha = (flashIntensityRef.current - 0.5) * opacity;
                        charCtx.drawImage(img, -dw/2, -dh/2, dw, dh);
                    }
                }

                charCtx.restore();
                charCtx.restore();
            }
        };
        
        // VIRTUAL FRAME INTERPOLATION
        // Smart Rythmic Pattern Logic
        const duration = transitionDurationRef.current;
        let progress = 1;
        
        if (duration > 0) {
            progress = Math.min(1, (now - transitionStartRef.current) / duration);
        }
        
        if (progress < 1) {
            // VIRTUAL FRAME LOGIC
            if (transitionModeRef.current === 'FLOW') {
                // OPTICAL FLOW SIMULATION via Cubic Ease + Slide
                // We don't just fade, we slide the pixels to simulate movement direction
                
                // SmoothStep Ease: Smooth start and end
                const ease = progress * progress * (3 - 2 * progress);
                
                // Directional Slide
                const flowDir = lastMoveDirectionRef.current === 'left' ? -1 : 1;
                const slideDist = 40; // Pixels
                
                // Outgoing Frame: Slides AWAY (offset increases)
                renderFrame(previousPoseRef.current, 1 - ease, (slideDist * ease) * flowDir);
                
                // Incoming Frame: Slides IN (starts offset, moves to 0)
                renderFrame(targetPoseRef.current, ease, (-slideDist * (1 - ease)) * flowDir);
            } else {
                // Cut/Fast Mode - Simple Crossfade (Standard)
                renderFrame(previousPoseRef.current, 1 - progress);
                renderFrame(targetPoseRef.current, progress);
            }
        } else {
            // Static Frame
            renderFrame(targetPoseRef.current, 1.0);
        }
    }

  }, [isPlaying, framesByEnergy, closeupFrames, stutterChance, isMicActive, state.audioPreviewUrl, state.superMode, superCamActive]);

  useEffect(() => {
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // (Export logic remains the same)
  const handleExportPlayer = () => {
      const style = STYLE_PRESETS.find(s => s.id === state.selectedStyleId);
      const framesToExport = state.generatedFrames.length > 0 
          ? state.generatedFrames 
          : [{ url: state.imagePreviewUrl || '', pose: 'base', energy: 'low' as EnergyLevel, type: 'body' as const }];

      const html = generatePlayerHTML(
          framesToExport, 
          style?.hologramParams || {}, 
          state.subjectCategory
      );
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'My_DNCER_Rig.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full relative" ref={containerRef}>
      
      {/* TOOLBAR */}
      {!isZenMode && (
          <div className="flex flex-col xl:flex-row items-center justify-between p-4 bg-black/80 border-b border-white/10 backdrop-blur-xl z-20 gap-4">
             {/* LEFT: SOURCES */}
             <div className="flex items-center gap-3 w-full xl:w-auto justify-center bg-white/5 p-2 rounded-xl border border-white/5">
                 <button 
                    onClick={toggleMic}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold text-xs ${isMicActive ? 'bg-red-500 text-white shadow-lg animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                 >
                     {isMicActive ? <><MicOff size={16} /> LIVE MIC ACTIVE</> : <><Mic size={16} /> ENABLE MIC</>}
                 </button>
                 <button 
                    onClick={() => audioInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-xs"
                 >
                     <Upload size={16} /> CHANGE SONG
                 </button>
                 <input type="file" ref={audioInputRef} onChange={(e) => { if(e.target.files?.[0]) onUploadAudio(e.target.files[0]) }} className="hidden" accept="audio/*"/>
             </div>

             {/* CENTER: PLAYBACK */}
             <div className="flex items-center gap-4 w-full xl:w-auto justify-center">
                 <button 
                    onClick={togglePlay} 
                    className={`
                        px-10 py-3 rounded-full font-black text-white shadow-lg transition-transform hover:scale-105 flex items-center gap-3 tracking-wider
                        ${isPlaying ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-brand-600 hover:bg-brand-500'}
                    `}
                 >
                     {isPlaying ? <><Pause size={24} fill="currentColor" /> PAUSE STREAM</> : <><Play size={24} fill="currentColor" /> START PLAYBACK</>}
                 </button>
                 
                 {/* DYNAMIC CAM TOGGLE */}
                 <button 
                    onClick={() => setSuperCamActive(!superCamActive)}
                    className={`p-3 rounded-full transition-all border ${superCamActive ? 'bg-brand-600 text-white border-brand-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-white/10 text-gray-400 border-transparent hover:text-white'}`}
                    title="Toggle Dynamic Camera"
                 >
                     <Camera size={20} />
                 </button>

                 <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 rounded-full hover:bg-white/10 transition-all ${showSettings ? 'bg-white/10 text-white' : 'text-gray-400'}`}
                    title="Motion & Physics"
                 >
                     <Sliders size={20} />
                 </button>
                 <button onClick={() => setIsZenMode(true)} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-full" title="Zen Mode">
                     <Maximize2 size={20} />
                 </button>
             </div>

             {/* RIGHT: EXPORT STATION */}
             <div className="flex items-center gap-3 w-full xl:w-auto justify-center bg-black/40 p-2 rounded-xl border border-white/10">
                 <button 
                    onClick={handleExportPlayer}
                    className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-brand-300 transition-all border border-white/10 hover:border-brand-500/30 flex items-center gap-2 text-xs font-bold"
                 >
                     <Package size={16} /> SAVE WIDGET
                 </button>
             </div>
          </div>
      )}

      {/* VIEWPORT */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black perspective-1000">
          <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />
          
          <div className="relative z-10 w-full max-w-2xl aspect-[9/16] pointer-events-none flex items-center justify-center transition-transform duration-100 ease-out will-change-transform">
              <canvas ref={charCanvasRef} className="w-full h-full" />
          </div>
          
          {isZenMode && (
              <button 
                onClick={() => setIsZenMode(false)}
                className="absolute top-4 right-4 z-50 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
              >
                  <Minimize2 size={24} />
              </button>
          )}

          {!isZenMode && showSettings && (
              <div className="absolute top-20 right-4 z-40 w-72 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl animate-slide-in-right">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <h4 className="text-white font-bold flex items-center gap-2"><Sliders size={18}/> PHYSICS & LOGIC</h4>
                      <button onClick={() => setShowSettings(false)}><X size={18} className="text-gray-400 hover:text-white"/></button>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="text-xs text-gray-400 font-bold mb-2 block">STUTTER CHANCE</label>
                          <input type="range" min="0" max="100" value={stutterChance} onChange={(e) => setStutterChance(Number(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"/>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                           <button onClick={onSaveProject} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 border border-white/10">
                               <Music size={14} /> SAVE PROJECT FILE
                           </button>
                      </div>
                  </div>
              </div>
          )}

          {!isZenMode && (
              <div className="absolute bottom-4 left-4 z-30 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs font-mono space-y-1">
                      <div className="flex items-center gap-2 text-brand-300 font-bold">
                          <Activity size={12} /> {brainState.activePoseName}
                      </div>
                      <div className="text-gray-400">{brainState.intention}</div>
                      <div className="flex items-center gap-2 mt-1">
                          <span className={`transition-colors ${brainState.nextDir === 'LEFT' ? 'text-white' : 'text-gray-600'}`}>L</span>
                          <div className="w-10 h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-500 transition-all duration-100" style={{ width: `${brainState.confidence}%` }} />
                          </div>
                          <span className={`transition-colors ${brainState.nextDir === 'RIGHT' ? 'text-white' : 'text-gray-600'}`}>R</span>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};