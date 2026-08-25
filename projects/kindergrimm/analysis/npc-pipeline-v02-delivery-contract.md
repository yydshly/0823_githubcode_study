# NPC Pipeline v0.2：资产交付与场景消费合同

## Design contract

```text
Entry mode: Revision-led / direct continuation
Request revision: R3 — 从 NPC 预览工厂进入批量交付与运行时消费
Target user and context: 需要把程序化角色交给游戏、互动叙事或内容工具使用的美术、策划和前端技术人员
Desired first impression: 同一批 Recipe 已经能从“生成结果”进入“可交付资产”和“真实运行场景”
Visual ambition: Immersive + Functional
Experience architecture: Hybrid Workspace
Visual constraints: 延续现有深色研究工作台与纸张角色；场景是视觉中心；状态不可只依赖颜色
Information constraints: 明确资产来源、上游提交、Recipe 身份、运行时角色、场景用途和性能边界
Operation constraints: 静态浏览器应用；不修改上游；不引入后台、账号、远程 API 或新依赖
State constraints: 场景构建中、可操作、选中 NPC、模式切换、动画暂停、WebGL 降级、导出成功/失败
Environment constraints: 根目录 HTTP 服务；桌面、平板和 390px 手机；深色主题；reduced-motion
Primary journey: 生成确定性批次 → 导出 batch manifest / spritesheet → 在场景中用相同 Seed 重建 → 切换用途并检查角色
User-defined phases:
  1. 继续生产类似能力，形成技术扩展
  2. 分析使用场景并构建真实场景演示
Required artifacts:
  - 可复用的确定性 Recipe 核心模块
  - Batch Manifest JSON 导出
  - 透明 Sprite Sheet PNG 导出及布局元数据
  - 直接消费上游 buildCharacter/createAnimator 的场景演示
  - 至少三种用途模式及选中/暂停/重建操作
  - 资产来源、表示类型和运行时指标
  - 启动入口、浏览器证据与交付说明
Autonomy authorization: 用户明确“继续”，且上一阶段已授权持续建设
User-decision boundary: 后台资产库、正式游戏 SDK、ZIP 压缩、GLB/FBX、联网 AI 和自有视觉内容包不在 v0.2
Observable completion criteria:
  - Factory 与 Scene 使用同一 deriveRecipe/fingerprint 实现
  - 同一 Master Seed 在两个页面重建相同前 8 个 fingerprint
  - spritesheet 尺寸、透明背景、格子数及 manifest 布局一致
  - 场景包含 8 个真实角色，并能切换 waystation / encounter / council
  - 场景选中、暂停、重建可通过鼠标和键盘完成
  - WebGL 失效时 Recipe roster 与场景说明仍可操作
  - 桌面、平板、390px 手机无横向溢出；reduced-motion 不丢失信息
Coverage record: 见下表
```

## Hybrid workspace

```text
Scene base: WebGL + semantic DOM roster
Scene operations: 用途模式切换、Seed 重建、暂停动画、画布点选
Detail flow: 角色 roster、角色身份/来源/Recipe 指纹和消费建议
State-to-scene mapping:
  building → 状态提示与禁用重建
  active → 8 个真实动画角色与用途构图
  selected → WebGL 选择标记 + DOM Inspector 同步
  paused/reduced-motion → 定格角色并保留全部操作与说明
  fallback → 无画布角色但保留 8 个 Recipe roster、角色选择和用途说明
Mobile transformation: 场景先行，控制条紧随；roster 与 Inspector 进入普通详情流，不依赖隐藏抽屉
Fallback: WebGL 不可用时以语义角色卡替代场景增强层
```

## Coverage manifest

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 共享确定性核心 | source / runtime | 两页共同 import `runtime/npc-core.js`；Seed 240824 前 8 个 fingerprint 逐项一致 | 1 | pass | 完成 |
| 1 | Batch Manifest | factory / export | schema 0.2；12 assets / 12 unique；input、来源、sheet metadata 完整 | 5 | pass | 完成 |
| 1 | Sprite Sheet | factory / export | 1024×768、4×3、256px tile、12 格、角像素 alpha=0 | 5 | pass | 完成 |
| 1 | 表示与来源记录 | manifest / scene | procedural 2D CanvasTexture、固定 commit、Unlicense、LLM/API=0 | 3 | pass | 完成 |
| 2 | 真实运行场景 | desktop / active | 8 actors、114 part planes、buildCharacter + createAnimator、约 230 draw calls | 5 | pass | 完成 |
| 2 | 三种用途模式 | waystation / encounter / council | 暮色旅站、林缘遭遇、旧塔议事的标题/构图/姿态/说明同步变化 | 6 | pass | 完成 |
| 2 | 选中与检查 | pointer / keyboard | 画布聚焦后 ArrowRight 选中 Kite-03，Enter 触发 attack；Inspector 同步 | 5 | pass | 完成 |
| 2 | 暂停与 reduced-motion | active / paused | 暂停按钮进入 pressed；reduced-motion 重载后 paused=true、继续动画可见 | 6 | pass | 完成 |
| 全部 | WebGL 降级 | `?webgl=off` | 8 Recipe roster、council 切换、Dusk-06 选择正常；actors=0 | 8 | pass | 完成 |
| 全部 | 跨视口 | 1440 / 900 / 390 | 三视口均无横向溢出；桌面、遭遇、移动端最终截图 | 7 | pass | 完成 |
| 全部 | 工程与复现 | source / HTTP / README | 三文件语法通过、两路 HTTP 200、统一启动脚本、上游工作树纯净 | 9 | pass | 完成 |

## Design direction

| 决策 | 方向 | 验收 |
| --- | --- | --- |
| 场景焦点 | 纸张质感 WebGL 舞台占主视区 | 首屏能看见角色、用途模式和状态 |
| 资产身份 | fingerprint 是资源 ID，role 是场景运行时状态 | 不把角色职业重复写进 Recipe |
| 导出格式 | manifest 描述资源与 sheet 布局，PNG 只承载像素 | 运行时事实不藏在文件名里 |
| 表示选择 | 手绘角色保持 2D/2.5D，不伪装为 3D 网格 | provenance 明确标记 procedural 2D |
| 动效 | 上游 animator 提供生命感；暂停与 reduced-motion 可用 | 无动画时仍可完成选择与理解 |
