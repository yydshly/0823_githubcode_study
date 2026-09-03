# V2 R123 · 经纬光场旗舰验证

## Design Contract

```text
Entry mode: Brief-led direct delivery
Request revision: R123
Target user and context: 对纺织工艺好奇、希望先看懂“经纬如何形成图案”的年轻访客；页面是空间织造教学演示，不代表真实织机参数。
Desired first impression: 五秒内看见一台在暖白日光中逐层展开、可以亲手推进梭子的彩色空间织机，而不是参数面板、静态海报或暗色科技场景。
Visual ambition: Immersive / Flagship
Experience architecture: Spatial Stage
Scene base: WebGL Three.js with semantic DOM fallback
Scene persistence: 织机贯穿 opening、weaving 与 saved；不进入第二页面或长滚动章节。
Foreground control model: 小型标题、织造进度票签、推进/重置/保存动作；没有持久侧栏、滑杆或指标簇。
State-to-scene mapping: 空纱架逐层展开 → 每一梭综丝错峰升降、梭子横移、纬纱累积 → 晨鸟纹样完成 → 保存织纹。
Mobile transformation: 390px 固定单舞台，压缩标题与票签，底部操作保持 44px 可达；不改成长页面。
Fallback: 无 WebGL 时使用同构 CSS 织机与累计纹样，保留推进、重置、保存和结果说明。
Visual constraints: 暖白日光、朱砂、靛蓝、姜黄、真实纤维感；构图偏轴且织机占据空间，不使用暗色科技、随机粒子、固定三屏或以大标题替代主体。
Information constraints: 经纱、综丝、梭子、纬纱、当前行数、晨鸟纹样状态、教学演示边界和最终行动可理解。
Operation constraints: 点击、触摸、Canvas 手势与键盘写入同一有限状态；一次操作必须同时改变 3D 主体、行数和纹样说明。
State constraints: opening、至少六个 weaving 步骤、pattern-complete、saved、390px、reduced-motion、forced fallback 均可观察。
Environment constraints: 复用现有 Vite、Three.js、generated SDK、DirectCreativeRun、V2 首页与浏览器验收；不接后台 Codex、不接新供应商、不发起第二素材批次。
Primary journey: 看见织机展开 → 推进一梭 → 观察综丝/梭子/纬纱同步变化 → 连续织成晨鸟纹样 → 保存我的织纹。
User-defined phases: 一个方向；一批程序化素材；一次构建；最多两次确定性修复；最多一次证据驱动视觉精修；通过后接入示例库。
Required artifacts: delivery 三件套、冻结 brief/contract 测试、DirectCreativeRun 与源码 hash、桌面/交互/390px/reduced-motion/fallback 浏览器证据、cover、V2 示例入口、阶段记录。
Autonomy authorization: 用户已要求持续按小目标开发且不频繁询问；仓库内可逆实现、测试、证据和案例接入均已授权。
User-decision boundary: 外部部署、付费/受限素材、真实工艺参数或不可逆迁移需要新授权；本阶段均不涉及。
Observable completion criteria: 主题与三条正向参考可追溯；5 秒内出现可辨认织机；真实输入改变 3D 织造；桌面/390px/reduced-motion/fallback 主旅程通过；最终身份绑定源码；视觉质量与 WowGate 通过后才接入示例库。
```

## Exact brief

> 为对纺织工艺好奇的年轻访客设计一座明亮的「经纬光场」空间提花织机网页。开场让这台旗舰 Three.js 纤维构造装置从空纱架逐层展开经纱、综丝、梭子和卷布轴；点击、触摸、键盘或拉动梭子，每推进一梭，三组部件错峰升降，彩色纬纱累计织成可辨认的晨鸟纹样，织造行数、纹样说明与前后对比同步变化。最终行动为“保存我的织纹”。使用暖白日光、朱砂、靛蓝、姜黄与真实纤维质感；保持一个持续空间舞台，不使用滑杆工作台、固定三屏、暗色科技、随机粒子或只改文字不改织物。明确这是空间织造教学演示，不代表真实织机参数。

仓库去重：R123 锁定前，`提花|织机|织造|经纱|纬纱|jacquard|loom` 在项目 Markdown、JSON、TypeScript 与 HTML 中无既有主题命中。

## Reference and WebGL route

- Selected pattern: 单场景、直接操控的程序化关节 Spatial Stage。
- Evidence branch:
  - `positive-iris-articulated-reveal`：三个以上部件组按统一时间轴错峰变化。
  - `positive-night-greenhouse-continuity`：同一主体、尺度、光照和材质连续形成。
  - `positive-semantic-direct-interaction`：输入、画面、行数、结果和行动共享状态。
- Required inputs: 冻结 brief、程序化织机拓扑、六步织纹状态、语义 DOM 回退。
- Expected output: 一个明亮、非工作台、无需外部关键素材的 3D 织造页面与可复算最终证据。
- Asset truth: 主体为程序化概念织机，目标为可呈现的教学空间装置，不宣称真实提花机构或工业参数精度。

## Coverage Manifest

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 内部阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 方向锁定 | 新主题、去重、三条正向参考与 3D 路由 | contract | contract test / 本记录 | 0 | pass | 已冻结 |
| 一次构建 | 单一持续 3D 织机舞台 | desktop opening | `01-desktop-opening.png` + runtime snapshot | 1–3 | pass | 2.489 秒稳定，真实 WebGL |
| 主题交互 | 推进一梭同时改变综丝、梭子、纬纱、行数和说明 | desktop interaction | `02-desktop-progress.png` + 视觉 hash / DOM / runtime | 4–6 | pass | 点击、键盘、Canvas 拖动均验证 |
| 完成行动 | 图案完成后保存我的织纹 | desktop saved | `03-desktop-saved.png` + interaction evidence | 5–6 | pass | 六梭完成并保存同一织纹 |
| 跨表面 | 390px、键盘、reduced-motion | mobile / reduced | `04-mobile-reduced.png` | 7 | pass | 无横向溢出，主行动可达 |
| 能力回退 | forced WebGL fallback 保留同一旅程 | fallback | `05-fallback-saved.png` | 8 | pass | SVG 同构旅程完成并保存 |
| 最终身份 | runId + bundleHash + DirectCreativeRun | source / JSON | evidence test / persisted run | 9 | pass | `direct-1uton5v` / `d3992492…91d0` |
| 示例归档 | 只在质量门通过后接入第 13 个示例 | V2 index | final cover + route E2E | 9 | pass | 视觉 93、WowGate 94，已接入 |
| 工程闭环 | 定向、页面、生产与全量回归 | tests / build | command output | 9 | pass | 定向 E2E、生产与 Pages 构建通过 |

## Final status

R123 已阶段性关闭。最终页面采用一个持续的明亮 3D 织机空间，六次真实输入累计形成晨鸟纹样；不是背景贴图，也没有退回固定三屏或参数工作台。浏览器证据覆盖桌面开场、因果交互、完成保存、390px 低动效和强制回退，所有运行时错误集合为空。

执行严格保持有界：一个方向、一批程序化素材、一次完整构建、一次针对 3 秒开场边界的确定性修复、零次视觉精修。最终源码、五个浏览器场景与归档记录绑定到同一身份：

- `runId`: `direct-1uton5v`
- `bundleHash`: `d399249270d7965666d19f9f6287593ce03324dce54e66206c7ad40940ce91d0`
- visual quality: `93 / pass`
- WowGate: `94 / pass`
- archive eligibility: `pass`

后续若修改 delivery 的 `index.html`、`style.css` 或 `main.ts`，必须重新计算 hash、重跑浏览器证据并重新决定归档资格；R123 本身没有剩余 `continue`。
