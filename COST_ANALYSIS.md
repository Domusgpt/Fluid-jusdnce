
# Cost Analysis: RhythmLoop AI

This document breaks down the estimated costs of running the RhythmLoop AI generator using Google's **Gemini 2.5 Flash** models with optimized settings.

## Model Pricing (Gemini 2.5 Flash Tier)

We utilize **Gemini 2.5 Flash** models with strict input optimization (**384px**).

| Operation | Unit Cost (Approx) | Notes |
| :--- | :--- | :--- |
| **Image Input** | < $0.00001 / img | Sized at 384px (~200 tokens). Extremely cheap. |
| **Text Input** | ~$0.00001 / req | System instructions + Prompts |
| **Image Output** | ~$0.003 / img | Standard Gen-AI Image Rate* |

*> Note: Pricing for `gemini-2.5-flash-image` (Preview) is based on standard market rates for fast image generation models in the Flash tier.*

## Per-Video Cost Breakdown

### Turbo Mode (Default)
*Generates 4 Unique Frames + Mirrors*

1.  **Planning Phase (1 Call)**
    *   1 Input Image (384px) + Text Context: **~$0.00002**
2.  **Generation Phase (4 Calls)**
    *   4 x Image Generation Requests: **$0.012**
3.  **Mirroring (Local)**
    *   **$0.00** (Done in browser)

**Total Estimated Cost: ~$0.012 per video**

### Max Variety Mode
*Generates 8 Unique Frames + Mirrors*

1.  **Planning Phase (1 Call)**: ~$0.00002
2.  **Generation Phase (8 Calls)**: $0.024

**Total Estimated Cost: ~$0.024 per video**

## Optimization Features Implemented

1.  **384px Downsizing**: All uploads are compressed to **384px** (JPEG 0.6) before API transmission. This is the lowest viable resolution for accurate pose generation, minimizing token input costs significantly.
2.  **Parallel Execution**: Frame requests are concurrent.
3.  **Client-Side Mirroring**: We generate one side of a movement and flip it locally, effectively **doubling** the frame count (from 4 to 8, or 8 to 16) for **free**.
4.  **Social Export**: Video encoding is 100% client-side (WebM), incurring $0 server costs.
