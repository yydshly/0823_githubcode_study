# V2 快速质量预检 R55

## 设计契约

- Entry mode: Repair-led
- Request revision: R55
- Target user and context: 用户在工作台提交想法后，需要在有限时间内知道生成页是否可运行、是否具备基本产品闭环，以及是否值得进入昂贵的视觉模型精修。
- Desired first impression: 工作台迅速给出可解释的质量阶段，不再长时间停留在“正在验收”。
- Visual ambition: Functional；本轮改进验收链路，不重做生成页视觉。
- Experience architecture: 保留现有生成页的 Editorial Flow、Spatial Stage 或 Hybrid Workspace；预检只读取证据，不规定网页结构。
- Visual constraints: 不引入固定风格、固定屏数或固定组件模板；不以单一像素阈值代替最终视觉判断。
- Information constraints: 区分“运行阻断”“跨端/回退问题”“需要视觉判断”三类结论，并说明是否调用视觉模型。
- Operation constraints: 沿用现有浏览器截图和 Job 流程；不创建新生成任务，不调用 MiniMax，不增加 authoring 或 refinement 次数。
- State constraints: 快速预检只有 `pass`、`reject` 两种分流；`pass` 仅允许进入视觉判断，不代表最终精品；`reject` 直接进入待评审并保留证据。
- Environment constraints: canonical runtime 为 `http://127.0.0.1:8143`；视觉模型判断硬上限从 90 秒收紧到不超过 45 秒，超时后保留预检结论并停止。
- Primary journey: 浏览器捕获 → 快速确定性预检 → 有阻断则停止；无阻断才调用一次视觉判断 → 完成或待评审。
- User-defined phases: 梳理现有链路；实现预检；验证 R54 页面与自动化测试；记录结论。
- Required artifacts: 预检类型与实现、Job 可见信息、单元测试、R55 研究记录、真实 R54 页面验证。
- Autonomy authorization: 用户已明确“确定并继续”，授权在现有架构内实施这一有限改进。
- User-decision boundary: 不自动修复生成页视觉，不归档 R54，不扩展新模型/API；发现产品方向冲突时才需要用户决策。

## 可观察完成标准

1. 预检复用现有浏览器证据，不进行第二次页面捕获。
2. 运行错误、关键页面不可读、桌面或移动端横向溢出、声明需要回退但回退不可读时，必须在调用视觉模型前停止。
3. 预检通过不等于精选，只表示具备进入一次视觉判断的资格。
4. 视觉判断最多等待 45 秒；超时后 Job 有明确 `review-required` 结论和预检摘要。
5. R54 页面可由预检得到稳定、可解释的结果；全量测试和生产构建通过。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 目标锁定 | 本契约与有限边界 | 文档 | 文件 | Stage 0 | pass |
| 梳理链路 | 找到浏览器证据、模型判断与 Job 写入点 | server / tests | 源码 | Stage 1/6 | pass |
| 快速预检 | 确定性阻断与分流 | visual review pipeline | 单元测试 | Stage 6/8 | pass |
| R54 回放 | 复用既有生成页验证预检 | desktop/mobile/fallback | 浏览器审计报告 | Stage 7/8 | pass |
| 工程闭环 | 全量测试、构建和结论 | repository | test/build/doc | Stage 9 | pass |

## 停止边界

- 不创建生成 Job。
- 不调用 Codex authoring、MiniMax 或视觉 refinement。
- 只实现一层快速预检和一次模型判断超时收紧。
- 不基于 R54 的个别页面形状写专用规则。

## 实现结果

### 1. 修正标准控件的误判

既有语义快照只登记带 `data-key` 或 `data-param` 的输入控件，但实际浏览器操作会选择所有可见滑杆。因此 R54 中滑杆已经从 3% 变为其他值，结果文案和 Canvas 也变化了，门禁却因快照没有登记该滑杆而记录 `inputChanged=false`。

现在快照覆盖所有可见 `input` 与 `select`，优先使用 `data-key`、`data-param`、`name`、`id`、`aria-label` 或关联标签形成稳定键；标准 HTML 表单不再需要为了通过验收而增加项目专用属性。

### 2. 把机械门禁变成真正的快速分流

- 机械预检存在 blocking/major 问题时立即 `stop`，直接保留可运行版本为待评审结果，不调用视觉验收或视觉精修模型。
- 机械预检完全通过时才进入一次独立视觉判断；这只表示结构与运行证据成立，不代表视觉精品。
- 独立视觉判断低于 72 分、产品意图或结构适配低于 65、存在业务闭环/结构模式/通用风格漂移等基础问题，或 major 问题超过 3 项时，不消耗视觉精修机会。
- 只有基础产品结构成立、问题集中在一次可修范围时，才允许唯一一次视觉精修。
- 视觉判断与视觉精修均设 45 秒硬上限，即使环境变量配置更大也不会突破。

### 3. R54 真实回放

复用 `dedicated-9535f6c5e73a`，没有创建新 Job，也没有调用任何模型。浏览器重新捕获合同派生的 6 个状态，约 17 秒完成：

- `verdict=pass`
- `score=100`
- `inputChanged=true`
- `outputChanged=true`
- `sceneChanged=true`
- `browserErrors=0`

这说明 R54 的业务交互本身成立，原来的 84 分属于验收采集错误。它仍需要独立视觉判断来识别茶杯造型粗糙、釉面细节不足和移动构图问题；快速预检不会越权把它升级为精选案例。

## 时间与停止结论

新的最坏路径为：一次现有浏览器捕获 + 最多 45 秒独立视觉判断 + 仅在值得时最多 45 秒视觉精修。机械门不通过时在浏览器捕获后直接停止，不再进入原先可能白等 90 秒的视觉精修。该策略减少无效等待，但保留了真正有修复价值时的一次精修机会。
