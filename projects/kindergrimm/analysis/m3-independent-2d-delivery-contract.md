# M3 · Independent 2D Pack delivery contract

Status: `DONE`  
Program: `Deterministic Game Asset Platform v1`  
Target pack: `mosslight-core-2d`  
Target renderer: `mosslight-core-2d`  
Contract date: `2026-08-24`

## Design contract

- Entry mode: revision-led implementation.
- Request revision: architecture-driven Kindergrimm platform / M3.
- Target user and context: a game-content team producing deterministic 2D NPC packs for browser runtime scenes.
- Desired first impression: this is an owned, reusable asset system, not another upstream demo skin.
- Visual ambition: Immersive.
- Experience architecture: Hybrid Workspace — factory detail flow plus persistent runtime scene.
- Visual constraints: readable at 256px tiles and the 8-actor orthographic camera; shared Mosslight family language with deterministic variation.
- Information constraints: Pack, Renderer, Recipe and Visual fingerprints; coverage, provenance and independent-plane metrics stay visible.
- Operation constraints: seed build, pack selection, inspection, JSON/PNG/sheet/ZIP export, Manifest import, three scene modes and keyboard scene control.
- State constraints: seed, imported, rejected/recovery, reduced-motion and WebGL-off.
- Environment constraints: local static server at `127.0.0.1:8882`; desktop Chromium and 390px mobile viewport.
- Primary journey: choose Core Pack → build batch → inspect/export bundle → import into scene → switch use case → reject tamper → recover seed.
- User-defined phases: show capability; drive technical extension; analyze and build usage scenarios; continue autonomously by architecture.
- Required artifacts: independent renderer, authored media, coverage manifest, 50 recipes, three-way review, browser evidence and updated Program/README/research station.
- Autonomy authorization: the user explicitly requested architecture-led autonomous continuation without conversational phase confirmation.
- User-decision boundary: brand direction, external publishing, AI provider and 3D backend remain outside M3.
- Observable completion: all M3-A rows pass with machine and current-browser evidence.

## Outcome

Deliver the first independently identifiable, deterministic 2D Content Pack. It must build a complete visible character from our own visual grammar, not decorate a visible Kindergrimm character.

The upstream project may remain a research dependency for low-level Three.js Canvas planes, animation protocol, recipe compatibility and pinned provenance. It must not supply any visible Core character part.

## Architecture boundary

```text
Recipe + Content Pack
        |
        +-- kindergrimm-original ------> upstream buildCharacter
        |
        +-- mosslight-waystation ------> upstream buildCharacter + decorator kit
        |
        +-- mosslight-core-2d ---------> independent Core builder
                                         |-- own layout
                                         |-- own media grammar
                                         |-- own visible parts
                                         `-- compatible face/animation adapter
```

The Core builder may import `three`, `makePart`, `U`, `makeRng` and `hashStr`. It must not import `buildCharacter`, `buildLayout`, upstream part definitions or upstream drawing functions.

## Visual grammar

Authored media id: `mosslight-gouache`.

The media grammar must visibly define:

- fill: opaque paper-gouache fields with deterministic tonal variation;
- edge: dark botanical contour with soft inner highlight;
- texture: seed-stable flecks, dry-brush gaps and glow stipple;
- silhouette: large leaf-shaped head, compact coat body, readable hands and boots;
- identity: leaf crown, cheek sprigs, route badge and carried lantern.

## Coverage manifest

Every renderer feature appears exactly once in one coverage group.

| Group | Required feature ids | Runtime proof |
| --- | --- | --- |
| head | `core-head`, `core-ears`, `core-hair`, `core-leaf-crown` | authored planes attached to head group |
| face | `core-eyes`, `core-brows`, `core-nose`, `core-mouth`, `core-cheek-sprigs` | expression-compatible states |
| body | `core-body`, `core-shadow` | body-root silhouette and contact |
| limbs | `core-arms`, `core-legs` | two-sided animator-compatible entries |
| clothing | `core-mantle`, `core-collar`, `core-waymark` | authored coat language |
| prop | `core-lantern` | near-hand prop with stable socket |

Minimum: 16 feature ids, six non-empty coverage groups and at least 18 visible authored planes per character. The exact plane count may be greater because bilateral parts use two planes.

## Golden set

Freeze 50 deterministic recipe inputs in `fixtures/golden/mosslight-core-2d-recipes.json`.

Required distribution:

- exactly 50 unique recipe fingerprints;
- all recipes satisfy the pack constraints;
- at least three species values and all supported bases that the pack exposes;
- rebuilding the fixture produces identical recipe and visual fingerprints in order;
- comparison report covers Original, Mosslight decorator and Mosslight Core for the same 50 seed slots.

## Gates

| ID | Gate | Pass evidence | Status |
| --- | --- | --- | --- |
| M3-A1 | Independent build route | Core module has no upstream renderer/layout/part-definition imports; `buildContentCharacter` dispatches by renderer id | PASS |
| M3-A2 | No upstream visible parts | runtime audit reports `upstreamVisiblePartPlanes = 0` and `authoredRatio = 1` for every Core actor | PASS |
| M3-A3 | Own media grammar | one authored `mosslight-gouache` grammar implements fill, edge, texture and glow primitives | PASS |
| M3-A4 | Core coverage | 16 feature ids, six coverage groups, 18+ authored planes | PASS |
| M3-A5 | Determinism | same Recipe + Pack rebuilds identical recipe, renderer and visual fingerprints | PASS |
| M3-A6 | Golden set | 50 frozen recipes and machine verifier pass | PASS |
| M3-A7 | Three-way review | Original / decorator / Core comparison uses the same 50 seed slots and records measurable differences | PASS |
| M3-A8 | Factory | Core can generate, inspect, export JSON/PNG/spritesheet/ZIP and report independent metrics | PASS |
| M3-A9 | Runtime scene | Core can animate in all three scenario modes, import its Manifest, reject tamper and recover seed state | PASS |
| M3-A10 | Regression | Original and decorator fingerprints/behavior remain compatible with M2 fixtures | PASS |
| M3-A11 | Responsive/accessibility | desktop, 390px, keyboard and reduced-motion checks pass | PASS |
| M3-A12 | Fallback | WebGL-off retains recipes, roster, coverage, fingerprints, Manifest and exportable JSON | PASS |
| M3-A13 | Budget | representative 8-actor scene meets the approved M3 budget below | PASS |
| M3-A14 | Provenance | Pack and renderer say procedural authored 2D; no AI/image-to-3D claim | PASS |

## M3 runtime budget

Approved research-device budgets for this milestone:

| Metric | Budget |
| --- | --- |
| Factory batch | 12 actors built in <= 2500 ms after cold module load |
| Scenario rebuild | 8 actors built in <= 1800 ms; warm median <= 900 ms |
| Visible planes | <= 28 per actor |
| Draw calls | <= 260 for 8 actors in the busiest scenario |
| Canvas texture frames | <= 3 resting frames per plane at factory quality; <= 2 in scene quality |
| Pixel ratio | capped at 2 |
| Mobile layout | no horizontal overflow at 390 CSS px |

These are M3 research budgets, not a mobile release certification. M6 owns device-class release budgets.

## Review protocol

1. Contract and static independence audit.
2. Machine verification of pack, renderer, coverage and the 50-recipe set.
3. Browser comparison at real factory camera distance.
4. Browser test in roster, waystation and encounter scene modes.
5. Desktop, 390px, reduced-motion and WebGL-off checks.
6. Export bundle inspection, Manifest re-import, tamper rejection and seed recovery.
7. Record exact fingerprints, counts, build times and screenshots in this contract before changing Program status.

## Completion record

M3 closed `2026-08-24`; all 14 gates are `PASS`.

- Pack / Renderer: `mosslight-core-2d` pack `a96d877a`; renderer `32d9c2cf`; `baseRenderer = none`; `mosslight-gouache`; 17 feature ids / six exact coverage groups.
- Independence: source audit has four allowed imports and no upstream renderer/layout/part-definition import; browser audit reports 23 visible / 23 authored / 0 upstream planes per actor.
- Golden set: `scripts/verify-m3.mjs` passes 9/9; 50 recipes, 50 unique Recipe fingerprints, 50 unique Visual fingerprints, human/cat/dog and the truthful `biped` v0.1 boundary.
- Three-way review: Original 0/0, decorator 12/5 and Core 17/6 across the same 50 seed slots; see `analysis/m3-three-way-review.md` and `.json`.
- Factory: 12/12 unique, final build sample 390ms; deterministic; 390px no overflow. ZIP 344,017 bytes with valid CRC for Manifest 92,663, spritesheet 247,850 and Content Pack 3,164 bytes.
- Runtime: 8 actors / 184 authored / 0 upstream planes; waystation, encounter and council all pass; final build sample 354ms; 186–187 draw calls after FrontSide optimization.
- Portability: valid Manifest imports; tampered Visual fingerprint is rejected at `assets[0].visual.fingerprint`; scene remains intact; Seed restore returns the same eight fingerprints.
- Accessibility/fallback: keyboard Canvas selection and Enter action pass with visible focus; reduced-motion loads paused; 390px factory and scene have no horizontal overflow; WebGL-off retains 12 factory assets, 8 scenario assets/roster, coverage, fingerprints, deterministic Manifest and JSON export.
- Regression: M2 verifier remains 0 failures; Original `7d63c5ae` / first `9b8ee20e`; decorator `a79de443` / renderer `091c354d` / first Recipe `e4bdc857` / first Visual `722d4014`.
- Provenance: local authored procedural Canvas 2D; no runtime LLM/cloud generation, imported AI bitmap or image-to-3D claim.
- Browser evidence: `evidence/m3-core-factory-desktop.png`, `m3-core-factory-mobile.png`, `m3-core-scene-desktop.png`, `m3-core-scene-mobile.png`.

M4 may become `ACTIVE`.
