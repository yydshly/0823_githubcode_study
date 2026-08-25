# M6 · Quality & Release delivery contract

Status: `DONE`  
Program: `Deterministic Game Asset Platform v1`  
Target: `releases/kindergrimm-2d-v1/`  
Contract date: `2026-08-24`

## Outcome

Turn the proven M2–M5 system into one auditable v1 research release whose claims, contracts, visual identity, production workflow, runtime SDK, budgets, provenance and browser evidence agree.

M6 packages evidence and automates release gates. It does not publish externally, add new visual features, start the optional AI adapter or begin the separate 3D program.

## Release architecture

| Layer | Release responsibility |
| --- | --- |
| Release manifest | version, scope, Pack/Renderer/SDK identities, exact files, gates and provenance |
| Automated matrix | run M2 contracts, M3 independent renderer and M5 SDK verification as one command |
| Artifact inventory | fingerprint and byte-size every release-owned JSON/report file |
| Browser matrix | reference current desktop/mobile/keyboard/motion/fallback evidence for Studio and Runtime |
| Claim audit | distinguish upstream capabilities, authored extensions, verified constraints and future work |
| Handoff | document how to run, verify, author, review, release and consume the 2D pack |

## Coverage manifest

| ID | Requirement | Evidence | Status | Next action |
| --- | --- | --- | --- | --- |
| M6-C1 | Versioned platform release schema and pure validator | schema + Node verifier | PASS | terminal evidence recorded |
| M6-C2 | Release manifest locks Pack, Renderer, SDK and upstream commit | manifest fingerprint | PASS | terminal evidence recorded |
| M6-C3 | One command runs M2/M3/M5 verification | automated matrix JSON | PASS | terminal evidence recorded |
| M6-C4 | G0–G7 all carry direct evidence | release gates | PASS | terminal evidence recorded |
| M6-C5 | Artifact inventory detects missing/tampered files | file bytes + fingerprints | PASS | terminal evidence recorded |
| M6-C6 | Provenance and license boundaries are explicit | provenance report | PASS | terminal evidence recorded |
| M6-C7 | Desktop/390/keyboard/motion/WebGL-off matrix is current | browser evidence index | PASS | terminal evidence recorded |
| M6-C8 | Production Studio and Runtime SDK handoff is executable | release README | PASS | terminal evidence recorded |
| M6-C9 | Program, project README and research station agree | three-surface audit | PASS | terminal evidence recorded |
| M6-C10 | Full current-browser smoke and release verifier pass | command + browser output | PASS | terminal evidence recorded |

## Release gates

- G0 Goal: bounded 2D-first platform goal and exclusions.
- G1 Contract: seven versioned schemas and stable accept/reject behavior.
- G2 Asset: Core 2D is 23/23 authored, 0 upstream visible planes.
- G3 Visual: 50 unique Recipe + 50 unique Visual Golden records.
- G4 Portability: Manifest, RC JSON, stored ZIP and CRC evidence.
- G5 Runtime: one SDK reconstructs identical identities in three modes.
- G6 Budget: Studio, Runtime, responsive, keyboard, motion and fallback budgets.
- G7 Release: inventory, provenance, license, documentation and manifest fingerprint.

## Completion rule

M6 is `DONE`: all 10 coverage rows pass. The v1 Research Release is reproducible with the release builder and independently auditable with the release verifier. AI and 3D remain excluded decision-gated programs.

## Completion evidence

- Platform Release contract: `kindergrimm-platform-release/1.0`; seventh schema; pure validator and G0–G7 exact gate set.
- Release artifact: `releases/kindergrimm-2d-v1/`, version `1.0.0`, fingerprint `df8ac08c`.
- Inventory: 7 files with recomputed bytes and fingerprints; verifier rejects manifest inventory tampering through top-level fingerprint mismatch.
- Automated suites: M2 contracts (7 schemas / 4 fixtures / 0 failures), M3 independent 2D (9/9), M5 Runtime SDK (9/9).
- Release verifier: 8/8 checks, 0 failures, 7 artifacts, 6 browser evidence files, 8 gates.
- Locked identity: Pack `a96d877a`, Renderer `32d9c2cf`, Runtime SDK `0.1.0`, upstream commit `de339ad739d8cbd28ff2dd4a940af38c0ede86c8`.
- Provenance: upstream Unlicense boundary, authored paths, 0 runtime LLM calls, 0 cloud API calls; AI and 3D explicitly excluded.
- Browser matrix: Studio and Runtime desktop/390/WebGL-off evidence, plus keyboard and reduced-motion assertions.
- Handoff: release README gives exact server, Studio, scenario and verifier journey.
- Command: `node projects/kindergrimm/scripts/verify-release.mjs`.