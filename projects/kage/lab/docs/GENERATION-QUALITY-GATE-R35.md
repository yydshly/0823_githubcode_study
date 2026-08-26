# R35 生成结果质量门禁

## 设计契约

- Entry mode：revision-led / repair-led
- Request revision：R35
- Target user and context：使用工作台把自然语言想法生成成 Three.js 网页的创作者。
- Desired first impression：生成完成后看到的是真正可读、素材可见、滚动成立的成品，不是“代码已生成”的占位演示。
- Visual ambition：Immersive
- Experience architecture：Hybrid Workspace；工作台负责输入、状态与选择，生成页负责沉浸式呈现。
- Visual constraints：不固化具体风格；必须有清晰首屏焦点，素材与场景融合，Three.js 不遮挡核心内容。
- Information constraints：首屏标题和主要行动必须真实进入视口；移动端保留语义内容。
- Operation constraints：精选归档只能接受完成最终浏览器复验的 run。
- State constraints：`pass` 可精选，`revise` 必须继续修订，`blocked` 必须拒绝。
- Environment constraints：本地 127.0.0.1:8143；桌面 1440×900、移动端 390×844、reduced-motion。
- Primary journey：描述想法 → 生成/选择素材 → 构建独立网页 → 四状态浏览器评审 → 必要时继续修订 → 通过后归档为该目标唯一最佳案例。
- Required artifacts：代码、测试、真实浏览器证据、研究记录。
- Autonomy authorization：用户已多次要求“继续”“快速推进”，允许在现有项目范围内直接实现和验证。
- User-decision boundary：新增外部 API、付费服务或改变产品目标需要用户决定；本地质量门禁不需要重复确认。
- Observable completion criteria：首屏标题可见；桌面时间线变化成立；移动端语义可读；最终评审 verdict 为 pass；非 pass 不能进入 featured；构建和全量测试通过。

## 覆盖记录

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 生成 | 首屏不是空场或占位物 | desktop opening | DOM + screenshot | 2 | pass | `headingVisible=true`，首屏 5 个可读元素 |
| 精修 | revise 不能被当作最终结果 | desktop/mobile review | 单元测试 | 6 | pass | keep 与 revise 候选均必须通过评审 |
| 案例 | featured 只能归档 pass | case archive | 单元测试 + catalog | 6 | pass | 缺失、revise、blocked 均拒绝归档 |
| 跨端 | 移动端与 reduced-motion 可读 | 390×844 reduce | browser evidence | 7 | pass | 移动端标题可见，reduced-motion 生效 |
| 交付 | 工程检查通过 | project | build + tests | 9 | pass | 生产构建与全量测试通过 |

## 实现结果

- 浏览器证据新增 `headingVisible`，不再把视口外的 DOM 标题误判为有效首屏。
- `opening-heading-missing` 被定义为 major finding，触发 `revise`。
- 模型返回 `keep` 时仍必须满足当前评审 `pass`；否则继续下一轮精修。
- 新候选只有 `pass` 才会成为 selected run；`revise` 与 `blocked` 都保留为内部拒绝记录。
- `featured` 案例归档强制要求有效且通过的 `visual-review.json`。

## 最终复验

`dedicated-ac182411e506` 在强化后的真实浏览器门禁中获得：

- verdict：`pass`
- score：`100`
- findings：`0`
- opening heading visible：`true`
- opening visible text：`5`
- middle progress：`0.44`
- final progress：`1.0`
- mobile heading visible：`true`

最终评审保存在 `generated/runs/dedicated-ac182411e506/visual-review.json`，并已复制到对应精选案例归档。

