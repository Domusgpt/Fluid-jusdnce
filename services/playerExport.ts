import { GeneratedFrame, SubjectCategory } from "../types";
import { VERTEX_SHADER, FRAGMENT_SHADER, HolographicParams } from "../components/Visualizer/HolographicVisualizer";

export const generatePlayerHTML = (
    frames: GeneratedFrame[],
    hologramParams: HolographicParams,
    subjectCategory: SubjectCategory
): string => {
    
    const framesJSON = JSON.stringify(frames);
    const paramsJSON = JSON.stringify(hologramParams);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DNCE-R Standalone Widget</title>
    <style>
        body { margin: 0; background: #000; overflow: hidden; font-family: 'Courier New', monospace; user-select: none; }
        canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        #bgCanvas { z-index: 1; transition: opacity 0.3s; }
        #charCanvas { z-index: 2; pointer-events: none; }
        
        /* UI OVERLAY */
        #ui {
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10;
            display: flex; gap: 10px; padding: 10px;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
            border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
            transition: opacity 0.3s, transform 0.3s;
        }
        #ui.hidden { opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(20px); }
        
        button {
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
            color: #ccc; padding: 8px 16px; border-radius: 12px;
            cursor: pointer; font-weight: bold; font-size: 12px;
            transition: all 0.2s; display: flex; align-items: center; gap: 6px;
        }
        button:hover { background: rgba(255,255,255,0.25); color: white; transform: scale(1.05); }
        button.active { background: #8b5cf6; border-color: #a78bfa; color: white; box-shadow: 0 0 10px rgba(139,92,246,0.5); }
        button.red { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); color: #fca5a5; }
        button.red.active { background: #ef4444; color: white; border-color: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,0.5); }
        
        /* Loading Screen */
        #loader {
            position: absolute; inset: 0; background: #000; z-index: 100;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            transition: opacity 0.5s;
        }
        .spinner {
            width: 40px; height: 40px; border: 4px solid #333; border-top-color: #8b5cf6;
            border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Drag Overlay */
        #dropOverlay {
            position: absolute; inset: 0; z-index: 50; background: rgba(139, 92, 246, 0.8);
            display: none; align-items: center; justify-content: center;
            font-size: 2em; color: white; font-weight: 900; letter-spacing: 2px;
            backdrop-filter: blur(5px);
        }
        .drag-over #dropOverlay { display: flex; }
        
        /* Header/Controls Hover Area */
        #hoverZone {
            position: absolute; bottom: 0; left: 0; width: 100%; height: 100px; z-index: 5;
        }
        #hoverZone:hover + #ui { opacity: 1; transform: translateX(-50%) translateY(0); }
        
        /* Corner Info */
        #info {
            position: absolute; top: 20px; left: 20px; z-index: 5;
            color: rgba(255,255,255,0.3); font-size: 10px; pointer-events: none;
        }
    </style>
</head>
<body class="drag-over-target">

    <!-- CANVAS LAYERS -->
    <canvas id="bgCanvas"></canvas>
    <canvas id="charCanvas"></canvas>
    
    <!-- OVERLAYS -->
    <div id="loader">
        <div class="spinner"></div>
        <div style="color: #666; font-size: 12px; letter-spacing: 2px;">INITIALIZING DNCE-R RIG...</div>
    </div>
    
    <div id="dropOverlay">DROP AUDIO FILE HERE</div>
    
    <div id="info">
        DNCE-R // ${subjectCategory}<br>
        <span id="fps">0 FPS</span>
    </div>

    <!-- UI -->
    <div id="hoverZone"></div>
    <div id="ui">
        <button id="btnMic">🎙️ LIVE</button>
        <button id="btnPlay" style="display:none">⏯️ PLAY</button>
        <div style="width: 1px; background: rgba(255,255,255,0.2); margin: 0 5px;"></div>
        <button id="btnCam">🎥 DYNAMIC CAM</button>
        <button id="btnGreen">🟩 TRANSPARENT</button>
        <button id="btnZen">Zen Mode</button>
    </div>

    <script>
        // --- CONFIG ---
        const FRAMES = ${framesJSON};
        const PARAMS = ${paramsJSON};
        const SUBJECT = "${subjectCategory}";
        
        // --- SHADER SOURCE ---
        const VERTEX = \`${VERTEX_SHADER}\`;
        const FRAGMENT = \`${FRAGMENT_SHADER}\`;
        
        // --- 1. QUANTUM VISUALIZER ENGINE ---
        class Visualizer {
            constructor(canvas) {
                this.canvas = canvas;
                this.gl = canvas.getContext('webgl', { alpha: true, preserveDrawingBuffer: true }); // Alpha true for green screen
                if(!this.gl) this.gl = canvas.getContext('experimental-webgl');
                this.startTime = Date.now();
                this.mouse = {x:0, y:0};
                this.init();
            }
            init() {
                const vs = this.createShader(this.gl.VERTEX_SHADER, VERTEX);
                const fs = this.createShader(this.gl.FRAGMENT_SHADER, FRAGMENT);
                this.program = this.gl.createProgram();
                this.gl.attachShader(this.program, vs);
                this.gl.attachShader(this.program, fs);
                this.gl.linkProgram(this.program);
                this.gl.useProgram(this.program);
                
                const buffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), this.gl.STATIC_DRAW);
                const loc = this.gl.getAttribLocation(this.program, 'a_position');
                this.gl.enableVertexAttribArray(loc);
                this.gl.vertexAttribPointer(loc, 2, this.gl.FLOAT, false, 0, 0);
                
                this.locs = {
                    res: this.gl.getUniformLocation(this.program, 'u_resolution'),
                    time: this.gl.getUniformLocation(this.program, 'u_time'),
                    mouse: this.gl.getUniformLocation(this.program, 'u_mouse'),
                    bass: this.gl.getUniformLocation(this.program, 'u_audioBass'),
                    mid: this.gl.getUniformLocation(this.program, 'u_audioMid'),
                    high: this.gl.getUniformLocation(this.program, 'u_audioHigh'),
                    col: this.gl.getUniformLocation(this.program, 'u_color'),
                    den: this.gl.getUniformLocation(this.program, 'u_density'),
                    spd: this.gl.getUniformLocation(this.program, 'u_speed'),
                    int: this.gl.getUniformLocation(this.program, 'u_intensity'),
                    chs: this.gl.getUniformLocation(this.program, 'u_chaos'),
                    camZ: this.gl.getUniformLocation(this.program, 'u_cameraZ'),
                };
            }
            createShader(type, src) {
                const s = this.gl.createShader(type);
                this.gl.shaderSource(s, src);
                this.gl.compileShader(s);
                return s;
            }
            render(audio, camZ) {
                const w = window.innerWidth;
                const h = window.innerHeight;
                if(this.canvas.width!==w || this.canvas.height!==h) {
                    this.canvas.width=w; this.canvas.height=h;
                    this.gl.viewport(0,0,w,h);
                }
                
                // Color Logic
                const hVal = (PARAMS.hue || 200) / 360;
                const sVal = 0.8, lVal = 0.6;
                const hue2rgb = (p, q, t) => {
                    if(t < 0) t += 1; if(t > 1) t -= 1;
                    if(t < 1/6) return p + (q - p) * 6 * t;
                    if(t < 1/2) return q;
                    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                }
                const q = lVal < 0.5 ? lVal * (1 + sVal) : lVal + sVal - lVal * sVal;
                const p = 2 * lVal - q;
                const r = hue2rgb(p, q, hVal + 1/3);
                const g = hue2rgb(p, q, hVal);
                const b = hue2rgb(p, q, hVal - 1/3);

                this.gl.uniform2f(this.locs.res, w, h);
                this.gl.uniform1f(this.locs.time, (Date.now()-this.startTime)/1000);
                this.gl.uniform2f(this.locs.mouse, this.mouse.x, this.mouse.y);
                this.gl.uniform1f(this.locs.bass, audio.bass);
                this.gl.uniform1f(this.locs.mid, audio.mid);
                this.gl.uniform1f(this.locs.high, audio.high);
                
                this.gl.uniform3f(this.locs.col, r, g, b);
                this.gl.uniform1f(this.locs.den, PARAMS.density || 2.0);
                this.gl.uniform1f(this.locs.spd, PARAMS.speed || 0.1);
                this.gl.uniform1f(this.locs.int, PARAMS.intensity || 0.6);
                this.gl.uniform1f(this.locs.chs, PARAMS.chaos || 0.5);
                this.gl.uniform1f(this.locs.camZ, camZ);
                
                this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
            }
        }

        // --- 2. SETUP ---
        const bgC = document.getElementById('bgCanvas');
        const charC = document.getElementById('charCanvas');
        const ctx = charC.getContext('2d');
        const loader = document.getElementById('loader');
        
        const viz = new Visualizer(bgC);
        
        // Asset Management
        const IMAGES = {};
        const POOL = { low:[], mid:[], high:[] };
        const SHUFFLE_DECKS = { low:[], mid:[], high:[] }; 

        let readyCount = 0;
        let lastFrameTime = Date.now();
        
        // --- 3. PHYSICS ENGINE ---
        const PHYSICS = {
            camZoom: 1.0,
            camShake: {x:0, y:0},
            camPan: {x:0, y:0},
            swayPhase: 0,
            
            dollyZoom: 0,
            tear: 0,
            moire: 0,
            flash: 0,
            
            // Logic
            targetPose: 'base',
            previousPose: 'base',
            transitionStart: 0,
            transitionDuration: 0,
            transitionMode: 'CUT', // CUT | FLOW
            
            lastDir: 'left',
            lastBeat: 0,
            lastSnare: 0,
            beatCounter: 0,
            
            // Toggles
            dynamicCam: true,
            transparent: false
        };

        // --- 4. INIT ---
        function init() {
            // Load Images
            if(FRAMES.length === 0) {
                hideLoader();
                return;
            }
            
            FRAMES.forEach(f => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = f.url;
                img.onload = () => {
                    IMAGES[f.pose] = img;
                    readyCount++;
                    if(readyCount === FRAMES.length) hideLoader();
                };
                img.onerror = () => { 
                    readyCount++;
                    if(readyCount === FRAMES.length) hideLoader();
                };
                
                if(!POOL[f.energy]) POOL[f.energy] = [];
                POOL[f.energy].push(f.pose);
            });
            
            // Fill gaps
            if(POOL.mid.length===0) POOL.mid = POOL.low;
            if(POOL.high.length===0) POOL.high = POOL.mid;
        }
        
        function hideLoader() {
            loader.style.opacity = 0;
            setTimeout(() => loader.remove(), 500);
            loop();
        }

        // --- 5. AUDIO SYSTEM ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        let sourceNode = null;
        let micStream = null;
        let audioEl = null;

        function connectSource(node) {
            if(sourceNode) sourceNode.disconnect();
            sourceNode = node;
            sourceNode.connect(analyser);
            if(node instanceof MediaElementAudioSourceNode) {
                analyser.connect(audioCtx.destination);
            } else {
                analyser.disconnect();
            }
        }

        // --- 6. SMART SHUFFLE ---
        function getNextPose(poolKey, dir) {
            let pool = POOL[poolKey];
            const dirFrames = pool.filter(p => p.toLowerCase().includes(dir));
            const activePool = (dirFrames.length > 0 && SUBJECT !== 'TEXT') ? dirFrames : pool;

            const deckKey = poolKey + '_' + dir;
            if (!SHUFFLE_DECKS[deckKey] || SHUFFLE_DECKS[deckKey].length === 0) {
                 SHUFFLE_DECKS[deckKey] = [...activePool];
                 for (let i = SHUFFLE_DECKS[deckKey].length - 1; i > 0; i--) {
                     const j = Math.floor(Math.random() * (i + 1));
                     [SHUFFLE_DECKS[deckKey][i], SHUFFLE_DECKS[deckKey][j]] = [SHUFFLE_DECKS[deckKey][j], SHUFFLE_DECKS[deckKey][i]];
                 }
            }
            return SHUFFLE_DECKS[deckKey].pop() || 'base';
        }

        // --- 7. RENDER LOOP ---
        function loop() {
            requestAnimationFrame(loop);
            
            const now = Date.now();
            const dt = (now - lastFrameTime) / 1000;
            lastFrameTime = now;
            
            const w = window.innerWidth;
            const h = window.innerHeight;
            
            // Audio Analysis
            const freq = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(freq);
            
            const bass = freq.slice(0,15).reduce((a,b)=>a+b,0)/15/255;
            const mid = freq.slice(15,100).reduce((a,b)=>a+b,0)/85/255;
            const high = freq.slice(100,300).reduce((a,b)=>a+b,0)/200/255;
            
            // Logic
            if(bass > 0.6 && now - PHYSICS.lastBeat > 500) {
                PHYSICS.lastBeat = now;
                
                PHYSICS.beatCounter = (PHYSICS.beatCounter + 1) % 4;
                const isPatternCut = PHYSICS.beatCounter < 2;
                const isHard = bass > 0.8;
                
                let poolKey = 'low';
                if(isHard) poolKey = 'high';
                else if(bass > 0.6) poolKey = 'mid';
                
                let dir = PHYSICS.lastDir === 'left' ? 'right' : 'left';
                if(Math.random() < 0.25) dir = PHYSICS.lastDir; 
                PHYSICS.lastDir = dir;
                
                const next = getNextPose(poolKey, dir);
                if (next !== PHYSICS.targetPose) {
                    PHYSICS.previousPose = PHYSICS.targetPose;
                    PHYSICS.targetPose = next;
                    PHYSICS.transitionStart = now;
                    
                    if (isHard || isPatternCut) {
                        PHYSICS.transitionMode = 'CUT';
                        PHYSICS.transitionDuration = 0;
                    } else {
                        PHYSICS.transitionMode = 'FLOW';
                        PHYSICS.transitionDuration = 240;
                    }
                }
                
                if(PHYSICS.dynamicCam) {
                    if (PHYSICS.transitionMode === 'CUT') {
                        PHYSICS.camShake = {x: (Math.random()-0.5)*15*bass, y: (Math.random()-0.5)*15*bass};
                        PHYSICS.camZoom = isHard ? 1.15 : 1.05;
                    } else {
                        PHYSICS.camPan.x += (dir === 'left' ? -20 : 20);
                    }
                    if(isHard) PHYSICS.flash = 0.8;
                }
            }
            
            // Snare logic (Mids) -> Scanlines
            if(mid > 0.7 && now - PHYSICS.lastSnare > 800) {
                PHYSICS.lastSnare = now;
                PHYSICS.moire = 1.0; 
                PHYSICS.dollyZoom = 0.5;
            }
            
            // Physics Decay
            const lerpSpeed = 6 * dt;
            
            // Stillness / Sway Logic
            PHYSICS.swayPhase += dt * 0.5;
            const sway = Math.sin(PHYSICS.swayPhase) * 5;
            const energyInfluence = Math.min(1, bass * 2);
            
            const targetPanX = sway * (1-energyInfluence);
            PHYSICS.camPan.x += (targetPanX - PHYSICS.camPan.x) * lerpSpeed;
            
            // Zoom Return - if Flowing, hold zoom slightly
            const targetZoom = (PHYSICS.transitionMode === 'FLOW') ? 1.05 : 1.0;
            PHYSICS.camZoom += (targetZoom - PHYSICS.camZoom) * (lerpSpeed * 0.5);
            
            PHYSICS.camShake.x *= (1 - lerpSpeed * 2);
            PHYSICS.camShake.y *= (1 - lerpSpeed * 2);
            
            PHYSICS.dollyZoom *= Math.exp(-3 * dt);
            PHYSICS.moire *= 0.85;
            PHYSICS.tear *= 0.8;
            PHYSICS.flash *= 0.85;
            
            // 4. Render Background
            if(!PHYSICS.transparent) {
                const dollyOffset = -(PHYSICS.dollyZoom * 1.5);
                viz.render({bass,mid,high}, dollyOffset);
                bgC.style.opacity = 1;
            } else {
                const gl = viz.gl;
                gl.clearColor(0,0,0,0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                bgC.style.opacity = 0;
            }
            
            // 5. Render Character
            if(charC.width !== w || charC.height !== h) { charC.width=w; charC.height=h; }
            
            // Helper Render
            const renderPose = (pName, opacity, offsetX=0) => {
                const img = IMAGES[pName] || IMAGES['base'];
                if(!img) return;
                
                const dollyScale = 1.0 + (PHYSICS.dollyZoom * 0.2);
                const totalZoom = PHYSICS.camZoom * dollyScale;
                const cx = w/2 + PHYSICS.camShake.x + PHYSICS.camPan.x + offsetX;
                const cy = h/2 + PHYSICS.camShake.y + PHYSICS.camPan.y;
                const aspect = img.width / img.height;
                let dw = w * 0.9;
                let dh = dw / aspect;
                if(dh > h*0.9) { dh = h*0.9; dw = dh*aspect; }
                
                ctx.save();
                ctx.globalAlpha = opacity;

                // RGB/Scanlines
                if(PHYSICS.moire > 0.05) {
                    const drawCh = (col, ox) => {
                        ctx.save();
                        ctx.translate(cx + ox, cy);
                        ctx.scale(totalZoom, totalZoom);
                        ctx.globalCompositeOperation = 'screen';
                        ctx.globalAlpha = 0.8 * PHYSICS.moire * opacity;
                        ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
                        ctx.globalCompositeOperation = 'source-in';
                        ctx.fillStyle = col;
                        ctx.fillRect(-dw/2, -dh/2, dw, dh);
                        ctx.restore();
                    }
                    drawCh('#f00', -5 * PHYSICS.moire);
                    drawCh('#00f', 5 * PHYSICS.moire);
                }
                
                // Main Image
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(totalZoom, totalZoom);
                ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
                
                // Scanlines Overlay
                if(PHYSICS.moire > 0.05) {
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.beginPath();
                    for(let i=0; i<dh; i+=4) ctx.rect(-dw/2, -dh/2 + i, dw, 1);
                    ctx.fillStyle = \`rgba(0,0,0,\${0.5 * PHYSICS.moire * opacity})\`;
                    ctx.fill();
                }
                
                // Lighting
                if(PHYSICS.flash > 0.05) {
                    ctx.globalCompositeOperation = 'overlay';
                    ctx.fillStyle = '#ffeebb';
                    ctx.globalAlpha = PHYSICS.flash * opacity;
                    ctx.fillRect(-dw/2, -dh/2, dw, dh);
                }
                
                ctx.restore();
                ctx.restore();
            }
            
            // TRANSITION LOGIC
            ctx.clearRect(0,0,w,h);
            
            let progress = 1;
            if (PHYSICS.transitionDuration > 0) {
                progress = Math.min(1, (now - PHYSICS.transitionStart) / PHYSICS.transitionDuration);
            }
            
            if (progress < 1) {
                if (PHYSICS.transitionMode === 'FLOW') {
                     // FLOW SLIDE
                     const ease = progress * progress * (3 - 2 * progress);
                     const flowDir = PHYSICS.lastDir === 'left' ? -1 : 1;
                     const slideDist = 40;
                     
                     renderPose(PHYSICS.previousPose, 1-ease, (slideDist*ease)*flowDir);
                     renderPose(PHYSICS.targetPose, ease, (-slideDist*(1-ease))*flowDir);
                } else {
                     // CUT FADE
                     renderPose(PHYSICS.previousPose, 1-progress);
                     renderPose(PHYSICS.targetPose, progress);
                }
            } else {
                renderPose(PHYSICS.targetPose, 1.0);
            }
            
            document.getElementById('fps').innerText = Math.round(1/dt) + ' FPS';
        }

        init();

        // --- UI BINDINGS ---
        const btnMic = document.getElementById('btnMic');
        const btnPlay = document.getElementById('btnPlay');
        const btnCam = document.getElementById('btnCam');
        const btnGreen = document.getElementById('btnGreen');
        const btnZen = document.getElementById('btnZen');
        const ui = document.getElementById('ui');

        btnMic.onclick = async () => {
            audioCtx.resume();
            if(micStream) {
                micStream.getTracks().forEach(t=>t.stop()); micStream=null;
                btnMic.classList.remove('red', 'active');
                btnMic.innerText = '🎙️ LIVE';
            } else {
                micStream = await navigator.mediaDevices.getUserMedia({audio:true});
                connectSource(audioCtx.createMediaStreamSource(micStream));
                btnMic.classList.add('red', 'active');
                btnMic.innerText = '🎙️ ON AIR';
            }
        };
        
        btnCam.classList.add('active');
        btnCam.onclick = () => {
            PHYSICS.dynamicCam = !PHYSICS.dynamicCam;
            btnCam.classList.toggle('active');
        };
        
        btnGreen.onclick = () => {
            PHYSICS.transparent = !PHYSICS.transparent;
            btnGreen.classList.toggle('active');
            if(PHYSICS.transparent) {
                document.body.style.background = 'transparent'; 
            } else {
                document.body.style.background = '#000';
            }
        };
        
        btnZen.onclick = () => {
            ui.classList.add('hidden');
        };
        
        // Drag Drop
        window.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('drag-over'); });
        window.addEventListener('dragleave', e => { e.preventDefault(); document.body.classList.remove('drag-over'); });
        window.addEventListener('drop', e => {
            e.preventDefault(); document.body.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if(file && file.type.startsWith('audio')) {
                const url = URL.createObjectURL(file);
                if(audioEl) audioEl.pause();
                audioEl = new Audio(url);
                audioEl.loop = true;
                audioCtx.resume();
                audioEl.play();
                connectSource(audioCtx.createMediaElementSource(audioEl));
                btnPlay.style.display = 'flex';
                btnPlay.classList.add('active');
            }
        });
        
        btnPlay.onclick = () => {
            if(audioEl.paused) { audioEl.play(); btnPlay.classList.add('active'); }
            else { audioEl.pause(); btnPlay.classList.remove('active'); }
        };

    </script>
</body>
</html>
    `;
};