# jusDNCE Project Handoff

## 1. Project Overview
**jusDNCE** is a high-performance, AI-powered web application that turns static character images into animated dance loops synchronized to audio. It utilizes **Google Gemini 2.5 Flash** for frame generation and a custom **WebGL Quantum Visualizer** for a reactive UI experience.

### Core Stack
*   **Frontend:** React 18, TypeScript, Tailwind CSS.
*   **AI Engine:** `@google/genai` (Gemini 2.5 Flash & Flash-Image).
*   **Visuals:** Custom WebGL Raymarching Shader (`QuantumVisualizer`), HTML5 Canvas Compositing.
*   **State:** Local React State (Mocked Auth/Payments ready for Firebase switch).

---

## 2. Current Status
*   **UI/UX:** Complete. "Glassmorphic" design with global holographic background and micro-interactions.
*   **AI Pipeline:** Optimized. Uses a "Plan -> Generate -> Mirror" workflow.
    *   *Input:* Downscaled to 384px (Cost efficiency).
    *   *Output:* 12 Frames (Low/Mid/High energy + Mirrors).
*   **Choreography Engine:** Functional. Includes "Brain" logic for direction switching, burst modes, and beat detection.
*   **Export:** Client-side `MediaRecorder` (WebM). No server rendering required.
*   **Backend:** Currently using in-memory mock data. Ready for Firebase integration.

---

## 3. Key Architectural Decisions
1.  **Client-Side Heavy:** We minimize server costs by doing image resizing, mirroring, and video encoding in the browser.
2.  **Global Event Bus:** The app uses `window.dispatchEvent` for `ui-interaction` and `color-shift` events to sync the React UI with the WebGL background.
3.  **Gemini 2.5 Flash:** We explicitly use the Flash tier for speed and cost (<$0.02 per video). Do not switch to Pro without adjusting the `COST_ANALYSIS.md`.

---

## 4. Critical Files
*   `services/gemini.ts`: The core AI logic. Handles resizing, prompting, and mirroring.
*   `components/Visualizer/HolographicVisualizer.ts`: The WebGL shader engine.
*   `components/Step4Preview.tsx`: The main "Player" logic, audio analysis, and recording loop.
*   `components/GlobalBackground.tsx`: The bridge between React state and the WebGL canvas.

---

## 5. Next Immediate Steps
1.  **Firebase Init:** Initialize Firestore and Auth (See `AGENTS.md`).
2.  **Environment:** Set `API_KEY` in the deployment environment.
3.  **Stripe:** Connect the Payment Modal to a real Stripe Payment Link or Firebase Extension.
