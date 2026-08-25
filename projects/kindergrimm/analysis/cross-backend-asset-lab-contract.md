# Cross-backend Asset Lab — Design and Delivery Contract

## Design contract

- Entry mode: revision-led implementation.
- Request revision: 1.
- Target user and context: researchers and game-content authors evaluating Kindergrimm assets for later scene use.
- Desired first impression: this is a source-powered asset workbench, not another explanatory demo or an AI image generator.
- Visual ambition: Immersive.
- Experience architecture: Hybrid Workspace.
- Visual constraints: cream-paper source character; three native backend previews are the visual anchor; no invented decorative 3D.
- Information constraints: always distinguish intent contract, backend-native recipe, actual output, adaptation, unsupported gap, and future scene role.
- Operation constraints: choose a preset or edit seed/species/look, compile, compare all three source backends, export PNG and manifest.
- State constraints: ready, compiling, generated, invalid input, WebGL fallback, export success/error.
- Environment constraints: canonical local runtime `http://127.0.0.1:8882/`; no backend and no hosted model API; use upstream commit `5857b1e1` directly.
- Primary journey: select scene-oriented asset intent → compile to Drawn/Voxel/Gloss native recipes → inspect live outputs and mapping truth → export scene-ready records.
- User-defined phases: reuse source capability; generate usable assets; prepare later scene consumption.
- Required artifacts: runnable Asset Lab, intent compiler, three native previews, per-backend PNG export, provenance manifest, scene-readiness matrix, browser evidence, delivery report.
- Autonomy authorization: user explicitly said “确定并继续”.
- User-decision boundary: a new backend, hosted model, or external storage would require new authority; layout and local deterministic generation do not.
- Observable completion criteria: one action regenerates three real source-backed outputs from one intent; changing the seed changes all native recipes; exports are non-empty; limitations are visible; desktop/tablet/mobile/keyboard/reduced-motion/fallback pass; no `continue` remains.

## Representation and provenance contract

| Output | Representation | Source | Runtime role | Truth boundary |
| --- | --- | --- | --- | --- |
| Drawn | transparent/paper 2D render | upstream `src/rig.js` | portrait, dialogue, card, 2D scene actor | native Drawn part schema |
| Voxel | procedural Three.js solid | upstream `src/voxel/vrig.js` | readable 3D actor, pickup-scale world presence | native voxel part schema |
| Gloss | procedural Three.js molded solid | upstream `src/gloss/grig.js` | portrait, collectible, stylized 3D actor | native Gloss part schema |
| Intent contract | JSON metadata | our adapter | stable authored identity and scene requirements | not itself a rendered asset |
| Manifest | JSON provenance record | our extension | export/version/reproduction | records files and native recipes; does not claim schema identity |

## Backend mapping boundary

- Exact shared intent: seed and broad species meaning.
- Adapted intent: material/media, palette, body/stance, and scene role.
- Backend-local generation: all detailed part parameters.
- Unsupported cross-backend promise: identical hairstyle, glasses, clothing, prop socket, topology, or animation clip.
- LLM boundary: none at runtime. A future model may translate language into this validated intent contract only.

## Coverage manifest

| User phase | Requirement or artifact | Surface / state | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Reuse source | Directly import upstream Drawn/Voxel/Gloss builders | runtime modules | import/provenance audit | 1 | pass | implement source adapters |
| Generate assets | One intent compiles to three native recipes | generated | deterministic contract test | 5 | pass | implement compiler |
| Generate assets | Three visible live outputs use source renderers | desktop/generated | browser screenshot + DOM | 5 | pass | implement preview stage |
| Generate assets | Seed/preset changes regenerate all outputs | interaction | browser interaction | 5 | pass | wire controls |
| Scene preparation | Explain portrait/world/collectible usage | readiness panel | DOM evidence | 3 | pass | implement readiness matrix |
| Scene preparation | Show exact/adapted/unsupported mapping | lineage panel | DOM evidence | 6 | pass | implement mapping audit |
| Delivery | Per-backend PNG is non-empty | export success | browser download/blob evidence | 8 | pass | implement export |
| Delivery | Manifest records commit, intent, native recipes, provenance | export success | JSON contract test | 9 | pass | implement manifest |
| Accessibility | Keyboard journey and visible focus | keyboard | real browser path | 7 | pass | verify controls |
| Responsive | Desktop 1440, tablet 1024, mobile 390 | generated | screenshots + overflow DOM | 7 | pass | verify viewports |
| Motion | Reduced motion removes nonessential transitions | reduce | computed style | 7 | pass | verify preference |
| Fallback | WebGL-off retains recipes, mapping, source links | `?render=off` | browser state | 8 | pass | implement fallback |
| Regression | Atlas, Source-first contract, Scene Studio still pass | adjacent routes | automated checks | 9 | pass | run regression |
| Closure | Evidence, report, main-entry link, zero continue | all | terminal audit | 9 | pass | close delivery |
