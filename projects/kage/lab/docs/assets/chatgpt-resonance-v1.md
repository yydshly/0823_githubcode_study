# ChatGPT resonance asset pair v1

## Provenance

- Generator: ChatGPT built-in `image_gen` tool.
- Mode: new image, followed by an aligned edit-derived depth pass.
- Generated: 2026-08-24.
- Intended use: `resonance-flagship` landing-page hero and Three.js depth displacement.
- Dimensions: 1672 × 941 for both assets.
- Color asset: `/assets/flagship/chatgpt-resonance-hero-v1.png` — 1,678,858 bytes.
- Depth asset: `/assets/flagship/chatgpt-resonance-depth-v1.png` — 920,201 bytes.
- Review state: `L3-presentable` for this project demo. Publication and external license review remain product-owner responsibilities.

## Color prompt

```text
Use case: stylized-concept
Asset type: 16:9 landing-page hero image consumed by a Three.js depth-displacement scene
Primary request: create a premium cinematic hero visual for an intelligent sound product made for independent creators; the image should embody the idea that sound becomes a tangible sculptural form
Scene/backdrop: vast near-black midnight-blue acoustic space, subtle volumetric haze and sparse suspended particles, no visible room or horizon
Subject: one original translucent smoked-glass acoustic sculpture placed center-right, with a precise luminous cyan waveform filament suspended inside it and a restrained thin warm-amber resonance accent; elegant asymmetrical silhouette, believable engineered details, not a speaker or existing commercial product
Style/medium: high-end cinematic 3D product visualization, editorial art direction, physically believable materials, refined rather than sci-fi cliché
Composition/framing: wide 16:9; reserve the left 38–42 percent as calm dark negative space for semantic DOM headline and CTA; sculpture must be fully visible and become the unmistakable focal point; clear foreground, subject, and background depth layers suitable for subtle Three.js parallax
Lighting/mood: cold controlled rim light, soft internal glow, deep blacks, restrained futuristic atmosphere, quiet tension, premium launch-film still
Color palette: charcoal black, midnight navy, ice cyan, tiny warm amber accent
Materials/textures: smoked optical glass, satin dark metal, fine condensation-like micro texture, controlled reflections, no plastic look
Constraints: no text, no letters, no logo, no watermark, no UI, no HUD, no people, no brand marks; clean silhouette; keep the left copy area visually quiet and high contrast
Avoid: generic glowing orb, random abstract blob, stock-template composition, neon cyberpunk clutter, excessive bloom, oversaturated colors, fantasy props, literal musical notes
```

## Depth prompt

```text
Use case: precise-object-edit
Asset type: aligned grayscale depth map for the immediately preceding 16:9 Three.js hero image
Input images: Image 1 is the exact edit target and alignment reference
Primary request: convert Image 1 into a clean physically coherent monocular depth map while preserving the exact pixel composition, canvas dimensions, crop, camera, subject silhouette, internal waveform geometry, base, floor, haze, and every object position
Depth encoding: pure black represents farthest background; progressively lighter gray represents nearer haze and floor; the acoustic sculpture and base should be clearly separated by depth; nearest glass rim and foreground edges approach white; internal waveform receives coherent mid-to-near values according to its placement inside the glass
Style/medium: smooth grayscale technical depth pass, not a beauty render
Constraints: change only the pixel values into grayscale depth information; preserve all contours and spatial alignment exactly; no text, no labels, no color, no logo, no watermark, no added or removed objects, no changed silhouette, no edge halos, no fake normal-map lighting
Avoid: artistic black-and-white photograph, contrast-only conversion, inverted depth, noisy texture, posterization, displacement, altered framing
```

## Visual review

- The focal sculpture is distinct and fully visible.
- The left copy field remains dark and low-detail.
- No text, logo, watermark, HUD or people were introduced.
- The depth pass preserves the subject placement and canvas dimensions.
- The pair is suitable for subtle displacement and pointer parallax, but it does not represent true multi-view geometry.

