# Kindergrimm Source-first Research Program

> 先完整固定 Kindergrimm 上游原生能力与机制，再建设不重复源库的版本化、可审查、可交付增量。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | <https://github.com/albertobeiz/kindergrimm> |
| 本地上游目录 | `upstream/`（Git submodule，不直接修改） |
| 固定提交 | `5857b1e1cae2713d6714ad7dd7f89626bb242f0f` |
| 上游提交时间 | 2026-08-25；`feat(timeline): six hundred years of painting, walked past` |
| 开始日期 | 2026-08-24 |
| 当前状态 | 第一轮研究完成并按需归档；具体叙事确定后再启动动画生产阶段 |
| 许可证 | Unlicense / Public Domain |
| 研究主入口 | [Source-first Research Atlas](research-atlas/index.html) |
| 当前执行入口 | [Cross-backend Asset Lab](asset-lab/index.html) |
| 在线展示 | [GitHub Pages Research Atlas](https://yydshly.github.io/0823_githubcode_study/projects/kindergrimm/research-atlas/) · [Asset Lab v0.5](https://yydshly.github.io/0823_githubcode_study/projects/kindergrimm/asset-lab/?mode=usage) |
| 研究收束 | [最终结论与再启动条件](analysis/research-closure-summary.md) |
| Program 主计划 | [PROGRAM.md](PROGRAM.md) |
| v2 扩展计划 | [PROGRAM-V2.md](PROGRAM-V2.md) |

## Program v1

North Star：让创作意图、Seed 和 Style Pack 进入版本化合同，经确定性生成核心和可替换 Renderer 生成 PNG、Sprite Sheet、Manifest、ZIP 与未来独立 3D 资产，并被编辑器、游戏、剧情、商店和审查工具稳定消费。

推进以 [PROGRAM.md](PROGRAM.md) 为单一事实来源。同一时间只有一个 ACTIVE 和一个 NEXT 里程碑；每个里程碑必须通过 Contract、Asset、Visual、Portability、Runtime、Budget 和 Release Gate 后才能标记完成。

## Program v2：第二套结构 Renderer 已交付

v1 发布目录和指纹保持冻结。V2-M0 Moonharbor Core 2D 是诚实标注的 Pack Family Variant；V2-M1 Moonharbor Inkcut 2D 已交付独立结构 Renderer；V2-M2 进一步交付 Sunpatch Felt、三风格 × 50 golden、四类 Output Profile、五路线/四输出 Production Studio、三运行场景与可迁移 ZIP。

历史 V2-M3 交付了 Prop、Icon、Scene Component 的确定性合同、四种输出和 ZIP/CRC；但最新上游已经原生拥有 13 个 Item Family、三种对象 Host、Voxel/Gloss/Object 3D 与九个 Style Backend。因此这些素材和风格成果现标记为 `PARALLEL / REASSESS`，保留作为工程对照，不再声称为源库首次能力扩展。

应用证明不再以“素材包陈列”为主：[《风暴前的回信》](story-demo/index.html) 把三处真实 Scene Component、五类 Prop、四位角色、任务、库存、状态后果与双结局组织成可完成的互动故事。三种 Style Grammar 会重绘同一故事并保留进度；固定 Seed 240824，本地 Canvas 2D 运行，runtime LLM 与 cloud API 调用均为 0。

研究主入口现为 [Source-first Research Atlas](research-atlas/index.html)：直接运行最新上游页面，按 `UPSTREAM ORIGINAL → MECHANISM REUSE → OUR EXTENSION → PARALLEL / REASSESS → APPLICATION PROOF` 重新归纳。Scene Studio 与固定故事保留为应用实验，Material Catalog 保留为平行素材实验。

当前执行入口为 [Cross-backend Asset Lab](asset-lab/index.html)：保留 Drawn、Voxel、Gloss 三份角色 Recipe 和 768×768 PNG / Manifest 生产链，并在同一页面扩展为六个源能力模式。风格模式直接展示 6 种媒介与 9 种艺术史样式；道具模式调用源库 `rollItem + thumbFor` 生成 13 家族 × 4 等级的确定性 2D 透明素材；环境模式调用 `buildPlant` 生成 5 类程序化 Three.js 对象并导出透明代理图与 Recipe。页面明确区分真实 2D、程序化 3D 与 PNG 代理，不使用运行时大模型。v0.3 新增场景需求编排：通过可见的场景类型、情绪、环境、交互、角色与 Seed，以本地版本化规则匹配四类源能力，生成五张 PNG 和一份 Scene Manifest；自由文本只作为创作上下文保留，不伪装成大模型语义理解。v0.4 将同一素材计划放入叙事对话、收藏奖励和 3D 世界三个真实消费者；v0.5 增加场景素材需求板，逐项标记源库可直接生产、本层确定性生成和需要新管线的能力缺口，并给出补产方向。

验证命令：

    node projects/kindergrimm/scripts/verify-v2-m0.mjs
    node --experimental-loader ./projects/kindergrimm/scripts/three-loader.mjs projects/kindergrimm/scripts/verify-v2-m1.mjs

完整路线、依赖和门槛见 [PROGRAM-V2.md](PROGRAM-V2.md)。

## 一分钟看懂

Kindergrimm 不是图片素材包，也不是文生图模型。它把角色保存为 JSON recipe，用带种子的规则生成部件参数，再通过四套渲染后端生成资源：

```text
recipe / seed
      ↓
species：改变部件概率
      ↓
parts：生成局部参数
      ↓
layout：统一共享锚点和比例
      ↓
drawn 2D / voxel 3D / gloss 3D / object 3D
      ↓
动画、群像、物品、合影与完整游戏
```

真正可复现的单位是完整 recipe。编辑器处于“物种随机、媒介随机”时，这两项使用 `Math.random()`，所以只重复 seed 不保证完整 JSON 相同；固定物种与媒介后，相同 seed 的完整 recipe 哈希实测一致。

## 本地展示

从仓库根目录运行：

```powershell
.\projects\kindergrimm\scripts\demo.ps1 list
.\projects\kindergrimm\scripts\demo.ps1 serve
```

浏览器打开：

```text
http://127.0.0.1:8137/
```

也可以直接进入 `editor`、`crowd`、`voxel`、`gloss`、`game` 或 `marbles` 等无扩展名路由。

### 本地生产与消费扩展

```powershell
.\projects\kindergrimm\scripts\npc-factory.ps1
```

- `http://127.0.0.1:8882/projects/kindergrimm/npc-factory/`：选择 Original 或研究包“苔光旅站”，批量生成、单资产导出、Batch Manifest、Sprite Sheet 与 ZIP Bundle。
- `http://127.0.0.1:8882/projects/kindergrimm/npc-scenarios/?seed=240824`：同一批 Recipe 的旅站、遭遇和议事运行场景；可验证 Manifest 与内容包并恢复 Seed。

两个页面共同使用 `runtime/npc-core.js`、`runtime/content-packs.js` 与 `runtime/visual-pipeline.js`；场景既可按 Seed + 内容包生成，也可验证并消费工厂导出的 Manifest。Original ZIP 继续只含 Manifest 与透明 Sprite Sheet；Mosslight 会在上游纸片角色上确定性追加覆盖 ambient / head / face / body / ground 的十二种真实 CanvasTexture 部件，并在自定义 ZIP 中额外携带可复验的 `content-pack.json`。

## 全量能力地图

固定版本包含 15 个 HTML 页面（1 个菜单 + 14 个演示入口）、119 个 `src/` 源码文件。完整逐入口矩阵见 [analysis/capability-matrix.md](analysis/capability-matrix.md)。

| 系统 | 已盘点内容 | 主要输出 |
| --- | --- | --- |
| 手绘纸片角色 | 4 物种、6 媒介、20 部件、7 姿势、5 表情 | CanvasTexture 部件、纸片骨骼角色、35 人群像 |
| 程序化物品 | 13 个物品族、4 个品阶、9 个正向词条、5 种诅咒 | 卡牌、地面物件、手持/穿戴装备与游戏数值 |
| 体素角色 | 4 物种、5 调色板、14 个构建部件 | 可环绕实体角色、20 人月夜群像 |
| Gloss 角色 | 9 个 casting profile、4 个体型、14 套调色板、11 种材质、12 个部件 | 实体 Q 版角色、35 人表情群像、班级合影 |
| 植物对象 | grass / plant / tree / flower / wildcard，6 套调色板、3 种 finish | 可调参数的实体植物对象 |
| Pipes 实验 | 三层管线、活动角色、八个观察角度 | 自动绘制并游览的活示意图 |
| 游戏 | Class Photo、Kindergrimm、Marbles | 评分、战斗、奖励、自动单位行为、音频与移动端控制 |

## 已完成的运行证据

- 14 个演示入口全部真实浏览器打开并截图；正常页面流程未捕获到页面错误。
- 编辑器固定 `human + graphite + seed 12345` 后，两次完整 recipe 的 FNV-1a 哈希均为 `3815752950`。
- 锁定 `skull` 后重新生成，头骨全部参数逐项保持不变，seed 和其他部件继续变化。
- 表情与姿势组合已触发：`angry + attack`；部件面板的 reroll、lock、滑杆和枚举控件可用。
- Class Photo 已选五人并得到 `EYES · A RAINBOW CLASS`、`110 × 4 = 440` 的可见评分。
- Kindergrimm 已从集体移动进入战斗并触发五选一装备 draft。
- Marbles 已完成拖拽发射；弹珠在远端停下后自动战斗，分数增长到 129。
- iPhone 设备环境下验证了 Kindergrimm 竖屏与 Marbles 横屏启动流程。
- 体素单体审计：5,198 voxels、5,108 tris、8 parts，plate audit 返回空数组。
- 体素群像：20 人、约 81k–83k tris；完整 gloss 群像：35 人、约 6.35M–6.68M vertices。
- NPC 资产链 v0.6：Mosslight 每个 Recipe 携带 12 个 Visual Parts；场景 8 人追加 96 个自有平面，总计 214 planes / 430 calls；v0.5 精确迁移、Manifest 防篡改、恢复 Seed 和 ZIP CRC 均已通过。

### 性能烟测

环境：Chromium、1440×900、DPR 1、Intel UHD / D3D11。以下是 2 秒 rAF 短采样，只用于当前机器的相对比较，不等同于正式 benchmark：

| 场景 | 当前结果 |
| --- | ---: |
| Kindergrimm，3 名儿童 | 约 47.4 fps |
| 手绘群像，35 人 | 约 17.5 fps |
| 体素群像，20 人 | 约 9.6 fps |
| Gloss 群像，35 人 | 约 6.2 fps |

结论是单角色编辑器和小队游戏已具备良好研究价值，大规模群像主要用于能力展示；gloss/voxel 群像若进入生产，需要减面、LOD、实例化、分辨率策略和更严格的 GPU 基准。

## 已确认的边界

1. 上游是静态浏览器实验仓库，不是 npm SDK；我们的本地扩展正在 M5 抽离稳定的浏览器 ES-module Runtime SDK，但尚未作为 npm 包发布。
2. 完整 recipe 可复现，单独 seed 在随机物种/媒介模式下不可复现全部角色身份。
3. 手绘后端使用大量 CanvasTexture 和透明平面；群像会同时消耗构建 CPU、纹理内存和 draw calls。
4. 体素与 gloss 后端共享架构思想，但几乎不共享运行时代码；修复和新增内容需要分别维护。
5. `__photo.stats()` 在演员队列尚未构建到可用坐标时会抛出异常；等待后可正常返回。这是调试 API 的时序问题，不影响页面正常渲染。
6. `photo` 当前样例可达到约 6.47M vertices，完整 gloss 群像超过 6M vertices，生产使用前必须建立资产预算。
7. 上游全站仍没有统一的录制/导出流水线、存档后端或多人同步；本地 NPC 场景已补语义 roster、reduced-motion 与 WebGL-off 降级，但不等于全仓无障碍体系完成。

## M2 Contract Core 已完成

- runtime/contracts.js 是 0 import 的纯 ES module，可在 Node 中独立验证合同。
- schemas/ 保存 Recipe、Renderer、Content Pack、Visual Record 与 Batch Manifest 五类 machine-readable schema。
- fixtures/contracts/ 保存 Original、v0.5 compatibility、v0.6 与篡改 Manifest。
- scripts/verify-contracts.mjs 在无 Three.js、Canvas、DOM 和 rig 的环境中验证 accept/reject 与稳定错误码。
- content-packs.js 和 npc-core.js 已接入“纯合同 → domain/generator → renderer/runtime”的分层校验。
- 浏览器回归保持 Original 7d63c5ae、v0.6 a79de443 / 091c354d、12 assets、8 actors / 96 authored planes / 430 calls。

验证命令：

    node projects/kindergrimm/scripts/verify-contracts.mjs

## M3 Independent 2D Pack 已完成

- `mosslight-core-2d` 是独立可见渲染路径：不调用上游角色构建器；每角色 23/23 authored planes、0 upstream visible planes。
- `mosslight-gouache` 提供自有填充、边缘、纹理与 glow 语法；17 类部件覆盖六组核心区域。
- 50 个 golden recipes、50 个唯一 Recipe 与 Visual 指纹、Original / decorator / Core 三路报告均通过验证。
- 最终 Pack `a96d877a`、Renderer `32d9c2cf`；v0.1 明确支持 biped，human/cat/dog 通过耳形与确定性变体区分。
- 工厂 12 资产与 ZIP/CRC、场景 8 actors/三模式、Manifest 导入/防篡改/恢复、桌面/390、键盘、reduced-motion 与 WebGL-off 全部通过。

验证命令：

    node projects/kindergrimm/scripts/verify-m3.mjs

## M4 Production Frontend 已完成

`production-studio/` 已完成 Author → Original/Decorator/Core Compare → Review → G1–G6 → Release Candidate。12 资产 RC 为 4 文件 stored ZIP，当前样本 340,918 bytes、456–542ms、CRC 全通过；桌面/390、键盘、reduced-motion、WebGL-off 和相邻页面回归通过。完整证据见 `analysis/m4-production-frontend-delivery-contract.md`。

## M5 Runtime SDK 已完成

`runtime-sdk/` 已抽离纯 core 与显式 Three.js adapter；Waystation、Encounter、Council 共用同一 actor lifecycle，8 个 Recipe/Visual 指纹完全一致。暖重建 177ms，Manifest/RC accept/reject、cache、state、session restore、事务性导入与 WebGL-off 均通过。完整证据见 `analysis/m5-runtime-sdk-delivery-contract.md`。

## v1 Quality & Release 已完成

`releases/kindergrimm-2d-v1/` 锁定 Pack `a96d877a`、Renderer `32d9c2cf`、Runtime SDK `0.1.0`、7 个 schema、7 个库存文件、6 份浏览器证据与 G0–G7。Release fingerprint 为 `df8ac08c`。

验证命令：

    node projects/kindergrimm/scripts/verify-release.mjs

完整依赖、Gate 和后续 3D/AI 边界见 [PROGRAM.md](PROGRAM.md)。
## 目录

```text
projects/kindergrimm/
├─ upstream/                    # 固定版本上游 submodule
├─ scripts/demo.ps1            # list / serve
├─ PROGRAM.md                   # Program v1 单一事实来源
├─ schemas/                     # 七类机器可读合同（含 RC 与 Platform Release）
├─ fixtures/contracts/          # Original / v0.5 / v0.6 / tamper fixtures
├─ runtime/                     # 合同、生成核心、Pack resolver、独立 2D renderer、ZIP writer
├─ runtime-sdk/                 # M5 loader/cache/state/session/diagnostics/scene adapter
├─ production-studio/           # M4 Author/Compare/Review/Gates/RC 生产闭环
├─ releases/kindergrimm-2d-v1/ # M6 v1 manifest、库存、来源、验证与 handoff
├─ npc-factory/                 # 批量生产与 2D 资产导出
├─ npc-scenarios/               # Manifest 消费与三种运行场景
├─ analysis/capability-matrix.md
├─ analysis/content-pack-authoring.md # 内容包分层与扩展指南
├─ analysis/mosslight-v06-extension-blueprint.md # 可复制的视觉套件扩展蓝图
├─ evidence/screenshots/        # 原始浏览器证据
├─ evidence/thumbs/             # 本地审阅副本
└─ README.md
```

## 许可证

上游明确使用 Unlicense，将代码置于 public domain。研究文档仍保留上游来源、固定提交和链接，便于追溯。




