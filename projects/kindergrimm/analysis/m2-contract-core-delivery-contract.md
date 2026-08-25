# M2 Contract Core：交付合同

## Design contract

```text
Entry mode: Program-driven / direct implementation
Program milestone: M2 · Contract Core
Target user and context: 需要在不加载 Three.js、DOM 或角色 rig 的环境中验证、迁移和审查资产合同的工具与运行时团队
Desired first impression: Recipe、Pack、Renderer、Visual Record 和 Manifest 是稳定产品合同，不是 UI 或具体场景的内部对象
Asset representation: deterministic procedural 2D records；不改变当前 CanvasTexture 运行资产的表示
Architecture boundary: pure contracts → generator/domain verification → renderer/runtime verification
Operation constraints: 无新增依赖、无后端、无远程 API；保持 Original 与 Mosslight v0.5/v0.6 指纹和消费行为
Primary journey: 读取 JSON → 纯合同校验 → 返回结构化 issue/error code → 可选生成器重建验证 → 工厂导出 / 场景导入
Required artifacts:
  - 字段与兼容性清单
  - contracts 纯 ES module（不导入 Three.js、DOM、upstream rig）
  - Recipe、Renderer、Content Pack、Visual Record、Batch Manifest schemas
  - Original、v0.5、v0.6、篡改 fixtures
  - Node 无渲染验证脚本
  - content-packs / npc-core 接入与向后兼容 API
  - 工厂、场景浏览器回归
Autonomy authorization: Program v1 已授权依赖顺序内的可逆实现和验证
User-decision boundary: 不在 M2 定义最终品牌视觉、真实后端、3D schema 或 AI provider
Observable completion criteria:
  - contracts 模块静态依赖为 0，Node 可直接 import
  - 所有错误同时提供稳定 code、path 和兼容字符串 message
  - 纯校验不构建角色、不访问 Canvas/WebGL、不重新生成批次
  - domain verification 仍能验证 pack constraints、Recipe 和 renderer 指纹
  - Original、v0.5、v0.6 接受；篡改 fixture 被确定 code 拒绝
  - 现有工厂 12 资产、场景 8 actors、v0.6 96 authored planes 与 430 calls 不回归
Coverage record: 见下表
```

## Authoritative field inventory

| Contract | Current authoritative fields | Current owner | M2 target owner |
| --- | --- | --- | --- |
| Recipe | seed、species、base、color、media、parts | upstream rig + npc-core | schema + domain generator |
| Renderer Descriptor | schemaVersion、id、version、kind、baseRenderer、runtimeModule、seedContract、features、coverage、palette、fingerprint | content-packs | contracts + renderer registry |
| Content Pack | schemaVersion、id、version、status、provenance、constraints、visual、identity、presentation、fingerprint | content-packs | contracts + pack registry |
| Visual Record | rendererId、rendererVersion、rendererFingerprint、baseRenderer、addedParts、variant、fingerprint | visual-pipeline | contracts + renderer implementation |
| Batch Manifest | schemaVersion、generator、batch、spritesheet、assets、optional contentPack/bundle | npc-core | contracts envelope + domain verifier |
| Asset | id、fingerprint、batchIndex、representation、recipe、optional visual | npc-core | contracts |

## Responsibility split

```text
Pure contract validation
  - object shape / schema tag / semver / stable ids
  - fingerprint and internal count/grid consistency
  - provenance presence and structured issues
  - no renderer, DOM, Three.js or generator imports

Domain verification
  - supported species/media/colors
  - content-pack constraints
  - deterministic batch rebuild
  - known renderer/version policy

Runtime verification
  - CanvasTexture parts actually build
  - scene planes/draw calls/state/fallback
```

## Coverage manifest

| Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| 真实字段盘点 | source + live factory | source inspection；live Manifest keys | 0/1 | pass | — |
| 责任与兼容边界 | architecture | 本合同 responsibility split | 0 | pass | — |
| 纯 contracts module | Node import | 23 exports；0 import；Node direct import；FNV compatibility | 2 | pass | — |
| 五类 schemas | schemas directory | 5/5 JSON parse；draft 2020-12；schema ids 对齐 CONTRACT_SCHEMAS | 2 | pass | — |
| 四类 fixtures | fixtures/contracts | 12-asset Original / v0.5 compat / v0.6 / visual tamper + index | 3 | pass | — |
| 无渲染 verifier | Node CLI | 5 schemas + 4 fixtures；3 accept / 1 reject；0 failures | 3/6 | pass | — |
| content-packs 接入 | runtime/domain | Original 7d63c5ae；v0.6 a79de443 / 091c354d；structured tamper issue | 4/6 | pass | — |
| npc-core 接入 | runtime/domain | pure envelope → pack constraints → deterministic rebuild → renderer compare | 4/6 | pass | — |
| 工厂回归 | 1440/390/WebGL | 12/12 assets；Bundle 469508 bytes / 3 CRC；390 no overflow；WebGL-off JSON enabled | 5/7/8 | pass | — |
| 场景回归 | Seed/import/reject/recover | v0.6 8 actors / 96 authored / 430 calls；v0.5 compat 24 / 286；tamper rejected/preserved/restored | 5/6/8 | pass | — |
| 工程与文档 | syntax/HTTP/Program | JS syntax 6/6；HTTP canonical；README/Program/research station advanced to M3 | 9 | pass | — |


## Browser refinement record

- Current stages: 5–8 runtime interaction, state, cross-surface and fallback.
- Environment: canonical PowerShell server；HTTP 8882；fresh Chromium module session；1440×900 and 390×844；dark-only product boundary.
- Baseline risk: old validation mixed JSON shape, generator rebuild and renderer verification; cached browser sessions did not expose structured issues.
- Intervention: pure contracts first, then domain/generator/renderer verification; fresh session used to avoid stale ES module cache.
- Adjacent surfaces: Original and Mosslight packs；factory export；v0.5/v0.6 import；tamper reject；Seed recovery；mobile；reduced motion；WebGL-off.
- Result: all affected journeys pass；no page errors in fresh sessions.
- Decision: pass.

## Final delivery record

- Status: pass — M2 Contract Core delivered.
- Pure verification: 5 schemas / 4 fixtures / 0 failures；tamper rejected at contract.fingerprint.mismatch@assets[0].visual.fingerprint.
- Fingerprints preserved: Original pack 7d63c5ae；v0.6 pack a79de443 / renderer 091c354d / first visual 722d4014.
- Factory: 12 assets / 12 Visual FP；469508-byte ZIP；manifest + sheet + pack；3/3 CRC.
- Runtime v0.6: 8 actors / 214 planes / 96 authored / 430 calls；three warm rebuilds 536/316/341ms，median 341ms.
- Runtime v0.5 compatibility fixture: 8 actors / 142 planes / 24 authored / 286 calls；the known historical f78b264d / f7d84f29 / aef31a9b values remain immutable reference evidence because the historical full JSON payload was not retained.
- Tamper: stable code/path returned；current imported scene preserved；Seed recovery returns the same eight fingerprints.
- Cross-surface: 390px scrollWidth 375；reduced-motion paused=true；WebGL-off keeps 12 Manifest assets, JSON export and 8 semantic roster entries.
- Program state: M2 DONE；M3 Independent 2D Pack ACTIVE；M4 Production Frontend NEXT.