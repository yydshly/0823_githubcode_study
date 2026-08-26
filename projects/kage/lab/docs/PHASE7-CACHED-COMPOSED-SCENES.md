# Phase 7 — Cached analysis and composed scenes

Status: implemented and browser verified  
Updated: 2026-08-24

## Goal

Turn a model-owned `EffectSpec` into an addressable analysis result and a real Three.js preview without sending the model through a fixed scene-template vocabulary.

```text
CreativeBrief + provider + model + seed
  -> persistent interpretation cache
  -> model EffectSpec[]
  -> ComposedSceneRecipe
  -> ExperienceManifest v2
  -> composed-world ScenePlugin
  -> browser/runtime evidence
```

## Addressable model analysis

Remote interpretation now uses a SHA-256 cache key derived from schema revision, provider, model, brief text and seed. Valid responses are persisted as JSON under `.signal-lab-cache/creative-v1` by default.

- Same brief, provider, model and seed can reuse a validated result.
- `cacheStatus` is always explicit: `hit`, `miss` or `bypass`.
- The workbench keeps seed `17` for repeat generation and exposes **生成新变体** to increment the seed intentionally.
- Cached values are parsed through the current Zod model schema before reuse.
- Cache writes are atomic and cache failures never replace a valid model response.
- The default expiry is seven days and can be changed with `CREATIVE_CACHE_MAX_AGE_MS`.

## EffectSpec scene grammar

`ComposedSceneRecipe` is a bounded rendering grammar rather than a page template. It contains:

- hero form, material and scale;
- field topology, instance count and radius;
- floor, halo and fog intent;
- rotation, pulse, drift and pointer response;
- source EffectSpec ID and omitted asset count.

The compiler derives these values from spatial metaphor, visual grammar, composition layers, motion pace and drivers. Two materially different EffectSpecs therefore produce different recipes even though they share one verified runtime plugin.

## Runtime behavior

The `composed-world` plugin builds a deterministic hero object and quality-aware instanced field. It supports orb, crystal, monolith and knot subjects; glass, metal, emissive and matte materials; and rings, constellation, stream and grid fields.

The plugin intentionally does not load invented media. `omittedAssetRequirements` reports how many EffectSpec assets are not present in this procedural preview. `AssetPlan` and `ProductionPlan` remain authoritative for image, texture, GLB, avatar, environment, audio and video readiness.

Local baseline candidates continue using the previously verified `signal-world` and `chromatic-tide` scenes. Model-owned EffectSpecs now compile to `composed-world`, keeping the model's visual vocabulary independent from the legacy demo catalog.

## Browser demo

Open:

```text
http://127.0.0.1:8143/?experience=composed-world&quality=high&debug=1
```

The deterministic regression fixture demonstrates a knot hero, emissive material and stream field. High quality uses 88 instances; lower quality reduces the count while preserving the same recipe intent.

Visual evidence: [phase7-composed-world.png](screenshots/phase7-composed-world.png)

## Verification

- strict TypeScript production build;
- 12 unit test files, 34 tests;
- EffectSpec-to-recipe differentiation test;
- model pipeline assertion that recipe source IDs match EffectSpec IDs;
- local-baseline compatibility test;
- real browser scene-plugin, capability-budget and quality-degradation assertions;
- workbench cache-status and seed-variation browser assertions.

## Remaining gate

This phase creates a credible procedural preview, not final asset fidelity. The next production increment is to connect the first real image/texture generator, persist generated files with provenance, bind ready assets into a recipe layer, and evaluate the rendered screenshot against the EffectSpec before promotion.
