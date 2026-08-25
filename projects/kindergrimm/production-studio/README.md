# Kindergrimm Production Studio

Production Studio is the browser-local M4 workflow for turning the independent `mosslight-core-2d` Content Pack into a reviewed Release Candidate.

## Open

Run the existing local server, then open:

`http://127.0.0.1:8882/projects/kindergrimm/production-studio/`

The Studio does not call an LLM, cloud API or backend. Author state, review state and Gate evidence stay in local storage. WebGL is used only for transparent preview PNGs and the spritesheet.

## Production journey

1. Author a deterministic seed, comparison slot, batch count and semantic version.
2. Compare the same slot across Original, Mosslight Decorator and independent Mosslight Core 2D.
3. Approve or reject the current revision. Any author input or review-note change invalidates approval and Gate results.
4. Run G1–G6 for contract, asset independence, Golden coverage, portability, runtime and budget evidence.
5. Build a versioned Release Candidate containing `manifest.json`, `spritesheet.png`, `content-pack.json` and `release-candidate.json` in a stored ZIP with verified CRCs.

## Public verification surface

`window.__productionStudio` exposes read-only snapshots and controlled workflow actions for browser acceptance:

- `state()`, `session()`, `manifest()`
- `regenerate(values)`, `approve(notes)`, `reject(notes)`
- `runGates()`, `buildRelease()`, `restore()`, `reset()`
- `validateReleaseCandidate(record)`, `inspectPack()`

## Capability fallback

Open with `?webgl=off` to verify semantic fallback. Authoring, deterministic fingerprints, review, G1–G6 and Session JSON remain available. Preview images, spritesheet generation and RC ZIP stay disabled because they require a render surface.

## Contracts and evidence

- Delivery contract: `../analysis/m4-production-frontend-delivery-contract.md`
- Release Candidate schema: `../schemas/release-candidate.schema.json`
- Desktop/mobile/fallback evidence: `../evidence/m4-production-studio-*.png`
- Regression: `node ../scripts/verify-contracts.mjs` and `node ../scripts/verify-m3.mjs`
