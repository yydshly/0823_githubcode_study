# MotionSites R01 — Case Map and First Deep Dive

Date: 2026-08-27  
Scope: public MotionSites catalog metadata and official Academy material only  
V2 stage: reference research before generator integration

## Research route

```text
Selected pattern: research -> reusable capability evidence
Evidence branch: MotionSites public catalog + official Academy implementation guides
Required inputs: public case metadata, public full prompt, official implementation notes
Expected output: six-case map, two deep dives, bounded capability candidates
Project update: Kage V2 reference intelligence after runtime validation
```

This round does not copy a case, alter the workbench, generate assets, or publish a new Kage case.

## Evidence levels

| Level | Meaning | Allowed conclusion |
| --- | --- | --- |
| E3 | Official full prompt or implementation specification is public. | Composition, asset, motion, responsive and acceptance behavior may be extracted. |
| E2 | Official tutorial describes the implementation route, but not every selected-case detail. | A general capability route may be proposed, but the selected case cannot be claimed as technically verified. |
| E1 | Official catalog exposes only title, category, likes or design credit. | Use only as a direction signal and future inspection target. |
| E0 | Visual or technical inference without source/runtime evidence. | Keep as a hypothesis; do not add to the V2 capability library. |

## First six-case map

| Case | Catalog signal | Why it matters to Kage V2 | Current evidence | Next evidence needed |
| --- | --- | --- | --- | --- |
| [Scroll Landing Page](https://motionsites.ai/?prompt=scroll-landing) | Interactive, 235 likes | A full-viewport media timeline can deliver cinematic motion without forcing every idea into real-time 3D. | E3: official Academy publishes the full NovaAI prompt and technical behavior. | Reproduce the media timeline with a Kage-owned asset and measure desktop/mobile behavior. |
| [Pulse 3D](https://motionsites.ai/?prompt=pulse-3d) | 3D Website, 197 likes | Represents the real-GLB, pinned-scroll Three.js branch that Kage currently handles inconsistently. | E2: catalog metadata plus official 3D-scroll workflow. | Inspect the full prompt or live implementation; validate with an L3+ GLB. |
| [Interactive Discovery](https://motionsites.ai/?prompt=interactive-discovery) | Hero, 594 likes, design credit shown | Represents a first-screen interaction whose discovery behavior is part of the message, not an ornamental mouse effect. | E1: catalog metadata only. | Capture opening, hover/pointer response and mobile fallback; obtain prompt details if available. |
| [Immersive Studio](https://motionsites.ai/?prompt=immersive-studio) | Agency, 23 likes | Represents identity-led composition where brand world and proof assets matter more than generic WebGL decoration. | E1: catalog metadata only. | Inspect the visual hierarchy, proof-bearing content and whether WebGL is actually present. |
| Halo Sound | Ecommerce catalog item | Relevant to Kage's sound-product cases and the question of keeping one product as the persistent hero. | E1: catalog metadata only. | Resolve the public case slug, inspect product continuity, asset type and capability explanation. |
| Dreamcore Landing | Landing Page catalog item | Relevant to dream, memory and atmospheric briefs where continuity is more important than a literal product model. | E1: catalog metadata only. | Resolve the public case slug, inspect whether continuity comes from video, image sequence, CSS or WebGL. |

The six are deliberately different. They are not six templates; they are six evidence targets covering media timeline, real 3D, pointer discovery, identity, product continuity and environmental memory.

## Deep dive A — Scroll Landing Page / public NovaAI prompt

### Source evidence

The official Academy guide publishes a complete recreation prompt and describes the workflow as:

```text
choose a visual direction
  -> prepare a scroll-ready MP4 or image sequence
  -> give the coding model exact layout, asset and motion rules
  -> connect page progress to media progress
  -> make small focused refinements
```

Primary source: [How to Build a Scroll-Animated Website With AI](https://motionsites.ai/lesson/build-scroll-animated-website-with-ai).

### Capability map

| Layer | Evidence-backed behavior |
| --- | --- |
| Rendering stack | React + TypeScript + Vite + Tailwind for the published reproduction prompt. Three.js is not required for this route. |
| Scene assets | One required 1920x1080 hero MP4, a poster fallback and one portrait asset. The video contains the expensive 3D visual work. |
| Motion system | Global page progress drives a smoothed media timeline. Poster, video and cached-frame canvas crossfade as readiness improves. |
| Interaction | Scroll is the main timeline. IntersectionObserver reveals DOM blocks. Hover only adds small link/button feedback. |
| Visual quality | Sparse editorial DOM floats above full-bleed motion; center space is intentionally preserved for the visual subject. |
| Publishing path | The same full-bleed media can be screen-recorded; the prompt itself focuses on responsive web delivery. |
| Risks | Frame extraction cost, memory pressure, seek instability, text contrast and mobile media performance. |

### Implementation principle

The public prompt defines:

- a fixed full-viewport visual layer behind semantic DOM;
- `progress = scrollY / (scrollHeight - innerHeight)` clamped to `0..1`;
- a smoothed value updated with a `0.12` interpolation factor;
- poster -> decoded video -> cached-frame canvas readiness layers;
- at most 90 cached frames, with a 960px maximum width;
- video-seek fallback when the frame cache is unavailable;
- canvas DPR capped at 2;
- `object-cover` geometry and mobile stacking rules;
- a strict acceptance description for opening and later page states.

This is important: the prompt does not merely say “make it cinematic.” It specifies assets, layout, algorithms, fallbacks, responsive behavior, prohibitions and final visible evidence.

### Why the result can feel strong

1. One dominant moving asset creates continuity across the full page.
2. The DOM does not compete with the visual center.
3. Scroll controls a meaningful state transition instead of triggering disconnected entrance animations.
4. Asset URLs and dimensions remove model guesswork.
5. The prompt contains explicit “do not” rules that protect the composition.
6. Refinement is local: move content, preserve center space, adjust opacity or typography without redesigning the whole page.

### Bounded conclusion for Kage

Candidate capability: `scroll-scrub-media`.

```text
Input:
  one publishable MP4 or coherent image sequence
  start/end visual meaning
  protected subject area

Output:
  fixed full-bleed media field
  semantic DOM overlay
  scroll-scrub timeline
  poster/video/canvas fallback chain
  desktop/mobile/reduced-motion states
```

This route should be available when a generated video or coherent sequence expresses the idea better than live Three.js. Three.js may still add a light foreground layer, but must not be required.

### Do not copy blindly

- Do not force dark glass UI, Inter, white text or a two-section structure onto unrelated briefs.
- Do not make 90 cached frames a universal default; calculate the budget from duration and device class.
- Do not claim real-time 3D when the main visual is prerendered media.
- Do not embed important copy inside the video.

## Deep dive B — Pulse 3D / official 3D-scroll route

### Verified source boundary

The public catalog verifies that Pulse 3D is categorized as a `3D Website` and exposes its popularity signal. The selected case's exact model, scene, camera track and prompt were not available through the public text response in this research environment.

The official Academy separately publishes a general 3D-scroll workflow: [How to Build a 3D Scroll-Animated Website with AI](https://motionsites.ai/lesson/build-3d-scroll-animated-website-with-ai).

Therefore:

- Pulse 3D visual/technical specifics remain E1;
- the general image -> GLB -> Three.js -> scroll workflow is E2;
- no Pulse-specific implementation detail is treated as fact yet.

### Evidence-backed general route

```text
single object reference
  -> front/back/left/right image references
  -> image-to-3D generation
  -> GLB with 1K-2K textures
  -> pinned webpage structure
  -> scroll drives scene-one to scene-two state
  -> Three.js loads and animates the GLB
  -> tone mapping and browser review
```

### Capability map

| Layer | Evidence-backed behavior |
| --- | --- |
| Rendering stack | Three.js authored by a coding model. |
| Scene assets | A browser-ready GLB generated from multi-view references; 1K-2K textures are recommended. |
| Motion system | The page remains visually pinned while scroll controls the transition between authored states. |
| Interaction | Scroll is primary; the tutorial does not establish product inspection controls. |
| Visual quality | Model quality, correct lighting and tone mapping determine whether the hero looks credible. |
| Publishing path | Browser screen recording is suggested after the interaction works. |
| Risks | Weak generated topology/materials, dark output without tone mapping, false product fidelity, large payload and uncontrolled camera motion. |

### Bounded conclusion for Kage

Candidate capability: `glb-scroll-hero`.

It must be gated by asset quality:

```text
L0-L1: do not use as a public hero
L2: inspection prototype only
L3: acceptable for medium-distance web presentation
L4: required for cinematic close-up or product launch
```

The V2 planner must not select this capability because the brief merely contains the word “3D.” It should select it only when:

- the product/object is the enduring visual subject;
- a usable GLB exists or model generation is explicitly part of the plan;
- the target benefit needs spatial rotation, internal structure or material inspection;
- the asset and performance gates can pass.

### Missing evidence before integration

- Pulse 3D's real opening/middle/end composition;
- model format, asset size and material setup;
- whether the scroll modifies camera, model, typography or all three;
- mobile and reduced-motion fallback;
- final acceptance states.

Until those are observed, `glb-scroll-hero` is a capability candidate, not a production-ready Kage V2 capability.

## First capability candidates

| Candidate | Evidence | State | Smallest validation |
| --- | --- | --- | --- |
| `prompt-contract` | E3 | Ready to encode | Confirm that a Codex authoring request preserves identity, assets, algorithms, responsive rules, prohibitions and acceptance. |
| `scroll-scrub-media` | E3 | Ready for local prototype | Use one Kage-owned MP4 or coherent image sequence and capture opening/middle/ending/mobile. |
| `media-readiness-layers` | E3 | Ready for local prototype | Verify poster -> video -> canvas without blank frames. |
| `focused-refinement` | E3 | Ready to adopt as workflow | Limit repair to named layout/opacity/type defects without full redesign. |
| `glb-scroll-hero` | E2 | Needs runtime evidence | Test one L3+ GLB, tone mapping, three scroll states and mobile fallback. |
| `multi-view-to-glb` | E2 | Asset research only | Measure one generated GLB's geometry, materials, texture size and browser payload. |

## Decision and next action

The first runtime validation should be `scroll-scrub-media`, not `glb-scroll-hero`.

Reasons:

1. It has the strongest public implementation evidence.
2. It directly addresses Kage's current continuity and scroll-quality problems.
3. It can reuse a coherent generated video or image sequence without pretending that a weak asset is a real 3D model.
4. It is smaller and faster to validate.

Stop after one prototype and four evidence states. Do not alter the generator until the prototype proves the capability.

