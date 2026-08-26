# Phase 2 — Natural Language Generation Pipeline

## What is implemented

The lab now has a complete local generation loop:

```text
CreativeBrief
  -> BriefInterpreter
  -> IntentEvidence + 3 CreativeDirections
  -> ManifestCompiler
  -> ExperienceManifest v2 validator
  -> CapabilityPlanner
  -> compare/select workbench
  -> generated manifest store
  -> existing Three.js preview runtime
```

Open `workbench.html`, edit the brief, compare the three candidates, inspect the manifest, then open the selected result. The workbench does not load Three.js; the immersive runtime is loaded only after selection.

The provider layer now supports Codex CLI, MiniMax, an optional OpenAI API adapter, and `baseline-keyword-v1`. The deterministic local provider remains the initial no-cost state and the regression oracle.
Remote output is schema-validated and normalized before it reaches the compiler; provider, model, latency, and fallback provenance remain visible to the workbench.

## How the description drives change

| Brief signal | Intermediate decision | Generated artifact | Visible/runtime consequence |
| --- | --- | --- | --- |
| subject and audience | `IntentEvidence` | titles, copy, audience | page meaning and navigation labels change |
| calm, energetic, dream, archive, product | mood/visual tags | theme tokens and plugin selection | palette, rhythm and visual grammar change |
| candidate 1 | `focus` topology | one node with internal keyframes | continuous single-scene transformation |
| candidate 2 | `journey` topology | four or five linear nodes | staged reveal and scroll narrative |
| candidate 3 | `branching` topology | choice edges and rejoining flows | evidence/emotion routes become replayable paths |
| preview quality | planning context | `CapabilityPlan` | cost estimate, fit/degraded/fallback status |

Natural language therefore does not mutate arbitrary source files. It first becomes an inspectable intent model, then a validated manifest. The runtime consumes the manifest exactly like a hand-authored experience.

## Why this is not a fixed template generator

The three current candidates already vary topology, node count, tracks, scene plugin, pacing, copy, palette, and capability cost. The architecture allows further variation through independent extension points:

- `BriefInterpreter`: new model providers and creative reasoning strategies.
- `ManifestCompiler`: new topologies, layout grammars, track construction, and constraint policies.
- `ScenePlugin` / `EffectPlugin`: genuinely new visual worlds and shader/effect languages.
- Driver: pointer, audio, time, device motion, or hybrid progression.
- Capability catalog/planner: device budgets, compatibility, and fallback decisions.

A provider may propose a direction, but it cannot bypass manifest validation, capability planning, or the preview runtime. Unsupported ideas must be reported or routed to a separate capability-synthesis process; they must not silently become fake options.

## Real model boundary

The server-side provider service and selector are implemented without changing the compiler/runtime contract. A production provider should continue to:

1. Run behind a server boundary so credentials never enter the browser bundle.
2. Request structured `BriefInterpretation` output, including evidence, confidence, and three materially different directions.
3. Validate and normalize model output before it reaches `ManifestCompiler`.
4. Record provider/model/prompt version and seed so a run is auditable.
5. Retry invalid structured output; never execute generated JavaScript in the main application.
6. Use capability synthesis only when the catalog cannot express the requested direction, inside an isolated build/test/visual-review pipeline.

The next increment is capability synthesis: when no registered scene/effect can express a request, create and review a new plugin in an isolated build/test/visual-review workflow before exposing it to later model runs. Provider details are documented in [Phase 3](PHASE3-MODEL-PROVIDERS.md).

## Verification and limits

- Unit suite: deterministic generation, valid manifests, two scene routes, and rejoining branches.
- Browser suite: compare/select, local persistence, real plugin match, invalid input, keyboard operation, and 390px layout.
- Current capability space: two scene plugins (`signal-world`, `chromatic-tide`) plus the existing signal effect.
- Implemented locally: Codex CLI calls and MiniMax/OpenAI server adapters. Not implemented: accounts, cloud persistence, production deployment, or autonomous execution of generated code.

Visual evidence: [desktop workbench](screenshots/phase2-workbench-desktop.png) and [mobile workbench](screenshots/phase2-workbench-mobile.png).
