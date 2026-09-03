# V2 R116 — 视觉野心通用闭环

## 设计契约

- Entry mode：revision-led。
- Request revision：R116。
- Target user and context：在工作台输入一个普通想法，希望直接获得与主题匹配、具有视觉记忆与有效互动的网页，而不是重复模板。
- Desired first impression：结果在前五秒内建立一个主题专属的视觉锚点；是否使用 3D、Canvas、声音、真实素材或编辑排版由内容决定。
- Visual ambition：由 brief 自动推导 `restrained | expressive | immersive | flagship`，不把旗舰或 WebGL 设为全局默认。
- Experience architecture：由内容选择 Editorial Flow、Spatial Stage 或 Hybrid Workspace；本轮阶段验证不得复用薄膜圆环/实验室构图。
- Visual constraints：素材来源开放；运行效果必须服务主题；不得用低质量 CSS 图形冒充关键素材；不得重新引入暗色、三屏、中央主体、巨型标题或粒子等全局禁令。
- Information constraints：主体、受众、价值、主要行动和模拟/真实边界必须可理解。
- Operation constraints：沿用现有 Vite、Three.js/Canvas/DOM、参考库、DirectCreativeRun 与浏览器验收；不建设后台 Codex 自动接入，不新增模型供应商。
- State constraints：承诺的交互必须由真实输入同时改变可见场景和语义状态；无互动价值时不强加互动。
- Environment constraints：保留 V1、案例库、工作台和普通 V2 结果兼容性。
- Primary journey：输入想法 → 自动选择视觉野心与架构 → 融合 1–3 个正向参考 → 有界创作 → 自适应浏览器证据 → 一般质量门与必要的 WowGate → 归档或诚实停止。
- User-defined phases：接通视觉野心；接通 Wow 证据；一次跨语法验证；阶段结论。
- Required artifacts：通用 ambition bridge、通用 Wow evidence adapter、定向测试、一个不同视觉语法的可运行验证结果、浏览器证据、最终身份记录和阶段结论。
- Autonomy authorization：用户已明确“继续”；仓库内可逆实现与有界验证无需重复确认。
- User-decision boundary：真实商业数据、外部发布、新服务或不可逆操作仍需另行授权。
- Observable completion criteria：任意未限制风格的 brief 不产生全局风格禁令；DirectCreativeRun 自动携带视觉野心；immersive/flagship 只有同 bundle 的自适应 Wow 证据通过才可归档；普通优秀编辑结果不被强迫走 WowGate；一次新主题证明非薄膜视觉语法；无无限重试。

## 有界执行

- 一个协议改造批次。
- 一个通用证据适配批次。
- 一个新主题、一个方向、一个素材批次、一次完整构建。
- 最多两次确定性修复和一次视觉精修。
- 任一阶段超过 60 秒报告状态；素材失败不得静默重开批次。
- 阶段验证未通过时作为研究结果停止，不进入精选库。

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 内部阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 接通视觉野心 | brief 自动推导等级、架构与视觉锚点 | CreativeContract / DirectCreativeRun / authoring brief | Vitest、类型检查 | 0–1 | continue | 实现通用 ambition bridge |
| 接通 Wow 证据 | 自适应浏览器观察绑定最终身份 | review plan / evidence adapter / archive gate | Vitest、身份失效测试 | 5–9 | continue | 实现通用 evidence adapter |
| 保持兼容 | restrained/editorial 不被强制旗舰验收 | 既有合同和直接创作协议 | 回归测试 | 1–9 | continue | 覆盖非旗舰与旧合同 |
| 跨语法验证 | 非薄膜、非圆环、非实验室视觉语言 | 新 delivery 桌面、交互、390px、reduced motion、fallback | 真实 Chrome、自适应截图 | 2–8 | continue | 协议通过后只构建一个主题 |
| 最终归档 | 证据与最终 runId + bundleHash 一致 | DirectCreativeRun / V2 精选 | JSON、测试、阶段记录 | 9 | continue | 通过才归档并关闭阶段 |

