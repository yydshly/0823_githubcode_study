# Asset Lab v0.2 — Source Capability Matrix Contract

## Design contract

- Entry mode: revision-led implementation.
- Request revision: 2.
- Preserved surface: existing `/projects/kindergrimm/asset-lab/`, its character controls, three source renderers, exports, manifests, samples, and v0.1 evidence.
- Target user: a content author who needs to discover and generate the right Kindergrimm material for a later game or scene.
- Desired first impression: the same source-backed workbench now covers character, style, item, and environment production; it is not a collection of unrelated demos.
- Visual ambition: Immersive.
- Experience architecture: Hybrid Workspace.
- Visual constraints: preserve cream-paper system and existing character stage; add one clear capability switcher; no new route and no invented artwork.
- Information constraints: every mode names its source builder, representation, output, scene role, and unsupported boundary.
- Operation constraints: switch modes without losing the current character; generate style proof, deterministic item, and procedural environment object; export when the underlying source output is capturable.
- State constraints: character generated, style live/selected, item generated/exported, environment generated/exported, invalid seed, WebGL-off fallback.
- Environment constraints: canonical URL and server remain unchanged; direct imports from upstream commit `5857b1e1`; no hosted APIs.
- Primary journey: choose the kind of scene material → operate the matching source generator → inspect output and provenance → export a usable proxy/manifest or open the original source proof.
- User phases: preserve current page; expand existing source capability coverage.
- Required artifacts: four-mode workbench, 15-style registry/proof, 13-family item generator, procedural environment generator, scene-use matrix, browser evidence, updated delivery report.
- Autonomy authorization: user explicitly said “保留这个页面，继续进行扩展”.
- User-decision boundary: adding external models, new authored style packs, storage, or changing the source repository is out of scope.
- Observable completion: current character journey still passes; all four modes are keyboard reachable; style count 15, item family count 13, environment species count 5; item/environment outputs are deterministic; exports are non-empty; desktop/tablet/mobile/fallback pass; zero open status remains.

## Representation contract

| Mode | Source mechanism | Representation | Export in v0.2 | Scene use |
| --- | --- | --- | --- | --- |
| Character | `buildCharacter`, `buildVoxelCharacter`, `buildGloss` | Drawn 2D + procedural 3D | 3 transparent PNG proxies + manifest | portrait, actor proxy, collectible |
| Style | `styles.html` / `src/stylesheet.js` / 15 registered media IDs | source-native painted contact sheet | direct original proof link; live iframe | look selection and art-direction comparison |
| Item | `rollItem`, `thumbFor`, three source hosts | authored procedural 2D | transparent PNG + item JSON | HUD/card, floor prop, equipped object |
| Environment | `buildPlant` | procedural Three.js geometry | transparent PNG proxy + object JSON | grass, plant, tree, flower, wildcard set dressing |

## Coverage manifest

| User phase | Requirement | Surface/state | Evidence | Stage | Status | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Preserve | v0.1 character generation/export unchanged | character mode | old + new browser paths | 1 | pass | 3 builders、3 PNG、Manifest 原样通过 |
| Expand | one four-mode switcher in existing page | keyboard/desktop | interaction + DOM | 4 | pass | 同一路由四模式，左右方向键可达 |
| Expand | 6 media + 9 historical styles visible | style mode | registry + live source iframe | 5 | pass | 15 个注册项均来自源库 |
| Expand | style seed/style changes native source result | style active | iframe URL/state | 5 | pass | Cubism / Seed 515151 / 9 samples 实测 |
| Expand | 13 item families and 4 ranks | item mode | DOM + source registry | 5 | pass | 13 × 4 来源选择完整 |
| Expand | deterministic item output and PNG export | item generated | hash/blob/browser | 8 | pass | 512² PNG、39 KB、SHA-256、同 Seed 同指纹 |
| Expand | 5 environment species and 6 palettes | environment mode | source registry + browser | 5 | pass | 5 species、6 palettes、3 finishes |
| Expand | deterministic procedural environment and PNG export | environment generated | stats/blob/browser | 8 | pass | 9,227 verts / 6 meshes；768² proxy、130 KB |
| Expand | each mode states representation/use/gap | all modes | DOM evidence | 6 | pass | 2D、程序化 3D、代理图边界已标注 |
| Accessibility | mode and generation controls keyboard reachable | keyboard | focus path/outline | 7 | pass | 环境 → 道具方向键切换与焦点同步 |
| Responsive | desktop 1440, tablet 1024, mobile 390 | four modes | screenshots + overflow | 7 | pass | 桌面/移动无横向溢出；旧 tablet 继续通过 |
| Fallback | `?render=off` keeps style/items contracts and source links | fallback | browser path | 8 | pass | 环境 Recipe 可查；3D 导出禁用；2D 道具仍可用 |
| Regression | v0.1 Asset Lab, Atlas, Scene Studio pass | adjacent | automated tests | 9 | pass | 10+14+9+12+8+14 checks all pass |
| Closure | report, evidence, no open status | all | terminal audit | 9 | pass | v0.2 报告、5 张新证据、0 open status |

