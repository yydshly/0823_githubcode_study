# V2 业务可理解性质量门 R51

## 设计契约

- Entry mode: Revision-led repair
- Request revision: R51
- Target user and context: 用户在工作台输入一个想法后，需要无需行业背景也能理解生成网页表达的对象、操作和结果。
- Desired first impression: 10 秒内能回答“这是什么、我能做什么、操作后发生什么”。
- Visual ambition: Functional + Immersive
- Experience architecture: 继承每次 brief 选择的 Editorial Flow、Spatial Stage 或 Hybrid Workspace；本门禁不固定页面形态。
- Visual constraints: 主体必须可辨认；关键动作产生明显、可归因的视觉变化；技术参数不能替代业务结果。
- Information constraints: 页面明确呈现对象、当前任务、关键状态和最终结果；专业术语必须由可见结果解释。
- Operation constraints: 高层操作（预设、Cue、模式、路线、方案）必须改变实际产品状态，不能只切换按钮和说明文字。
- State constraints: 控件值、场景、可读结果和保存状态一致；自动演示不得抢夺用户控制或混淆因果。
- Environment constraints: 继续使用本地生成运行、Playwright 机械证据、独立视觉验收和既有 fallback。
- Primary journey: 识别对象 → 完成一个核心操作 → 看见明确结果 → 理解并执行最终行动。
- User-defined phases: 固化失败证据；实现通用质量门；用旧失败案例回归验证。
- Required artifacts: 生成提示约束、独立验收规则、机械场景变化证据、测试与本记录。
- Autonomy authorization: 用户确认执行；允许项目内可逆实现和本地验证，不重新调用生成模型。
- User-decision boundary: 不远端发布、不把失败案例加入案例库、不为单个灯光案例固化专属模板。

## 可观察完成标准

1. 生成提示明确要求对象—操作—结果闭环和 10 秒可理解性。
2. 独立视觉验收可用明确 finding 拒绝业务闭环不清、反馈差异弱和伪证据页面。
3. 语义操作证据同时记录 DOM 变化与 Canvas/场景是否变化；只有按钮高亮或文案变化不能证明空间操作成立。
4. 旧灯光运行能够暴露“Cue 只改文字、未改舞台”的缺陷，不因编译成功或参数存在而通过。
5. 全量测试和生产构建通过；历史视觉验收记录仍可读取。

## 覆盖记录

| 用户阶段 | 要求 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 固化失败证据 | 记录灯光案例为何无法理解 | 默认/操作后截图、运行源码 | Stage 0/1 | pass | 实现通用约束 |
| 生成约束 | 对象—操作—结果、术语解释、真实高层状态 | 合同、生成提示和独立验收 schema | Stage 3/6 | pass | 已合并进既有意图、过程和状态约束，未扩大合同项数 |
| 自动证据 | DOM 与 Canvas 状态变化分开记录 | Playwright 合成画面采样与语义状态 | Stage 5/6 | pass | 参数和高层操作分别采集，场景变化使用最终 Canvas 图像差异 |
| 回归验收 | 失败案例不再被误判为合格 | `dedicated-639b6558bc63` 本地审计 | Stage 8/9 | pass | 参数变化 0.902%，Cue 变化约 0.02%；74 分 / revise |

## 失败基线

- 运行：`dedicated-639b6558bc63`
- 用户观察：业务与灯光效果无法理解。
- 浏览器证据：舞台主体和灯具过暗，参数变化主要体现在控制面板；多个光束重叠且缺少选中灯的空间标识。
- 源码证据：Cue 按钮只更新 `state.cue` 与说明文字，没有把对应 Cue 的灯具预设写入 `state.lamps`；照度读数只是当前选中灯的简化公式；首次人工操作前还存在自动 Cue 循环和鼠标选灯。
- 决策：研究失败样例，不归档精选，不针对它继续视觉精修。

## 实现结果

- 生成边界新增：10 秒业务可理解性、对象—操作—结果闭环、高层状态真实写入、专业指标诚实标注、直接操作工作区禁止隐式自动循环。
- 独立验收新增 finding：`business-loop-unclear`、`feedback-delta-weak`、`pseudo-evidence`，并强化 `interaction-causality-weak` 的判定说明。
- 机械探针新增：参数操作与高层模式操作分别验证 DOM 和 Canvas；Canvas 使用浏览器最终合成图像的 24×14 采样，而不是不可靠的 WebGL 默认帧缓冲。
- 失败案例复验：参数滑块产生 `0.00902` 场景差异，超过 `0.008` 可辨阈值；Cue 仅约 `0.0002`，被 `semantic-scene-static` 拒绝。机械分由旧规则的 100 降为 74。
- 记录完整性：机械复验会保留已有独立视觉验收，不再覆盖历史 82 分结论。
