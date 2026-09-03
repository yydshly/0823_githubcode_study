# R141 · Same Table Tonight delivery contract

## Design contract

- Entry mode: brief-led product regression
- Request revision: R141
- Target user and context: 与家人异地生活、希望发起一次共同晚餐的普通访客
- Desired first impression: 两个真实生活空间被同一张餐桌的边缘和光线轻轻连接，先感到距离，再感到靠近
- Visual ambition: Editorial；一张高质量生成宽幅主视觉作为渐进增强
- Experience architecture: Editorial Flow；短篇连续阅读，不使用持久参数工作台
- Visual constraints: 温暖、克制、生活化；避免奢华样板间、煽情人物特写和通用科技视觉
- Information constraints: 只解释“发起、双方留下一道菜和一句话、邀请另一桌加入”；不制造复杂产品功能
- Operation constraints: 原生滚动推进距离变化；主要行动必须是语义按钮并可用键盘触发
- State constraints: `apart → nearing → together → invited`；同一状态同时更新场景距离、光线、文案和行动反馈
- Environment constraints: 人物、地点、菜品与故事均为概念演示；不得冒充真实家庭或真实服务记录
- Primary journey: 看见两张异地餐桌 → 滚动让它们视觉靠近 → 阅读双方的一道菜和一句话 → 发起今晚的同桌时刻
- User-defined phase: R141 普通 brief 泛化验证
- Required artifacts: 可运行页面、单批素材与 manifest、桌面/手机/reduced-motion/fallback 浏览器证据、DirectCreativeRun、V3 归档入口
- Autonomy authorization: 用户连续指示“继续”，已授权在既有项目和有界预算内直接完成
- User-decision boundary: 无；方向、参考、媒介和布局由 Codex 根据现有产品协议自主选择
- Observable completion criteria: 主题无需标题仍可辨认；滚动使两桌从分离到相接；CTA 可完成；390px 可完成同一旅程；关键素材失败时诚实降级；最终身份绑定 `runId + bundleHash`

## Direction decision

内部比较一次完成，不再生成并行页面：

1. **生成宽幅双场景 + 编辑流（selected）**：真实生活材质承担情绪和主题，两半图像的位移与色温同步表达“靠近”。
2. 纯排版邀请信：内容清楚，但无法在隐藏标题后证明两张餐桌和距离感，视觉记忆不足。
3. WebGL 空间桥接：没有真实可检查模型或三维拓扑职责，增加几何只会制造技术表演。

选择结果与当前决策层一致：`generated-image / raster-image` 为主媒介，DOM/CSS 承担信息和行动，Canvas 只可承担轻量光线连接；宏观结构为 `editorial-flow`。

## Positive reference

- `positive-moonlit-tidepool-panorama`
- 只借鉴“一张连续宽幅主素材统一空间坐标，并让多种输入改变同一位置状态”的原理。
- 不复制潮池、夜巡、热点数量、月光色或横向滚轮劫持；本页的两个家庭空间不是事实地理，也不宣称连续真实地点。

## Asset decision

- One direction, one built-in image generation call, one source panorama.
- 主素材必须是同一张宽幅双场景：两张生活化餐桌共享眼平线和桌沿高度，中央留出可收合的距离带。
- 运行时可机械裁成左右两半；裁切不是第二素材批次。
- 不允许生成第二方案；若主素材未过主题辨识或连续性门，按研究结果停止，不静默重生。

## Attempt budget

- Direction selections: `1 / 1`
- Asset batches: `1 / 1`
- Complete builds: `1 / 1`
- Deterministic repairs: `0 / 2`
- Visual refinements: `1 / 1`（只移除最终合拢状态的人造暗缝阴影）
- Silent retries: `0`

## Coverage manifest

| Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| 主题专属第一视觉 | 1440×900 opening | `01-desktop-opening.png` + 1881×836 source load | 2 | pass | 冻结唯一主素材 |
| 距离到靠近的连续因果 | desktop apart / nearing / together | real wheel + gap/state observation + `02-desktop-nearing.png` | 5 | pass | 已冻结共享 progress |
| 最终行动 | desktop invited | button + completion observation + `03-desktop-invited.png` | 5 | pass | 已验证 CTA 完成反馈 |
| 信息清晰且无工作台惯性 | desktop full journey | editorial DOM order + final screenshot | 3 | pass | 保留短篇编辑流 |
| 键盘与焦点 | desktop keyboard | semantic button + focus-visible + Home/End support | 7 | pass | 保持原生可访问路径 |
| 手机与 reduced-motion | 390×844 | `04-mobile-reduced-invited.png` + no overflow | 7 | pass | 保留离散阶段导航 |
| 素材失败诚实降级 | forced image failure | `05-asset-fallback.png` + visible disclosure + footer CTA | 8 | pass | 不伪装双桌场景 |
| 工程与最终身份 | build + tests + report | TypeScript、Vitest、Playwright、`runId + bundleHash` | 9 | pass | 生成最终 run 后停止 |

## Stop rule

所有 coverage 行已经通过；最终视觉判断达到优秀门后归档唯一版本并停止。视觉精修预算已经用尽，不再继续改图或产生第二方向。
