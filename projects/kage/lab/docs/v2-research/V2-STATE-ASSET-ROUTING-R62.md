# V2 状态资产路由 R62

## 目标

在 Codex 编写网页前判断：用户要求的变化能否被当前素材真实表达。装配、拆解、咬合、展开和结构形变不得再由单张静态图、裁切或说明箭头冒充。

## 设计契约

- Entry mode: Capability-led planning extension
- Request revision: R62
- First goal: 用户描述想法后，系统选择足以表达该想法的素材与渲染路线，再生成优秀网页。
- Existing architecture: `CreativeContract -> asset resolution -> asset gate -> Codex authoring -> browser review`。
- Change boundary: 不增加 API、不改模型；在现有合同和素材门禁之间补充状态资产决策，并用一次有界素材/页面验证检验该决策。
- Selected pattern: Asset production and quality gate + production hardening.
- Evidence branch: R61 中 L3 单张榫卯环境图能建立气氛，却不能证明两个构件逐步对齐、咬合和传力。
- Required inputs: 用户 brief、V2 creative contract、项目/用户/模型候选素材及其状态证据。
- Expected output: 明确的状态变化类型、可接受路线、最少可辨状态数、部件要求和失败策略。
- Stop boundary: 完成确定性路由、authoring 前阻断、一次状态素材生成、一次增量页面验证和一次独立验收；无论通过或要求修改，都不自动进入第二轮修复。

## 路由原则

1. 没有实体状态变化时，现有静态素材规则保持不变。
2. 抽象程序化关节主体可使用经过验证的程序化状态路线。
3. 真实对象装配、拆解、对齐或咬合必须提供以下任一路线：
   - 可检查且具有可动/分离部件证据的 GLB/glTF；
   - 同一对象、同一机位、至少三个可辨状态的连续媒体；
   - 具有独立部件和至少三个状态证据的分层主体。
4. 只有一张环境图时，可以承担场景和情绪，但不能承担装配或拆解状态职责。
5. 状态资产不足时停在 `assets/blocked`，向工作台返回具体素材请求；不得进入 Codex authoring 后再依靠自由发挥弥补。

## 完成标准

| 要求 | 证据 | 状态 |
| --- | --- | --- |
| 榫卯 brief 被识别为真实装配状态 | contract test | pass |
| 单张 L3 环境图不能通过状态资产门禁 | asset gate + runner integration test | pass |
| 连续三状态素材可以通过 | asset gate test | pass |
| 带可分离部件证据的 L4 GLB 可以通过 | asset gate test | pass |
| 抽象程序化关节主体仍可直接 authoring | regression test | pass |
| 状态路线进入 Codex execution brief 和工作台摘要 | contract/summary test | pass |
| 不合格状态素材不能进入最终案例 | delivery quality test | pass |
| 现有生成与类型检查不回归 | 9 files / 57 tests + `tsc --noEmit` | pass |

## 有界页面验证

- 生成并登记了 `mortise-tenon-four-state-v1`：同一构件、同一机位的分离、对齐、半插入和完全咬合四状态母图。
- 候选页面：`dedicated-mortise-state-r62`。它保留 R61 的博物馆编辑方向，把单张环境图降为可选背景，并用状态母图绑定滚动进度。
- 浏览器证据：桌面 4 个语义状态 + 390px 移动端；无脚本错误、无请求错误、无横向溢出。
- 机械验收：`pass / 100`。
- 独立视觉验收：`revise / 76`。主要问题是关键帧中的分离、对齐、半插入和咬合差异仍不够强，受力说明与主体变化的因果关系不足。
- 结论：状态资产路由本身有效，但“素材存在”不能替代“关键状态在页面中被清楚呈现”。该候选不进入精选案例，不再自动修复。

## 本轮结果与停止边界

- 榫卯目标现在生成独立的 `state-subject` 素材职责；旧的单张工作台图仍可作为环境，但不再被误认成装配证据。
- 候选素材必须登记可复核的状态证据。三状态连续媒体或具有足够部件组的真实模型能够放行；静态图会在 authoring 前返回具体素材请求。
- 相同状态门禁已经进入交付评估，避免历史数据、人工绕过或后续流程把不充分结果归档成精选案例。
- 旧任务缺少该字段时使用 `static-sufficient` 兼容值，现有已生成页面保持可读。
- 本轮只生成一批状态素材、执行一次增量实现和一次正式验收；未通过后按停止边界结束，不创建案例。
- 状态素材已沉淀到项目目录和素材目录，后续命中榫卯/装配主题时优先于旧的静态环境图。
- 下一步不是继续手工修补当前页面，而是把“关键状态视觉差异”和“交互—主体变化因果”加入生成验收约束，然后用新的真实需求验证。

## R63 后续复验

R62 记录中的 `100/pass` 是当时的历史机械结果。R63 收紧主体证据后，普通 `img` 不再能凭裁切或换帧像素差冒充实体变化；同一页面复验为 `46/revise`，三个变化检查点均报告 `subject-state-unverified`。详见 [V2 主体状态差异门禁 R63](V2-SUBJECT-DELTA-GATE-R63.md)。
