# Kindergrimm Scene-driven Content Studio 设计契约

- Entry mode：Revision-led。
- Request revision：2；从“素材能力展示 / 固定故事消费证明”升级为“用户心智驱动的场景内容生产”。
- 目标用户：需要快速构建一致风格 2D 场景的内容设计者、产品原型人员与研究者。
- 用户任务：用自然语言描述场景目标，得到可解释的场景合同、素材需求、真实组合效果与能力缺口。
- 核心闭环：描述意图 → 编译 Scene Contract → 匹配已有素材 → 参数化生成变体 → 标出能力缺口 → 组合真实场景 → 继续用意图修订。
- 第一印象：页面首先询问“你想实现什么场景”，而不是要求用户理解 Pack、Recipe 或素材目录。
- 视觉等级：Immersive。
- 体验架构：Hybrid Workspace。
- 主视觉：Canvas 2D 持久场景；用户输入、需求计划和技术证据位于明确的工作台层。

## 用户输入与默认示例

默认意图：`做一个儿童山洪预警场景：夜晚山路上，一名年轻信使提着灯，扶正倒下的路标，帮助迷路家庭前往高地。画面紧张但不能恐怖，使用水粉风格，移动端可操作。`

至少支持并验证三类不同心智：

1. 山洪预警：山径、信使、提灯、路标、家庭、紧张但儿童友好。
2. 月港送信：水闸/驿站、卷轴、信使包、墨刻、神秘夜色。
3. 阳光森林指路：山径、路标、护符、毛毡、温暖希望。

## 可解释意图合同

Scene Contract 至少包含：场景类型、叙事目标、受众、情绪、紧张度、风格、角色需求、Prop 需求、交互目标、平台和来源文本。第一版使用本地词典与规则编译器，必须显示 `intentAdapter = local-explainable-rules`、`runtimeLlmCalls = 0`、`cloudApiCalls = 0`。

## 素材解析策略

- `matched`：现有 Scene/Prop 能直接满足，复用稳定 Recipe。
- `generated-variant`：类型已支持但需要新的状态、组合、数量、色彩或姿态变体，由确定性参数生成。
- `capability-gap`：当前类型/Renderer 不支持；不得用相似图或文字标签伪装为已经生成的素材。
- 每一项记录 requirement、resolution、recipe/renderer 身份、provenance 与原因。

## Hybrid Workspace 分工

- 持久场景：真实组合当前场景、角色轮廓、Prop、天气/情绪与交互热点；合同修订后立即变化。
- 输入工作台：自然语言描述、场景示例、快速修订词与构建动作。
- 计划工作台：结构化合同、素材解析结果、缺口和来源证据。
- 移动端：输入 → 场景 → 合同摘要 → 素材计划的单列显式流程；操作不依赖悬停。
- Canvas-off：仍能编译意图、查看合同、素材匹配与缺口；明确场景图不可用。

## 状态约束

- `idle`：显示默认意图但不冒充已构建结果。
- `compiled`：场景、合同和素材计划来自同一编译结果。
- `revised`：快速修订只改变相关合同字段并重算计划。
- `gap`：缺口醒目但不阻断已支持部分的预览。
- `error`：空输入给出可恢复提示。
- 固定意图产生稳定 Scene Contract fingerprint；同一输入重复编译结果一致。

## 范围边界

- 保留 Material Catalog、Production Studio、《风暴前的回信》与全部现有合同。
- 不引入后端、登录、远程模型、通用游戏引擎或伪 3D。
- 大模型仅作为未来可替换 Intent Adapter；本轮不声称已接入。
- 外部发布、真实模型 API、3D Backend 与新增资产类型需要另行授权。
- Autonomy authorization：用户明确“继续”，授权在现有研究项目内完成该可逆实现与验证。

## 覆盖清单

| 用户阶段 | 要求 | 表面/状态 | 证据 | Stage | 状态 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- |
| 心智输入 | 自然语言是首要入口 | Desktop / idle | screenshot + DOM | 2 | pass | 实现首屏输入层级 |
| 意图编译 | 输出结构化 Scene Contract | 三个预设 + 自定义 | deterministic test | 5 | pass | 实现纯规则编译器 |
| 素材解析 | matched / variant / gap 均真实 | compiled / gap | DOM + contract test | 6 | pass | 实现解析计划 |
| 场景产出 | 真实 Scene/Prop 被组合消费 | Canvas / compiled | screenshot + audit | 5 | pass | 实现场景组合器 |
| 快速修订 | 风格、情绪、受众修订保留语义 | revised | interaction | 5 | pass | 实现 revision chips |
| 错误恢复 | 空输入可恢复 | error | browser state | 6 | pass | 实现验证反馈 |
| 桌面和平板 | 1440 / 1024 无遮挡溢出 | light | screenshots + DOM | 7 | pass | 响应式布局 |
| 移动端 | 390px 完成主闭环 | touch portrait | screenshot + interaction | 7 | pass | 单列变换 |
| 键盘 | Tab/Enter 完成编译与修订 | keyboard | keyboard journey | 7 | pass | 语义控件与焦点 |
| reduced-motion | 非必要动画关闭 | reduce | computed style | 7 | pass | 动效媒体查询 |
| Canvas 降级 | 合同与计划仍完整可用 | canvas-off | browser journey | 8 | pass | 渐进增强降级 |
| 性能烟测 | 场景编译无明显阻塞 | representative scene | measured compile time | 8 | pass | 记录构建耗时 |
| 相邻回归 | 故事、素材目录合同仍通过 | existing routes | automated regression | 9 | pass | 运行既有测试 |
| 交付审查 | 无 continue、主入口和文档更新 | all | terminal audit | 9 | pass | 汇总证据 |

## 完成证据

- Scene Intent：8/8。
- Scene Studio 浏览器：14/14。
- 固定故事与 V2-M3 相邻回归：36/36。
- 交付报告：`analysis/scene-studio-delivery-report.md`。
