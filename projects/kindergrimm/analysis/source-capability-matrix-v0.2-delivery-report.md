# Asset Lab v0.2 — Source Capability Matrix Delivery Report

## Outcome

The existing Asset Lab route and its Drawn / Voxel / Gloss character production loop are preserved. The same page now exposes four source-backed modes: Character, Style, Item, and Environment. This is a capability expansion of the upstream Kindergrimm asset system, not a separate demo gallery.

## Delivered capability

| Mode | Delivered source capability | Actual output | Truth boundary |
| --- | --- | --- | --- |
| Character | `buildCharacter`, `buildVoxelCharacter`, `buildGloss` | three live representations; 3 × 768² transparent PNG + manifest | cross-backend identity remains intent-level, not shared part geometry |
| Style | 6 media + 9 historical styles through `styles.html` | live source contact sheet with style, seed, and sample count | selection/art direction surface; not text-to-image and not geometry |
| Item | 13 registered families × 4 ranks through `rollItem` + `thumbFor` | deterministic 512² transparent PNG + JSON | real procedural 2D; runtime exposes card, floor, and character hosts; not a 3D mesh |
| Environment | 5 species × 6 palettes × 3 finishes through `buildPlant` | real Three.js Group; 768² transparent proxy + JSON | runtime asset is geometry; PNG is only a catalog/non-3D proxy |

## Measured proof

- Character regression: existing browser 14/14 and contract 10/10.
- New capability matrix: 18/18.
- Item proof: Wand / Nightmare / Seed 515151; repeat fingerprint `kg-7dde09fa`; PNG 39,278 bytes; SHA-256 recorded.
- Environment proof: Tree / Bloom / Glaze / Seed 515151; 9,227 vertices, 6 meshes; PNG proxy 130,468 bytes; SHA-256 recorded.
- Layout proof: 1440 and 390 viewports have no horizontal overflow; keyboard tab mode switching passes.
- Fallback proof: `?render=off&mode=environment` preserves Recipe and provenance, disables the unavailable 3D export, while 2D item export remains enabled.
- Adjacent regression: Source Atlas contract/browser 9/9 + 12/12; Scene Intent/Studio 8/8 + 14/14.
- Runtime model: none. All delivered generation is seeded local code from upstream commit `5857b1e1cae2713d6714ad7dd7f89626bb242f0f`.

## Evidence

- `evidence/asset-lab-v02-style.png`
- `evidence/asset-lab-v02-item.png`
- `evidence/asset-lab-v02-environment.png`
- `evidence/asset-lab-v02-mobile-item.png`
- `evidence/asset-lab-v02-fallback.png`
- `analysis/source-capability-matrix-v0.2-browser-review.json`

## Next extension boundary

The next valuable step is not another page. It is to deepen this same source-backed pipeline: scene-demand matching, GLB serialization for procedural objects, collision/LOD metadata, item host previews, and versioned batch packs. External generative models or invented style packs remain a separate decision and are not implied by this delivery.
