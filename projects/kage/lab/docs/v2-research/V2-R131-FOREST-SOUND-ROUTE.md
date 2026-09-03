# V2 R131 — 森林声音路线直接创作合同

## 设计契约

- Entry mode：brief-led；R130 决策证明后的唯一真实页面交付。
- Request revision：R131。
- Target user and context：儿童自然博物馆中的学生、亲子访客与普通访客。
- Desired first impression：走进一块有晨光、树叶、树洞、溪石与昆虫层次的森林剖面，声音像藏在空间里等待发现。
- Visual ambition：Immersive。
- Experience architecture：Spatial Stage。
- Scene base：内联 SVG 为主要场景；DOM 语义控件与说明位于前景；本地 WAV 为声音增强。
- Scene persistence：森林场景贯穿发现、试听、收集与保存，不切换到工作台或卡片长页。
- Foreground control model：四个空间热点、播放/停止、静音、音量、观察提示、收集进度与最终保存。
- State-to-scene mapping：等待发现 → 当前声源 → 已收集路线 → 已保存；声音不可用时保留全部视觉与保存旅程。
- Mobile transformation：390px 保留场景，说明区转为底部信息层；热点仍可触摸，最终行动可达。
- Fallback：无音频或 reduced-motion 时仍可选择声源、观察波纹静态状态、形成路线并保存。
- Visual constraints：明亮自然色、主题专属对象、非卡片目录、非暗色科技、非固定三屏；不继承午夜电台的网格或圆环构图。
- Information constraints：声源名称、位置、观察提示、程序化声音真实性说明、收集进度和最终行动属于同一旅程。
- Operation constraints：指针、触摸、键盘共享一个选择状态；声音只能由显式用户手势启动；一次只播放一个声源。
- State constraints：叶片、树洞、溪石、昆虫四种声音必须可区分；选择同时改变声源位置、波纹、提示、路线与播放状态。
- Environment constraints：沿用现有 Vite 多页构建和 8143 规范运行时；不接后台 Codex、不引入供应商、不使用远程音频。
- Primary journey：发现空间热点 → 启动并比较声音 → 收集任意三个 → 看见聆听路线 → 保存路线。
- User-defined phases：参考增强、一次素材批次、一次完整构建、真实浏览器验收、最多一次视觉精修、通过后归档。
- Required artifacts：两份正向参考证据包、四个本地 WAV、可运行页面、桌面/交互/音频/390px/reduced-motion 证据、最终 DirectCreativeRun 与归档入口。
- Autonomy authorization：用户已要求持续按小目标推进，不频繁确认；范围内可逆实现无需再次询问。
- User-decision boundary：不购买或声明真实现场录音；不接外部服务；不批量重做旧案例。

## 可观察完成标准

1. 首屏可以识别儿童自然博物馆、森林声音探索和四个主题对象。
2. 四个本地 WAV 均可加载、内容唯一、能量非零，并明确标注为程序化自然声预览。
3. 点击、触摸或键盘选择声源后，声音、空间波纹、提示和收集状态同步变化。
4. 收集三个后形成可见路线，保存动作可用并给出成功反馈。
5. 音频播放失败不撤销已选对象，不阻断路线与保存。
6. 桌面与 390px 无阻断溢出；reduced-motion 不隐藏信息。
7. 最终证据绑定同一 `runId + bundleHash`，任何代码修订都会使旧证据失效。

## 参考融合

- `positive-paper-butterfly-object-field`：借完整对象集合、同一空间选择、跨输入和收集因果；不继承 Three.js 或温室素材。
- `positive-sonic-editorial-feedback`：借显式播放、状态绑定、静音/音量和诚实降级；不继承其研究级网格、圆环或文字主导构图。

## 覆盖清单

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 参考增强 | 两个高相关正向证据包进入执行包 | contract / authoring | `v2-r131-forest-sound-reference-route.test.ts` | 0 | pass | 已冻结 Top 2 正向原理 |
| 素材 | 四个可区分本地 WAV | delivery assets | WAV 结构、能量与哈希测试 | 1 | pass | 一批素材后停止生成 |
| 首屏 | 明亮森林剖面与核心行动可理解 | 1440×900 opening | `01-desktop-opening.png` | 2-3 | pass | 首屏证据已绑定最终身份 |
| 互动 | 热点、波纹、提示与收集共享状态 | desktop pointer / keyboard | `02-desktop-first-sound.png` / 状态样本 | 4-6 | pass | 三种输入共享状态已验证 |
| 音频 | 播放、停止、静音、音量和失败降级 | desktop audio | 媒体 playing / `05-audio-unavailable.png` | 5-8 | pass | 三个 WAV 与非阻断降级已验证 |
| 路线 | 收集三个并保存路线 | completion | `03-desktop-route-saved.png` | 5-6 | pass | 路线与保存完成态已验证 |
| 手机 | 390px 可触摸、无溢出、行动可达 | mobile | `04-mobile-reduced.png` / 操作状态 | 7 | pass | 触摸旅程与保存已验证 |
| 动效边界 | reduced-motion 保留全部信息 | reduced | 390px reduced-motion 状态 | 7-8 | pass | 离散状态完整保留 |
| 工程 | 测试、build、console/request | repository/runtime | Vitest / Playwright / build | 9 | pass | 定向与回归检查通过 |
| 归档 | 只保留通过质量门的最终版本 | V2.5 registry | `direct-r131-forest-sound-route` + `2a8112…b0906` | 9 | pass | 最终身份与案例入口已冻结 |

## 执行边界

- 一个方向：明亮森林剖面对象场。
- 一次素材批次：四个确定性程序化 WAV。
- 一次完整构建，最多两次确定性修复。
- 最多一次视觉精修。
- 未达到优秀标准时停止为研究结果，不进入精选库。
