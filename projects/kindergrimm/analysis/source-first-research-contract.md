# Kindergrimm Source-first Research Atlas 设计契约

- Entry mode：Revision-led。
- Request revision：3。
- 上游来源：`https://github.com/albertobeiz/kindergrimm`。
- 固定上游提交：`5857b1e1cae2713d6714ad7dd7f89626bb242f0f`。
- 目标用户：需要理解该源库真实能力、技术原理、扩展价值与研究路线的研究者和产品技术负责人。
- 用户任务：先看到源库本身已经实现什么，再理解机制如何连接，最后区分我们的复用、扩展、重复实验和应用证明。
- 核心闭环：上游原生效果 → 源码机制证据 → 归属判断 → 有效扩展方向 → 下钻原生演示或本地研究工具。
- 第一印象：这是一个已有完整 2D/3D/物品/游戏/风格系统的程序化内容实验室，不是“只会生成一个 NPC”或“大模型出图包装器”。
- Visual ambition：Editorial。
- Experience architecture：Editorial Flow；原生实时演示使用内嵌证据舞台，不作为全页持续场景。
- Autonomy authorization：用户明确要求回归目标、重新理解并归纳展示。

## 已验证的上游事实

- README 核心定位：手绘感程序化角色，一个部件对应一根骨骼，可动画并在游戏运行时重建。
- Recipe 是唯一角色状态：`{seed, media, color, parts:{...}}`，相同 JSON 重绘相同角色。
- 2D 管线：Sketch 手、Media、Species、Layout、Parts Registry、Rig、Animation、Crowd。
- 原生物品系统：13 个 Item Family、4 个 Rank；同一对象可进入卡片缩略图、地面 Prop 和角色部件。
- 原生 3D：Voxel 角色与 Crowd、Gloss molded chibi 与 Crowd、3D Plants/Object、Photo 组合场景。
- 原生风格：9 个 Style Backend；同一批人物由 Graphite / Brush 两只“手”绘制，另有 600 年 Timeline。
- 原生应用：Class Photo、The Dark Floor、Marbles 三个游戏/玩法场景。
- 当前代码规模：135 个 `src/**/*.js` 模块、18 个 HTML 入口、9 个手绘 Part Family。
- 模型边界：运行时代码未接入 OpenAI/Anthropic/Gemini 等生成 API；仅 `audio.js` 使用 `fetch` 读取本地音乐文件。音乐 README 存在离线生成建议，不等于运行时模型调用。

## 归属标签

- `UPSTREAM ORIGINAL`：上游提交中直接存在，可由原生页面或源码证明。
- `MECHANISM REUSE`：我们直接复用了上游 RNG、Recipe/parts 思想或运行机制。
- `OUR EXTENSION`：上游没有、我们新增且不重复其已有能力。
- `PARALLEL / REASSESS`：我们实现了类似能力，但最新上游已存在更完整系统；不得继续计为净新增。
- `APPLICATION PROOF`：用于证明消费链或产品方向，不属于源库核心能力。

## 现有研究重新归属

| 现有成果 | 新归属 | 原因 |
| --- | --- | --- |
| Seeded RNG、Recipe、parts、Canvas 纹理 | MECHANISM REUSE | 直接来自上游技术基因 |
| NPC Factory 的确定性批次与身份审查 | OUR EXTENSION | 上游有编辑器/群像，但没有我们的发布合同、Gate 和批次审查包装 |
| Inkcut / Felt 三风格体系 | PARALLEL / REASSESS | 最新上游已有 9 个完整历史 Style Backend，需比较后决定保留或迁移 |
| Prop / Icon / Scene Component | PARALLEL / REASSESS | 上游已有 13 类物品、三 Host 和多类场景系统；我们的实现不能再声称首次扩展到物品 |
| Runtime SDK、RC ZIP、CRC、版本化 Manifest | OUR EXTENSION | 属于工程交付和消费层，源库不是正式 SDK/发布平台 |
| 《风暴前的回信》 | APPLICATION PROOF | 固定叙事消费示例 |
| Scene Studio | APPLICATION PROOF | 用户心智产品实验，不属于源库能力主线 |

## 展示要求

1. 首页第一屏必须先说清上游真实定位、版本和规模。
2. 能力总览必须覆盖 Play、Drawn 2D、Items、Voxel 3D、Gloss 3D、Object 3D、Styles、Timeline。
3. 提供真实上游页面的内嵌/打开入口，不能用我们的 Canvas 模拟上游效果。
4. 机制图必须把 Recipe、Hand/Style、Parts/Layout、Rig、Animation、Hosts/Applications 连接起来。
5. 归属矩阵必须明确展示 `PARALLEL / REASSESS`，纠正过去过度归因。
6. 扩展路线只保留真正增量：版本化互操作、跨 Backend 身份、导出与发布、回归审查、可选 Intent Adapter。
7. Material Catalog、Story Proof、Scene Studio 保留，但降为下钻工具。

## 边界

- 不修改上游源码行为；只将本地上游快进到验证过的 origin/main。
- 不声称源库使用大模型运行时生成。
- 不把原生 Voxel/Gloss 称为我们的 3D 扩展。
- 不删除现有研究成果；通过归属调整重新解释。
- 外部发布、合并上游、真实模型 API、重新实现原生 9 风格不在本轮范围。

## 覆盖清单

| 用户阶段 | 要求 | 表面/状态 | 证据 | Stage | 状态 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- |
| 源库基线 | commit、规模与 README 定位准确 | Desktop / hero | DOM + source audit | 2 | pass | 构建源库优先首屏 |
| 原生能力 | 2D、物品、3D、游戏、风格完整 | capability grid | source link + screenshot | 3 | pass | 实现能力地图 |
| 实时证据 | 可切换并打开原生页面 | iframe / fallback | browser interaction | 5 | pass | 实现证据舞台 |
| 机制归纳 | Recipe 到应用的连接可理解 | mechanism section | DOM | 3 | pass | 实现机制链 |
| 归属纠偏 | 五类标签与现有成果重归属 | matrix | DOM | 6 | pass | 实现归属矩阵 |
| 扩展路线 | 只保留真实增量 | roadmap | DOM | 6 | pass | 实现优先级路线 |
| 桌面 | 1440 无遮挡/溢出 | light | screenshot + DOM | 7 | pass | 浏览器检查 |
| 平板 | 1024 保持阅读顺序 | light | screenshot + DOM | 7 | pass | 浏览器检查 |
| 移动端 | 390 可切换能力并打开原生页 | light | screenshot + interaction | 7 | pass | 浏览器检查 |
| 键盘 | Tab/Enter 切换原生证据 | keyboard | browser path | 7 | pass | 浏览器检查 |
| reduced-motion | 非必要动画关闭 | reduce | computed style | 7 | pass | 浏览器检查 |
| iframe 降级 | 禁用内嵌时仍有直接打开链接 | embed-off | browser state | 8 | pass | 实现降级 |
| 相邻回归 | 既有工具仍可访问与通过 | existing routes | automated tests | 9 | pass | 运行回归 |
| 交付审查 | 文档主入口、报告、0 continue | all | terminal audit | 9 | pass | 关闭交付 |
