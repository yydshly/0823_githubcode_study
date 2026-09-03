# V2 R157 · 声纹压片室

## Design contract

- Entry mode: brief-led direct implementation
- Request revision: R157 / promoted-reference validation
- Target user and context: 喜欢声音与实体媒介的独立创作者，想把一小段声音变成可看、可触发、可保存的材质印记
- Desired first impression: 一张透明唱片悬浮在暗暖压片室中，尚未发声时近乎无痕；声音进入后沟槽、折光和边缘振动逐层显现
- Visual ambition: Immersive
- Experience architecture: Spatial Stage
- Scene base: WebGL transparent disc + semantic DOM foreground
- Scene persistence: 唱片从开场到保存始终可见；完成信息叠加在同一舞台，不转入参数工作台
- Foreground control model: 顶部声音开关、右侧实时频段读数、底部压片进度和最终保存动作
- State-to-scene mapping: silent → cutting → resonant → kept；滚动控制压片深度，真实 Web Audio 频段持续控制沟槽、折光与边缘振动
- Mobile transformation: 保留唱片主舞台，将频段读数收为底部紧凑信息层；不改成长文档
- Fallback: 无 WebGL 时使用可读的同心沟槽视觉；无音频时明确显示不可用，滚动与保存路径仍成立
- Visual constraints: 主体必须是主题专属、可辨认且真正动态的透明唱片；动效用于说明声音进入材质，不堆砌粒子或通用科技装饰
- Information constraints: 首屏说清“声音压进材质”；完成态说明这是浏览器中的声音可视化演示，不是母带制作或实物压片结果
- Operation constraints: 滚轮、阶段按钮和键盘推进；点击播放后由真实 AnalyserNode 产生低/中/高频值；指针只改变观察角度；保存动作有明确状态
- State constraints: 三个频段必须产生不同的、可观察的视觉职责，不得只有数字变化或统一缩放
- Environment constraints: 复用现有 Vite、Three.js 与 Web Audio；不接工作台后台、不调用第二模型供应商、不生成静态素材批次
- Primary journey: 看见无声透明唱片 → 开启声音 → 滚动压入声纹 → 观察三个频段改变同一材质 → 保存这一段声纹
- User-defined phases: 一个新主题、一个方向、一次完整构建、最多一次基于浏览器证据的视觉精修
- Required artifacts: 独立 delivery、最终桌面开场/声纹状态/保存状态、390px 状态、WebGL 与音频 fallback 证据、测试与最终结论
- Autonomy authorization: 用户已连续授权“确定并继续”，要求以整体目标为准且不频繁询问
- User-decision boundary: 不部署远端、不改 V1、不接后台 Codex、不宣称模拟声音为真实母带或实体唱片
- Observable completion criteria: 首屏可辨透明唱片；滚轮与声音分别产生真实且不同的可见变化；保存可完成；移动端无阻断溢出；失败回退诚实可用；最终 bundle 无调试残留

## Direction decision

| 决策 | 选择 | 可观察结果 |
| --- | --- | --- |
| 标志性现象 | 声音被压进透明材质 | 沟槽从无到有，折光随中频变化，边缘随高频轻微振动 |
| 主体 | 单一透明声纹唱片 | 全程持续可见，不用静态主图替代运行时职责 |
| 媒介 | Three.js shader / physical material + Web Audio AnalyserNode + DOM | 真实频段与同一渲染状态相连，语义内容和行动独立可用 |
| 参考原则 | `positive-audio-signal-continuity` + `positive-noise-surface-causality` | 借用信号连续性与单一进度控制，不复制案例页面 |
| 素材策略 | 程序化媒介承担实时材质职责 | 不以低质量代码图形冒充产品；也不让静态生图承担无法连续变化的职责 |

## Coverage record

| 阶段 | 要求 | 状态/表面 | 证据 | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| R157 | 可运行空间舞台 | desktop / silent | `01-desktop-opening.png` + runtime snapshot | Stage 1–3 | pass | 无 |
| R157 | 滚轮压片因果 | desktop / cutting | progress、grooveDepth 与可见沟槽 | Stage 5–6 | pass | 无 |
| R157 | 真实音频连续响应 | desktop / audio | `02-desktop-resonant.png` + AudioContext/AnalyserNode 三频段采样 | Stage 5–6 | pass | 无 |
| R157 | 完成与保存 | desktop / kept | `03-desktop-kept.png` + saved=true | Stage 5–6 | pass | 无 |
| R157 | 移动端可用 | 390px | `04-mobile-resonant.png` + overflow=0 | Stage 7 | pass | 无 |
| R157 | reduced motion | desktop | reducedMotion=true + 可完成 | Stage 7 | pass | 无 |
| R157 | WebGL / audio fallback | mobile + desktop | `05-mobile-webgl-fallback.png`、`06-desktop-audio-fallback.png` | Stage 8 | pass | 无 |
| R157 | 工程闭合 | source | TypeScript、pages build、3 项 Playwright、定向 Vitest | Stage 9 | pass | 无 |

## Final decision

R157 在一个方向、零素材批次、一次完整构建、一次确定性入口修复和一次视觉精修内关闭。最终选择结果为 `webgl-procedural`，不是出于素材禁令，而是因为真实频段连续改变材质这一职责无法由静态图片承担。最终 `runId=direct-r157-sonic-pressing-room` 与 `bundleHash=859f79b0d16dddf86ba0f6bd14c5b0c7ab72f911f3d39df4daf25c211b733393` 已绑定浏览器证据；通过质量门后替换较弱的“极光无线电明信片”精选入口，案例总数仍为 12。
