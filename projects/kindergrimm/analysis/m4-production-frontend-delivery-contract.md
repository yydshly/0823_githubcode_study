# M4 · Production Frontend delivery contract

Status: `DONE`  
Program: `Deterministic Game Asset Platform v1`  
Target surface: `production-studio/`  
Contract date: `2026-08-24`

## Outcome

Upgrade the current proof-oriented NPC Factory into a local production workspace that carries one Content Pack candidate through:

```text
Author intent
  -> deterministic draft
  -> Original / Decorator / Core comparison
  -> review decision and notes
  -> gate audit
  -> release candidate bundle
```

M4 does not add a backend, account system, AI provider, 3D renderer or external publishing. It coordinates the contracts and renderer proven in M2/M3 into a trustworthy browser-local production workflow.

## Design contract

- Entry mode: revision-led implementation.
- Target user and context: a small game-content team preparing a deterministic NPC Content Pack release candidate.
- Desired first impression: an intentional production console, not a demo gallery or a long debug form.
- Visual ambition: Immersive functional workspace.
- Experience architecture: Hybrid Workspace — persistent comparison stage plus structured authoring/review detail.
- Primary journey: create draft → compare routes → select candidate → review → resolve gate failures → build release candidate.
- Required states: empty/new, generated, selected, approved, rejected, dirty-after-review, gate-failed, release-ready, exported and restored.
- Required viewports: desktop 1440/900 and mobile 390; keyboard journey required.
- Enhancement boundary: WebGL previews are optional; contracts, review, gate audit and JSON release record remain operable without WebGL.
- Autonomy authorization: architecture-driven autonomous continuation is already authorized.
- User-decision boundary: final brand art direction, external release publication and remote collaboration require later authority.

## Product architecture

| Layer | M4 responsibility |
| --- | --- |
| Studio shell | production navigation, stage, status and recovery |
| Authoring model | high-level deterministic draft intent mapped to Pack + batch input |
| Compare model | same seed slot rendered as Original, Decorator and Core with explicit constraint differences |
| Review model | candidate selection, approve/reject, notes, dirty-state invalidation and local persistence |
| Gate runner | G1–G6 machine/runtime evidence summarized as pass/fail with stable reasons |
| Release candidate | versioned JSON record plus validated asset ZIP; no external publishing |

Business facts remain in contracts/runtime modules, not duplicated in view code.

## Coverage manifest

| ID | Requirement / state | Surface | Evidence | Owning stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| M4-C1 | New production route and focused workspace hierarchy | desktop default | browser screenshot + DOM | 1–3 | PASS | terminal evidence recorded |
| M4-C2 | Author seed, count, Pack and supported Core intent | authoring panel | interaction + deterministic rebuild | 4–6 | PASS | terminal evidence recorded |
| M4-C3 | Three-way same-slot comparison with constraint disclosure | comparison stage | visual + fingerprint evidence | 2–6 | PASS | terminal evidence recorded |
| M4-C4 | Select candidate and inspect Recipe/Visual/Pack provenance | inspector | keyboard and pointer evidence | 4–6 | PASS | terminal evidence recorded |
| M4-C5 | Approve/reject/notes and dirty-after-change invalidation | review panel | state transition evidence | 5–6 | PASS | terminal evidence recorded |
| M4-C6 | Persist and restore local session | recovery | reload evidence | 6 | PASS | terminal evidence recorded |
| M4-C7 | Run G1–G6 gate audit with actionable failures | gate panel | machine + browser evidence | 6,9 | PASS | terminal evidence recorded |
| M4-C8 | Build release candidate only when gates pass | release panel | ZIP/JSON/CRC inspection | 5,6,9 | PASS | terminal evidence recorded |
| M4-C9 | WebGL-off keeps authoring/review/gates/JSON operable | fallback | browser capability evidence | 8 | PASS | terminal evidence recorded |
| M4-C10 | Desktop/390 and keyboard remain usable | cross-surface | screenshots + focus journey | 7 | PASS | terminal evidence recorded |
| M4-C11 | Reduced-motion and performance budgets pass | runtime | browser measurements | 8 | PASS | terminal evidence recorded |
| M4-C12 | Factory/scenarios and M2/M3 fixtures regress cleanly | adjacent surfaces | commands + browser checks | 9 | PASS | terminal evidence recorded |
| M4-C13 | Program, README, research station and studio handoff agree | docs | file + browser evidence | 9 | PASS | terminal evidence recorded |

## Release candidate record

M4 must define a versioned, machine-readable release-candidate record that references rather than duplicates:

- Content Pack id/version/fingerprint;
- Renderer id/version/fingerprint;
- master seed and batch input;
- candidate asset fingerprints;
- review decision, notes and timestamp;
- gate results and measured budgets;
- bundle entries, sizes and CRC evidence;
- provenance and license;
- studio schema/version.

Changing authoring input after approval must invalidate the approval and release-ready state.

## M4 research budgets

| Metric | Budget |
| --- | --- |
| Initial usable workspace | <= 2000ms on the current research device |
| Three-route comparison refresh | <= 1800ms after modules are loaded |
| Release candidate build | <= 4000ms for 12 assets |
| Desktop overflow | none at 1440 and 900 CSS px |
| Mobile overflow | none at 390 CSS px |
| Keyboard journey | author → compare → review → gates → release without pointer |

## Completion rule

M4 is `DONE`: all 13 coverage rows passed current-browser verification. Any future change to Studio state, RC schema, Pack/Renderer fingerprints or packaging reopens the affected rows before release.

## Completion evidence

- Browser-local production journey: Author → three-route Compare → Approve/Reject → G1–G6 → Release Candidate.
- Deterministic default fingerprints: Original `9b8ee20e`, Decorator `e4bdc857` / `722d4014`, Core `6ff95817` / `8303165d`; Pack `a96d877a`; Renderer `32d9c2cf`.
- Core audit: 23/23 authored visible planes, 0 upstream, 17 feature ids across 6 groups.
- Gate runner: 6/6 PASS; Golden evidence contains 50 unique Recipe and 50 unique Visual fingerprints.
- RC browser sample: 12 assets, 4 stored-ZIP entries, 340,918 bytes, all CRC valid; build samples 456–542ms against 4,000ms budget.
- Tamper audit: changed Content Pack fingerprint rejected with `contract.constraint.mismatch` and `contract.fingerprint.mismatch`.
- State audit: changing Author input invalidates review, Gates and RC; local restore recovers the approved revision and requires RC ZIP rebuild.
- Cross-surface: 1440 desktop and 390 mobile pass; mobile `scrollWidth = innerWidth = 390`; keyboard focus uses a visible 3px outline and Enter completes the full journey.
- Capability fallback: WebGL-off retains three-route fingerprints, review, 6/6 Gates and Session JSON; preview/spritesheet/RC ZIP remain disabled.
- Reduced motion: media query recognized; transition and animation duration reduce to `1e-06s`.
- Regression: 6 schemas / 4 M2 fixtures / 0 failures; M3 verifier 9/9; Factory Original/Decorator/Core and 8-actor Core scenario pass current-browser checks.
- Evidence: `../evidence/m4-production-studio-desktop.png`, `../evidence/m4-production-studio-mobile.png`, `../evidence/m4-production-studio-webgl-off.png`.