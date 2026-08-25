# Kindergrimm Program v2

> 多风格 2D Content Production Platform。v1 是冻结、可回归的发布基线；v2 只通过新增合同、Pack、Renderer 和消费能力向前演进。

## Program status

| 字段 | 当前值 |
| --- | --- |
| Program | Multi-style 2D Content Production Platform v2 |
| 状态 | REASSESS AGAINST UPSTREAM 5857b1e1 |
| 已交付 | V2-M0 · Pack Family Proof；V2-M1 · Independent Structural Style Backend；V2-M2 · Style System Expansion；V2-M3 · Asset Capability Expansion |
| 当前里程碑 | Cross-backend Asset Lab · ACTIVE PROTOTYPE |
| 下一里程碑 | Shared Semantic Parts / Scene Sockets · PLANNED |
| v1 基线 | kindergrimm-2d-v1 / df8ac08c / immutable |
| AI | decision-gated intent adapter；不进入 Renderer 核心 |
| 3D | 上游已原生提供 Voxel / Gloss / Object 3D；本地不再将 3D 视为源库外能力 |

## 2026-08-25 上游重审

最新上游 `5857b1e1` 已包含 13 个 Item Family、三种对象 Host、Voxel / Gloss / Object 3D、九个历史 Style Backend、第二绘制 Hand、Timeline 和三个应用游戏。历史 V2-M2/V2-M3 的多风格与 Prop 工作现归为 `PARALLEL / REASSESS`，不再计为源库净新增。v2 后续只保留版本化互操作、跨 Backend 身份、正式导出发布和回归审查等真实增量。

Cross-backend Asset Lab 已完成第一个真实增量切片：直接调用 `buildCharacter`、`buildVoxelCharacter`、`buildGloss`，把一个受约束素材意图编译为三份 Backend-native Recipe，并输出三张 768×768 PNG proxy、SHA-256 与场景就绪 Manifest。当前只承诺 Seed 与高层物种/视觉意图一致；详细部件仍由各 Backend 独立生成。

## 宏观目标

在完整研究 Kindergrimm 原有生成机制的基础上，把已经验证的 Mosslight / Inkcut 生产闭环扩展为可以持续生产、比较、审查、导出和使用多套 2D 素材风格与素材类型的研究型生产平台。

~~~text
创作意图 / Seed
      ↓
Pack Family（palette / identity / usage）
      ↓
Structural Renderer（silhouette / parts / brush grammar）
      ↓
Recipe + Visual Record + provenance
      ↓
Factory / Production Studio / Runtime SDK
      ↓
场景、剧情、商店、卡牌和后续内容服务
~~~

成功不是“页面上多一个换色选项”，而是新增能力能被合同发现、确定性重建、批量审查、打包迁移，并在真实运行场景中保持身份和状态。

## 不可回退基线

以下 v1 身份必须持续通过 scripts/verify-release.mjs：

- Release kindergrimm-2d-v1@1.0.0 / df8ac08c。
- Pack mosslight-core-2d@0.1.0 / a96d877a。
- Renderer mosslight-core-2d@0.1.0 / 32d9c2cf。
- Runtime SDK kindergrimm-runtime-sdk@0.1.0。
- 0 runtime LLM calls / 0 cloud API calls。

v2 不覆盖 releases/kindergrimm-2d-v1/，不改变 v1 默认 Production Studio 的发布目标，也不把共享 Renderer 的 palette 变体宣传为全新 Renderer。

## 扩展层级

| 层级 | 可以改变 | 不能冒充 | 当前证据 |
| --- | --- | --- | --- |
| Pack Family Variant | palette、身份词汇、用途、来源、展示语义 | 新结构 Renderer | Moonharbor Core 2D |
| Structural Style Backend | 轮廓、比例、核心 parts、笔触和材质语法 | 仅换色 Pack | Moonharbor Inkcut 2D |
| Output Profile | 透明角色、头像、卡片、目录预览、Sprite Sheet | 页面截图 | V2-M2 |
| Asset Type Module | 角色、头像、图标、道具、场景组件 | 通用游戏引擎 | V2-M3 |
| AI Intent Adapter | 自然语言到合法候选参数 | 直接绕过合同生成资产 | decision-gated |
| 3D Backend | mesh、rig、animation、LOD、collision、glTF | 2D 平面空间感 | separate Program |

## 里程碑

| 里程碑 | 目标 | 交付物 | 退出门槛 | 状态 |
| --- | --- | --- | --- | --- |
| V2-M0 · Preserve & Family Proof | 冻结 v1，并证明同一 Renderer 可派生第二 Pack | family profile、Moonharbor Pack、Factory/Runtime 入口、verifier | v1 8/8；新 Pack 合同、确定性、审计和浏览器通过 | DONE |
| V2-M1 · Structural Style Backend | 建立真正第二套 2D 结构与笔触语言 | Moonharbor Inkcut renderer、18+ features、50 golden、对比报告 | 0 Mosslight visible parts；轮廓/笔触差异可审查；G1–G6 | DONE |
| V2-M2 · Style System Expansion | 继续研究上游机制并证明风格后端可持续增加 | traceability matrix、第三结构风格、Style Renderer 模板、四类输出档案 | 三套结构风格 × 50 golden；四种真实素材输出；三场景演示 | DONE |
| V2-M3 · Asset Capability Expansion | 从角色扩展到图标、道具和场景素材 | asset type contract、prop/icon/scene kits、组合示例 | 至少 3 类新增素材可导出、可迁移、可在场景消费 | DONE |
| V2-M4 · Multi-pack Production Studio | 在主生产台创作和审查多个发布目标 | pack selector、diff、family lineage、RC | 不破坏 v1 默认流程；各 Pack 独立 Gate | PLANNING |
| V2-M5 · Runtime Scenario Portfolio | 用同一 SDK 消费不同 Pack、Renderer 和 kit | 场景矩阵、状态映射、缓存策略 | 三类消费者保持身份/状态/预算 | PLANNED |
| V2-M6 · Quality & Release | 发布可迁移 v2 组合 | release manifest、provenance、browser matrix | G0–G7 全部 PASS | PLANNED |

## 推进顺序

1. Research：先建立上游源码机制、现有效果、扩展接口和限制的证据映射。
2. Contract：锁定 Style Renderer、Output Profile、Asset Type 和来源边界。
3. Renderer：实现新的可见结构、笔触和材质语法，不用换色冒充风格。
4. Output：从同一 Recipe / Visual 派生透明角色、头像、卡片和 Sprite Sheet。
5. Packaging：Manifest、PNG、Sheet、ZIP 与 lineage 使用同一记录。
6. Scenarios：用游戏角色、叙事头像、卡牌/目录演示真实素材消费。
7. Frontend & Review：最后接入 Factory/Studio，并完成桌面、390px、reduced-motion、WebGL-off、预算与 provenance。

## 已交付：Moonharbor Pack Family

moonharbor-core-2d 是 v2 的第一条扩展证据：

- 共享 mosslight-core-2d 的 17 类部件、六组 coverage 和动画协议。
- 替换 palette、names、roles、presentation 与 provenance。
- Pack 和 Renderer descriptor 获得独立 fingerprint。
- NPC Factory、Manifest、ZIP 与 Runtime 场景仍消费同一 Content Pack 合同。
- 明确标注为 palette-identity-variant，不宣称第二套独立 Renderer。
- 当前身份：Pack c0b9efd3；共享 Renderer id mosslight-core-2d；派生 descriptor fingerprint 708e0f87。
- 浏览器样本：12 assets / 12 unique；23 authored / 0 upstream planes；347,158-byte ZIP；3/3 CRC PASS。
- Runtime：8 actors / 184 authored planes / 186 draw calls；三场景 Recipe 与 Visual fingerprints 完全一致。

## 已交付：Moonharbor Inkcut Structural Renderer

moonharbor-inkcut-2d 是真正第二套结构 Renderer，不是 Mosslight 换色：

- 独立 Renderer 与 media id；19 个 feature ids，覆盖 head、face、body、limbs、clothing、prop 六组。
- 每角色 25 / 25 authored visible planes，0 Mosslight / upstream visible planes；独立角面轮廓、窄长比例、ink hatch、paper rays、compass 与 signal lamp。
- 50 个 golden Recipe 与 50 个 Visual fingerprints 全部唯一，覆盖 human、cat、dog。
- Production Studio 已形成 Original / Decorator / Core v1 / Inkcut 四路对照；Core v1 仍是唯一冻结发布目标。
- Factory：12 / 12 unique；3-entry ZIP、stored、CRC 全通过；WebGL-off 保留确定性 Recipe。
- Runtime：8 actors / 200 authored planes / 202 draw calls / 176ms；Waystation、Encounter、Council 指纹完全一致。
- 390px、reduced-motion、WebGL-off 与浏览器证据通过；0 runtime LLM calls / 0 cloud API calls。
- 当前身份：Pack 102a504a；Renderer 8698bcfe；media moonharbor-inkcut。

实现合同见 analysis/v2-m0-preservation-and-pack-family-contract.md、analysis/v2-m1-structural-style-backend-delivery-contract.md、analysis/v2-m2-style-system-expansion-delivery-contract.md 与 analysis/v2-m3-asset-capability-expansion-delivery-contract.md。V2-M3 完成证据见 analysis/v2-m3-completion-report.md。

V2-M2 已交付：

- 上游能力与本地扩展映射：analysis/v2-m2-upstream-extension-traceability-matrix.md。
- 第三套结构风格：Sunpatch Felt 2D，决策见 analysis/v2-m2-third-style-decision.md。
- Style Renderer registry/template、Sunpatch Felt、四类 Output Profiles、五路线/四输出 Studio、三类素材使用场景与可迁移 ZIP 全部通过。
- V2-M3 已交付：
  - Prop、Icon、Scene Component 三类非角色素材，各 12 个确定性样本。
  - Mosslight Gouache / Moonharbor Inkcut / Sunpatch Felt 三套独立 Prop 风格语法与 36 个并排视觉结果。
  - 应用证明《风暴前的回信》：三章、五类真实 Prop、四位角色、任务/库存/状态与双结局；三种样式重绘同一进度，证明素材可被叙事场景实际消费。
  - Scene-driven Content Studio：用户自然语言 → Scene Contract → 素材匹配/变体/缺口 → 真实场景；第一版为本地可解释规则 Intent Adapter，0 runtime LLM、0 cloud API。
  - 透明 PNG、Inventory Icon、Catalog Card、Prop Sheet 四种真实输出。
  - 12 个场景组件、36 个三风格场景视觉；每个场景嵌入 3 个实际生成 Prop。
  - 8-entry ZIP、Manifest、CRC、provenance、390px、reduced-motion、Canvas-off 与键盘回归。
  - 0 runtime LLM / 0 cloud generation / 0 upstream visible parts。

V2-M4 规划边界：把现有素材语法组织成可版本化的多素材包生产流程，增加 pack schema、批量审查、差异和发布候选；不转向库存、战斗、AI、关卡或通用游戏引擎。
