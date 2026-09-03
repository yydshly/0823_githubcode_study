# V2 R125 · 冰芯来信非工作台视觉证明

日期：2026-08-31  
状态：closed / archived  
唯一方向：冰芯来信 / Letters Held in Ice

## Design Contract

- Entry mode：brief-led；验证 R124 结构修正能否产出非工作台但仍具有空间吸引力的页面。
- Request revision：R125 / revision 1。
- Target user and context：面向普通访客与学生的气候记忆展陈；用户不需要专业知识即可理解冰芯为何保存时间证据。
- Desired first impression：一根真实、半透明且具有内部层理的冰芯悬在明亮冰川空间中；不是仪表盘，也不是普通背景图。
- Visual ambition：Immersive。
- Experience architecture：Hybrid Workspace；滚动文档与持续 3D 冰芯共享叙事，但没有持久参数面板。
- Visual constraints：冷白、冰蓝、微弱灰褐火山灰与暖金花粉；通透、自然、克制；避免暗色科技、霓虹网格、中央产品海报与等高三屏。
- Information constraints：只保留 4 个非均匀章节；每章解释一种可见层理，证据贴近其滚动位置；不使用实时指标簇与滑杆。
- Operation constraints：滚动/触摸推进深度；章节导航和键盘可达；最终 CTA 打开一张可关闭的“给未来的信”编辑纸；交互必须可观察地改变 3D 深度和层理。
- State constraints：opening → air-bubbles → ash-band → pollen-summer → letter-ready；reduced-motion 保留离散状态，fallback 保留层理、年代与最终行动。
- Environment constraints：Vite + TypeScript + Three.js；canonical URL 使用 `127.0.0.1:8143`；不接后台模型、不新增供应商。
- Primary journey：看见冰芯 → 向下滚动进入不同年代 → 观察气泡/火山灰/花粉层 → 理解时间证据 → 封存一封给未来的信。
- User-defined phases：R124 协议生效 → 一个新主题 → 一批素材 → 一次构建 → 浏览器证据 → 最多一次明确精修 → 最佳版归档。
- Required artifacts：设计契约、唯一环境素材、delivery 源码、fallback、浏览器证据、DirectCreativeRun、bundleHash、V2 示例入口、阶段结论。
- Autonomy authorization：用户已要求持续开发、以小目标推进且不频繁确认；范围内可逆实现无需再次询问。
- User-decision boundary：只有真实数据来源、外部发布或不可逆操作需要新授权；本阶段均不涉及。
- Observable completion criteria：首屏 3 秒可辨认冰芯；真实滚动改变相机/冰芯层理并激活对应证据；最终 CTA 可完成；桌面、390px、键盘、reduced-motion、强制 fallback 可用；无阻断错误与横向溢出；结构审查证明其不是无依据工作台。

## Design direction

| 决策层 | 选择 | 可观察约束 | 验收 |
|---|---|---|---|
| Composition | 一条纵向阅读路线与持续的冰芯空间并置 | 文档区和冰芯不形成左右控制台；章节长度非均匀 | 桌面可同时感知“正在阅读”和“正在下潜” |
| Focal hierarchy | 冰芯层理先于年代文字，CTA 只在结尾主导 | 首屏只有一个主标题和一个滚动提示 | 3 秒内识别冰芯主题，不依赖说明文字 |
| Typography | 纪事性衬线标题 + 克制无衬线证据 | 不使用巨型全屏口号，不叠加数据仪表盘 | 年代、证据与行动有三种清楚层级 |
| Palette / material | 冰白、浅蓝、灰褐灰层、暖金花粉 | 材料颜色来自证据状态，不做通用霓虹 | 每个层理状态可从画面而非标签辨认 |
| Depth | 生成环境图作为远景，Three.js 冰芯承担近中景 | 图片不冒充互动主体；3D 层理随滚动变化 | Canvas 状态变化可由浏览器哈希/快照证明 |
| Motion | 滚动下潜、层理聚焦、内部气泡漂移 | reduced-motion 改为离散切换 | 动效解释时间深度，不制造等待 |

## Coverage manifest

| 用户阶段 | 要求 / 产物 | Surface / state | Evidence | Stage | Status | Next action |
|---|---|---|---|---:|---|---|
| 素材 | 唯一冰川环境素材 | project asset | 文件 + 实际加载 | 1 | pass | 1672×941 生成环境图真实加载，未重试 |
| 构建 | 非工作台空间旅程 | desktop opening | screenshot + DOM + WebGL | 2–3 | pass | 1919ms 内出现冰川与 Three.js 冰芯 |
| 互动 | 滚动驱动层理与相机 | before / middle / ending | interaction + state snapshot | 5–6 | pass | 三层状态、画布哈希和截图哈希均不同 |
| 行动 | 封存未来信件 | ending + dialog | click / Escape / focus return | 4–6 | pass | 非空信件可封存，Escape 返回 CTA |
| 移动 | 390px 完整旅程 | mobile | screenshot + overflow | 7 | pass | reduced-motion 无横向溢出，End 可到终点 |
| 可达 | 键盘章节与 CTA | desktop keyboard | focus + state | 7 | pass | 章节锚点、方向键、Home/End 与 dialog 焦点通过 |
| 动效 | reduced-motion | desktop reduced | browser observation | 7 | pass | 保留离散层位和真实渲染变化 |
| 回退 | 强制无 Canvas | fallback | screenshot + action | 8 | pass | SVG/CSS 冰芯、层理和写信行动完整 |
| 工程 | 身份、测试、构建 | final bundle | tests + hash | 9 | pass | `direct-r125-ice-core-letters` / `de2fe28e…94f031` |
| 归档 | 唯一最佳版与 V2 入口 | V2 library | final files | 9 | pass | 最终版作为第 14 个已验证示例接入 |

## R124 structure intent

候选宏观骨架：`spatial-journey / persistentControlPanel=false / visibleParameterControls=false / realtimeMetricCluster=false / primaryAction=record-or-contribute`。当前方向不满足持久工作台条件，结构门应通过非工作台路线，而不是把滚动互动自动解释为 `focus`。

## Final visual review

首轮浏览器证据证明页面结构和互动成立，但 Three.js 冰芯仍偏规则线框圆柱。唯一一次视觉精修只调整冰芯：打破规则轮廓、降低线框与密集层环、加强透明冰材质；没有改页面结构、追加素材或开启第二个方向。最终独立视觉质量与 WowGate 均为 `91 / pass`，保留一个诚实的 minor：冰芯是层位阅读概念模型，不是科学测量模型。

浏览器证据覆盖桌面开场、气泡/火山灰/花粉中段、写信与焦点返回、390px reduced-motion、强制 fallback；五个场景的页面、控制台、请求和 HTTP 错误均为零。最终身份：

- `runId`: `direct-r125-ice-core-letters`
- `bundleHash`: `de2fe28ea88ca9d6c238947c634ccbe92f11793422c31f448c2c310d0a94f031`
- attempt budget：一个方向、一批素材、一次构建、零次确定性修复、一次视觉精修
- macro structure：`spatial-journey / content-fit pass / persistentWorkbench=false`

## Generated asset record

唯一图片批次生成并采用 `assets/glacier-crevasse-v1.png`。最终生成提示词：

> Use case: stylized-concept. Asset type: immersive web experience full-bleed background environment. Primary request: a vast natural glacier crevasse interior seen from a calm forward-facing viewpoint, with layered translucent ice walls creating a deep vertical passage and a soft opening of daylight far above; the environment should feel scientifically plausible, quiet, ancient, and physically real. Leave the central near-to-mid foreground relatively open so a live Three.js transparent ice-core column can be composited there without visible image boundaries. High-end cinematic environmental photography, wide 16:9, diffuse polar daylight, wet translucent ice, no text, people, machinery, fantasy crystals, cyberpunk, neon grid or central poster object.

R125 已阶段性关闭，没有剩余 `continue`。它证明 R124 的结构门不只是规则测试：一个未使用主题可以在不采用参数工作台的前提下，仍形成主题专属、动态、3D、可滚动且可行动的完整网页。
