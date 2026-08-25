# V2-M2 · Upstream Capability → Asset Extension Traceability Matrix

## 研究基线

- 上游仓库：https://github.com/albertobeiz/kindergrimm
- 固定提交：de339ad739d8cbd28ff2dd4a940af38c0ede86c8
- 许可证：Unlicense / Public Domain
- 研究范围：Seed、Recipe、2D drawing hand、media、parts、layout、rig、animation、items、输出 host 与场景消费。
- 排除：把完整游戏玩法当作素材能力；把 WebGL 平面称为 3D 模型；把 Voxel/Gloss 混入当前 2D Program。

## 可追溯矩阵

| 上游能力 | 源码证据 | 原理 | 本地已有证据 | V2-M2 扩展动作 | 决策 |
| --- | --- | --- | --- | --- | --- |
| Seed 与稳定随机流 | upstream/src/rng.js:3、12、23 | hashStr + Mulberry32 让参数可复算 | runtime/npc-core.js；50 golden；Recipe fingerprints | 所有 Style Renderer 与 Output Profile 继续使用同一身份 Seed，另设用途 salt | 直接复用 |
| Recipe 生命周期 | upstream/src/rig.js:32、48、60、68 | newRecipe / ensureParams / rerollPart / regenUnlocked 将个体差异保存为 JSON | Recipe contract、Manifest、迁移与 tamper fixtures | Output Profile 不改 Recipe 身份；只记录 profile id 与派生 fingerprint | 合同扩展 |
| Part 插件合同 | upstream/src/part.js:26；ARCHITECTURE §4 | name、size、pivot、states、draw 生成 CanvasTexture 平面 | Mosslight 23 planes；Inkcut 25 planes | 抽出 Style Renderer 模板；每个新增风格声明稳定 parts、coverage、depth 与 dispose | 核心扩展缝 |
| Drawing hand | upstream/src/sketch.js:33–105；ARCHITECTURE §5 | 路径采样、平滑、wobble、颗粒与笔触技术决定“手感” | Mosslight gouache 与 Inkcut hatch 是两套本地 authored grammar | 第三风格新增 felt fill、fabric grain、blanket stitch；不调用既有可见 draw functions | 新风格核心 |
| Medium 抽象 | upstream/src/media.js:18、121 | tone / skin / edge 将形状与材料技术分离 | Content Pack media id 与 palette descriptor | Style descriptor 增加 material grammar；输出档案不得通过 CSS 假造材质 | 合同扩展 |
| Species casting | upstream/src/species.js:24、111、120、126、136 | species 只加载参数概率；shape 仍由共享 part/layout 表达 | human/cat/dog constraints 与确定性生成 | 保留为素材变体维度；不升级为独立 Program 主线 | 有界复用 |
| Shared layout | upstream/src/layout.js:303；ARCHITECTURE §3、§8 | 共享尺寸、头部轮廓与锚点避免部件互相猜位置 | Mosslight 与 Inkcut 各自独立 layout | 每个结构风格自带 layout tokens；Output Profile 只改变相机裁切，不改变角色结构 | 风格所有权 |
| Parts registry | upstream/src/parts/index.js:25、52 | ordered registry 自动进入 editor、recipe、rig | visual-pipeline renderer dispatch 与 Content Pack registry | 建立 Style Renderer registry，避免继续增加硬编码 route 分支 | 架构缺口 |
| Rig 与平面组合 | upstream/src/rig.js:83、110；part.js:18–26 | Recipe → bones/groups → CanvasTexture planes | buildContentCharacter、rendererAudit、scene adapter | 复用低层 plane/Group 协议；不得复用其他风格的可见部件 | 低层复用 |
| 状态与动画 | upstream/src/anim.js:35；ARCHITECTURE §6 | 预绘状态纹理 + group transform 实现 blink/gaze/talk/sway | Runtime SDK 三场景与 Inkcut states | 新风格至少支持 eyes/brows/mouth 状态；头像档案可固定或选择合法状态 | 有界复用 |
| 物品家族 | upstream/src/items/index.js:64、96、100、332、348、354 | 一组参数同时驱动 drawing、thumb、character host；one drawing, three hosts | 当前本地只把 lantern/compass 内嵌为角色 part | V2-M3 抽出 prop/icon asset type；优先复用“一份图形、多种 host”原则 | 下一里程碑 |
| 缩略图与多 host | upstream/src/items/index.js:332–354；ARCHITECTURE §10 | 同一绘制在 card、floor、hand 三个 host 中缩放复用 | Factory 目前只有方形 preview、单 PNG、Sprite Sheet | V2-M2 建立 transparent、portrait/avatar、card/catalog、sprite-sheet 四种 Output Profile | 当前核心缺口 |
| 批量接触表 | upstream items.html、crowd.html；capability-matrix.md | 批量生成用于风格与覆盖评审 | Factory 12 batch；50 golden；Studio 四路 compare | 增加同 Recipe × 多 Style × 多 Output 的 review sheet | 当前交付 |
| 场景消费 | upstream main/crowd/game/orla/photo | 生成资产由编辑器、群像、照片与游戏消费 | Runtime Waystation / Encounter / Council | 新增角色、叙事头像、卡牌/目录三种素材使用演示 | 当前交付 |
| Voxel / Gloss / Objects | upstream/src/voxel、gloss、obj；rendering-architecture.md | 独立程序几何 backend，共享参数化思想但不共享 2D 可见资产 | 已完成全入口研究与性能烟测 | 保留为研究对照；不进入当前 2D Style Renderer 实现 | 独立 Program |
| AI / 大模型 | generator-principles.md | 上游运行时无模型推理；生成由本地参数与代码驱动 | 0 runtime LLM / 0 cloud API | 仅可选地把自然语言翻译为合法 Pack/Recipe/Profile，不参与像素生成 | Decision-gated |

## 已经完成与真实缺口

| 层 | 已经完成 | 尚未完成 |
| --- | --- | --- |
| Research | 14 个演示分类、2D/2.5D/3D 边界、生成链路、性能与限制 | 上游源码能力与每个新增扩展尚未形成统一 trace id |
| Style | Original、Decorator、Mosslight Core、Moonharbor Family、Inkcut | 通用 Style Renderer registry/template；第三套独立结构风格 |
| Output | 透明单角色 PNG、Sprite Sheet、Manifest、ZIP | portrait/avatar、card/catalog；profile contract 与 fingerprint |
| Review | 50 golden、四路 Studio、renderer audit | 同一 Recipe × 三结构风格 × 四输出档案矩阵 |
| Scenario | 角色运行时三场景 | 对话头像与卡牌/素材目录尚未消费真实输出记录 |
| Distribution | stored ZIP、CRC、provenance、v1 release | 多 profile bundle inventory 与 profile-level provenance |

## V2-M2 优先级

1. Style Renderer template / registry。
2. 第三套独立结构风格 Sunpatch Felt 2D。
3. Output Profile contract 与四种输出。
4. 多风格、多输出审查矩阵。
5. 游戏角色、叙事头像、卡牌/目录三个素材使用场景。

## 结论

Kindergrimm 最值得复用的不是某个具体角色，而是“稳定 Recipe + 可插拔 drawing grammar + named parts + one drawing / multiple hosts”。V2-M2 应把这套方法产品化为素材风格与输出能力；游戏逻辑、通用骨骼和真正 3D 后端继续保持边界。
