# V2 R121 · 正式 Beta 主链路验收

## Design Contract

```text
Entry mode: Brief-led acceptance
Request revision: R121
Target user and context: 初次接触六点盲文、希望用视觉状态理解点位组合的明眼学习者与共学者；本页不替代真实触读训练。
Desired first impression: 五秒内看见一组像实体光穹般可辨认的六点触觉阵列，而不是数据面板、通用卡片或粒子背景。
Visual ambition: Immersive
Experience architecture: Spatial Stage
Visual constraints: 暖白、钴蓝、珊瑚红与柔和实体阴影；六个圆顶触点是持续视觉主体。不得使用暗色科技界面、随机粒子、仪表盘、长滚动章节或用文字变化冒充点位变化。
Information constraints: A / L / T 的标准六点盲文点位、当前升起点位、练习说明和“视觉教学演示，不能替代真实触读”的边界必须清楚可读。
Operation constraints: 一个方向、一次素材批次、一次完整构建、最多两次确定性修复、最多一次证据驱动视觉精修；点击与键盘必须操作同一状态。
State constraints: opening、A、L、T、saved、390px、reduced-motion 与增强层失败时的语义回退均可观察；减弱动效不隐藏点位结果。
Environment constraints: 使用现有 Kage V2 工作台、Vite、DOM/Canvas/Three.js 与正式 Job runner；不接新供应商、不使用真实用户数据、不部署远端。
Primary journey: 看见六点阵列 → 选择 A / L / T → 同一组六个触点升降且说明同步 → 用键盘重复切换 → 保存今日点阵练习。
User-defined phases: 运行生成；按需素材恢复；桌面/390px/减弱动效验收；最多一次证据驱动精修；修复；三态结论；通过后案例归档。
Required artifacts: 持久 Job、最终候选、桌面/390px/reduced-motion 证据、错误/请求观察、定向测试、总耗时、最终三态结论、按条件生成的案例记录。
Autonomy authorization: 用户明确要求完成正式 Beta 验收、修复问题并按门禁决定是否归档；仓库内可逆操作无需重复确认。
User-decision boundary: 外部发布、付费素材、真实盲文课程结论或不可逆迁移需要新授权；本轮均不涉及。
Observable completion criteria: 唯一 Job 进入 pass / needs-assets / review-required 三态之一；pass 必须同时具备最终候选身份、桌面/390px/reduced-motion 浏览器证据、可完成主旅程、无阻断错误和工程回归；只有 pass 才加入案例库。
```

## Exact brief

> 为盲文初学者设计一座明亮的“六点光穹”触觉星座练习网页。首屏持续展示同一组六个具有实体高度和柔和投影的圆顶触点；选择 A、L、T 三个练习字母时，正确点位在同一阵列中升起或落下，连接光带、点位编号和简短说明同步变化。点击与键盘方向键都能切换同一状态，最后行动是“保存今日点阵练习”。明确说明这是视觉教学演示，不能替代真实触读训练。使用暖白、钴蓝、珊瑚红和柔和实体阴影；用程序化 DOM、Canvas 或 Three.js 构建主体，不需要外部照片。不要暗色科技界面、随机粒子、数据仪表盘、长滚动章节或只改文字不改主体。

仓库去重证据：在 `projects/kage/lab` 的 Markdown、JSON、TypeScript 与 HTML 中检索 `盲文|点字|触觉星座|触觉图`，R121 前为零命中。

## Acceptance clock

- Goal lock：`2026-08-31T14:04:32.8213774+08:00`
- Final decision lock：`2026-08-31T14:37:48.0267715+08:00`
- **Total elapsed：`00:33:15.205`（1,995,205 ms）**
- Canonical start command：`npm run dev -- --host 127.0.0.1 --port 8143`
- Workbench URL：`http://127.0.0.1:8143/workbench.html?provider=codex&quality=high`
- Final candidate URL：`http://127.0.0.1:8143/generated-runs/dedicated-braille-r121-repair/?quality=high`
- Case URL：`http://127.0.0.1:8143/cases/dedicated-braille-r121-repair/`

耗时口径同时保留服务端事实，避免把人工证据检查时间混入模型耗时：

- 首次正式主链路从 Job 创建到有界 `review-required`：`83.891 s`。
- 同一持久 Job 从创建到最终 `complete`：`13:56.363`；包含唯一证据修复、浏览器复检和两次独立判定之间的等待。
- Job 记录的活跃阶段合计：`113.073 s`（planning 98 ms、assets 59 ms、authoring 75,607 ms、reviewing 37,309 ms）。

## Coverage Manifest

| 用户阶段 | 要求或产物 | 表面 / 状态 | 所需证据 | 内部阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 运行生成 | 唯一正式 Job 沿服务端主链路生成 | workbench / job history | `job-5f54280060921cab`、阶段时间、候选身份 | 0–6 | **pass** | 已停止新增 Job |
| 素材恢复 | 只在 `needs-codex-assets` 时恢复同一 Job | n/a | asset gate=`ready`、route=`procedural`、assets=0、recovery=0 | 5–6 | **not-applicable** | 无素材缺口，不伪造恢复 |
| 桌面验收 | 主体、A/L/T 联动、保存、键盘与错误监听 | 1440×900 / full motion | A、L、键盘 T + saved 三张截图与 E2E | 5–7 | **pass** | 无阻断错误 |
| 手机验收 | 390px 主旅程可完成且无横向溢出 | 390×844 | opening、L + saved；overflow=0 | 7 | **pass** | control/result/action 均在首视口 |
| 减弱动效 | 非必要运动被移除且点位信息不丢失 | prefers-reduced-motion | `matchMedia=true`、`.dome` transition=`0s`、状态与保存通过 | 7–8 | **pass** | 保留离散状态 |
| 证据驱动精修 | 最多一次；只有可复现缺陷才执行 | source / repaired / kept | parent、child、reviewer 次数和前后分数 | 2–8 | **pass · 1/1** | 不再进行第二轮 |
| 工程闭环 | 发现问题已修复且相关回归通过 | tests / build | 定向 Vitest、Playwright、TypeScript、production build | 9 | **pass** | 保留 R120 已登记债务边界 |
| 三态与归档 | `complete / blocked / review-required` 最终唯一结论 | record / case library | 结论、hash、catalog 与 cover | 9 | **complete** | 已按通过门禁归档 |

## Persistent Job and bounded refinement

- Contract：`contract-zdpd73`；结构为 `editorial-flow / editorial-field`，渲染为 `dom-only`，语义交互能力已选中。
- Job：`job-5f54280060921cab`；`authoringAttempts=1`、`recoveryAttempts=0`、`refinementAttempts=1`。
- 首稿：`dedicated-62215947bbff`，机械预检 `blocked / 32`。可复现证据是桌面和手机各一次 Google Fonts CSP 错误，以及容器级 primary-control 标记让因果探针点击不到真实按钮；人工语义复核还发现六点盲文空间顺序应为 `1/4, 2/5, 3/6`，切换字母后 saved class 没有复位。
- 唯一修复候选：`dedicated-braille-r121-repair`。同一方向、同一程序化素材路线、同一 Job、同一 child ID；没有第二个创意方向、第二批素材或第二次开放式模型精修。
- 修复内容：把因果标记落在真实未激活 L 按钮；视觉锚点收窄到六点阵列；校正 DOM 点位顺序与 T 光带；切换字母时清理保存态；移除外部字体；压缩 390px 纵向节奏，使控件、结果、免责声明和保存动作在 844px 首视口闭环。
- 终审：机械 `pass / 100`；独立视觉 `pass / 92`；delivery=`final-eligible`；Job 最终 `status=complete`、`decision=kept`、`bestRunId=dedicated-braille-r121-repair`。

## Browser evidence

| 证据 | 证明内容 |
| --- | --- |
| [`01-desktop-a-opening.png`](evidence/r121-braille-light-dome/01-desktop-a-opening.png) | 1440×900 opening；A=`[1]`，标准六点空间顺序可见 |
| [`02-desktop-l-click.png`](evidence/r121-braille-light-dome/02-desktop-l-click.png) | 点击 L 后同一阵列变为 `[1,2,3]`，连接光带、编号、cue 与说明同步 |
| [`03-desktop-t-keyboard-saved.png`](evidence/r121-braille-light-dome/03-desktop-t-keyboard-saved.png) | ArrowRight 到 T=`[2,3,4,5]`，随后保存并出现对应完成态 |
| [`04-mobile-reduced-opening.png`](evidence/r121-braille-light-dome/04-mobile-reduced-opening.png) | 390×844 + reduced-motion opening；无横向溢出，三类主路径节点在首视口 |
| [`05-mobile-reduced-l-saved.png`](evidence/r121-braille-light-dome/05-mobile-reduced-l-saved.png) | 手机点击 L 并保存；结果、边界声明和完成反馈保持可读 |
| [`report.json`](evidence/r121-braille-light-dome/report.json) | 持久 capture：desktop/mobile responseErrors=[]、browserErrors=[]、overflow=0 |
| `generated/runs/dedicated-braille-r121-repair/visual-review.json` | 自适应四检查点；causal anchor delta=`2.0606%` ≥ `1.8%`；机械 100、视觉 92 |

自动 E2E 还断言：DOM 点位顺序严格为 `[1,4,2,5,3,6]`；左右列 x 坐标分别一致、三行 y 坐标分别一致；A/L/T raised 集合分别为 `[1]`、`[1,2,3]`、`[2,3,4,5]`；桌面与手机 `console/pageerror=[]`。

## Product fixes and regression

本轮把候选暴露出的通用问题留在产品层修复，而不是只修改截图：

1. `server/dedicated-visual-review.ts`：primary-control 探针会进入标记容器寻找真实可见、可用且未激活的控件，不再点击 group/container。
2. `src/generation/generated-experience-bundle.ts`：生成 bundle 在落盘前拒绝 `@import`、远程 `url()`、`image-set()`、`-webkit-image-set()`、`image()` 与 `src()`；允许 `data:`、相对/站内路径、片段、注释与普通字符串。
3. 同一安全门禁收窄了 embedding-origin 正则：继续拒绝真实 `parent/top/opener/frameElement` 逃逸，但不再误杀 Three.js 常见的 `child.parent?.remove(child)` 或普通对象的 `top/opener/frameElement` 属性。

最终验证：

- R121 Playwright：`2/2 passed`（桌面完整旅程；390px reduced-motion 完整旅程）。
- reviewer + bundle + visual-review 定向 Vitest：`60/60 passed`。
- dedicated code materialization 串行复核：`34/34 passed`。
- case archive / catalog / asset / presentation：`16/16 passed`。
- 其余非既存债务单测：`93 files / 480 tests passed`。
- TypeScript + production Vite build：通过；只有既有的大 chunk 提醒。
- 完整矩阵仍有 R120 已登记的 5 个旧主题路由/素材契约断言失败（植物标本 2、阳台/地图与档案 2、榫卯可选环境 1）；隔离复跑为 `37 passed / 5 failed`。它们在 [`V2-R120-PLAYFUL-SPATIAL-PROOF.md`](V2-R120-PLAYFUL-SPATIAL-PROOF.md) 已登记，相关文件均不在 R121 变更面，本轮未覆盖或改写用户的未跟踪路由工作。

## Integrity and conditional archive

- `bundle.json` SHA-256：`FA44A09C233D610B362378A364B676A7FC1621E7042A2E063B197F29ADC093CA`
- `visual-review.json` SHA-256：`71675B28F081835D4054AC24FE55F15E50215500BB0A61B2670F70333D31CE76`
- Job JSON SHA-256：`688AD5022F21BBA33F0AB6A3BECAD61B7CB1028BA0E6B3CFAAA913A282B6509C`
- Case cover SHA-256：`58CE7EFED10D6F0E0B323A51C5DBA430E9E8A114F511409A0FDF2717FBD4B63C`
- 通过终审后才执行 archive：`dedicated-braille-r121-repair` 以 `featured` 写入 `cases/catalog.json`，案例和封面 HTTP 均为 200。
- Catalog 保持 20 条上限。只从公共 catalog 策展移出 `dedicated-f9ed58e5b7ea`（既有独立视觉 `revise / 71`、4 个 major）；其 `cases/runs` 与 `generated/runs` 证据均保留，没有删除历史。

## Final result

最终三态只选择一个：

- **`complete / pass`：SELECTED** — 最终候选身份、桌面/390px/reduced-motion、点击/键盘/保存、运行错误、机械门、独立视觉门与案例门全部满足。
- `blocked / needs-assets`：not selected — 素材职责为程序化 DOM，asset gate 直接 ready，恢复分支不适用。
- `review-required`：not selected — 首稿曾短暂进入此状态，但缺陷可在唯一证据修复范围内复现并关闭；最终持久 Job 已进入 `complete`。

**正式 Beta 主链路验收结论：PASS。** 因此本轮符合“只有通过才加入案例库”的条件，已完成 featured 归档；不会再追加第二轮精修。
