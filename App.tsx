
import React, { useState } from 'react';
import { Zap, Layers, LogIn, Activity, FastForward, Upload, FileJson } from 'lucide-react';
import { AppState, AppStep, DEFAULT_STATE, AuthUser, SavedProject, SubjectCategory } from './types';
import { STYLE_PRESETS, CREDITS_PER_PACK } from './constants';
import { Step1Assets, Step2Director } from './components/Steps';
import { Step4Preview } from './components/Step4Preview';
import { generateDanceFrames, fileToGenericBase64 } from './services/gemini';
import { AuthModal, PaymentModal } from './components/Modals';
import { GlobalBackground } from './components/GlobalBackground';

const triggerImpulse = (type: 'click' | 'hover' | 'type', intensity: number = 1.0) => {
    const event = new CustomEvent('ui-interaction', { detail: { type, intensity } });
    window.dispatchEvent(event);
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [importRef] = useState<React.RefObject<HTMLInputElement>>(React.createRef());

  const handleImageUpload = async (file: File) => {
    try {
        const base64 = await fileToGenericBase64(file);
        setAppState(prev => ({
          ...prev,
          imageFile: file,
          imagePreviewUrl: base64,
          generatedFrames: [] 
        }));
    } catch (e: any) {
        console.error("Image upload processing failed:", e);
        alert(`Failed to load image: ${e.message || "Unknown error"}`);
    }
  };

  const handleAudioUpload = async (file: File) => {
    if (!file) {
        setAppState(prev => ({ ...prev, audioFile: null, audioPreviewUrl: null }));
        return;
    }
    const previewUrl = URL.createObjectURL(file);
    setAppState(prev => ({
      ...prev,
      audioFile: file,
      audioPreviewUrl: previewUrl
    }));
  };

  const updateConfig = (key: string, value: any) => {
    setAppState(prev => ({ ...prev, [key]: value }));
  };

  const handleLogin = () => {
      const mockUser: AuthUser = {
          uid: '123456789',
          name: 'Beta User',
          email: 'user@example.com',
          photoURL: 'https://ui-avatars.com/api/?name=Beta+User&background=random'
      };
      setAppState(prev => ({ 
          ...prev, 
          user: mockUser, 
          showAuthModal: false,
          credits: prev.credits === 0 ? 5 : prev.credits 
      }));
  };

  const handleBuyCredits = () => {
     setAppState(prev => ({ ...prev, showPaymentModal: true }));
  };

  const handlePaymentSuccess = () => {
    setAppState(prev => ({ 
        ...prev, 
        credits: prev.credits + CREDITS_PER_PACK 
    }));
  };

  const handleSpendCredit = (amount: number): boolean => {
      if (appState.credits >= amount) {
          setAppState(prev => ({ ...prev, credits: prev.credits - amount }));
          return true;
      }
      return true;
  };

  const handleGenerateClick = () => {
      handleGenerate();
  };
  
  const handleInstantGenerate = () => {
      triggerImpulse('click', 1.5);
      // Force instant defaults but preserve image/audio
      setAppState(prev => ({ 
          ...prev, 
          useTurbo: true, 
          superMode: false, // Force off super mode for quick dance
          motionPreset: 'auto',
          step: AppStep.DIRECTOR // Jump logic
      }));
      // Invoke generation with overrides
      setTimeout(() => handleGenerate(true, false), 100);
  };

  const handleGenerate = async (forceTurbo: boolean = false, forceSuper: boolean = false) => {
    if (!appState.imagePreviewUrl) return;
    
    setAppState(prev => ({ ...prev, isGenerating: true, step: AppStep.PREVIEW }));

    const style = STYLE_PRESETS.find(s => s.id === appState.selectedStyleId);
    const imageBase64 = appState.imagePreviewUrl;
    
    let effectiveMotionPrompt = appState.motionPrompt;
    if (appState.motionPreset !== 'custom' && appState.motionPreset !== 'auto') {
        if (appState.motionPreset === 'bounce') effectiveMotionPrompt = "Bouncy, energetic, rhythmic jumping";
        if (appState.motionPreset === 'flow') effectiveMotionPrompt = "Smooth, fluid, liquid motion, floating";
        if (appState.motionPreset === 'glitch') effectiveMotionPrompt = "Twitchy, glitchy, rapid robotic movements";
    }

    try {
        const { frames, category } = await generateDanceFrames(
            imageBase64, 
            style?.promptModifier || 'artistic style',
            effectiveMotionPrompt,
            forceTurbo || appState.useTurbo,
            forceSuper || appState.superMode,
            appState.subjectCategory // PASS EXPLICIT CATEGORY
        );

        setAppState(prev => ({
            ...prev,
            generatedFrames: frames,
            subjectCategory: category, // Store detection/result
            isGenerating: false
        }));
    } catch (e: any) {
        console.error("Generation Failed:", e);
        const msg = e.message || "Unknown error";
        if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
            alert("API Permission Denied (403). Please ensure your API Key has access to 'gemini-2.5-flash-image'.");
        } else {
            alert(`Generation failed: ${msg}`);
        }
        setAppState(prev => ({ ...prev, isGenerating: false, step: AppStep.DIRECTOR }));
    }
  };
  
  // --- PROJECT SAVING / LOADING ---
  const saveProject = () => {
      if (appState.generatedFrames.length === 0) return;
      
      const project: SavedProject = {
          id: crypto.randomUUID(),
          name: `Rig_${Date.now()}`,
          createdAt: Date.now(),
          frames: appState.generatedFrames,
          styleId: appState.selectedStyleId,
          subjectCategory: appState.subjectCategory
      };
      
      const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.jusdnce`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const project = JSON.parse(event.target?.result as string) as SavedProject;
              // Validation simple
              if (!project.frames || !project.styleId) throw new Error("Invalid Project File");
              
              setAppState(prev => ({
                  ...prev,
                  generatedFrames: project.frames,
                  selectedStyleId: project.styleId,
                  subjectCategory: project.subjectCategory || 'CHARACTER',
                  imagePreviewUrl: project.frames[0].url, // Set base image
                  step: AppStep.PREVIEW // Jump straight to preview
              }));
              triggerImpulse('click', 1.5);
          } catch (err) {
              alert("Failed to load project file.");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  const canProceed = () => {
    switch (appState.step) {
      case AppStep.ASSETS: return !!appState.imagePreviewUrl; // Audio is now optional
      case AppStep.DIRECTOR: return true; 
      default: return false;
    }
  };

  const nextStep = () => {
    if (appState.step === AppStep.DIRECTOR) {
      handleGenerateClick();
    } else {
      setAppState(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  return (
    <div className="min-h-screen relative text-gray-100 font-sans overflow-hidden selection:bg-brand-500/30 selection:text-white">
      
      {/* 1. Global Holographic Background */}
      <GlobalBackground appState={appState} />
      
      {/* 2. Overlay Content */}
      <div className="relative z-10 flex flex-col h-screen flex-1">
        
        {/* MODALS */}
        <AuthModal 
            isOpen={appState.showAuthModal} 
            onClose={() => setAppState(prev => ({ ...prev, showAuthModal: false }))}
            onLogin={handleLogin}
        />
        <PaymentModal
            isOpen={appState.showPaymentModal}
            onClose={() => setAppState(prev => ({ ...prev, showPaymentModal: false }))}
            onSuccess={handlePaymentSuccess}
        />

        {/* HEADER */}
        <header className="border-b border-white/5 bg-black/10 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            
            {/* BRANDING */}
            <div 
                className="flex items-center gap-4 cursor-pointer group" 
                onClick={() => window.location.reload()}
                onMouseEnter={() => triggerImpulse('hover', 0.5)}
            >
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className="absolute inset-0 bg-brand-500 rounded-lg blur-lg opacity-40 group-hover:opacity-100 group-hover:animate-pulse transition-opacity" />
                    <div className="relative bg-black border border-white/20 p-2 rounded-lg backdrop-blur-md group-hover:scale-110 transition-transform duration-300">
                        <Activity size={24} className="text-white group-hover:text-brand-300 transition-colors" />
                    </div>
                </div>
                
                <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-brand-200 to-white animate-text-shimmer drop-shadow-[0_0_15px_rgba(139,92,246,0.3)] italic hover:scale-105 transition-transform origin-left">
                  jus<span className="text-brand-400 not-italic font-bold">DNCE</span>
                </h1>
            </div>
            
            {/* RIGHT SIDE CONTROLS */}
            <div className="flex items-center gap-4">
                {/* IMPORT BUTTON */}
                <button
                    onClick={() => importRef.current?.click()}
                    className="glass-button px-4 py-2 rounded-full text-xs font-bold text-white flex items-center gap-2 border border-white/10 hover:border-brand-400/50"
                >
                    <FileJson size={14} className="text-brand-300" /> IMPORT RIG
                </button>
                <input ref={importRef} type="file" accept=".jusdnce" onChange={loadProject} className="hidden" />

                <div 
                    className="hidden md:flex items-center gap-2 bg-black/40 px-5 py-2 rounded-full border border-white/10 cursor-pointer hover:border-yellow-400/50 transition-all hover:bg-white/5 hover:scale-105 group"
                    onMouseEnter={() => triggerImpulse('hover', 0.3)}
                    onClick={() => setAppState(prev => ({ ...prev, showPaymentModal: true }))}
                >
                    <Zap size={16} className="text-yellow-400 fill-yellow-400 group-hover:animate-bounce" />
                    <span className="text-sm font-bold text-gray-200 tracking-wide font-mono">{appState.credits} CR</span>
                </div>

                {appState.user ? (
                    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-white leading-tight tracking-wider">{appState.user.name}</p>
                            <p className="text-[10px] text-brand-300 font-mono uppercase">PRO TIER</p>
                        </div>
                        <img src={appState.user.photoURL} alt="Profile" className="w-10 h-10 rounded-full ring-2 ring-brand-500/50 hover:ring-brand-400 transition-all cursor-pointer" />
                    </div>
                ) : (
                    <button 
                        onClick={() => setAppState(prev => ({ ...prev, showAuthModal: true }))}
                        onMouseEnter={() => triggerImpulse('hover', 0.4)}
                        className="glass-button px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold text-white tracking-wide shadow-lg"
                    >
                        <LogIn size={16} /> SIGN IN
                    </button>
                )}
            </div>
            </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-6 overflow-y-auto scrollbar-hide relative">
            
            {appState.step === AppStep.ASSETS && (
                <div className="animate-fade-in">
                    <Step1Assets 
                        state={appState} 
                        onUploadImage={handleImageUpload} 
                        onUploadAudio={handleAudioUpload}
                        onUpdateCategory={(cat) => setAppState(prev => ({...prev, subjectCategory: cat}))} 
                    />
                </div>
            )}
            
            {appState.step === AppStep.DIRECTOR && (
                <div className="animate-fade-in">
                    <Step2Director 
                        config={appState}
                        onUpdate={updateConfig}
                        onBuyCredits={handleBuyCredits}
                    />
                </div>
            )}

            {appState.step === AppStep.PREVIEW && (
                <div className="animate-holo-reveal">
                    <Step4Preview 
                        state={appState}
                        onGenerateMore={handleGenerateClick}
                        onSpendCredit={handleSpendCredit}
                        onUploadAudio={handleAudioUpload}
                        onSaveProject={saveProject}
                    />
                </div>
            )}
        </main>

        {/* FOOTER NAV */}
        <footer className="border-t border-white/5 bg-black/20 backdrop-blur-lg p-5 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                
                {/* Steps Indicator */}
                <div className="flex gap-4 items-center">
                    <span className="text-xs font-mono text-gray-500 font-bold hidden md:block tracking-widest">PROGRESSION //</span>
                    {[AppStep.ASSETS, AppStep.DIRECTOR, AppStep.PREVIEW].map(step => (
                        <div 
                        key={step} 
                        className={`
                            h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]
                            ${appState.step >= step ? 'w-12 bg-gradient-to-r from-brand-600 to-brand-400 shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'w-3 bg-white/10'}
                        `}
                        />
                    ))}
                </div>
                
                {appState.step !== AppStep.PREVIEW && (
                    <div className="flex items-center gap-4">
                        {appState.step === AppStep.ASSETS && canProceed() && (
                            <button
                                onClick={handleInstantGenerate}
                                onMouseEnter={() => triggerImpulse('hover', 0.6)}
                                className="px-6 py-4 rounded-full font-black text-sm tracking-widest flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_30px_rgba(219,39,119,0.4)] hover:shadow-[0_0_50px_rgba(219,39,119,0.7)] hover:scale-105 transition-all duration-300"
                            >
                                <FastForward size={18} fill="white" /> QUICK DANCE
                            </button>
                        )}

                        <button 
                            disabled={!canProceed()}
                            onClick={nextStep}
                            onMouseEnter={() => canProceed() && triggerImpulse('hover', 0.6)}
                            className={`
                            px-10 py-4 rounded-full font-black text-sm tracking-widest flex items-center gap-3 transition-all duration-300 backdrop-blur-md
                            ${canProceed() 
                                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] border border-brand-400/50 hover:scale-105' 
                                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'}
                            `}
                        >
                            {appState.step === AppStep.DIRECTOR ? (
                                appState.isGenerating ? (
                                    <span className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full animate-ping"/> PROCESSING</span>
                                ) : 'INITIALIZE GENERATION'
                            ) : (
                                'CONTINUE SEQUENCE'
                            )}
                            {appState.step === AppStep.DIRECTOR && !appState.isGenerating && <Zap size={18} className={canProceed() ? 'fill-white animate-pulse' : ''} />}
                        </button>
                    </div>
                )}
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
