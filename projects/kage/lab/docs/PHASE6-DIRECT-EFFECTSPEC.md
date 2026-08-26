# Phase 6 — Direct model EffectSpec

Status: implemented and verified with live Codex evidence  
Updated: 2026-08-24

## Goal

Remove the product-level constraint that required every model to choose exactly one `focus`, one `journey`, one `branching` direction and one of two existing scene plugins. Models now describe the intended final effect directly; runtime plugin selection is a later compatibility decision.

```text
CreativeBrief
  -> Codex / MiniMax structured analysis
  -> 2–4 ModelEffectSpecDraft values
  -> provenance injection + EffectSpec validation
  -> diversity gate
  -> AssetPlan + ProductionPlan
  -> temporary runtime compatibility direction
  -> ExperienceManifest + browser preview
```

## Contract change

The remote model response now contains `effectSpecs` rather than `directions`. Each draft owns:

- route, outcome, action and audience;
- signature moment, spatial metaphor, visual grammar, mood arc and palette;
- DOM/WebGL composition layers and visible outcomes;
- camera, pace, drivers and reduced-motion behavior;
- image, texture, sprite, true 3D, avatar, environment, audio, video and font requirements;
- device, quality, frame-time and initial-payload constraints;
- reasoning for the major design choices.

The server injects schema version, stable ID and provider/model/brief provenance. It then runs the same cross-reference validation used by compatibility-generated specs.

## Creativity gate

Candidate count is variable from two to four. Any pair must differ in at least three of these dimensions:

- experience route;
- composition mode;
- spatial metaphor;
- visual grammar;
- camera strategy;
- interaction drivers;
- rendering techniques;
- asset strategy.

Changing only title, copy or color is rejected before orchestration.

## Runtime compatibility boundary

The current `ExperienceManifest` compiler still understands `focus / journey / branching` and the verified `signal-world / chromatic-tide` plugins. `compileRuntimeCompatibilityDirection` derives a temporary preview mapping from each EffectSpec.

This mapping is not sent to the model and does not change the EffectSpec. The workbench labels whether an effect came directly from a model or from the local compatibility analyzer. A preview may therefore under-represent an asset-heavy EffectSpec; `ProductionPlan` remains the source of truth about what is ready, adapted or blocked.

## Live Codex evidence

The local Codex provider (`gpt-5.4`) was called with the smart-audio-product brief through `/api/creative/interpret`.

- Response passed the generated JSON schema and EffectSpec validator.
- Three model-owned EffectSpecs were returned in approximately 111 seconds.
- Routes were `immersive-page`, `technical-visualization` and `cinematic-showcase`.
- Spatial metaphors included a frozen creative studio, a future signal archive and a night broadcast station.
- Requirements included generated imagery, texture, audio, video and true 3D instead of pretending that basic geometry could deliver the requested fidelity.
- All artifacts recorded `provenance.source = model`.

The first live call also exposed a Windows-specific `EBUSY` error while deleting the Codex temporary directory. Cleanup now uses bounded retries and records a warning without replacing a valid model response.

## Verification

- strict TypeScript production build;
- model JSON schema export for Codex constrained output;
- direct EffectSpec materialization and provenance test;
- full orchestrator preservation test;
- duplicate/renamed-design diversity rejection test;
- existing local compatibility and browser regression suites.

## Remaining gate

This phase improves planning quality, not final media fidelity. The next production increment is:

1. persist and cache model analyses so a 111-second result is addressable and reusable;
2. connect a real image/texture generator with provenance and quality inspection;
3. materialize generated assets into a bounded build workspace;
4. add screenshot-based visual evaluation against the EffectSpec;
5. replace compatibility scene mapping with EffectSpec-driven plugin/code synthesis as evidence permits.
