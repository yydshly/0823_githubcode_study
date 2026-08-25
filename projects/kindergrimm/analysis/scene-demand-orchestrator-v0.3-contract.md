# Asset Lab v0.3 — Scene-demand Orchestrator Contract

## Design contract

- Entry mode: revision-led continuation.
- Request revision: 3.
- Target user and context: a content author who starts from a scene need and expects the workbench to assemble source-backed Kindergrimm materials, not ask them to understand every backend first.
- Desired first impression: describe the scene once, receive an explainable character/style/item/environment asset set with visible source outputs.
- Visual ambition: Immersive.
- Experience architecture: Hybrid Workspace.
- Visual constraints: preserve the current Asset Lab route, four modes, paper visual system, and source truth panels; add one fifth mode without creating another page.
- Information constraints: every recommendation states the matched intent signal, source builder, representation, runtime use, and limitation.
- Operation constraints: preset or structured scene intent → deterministic match → generate real source assets → inspect → export six files and scene manifest.
- State constraints: initial preset, alternative preset, custom controls, generated, repeat deterministic, invalid seed, export, mobile, keyboard, WebGL-off fallback.
- Environment constraints: canonical URL `http://127.0.0.1:8882/projects/kindergrimm/asset-lab/`; upstream lock `5857b1e1`; runtime LLM and hosted API remain absent.
- Primary journey: express scene need → receive explainable capability matches → inspect actual character/item/environment/style outputs → export a provenance-preserving asset set for later scene assembly.
- User-defined phases: preserve the page; continue source-library research and material capability expansion; make generation scene-need-driven.
- Required artifacts: deterministic scene matcher, fifth workbench mode, real output board, explainability ledger, six-file scene package, browser report, evidence, delivery report.
- Autonomy authorization: user said “继续” after v0.2 defined the next step as scene-demand matching in the same workbench.
- User-decision boundary: external LLMs, new authored styles, cloud generation, storage, GLB serialization, collision/LOD, and a general game engine remain outside this revision.
- Observable completion criteria: old four modes still pass; at least three meaningful scene presets; custom field changes affect matches; same input produces same fingerprint; output board contains three character source views, one source item, one procedural environment proxy, one live style proof; export contains 3 character PNG + item PNG + environment proxy + scene manifest; desktop/tablet/mobile/keyboard/fallback pass; zero open status remains.

## Scene representation contract

| Output | Matching role | Source mechanism | Runtime representation | v0.3 package output |
| --- | --- | --- | --- | --- |
| Character | actor / guide / threat | character intent compiler + 3 source builders | Drawn 2D + Voxel/Gloss procedural 3D | 3 × 768² transparent PNG |
| Style | mood and narrative register | `styles.html` registered style | live contact sheet / art-direction reference | source URL + selected capability in manifest |
| Item | interaction and story affordance | `rollItem` + `thumbFor` | procedural 2D transparent asset | 512² transparent PNG |
| Environment | biome and spatial anchor | `buildPlant` | procedural Three.js geometry | 768² transparent proxy + native Recipe |

## Matching contract

The matcher is local and explainable. It does not infer through a model. It normalizes the explicit scene type, mood, biome, interaction, actor, and seed, then uses versioned tables to choose one valid source capability in each family. Free text is preserved as authored context but does not silently override structured controls.

## Coverage manifest

| User phase | Requirement | Surface/state | Evidence | Stage | Status | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Preserve | v0.2 four modes and exports unchanged | all existing modes | old + new automated checks | 1 | pass | v0.2 18/18；角色合同 10/10；角色浏览器 14/14 |
| Expand | fifth Scene Orchestrator tab on the same route | navigation | DOM + keyboard | 4 | pass | 同一路由 5 tabs；方向键可达 |
| Match | three meaningful scene presets | scene controls | DOM + matcher checks | 5 | pass | 港口回信、林地会面、冬日温室 |
| Match | structured intent deterministically maps four source families | generated state | fingerprints + ledger | 5 | pass | 同输入同 `kg-c6b013e0`；自定义输入变为 `kg-ebfc6a70` |
| Produce | three actual character views | scene output board | data PNG + export blobs | 5 | pass | Drawn / Voxel / Gloss 三份真实源输出 |
| Produce | actual source item PNG | scene output board | canvas/blob/hash | 5 | pass | Lantern Nightmare 512² PNG，93,687 bytes |
| Produce | actual procedural environment proxy | scene output board | WebGL stats/blob/hash | 5 | pass | Wildcard/Tundra/Fuzz 真实几何；768² proxy，115,869 bytes |
| Produce | live selected style proof | scene output board | source iframe URL/state | 5 | pass | Surrealism 源页样张与 Seed 123473 |
| Explain | every match exposes reason/source/representation/gap | explanation ledger | DOM/manifest | 6 | pass | 4 条可解释记录完整进入 Manifest |
| Export | six-file source scene package | generated/export | blobs, dimensions, hashes, manifest | 8 | pass | 5 PNG + 1 JSON；693,806 bytes；5 SHA-256 |
| Accessibility | full scene journey keyboard reachable | keyboard | real browser focus and submit | 7 | pass | 3px focus；Scene → Environment 方向键同步 |
| Responsive | 1440, 1024, 390 no overflow | scene mode | screenshots + dimensions | 7 | pass | 三视口 scrollWidth = viewport |
| Fallback | render-off still matches, shows item/style/Recipes, disables unavailable 3D package | fallback | browser path | 8 | pass | 1 个 2D 实图 + 4 个明确降级框；整包导出禁用 |
| Regression | v0.2 Asset Lab + Atlas + Scene Studio pass | adjacent | automated tests | 9 | pass | 18+10+14+9+12+8+14 checks pass |
| Closure | report, evidence, zero open status | all | audit | 9 | pass | v0.3 报告、5 张最终证据、0 open status |
