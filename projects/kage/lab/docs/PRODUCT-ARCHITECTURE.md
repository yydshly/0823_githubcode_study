# Goal-driven Three.js generation architecture

Status: accepted direction, implementation in progress  
Updated: 2026-08-24

## Product objective

The product turns a user's intended idea into an excellent, runnable and revisable Three.js web presentation. Final-effect fidelity—not use of basic geometry, a particular demo or a single model—is the optimization target.

```text
idea and desired feeling
  -> effect analysis
  -> asset and capability planning
  -> bounded generation
  -> Three.js + semantic DOM construction
  -> browser evaluation
  -> targeted revision
  -> publishable experience
```

The product is not a gallery of demos, a prompt-to-template selector, a single-file code generator, or a promise that Three.js can manufacture every missing asset. Existing demos are evidence, regression fixtures and reusable primitives only.

Three.js owns spatial composition, camera, light, material, motion and interaction. Semantic DOM owns readable content, controls, accessibility and fallback. OpenDesign can own the general agent workspace, provider selection, file history, comments and export; this project owns the 3D-specific reasoning, intermediate representations, runtime contracts and quality gates.

## User outcome loop

A successful user journey has one continuous loop:

1. The user describes the subject, audience, desired feeling and intended action in ordinary language.
2. The system explains what visual effect would communicate that goal and proposes materially different directions.
3. For each direction, the system distinguishes procedural rendering, generated media, user-supplied assets and real 3D asset requirements.
4. The user selects a direction based on visible intent, asset cost and feasibility—not a demo name.
5. Models and deterministic tools produce the required assets, plugins, manifest and DOM content in a bounded workspace.
6. The browser shows the real result and evaluates goal alignment, composition, motion, performance, accessibility and asset honesty.
7. A follow-up instruction changes only the affected decisions or artifacts when possible.
8. A result crosses publishing gates only after its code, assets and runtime evidence are complete.

The primary product proof is therefore not “the model returned JSON” or “the page rendered.” It is:

```text
one description -> a new coherent experience -> one revision -> a visible, local and explainable change
```

## Architectural principles

- Goal before technique: effect decisions must cite the intended perception or action.
- Analysis before generation: no model writes runtime code before an effect and asset plan exists.
- Assets are first-class: every non-procedural visual has origin, license, maturity, payload and fallback state.
- Stable IR, variable form: runtimes consume validated artifacts; section count, world form, camera language and interaction are not fixed.
- Bounded synthesis: models can extend approved files and imports but cannot bypass validation, execution isolation or registration review.
- Creativity through composition: primitives, generators and plugins form a vocabulary, not a catalog of finished pages.
- Evidence-based promotion: build, browser, visual and performance evidence are separate gates.
- Honest degradation: missing L3/L4 assets, WebGL failure, reduced motion and weak devices produce explicit alternatives rather than fake fidelity.
- Local revision: a color instruction should not regenerate topology; an asset replacement should not rewrite the director; a camera change should not alter copy.
- General shell, specialist engine: do not duplicate OpenDesign’s generic chat/workspace features inside the 3D engine.

## System shape

The architecture separates a control plane from the runtime/data plane.

```text
CONTROL PLANE

CreativeBrief
  -> IntentAnalysis
  -> EffectSpec[]
  -> AssetPlan + runtime CapabilityPlan
  -> ProductionCapabilityProfile
  -> ProductionPlan
  -> DirectionDecision
  -> BuildPlan
  -> Model / Tool Router
  -> Isolated Generation Workspace
  -> EvaluationReport
  -> RevisionPlan

DATA / RUNTIME PLANE

Generated assets + Scene/Effect/Driver plugins + ExperienceManifest
  -> validators and registries
  -> semantic DOM + ExperienceRuntime
  -> deterministic browser snapshot
  -> website / recording / export
```

The control plane may use Codex, MiniMax, image, audio, video or 3D-generation services. It routes only to adapters actually integrated in the current `ProductionCapabilityProfile`; model shortcomings become explicit adaptations or blockers. The runtime plane does not know which model created an artifact and never executes unreviewed model output.

## Core intermediate representations

| Artifact | Question it answers | Stable boundary |
| --- | --- | --- |
| `CreativeBrief` | What does the user want? | raw request, constraints and seed |
| `IntentAnalysis` | What outcome, audience and evidence were understood? | claims with source and confidence |
| `EffectSpec` | What should the visitor perceive, and how should DOM/WebGL create it? | signature moment, layers, motion, camera, interaction, asset requirements |
| `AssetPlan` | Which materials exist, must be generated, sourced, supplied or blocked? | route, provider capability, L0-L5 state, license, budget and fallback |
| `CapabilityPlan` | Can the current runtime express and afford the direction? | selected capabilities, missing capabilities, device budget and degradation |
| `ProductionCapabilityProfile` | What can the selected, configured system actually produce and evaluate now? | capability availability, concrete adapter and missing reason |
| `ProductionPlan` | How will this direction be built with current capabilities? | ready/planned/adapted/blocked tasks, dependencies, effect impact and next action |
| `BuildPlan` | Which bounded tasks and files will produce the result? | dependencies, allowed files/imports, checks and execution policy |
| `ExperienceManifest` | How does the validated experience play? | graph, DOM content, tracks, scene definitions and accessibility |
| `EvaluationReport` | What is proven, failed or still requires visual judgment? | evidence source, pass/warn/fail/manual-required checks and blocking defects |
| `RevisionPlan` | What should change without unnecessary regeneration? | affected artifacts, preserved decisions and expected visible difference |

`ExperienceManifest` remains the runtime contract. It must not absorb creative reasoning, provider prompts, asset-production state or evaluation history.

## Effect analysis

An `EffectSpec` is not a scene preset. It describes a communication strategy:

- intended outcome and primary visitor action;
- creative thesis and signature memory point;
- spatial metaphor and visual grammar;
- DOM, background, world, foreground and post-process layers;
- camera strategy, motion language and interaction drivers;
- reduced-motion behavior and device constraints;
- abstract asset requirements with fidelity and fallback expectations;
- reasoning and provenance for every major choice.

Candidate diversity is measured across metaphor, layer composition, camera language, interaction and asset strategy—not palette alone. Candidate count is variable; the system may return one strong feasible direction, several alternatives, or a blocked direction that explains a missing asset.

## Model and tool routing

No single model is treated as a universal generator.

| Work | Preferred capability | Output gate |
| --- | --- | --- |
| intent, art direction, architecture and code | Codex or MiniMax language/code model | schema, type, contract and diff review |
| hero imagery, backgrounds, masks and textures | image generation | resolution, seams, alpha, style, rights and payload |
| true rotatable or separable objects | 3D generation/sourcing/modeling pipeline | GLB load, scale, materials, parts, L0-L5 quality and license |
| characters | avatar/VRM/Live2D pipeline | rig, expression, motion, gaze, voice-sync readiness |
| rooms and real places | GLB environment, 3DGS or capture pipeline | format, navigation, privacy, payload and fallback |
| music, ambience and narration | audio generation | duration, loudness, rights, synchronization and user control |
| motion media | video generation or browser recording | codec, dimensions, duration, captions and fallback poster |
| validation | deterministic tools plus visual evaluator | reproducible logs and browser evidence |

A missing provider never silently downgrades a required true 3D asset to decorative geometry. The chosen fallback must be allowed by `EffectSpec`, visible in `ProductionPlan` and acceptable for the target use.

The current truthful provider profiles and adaptation rules are maintained in [Model capability adaptation](MODEL-CAPABILITY-ADAPTATION.md).

## Asset lifecycle

Every asset uses the existing maturity language:

```text
L0 Missing
L1 Placeholder
L2 Inspectable
L3 Presentable
L4 Cinematic
L5 Production
```

An asset requirement begins at L0 until a real candidate exists. Generation success does not automatically increase maturity. Inspection, licensing and runtime evidence promote it. The `AssetPlan` also records payload tier, generator/source, prompt or source provenance, fallback and publishability.

Procedural shaders and geometry are runtime capabilities rather than imaginary asset files. They still require quality, performance and reduced-motion evaluation.

## Extension model

The system grows through registries with explicit descriptors:

- `ModelProvider`: structured reasoning and code generation adapters;
- `AssetGenerator`: image, texture, 3D, avatar, environment, audio and video producers;
- `EffectPrimitive`: reusable shader, geometry, particle, lighting, post-process or compositing behavior;
- `ScenePlugin` / `EffectPlugin`: authored spatial worlds and effect implementations;
- `Driver`: scroll, pointer, timeline, choice, audio, device motion or physics input;
- `Evaluator`: schema, code, visual, accessibility, performance, asset or narrative checks;
- `Exporter`: website, embed, recording, image, video or deployment package;
- `PatternRouter`: product page, viewer, film, portfolio, configurator, avatar or real-scene route.

New entries publish capabilities and constraints to a catalog. Core orchestration must not grow a switch statement for every aesthetic or model.

## Architecture decision

Four implementation strategies were evaluated from 1 (poor) to 5 (strong):

| Strategy | Goal fidelity | Creative breadth | Reliability | Asset honesty | Maintainability | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| fixed page/demo templates | 2 | 1 | 5 | 3 | 3 | reject as product model; retain as fixtures |
| model writes a whole project directly | 3 | 5 | 1 | 1 | 1 | reject as default; unsafe and hard to revise |
| general OpenDesign agent without 3D IR | 3 | 4 | 3 | 2 | 3 | use as host, not specialist engine |
| goal analysis + stable IR + bounded synthesis | 5 | 4 | 4 | 5 | 5 | selected |

The selected approach deliberately accepts more planning work before first render. It pays that cost back through explainability, local revisions, model portability, asset integrity and production gates.

## Quality and success measures

Evaluation is multidimensional; no single aesthetic score can approve a result.

Product metrics:

- a user can identify how the final result reflects the stated subject, mood, audience and action;
- materially different candidates differ in at least three of metaphor, composition, camera, interaction and asset strategy;
- a follow-up instruction produces an expected visible delta and records what was preserved;
- every non-procedural asset has source, maturity, license/publishability and payload state;
- no unreviewed generated code reaches the runtime registry;
- a balanced request can reach first real preview without requiring Three.js knowledge.

Mechanical gates:

- schema and reference validation;
- TypeScript build and isolated contract tests;
- import, network, filesystem and execution policies;
- deterministic manifest/runtime snapshot;
- nonblank browser render and console health;
- semantic DOM, keyboard path and reduced-motion behavior;
- 390px layout and low-quality fallback;
- frame-time, draw-call, JavaScript and asset budgets;
- screenshot-based composition, contrast, occlusion and visual-goal review;
- publishing-specific asset, codec, caption and rights checks.

Passing a build proves executability, not visual quality. Passing a visual review proves presentation at one state, not performance, licensing or maintainability.

## Delivery map

Delivery proceeds through evidence gates rather than a fixed number of chapters. A gate may be revisited whenever a new model, asset type or product route is added.

### Foundation gate

- accept this architecture and reframe existing demos as fixtures;
- introduce validated `EffectSpec` and `AssetPlan` contracts;
- attach both artifacts to every generated candidate;
- keep current runtime behavior unchanged as a compatibility baseline.

Exit: one existing brief produces inspectable effect and asset plans with no false asset claims.

### Analysis gate

- change Codex/MiniMax output from fixed structures/plugin names to goal-driven effect specifications;
- allow variable candidate count and route type;
- measure candidate diversity and feasibility before compilation;
- expose effect reasoning and asset cost in the workbench.

Exit: candidates are selected by intended experience, not demo identity.

### Asset-production gate

- add provider-independent image/texture/audio generation adapters first;
- persist every generation with provenance and maturity state;
- add true 3D/character/environment routes only with their quality gates;
- make missing assets and fallbacks visible before build.

Exit: at least one direction uses newly generated, inspected media rather than only existing procedural scenes.

### Bounded-construction gate

- compile feasible specs into `BuildPlan` tasks;
- materialize an isolated workspace;
- let Codex/MiniMax edit only allowed files/imports;
- typecheck and run contract tests before any browser load;
- compare diffs and require promotion before registration.

Exit: one previously unavailable visual direction becomes a real reviewed plugin.

### Evaluation-and-revision gate

- capture browser states and deterministic metrics;
- compare screenshots against `EffectSpec` goals;
- produce an `EvaluationReport` with blocking issues;
- convert follow-up language into a local `RevisionPlan`;
- prove a revision changes only intended layers.

Exit: description -> real preview -> natural-language revision is repeatable.

### Host-and-publishing gate

- expose the engine as an OpenDesign skill/service rather than duplicating its generic workspace;
- add versioned project persistence, export and deployment boundaries;
- validate mobile, accessibility, assets, recording and publishing packages per route.

Exit: a generated experience can be resumed, reviewed and published with its evidence intact.

## Current system judgment

Reusable evidence already exists in the manifest graph, track directors, plugin lifecycle, capability budgets, provider adapters, deterministic tests and browser previews. These form the runtime foundation.

The production-capability baseline now also exists:

- each run records the capabilities actually integrated for its provider and model;
- each candidate has a dependency-aware production plan with honest generation, adaptation and blocking decisions;
- the workbench exposes those decisions before the user enters the runtime preview.

The main remaining architectural debt is concentrated in four places:

- `CreativeDirection` is no longer a model output contract, but the compatibility compiler still maps open-ended EffectSpecs to fixed `focus / journey / branching` structures and two verified plugin IDs;
- `ManifestCompiler` writes generic chapter copy and preset camera/state formulas rather than consuming a goal-driven effect analysis;
- MiniMax image generation and the ChatGPT-produced flagship asset pair exist, but general image production still depends on configured provider credentials;
- controlled browser runtime evidence is attached, but screenshot composition/material judgment still requires the development-time Codex/ChatGPT session, a human, or a future visual evaluator; the offline revision vocabulary is deliberately bounded rather than falsely open-ended.

Migration therefore starts before the manifest compiler. The old compiler remains a compatibility adapter until the new analysis, asset and construction gates have equivalent test evidence.

## Immediate implementation slice

The first increment implemented and validated `EffectSpec v1` and `AssetPlan v1`, compiled the current directions into those artifacts, and attached them to every `CreativeCandidate`.

The second increment implements `ProductionCapabilityProfile v1` and `ProductionPlan v1`. Codex/MiniMax are currently credited only with creative analysis and code synthesis; media and vision abilities remain unavailable until concrete adapters are connected. The planner now records direct generation, procedural or semantic adaptation, manual review, and hard blocking without false asset claims.

The third increment removes fixed structures and scene plugins from the remote model contract. Codex/MiniMax now produce two to four complete EffectSpec drafts, provenance is injected by the server, pairwise diversity is enforced across meaningful design dimensions, and only the later preview compiler maps each spec to today's registered runtime. A live Codex `gpt-5.4` call produced three validated, asset-aware directions; evidence is recorded in [Phase 6](PHASE6-DIRECT-EFFECTSPEC.md).

The fourth increment persists and caches model analyses, connects the MiniMax `image-01` generator behind profile/provenance/quality gates, and integrates produced assets into the flagship scene route. The development-time ChatGPT session also produced the current aligned color/depth flagship pair with recorded provenance.

The fifth increment implements `EvaluationReport v1` and `RevisionPlan v1`. Without a vision API it automatically checks cross-artifact identity, semantic boundaries, scene binding, asset/production readiness, capability and payload budgets. Runtime, composition, signature-moment and material checks remain explicitly `manual-required`; no aesthetic score is invented. The workbench exposes both artifacts and keeps the real preview reachable.

The sixth increment attaches `RuntimeEvidenceBundle v1` from controlled desktop WebGL, mobile WebGL and mobile fallback previews. It also compiles a small no-API natural-language revision vocabulary into exact Manifest patches, creates a new candidate identity, records preserved hashes, rejects ambiguous instructions and proves the visible accent delta in the real preview.

The seventh increment returns the visible product to creative webpage construction. The workbench now leads with one live same-origin stage and three materially different complete worlds. `tidal-archive` adds a second generated color/depth asset route with a distinct narrative environment, scene plugin and presentation system; engineering evidence remains available but secondary.

The next increment is not another review feature. It is a Codex/MiniMax creative construction planner that turns an idea into a variable page composition, asset route, scene implementation and Manifest, then materializes the result into the same live stage. The existing validators, isolated synthesis and evidence contracts remain internal promotion gates rather than the user-facing product.
