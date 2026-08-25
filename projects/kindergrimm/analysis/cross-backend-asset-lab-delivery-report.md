# Cross-backend Asset Lab — Delivery Report

## Current stage

The Source-first program has moved from repository re-audit into its first source-backed asset-production slice. The canonical execution route is:

`http://127.0.0.1:8882/projects/kindergrimm/asset-lab/`

## Completed

- Added a constrained `kindergrimm-asset-intent/1.0` contract.
- Added a deterministic compiler from one intent into Drawn, Voxel, and Gloss backend-native recipes.
- Imported and called upstream `buildCharacter`, `buildVoxelCharacter`, and `buildGloss` directly at commit `5857b1e1`.
- Added live source-generated previews with backend statistics.
- Added preset/seed/species/look regeneration and truthful exact/adapted/local/unsupported mapping.
- Added 768×768 transparent PNG export for all three backends.
- Added SHA-256, upstream provenance, native recipes, scene-readiness records, and a JSON Manifest.
- Added WebGL-off fallback that preserves recipes, mapping, and direct upstream verification links.
- Linked the lab from the Source-first Atlas, project overview, README, Program v2, and Scene Studio.
- Generated a durable sample pack at `asset-lab/samples/harbour-courier-240824/`.

## Truth boundary

- Shared exactly: integer seed.
- Shared or adapted: broad species meaning and visual intent.
- Backend-local: detailed part parameters and geometry.
- Not yet unified: hairstyle, glasses, clothing, accessories, sockets, topology, and animation clips.
- The Voxel and Gloss PNGs are scene proxies of real procedural 3D geometry; they are not GLB exports.
- Runtime LLM calls: 0. Hosted generation API calls: 0.

## Material output

The sample pack contains:

- `harbour-courier-240824--drawn.png`
- `harbour-courier-240824--voxel.png`
- `harbour-courier-240824--gloss.png`
- `harbour-courier-240824--manifest.json`

All three PNGs are 768×768, have a transparent `(0,0)` corner, and match the SHA-256 stored in the manifest.

## Verification

- Asset Lab contract: 10/10.
- Asset Lab browser: 14/14.
- Source-first contract: 9/9.
- Source-first Atlas browser: 12/12.
- Scene intent contract: 8/8.
- Scene Studio browser: 14/14.
- Browser coverage: 1440 desktop, 1024 tablet, 390 mobile, keyboard, invalid input, reduced motion, WebGL-off fallback, export blobs, manifest, console.

## Deliberately remaining program work

The scoped Asset Lab delivery is closed. The next program slice should add a shared semantic-part contract for hair, glasses, outfit, held-item/socket, and pose intent, then compile those fields into supported backend-local part parameters. GLB or reusable scene-factory export should follow only after that identity contract is evidenced.

## Handoff answers

1. Project/stage: Kindergrimm Source-first asset research; first cross-backend source-production slice complete.
2. Completed: intent compilation, three native source renderers, PNG/Manifest export, sample pack, provenance and browser evidence.
3. Remaining: shared semantic parts, scene sockets, animation mapping, and native 3D runtime export.
4. Evidence: five final Asset Lab screenshots, browser review JSON, three PNGs, manifest, and 67 passing targeted checks.
5. Next session first action: define and test `kindergrimm-semantic-parts/1.0` on a small field set before adding more visual styles or scenes.
