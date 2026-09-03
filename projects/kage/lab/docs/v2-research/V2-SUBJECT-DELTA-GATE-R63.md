# V2 主体状态差异门禁 R63

## 目标

把 R62 暴露的失败从单个榫卯案例修补，转化为现有生成链路的通用能力：当用户目标包含装配、拆解、对齐、咬合或结构形变时，浏览器必须证明持续视觉主体在语义状态之间发生了可辨变化；文字、箭头、按钮、裁切、整体缩放、模糊或镜头移动不能代替实体变化。

## 设计契约

- Entry mode: Revision-led production hardening
- Request revision: R63
- First goal: 用户描述想法后，系统选择足以表达该想法的素材和网页机制，并生成可验证的优秀页面。
- Existing architecture: `brief -> V2 creative contract -> asset route -> Codex authoring -> browser review -> independent acceptance -> archive/stop`。
- Evidence branch: R62 页面拥有四状态母图，但独立验收仍判定状态连续性、交互因果和终态反馈不足；旧机械审计却因普通图片的裁切/换帧像素差误判为 `100/pass`。
- Selected pattern: Production hardening + immersive state evidence。
- Change boundary: 不新增模型、API、业务流程或固定视觉模板；只扩展既有合同、authoring 提示、浏览器证据与机械门禁。
- Stop boundary: 完成确定性门禁、定向测试和一次旧失败案例复验；不生成新主题，不继续修 R62。

## 实现

1. `createVisualReviewPlan` 仅在状态素材策略明确要求实体变化时，为内容派生的桌面语义检查点标记 `expectSubjectChange`；普通页面不增加截图成本。
2. Codex authoring 提示要求页面把持续承担装配、拆解或形变的最小视觉根节点标记为 `data-signal-visual-anchor`，并明确排除标题、说明卡和 CTA。
3. 浏览器在开场建立主体基线，在后续语义状态截取该根节点并生成 `32×18 RGB` 签名；状态差异阈值为 `0.018`。
4. 只有显式 `data-signal-visual-anchor` 可以作为主体证据。普通 `img`、`canvas`、大场景容器或自动猜测结果不再放行，避免把裁切、镜头或文案变化误判为实体变化。
5. 缺少主体边界产生 `subject-state-unverified`；差异不足产生 `subject-state-static`。两者均为 major finding，由现有快速预检直接停止后续模型验收和精修。
6. 采集到的主体选择器、变化状态和差异值会进入既有独立验收/精修上下文，使后续模型只处理有证据的问题。

## 有界复验

- 复验对象：`dedicated-mortise-state-r62`，没有修改其页面代码或视觉。
- 旧行为：普通 `img` 被自动当作主体，四个状态的像素差约为 `18.6%–22.7%`，机械审计错误得到 `100/pass`。
- 新行为：页面没有显式声明真正的实体主体，三个变化检查点分别产生 `subject-state-unverified`，机械审计为 `46/revise`。
- 处理结果：快速预检现在可以在浏览器证据阶段停止该结果，不再调用独立视觉模型，也不触发自动精修；R62 仍保留为研究证据，不进入精选案例。
- 性能边界：只对状态型物理合同采集主体截图；检查点数量来自内容 beats，不是固定三屏或四屏；本轮没有模型调用。

## 验收

| 要求 | 证据 | 状态 |
| --- | --- | --- |
| 状态型合同自动要求主体变化 | review plan test | pass |
| 通用图片不能冒充主体证据 | visual review test | pass |
| 显式主体静止时可被拒绝 | visual review test | pass |
| authoring 提示声明标记和禁止的伪变化 | dedicated prompt test | pass |
| 既有产品、状态资产与质量门不回归 | 5 files / 45 tests | pass |
| TypeScript 类型完整 | `tsc --noEmit` | pass |
| 真实 R62 失败可被更早识别 | live audit `46/revise` | pass |

## 结论

R63 没有让模型更自由，也没有增加修复轮次；它把“主体是否真的发生业务要求的变化”变成可观察、可停止的浏览器证据。下一次真实需求仍走同一工作台和生成架构，但新页面必须显式声明主体并通过状态差异门禁，只有机械证据成立后才值得支付独立视觉判断成本。

后续新主题验证见 [R64 可折叠露营灯有界验证](V2-LANTERN-BOUNDED-VALIDATION-R64.md)：状态素材、显式主体与浏览器差异门均通过，独立视觉为 `82/revise`，按边界停止且未进入案例库。
