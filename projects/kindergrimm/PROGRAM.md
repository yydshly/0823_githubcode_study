# Kindergrimm Program v1 · Frozen baseline

> 本文件保留 v1 的完整、可回归基线。当前 v2 多风格 2D 扩展由 [PROGRAM-V2.md](PROGRAM-V2.md) 驱动；后续实现不再由连续对话临时排序。

## Continuation

- v1：M0–M6 已封版，Release fingerprint 仍为 df8ac08c。
- v2：V2-M0–M3 已交付；Prop、Icon、Scene Component 的 12 样本、双风格、四输出、场景消费与 ZIP 已闭环。当前进入 V2-M4 Multi-pack Production Studio 规划，主线仍是素材包与样式能力生产。
- Moonharbor Core 2D 是共享 Core Renderer 的 palette / identity 变体；Moonharbor Inkcut 2D 才是具有独立轮廓、比例、19 features 与 25 authored planes 的第二套 Renderer。
- AI 仍为 decision-gated 意图层；真正 3D 仍为独立 Program。

## Program status

| 字段 | 当前值 |
| --- | --- |
| Program | Deterministic Game Asset Platform v1 |
| 状态 | V1 RESEARCH RELEASE |
| 当前里程碑 | M6 · Quality & Release · DONE |
| 下一里程碑 | Decision-gated：M7 AI（OPTIONAL）或 M8 3D（SEPARATE） |
| 当前产品路线 | 2D-first hybrid asset platform |
| 3D 路线 | 独立后续 backend，不阻塞 2D v1 |
| AI 路线 | 可选意图适配层，不进入确定性渲染核心 |
| 固定上游证据 | Kindergrimm `de339ad739d8cbd28ff2dd4a940af38c0ede86c8` |

## North Star

建设一套属于我们的、可持续生产游戏角色与场景资源的确定性资产平台：

```text
创作意图 / Seed / Style Pack
            ↓
版本化 Recipe 与资产合同
            ↓
可替换 Renderer Backend
            ↓
PNG / Sprite Sheet / Manifest / ZIP / future glTF
            ↓
编辑器、游戏、剧情、商店、卡牌和资产审查工具
```

核心价值不是“生成一张好看的图”，而是同一份经过校验的数据可以稳定生成、编辑、迁移、批量审查、导出，并在不同运行场景中重建相同资产。

## v1 成功定义

v1 只有同时满足以下条件才算完成：

1. **视觉归属**：至少 1 套自有 media 和 12 个核心主体 parts；角色身份不再依赖上游默认头、脸、身体、服装和道具视觉。
2. **确定性**：相同输入的 Recipe、Visual Fingerprint、导出 Manifest 顺序完全一致。
3. **可扩展**：Renderer、Style Pack、场景消费者通过版本化合同连接，新增 pack 不修改前端领域事实。
4. **可携带**：PNG、Sprite Sheet、Manifest、Pack snapshot 与 ZIP 可验证、迁移和恢复。
5. **可消费**：同一批资产进入至少三类真实场景，并保持身份、部件覆盖和状态映射。
6. **可审查**：50 个固定 Recipe 形成视觉、确定性、覆盖、性能和迁移基线。
7. **可运行**：桌面和 390px 移动端主流程可用；WebGL-off 与 reduced-motion 有可操作降级。
8. **可追溯**：每项资产记录来源、许可证、生成方式、版本、fingerprint 和目标运行预算。

## 明确非目标

- 不把一次性文生图或文生 3D 结果混入确定性核心。
- 不把页面换色、滤镜或外围装饰称为完整自有风格。
- 不在 2D v1 中同时承诺 GLB、骨骼蒙皮、碰撞和自由视角 3D。
- 不在没有产品需要前引入账号、云后端、多人协作或付费模型。
- 不直接复制其他作品的角色身份或完整视觉风格。

## 当前能力与目标差距

| 层面 | 已有证据 | v1 目标 | 主要差距 |
| --- | --- | --- | --- |
| 研究前端 | 14 项能力、实测证据、工厂和场景入口 | 一眼看到目标、阶段、门槛和当前动作 | 信息以研究结果为主，缺少 Program 推进面 |
| 领域合同 | Recipe、Pack、Manifest、renderer fingerprint | 独立 schema、错误模型、迁移策略、golden fixtures | 合同散布在 JS 实现和文档中 |
| 2D 渲染 | 上游主体 + Mosslight 12-part decorator | 独立 media + 核心主体 parts | 当前视觉所有权仍依赖上游主体 |
| 生产工具 | 批量、PNG、sheet、Manifest、ZIP | pack authoring、对比、审查、版本差异和发布门槛 | 更像验证工厂，还不是完整内容生产台 |
| 运行时 | 旅站、遭遇、议事三场景 | 稳定 scene adapter、角色状态和消费合同 | 场景实现仍与当前数据形态耦合 |
| 审查 | 浏览器证据、确定性、迁移、CRC、性能烟测 | 50 golden recipes + 自动合同/视觉/性能矩阵 | 证据充分但没有统一 release gate |
| 分发 | 本地脚本和静态模块 | 可版本化模块、文档、release artifact | 不是 npm/TS SDK，也没有正式 release |

## 目标架构

```text
┌─────────────────────────────────────────────────────────────┐
│  1. Product Frontends                                      │
│  Research Station · Pack Authoring · NPC Factory · Review  │
└──────────────────────────────┬──────────────────────────────┘
                               │  commands / view models
┌──────────────────────────────▼──────────────────────────────┐
│  2. Domain Contracts                                       │
│  Recipe Schema · Pack Schema · Manifest · Migration · IDs  │
└──────────────────────────────┬──────────────────────────────┘
                               │  validated immutable data
┌──────────────────────────────▼──────────────────────────────┐
│  3. Deterministic Generation Core                          │
│  Seed streams · constraints · part graph · fingerprints    │
└──────────────────────────────┬──────────────────────────────┘
                               │  renderer-neutral asset spec
┌──────────────────────────────▼──────────────────────────────┐
│  4. Renderer Backends                                      │
│  Drawn 2D · independent 2D packs · future Voxel/Gloss/GLTF │
└──────────────────────────────┬──────────────────────────────┘
                               │  render records / resources
┌──────────────────────────────▼──────────────────────────────┐
│  5. Packaging & Runtime Adapters                           │
│  PNG · Sheet · ZIP · cache · scene adapter · game hooks    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  6. Consumers                                               │
│  Waystation · Encounter · Council · inventory · dialogue   │
└─────────────────────────────────────────────────────────────┘

Cross-cutting: provenance · tests · performance · accessibility · review gates
```

### 依赖规则

1. 前端只展示和发出命令，不复制 species、parts、palette 或版本事实。
2. Domain Contracts 不依赖 Three.js、Canvas、DOM 或具体场景。
3. Generation Core 只产生可验证的 renderer-neutral 数据和稳定随机流。
4. Renderer Backend 通过 descriptor 注册能力，不反向修改 Recipe 语义。
5. Packaging 只消费已验证资产记录；Manifest 必须自描述版本与来源。
6. Runtime Consumer 通过 adapter 消费角色，不读取工厂 UI 内部状态。
7. 每个跨层数据都必须有 schema version、stable id、fingerprint 和迁移边界。

## 六条工作流

### W1 · Product Frontend

- 研究站：解释能力、架构、阶段和证据。
- Pack Authoring：编辑视觉合同、部件覆盖、palette、约束和预设。
- NPC Factory：批量生成、比较、收藏、导出和差异审查。
- Review Console：运行 golden set、显示失败原因、批准 release candidate。

### W2 · Contract Architecture

- Recipe、Content Pack、Renderer Descriptor、Visual Record、Batch Manifest 分别版本化。
- 建立 schema、validator、error taxonomy、migration 和 golden fixtures。
- 所有随机变化绑定稳定 seed stream；禁止时间、网络和未记录的 `Math.random()`。

### W3 · Renderer Extension

- 先完成独立 2D media 与核心主体 parts。
- decorator、主体 renderer、未来 3D backend 分开注册和预算。
- 每个 part 定义 anchor、size、depth、draw/build、dispose、provenance 和 fallback。

### W4 · Packaging & Runtime

- 单资产、批次和 pack snapshot 使用同一 canonical record。
- PNG、Sprite Sheet、Manifest、ZIP 与运行场景消费同一 pipeline。
- Runtime Adapter 负责角色状态、动作、表情、选中、LOD/fallback 和游戏语义映射。

### W5 · Review & Quality

- Contract：schema、指纹、迁移、篡改和恢复。
- Visual：50 golden recipes 的轮廓、表情、覆盖、近景和场景可读性。
- Runtime：三场景身份一致、状态转换和输入可用。
- Performance：构建时间、draw calls、纹理、几何、内存和帧时间预算。
- Product：桌面/平板/390、键盘、locale、reduced-motion、WebGL-off。

### W6 · Optional AI Adapter

- 输入自然语言意图，输出受 schema 约束的候选 Recipe/Pack 参数。
- 通过 validator、policy 和 fingerprint 后才能进入 Generation Core。
- 记录模型、提示版本、成本和失败；没有 AI 时完整主流程仍可运行。

## 里程碑与依赖顺序

| 里程碑 | 目标 | 主要产物 | 退出门槛 | 状态 |
| --- | --- | --- | --- | --- |
| M0 · Evidence Baseline | 全量理解上游并证明可扩展 | 14 路由、能力矩阵、v0.6 工厂/场景 | 证据链完整 | DONE |
| M1 · Architecture Lock | 固化目标、分层、路线图和审查制度 | 本 Program、R9 contract、研究站推进台 | 三处状态一致；桌面/移动验收 | DONE |
| M2 · Contract Core | 抽离机器可读合同 | schemas、validators、errors、migrations、fixtures | 无渲染环境也能验证所有合同 | DONE |
| M3 · Independent 2D Pack | 建成第一套自有视觉语言 | 1 media、12+ 核心 parts、50 golden recipes | 不依赖上游默认主体视觉即可辨识 | DONE |
| M4 · Production Frontend | 从验证工厂升级为生产台 | authoring、compare、review、release candidate | 一条完整创作→审查→导出流程 | DONE |
| M5 · Runtime SDK | 稳定消费资产 | scene adapter、state hooks、cache、三场景 | 同一 bundle 在三场景一致重建 | DONE |
| M6 · Quality & Release | 形成可发布 v1 | 自动矩阵、预算、provenance、release artifact | 所有 release gates 通过 | DONE |
| M7 · AI Intent Adapter | 可选自然语言编排 | intent schema、provider adapter、policy、cost log | 关闭 AI 不影响主流程 | OPTIONAL |
| M8 · 3D Backend Program | 独立 3D 资产路线 | renderer contract、glTF/LOD/rig/collision research | 单独立项和预算 | SEPARATE |

## Release gates

| Gate | 必须回答的问题 | 最低证据 |
| --- | --- | --- |
| G0 Goal | 解决谁的什么生产问题？边界是什么？ | Design contract + Program milestone |
| G1 Contract | 数据是否版本化、可校验、可迁移、可拒绝篡改？ | schema/validator/fixtures |
| G2 Asset | 是否是真实运行资产，而不是截图、滤镜或页面装饰？ | asset record + runtime render |
| G3 Visual | 是否形成自有视觉语法且 50 样本稳定？ | golden set + review report |
| G4 Portability | 导出能否验证并在独立消费者中恢复？ | ZIP/Manifest/CRC/migration evidence |
| G5 Runtime | 游戏相机、场景、状态和输入中是否可读可用？ | three-scene browser evidence |
| G6 Budget | 性能、视口、键盘、motion、fallback 是否达标？ | measured matrix |
| G7 Release | 来源、许可证、版本、文档和产物是否齐全？ | provenance + release manifest |

任何里程碑只有通过所属 Gate 才能标记 DONE。源码存在、页面能打开或一次截图都不能单独构成完成证据。

## 当前基线预算

M3 独立 Core 已建立新的研究基线；它不是所有未来设备的永久目标：

- 8 actors × 23 authored planes：184 authored / 0 upstream visible planes。
- 场景 draw calls：预算 <= 260；最终 186–187。
- 最终浏览器样本：12 角色工厂 390ms；8 角色场景 354ms。
- 1440、900、390 宽度无横向溢出。
- reduced-motion 初始自动暂停；WebGL-off 保留 12/8 assets、roster、coverage、Manifest、fingerprints 和 JSON。
- Pack `a96d877a`；Renderer `32d9c2cf`；17 feature ids / 6 coverage groups；v0.1 明确只支持 biped。

M4 的 UI/比较/RC 构建预算记录在 `analysis/m4-production-frontend-delivery-contract.md`。

## 推进规则

1. 活跃开发期同一时间只有一个 ACTIVE 和一个 NEXT；v1 closure 后允许无 ACTIVE，后续方向必须重新经过 decision gate。
2. 每个里程碑开始前建立 delivery contract 和 coverage manifest。
3. 实现顺序遵循依赖：Contract → Core → Renderer → Packaging → Runtime → Frontend polish。
4. 用户提出新方向时，先判断是否修改 Program、里程碑或当前 contract；不直接插入临时代码。
5. 每次交付更新本文件、README 和研究站状态；三者必须一致。
6. 可运行界面必须有真实浏览器证据；高成本视觉必须记录性能与 fallback。
7. 未来能力使用 PLANNED/OPTIONAL/SEPARATE，不用“已完成”措辞。

## M2 completion record

- 纯 ES module：runtime/contracts.js，0 imports，可由 Node 直接加载。
- 五类 schema：Recipe、Renderer、Content Pack、Visual Record、Batch Manifest。
- 四类 fixture：Original、v0.5 compatibility、v0.6、visual fingerprint tamper。
- 稳定 issue：code + path + message；篡改命中 contract.fingerprint.mismatch。
- 运行时接线：Content Pack 与 Batch Manifest 先纯校验，再执行 domain/generator/renderer 验证。
- 回归：Original 7d63c5ae；v0.6 pack a79de443 / renderer 091c354d；12 assets；8 actors / 96 authored planes / 430 calls；三次暖构建中位数 341ms。
- 降级：390px 无溢出；reduced-motion paused；WebGL-off 保留 12 Manifest assets 与 8 roster。
- 合同：analysis/m2-contract-core-delivery-contract.md。

## M3 completion record

- 独立 Renderer：`mosslight-core-2d` 不导入上游角色构建、布局、部件注册或绘制函数；每角色 23/23 authored planes，0 upstream visible planes。
- 自有媒体：`mosslight-gouache`；17 类部件覆盖 head / face / body / limbs / clothing / prop 六组。
- Golden：50 Recipe + 50 Visual 唯一指纹，human/cat/dog；首版真实边界为 biped。
- 三路审查：Original 0/0、decorator 12/5、Core 17/6；JSON 与人类可读报告已保存。
- 生产/消费：12 资产 ZIP/CRC；8 actor 三场景；Manifest 导入、防篡改、失败保持、Seed 恢复均通过。
- 预算/降级：390ms 工厂；354ms 场景；186–187 calls；桌面/390、键盘、reduced-motion、WebGL-off 均通过。
- 回归：M2 verifier 0 failures；Original 与 decorator 锁定指纹不变。
- 合同：`analysis/m3-independent-2d-delivery-contract.md`，14/14 PASS。

## M4 completion record

- Production Studio：Author → Original/Decorator/Core Compare → Review → G1–G6 → Release Candidate 已形成浏览器本地闭环。
- 第六类 schema：`kindergrimm-release-candidate/0.1`；RC 引用 Pack、Renderer、Seed、资产/视觉指纹、审批、Gate、bundle CRC 与 provenance。
- 浏览器样本：三路暖比较 122–207ms；12 资产 RC 456–542ms；340,918-byte stored ZIP，4/4 entries CRC PASS。
- 状态安全：Author 或审批备注变化使批准、Gate、RC 失效；本地恢复保留已批准 revision，但要求重建瞬态 ZIP。
- 防篡改：错误 Pack 指纹同时命中 constraint 与 fingerprint mismatch；无效记录不能成为 RC。
- 产品矩阵：1440/390、完整键盘路径、reduced-motion、WebGL-off 均通过；390px 无横向溢出。
- 回归：6 schemas / 4 fixtures / 0 failures；M3 9/9；Factory 三路线与 8 actor Core 场景通过。
- 合同：`analysis/m4-production-frontend-delivery-contract.md`，13/13 PASS。

## M5 completion record

- Runtime SDK：纯 `index.js` 与显式 `three.js` 入口；loader、cache、state hooks、session、diagnostics、scene adapter 分层完成。
- 机器验证：`scripts/verify-m5.mjs` 9/9，覆盖 Manifest/RC accept/reject、cache、state、session restore 与 diagnostics。
- 三场景：Waystation / Encounter / Council 共用一个 adapter，同一 bundle 的 8 Recipe + 8 Visual 指纹完全一致。
- 运行预算：8 actors、184 authored / 0 upstream、186 calls；暖重建 177ms；cache 8 hits / 8 misses。
- 事务性：篡改输入被拒绝后，场景、模式、选择和 actor 数不变；合法 Manifest 导入与 Seed 恢复身份一致。
- 产品矩阵：1440/390、键盘 actor state、reduced-motion、WebGL-off 均通过。
- 回归：M2 6 schemas / 4 fixtures / 0 failures；M3 9/9；Factory 与 Studio 6/6 Gates 通过。
- 合同：`analysis/m5-runtime-sdk-delivery-contract.md`，12/12 PASS。

## M6 completion record

- 第七类合同：`kindergrimm-platform-release/1.0`，纯 payload/fingerprint/snapshot/validator 与 G0–G7 exact gate set。
- Release：`releases/kindergrimm-2d-v1/`，版本 `1.0.0`，fingerprint `df8ac08c`。
- 库存：7 个 release-owned 文件逐项锁定 bytes + fingerprint；缺失或变化由 verifier 拒绝。
- 自动矩阵：M2 7 schemas / 4 fixtures / 0 failures；M3 9/9；M5 9/9。
- 浏览器索引：Production Studio 与 Runtime SDK 各 desktop / 390 / WebGL-off，共 6 份当前证据。
- Gate：G0 Goal 到 G7 Release 8/8 PASS；Pack `a96d877a`、Renderer `32d9c2cf`、SDK `0.1.0`。
- 来源：上游固定提交与 Unlicense、局部 authored paths、0 runtime LLM / 0 cloud API、AI/3D 排除边界已入 release。
- 防篡改：Release Manifest inventory 变化导致 top-level fingerprint mismatch。
- 单命令：`node projects/kindergrimm/scripts/verify-release.mjs`，8/8 checks PASS。
- 合同：`analysis/m6-quality-release-delivery-contract.md`，10/10 PASS。

## v1 closure

M0–M6 已完成目标中的证据基线、架构锁定、核心合同、自有独立 2D Pack、生产前端、运行时 SDK、质量审查与研究发布。M7 AI 与 M8 3D 均为 decision-gated 后续项目，不属于本次 v1 完成条件，也不会影响无 AI 的确定性 2D 主流程。
