# Offline evaluation and revision loop

## Design contract

- Entry mode: revision-led implementation.
- Request revision: R10 — automatically attach same-origin runtime evidence and execute one no-API bounded natural-language revision without claiming visual judgment.
- Target user: a creator describes an intended experience and needs to know what is proven, what still needs visual judgment, and what should change next.
- Desired first impression: the workbench reports evidence and uncertainty instead of showing an invented aesthetic score.
- Visual ambition: Functional/Editorial control surface for an Immersive result.
- Experience architecture: Hybrid Workspace. Direction selection, evidence and revision planning live in semantic DOM; the Three.js page remains the visual inspection surface.
- Primary journey: select direction → collect controlled desktop/mobile/fallback runtime evidence → inspect `EvaluationReport` → enter one bounded revision instruction → inspect preserved decisions and manifest delta → open the revised real preview for visual checks.
- Visual constraints: evidence controls remain subordinate to the selected direction and do not turn the workbench into a debug dashboard.
- Information constraints: runtime proof, requested change, actual delta and remaining visual judgment stay separately labeled.
- Operation constraints: evidence capture is explicit and cancellable; generated preview remains reachable before and after revision.
- State constraints: idle, collecting, ready, failed and revision states are distinguishable; cancellation and candidate changes abort or invalidate prior evidence.
- Environment constraints: same-origin local Vite runtime; no provider API, screenshot-vision API, backend or publishing mutation.
- Autonomy authorization: repeated explicit “继续”; reversible implementation is authorized.
- User-decision boundary: external vision/image APIs, paid services, publishing approval and subjective brand decisions.

- Observable completion criteria: desktop WebGL, mobile WebGL and semantic fallback evidence are attached; one supported natural-language instruction changes only the intended Manifest layer; unsupported instructions remain reviewable instead of being guessed.
- Required artifacts: `RuntimeEvidenceBundle v1`, bounded revision result/diff, revised EvaluationReport, desktop/mobile browser evidence and full regression results.
## Selected WebGL route

- Pattern: asset production and quality gate → DOM + WebGL immersive product case.
- Evidence branch: EffectSpec, AssetPlan, ProductionPlan, CapabilityPlan, ExperienceManifest, runtime snapshots and retained browser screenshots.
- Expected output: deterministic evidence plus explicitly unresolved visual observations; no fake vision result.
- Skill update: none until runtime evidence proves the contract reusable.

## Evaluation boundary

The first offline evaluator can prove:

- schema and cross-artifact identity;
- semantic DOM and WebGL responsibility separation;
- required asset presence, maturity, source, payload and publication state;
- production blockers and declared adaptations;
- runtime capability fit, quality budget and fallback declarations;
- whether actual browser/runtime evidence was attached.

It cannot prove from source alone:

- focal hierarchy, composition quality or occlusion;
- whether the signature moment is visually memorable;
- material credibility, taste or brand fit;
- screenshot-to-brief similarity.

These remain `manual-required` until a human or the development-time ChatGPT/Codex session inspects real screenshots. They never receive an invented numeric aesthetic score.

## Artifacts

```text
EvaluationReport v1
  -> checks: pass | warn | fail | manual-required
  -> evidence source and confidence
  -> blocking defects and unresolved visual checks
  -> status: pass | needs-review | revision-required | blocked

RevisionPlan v1
  -> preserved decisions
  -> bounded revisions by artifact/layer
  -> expected visible difference
  -> regeneration scope: none | partial | full
  -> next evidence required
```

## Coverage record

| Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| Contracts reject contradictory reports | unit | `tests/evaluation.test.ts` + Zod refinements | 0/9 | pass | keep in regression |
| Offline evaluator separates proof from judgment | unit | deterministic fixture; `visionUsed=false` | 6 | pass | keep in regression |
| Revision plan preserves unaffected decisions | unit | blocked and review-required fixtures | 6 | pass | keep in regression |
| Workbench exposes report and plan | desktop selected candidate | `e2e/offline-evaluation.spec.ts` | 4–6 | pass | none |
| No-API state remains honest | desktop/mobile | disabled media action + active offline review | 6–7 | pass | none |
| Same-origin runtime evidence | desktop/mobile/fallback | `RuntimeEvidenceBundle v1`; three controlled `__signalLab.snapshot()` samples | 5–8 | pass | add screenshot observations only with a real visual evaluator |
| Evidence state remains usable | idle/collecting/ready/error | browser collection, cancellation and candidate invalidation assertions | 4–7 | pass | keep in regression |
| Bounded natural-language revision | selected candidate | accent revision + manifest delta + preserved hashes + revised preview assertion | 5–6 | pass | expand vocabulary through a model planner behind the same gates |
| Unsupported revision stays honest | selected candidate | no mutation + reviewable explanation at 390px | 6 | pass | keep ambiguity rejection |
| Preview remains reachable after review/revision | desktop/mobile | original preview, revised CSS accent and mobile layout assertions | 5/7 | pass | keep in regression |
| Build/unit/browser regression | engineering | build pass; 45/45 unit; 30/30 browser | 9 | pass | keep in regression |

## Environment

- Canonical command: `npm.cmd run dev -- --host 127.0.0.1 --port 8143`
- Workbench: `http://127.0.0.1:8143/workbench.html`
- Flagship preview: `http://127.0.0.1:8143/`

## Implemented no-API boundary

`RuntimeEvidenceBundle v1` samples the selected candidate at controlled desktop WebGL, mobile WebGL and mobile semantic-fallback configurations. Each sample records lifecycle, quality, frame/draw-call state, active scene plugin, semantic node/navigation counts and horizontal overflow. Collection is same-origin, explicit and cancellable. It does not claim screenshot understanding: `screenshotVisionUsed=false` remains part of the artifact.

The local revision compiler intentionally supports a small, auditable grammar:

- accent color, for example `强调色改为 #8fdcff`;
- page title, for example `页面标题改为「声之境」`;
- slower motion pacing, for example `节奏更慢`.

A supported instruction produces a new candidate identity, exact changed paths and hash proofs for preserved goal, semantic content, assets, camera and scene plugin. Ambiguous or unsupported language returns a reviewable explanation and does not mutate the candidate. This is the offline safety floor for a later Codex/MiniMax revision planner, not the final creative vocabulary.

Browser evidence: `docs/screenshots/phase10-runtime-revision-mobile.png`.
- Supported theme boundary: dark workbench and dark flagship only.
- Required viewport evidence: 1440×900 and 390×844.

