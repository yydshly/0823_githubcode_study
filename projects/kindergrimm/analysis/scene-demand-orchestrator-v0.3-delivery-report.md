# Asset Lab v0.3 — Scene-demand Orchestrator Delivery Report

## Outcome

The canonical Asset Lab remains the production surface. A fifth Scene Orchestrator mode now turns explicit scene demand into an explainable, deterministic set of character, style, item, and environment materials produced by the existing upstream Kindergrimm capabilities.

This is not an LLM planner and not a composed game level. It is a source-material orchestration layer for later narrative, UI, scene, or level work.

## Delivered journey

1. Choose one of three meaningful presets or edit title, purpose, scene type, mood, biome, interaction, actor, and Seed.
2. A local versioned rule table matches one valid source capability from each material family.
3. The workbench calls the existing character, style, item, and object production paths.
4. The output board shows three character source views, one transparent item, one procedural environment proxy, and one live style proof.
5. Four explanation rows state signal, decision, source, representation, and gap.
6. Export produces five PNG assets plus one Scene Manifest.

## Actual measured result

Custom proof: “雾中遗迹的灯光线索”, Seed 123456.

| Demand signal | Matched source output |
| --- | --- |
| Mystery + Nightmare actor | Nightmare witness; Drawn / Voxel / Gloss |
| Uncanny mood | Surrealism source contact sheet |
| Discover interaction | Lantern / Nightmare / Seed 123557 |
| Ruin biome | Wildcard / Tundra / Fuzz / Seed 123667 |

Export proof:

- 6 files total: 5 PNG + 1 JSON.
- 693,806 bytes total.
- Character outputs: 3 × 768².
- Item output: 512², 93,687 bytes.
- Environment proxy: 768², 115,869 bytes; runtime representation remains procedural Three.js geometry.
- Every PNG has a 64-character SHA-256 in the Scene Manifest.
- Manifest source lock: `5857b1e1cae2713d6714ad7dd7f89626bb242f0f`.
- Runtime model: `none`.

## Validation

- Scene-demand v0.3 contract/browser: 22/22.
- Source capability matrix v0.2: 18/18.
- Original Asset Lab contract/browser: 10/10 + 14/14.
- Source Atlas contract/browser: 9/9 + 12/12.
- Scene Intent/Studio: 8/8 + 14/14.
- Desktop 1440, tablet 1024, and mobile 390 have no horizontal overflow.
- Invalid Seed preserves the prior valid plan and export state.
- WebGL-off mode retains deterministic matching, item output, style proof, explanations, and Recipes; unavailable 3D previews are explicitly marked and package export is disabled.

## Evidence

- `evidence/asset-lab-v03-scene-default.png`
- `evidence/asset-lab-v03-scene-custom.png`
- `evidence/asset-lab-v03-keyboard.png`
- `evidence/asset-lab-v03-mobile.png`
- `evidence/asset-lab-v03-fallback.png`
- `analysis/scene-demand-orchestrator-v0.3-browser-review.json`

## Deliberate boundary

The scene matcher uses explicit structured signals. The purpose text is preserved as authored context but does not silently alter matches. GLB serialization, collision/LOD metadata, item host visualization, persistence, and real playable scene assembly remain separate future extensions.
