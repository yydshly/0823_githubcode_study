# Signal Experience Lab

项目宏观目标是：**用户描述一个期望的想法，系统以最终呈现质量为准，按需分析效果、生成或组织素材，并构建新的、可运行且可继续修改的 Three.js 网页体验**。Kage 只提供早期研究线索；固定 Demo、基础图形目录和单一模板都不是产品输出。

本实验室只继承配置化叙事、滚动导演、DOM/WebGL 分层、质量档、减弱动效与语义回退等行为需求，不导入或复制上游代码、图片、字体和视觉母题。
当前“描述 → 当前结果可见 → 条件式素材门禁 → Codex 专属网页 → 浏览器精修”的收口与真实验证见 [Core creation loop return R29](docs/CORE-CREATION-LOOP-R29.md)。
总体目标、架构选择、核心中间表示、质量门禁和实施路线统一记录在 [Goal-driven Three.js generation architecture](docs/PRODUCT-ARCHITECTURE.md)。
素材如何从“通用清单”升级为可驱动开场、变化和收束的动态体验合同，见 [Dynamic asset narrative R37](docs/DYNAMIC-ASSET-NARRATIVE-R37.md)。

## 版本状态

- **V1 已归档**：完整能力、耗时基线与六个最终案例保持可复现，见 [V1 baseline](docs/releases/V1-IDEA-TO-EXPERIENCE-BASELINE.md)。
- **V1 已独立部署**：静态演示源码位于 `pages/v1/`，不依赖本地 API 即可运行六个归档 bundle。
- **V2 独立推进**：V2 复用稳定 runtime/schema，但使用独立入口和创意合同，见 [V2 reference-guided contract](docs/V2-REFERENCE-GUIDED-CREATIVE-CONTRACT.md)。
- **问题已冻结**：模型编写和开放式精修是主要耗时，详见 [V1 performance and gaps](docs/releases/V1-PERFORMANCE-AND-GAPS.md)。


## 本地运行

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 8143
```

生产构建、单元/边界测试和浏览器测试：

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:browser
```

## 当前可运行基线

**主演示：**直接打开根路径 `/`。默认体验 `resonance-flagship`（《声之形》）不是基础图形模板，而是 ChatGPT 直接生成的主视觉 + 对齐深度图，经 Three.js shader 位移、滚动镜头、指针视差与质量感知 Bloom 形成的资产驱动产品现场。素材缺失会明确报错，不会静默替换成程序化 Demo；`renderer=none` 时从 Manifest 读取同一张真实主视觉作为语义回退背景。生成来源与完整提示词见 [ChatGPT resonance asset pair v1](docs/assets/chatgpt-resonance-v1.md)。

主演示当前素材成熟度为 `L3-presentable`：足以承担网页主视觉，但不冒充可自由环绕的真实 3D 产品模型或 `L4` 近景资产。视觉契约与验收记录见 [Flagship refinement record](docs/FLAGSHIP-REFINEMENT.md)。

**当前最终专属页面：**打开 /cases/dedicated-r36-delivery-final/?quality=high。该页面使用开场种荚、纤维转化和成熟温室三类不同职责的生成素材，由 Three.js 完成连续融合、微动和滚动导演；它同时通过机械门禁与独立 Codex 最终视觉验收。完整证据见 [Final visual acceptance R36](docs/FINAL-VISUAL-ACCEPTANCE-R36.md)。

**自然语言创意工作台：**打开 workbench.html。

- 首屏现在是一个同源实时创意舞台，可直接切换三个完整网页：资产驱动的《声之形》、生成环境驱动的《潮汐记忆档案》和纯 Shader 的《流体色场》。它们采用不同的主体、空间隐喻、构图、素材策略与运动语言；技术推断和能力缺口已折叠为高级信息。

- 输入目标、受众与氛围，得到可检查的效果方向；当前本地兼容层仍产生 `focus / journey / branching`，它们不是长期产品约束。
- 每个候选现在同时包含 `EffectSpec`、`AssetPlan`、`ProductionPlan`、`CapabilityPlan` 与 `ExperienceManifest`，可以分别检查效果目标、素材缺口、模型适配、运行成本和最终体验图。
- 工作台比较核心记忆点、效果层和素材路线，再进入真实 Three.js 预览，不再把 Demo/插件名称当作用户选择目标。
- 首次进入仍使用 `baseline-keyword-v1`，完全本地且不会产生模型调用。
- 明确点击生成后可选择 `Auto / Codex / MiniMax / OpenAI / 本地基线`，结果显示实际 provider、模型、延迟和回退原因。
- Codex/MiniMax 默认直接生成一个最佳目标驱动 `EffectSpec`，不再为展示数量而生成次优候选，也不选择固定拓扑或 Demo 插件；所有结果仍经过 Zod、素材、生产、manifest 与能力预算校验。
- 远程模型分析按 provider、model、描述和 seed 持久化缓存；同一输入可复用，点击“生成新变体”才会主动递增 seed。
- 模型 `EffectSpec` 现在编译为 `ComposedSceneRecipe`，由 `composed-world` 插件组合主体、材质、实例场、氛围和运动；未生产素材数量会显式保留。
- 当所选 `EffectSpec` 声明 image / texture / sprite 需求且 MiniMax 已配置时，工作台可显式调用 `image-01`，把 base64 结果校验并物化到本地缓存，再重编译为 `resonance-flagship` Three.js 预览。
- 外部素材需求可声明 0–1 时间锚点、视觉功能、目标画面、连续性和融合方式；数量由 brief 决定。生成的多张素材会全部进入 Manifest，并按时间锚点传给 Codex。关键素材没有在最终代码中实际使用时，专属构建不会通过。
- Codex 与 MiniMax 的职责独立记录：语言模型负责意图、EffectSpec 与代码方向，`minimax-image-01` 才是图片字节适配器。新素材保持 `L2-inspectable / publishable=false`，不会因为“生成成功”而被冒充为可发布成品。完整契约见 [模型素材生产管线](docs/ASSET-PRODUCTION-PIPELINE.md)。
- 当描述超出现有目录时，工作台会生成不可执行的 `CapabilityProposal`，列出插件契约、质量门禁与建议文件，而不是伪装成已有功能。
- 每条提案都可生成 `SynthesisWorkspace`：按能力类型形成三个内存虚拟文件并完成静态审计；产物明确 `execution=never`、`registration=not-registered`。
- 无 API 也可运行离线质量门：`EvaluationReport v1` 检查跨产物身份、DOM/WebGL 边界、素材与生产状态、能力和负载预算，并可显式采集桌面 WebGL、移动 WebGL 与移动回退的真实运行快照。构图、记忆点和材质仍标记为 `manual-required`，不伪造视觉判断。工作台还可把强调色、页面标题和节奏指令编译成有差异证明的局部修订；不支持或有歧义的描述不会改变候选。完整边界见 [离线评审与修订闭环](docs/EVALUATION-REVISION-LOOP.md)。

使用 `experience` 参数切换体验：

- `resonance-flagship`：默认主演示，模型彩色/深度资产对、shader 深度视差、滚动导演和受控 Bloom。
- `tidal-archive`：ChatGPT 生成水下记忆环境与对齐深度图，叠加玻璃档案片、关系线、水体粒子和克制滚动镜头。
- `observatory`：品牌信号观测站，4 节点线性体验。
- `archive`：数字展陈，4 节点线性体验。
- `explainer`：技术解释，4 节点线性体验。
- `single-hero`：1 节点、3 个内部关键帧，证明节点不等于静态画面。
- `long-form`：9 节点长叙事，证明运行时不假设固定长度。
- `branching-lore`：5 个图节点、每次选择得到 4 节点流程；`choice=shadow|luminous` 控制路径。
- `chromatic-tide`：Shader 光幕、折光核心和编辑化色场，验证第二种视觉语法。
- `composed-world`：EffectSpec 场景语法演示，组合 knot 主体、emissive 材质、stream 实例场与质量档降级。

其他确定性参数：

- `node=<node-id>`：深链接到当前流程中的节点。
- `quality=auto|high|balanced|low`
- `motion=system|full|reduce`
- `renderer=webgl|none`
- `debug=1`

旧参数 `story` 和 `chapter` 暂时保留为兼容别名。仅在 `debug=1` 时暴露只读的 `window.__signalLab.snapshot()`，供回归与架构检查使用。

## 当前架构

```text
CreativeBrief -> IntentEvidence -> EffectSpec[]
                                  ├─> dynamic asset experience contracts -> AssetPlan + runtime CapabilityPlan
                                  ├─> ProductionCapabilityProfile -> ProductionPlan
                                  ├─> persistent analysis cache
                                  ├─> ComposedSceneRecipe -> ManifestCompiler -> Workbench -> preview
                                  ├─> missing capability -> CapabilityProposal -> SynthesisWorkspace
                                  └─> AssetGenerator -> role-aware bounded MiniMax media generation -> local materialization
                                                        -> multi-asset Manifest integration -> Codex dedicated build
                                                        -> required usage gate -> independent visual acceptance
                                  └─> RuntimeEvidenceCollector -> OfflineEvaluator -> EvaluationReport
                                                                        -> RevisionPlan -> LocalRevisionResult -> revised preview

ExperienceManifest v2
  ├─ nodes + flows ──> validator ──> FlowPlan
  ├─ cameraTracks ─────────────────> Camera Director
  ├─ sceneTracks ──────────────────> Scene State Director
  ├─ drivers ──────────────────────> Scroll Driver
  └─ scenes/effects ──> Plugin Registry ──> ExperienceRuntime
                                                ├─ DOM remains semantic
                                                └─ Three.js renders atmosphere
```

关键边界：

- `ExperienceManifest` 是生成、编辑、校验和保存的中间表示，不直接生成散乱业务代码。
- `EffectSpec` 记录目标、核心记忆点、空间隐喻、DOM/WebGL 分工、效果层、镜头、交互和抽象素材需求。
- `AssetPlan` 记录素材生成路线、L0-L5 成熟度、候选来源、许可、负载、回退与发布状态；缺失素材不会被伪装成已有文件。
- `FlowPlan` 将图解析为本次可重放路径；分支选择不会污染渲染循环。
- Driver 只产出进度与活动节点，不知道镜头、场景和页面必须有几段。
- Camera/Scene Track 使用稳定 ID 与关键帧，不以数组下标耦合内容。
- `ExperienceRuntime` 只负责 WebGL 生命周期、相机、质量和渲染；视觉世界由 `ScenePlugin`、`EffectPlugin` 注册。
- `ComposedSceneRecipe` 是从效果目标到可执行场景的受限语法，不是页面模板；主体、场域、氛围和运动可以独立组合。
- `CapabilityCatalog` 与 `CapabilityPlan` 检查运行时插件、设备模式和画质预算。
- `ProductionCapabilityProfile` 只声明项目已经接入的模型、媒体与评审适配器，不把 provider 的潜在能力当成已实现能力。
- `ProductionPlan` 把每项需求变成直接使用、生成、替代、降级或阻断任务，并记录对最终效果的影响。
- `SynthesisWorkspace` 只保存内存虚拟文件与静态审计结果；通过审计不等于实现、运行或注册。
- `EvaluationReport` 不生成无证据审美分数；自动证据、真实浏览器证据和人工视觉判断保持可区分。
- `RevisionPlan` 以失败/未决检查为来源，记录目标产物、层、预期可见差异和 `none / partial / full` 重生成范围。
- 无 WebGL、减弱动效和质量档是正式输出模式，不是错误页面。

## 如何扩展

- 新体验：添加一个通过 `assertExperienceManifest` 的 manifest，不改运行时。
- 新视觉方向：实现并注册新的 `ScenePlugin` 或 `EffectPlugin`，不要向核心运行时增加 preset 分支。
- 新交互方式：实现新的 Driver，将其输出统一为节点 ID、局部进度和全局进度。
- 新生成能力：实现新的 `BriefInterpreter`；模型只提出结构化方向，仍必须经过编译、校验、预算与预览。

- 新素材能力：实现 `AssetGenerator`，让图片、纹理、3D、角色、环境、音频或视频生成结果进入同一质量与来源门禁。
- 新评审能力：实现 `Evaluator`，输出可复现的结构、代码、视觉、性能、可访问性或发布证据。
- 新产品路线：实现 `PatternRouter`，在产品页、查看器、影片、作品集、配置器、角色或真实场景之间选择，而不是复制页面模板。
当前已实现离线基线、Codex CLI、MiniMax、可选 OpenAI provider、模型直接 `EffectSpec v1`、持久化分析缓存、`ComposedSceneRecipe`、`AssetPlan v1`、`ProductionCapabilityProfile v1`、`ProductionPlan v1`、可重放的 MiniMax `image-01` AssetGenerator、本地素材物化与缓存、生成素材到旗舰场景的 Manifest 集成、候选多样性门禁、能力缺口提案、不执行/不注册的虚拟合成工作区、两个物化的模型彩色/深度资产体验、三方向实时创意舞台、离线 `EvaluationReport v1 -> RevisionPlan v1` 质量门，以及 `RuntimeEvidenceBundle v1 -> LocalRevisionResult v1` 的无 API 局部修订闭环。模型缺失能力会被显式生成、替代、降级或阻断，详见 [模型能力适配](docs/MODEL-CAPABILITY-ADAPTATION.md)。真实 Codex 非模板化 EffectSpec 证据见 [Phase 6](docs/PHASE6-DIRECT-EFFECTSPEC.md)，缓存与组合场景证据见 [Phase 7](docs/PHASE7-CACHED-COMPOSED-SCENES.md)。下一门禁回到核心产品：让 Codex/MiniMax 从想法直接规划并合成新的页面结构、素材路线与场景实现，生成结果继续进入同一个实时舞台；真实 MiniMax 联网验证仍需配置 `MINIMAX_API_KEY`。

视觉证据：[R11 创意舞台桌面](docs/screenshots/phase11-creative-stage-desktop.png) · [R11 创意舞台手机](docs/screenshots/phase11-creative-stage-mobile.png) · [潮汐记忆完整网页](docs/screenshots/phase11-tidal-archive-desktop.png) · [旗舰桌面首屏](docs/screenshots/flagship-desktop-hero.png) · [旗舰深度状态](docs/screenshots/flagship-desktop-depth-state.png) · [旗舰移动低画质](docs/screenshots/flagship-mobile-low.png) · [运行证据与局部修订手机](docs/screenshots/phase10-runtime-revision-mobile.png) · [离线评审手机](docs/screenshots/phase9-offline-evaluation-mobile.png) · [模型素材生产完成态](docs/screenshots/phase8-asset-production-ready.png) · [模型素材生产移动端](docs/screenshots/phase8-asset-production-mobile.png) · [Shader 色潮](docs/screenshots/phase1-chromatic-tide.png) · [EffectSpec 组合场景](docs/screenshots/phase7-composed-world.png)

运动架构与验收：[R12 电影化指针与滚动精修](docs/MOTION-REFINEMENT-R12.md) · [R12 真实浏览器运动状态](docs/screenshots/phase12-motion-desktop.png)。
R13 体验与工作流：[四阶段场景节奏与创作者五步工作流](docs/EXPERIENCE-WORKFLOW-R13.md) · [旗舰章节桌面](docs/screenshots/phase13-flagship-desktop.png) · [工作台调整桌面](docs/screenshots/phase13-workbench-desktop.png) · [工作台调整手机](docs/screenshots/phase13-workbench-mobile.png)。

本目录没有获得 Kage 原项目的代码或美术再分发授权；实验室不应被描述为法律意义上的 clean-room 认证结果。
