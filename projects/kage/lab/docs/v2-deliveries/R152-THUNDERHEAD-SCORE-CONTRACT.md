# V2 R152 · 雷暴合唱谱

> 2026-09-02 修订说明：真实浏览器横向比较发现本版与 R145、R149 共享“全屏生成图 + 大标题叠加 + 底部阶段轨道”的宏观骨架，原“creativeDistinctiveness 92 / templateInertiaObserved false”判断被用户证据推翻。本版保留为研究历史，不再作为当前精选；同一路由由 [R153 气象乐谱重构](R153-THUNDERHEAD-SCORE-SHEET-CONTRACT.md)替代。

## 设计契约

- Entry mode：brief-led；使用 R151 V4 选择回执完成一个真实端到端创作。
- Request revision：R152 / 1。
- Target user and context：面向对天气、声音与沉浸式展览感兴趣的普通访客；无需气象专业背景。
- Product brief：把一场夏季雷暴变成可听、可触摸的气象剧场。用户穿过积云、上升气流、电荷分离和降雨四个状态，最终保存一段自己的雷暴合唱谱。
- Desired first impression：不是“又一个工作台”，而是一个正在形成的巨大天气体；第一眼即可感知尺度、压力和光。
- Visual ambition：Immersive。
- Experience architecture：Spatial Stage；全屏天气场持续存在，文字和控制漂浮在前景，不切换成三段卡片长页。
- Scene base：一张模型生成的高质量雷暴环境素材 + Canvas 实时体积光、电荷轨迹、雨线和景深响应。
- Scene persistence：从开场到保存始终可见；状态变化通过同一场景的高度、颜色、速度和声场完成。
- Foreground control model：滚轮推进风暴阶段；指针横移改变风切；点击/空格试听或静音；阶段轨道可直接跳转。
- State-to-scene mapping：积云=明亮上升；塔云=纵向速度增强；电荷=冷暖分层与闪光；降雨=雨幕与低频收束；完成=生成一条可见谱线。
- Mobile transformation：保留全屏场景，内容压缩为底部半透明说明层；阶段轨道变为横向紧凑控件。
- Fallback：Canvas 不可用时仍显示完整环境素材、文字、阶段选择和保存结果；减少动态时取消连续漂移，只保留直接状态切换。
- Visual constraints：不规定暗色、三屏、中央产品、巨大标题或技术路线；最终效果可自由使用图像、Canvas、声音、蒙版、混合模式和 DOM。
- Information constraints：一句话说明当前天气过程；技术数据必须标记为展览模拟，不伪装成实时观测。
- Operation constraints：一个创意方向、一次素材批次、一次完整构建、最多两次确定性修复、最多一次基于明确缺陷的视觉精修。
- State constraints：R151 有效最高候选回执绑定前不消耗素材或构建；回执失败即停止。
- Environment constraints：canonical runtime 为 `npm run dev:8143`；目标 URL 为 `http://127.0.0.1:8143/pages/v2/deliveries/thunderhead-score/?quality=high&motion=full&revision=r152-final`。
- Primary journey：进入天气场 → 滚轮穿过四个阶段 → 指针改变风切并看到/听到反馈 → 保存本次合唱谱。
- User-defined phases：一个有界 R152 阶段；完成成品、浏览器验收和结论，不新增规则体系。
- Required artifacts：V4 选择回执、单张最终环境素材、可运行页面、桌面默认/中段/完成、390px、真实滚轮与交互证据、运行与质量记录。
- Autonomy authorization：用户已明确“确定并继续”，并要求以优秀最终效果为准，不频繁确认。
- User-decision boundary：不部署、不提交远端、不改写旧案例或冻结证据；没有新外部服务和后台工作流。
- Observable completion criteria：开场不是工作台模板；生成素材承担空间与材质；滚轮、指针和声音产生清晰因果变化；桌面和 390px 可用；减少动态与 Canvas 回退不隐藏信息；最终版本绑定唯一身份；未达到视觉标准则停止而不进入精选。

## 三方向比较与 V4 回执

| 候选 | 体验形态 | 标志性现象 | 运行时因果 | 目标适配 | 结论 |
| --- | --- | --- | --- | --- | --- |
| A · 雷暴剖面剧场 | 持续全屏 Spatial Stage | 用户像进入云体内部，冷暖电荷在画面中分层 | 滚轮改变高度与阶段，指针改变风切，声音随能量变化 | 96 | 选择 |
| B · 明亮天气图册 | 横向编辑叙事 | 大比例气象排版与折页图谱 | 滚轮推动图册、点击展开证据 | 78 | 不执行 |
| C · 风暴玻璃仪器 | 产品微距舞台 | 玻璃器皿内部形成云与结晶 | 拖动温度/压力改变材质 | 73 | 不执行 |

选择理由：A 最直接把“雷暴是一个具有尺度、运动与声音的身体”变成可感知体验。B 清晰但冲击力不足；C 容易回到中央产品模板。选择来自目标适配，不是为了机械规避历史风格。

限制反思：R151 仅阻止未完成选择时消耗执行预算；它不限制 A 的视觉媒介、资源来源、页面长度或艺术方向。本轮若最终效果不足，优先诊断主题翻译、素材、构图和互动，而不继续增加规则。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 创意选择 | V4 最高候选回执 | DirectCreativeRun | R151+R152 定向协议测试 | 0 | pass | 已绑定候选 A |
| 素材 | 单批次环境素材 | opening / all stages | `asset-manifest.json`、主图真实加载 | 1–2 | pass | 1 次素材批次完成 |
| 构建 | 持续天气场与前景叙事 | desktop default | `01-desktop-opening.png` | 2–4 | pass | 唯一构建完成 |
| 因果互动 | 滚轮、风切、声音、保存 | desktop states | `02-desktop-charge-shear.png`、`03-desktop-saved-score.png` | 5–6 | pass | 主旅程通过 |
| 跨表面 | 390px、键盘、减少动态、Canvas fallback | required surfaces | 3 个 Playwright 场景、`04-mobile-charge.png` | 7–8 | pass | 全部通过 |
| 工程闭环 | 类型、构建、定向测试、最终身份 | repository | TypeScript、Vite、7 个定向单测、3 个浏览器测试 | 9 | pass | 已完成 |

## 停止条件

- 素材生成只调用一个批次；失败或超时后不静默重试。
- 不为“看起来高级”堆砌无因果粒子或额外技术。
- 最多一次视觉精修；仍不优秀则记录为研究结果，不进入精选库。
- 不因失败继续增加全局限制。

## 最终结论

- 最终 `runId`：`direct-r152-thunderhead-score`。
- 最终 `bundleHash`：`4ce6381bbd85d2d987a5f27c9002e6d97bb72b6ca9e65f83aead7f1230f1516e`。
- 选择结论：A“雷暴剖面剧场”以 96 分成为无拒绝信号候选中的最高目标适配方向；V4 守卫在绑定后才允许素材与构建。
- 执行预算：素材批次 1、完整构建 1、确定性修复 1、视觉精修 1、后台重试 0。
- 最终质量判断：93 / 100，`pass`。高质量云体不是静态终点；滚轮改变天气高度与阶段，指针改变风切轨迹，声音滤波跟随能量，完成态保存同一份合唱谱。
- 限制反思：没有观察到 R151 压制表现。真正有帮助的是“未选定方向前不消耗”；没有引入暗色、三屏、中央产品、技术白名单或素材来源限制。
- 真实性边界：页面明确标记为展览模拟，不代表真实气象观测或预报。
- 归档：已进入 V2 体验研究示例库，预览与最终 bundle 分离保存；同一目标只保留这一版。

## 验证记录

- `npx tsc --noEmit`：通过。
- `npm run build:pages`：通过；只有项目原有静态资源与大 chunk 提示。
- R151 + R152 定向 Vitest：7 个测试全部通过。
- R152 Playwright：3 个场景全部通过，包括桌面完整旅程、390px、声音启动、减少动态、Canvas 与主素材双回退。
- 最终证据：
  - `docs/v2-deliveries/evidence/r152-thunderhead-score/01-desktop-opening.png`
  - `docs/v2-deliveries/evidence/r152-thunderhead-score/02-desktop-charge-shear.png`
  - `docs/v2-deliveries/evidence/r152-thunderhead-score/03-desktop-saved-score.png`
  - `docs/v2-deliveries/evidence/r152-thunderhead-score/04-mobile-charge.png`
  - `docs/v2-research/evidence/r152-thunderhead-score.final.json`
