
/**
 * QUANTUM FLUX VISUALIZER ENGINE (v4.2 - High Reactivity Update)
 * 
 * Advanced KIFS (Kaleidoscopic Iterated Function System) Renderer.
 * Features:
 * - Tetrahedral Fractal Geometry (Quantum Faceted)
 * - Inverse Density Reactivity (Interaction clears the chaos)
 * - Interactive 4D Rotation via Mouse/Touch
 * - Full Spectrum Reactivity (Bass=Pulse, Mid=Structure, High=Shimmer/Sparkles)
 */

export interface HolographicParams {
    geometryType?: number; // 0=Tetra, 1=Box, 2=Sponge
    density?: number;
    speed?: number;
    chaos?: number;
    morph?: number;
    hue?: number;
    saturation?: number;
    intensity?: number;
    gridOpacity?: number; 
}

export interface AudioData {
    bass: number;
    mid: number;
    high: number;
    energy: number;
}

export const VERTEX_SHADER = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

export const FRAGMENT_SHADER = `
    precision highp float;
    
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;
    
    // Params
    uniform float u_geometryType;
    uniform float u_density;
    uniform float u_speed;
    uniform vec3 u_color;
    uniform float u_intensity;
    uniform float u_chaos;
    uniform float u_morph;
    uniform float u_cameraZ; // NEW: Controls dolly zoom
    
    // Audio
    uniform float u_audioBass;
    uniform float u_audioMid;
    uniform float u_audioHigh;
    
    #define MAX_STEPS 80
    #define MAX_DIST 15.0
    #define SURF_DIST 0.001

    // --- MATH UTILS ---
    mat2 rot(float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c);
    }
    
    // Pseudo-random hash for sparkles
    float hash(vec3 p) {
        p  = fract( p*0.3183099+.1 );
        p *= 17.0;
        return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
    }

    // --- KIFS (Kaleidoscopic IFS) FRACTAL ---
    float sdQuantumFractal(vec3 p) {
        float s = 1.0;
        
        // REACTIVITY: Bass affects scale (Pulse), Mids affect structure (Breathing)
        float scale = 1.5 + (u_audioBass * 0.2) + (u_audioMid * 0.05); 
        
        // REACTIVITY: Mids shift the fractal offset, changing internal geometry
        vec3 offset = vec3(1.0, 1.0, 1.0) * (0.8 + u_morph + (u_audioMid * 0.15));
        
        // Interaction Rotation (4D Spin)
        // REACTIVITY: Highs add jitter/vibration to rotation
        float jitter = u_audioHigh * 0.1;
        p.xz *= rot(u_time * 0.1 + u_mouse.x * 2.0 + jitter);
        p.yz *= rot(u_mouse.y * 2.0 - jitter);

        // Fold Iterations
        for(int i=0; i<5; i++) {
            p = abs(p); // Fold space
            if(p.x < p.y) p.xy = p.yx;
            if(p.x < p.z) p.xz = p.zx;
            if(p.y < p.z) p.yz = p.zy;
            
            // Tetrahedral Symmetry
            p.z -= offset.z * 0.5;
            p.z = -abs(p.z);
            p.z += offset.z * 0.5;
            
            p = p * scale - offset * (scale - 1.0);
            s *= scale;
            
            // Add chaos twist on deeper levels
            // REACTIVITY: Chaos increases with energy
            if (i > 2) {
                p.xy *= rot(u_chaos + (u_audioHigh * 0.3));
            }
        }
        
        // Distance to fractal surface
        return length(p) / s;
    }

    // --- SCENE MAP ---
    float GetDist(vec3 p) {
        // REACTIVITY: Bass warps the domain significantly (Shockwave)
        float warp = sin(p.y * 4.0 + u_time * 2.0) * (u_audioBass * 0.15);
        p.z += warp;
        p.x += sin(p.z * 3.0) * (u_audioBass * 0.08);
        
        float d = sdQuantumFractal(p);
        return d;
    }

    // --- RAYMARCHER ---
    float RayMarch(vec3 ro, vec3 rd) {
        float dO = 0.0;
        
        for(int i=0; i<MAX_STEPS; i++) {
            vec3 p = ro + rd*dO;
            float dS = GetDist(p);
            
            // Volumetric Density Accumulation logic
            // If we are close to geometry, we slow down ray to accumulate glow
            dO += dS * 0.7; // Lower step size = denser fog
            
            if(dO>MAX_DIST || abs(dS)<SURF_DIST) break;
        }
        return dO;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        
        // CAMERA LOGIC with Dolly Zoom support
        float baseZ = -2.8;
        vec3 ro = vec3(0.0, 0.0, baseZ + u_cameraZ); 
        vec3 rd = normalize(vec3(uv, 1.0));

        // Raymarch
        float d = RayMarch(ro, rd);
        
        vec3 col = vec3(0.0);
        
        // QUANTUM COLORING
        if(d < MAX_DIST) {
            vec3 p = ro + rd * d;
            
            // Facet Normals (Approx)
            vec2 e = vec2(0.01, 0.0);
            vec3 n = normalize(vec3(
                GetDist(p+e.xyy)-GetDist(p-e.xyy),
                GetDist(p+e.yxy)-GetDist(p-e.yxy),
                GetDist(p+e.yyx)-GetDist(p-e.yyx)
            ));
            
            // Iridescence based on normal and view angle
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
            
            // REACTIVITY: Highs shift the base color (Spectral Shimmer)
            vec3 tint = u_color + (vec3(u_audioHigh) * 0.4);
            col = tint + (n * 0.1); 
            
            // Add Highlight (Gold/White)
            // REACTIVITY: Bass boosts specular highlights massively
            float shine = 2.0 + (u_audioBass * 6.0);
            col += vec3(1.0, 0.95, 0.8) * fresnel * shine;
            
            // Facet Edges
            // REACTIVITY: Mids make edges sharper/brighter
            float edgeWidth = 0.05 + (u_audioMid * 0.08);
            float edge = smoothstep(edgeWidth, 0.0, GetDist(p + n*0.02));
            col += vec3(0.0, 1.0, 1.0) * edge * (1.0 + u_audioHigh * 2.0);
            
            // Chromatic Aberration at edges based on Highs
            col.r += u_audioHigh * 0.2 * fresnel;
            col.b -= u_audioHigh * 0.2 * fresnel;
        }
        
        // QUANTUM FOAM (Volumetric Glow)
        float glow = 0.0;
        
        // Sample SDF at intervals
        float s = 0.0;
        for(int i=0; i<5; i++) {
            vec3 p = ro + rd * (s + 0.5);
            float dist = GetDist(p);
            float fog = 1.0 / (1.0 + abs(dist) * 20.0);
            
            // SPARKLES: High frequencies create energetic points in the fog
            float sparkleNoise = hash(p * 20.0 + u_time * 2.0);
            float sparkle = step(0.95, sparkleNoise) * u_audioHigh * 3.0;
            
            glow += fog + sparkle;
            s += 0.5;
        }
        
        // REACTIVITY: Inverse Density (Structure Reveal)
        // Music clears the thick fog, but energizes the remaining light
        float audioClear = u_audioMid * 1.5;
        float finalDensity = max(0.2, u_density - audioClear);
        
        glow *= finalDensity; 
        
        // REACTIVITY: Bass drives the global intensity of the glow
        col += u_color * glow * u_intensity * (0.6 + u_audioBass * 0.8);

        // Audio Flash (Global brightness kick on bass)
        col += u_color * u_audioBass * 0.15;

        // Final Tone Mapping
        col = pow(col, vec3(0.4545)); // Gamma correction
        
        // Vignette
        col *= 1.0 - length(uv) * 0.5;

        gl_FragColor = vec4(col, 1.0);
    }
`;

export class QuantumVisualizer {
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    program: WebGLProgram | null = null;
    startTime: number;
    uniforms: any = {};
    
    // Interaction State
    mouse: { x: number, y: number } = { x: 0, y: 0 };
    targetMouse: { x: number, y: number } = { x: 0, y: 0 };

    // State
    params: HolographicParams = {
        geometryType: 0, 
        density: 2.0, // Start High (Quantum Foam)
        speed: 0.1,
        chaos: 0.5,
        morph: 0.0,
        hue: 200, // Cyan/Quantum Blue
        saturation: 0.8,
        intensity: 0.6,
        gridOpacity: 0.0
    };
    
    audioData: AudioData = { bass: 0, mid: 0, high: 0, energy: 0 };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const gl = this.canvas.getContext('webgl', { 
            preserveDrawingBuffer: true,
            alpha: false,
            antialias: true
        });
        
        if (!gl) {
            // Try experimental
            const glExp = this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;
            if(!glExp) throw new Error('WebGL not supported');
            this.gl = glExp;
        } else {
            this.gl = gl;
        }
        
        this.startTime = Date.now();
        this.initShaders();
        this.initBuffers();
        this.initInteraction();
        this.resize();
    }

    initInteraction() {
        const updateMouse = (x: number, y: number) => {
            // Normalize to -1.0 to 1.0
            this.targetMouse.x = (x / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(y / window.innerHeight) * 2 + 1;
        };

        window.addEventListener('mousemove', (e) => updateMouse(e.clientX, e.clientY));
        window.addEventListener('touchmove', (e) => {
            if(e.touches[0]) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
        });
    }

    resize() {
        // CRITICAL FIX: Handle offscreen canvas (used for Export).
        // If clientWidth is 0, it means the canvas is not in the DOM.
        // We must respect the manually set width/height and NOT reset it to 0.
        if (this.canvas.clientWidth === 0 || this.canvas.clientHeight === 0) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 1.5); 
        const displayWidth = Math.floor(this.canvas.clientWidth * dpr);
        const displayHeight = Math.floor(this.canvas.clientHeight * dpr);

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    updateAudio(data: AudioData) {
        this.audioData = data;
    }

    initShaders() {
        this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
        if (!this.program) return;

        this.uniforms = {
            resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
            time: this.gl.getUniformLocation(this.program, 'u_time'),
            mouse: this.gl.getUniformLocation(this.program, 'u_mouse'),
            
            density: this.gl.getUniformLocation(this.program, 'u_density'),
            speed: this.gl.getUniformLocation(this.program, 'u_speed'),
            color: this.gl.getUniformLocation(this.program, 'u_color'),
            intensity: this.gl.getUniformLocation(this.program, 'u_intensity'),
            chaos: this.gl.getUniformLocation(this.program, 'u_chaos'),
            morph: this.gl.getUniformLocation(this.program, 'u_morph'),
            cameraZ: this.gl.getUniformLocation(this.program, 'u_cameraZ'),
            
            audioBass: this.gl.getUniformLocation(this.program, 'u_audioBass'),
            audioMid: this.gl.getUniformLocation(this.program, 'u_audioMid'),
            audioHigh: this.gl.getUniformLocation(this.program, 'u_audioHigh'),
        };
    }
    
    createProgram(vertexSource: string, fragmentSource: string) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        if (!vertexShader || !fragmentShader) return null;
        
        const program = this.gl.createProgram();
        if (!program) return null;

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        return program;
    }
    
    createShader(type: number, source: string) {
        const shader = this.gl.createShader(type);
        if (!shader) return null;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader Compile Error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    
    initBuffers() {
        if (!this.program) return;
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    render(cameraZOffset: number = 0.0) {
        if (!this.program) return;
        this.resize();
        this.gl.useProgram(this.program);
        
        const time = (Date.now() - this.startTime) / 1000;
        
        // Mouse Smoothing
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.1;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.1;

        // Colors logic embedded in main loop to handle param changes
        const h = (this.params.hue || 0) / 360;
        const s = this.params.saturation || 0.8;
        const l = 0.6;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2rgb = (p: number, q: number, t: number) => {
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const r = hue2rgb(p, q, h + 1/3);
        const g = hue2rgb(p, q, h);
        const b = hue2rgb(p, q, h - 1/3);

        this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.uniforms.time, time);
        this.gl.uniform2f(this.uniforms.mouse, this.mouse.x, this.mouse.y);
        
        this.gl.uniform1f(this.uniforms.density, this.params.density || 2.0);
        this.gl.uniform1f(this.uniforms.speed, this.params.speed || 0.1);
        this.gl.uniform3f(this.uniforms.color, r, g, b);
        this.gl.uniform1f(this.uniforms.intensity, this.params.intensity || 0.5);
        this.gl.uniform1f(this.uniforms.chaos, this.params.chaos || 0.0);
        this.gl.uniform1f(this.uniforms.morph, this.params.morph || 0.0);
        this.gl.uniform1f(this.uniforms.cameraZ, cameraZOffset); // Pass camera offset
        
        this.gl.uniform1f(this.uniforms.audioBass, this.audioData.bass);
        this.gl.uniform1f(this.uniforms.audioMid, this.audioData.mid);
        this.gl.uniform1f(this.uniforms.audioHigh, this.audioData.high);
        
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
