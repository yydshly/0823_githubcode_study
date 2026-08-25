# M3 three-way renderer review

Date: `2026-08-24`  
Master seed: `240824`  
Slots: `50`  
Machine record: `analysis/m3-three-way-review.json`

## What is being compared

The comparison uses the same 50 deterministic slot numbers for three renderer routes. Each Content Pack is allowed to apply its own declared recipe constraints, so this is a production-route comparison, not a claim that all three routes consume byte-identical recipes.

| Route | Visible source | Renderer | Features / coverage | 50-slot result |
| --- | --- | --- | --- | --- |
| Kindergrimm Original | upstream authored procedural parts | `kindergrimm-drawn-2d` | base renderer | 50 unique Recipe fingerprints |
| Mosslight Waystation | upstream visible character + local decoration | `mosslight-canvas-decorator` | 12 / 5 groups | 50 unique Recipe and 50 unique Visual fingerprints |
| Mosslight Core 2D | local authored complete visible character | `mosslight-core-2d` | 17 / 6 groups | 50 unique Recipe and 50 unique Visual fingerprints |

## Independent-renderer finding

Mosslight Core is not a completion of the decorator. Its builder does not import the upstream character builder, layout builder, part registry or upstream drawing functions. It uses only the low-level Canvas plane factory, deterministic RNG, Three.js groups and the compatible animation-facing shape.

Browser runtime audit for every Core character:

- 23 visible planes;
- 23 locally authored planes;
- 0 upstream visible planes;
- authored ratio `1.0`;
- media grammar `mosslight-gouache`;
- supported base `biped` only in v0.1, stated in Pack provenance.

The biped-only boundary is intentional. `sit` and `quad` remain future renderer extensions and must add truthful silhouette, anchors and limbs before they can enter the supported base list.

## Visual result

At 256px factory tiles and the 8-actor scene camera, Core is identifiable through a paper-gouache face, botanical contour, leaf crown, cheek sprigs, compact mantle, route badge and carried lantern. Deterministic variation changes species ears, crown leaves, mantle cut, accent color and lantern rune without losing the shared family language.

The visual identity differs from both comparison routes:

- Original ranges across the upstream creature grammar and media set.
- Decorator preserves that Original silhouette and overlays mosslight ambient/body accents.
- Core owns the full silhouette and all visible facial, body, limb, clothing and prop planes.

## Runtime and budget result

| Observation | Result | M3 budget |
| --- | --- | --- |
| Factory 12-character build | 390ms final sample | <= 2500ms |
| Scenario 8-character build | 354ms final sample | <= 1800ms |
| Planes per character | 23 | <= 28 |
| Encounter draw calls | 186–187 | <= 260 |
| Scene authored/upstream planes | 184 / 0 | 100% authored / 0 upstream |

The initial scene used 370 draw calls because the shared low-level part material is transparent and double-sided. Core now sets its strictly front-facing orthographic planes to `THREE.FrontSide`, reducing the result to 186–187 without changing the image.

## Production-loop result

- The factory generates 12 deterministic Core assets, exposes Pack/Renderer/Visual fingerprints and exports JSON, transparent PNG, spritesheet and ZIP.
- The final ZIP contains `manifest.json`, `spritesheet.png` and `content-pack.json`; all entries are stored and pass CRC inspection.
- The scenario accepts the valid Core Manifest, reconstructs 8 independent actors, rejects a tampered Visual fingerprint, preserves the current scene on rejection and restores the same Seed fingerprints.
- Waystation, encounter and council modes all retain 184 authored planes and zero upstream visible planes.
- 390px, keyboard, reduced-motion and WebGL-off paths remain operable.

## Provenance and AI boundary

The Core visuals are runtime-authored procedural Canvas 2D. There are no runtime LLM calls, cloud generation calls, imported AI bitmaps or image-to-3D claims. AI remains an optional future intent adapter and is not part of the deterministic renderer.

## Final evidence

- `evidence/m3-core-factory-desktop.png`
- `evidence/m3-core-factory-mobile.png`
- `evidence/m3-core-scene-desktop.png`
- `evidence/m3-core-scene-mobile.png`
- `fixtures/golden/mosslight-core-2d-recipes.json`
- `scripts/verify-m3.mjs`

