# Content Packs v0.4：可替换视觉语法与场景消费合同

## Design contract

```text
Entry mode: Revision-led / direct continuation
Request revision: R5 — 从固定 KinderGrimm 内容进入可替换、可验证、可携带的 art-direction content pack
Target user and context: 需要持续生产风格一致的 NPC 批次，并把“这一批属于什么视觉方向”交给场景与下游工具的美术技术人员
Desired first impression: 这不是给现有页面换一个颜色，而是把风格约束变成有身份、有版本、有来源的生产输入
Visual ambition: Functional + Editorial
Experience architecture: Hybrid Workspace
Visual constraints: 保留现有工厂/场景深色系统；内容包身份在生成控制、批次状态、Inspector 与场景 HUD 中可见；不只依赖颜色表达
Information constraints: 显示 pack id、版本、原型/上游状态、物种范围、媒介范围、色彩策略与 provenance；明确它是 art-direction rules，不是假装全新渲染后端
Operation constraints: 纯浏览器；无后端、账号、LLM 或新依赖；默认 original 路径向后兼容；自定义 pack 进入 Manifest 与 ZIP
State constraints: original / research pack；pack valid / invalid；Seed 重建；Manifest imported；错误不破坏当前场景
Environment constraints: 统一 8882 HTTP；1440、900、390；键盘；reduced-motion；WebGL 降级
Primary journey: 选择内容包 → 用同一 Master Seed 批量生成受约束角色 → 导出 Manifest/ZIP → 场景导入 → 验证并显示 pack 身份 → 恢复 Seed
User-defined phases:
  1. 展示已有能力
  2. 驱动继续生产类似能力做技术扩展
  3. 分析使用场景并构建场景演示
Required artifacts:
  - content pack schema、built-in registry、validator 与 deterministic resolver
  - Original 与一个明确标注 research-prototype 的本地 pack
  - 工厂 pack 选择、约束摘要、Manifest/ZIP 携带
  - 场景 pack 校验、来源展示、错误保持与 Seed 恢复
  - 文档、浏览器证据、最终审计
Autonomy authorization: 用户再次明确“继续”；沿上一阶段已经说明的自有视觉语法方向直接实施
User-decision boundary: 研究 pack 只验证架构，不代表最终品牌定稿；正式品牌命名、训练/生成图片、后台内容库、第三方引擎插件、3D glTF 不在 v0.4
Observable completion criteria:
  - 同一 Seed + 同一 pack 两次生成的 fingerprints 完全一致
  - research pack 的每个 Recipe 都满足声明的 species/media/color 约束
  - original 默认路径保持 v0.3 的 12 fingerprints 与双条目 ZIP
  - research pack Manifest 带完整 pack snapshot；ZIP 增加 content-pack.json 且 CRC 有效
  - 场景导入后 source=imported、pack id 可见、8 actors 与文件 fingerprints 一致
  - 篡改 pack id 或约束的 Manifest 被拒绝，当前场景保持
  - 1440/900/390、键盘、reduced-motion 与 WebGL fallback 可用
Coverage record: 见下表
```

## Hybrid workspace revision

```text
Factory scene action: 内容包先于批次数量，是生成约束的一部分；角色卡仍是主要视觉证据
Factory detail action: Inspector 显示当前资产 Recipe；pack 摘要解释允许集合与来源
Scene action: 运行构图、选角和动作保持不变；HUD 与来源面板同时显示 pack identity
State-to-scene mapping:
  original → ORIGINAL / UPSTREAM CONTENT
  research pack → RESEARCH PACK / MOSS-LIGHT WAYSTATION
  imported → IMPORTED JSON + pack id
  invalid → REJECTED，当前场景、选角和 pack identity 均保持
Mobile transformation: 内容包选择与摘要在 Master Seed 后单列出现；场景保持画面优先、pack 详情随后
Fallback: 无 WebGL 时仍可选 pack、生成 Recipe、导出 JSON、导入 Manifest、显示 roster 与 pack identity
```

## Design direction

| 决策 | 选择 | 可观察约束 | 验收 |
| --- | --- | --- | --- |
| 内容包层级 | 生产输入，不是后期滤镜 | 选择 pack 会改变 Recipe 允许集合 | 生成结果逐项满足 pack constraints |
| 原型方向 | `mosslight-waystation` / 苔光旅站 | human/cat/dog；watercolor/ink；color；服务型角色语义 | 页面明确显示 research-prototype，不宣称品牌定稿 |
| 可携带性 | Manifest 嵌入 snapshot；custom ZIP 另含 content-pack.json | 场景只依赖 Manifest 即可验证与重建 | 解压/跨页面不依赖内存 registry |
| 向后兼容 | Original 为默认 pack | 旧 URL、旧 fingerprint、双条目 ZIP 不变 | v0.3 默认测试向量继续通过 |
| 状态反馈 | 名称、标签、说明和边框共同表达 | 不依赖绿色/橙色区分 pack | 键盘与非视觉语义可读 |

## Coverage manifest

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | v0.3 基线保持 | factory + scene / original | 12 unique；首项 `9b8ee20e`；ZIP 2 entries / CRC pass；scene 8 actors / deterministic | 1 | pass | — |
| 2 | Pack schema 与 registry | runtime / unit | Original `7d63c5ae` + Mosslight `27b6349f` 可枚举且均通过 snapshot 校验 | 1 | pass | — |
| 2 | 确定性约束解析 | runtime / repeated input | Mosslight 两次得到同一 12 fingerprints；12/12 满足 species/media/color 约束 | 1 | pass | — |
| 2 | 工厂选择 pack | factory / original + research | 真实 select 切换；摘要、锁定控件、批次状态、Inspector 与 12 张角色卡同步 | 4 | pass | — |
| 2 | Manifest 携带 | factory / JSON | snapshot、provenance、constraints、pack fingerprint 与 batch 一致 | 5 | pass | — |
| 2 | ZIP 携带与兼容 | factory / bundle | Original 430192 bytes / 2 entries；Mosslight 375370 bytes / 3 entries；全部 CRC pass | 5 | pass | — |
| 3 | 场景消费 pack | scene / imported | File change 导入后 `source=imported`、pack `27b6349f`、8 actors 与前八 fingerprints 一致 | 5 | pass | — |
| 3 | Pack 篡改拒绝 | scene / error | forged id 被拒为 `expected c3ce419a`；8 actors、选角与原 pack 保持 | 6 | pass | — |
| 3 | Seed 恢复 | scene / recovered | 真实按钮与 Tab+Enter 均恢复 Seed；Mosslight 与 8 fingerprints 不变 | 6 | pass | — |
| 全部 | 键盘与状态语义 | keyboard | pack selector、file input、恢复按钮均得到 3px `#efaa88` focus-visible | 7 | pass | — |
| 全部 | 跨视口与能力降级 | 1440 / 900 / 390 / webgl off / reduced motion | 0px 横向溢出；WebGL off 保留 12/8 Recipe 与 pack；reduced motion 自动暂停 | 7/8 | pass | — |
| 全部 | 工程与文档 | syntax / HTTP / contracts | 6 个 JS syntax pass；4 个路由 HTTP 200；上游 status 空；0 continue | 9 | pass | — |

## Baseline record

```text
Timestamp: 2026-08-24 Asia/Shanghai
Command: .\projects\kindergrimm\scripts\npc-factory.ps1
Factory URL: http://127.0.0.1:8882/projects/kindergrimm/npc-factory/
Scene URL: http://127.0.0.1:8882/projects/kindergrimm/npc-scenarios/?seed=240824
Viewport/theme: Chromium default desktop / dark
Factory: 12 generated / 12 unique / selected 9b8ee20e / no overlay
Original bundle: 430192 bytes / PK0304 / manifest.json + spritesheet.png / CRC pass
Scene: 8 fingerprints unchanged / 8 actors / 114 part planes / deterministic true / no overlay
Decision: pass — preserve as v0.4 compatibility vector
```

## Final verification record

```text
Timestamp: 2026-08-24 Asia/Shanghai
Mosslight factory: 12 generated / 12 unique / constraints true / pack 27b6349f
Mosslight fingerprints: e4bdc857, a5b0cdfd, 42f0408c, f2721c3a, fde2b9ab, 72b9e543, dd899c7e, 19dbeb43, acb75542, ff14b20f, 33d6b190, ba5506fc
Mosslight ZIP: 375370 bytes / manifest.json + spritesheet.png + content-pack.json / all CRC valid
Imported scene: 8 actors / 118 part planes / 238 draw calls / exact first 8 fingerprints
Responsive: 1440, 900 and 390 verified; no horizontal overflow
Accessibility: pack select, hidden file input label and restore action verified with real Tab/Enter
Fallback: factory WebGL off keeps 12 Recipe + Manifest; scene WebGL off keeps 8 Recipe + roster; reduced motion pauses animation
Engineering: node --check 6/6; HTTP 200 4/4; upstream submodule worktree clean
Decision: pass — v0.4 content-pack production and consumption contract is complete
```