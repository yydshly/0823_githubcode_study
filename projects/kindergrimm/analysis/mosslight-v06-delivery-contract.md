# Mosslight v0.6：十二部件自有视觉套件交付合同

## Design contract

```text
Entry mode: Revision-led / direct continuation
Request revision: R7 — 从 v0.5 三部件 decorator 扩展为可审查、可迁移、可预算的十二部件自有视觉套件
Target user and context: 需要判断 KinderGrimm 是否能持续生产成套视觉能力的技术美术、游戏原型和内容工具团队
Desired first impression: Mosslight 不再只像三个悬浮装饰，而是从头部、面部、身体、脚下到环境形成一致的角色套件
Visual ambition: Editorial + Immersive evidence
Experience architecture: Hybrid Workspace
Scene base: Canvas 2D textures composed in Three.js/WebGL
Scene persistence: 工厂预览和运行场景继续承担主要视觉证据；文档流解释覆盖、来源与边界
Foreground control model: Pack 选择、覆盖摘要、导出、Manifest 导入、模式切换和 Inspector
State-to-scene mapping: Original → upstream base；Mosslight v0.6 → 12 authored parts；v0.5 imported → 3 authored parts；invalid → current scene preserved；WebGL off → metadata/roster fallback
Mobile transformation: 工厂按控制→批次→Inspector 排列；运行场景保持舞台优先，覆盖数据随后
Fallback: 无 WebGL 时仍显示 Recipe、renderer、part coverage、Manifest、roster 与 Inspector；PNG/sheet/ZIP 视觉导出关闭
Visual constraints: 保留现有暗色工作台和纸张角色画布；新增部件必须进入真实 rig；不以页面换色或滤镜冒充资产变化
Information constraints: 显示 renderer version/fingerprint、12-part coverage、每资产 part count、场景 authored-plane count；区分 v0.5 三部件兼容路径
Operation constraints: 纯浏览器、无后端、无 LLM、无远程素材、无新增依赖；Original 完全兼容
State constraints: Original / v0.6 built-in / v0.5 imported；generated / imported / rejected / recovered；WebGL on/off；motion normal/reduced
Environment constraints: canonical 8882 HTTP；1440×900、900×900、390×844；键盘；reduced-motion；WebGL off；dark-only product boundary
Primary journey: 选择 Mosslight → 生成 12-part visual record → 审查覆盖 → 导出 Manifest/ZIP → 场景导入并重建 96 authored planes → 篡改拒绝 → 恢复 Seed
User-defined phases:
  1. 展示已有能力
  2. 驱动继续生产类似能力做技术扩展
  3. 分析使用场景并构建场景演示
Required artifacts:
  - v0.2 renderer descriptor、12-part registry、确定性 variant 与 visual fingerprint
  - 九个新增 CanvasTexture 部件，连同 v0.5 三部件真实进入工厂/场景
  - v0.5 Manifest 精确兼容与 v0.6 Manifest/ZIP 防篡改
  - 工厂覆盖摘要、场景 authored-plane 证据、作者指南、展示页、截图与最终审计
Autonomy authorization: 用户再次明确“继续”；沿已交付 v0.5 的建议方向直接实施，不重复确认可逆的范围内决策
User-decision boundary: v0.6 仍是混合 decorator；完整替换上游 20 个主体部件、正式品牌定稿、3D glTF、训练模型、后台资产库不在本阶段
Observable completion criteria:
  - Original 的 12 recipe fingerprints、首项预览与 430192-byte 双条目 ZIP 保持兼容
  - 精确 v0.5 pack `f78b264d` / renderer `f7d84f29` Manifest 仍验证并重建 3 parts/actor，首项 visual `aef31a9b`
  - v0.6 descriptor 声明 12 个稳定 part id；每个 Mosslight 资产记录 12 parts，同输入两次 visual fingerprints 一致
  - 工厂 hero/cards/Inspector/PNG/sheet 与场景 actor 使用同一 12-part pipeline
  - 场景 8 actors 产生 96 authored planes；总 draw calls 不超过 450；三次热重建中位数低于 500ms
  - v0.6 ZIP 三条目 CRC 全部有效；Manifest 携带 renderer snapshot、coverage 与 12 visual fingerprints
  - 篡改新增 part coverage 或 visual fingerprint 被拒绝，当前场景保持；键盘恢复 Seed
  - 1440/900/390、键盘、reduced-motion、WebGL off、页面错误与工程检查均有真实证据
Coverage record: 见下表
```

## Asset representation decision

| 资产需要 | 选择 | 原因 | 明确边界 |
| --- | --- | --- | --- |
| 主体解剖、姿势、表情 | 上游 procedural 2D rig | 保留成熟锚点与动画，避免假装重建完整角色系统 | 不是本地原创主体 renderer |
| 十二部件视觉套件 | 12 个本地 deterministic CanvasTexture planes | 具名、可变体、可携带、可测预算，能进入 PNG/sheet/场景 | 是 hybrid decorator，不是后期截图滤镜 |
| 套件覆盖与迁移 | descriptor features + version-aware visual record | v0.5 三部件和 v0.6 十二部件可由 Manifest 自描述重建 | 不用内存 registry 偷换旧资产含义 |
| 3D/碰撞 | v0.6 不实现 | 纸片视觉套件不提供隐藏几何或碰撞体 | 不称为 glTF、FBX 或 3D 建模 |

## Design direction

| 决策 | 方向 | 可观察约束 | 验收 |
| --- | --- | --- | --- |
| 视觉层级 | 角色画布第一，覆盖数据第二 | 不新增与视觉证据竞争的大面板 | 1440 首屏仍先看到角色批次/场景 |
| 套件语法 | head / face / body / ground / ambient 五组 | 每组至少一个真实 part；总数 12 | descriptor、Visual Record 与 rig entries 一致 |
| 密度 | 新部件围绕轮廓和身份锚点，避免覆盖表情 | 眼睛、嘴与主体轮廓仍可读 | hero 与 8 人场景人工审查通过 |
| 兼容 | renderer id 不变、version 递增、record 按 descriptor features 生成 | v0.5 old snapshot 不获得新增 parts | 旧 Manifest 保持原 visual fingerprint |
| 性能 | 以真实 plane/draw-call 数量换取可审查能力 | 场景 ≤450 calls；热重建 median <500ms | 浏览器三次采样 |

## Coverage manifest

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | v0.5 可运行基线 | factory + scene / Mosslight | pack `f78b264d`；renderer `f7d84f29`；12 visual FP；3 parts/asset；scene 24 authored planes / 286 calls；411594-byte ZIP / CRC | 1 | pass | — |
| 2 | renderer v0.2 与 12-part registry | runtime / schema | pack `a79de443`；renderer `091c354d`；12 stable ids；5 groups；coverage 恰好一次 | 1/2 | pass | — |
| 2 | 九个新增真实部件 | runtime / repeated build | 每资产 12 entries；首项 visual `722d4014`；两次生成一致；hero/cards 可见 | 2 | pass | — |
| 2 | v0.5 精确迁移 | runtime + scene / imported | old pack/renderer/first visual 保持；3 parts/actor；24 authored planes；142 total / 286 calls | 5/6 | pass | — |
| 2 | 工厂 coverage 审查 | factory / v0.6 | pack、cards、Inspector 显示 12 parts / 5 groups；PNG、1024×768 sheet 与 Bundle 共用 pipeline | 3/4/5 | pass | — |
| 3 | 场景 96-plane 消费 | scene / Seed + imported | 8 actors；96 authored / 214 total planes；12 parts/actor；430 calls | 5 | pass | — |
| 3 | 篡改拒绝与恢复 | scene / invalid + recovered | Visual FP tamper rejected；Seed scene preserved；原 Manifest 与恢复 Seed 均回到 96 authored planes | 6 | pass | — |
| 全部 | 跨视口/键盘/locale | 1440 / 900 / 390 / Chinese labels | 无横向溢出；Canvas 键盘 Arrow/Enter 通过；加长伪本地化无溢出；触控目标 ≥44px | 7 | pass | — |
| 全部 | reduced motion / WebGL fallback | scene + factory | reduced-motion 自动暂停；WebGL off 保留 8 roster、coverage、Manifest 与 Inspector | 8 | pass | — |
| 全部 | 性能预算 | scene / repeated builds | 5 次暖构建 216/229/230/192/221ms；median 221ms；430 calls ≤450 | 8 | pass | — |
| 全部 | 文档、截图与工程 | docs / syntax / HTTP / upstream | 4 张以内新证据；5 个 JS syntax pass；canonical HTTP；0 page errors；上游子模块未修改 | 9 | pass | — |
## Baseline record

```text
Status: pass — Stage 1 browser baseline captured
Canonical command: .\projects\kindergrimm\scripts\npc-factory.ps1
Canonical factory: http://127.0.0.1:8882/projects/kindergrimm/npc-factory/
Canonical scene: http://127.0.0.1:8882/projects/kindergrimm/npc-scenarios/?seed=240824&pack=mosslight-waystation
Observed v0.5 record: pack f78b264d / renderer f7d84f29 / first visual aef31a9b / 3 parts per asset / scene 24 authored planes / 286 calls / 303ms cold build
Observed bundle: 411594 bytes / manifest 86715 + sheet 322381 + pack 2158 / 3 CRC pass
Browser: Chromium 1440×900 / dark / canonical 8882 / no overlay / no page errors
Evidence: transient annotated factory capture in .tmp; remove after final comparison
Historical handoff: Stage 2 — version-aware 12-part runtime kit（已完成）
```

## Final delivery record

```text
Status: pass — v0.6 delivered
Runtime: pack a79de443 / renderer 091c354d / first visual 722d4014
Coverage: 12 stable parts / 5 groups / exactly-once validation
Factory: 12 assets / 12 Visual FP / 12 parts per asset / deterministic pass
Scene: 8 actors / 96 authored planes / 214 total planes / 430 draw calls
Warm builds: 216 / 229 / 230 / 192 / 221ms; median 221ms
Bundle: 469508 bytes / manifest 94702 + sheet 371369 + pack 3097 / 3 CRC pass
Migration: v0.5 pack f78b264d / renderer f7d84f29 / first visual aef31a9b / 24 authored planes preserved
Tamper: visual fingerprint mismatch rejected; current Seed scene preserved; original import and Seed recovery pass
Accessibility/fallback: 1440/900/390 no horizontal overflow; Arrow/Enter pass; reduced-motion pauses; WebGL-off retains 8-role semantic UI
Model/API: 0 runtime LLM calls / 0 cloud generation calls
Boundary: deterministic 2D CanvasTexture kit composed by Three.js; not GLB/FBX or an independent 3D renderer
```