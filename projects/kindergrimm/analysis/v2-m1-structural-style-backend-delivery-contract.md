# V2-M1 · Independent Structural Style Backend Delivery Contract

## 状态

DONE

## 目标

交付 moonharbor-inkcut-2d：一套在轮廓、比例、核心部件和笔触语法上均独立于 Mosslight Core 的确定性 2D Renderer，并通过现有生产、打包和运行时合同消费。

## 必须交付

1. 独立 Renderer descriptor、media id、runtime module 和 capability declaration。
2. 至少 18 个 feature ids，覆盖 head、face、body、limbs、clothing、prop 六组。
3. 自有 silhouette、head/body ratio、ink-cut edge、paper grain 和 light grammar。
4. 50 个固定 golden recipes 与 50 个唯一 Visual fingerprints。
5. Mosslight Core / Moonharbor family / Inkcut Renderer 三路结构审查。
6. Factory、Production Studio、Runtime SDK 和三场景消费。
7. PNG、Sprite Sheet、Manifest、ZIP、CRC 和 provenance。

## 允许共享

- 低层 CanvasTexture plane 创建协议。
- 稳定 RNG、fingerprint、schema、Manifest、ZIP、Runtime SDK 状态协议。
- Three.js Group、camera、animation hook 和 dispose 约定。

## 禁止共享或伪装

- 不调用 buildMosslightCoreCharacter。
- 不复用 Mosslight 的可见 draw functions、布局、palette 或 feature ids。
- 不把 CSS/filter、页面背景或单纯 palette 差异计入独立 Renderer 覆盖。
- 不把 AI 参考图声明为运行时资产，除非实际打包并记录 provenance。

## Gate

| Gate | 退出条件 |
| --- | --- |
| G1 Contract | descriptor、visual record、capability 和 tamper fixtures 通过 |
| G2 Asset | 每角色全部可见 planes 由 Inkcut authored，0 Mosslight visible planes |
| G3 Visual | 50 golden；近景与游戏相机均可辨识；结构差异通过人工审查 |
| G4 Portability | Manifest/ZIP 可迁移恢复，CRC 与 fingerprints 通过 |
| G5 Runtime | Waystation、Encounter、Council 同批身份和状态一致 |
| G6 Budget | 8 actors <= 260 draw calls；390px、reduced-motion、WebGL-off 通过 |

## 依赖顺序

Renderer capability contract → visual grammar tokens → layout/parts → golden set → packaging → runtime → Production Studio → browser matrix。

## 验收结果

- 身份：Pack moonharbor-inkcut-2d / 102a504a；Renderer moonharbor-inkcut-2d / 8698bcfe；media moonharbor-inkcut。
- 合同：19 features / 6 coverage groups；静态检查不导入 Mosslight layout、draw、build 或 feature ids。
- 资产：50 / 50 Recipe 与 50 / 50 Visual fingerprints 唯一；human、cat、dog 全覆盖；篡改指纹被拒绝。
- 可见来源：单角色 25 / 25 authored planes、0 upstream；8 角色 200 / 200 authored planes、0 upstream。
- 生产：Factory 12 / 12 unique；ZIP 3 entries / stored / CRC 3 / 3 PASS。
- 运行：8 actors、202 draw calls、176ms build；Waystation、Encounter、Council 保持相同 Recipe 与 Visual fingerprints。
- Studio：Original、Decorator、Core v1、Inkcut 四路同槽比较；Core v1 的 G1–G6 仍为 6 / 6 PASS，RC ZIP 4 / 4 CRC PASS。
- 降级：390px、reduced-motion 自动暂停、Factory 与 Runtime WebGL-off 均通过。
- 自动化：scripts/verify-v2-m1.mjs 10 / 10；V2-M0 8 / 8；冻结 v1 release 8 / 8。
- AI / cloud：Renderer、Factory、Runtime 均为本地确定性代码，0 runtime LLM calls / 0 cloud API calls。

## 浏览器证据

- evidence/v2-m1-inkcut-factory-desktop.png
- evidence/v2-m1-inkcut-factory-mobile.png
- evidence/v2-m1-inkcut-factory-webgl-off.png
- evidence/v2-m1-inkcut-runtime-desktop.png
- evidence/v2-m1-production-studio-four-route.png
