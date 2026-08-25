# Kindergrimm Runtime SDK

M5 extracts runtime consumption from `npc-scenarios/` into instance-scoped ES modules.

The SDK accepts validated Manifest or Release Candidate contracts, caches asset descriptors by fingerprints, mounts renderer-backed actors through one lifecycle, owns gameplay-facing actor state hooks, and exposes deterministic session/diagnostic snapshots.

It has no backend, network, LLM or cloud dependency. `scene-adapter.js` is the only module that owns Three.js actor mounting. Loader, cache, state, session and diagnostics remain renderer-neutral.

Pure public entry: `index.js` (`kindergrimm-runtime-sdk/0.1`, version `0.1.0`). Three.js consumers explicitly import `three.js`; importing the pure entry never loads the rendering backend.
