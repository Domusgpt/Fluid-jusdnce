
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Music, Play, Pause, Check, Wand2, Zap, Film, Coins, CreditCard, Image as ImageIcon, Shuffle, ChevronDown, ChevronUp, Sparkles, Rocket, Mic, Layers, Grid, Sliders, Activity, ArrowRight, Star, X, User, Type, Box } from 'lucide-react';
import { AppState, StyleCategory, StylePreset, SubjectCategory } from '../types';
import { STYLE_PRESETS, CREDITS_PACK_PRICE } from '../constants';

/* -------------------------------------------------------------------------- */
/*                                UTILITIES                                   */
/* -------------------------------------------------------------------------- */

const triggerImpulse = (type: 'click' | 'hover' | 'type', intensity: number = 1.0) => {
    const event = new CustomEvent('ui-interaction', { detail: { type, intensity } });
    window.dispatchEvent(event);
};

// Helper to shift background color dynamically
const triggerColorShift = (hue: number) => {
    const event = new CustomEvent('color-shift', { detail: { hue } });
    window.dispatchEvent(event);
};

/* -------------------------------------------------------------------------- */
/*                                STEP 1: ASSETS                              */
/* -------------------------------------------------------------------------- */

interface Step1Props {
  state: AppState;
  onUploadImage: (file: File) => void;
  onUploadAudio: (file: File) => void;
  onUpdateCategory: (category: SubjectCategory) => void;
}

export const Step1Assets: React.FC<Step1Props> = ({ state, onUploadImage, onUploadAudio, onUpdateCategory }) => {
  const imgInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const imageSectionRef = useRef<HTMLDivElement>(null);
  const audioSectionRef = useRef<HTMLDivElement>(null);

  const toggleAudio = () => {
    triggerImpulse('click', 0.5);
    if(audioRef.current) {
        isAudioPlaying ? audioRef.current.pause() : audioRef.current.play();
        setIsAudioPlaying(!isAudioPlaying);
    }
  };

  const CATEGORIES: { id: SubjectCategory, label: string, icon: React.ReactNode }[] = [
      { id: 'CHARACTER', label: 'Character', icon: <User size={16}/> },
      { id: 'TEXT', label: 'Typography', icon: <Type size={16}/> },
      { id: 'SYMBOL', label: 'Logo / Icon', icon: <Box size={16}/> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full max-w-6xl mx-auto py-10 perspective-1000">
      {/* Image Uploader */}
      <div 
        ref={imageSectionRef}
        className="flex flex-col animate-zoom-out transition-all duration-500" 
        style={{ animationDelay: '0ms', opacity: state.imagePreviewUrl ? 0.9 : 1, transform: state.imagePreviewUrl ? 'scale(0.98)' : 'scale(1)' }}
        onMouseEnter={() => triggerImpulse('hover', 0.2)}
      >
         <div className="flex justify-between items-center mb-6">
             <h3 className="text-2xl font-black text-white flex items-center gap-3 drop-shadow-lg tracking-widest group cursor-default">
                <div className={`p-2 rounded-lg border transition-colors group-hover:animate-shake ${state.imagePreviewUrl ? 'bg-brand-500/50 border-brand-500' : 'bg-brand-500/20 border-brand-500/30'}`}>
                    <ImageIcon className="text-brand-300"/>
                </div>
                <span className="group-hover:text-brand-300 transition-colors duration-300">SOURCE_IDENTITY</span>
             </h3>
         </div>

         <div 
            className={`
              flex-1 relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[350px] group overflow-hidden
              backdrop-blur-sm mb-4
              ${state.imagePreviewUrl 
                  ? 'border-brand-500/50 bg-brand-900/10 shadow-[0_0_30px_rgba(139,92,246,0.2)]' 
                  : 'border-white/10 hover:border-brand-400/50 bg-black/20 hover:bg-black/40 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]'}
            `}
            onClick={() => {
                triggerImpulse('click', 0.8);
                imgInput.current?.click();
            }}
         >
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-linear" />

            {state.imagePreviewUrl ? (
                <div className="relative w-full h-full p-6 flex items-center justify-center">
                   <img src={state.imagePreviewUrl} loading="lazy" className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10 will-change-transform" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-sm z-20">
                      <span className="text-white font-bold tracking-widest border border-white/30 px-6 py-3 rounded-full glass-button hover:scale-110 transition-transform bg-black/50">REPLACE DATA</span>
                   </div>
                   <div className="absolute top-4 right-4 bg-brand-500 text-white p-2 rounded-full shadow-lg animate-in zoom-in border border-white/20">
                       <Check size={20} />
                   </div>
                </div>
            ) : (
                <div className="text-center p-8 relative z-10">
                    <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-500/20 group-hover:scale-110 transition-all duration-300 border border-white/10 group-hover:border-brand-400/50 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                        <ImageIcon size={48} className="text-gray-400 group-hover:text-brand-300 transition-colors" />
                    </div>
                    <p className="text-white font-black text-2xl tracking-widest group-hover:text-brand-300 transition-colors glitch-hover">UPLOAD TARGET</p>
                    <p className="text-gray-500 text-xs mt-3 font-mono uppercase tracking-widest">Supports .JPG .PNG .WEBP</p>
                </div>
            )}
            <input 
                type="file" 
                ref={imgInput} 
                onChange={e => {
                    if (e.target.files?.[0]) {
                        triggerImpulse('click', 1.5);
                        triggerColorShift(220); // Shift to Blue/Cyan
                        onUploadImage(e.target.files[0]);
                        e.target.value = '';
                        // Smooth Snap to next input
                        setTimeout(() => {
                            audioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                    }
                }} 
                accept="image/*" 
                className="hidden" 
                onClick={(e) => e.stopPropagation()} 
            />
         </div>
         
         {/* SUBJECT CATEGORY SELECTOR */}
         {state.imagePreviewUrl && (
             <div className="animate-fade-in flex flex-col gap-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Asset Type Analysis</label>
                 <div className="grid grid-cols-3 gap-2">
                     {CATEGORIES.map(cat => (
                         <button
                             key={cat.id}
                             onClick={() => onUpdateCategory(cat.id)}
                             className={`
                                 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold border transition-all
                                 ${state.subjectCategory === cat.id 
                                     ? 'bg-brand-500/20 border-brand-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                                     : 'bg-black/30 border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300'}
                             `}
                         >
                             {cat.icon} {cat.label}
                         </button>
                     ))}
                 </div>
             </div>
         )}
      </div>

      {/* Audio Uploader */}
      <div 
        ref={audioSectionRef}
        className={`flex flex-col animate-zoom-out transition-all duration-500 ${!state.imagePreviewUrl ? 'opacity-40 blur-[2px] grayscale' : 'opacity-100 blur-0 grayscale-0'}`}
        style={{ animationDelay: '150ms' }}
        onMouseEnter={() => triggerImpulse('hover', 0.2)}
      >
         <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 drop-shadow-lg tracking-widest group cursor-default">
            <div className={`p-2 rounded-lg border transition-colors group-hover:animate-shake ${state.audioFile ? 'bg-green-500/50 border-green-500' : 'bg-green-500/20 border-green-500/30'}`}>
                <Music className="text-green-300"/>
            </div>
            <span className="group-hover:text-green-300 transition-colors duration-300">AUDIO_STREAM</span>
            <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400 font-mono tracking-widest">(OPTIONAL)</span>
         </h3>
         <div 
            className={`
              flex-1 relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[350px] group overflow-hidden
              backdrop-blur-sm
              ${state.audioFile 
                  ? 'border-green-500/50 bg-green-900/10 shadow-[0_0_30px_rgba(34,197,94,0.2)]' 
                  : 'border-white/10 hover:border-green-400/50 bg-black/20 hover:bg-black/40 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]'}
            `}
            onClick={() => {
                if(!state.audioFile) {
                    triggerImpulse('click', 0.8);
                    audioInput.current?.click();
                }
            }}
         >
             {/* Scanline Effect */}
             <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-green-500/10 to-transparent opacity-0 group-hover:opacity-100 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-linear" />

            {state.audioFile ? (
                <div className="text-center p-6 w-full relative z-10">
                    <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.4)] animate-pulse-fast border-4 border-black/30 group-hover:scale-110 transition-transform">
                        <Music size={50} className="text-white drop-shadow-md" />
                    </div>
                    <p className="text-white font-bold text-xl mb-6 truncate px-8 drop-shadow-md font-mono">{state.audioFile.name}</p>
                    
                    <div className="flex gap-4 justify-center">
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
                            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-lg border border-green-400/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                        >
                            {isAudioPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />} PREVIEW
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                triggerImpulse('click', 0.5);
                                onUploadAudio(null as any); 
                            }}
                            className="px-6 py-3 bg-white/5 hover:bg-white/20 text-white rounded-full font-bold transition-transform hover:scale-105 border border-white/10 backdrop-blur-md"
                        >
                            CHANGE
                        </button>
                    </div>
                    <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg animate-in zoom-in border border-white/20">
                       <Check size={20} />
                   </div>
                    <audio ref={audioRef} src={state.audioPreviewUrl || undefined} onEnded={() => setIsAudioPlaying(false)} className="hidden" />
                </div>
            ) : (
                <div className="text-center p-8 relative z-10">
                    <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-500/20 group-hover:scale-110 transition-all duration-300 border border-white/10 group-hover:border-green-400/50 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                        <Music size={48} className="text-gray-400 group-hover:text-green-300 transition-colors" />
                    </div>
                    <p className="text-white font-black text-2xl tracking-widest group-hover:text-green-300 transition-colors glitch-hover">UPLOAD AUDIO</p>
                    <p className="text-gray-500 text-xs mt-3 font-mono uppercase tracking-widest">MP3 / WAV / AAC</p>
                    <p className="text-brand-300/50 text-[10px] mt-2 tracking-wide font-bold">OR SKIP FOR LIVE / SYNTHETIC MODE</p>
                </div>
            )}
            <input 
                type="file" 
                ref={audioInput} 
                onChange={e => {
                    if (e.target.files?.[0]) {
                        triggerImpulse('click', 1.5);
                        triggerColorShift(140); // Shift to Green
                        onUploadAudio(e.target.files[0]);
                        e.target.value = '';
                    }
                }} 
                accept="audio/*" 
                className="hidden" 
                onClick={(e) => e.stopPropagation()} 
            />
         </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                STEP 2: DIRECTOR                            */
/* -------------------------------------------------------------------------- */

interface Step2Props {
  config: Pick<AppState, 'selectedStyleId' | 'intensity' | 'duration' | 'motionPrompt' | 'credits' | 'motionPreset' | 'useTurbo' | 'secondaryStyleId' | 'morphIntensity' | 'reactivity' | 'superMode'>;
  onUpdate: (key: string, value: any) => void;
  onBuyCredits: () => void;
}

export const Step2Director: React.FC<Step2Props> = ({ config, onUpdate, onBuyCredits }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeCategory, setActiveCategory] = useState<StyleCategory>('Cinematic');
  
  const categories: StyleCategory[] = ['Cinematic', 'Anime/2D', 'Digital/Glitch', 'Artistic'];

  const filteredStyles = useMemo(() => {
    return STYLE_PRESETS.filter(s => s.category === activeCategory);
  }, [activeCategory]);

  const randomizeStyle = () => {
    triggerImpulse('click', 1.0);
    const randomStyle = STYLE_PRESETS[Math.floor(Math.random() * STYLE_PRESETS.length)];
    setActiveCategory(randomStyle.category);
    onUpdate('selectedStyleId', randomStyle.id);
  };

  const MOTION_OPTIONS = [
      { id: 'auto', label: '✨ Auto (AI Decides)' },
      { id: 'bounce', label: '🦘 Bounce & Groove' },
      { id: 'flow', label: '🌊 Smooth Flow' },
      { id: 'glitch', label: '⚡ Twitch & Glitch' },
      { id: 'custom', label: '🎨 Custom Description' },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 perspective-1000">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8 animate-slide-in-right">
        <div>
           <h2 className="text-4xl font-black text-white flex items-center gap-3 glitch-hover">
              <span className="bg-brand-500/20 text-brand-300 p-2 rounded-lg border border-brand-500/30">
                  <Wand2 size={28} />
              </span>
              DIRECTOR_MODE
           </h2>
           <p className="text-brand-100/60 mt-2 font-mono tracking-widest text-xs uppercase">Configure your quantum simulation parameters</p>
        </div>
        
        <div className="flex flex-col gap-2 items-end">
            <button 
                onClick={randomizeStyle}
                onMouseEnter={() => triggerImpulse('hover', 0.5)}
                className="glass-button px-5 py-2.5 rounded-full text-sm font-bold text-white flex items-center gap-2 hover:bg-white/10"
            >
                <Shuffle size={16} className="text-brand-300" /> SURPRISE ME
            </button>
            
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-1 py-1 rounded-full border border-white/10">
                <button
                    onClick={() => onUpdate('useTurbo', true)}
                    onMouseEnter={() => triggerImpulse('hover', 0.2)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${config.useTurbo ? 'bg-brand-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Rocket size={12} /> TURBO
                </button>
                <button
                    onClick={() => onUpdate('useTurbo', false)}
                    onMouseEnter={() => triggerImpulse('hover', 0.2)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${!config.useTurbo ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Sparkles size={12} /> QUALITY
                </button>
            </div>
            
            {/* SUPER MODE TOGGLE */}
            <button
                onClick={() => onUpdate('superMode', !config.superMode)}
                onMouseEnter={() => triggerImpulse('hover', 0.2)}
                className={`
                    px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border w-full justify-center
                    ${config.superMode 
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
                        : 'bg-black/40 text-gray-500 border-gray-700 hover:border-gray-500 hover:text-white'}
                `}
            >
                <Star size={12} fill={config.superMode ? "white" : "none"} /> 
                {config.superMode ? "SUPER MODE ACTIVE (15 FRAMES + LIP SYNC)" : "ENABLE SUPER MODE (PAID)"}
            </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {categories.map((cat, idx) => (
          <button
            key={cat}
            onClick={() => { triggerImpulse('click', 0.4); setActiveCategory(cat); }}
            onMouseEnter={() => triggerImpulse('hover', 0.1)}
            className={`
              px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 border relative overflow-hidden group
              ${activeCategory === cat 
                ? 'bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'}
            `}
          >
            <span className="relative z-10 flex items-center gap-2">
                {cat === 'Cinematic' && <Film size={14}/>}
                {cat === 'Digital/Glitch' && <Zap size={14}/>}
                {cat === 'Artistic' && <Wand2 size={14}/>}
                {cat === 'Anime/2D' && <Layers size={14}/>}
                {cat.toUpperCase()}
            </span>
            {activeCategory === cat && <div className="absolute inset-0 bg-white/5 animate-pulse-fast" />}
          </button>
        ))}
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {filteredStyles.map((style, idx) => (
          <div
            key={style.id}
            onClick={() => { triggerImpulse('click', 0.6); onUpdate('selectedStyleId', style.id); }}
            onMouseEnter={() => triggerImpulse('hover', 0.2)}
            className={`
              group relative aspect-square rounded-2xl cursor-pointer overflow-hidden transition-all duration-500 border-2
              ${config.selectedStyleId === style.id 
                ? 'border-brand-400 shadow-[0_0_40px_rgba(139,92,246,0.4)] scale-105 z-10' 
                : 'border-white/5 hover:border-brand-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:scale-[1.02] opacity-80 hover:opacity-100'}
            `}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black z-0" />
            
            <img 
                src={style.thumbnail} 
                alt={style.name} 
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 will-change-transform" 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

            {/* Selection Ring */}
            {config.selectedStyleId === style.id && (
                <div className="absolute inset-0 border-4 border-brand-400 rounded-xl animate-pulse" />
            )}

            <div className="absolute bottom-0 left-0 right-0 p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className={`font-black text-xl leading-none mb-1 ${config.selectedStyleId === style.id ? 'text-brand-300' : 'text-white'}`}>
                  {style.name}
              </h3>
              <p className="text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">
                  {style.description}
              </p>
            </div>
            
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/10 to-transparent h-1/4 w-full -translate-y-full group-hover:translate-y-[400%] transition-transform duration-1000 ease-in-out" />
          </div>
        ))}
      </div>

      {/* STUDIO CONTROLS (Expandable) */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
          >
              <div className="flex items-center gap-3">
                  <Sliders size={20} className="text-brand-300" />
                  <span className="font-bold text-white tracking-widest text-sm">STUDIO CONTROLS</span>
              </div>
              {showAdvanced ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </button>
          
          <div className={`transition-all duration-500 ease-in-out ${showAdvanced ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 bg-black/20">
                  
                  {/* LEFT COL: MOTION & GENERATION */}
                  <div className="space-y-6">
                      {/* Motion Presets */}
                      <div>
                        <label className="text-xs font-bold text-gray-400 mb-3 block uppercase tracking-wider">Motion Preset</label>
                        <div className="grid grid-cols-2 gap-2">
                            {MOTION_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => onUpdate('motionPreset', opt.id)}
                                    className={`
                                        px-3 py-2 rounded-lg text-xs font-bold border transition-all text-left truncate
                                        ${config.motionPreset === opt.id 
                                            ? 'bg-brand-500/20 border-brand-500 text-white' 
                                            : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'}
                                    `}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                      </div>

                      {config.motionPreset === 'custom' && (
                        <div className="animate-fade-in">
                            <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Custom Prompt</label>
                            <textarea
                                value={config.motionPrompt}
                                onChange={(e) => onUpdate('motionPrompt', e.target.value)}
                                placeholder="Describe the dance moves..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none h-24 resize-none"
                            />
                        </div>
                      )}

                      {/* Generation Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-3 block uppercase tracking-wider">Duration</label>
                            <input 
                                type="range" min="10" max="60" 
                                value={config.duration} 
                                onChange={(e) => onUpdate('duration', Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-full accent-brand-400 cursor-pointer"
                            />
                            <div className="text-right text-xs text-brand-300 font-mono mt-1">{config.duration}s</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-3 block uppercase tracking-wider">Energy</label>
                            <input 
                                type="range" min="0" max="100" 
                                value={config.intensity} 
                                onChange={(e) => onUpdate('intensity', Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-full accent-brand-400 cursor-pointer"
                            />
                            <div className="text-right text-xs text-brand-300 font-mono mt-1">{config.intensity}%</div>
                        </div>
                      </div>
                  </div>

                  {/* RIGHT COL: MORPHING & VISUALIZER */}
                  <div className="space-y-6 border-l border-white/5 pl-8 md:pl-8">
                       {/* Style Morphing */}
                       <div>
                           <label className="text-xs font-bold text-gray-400 mb-3 block uppercase tracking-wider">Style Morphing (Beta)</label>
                           <p className="text-[10px] text-gray-500 mb-3">Blend your chosen style with a secondary aesthetic.</p>
                           
                           <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                               <button 
                                    onClick={() => onUpdate('secondaryStyleId', '')}
                                    className={`flex-shrink-0 w-12 h-12 rounded-lg border ${!config.secondaryStyleId ? 'border-brand-500 bg-brand-500/20' : 'border-white/10 bg-black/20'} flex items-center justify-center`}
                               >
                                   <X size={16} className={!config.secondaryStyleId ? 'text-brand-300' : 'text-gray-500'}/>
                               </button>
                               {STYLE_PRESETS.map(s => (
                                   <button 
                                        key={s.id}
                                        onClick={() => onUpdate('secondaryStyleId', s.id)}
                                        className={`flex-shrink-0 w-12 h-12 rounded-lg border overflow-hidden relative ${config.secondaryStyleId === s.id ? 'border-brand-500' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                                   >
                                       <img src={s.thumbnail} className="w-full h-full object-cover" />
                                   </button>
                               ))}
                           </div>
                           
                           {config.secondaryStyleId && (
                                <div className="animate-fade-in">
                                    <label className="text-[10px] text-brand-300 font-bold mb-1 block">MORPH INTENSITY: {config.morphIntensity}%</label>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={config.morphIntensity} 
                                        onChange={(e) => onUpdate('morphIntensity', Number(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-full accent-purple-500 cursor-pointer"
                                    />
                                </div>
                           )}
                       </div>

                       {/* Audio Reactivity */}
                       <div>
                            <label className="text-xs font-bold text-gray-400 mb-3 block uppercase tracking-wider">Audio Reactivity</label>
                            <input 
                                type="range" min="0" max="100" 
                                value={config.reactivity} 
                                onChange={(e) => onUpdate('reactivity', Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-full accent-green-400 cursor-pointer"
                            />
                            <div className="text-right text-xs text-green-300 font-mono mt-1">{config.reactivity}% Sensitivity</div>
                       </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
