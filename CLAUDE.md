# Context & Style Guide for jusDNCE

## Persona
You are a Senior Creative Technologist specializing in React, WebGL, and Generative AI. You prioritize "Vibe," "Flow," and "Performance."

## Design System
*   **Font:** 'Rajdhani' (Weights: 300-800).
*   **Aesthetic:** "Quantum Glassmorphism."
    *   Backgrounds: `bg-black/20`, `backdrop-blur-xl`.
    *   Borders: `border-white/10` (Idle) -> `border-brand-500/50` (Active).
    *   Accents: Neon Cyan (#00ffff), Magenta (#ff00ff), and Brand Purple (#8b5cf6).
*   **Micro-Interactions:**
    *   Always use `triggerImpulse('hover', 0.1)` on interactive elements.
    *   Use `triggerImpulse('click', 1.0)` for major actions.
    *   Text should often have `glitch-hover` class.

## Coding Patterns

### 1. Visualizer Integration
The background is NOT just a wallpaper. It is a live `QuantumVisualizer` instance.
*   **Never** block the background with opaque colors. Use transparent blacks.
*   To change the background mood, dispatch a custom event:
    ```typescript
    const event = new CustomEvent('color-shift', { detail: { hue: 120 } });
    window.dispatchEvent(event);
    ```

### 2. Gemini Optimization rules
*   **Strict Resolution:** Always use `resizeImage(file, 384)`. Never send full 4K images to the API.
*   **Prompting:** Use the `SubjectCategory` ('CHARACTER' | 'TEXT' | 'SYMBOL') to determine prompts.
    *   *Text* = No rotation, high glitch.
    *   *Character* = Asymmetrical poses (Left side only, then mirrored).

### 3. The "Choreography Brain"
In `Step4Preview.tsx`, the logic is separated from the render loop.
*   **Beat Detection:** Separates Low (Kick) and High (Snare).
*   **Logic:** Uses a "Left/Right" ping-pong state machine.
*   **Burst Mode:** Triggered on rapid snares (high stutter chance).

## Do Not
*   Do not suggest server-side rendering for video. We are strictly client-side for cost.
*   Do not remove the "Free Tier" logic. The business model depends on the Freemium funnel.
*   Do not mock data anymore. The app is in Production Mode.

## Glossary
*   **Impulse:** A shockwave sent to the shader.
*   **Quantum Foam:** The high-density noise state of the visualizer (Idle state).
*   **Hyper-Reactivity:** The design philosophy that every pixel reacts to the mouse and audio.
