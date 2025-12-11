
import React, { useEffect, useRef } from 'react';
import { QuantumVisualizer, HolographicParams } from './Visualizer/HolographicVisualizer';
import { AppState, AppStep } from '../types';
import { STYLE_PRESETS } from '../constants';

interface Props {
  appState: AppState;
}

// Linear interpolation helper
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export const GlobalBackground: React.FC<Props> = ({ appState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<QuantumVisualizer | null>(null);
  
  const currentParams = useRef<HolographicParams>({
    hue: 200,
    saturation: 0.8,
    intensity: 0.6,
    geometryType: 0, 
    speed: 0.1,
    chaos: 0.5,
    morph: 0.0,
    density: 2.0, // High density by default (Fog/Foam)
    gridOpacity: 0.0
  });

  const interactionState = useRef({
    isActive: 0.0, // 0 = Idle, 1 = Interacting
    lastActivity: 0
  });
  
  // Override mechanism for temporary color shifts
  const overrideParams = useRef<{ hue: number | null }>({ hue: null });

  useEffect(() => {
    if (canvasRef.current && !visualizerRef.current) {
      try {
        visualizerRef.current = new QuantumVisualizer(canvasRef.current);
      } catch (e) {
        console.error("Failed to init Quantum visualizer:", e);
      }
    }

    const handleResize = () => {
      if (visualizerRef.current) visualizerRef.current.resize();
    };
    window.addEventListener('resize', handleResize);

    const handleInteraction = (e: CustomEvent) => {
        // Any interaction wakes up the system and clears the density
        interactionState.current.isActive = 1.0;
        interactionState.current.lastActivity = Date.now();
    };
    
    const handleColorShift = (e: CustomEvent) => {
        overrideParams.current.hue = e.detail.hue;
        // Reset override after 2 seconds
        setTimeout(() => {
            overrideParams.current.hue = null;
        }, 2000);
    };

    const handleMouseMove = () => {
        interactionState.current.isActive = 1.0;
        interactionState.current.lastActivity = Date.now();
    };

    window.addEventListener('ui-interaction' as any, handleInteraction as any);
    window.addEventListener('color-shift' as any, handleColorShift as any);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('ui-interaction' as any, handleInteraction as any);
      window.removeEventListener('color-shift' as any, handleColorShift as any);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    let reqId: number;

    const render = () => {
      if (visualizerRef.current) {
        
        let target: HolographicParams = { ...currentParams.current };
        
        // BASE PARAMS PER STEP
        if (appState.step === AppStep.ASSETS) {
             target = {
                 hue: 200, // Cyan
                 saturation: 0.8,
                 intensity: 0.6, 
                 chaos: 0.3,
                 speed: 0.1,
                 density: 2.0,
                 geometryType: 0
             };
        }
        else if (appState.step === AppStep.DIRECTOR) {
            const style = STYLE_PRESETS.find(s => s.id === appState.selectedStyleId);
            if (style && style.hologramParams) {
                target = { ...target, ...style.hologramParams };
            }
            
            // --- STYLE MORPHING LOGIC ---
            if (appState.secondaryStyleId) {
                const secStyle = STYLE_PRESETS.find(s => s.id === appState.secondaryStyleId);
                if (secStyle && secStyle.hologramParams) {
                    const mix = (appState.morphIntensity || 0) / 100;
                    
                    // LERP all visual parameters
                    const l = (a: number, b: number) => lerp(a || 0, b || 0, mix);

                    target.hue = l(target.hue!, secStyle.hologramParams.hue!);
                    target.saturation = l(target.saturation!, secStyle.hologramParams.saturation!);
                    target.intensity = l(target.intensity!, secStyle.hologramParams.intensity!);
                    target.speed = l(target.speed!, secStyle.hologramParams.speed!);
                    target.chaos = l(target.chaos!, secStyle.hologramParams.chaos!);
                    target.morph = l(target.morph!, secStyle.hologramParams.morph!);
                    target.density = l(target.density!, secStyle.hologramParams.density!);
                    
                    // Geometry type is discrete, switch at 50%
                    if (mix > 0.5 && secStyle.hologramParams.geometryType !== undefined) {
                        target.geometryType = secStyle.hologramParams.geometryType;
                    }
                }
            }

            if (appState.isGenerating) {
                target = { ...target, hue: 40, intensity: 1.5, speed: 2.0, chaos: 1.0 };
            }
        }
        else if (appState.step === AppStep.PREVIEW) {
            target = { ...target, intensity: 0.8, speed: 0.3 };
        }
        
        // Apply Override if active
        if (overrideParams.current.hue !== null) {
            target.hue = overrideParams.current.hue;
        }

        // --- INVERSE DENSITY LOGIC ---
        // If inactive for > 1 second, start decaying interaction state
        if (Date.now() - interactionState.current.lastActivity > 1000) {
            interactionState.current.isActive *= 0.95; // Slow decay back to idle
        }

        // Idle = High Density (2.5), Interaction = Low Density (0.5)
        // We invert the interaction state
        target.density = lerp(2.5, 0.4, interactionState.current.isActive);

        // LERP to Target (Smooth Transition)
        const t = 0.05;
        const curr = currentParams.current;

        curr.hue = lerp(curr.hue!, target.hue!, t);
        curr.saturation = lerp(curr.saturation!, target.saturation!, t);
        curr.intensity = lerp(curr.intensity!, target.intensity!, t);
        curr.speed = lerp(curr.speed!, target.speed!, t);
        curr.chaos = lerp(curr.chaos!, target.chaos!, t);
        curr.morph = lerp(curr.morph!, target.morph!, t);
        curr.density = lerp(curr.density!, target.density!, t);
        curr.geometryType = target.geometryType;
        
        visualizerRef.current.params = curr;

        // Audio Reactivity (Idle Mode)
        if (appState.step !== AppStep.PREVIEW) {
             const reactivity = (appState.reactivity ?? 80) / 100;
             const time = Date.now() / 1000;
             visualizerRef.current.updateAudio({
                 bass: (Math.sin(time)*0.05 + 0.05) * reactivity, 
                 mid: 0, 
                 high: 0, 
                 energy: 0
             });
        }

        visualizerRef.current.render();
      }
      reqId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(reqId);
  }, [appState.step, appState.selectedStyleId, appState.secondaryStyleId, appState.morphIntensity, appState.isGenerating, appState.reactivity]);

  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none" // Pointer events passed to window listeners
    />
  );
};
