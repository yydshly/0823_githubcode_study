# ChatGPT tidal archive asset pair v1

Updated: 2026-08-25, Asia/Shanghai

## Purpose

This pair supports the `tidal-archive` creative proof. It is an asset-led immersive exhibition page, not a claim that a flat image has become a freely rotatable 3D environment.

## Generation route

- Tool: ChatGPT built-in image generation (`imagegen` Skill, built-in mode).
- API key: not required.
- Color asset: `public/assets/tidal-archive/chatgpt-tidal-archive-hero-v1.png`.
- Aligned depth asset: `public/assets/tidal-archive/chatgpt-tidal-archive-depth-v1.png`.
- Runtime use: subdivided image plane, aligned depth displacement, bounded pointer parallax, water-current shader, translucent archive plates, relation curves and particles.
- Declared maturity: `L3-presentable`.
- Publication state: project research asset; external publishing still requires an explicit rights/product review.

## Color prompt

```text
Use case: stylized-concept
Asset type: immersive Three.js landing-page hero environment
Primary request: a poetic underwater memory archive where translucent paper-like manta forms and thin glass archive plates drift through a deep ocean canyon, connected by faint luminous threads; the scene should feel like preserved memories becoming a navigable spatial world
Scene/backdrop: vast dark teal underwater space with layered depth, distant silhouettes, subtle suspended particles and soft caustic light
Subject: one elegant translucent manta-like archive form as the clear visual anchor, surrounded by a small number of floating glass plates and luminous filaments
Style/medium: cinematic high-end concept render, editorial rather than game UI, credible translucent and glass materials
Composition/framing: wide 16:9 establishing composition, strong depth layers, central-right visual anchor, calm negative space on the left for semantic webpage copy
Lighting/mood: quiet, mysterious, contemplative, soft cyan bioluminescence with restrained warm pearl highlights
Color palette: deep ink teal, cyan glass, desaturated pearl, near-black ocean
Materials/textures: translucent membrane, etched glass, fine particulate water, subtle volumetric rays
Constraints: no text, no typography, no logos, no watermark, no UI panels, no generic glowing sphere, no crowded coral reef, no people, no recognizable brands; coherent single scene suitable for shader parallax and layered particle integration
```

## Depth prompt

```text
Edit the immediately preceding generated tidal-memory hero image.
Use case: precise-object-edit
Asset type: aligned depth texture for a Three.js displacement shader
Primary request: convert it into a clean monochrome relative-depth map while preserving the exact same composition, camera, silhouettes, object positions and crop
Depth convention: nearest glass manta and nearest foreground rock are bright gray to white; mid-distance glass archive plates are medium gray; canyon walls and distant water progressively darken; far background is near black
Style/medium: smooth grayscale depth visualization, no color
Constraints: change only the rendering into depth values; preserve every edge, silhouette, perspective and image dimensions; no new objects; no removed objects; no text; no watermark; avoid surface texture noise where it obscures large depth regions
```

## Honest boundary

The depth map enables convincing bounded displacement and parallax from the authored camera range. It does not provide hidden surfaces, geometric collision, free orbit, object separation or true metric depth. Those require a GLB, a layered source asset, a captured scene, or another real 3D production route.
