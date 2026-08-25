# M5 · Runtime SDK delivery contract

Status: `DONE`  
Program: `Deterministic Game Asset Platform v1`  
Target modules: `runtime-sdk/` and `npc-scenarios/`  
Contract date: `2026-08-24`

## Outcome

Turn the current scenario-specific consumer into a small, stable browser Runtime SDK that can load one validated Content Pack bundle and rebuild the same NPC identities in three gameplay contexts.

```text
Release Candidate / Manifest
  -> validate + resolve Content Pack
  -> cache deterministic asset records
  -> instantiate scene actors
  -> drive state hooks
  -> dispose / rebuild without identity drift
```

M5 does not create new art, modify the Pack visual language, add a backend, introduce an AI provider or start the separate 3D program. It stabilizes consumption of the M3 asset and M4 release contracts.

## SDK architecture

| Module | Responsibility | Must not own |
| --- | --- | --- |
| `bundle-loader` | accept Manifest/RC JSON, validate, resolve Pack, expose stable diagnostics | DOM, Three.js scene ownership |
| `asset-cache` | key recipes/visuals by contract fingerprints and deduplicate builds | mutable gameplay state |
| `scene-adapter` | instantiate, update and dispose actors through a renderer-neutral protocol | scenario rules or UI copy |
| `state-hooks` | selected, moving, alert, speaking, damaged and disabled transitions | rendering implementation details |
| `runtime-session` | deterministic seed/import source, rebuild, snapshot and restore | local production review state |
| `diagnostics` | timings, draw calls, actor/plane counts and structured issues | release approval decisions |

Public SDK entry points remain pure or instance-scoped. Scenario pages consume the SDK; they do not become the SDK.

## Runtime contract

Every mounted actor must expose:

- stable `assetFingerprint` and optional `visualFingerprint`;
- Pack and Renderer identity;
- `mount`, `update`, `setState`, `snapshot` and `dispose` lifecycle;
- renderer audit and diagnostics;
- no hidden network, LLM or cloud calls.

The same validated bundle must reconstruct the same actor identity set in waystation, encounter and council modes. Layout may change; Recipe and Visual fingerprints may not.

## Coverage manifest

| ID | Requirement / state | Surface | Evidence | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| M5-C1 | Public SDK entry point and versioned runtime snapshot | module API | Node import + browser state | PASS | terminal evidence recorded |
| M5-C2 | Manifest and RC loaders share contract diagnostics | loader | accept/reject fixtures | PASS | terminal evidence recorded |
| M5-C3 | Fingerprint-keyed asset cache deduplicates builds | cache | hit/miss counters | PASS | terminal evidence recorded |
| M5-C4 | Renderer-neutral actor lifecycle | adapter | mount/update/dispose evidence | PASS | terminal evidence recorded |
| M5-C5 | Stable gameplay state hooks | actor state | transition matrix | PASS | terminal evidence recorded |
| M5-C6 | Seed and imported bundle sessions rebuild identically | session | snapshot/restore evidence | PASS | terminal evidence recorded |
| M5-C7 | Waystation consumes SDK | scenario | browser identity evidence | PASS | terminal evidence recorded |
| M5-C8 | Encounter consumes the same SDK | scenario | browser identity + state evidence | PASS | terminal evidence recorded |
| M5-C9 | Council consumes the same SDK | scenario | browser identity + selection evidence | PASS | terminal evidence recorded |
| M5-C10 | Invalid/tampered input preserves current scene | recovery | browser failure-state evidence | PASS | terminal evidence recorded |
| M5-C11 | Desktop/390, keyboard, reduced-motion and WebGL-off pass | product quality | current-browser matrix | PASS | terminal evidence recorded |
| M5-C12 | M2–M4 contracts, Factory and Studio regress cleanly | release safety | commands + browser checks | PASS | terminal evidence recorded |

## Budgets

| Metric | Budget |
| --- | --- |
| SDK module import | <= 500ms on current research device |
| Warm rebuild, 8 Core actors | <= 700ms |
| Cache identity drift | 0 |
| Core scene draw calls | <= 260 |
| Core visible planes | 184 authored / 0 upstream for 8 actors |
| Scene replacement on invalid import | 0 actors changed |
| Mobile overflow | none at 390 CSS px |

## Completion rule

M5 is `DONE`: all 12 coverage rows passed machine and current-browser verification. Changes to the SDK schema, loader diagnostics, cache key, actor lifecycle, session snapshot or scenario integration reopen the affected rows.

## Completion evidence

- Public SDK: pure `runtime-sdk/index.js` (`kindergrimm-runtime-sdk/0.1`, version `0.1.0`) plus explicit `runtime-sdk/three.js` rendering entry.
- Modules: Manifest/RC loader, fingerprint cache, actor state hooks, runtime session, diagnostics and Three.js scene adapter.
- Machine verification: `scripts/verify-m5.mjs` passes 9/9, including Manifest and RC accept/reject, cache deduplication, state lifecycle, session restore and diagnostics.
- Three-scene identity: Waystation, Encounter and Council reconstruct the same 8 Recipe and 8 Visual fingerprints from Core Pack `a96d877a` / Renderer `32d9c2cf`.
- Scene adapter: 8 actors, 184 authored / 0 upstream visible planes, 186 draw calls.
- Cache and budget: first pass 8 misses/8 builds; warm rebuild 8 hits, 177ms against 700ms budget; later valid import/restore samples 158–211ms.
- State hooks: keyboard ArrowRight updates Runtime Session selection; Enter transitions the selected actor from idle to selected.
- Transactionality: tampered Visual or asset fingerprint is rejected; fingerprints, mode, selected actor and actor count remain unchanged.
- Portability: valid Manifest import and Seed restore preserve all 8 identities and the active mode.
- Product matrix: 1440/390, keyboard, reduced-motion (`paused: true`) and WebGL-off pass. WebGL-off retains 8 roster items, cache/session, mode/selection and transactional rejection.
- Regression: 6 schemas / 4 fixtures / 0 failures; M3 9/9; Factory Original/Core and Production Studio 3 routes + 6/6 Gates pass current-browser checks.
- Evidence: `../evidence/m5-runtime-sdk-desktop.png`, `../evidence/m5-runtime-sdk-mobile.png`, `../evidence/m5-runtime-sdk-webgl-off.png`.