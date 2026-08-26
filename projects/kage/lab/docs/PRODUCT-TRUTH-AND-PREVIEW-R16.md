# R16 — Preview integrity and live-model truth

## Design contract

- Entry mode: repair-led revision.
- Target user: a creator judging whether one natural-language idea produced a distinct, usable Three.js webpage.
- Desired first impression: the generated page is visible as a coherent composition, and its production source is unambiguous.
- Visual ambition: immersive.
- Experience architecture: hybrid workspace — prompt controls beside one live spatial result.
- Primary journey: describe → explicitly invoke model → inspect an unclipped live page → see what the model generated versus what the registered runtime assembled.
- Autonomy authorization: the user requested the project continue and directly identified the defects.
- User-decision boundary: no new external provider or paid asset call is added without an existing configured capability.

## Preserved behavior

- Auto mode does not reveal the local bootstrap draft before an explicit Generate action.
- Two runnable capability samples remain secondary and open separately.
- Generated pages keep semantic fallback, reduced motion, and complete-page links.
- Deterministic automated tests remain offline and repeatable.

## Completed repair ledger

| Item | Evidence | Root cause | Acceptance result | Status |
| --- | --- | --- | --- | --- |
| Preview composition | User screenshot showed a clipped result heading and a large empty black stage. | The iframe retained its browser-default 150 px height inside a much taller shell; auto-scroll ignored the sticky header. | Iframe and Canvas now fill 494 px on desktop; result heading begins below the header; nested controls are hidden. | pass |
| Model provenance | A global Codex label made the registered runtime appear to be entirely model-generated. | Model interpretation, local Three.js compilation, asset production, and cache status were collapsed into one label. | Four explicit fields now report model EffectSpec, registered runtime, generated-asset state, and cache/fallback. | pass |
| Live-model acceptance | The deterministic suite used local or intercepted providers. | No named opt-in live-provider check existed. | Independent live Codex test passed with a new brief in 2.4 minutes and required `codex:` provider plus model-sourced EffectSpecs. | pass |
| Adjacent surfaces | Preview/layout changes could regress mobile, samples, or fallback. | Shared stage sizing and foreground layers changed. | 390 px preview has no overflow; two samples remain; build, 54 unit tests, 46 browser tests, and 1 live-model test pass. | pass |
