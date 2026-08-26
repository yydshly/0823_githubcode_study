# Model capability adaptation

Status: implemented baseline  
Updated: 2026-08-24

## Purpose

The system is driven by the intended final effect, but it must never assume that one selected model can analyze an idea, write code, generate every media type and judge visual quality. Before construction, the project records the capabilities that are actually integrated and turns every effect and asset requirement into an explicit production decision.

```text
EffectSpec + AssetPlan
  -> ProductionCapabilityProfile
  -> ProductionPlan
       ├─ ready: use an existing verified runtime or asset
       ├─ planned: call an integrated generator
       ├─ adapted: use an allowed substitute and record its effect impact
       └─ blocked: preserve the requirement until a real capability exists
```

This is adaptation around the goal, not automatic quality reduction. A fallback is valid only when the `EffectSpec` declares it acceptable. A required rotatable GLB, separable product model, rigged character or real environment remains blocked when the corresponding pipeline is absent.

## Current truthful capability profiles

| Provider | Integrated now | Not claimed |
| --- | --- | --- |
| local | deterministic analysis, registered Three.js runtime, controlled runtime evidence, bounded local revision and browser preview | creative/code generation, media generation and visual judgment |
| Codex | creative analysis, code synthesis, registered Three.js runtime, controlled runtime evidence, bounded local revision and browser preview | image, texture, 3D, avatar, environment, audio, video and visual judgment |
| MiniMax | creative analysis, code synthesis, registered Three.js runtime, controlled runtime evidence, bounded local revision, browser preview and `image-01` image/texture production when configured | 3D, avatar, environment, audio, video and visual judgment |
| OpenAI-compatible | creative analysis, code synthesis, registered Three.js runtime, controlled runtime evidence, bounded local revision and browser preview | media generation and visual judgment until concrete adapters are configured |

Availability means an adapter exists in this project, not that a provider might offer a related product elsewhere. Provider credentials and service availability are reported separately.

## Production decisions

For every asset requirement the planner follows this order:

1. Reuse a candidate only after it meets its maturity, source and runtime gates.
2. Generate with an explicitly integrated adapter when its modality matches the requirement.
3. Adapt only through the fallback declared by the effect analysis:
   - `procedural`: Codex/MiniMax may synthesize a Three.js effect when code synthesis is available;
   - `image-plane`: a generated image may replace a 3D layer only when image generation is integrated;
   - `dom-only`: preserve meaning and accessibility while reducing spatial expression;
   - `omit`: remove only a non-required layer.
4. Block when fidelity or interaction would be falsely represented by a substitute.

Visual evaluation follows the same rule. The offline evaluator now reports deterministic facts and whether browser evidence exists. Until a vision evaluator or a human attaches explicit observations, composition, signature-moment and material checks remain `manual-required`. It does not label an executable page as aesthetically approved.

## Implemented contracts

- `ProductionCapabilityProfile v1` records capability ID, availability, concrete adapter and missing reason.
- `RuntimeEvidenceBundle v1` records controlled same-origin desktop/mobile/fallback runtime samples with `screenshotVisionUsed=false`.
- `LocalRevisionResult v1` records requested language, supported operations, exact changed paths, preserved hashes and the revised candidate identity; unsupported language does not mutate state.
- `ProductionPlan v1` records provider/model, strategy, dependency-aware tasks, adaptations, missing capabilities, metrics and the next action.
- Every `CreativeRun` carries the profile used for that run.
- Every `CreativeCandidate` carries its production plan alongside `EffectSpec`, `AssetPlan`, `CapabilityPlan` and `ExperienceManifest`.
- The provider status API publishes the integrated capability IDs.
- The workbench exposes the plan and makes adapted/blocked status visible before preview.
- `EvaluationReport v1` records deterministic checks, evidence sources, blocking IDs and unresolved manual visual checks with `visionUsed=false`.
- `RevisionPlan v1` records preserved decisions, source check IDs, target artifact/layer, expected visible difference and regeneration scope.

## Adapter contract direction

The next media adapter should not return a bare URL. A future `AssetGenerator` result must include at least:

- requirement and generation IDs;
- provider, model and version;
- input provenance and reproducibility data where the service permits it;
- file URI, MIME type, dimensions/duration/topology as applicable;
- license and publishability state;
- payload size and maturity level;
- automated inspection evidence and failure details.

Image/texture production now exists through the bounded MiniMax adapter, and the flagship proves an aligned color/depth asset route. Controlled browser runtime evidence is attached without claiming screenshot vision. The next increment is an optional screenshot-based evaluator and a Codex/MiniMax planner that targets the existing bounded revision contract. True GLB, avatar, environment, audio and video routes remain independent integrations with modality-specific gates.

## Acceptance evidence

The current baseline is accepted only when:

- a normal local direction exposes an adapted production plan because visual evaluation is still manual;
- an explicit true-GLB request reports `model-3d-generation` as missing and remains blocked;
- adding an image-generation capability changes an eligible image task from fallback/blocking to a planned generator task;
- provider status, unit contracts, TypeScript build and browser behavior agree on the same capability claims.

This document describes the current implementation boundary. It must be updated whenever an adapter is actually connected or removed.
