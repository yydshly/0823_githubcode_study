# R36 最终视觉验收层

## 设计契约修订

- Entry mode：revision-led
- Request revision：R36
- Target user：用自然语言生成沉浸式 Three.js 网页的创作者。
- Desired first impression：最终结果像完整作品；素材是构图的一部分，而不是“已加载但不可见”或被程序化占位物遮挡。
- Visual ambition：Immersive
- Experience architecture：Hybrid Workspace
- Preserved behavior：R35 的结构门禁、四状态截图、两次精修上限、案例唯一最优策略。
- New constraint：任何新修订候选在机械门禁通过后，还必须由独立视觉验收再次查看最终四张截图。
- Acceptance criteria：视觉验收明确确认构图焦点、素材主体性、边缘融合、滚动中段密度、末段收束和移动端表现；只有 `pass` 可选中。
- Autonomy authorization：用户已要求继续推进，可直接实现本地可逆修改。
- User-decision boundary：新增外部付费 API 或改变模型供应商才需要用户决定；继续使用现有 Codex CLI 不需要重复确认。

## 覆盖记录

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 精修 | 新候选需二次视觉判断 | four screenshots | schema + unit test | 6 | pass | 已增加独立 acceptance response |
| 素材 | 素材必须成为视觉主体 | opening/middle/final | model finding | 2 | pass | 已定义素材从属、占位物、硬边界问题 |
| 选择 | 机械 pass 不能直接选中 | refinement result | unit test | 6 | pass | 已加入双门禁选择函数 |
| 案例 | 当前最终案例补充视觉验收 | desktop/mobile | Codex visual acceptance | 9 | pass | 最终候选 96 分通过 |
| 交付 | 构建和全量测试 | project | build + tests | 9 | pass | 全量验证完成 |



## 最终实测结果

- 最终运行：`dedicated-r36-delivery-final`
- 机械评审：`pass / 100`
- 独立视觉验收：`pass / 96`
- 资产角色：初始温室环境、发光种荚主体、纤维聚合中间态、成熟温室终景，四项均为正式获批素材并被运行代码实际引用。
- 关键修正：required 素材从元数据声明升级为运行代码硬门禁；中段不再依赖随机线条承担主要叙事；移动端消除黑底 plate 竖直边界；精选归档要求机械与独立视觉双通过且不得残留 major finding。