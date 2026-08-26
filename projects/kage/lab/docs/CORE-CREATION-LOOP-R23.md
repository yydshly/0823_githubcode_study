# Core Creation Loop R23

## Product objective

Turn one natural-language idea into a bespoke, high-quality Three.js webpage. The system may create or select images, models, textures, audio, shaders, DOM layout, and interaction techniques when they materially improve the final experience. No visual direction is fixed in advance.

## Primary journey

1. Describe the intended experience.
2. Generate one runnable dedicated webpage.
3. Continue changing that webpage with natural-language instructions.
4. Preserve parent and child while a revision is being evaluated; prune non-selected runs after their conclusions are recorded.
5. Promote at most one browser-reviewed representative per research goal.

Automatic visual review remains an optional quality pass. It is not required before the user can see or revise a generated result.

## Architecture contract

- **Experience ambition:** immersive, outcome-led, responsive.
- **Surface:** hybrid DOM + WebGL; DOM carries readable content and controls, WebGL carries spatial memory, material, camera, and atmosphere.
- **Generation:** Codex creates a dedicated source bundle. A later revision changes only the files needed for the instruction and never overwrites the parent.
- **Assets:** use real or generated assets only when their provenance is known and their contribution is clear. Procedural rendering is a valid direction, not the default answer to every brief.
- **Cases:** only curated representatives are runnable evidence and regression fixtures. Failed and redundant iterations become research notes, not cards or templates.
- **Safety:** generated bundles remain network-disabled, sandboxed, statically imported, type-checked, and size-bounded.

## Coverage record

| Surface | Requirement | State | Evidence target |
| --- | --- | --- | --- |
| Workbench | One clear generation entry and visible live result | verified | Desktop and 390px browser checks; generate and revise controls render without case-management actions |
| Dedicated result | Full-page pointer/scroll experience | verified | Archived featured case opens with a live canvas and no Vite overlay |
| Natural-language revision | Change the active dedicated result, preserve parent during evaluation | verified | Codex 5.6-sol changed 3 existing files in one pass and compiled in 483ms; the 86-point experiment was documented then pruned |
| Curated research examples | Separate reusable capability baselines from one best model-generated final work | verified | 2 workbench capability examples + restored `dedicated-ba4e9d10caaa-depth-field`; R24 mechanical selection is superseded by R25 |
| Quality | Build, unit tests, sandbox contract | verified | Production build passes; 27 files / 77 tests pass |
| Responsive | Controls and selected examples remain usable on small screens | verified | Workbench and two-example page checked at 390px; no horizontal overflow |

## Completion rule

This milestone is complete when a generated result can be revised through the workbench without overwriting its parent during evaluation, failed variants can be pruned after research capture, and the workbench plus curated-example path have real browser evidence.
