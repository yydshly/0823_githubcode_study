# Kage 上游能力地图

## 结论先行

Kage 当前应被理解为一个**完成度很高的、单页式 DOM + WebGL 叙事作品**，而不是一个已经封装好的通用库或引擎。它证明了以下组合可以在无构建步骤的静态站中成立：语义化长页负责内容与可访问性，固定 Three.js 画布负责连续世界，滚动位置驱动摄影机，HTML 图片切片负责近景遮挡，最后用定制后期把画面统一为电影化成片。

对本研究项目最有价值的不是照搬京都寺院、美术或单文件实现，而是提炼出五个可独立重建的系统边界：

1. `Story / Chapter Model`：章节、锚点、文案与转场意图；
2. `Camera Director`：滚动进度到镜头位置、注视点、视场角的映射；
3. `World Adapter`：场景、氛围、重点物体和章节反馈；
4. `Quality Governor`：设备能力、画质档、动态分辨率和降级；
5. `Accessible Surface`：即使 WebGL 不可用，也完整保留导航与阅读路径。

这些边界是**研究推断与扩展建议**，不是上游已经暴露的 API。

## 证据口径

| 证据类型 | 本文使用的材料 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| Source evidence | 固定提交 `4399487d2fb42bce39c7b032fbbb50d230bf4f0b` 的 `upstream/index.html`、`README.md`、`PROMPT.md` | 实现路径、静态结构、参数与显式设计意图 | 真实用户设备上的稳定性能、商业可用性 |
| Runtime evidence | [`runtime-report.json`](../evidence/runtime-report.json)，生成于 `2026-08-23T20:43:59.740Z`，本机 headless Chrome | 七种受控场景是否启动、DOM/运行状态、请求/控制台、粗略 rAF 采样 | 实机 GPU 基准、长时间内存稳定性、所有浏览器兼容性 |
| Bounded conclusion | 源码与运行时同时支持的结论 | 当前固定版本在本研究环境中的能力 | 不外推为所有版本、所有设备均成立 |
| Hypothesis | 从结构推导的扩展方向 | 下一步最值得验证的实验 | 未经过原型或真实用户验证前，不作为既成能力 |

运行报告中的 `frameSample.fps` 只是 headless Chromium 下的 `requestAnimationFrame` 观察值，不是严谨 benchmark。开启后期时，`renderer.info` 在最终全屏合成之后取样，因此 `calls: 1 / triangles: 2` 主要反映最后一个全屏 pass，不能当作整帧场景复杂度；关闭后期的样本才直接显示 `187 calls / 60,734 triangles / 650 points / 900 lines`。

## 运行与内容架构

```text
语义化 HTML 章节 / 导航 / 文案 / 图片卡片
                 │ 计算章节锚点与滚动进度
                 ▼
       Catmull–Rom 摄影机位置与注视轨迹
                 │
                 ▼
Three.js 连续世界 ── 灯光 / 雾 / 雨 / 落叶 / 水面 / 字标
                 │
                 ├── DOM 前景 WebP：章节进入、固定、模糊退场
                 ├── 卡片局部视口：同一世界的附加摄影机
                 └── WebGL2 布料画布：桌面细指针增强
                 │
                 ▼
Half-float 场景缓冲 → 多级 bloom → 色调 / 色差 / 暗角 / 颗粒
                 │
                 ▼
            浏览器最终画面
```

这是一个**混合渲染合成**：寺院、鸟居、灯笼、地形、月亮和大量纹理由程序在运行时构建，但普通 HTML 层仍使用项目内的生成式场景图和透明 WebP 前景。不能把它概括成“所有可见内容都由 3D 实时生成”。

## 能力、原理、证据与限制

| 能力 | 原理与源码位置 | 运行时证据 | 当前限制 / 边界 |
| --- | --- | --- | --- |
| 零构建静态运行 | 单个 `index.html` 包含结构、样式与逻辑；`index.html:1205` 加载 vendored Three.js r149；[`README.md`](../upstream/README.md) 明确无需包管理器和运行时网络依赖 | 七个场景均 HTTP 200，`failedRequests: []` | 单文件约 249 KB、职责高度耦合；没有模块边界、类型系统、包 API、版本化配置或单元测试，不等于“可安装库” |
| DOM + WebGL 连续叙事舞台 | 全屏 `<canvas id="gl" aria-hidden="true">` 在 `index.html:889`；六个 `[data-cam]` 叙事锚点在 `933–1149`；DOM 负责文案和交互，WebGL 负责世界 | 所有场景正文长度 `2550–2644`；正常与 fallback 都保留 `chapters: 6`、`navLinks: 4` | README 的“五章节”是内容叙述；运行时的六个镜头锚点还包含 hero 与 colophon。章节模型硬编码在 DOM 和数组中 |
| 程序化场景建造 | `buildShell`、`buildTemple`、`buildTorii`、`buildLantern`、`buildMaple`、`buildRocks` 位于 `index.html:2489–2958`；自定义 geometry merge 在 `2452–2472` | post-disabled 场景观察到 `60,734` 三角形、`650` 点、`900` 线段 | 几何、坐标、材质与文化主题强绑定；没有场景清单、加载器接口、资源生命周期统一管理或可视化编辑器 |
| 运行时程序纹理 | 噪声、FBM、法线生成及墙、地、木、石、漆、障子、叶、天空、屋顶、月亮等纹理函数位于 `index.html:1232–2253`；`CanvasTexture` 上传在 `2305–2313` | 所有测试无资源请求失败；3D 世界可在本地离线启动 | 首次启动包含 CPU 纹理生成成本；纹理参数与风格写死；没有缓存、压缩产物或纹理预算报告 |
| 滚动驱动的连续摄影机 | 六组位置 `p`、注视点 `t`、FOV 在 `index.html:4034–4041`；`buildRig` 用两条 `CatmullRomCurve3` 插值位置和注视点（`4045–4048`）；`measure/progressFor` 把章节锚点映射为连续进度（`4090–4104`）；`applyCamera` 叠加宽高比适配、开场 dolly 与细指针视差（`4055–4084`） | `shot=0/1/2/3` 分别得到不同 `activeSection` 与 camera；导航点击后 `scrollY: 2764`、`activeSection: 2.838`、camera 已移动 | 镜头数据与 DOM 顺序一一耦合；无镜头碰撞、遮挡分析、曲线编辑、调试轨迹、时长控制或 URL 深链接状态 |
| 章节进入与跨层前景转场 | `IntersectionObserver` 驱动文字 reveal（`4146–4163`）；前景元素进入时重挂到顶层 `#fg-sky`，离开时模糊/退场并归位（`4196–4271`）；hero 离场序列在 `4290–4327` | 导航测试能到达目标内容，无 error overlay；截图场景可复现章节定帧 | 强依赖 DOM stacking context 与硬编码时序；重挂 DOM 对更复杂交互、焦点管理和框架 hydration 可能构成风险 |
| 氛围与环境反馈 | `buildAtmosphere`、`buildLeafFall`、`buildWisps` 在 `3075–3382`；`updateWorld` 更新灯光、雾、水波等（`4597–4652`）；落叶使用 `InstancedMesh`（`3198`） | 桌面：`rainEnabled: true`、`leafInstances: 260`；移动低画质：雨关闭、叶实例降至 `110` | 视觉反馈主要由全局时钟和硬编码参数驱动；无统一 cue/event 系统、无音频、无章节事件回放，也未做长时功耗验证 |
| 自定义电影后期 | `initPost/renderPost` 在 `3928–4030`：half-float 场景缓冲、四级亮部提取/高斯模糊/上采样，再合成 bloom、色差、ACES 近似、冷影暖高光、暗角、颗粒 | 默认场景 `postProcessing: true`；`?post=0` 得到 `false` 且页面正常运行 | 自维护 shader 与旧版 Three.js 编码 API 绑定；缺少效果预算、色彩管理验证和跨 GPU 精度测试；后期是明显 fill-rate 成本 |
| 同一世界的卡片局部镜头 | `buildCards` 创建四个附加摄影机（`4441–4458`）；按 DOM 矩形设 scissor；每卡片独立 render target，并仅在运动或轮转刷新时重绘（`4489–4563`） | 桌面 cards 与主场景同时存在且无页面错误 | DOM 与 WebGL 像素对齐复杂；透明度、滚动、缩放和后期顺序都有特殊分支；不是通用 portal 组件 |
| 桌面 WebGL2 布料卡片 | 96×96 网格、固定步长波动方程和指针 imprint 在 `3383–3825`；内容先烘焙到 2D Canvas，再上传纹理；独立 WebGL2 shader 渲染褶皱、边缘与阴影；离屏或能量耗尽时停帧 | desktop-gardens：`clothCanvases: 3`、`clothActiveCards: 3`；移动粗指针：两者均为 `0` | 每张卡片建立独立 WebGL2 上下文；CPU 维护网格并上传数据；仅桌面细指针启用；源码注释说明模拟源自 Canvas UI Cloth，复用范围还需单独核验该来源许可，不能只依据 Kage 仓库推定 |
| 指针视差与内容聚焦 | `wireCursor` 将 pointer 映射到 `RIG.tmx/tmy`（`4408–4425`），摄影机做小幅视差；`wireFocus` 让章节 hover 提升灯笼和月光反馈（`4396–4405`、`4600–4611`） | 桌面被识别为 fine pointer；移动为 `coarsePointer: true` 且自定义 cursor/cloth 被省略 | hover 反馈不适用于触屏；缺少键盘等价反馈的完整审计；尚未做输入延迟测量 |
| 响应式与低画质路径 | `COARSE` / `q` 决定质量（`1219–1220`、`2267–2275`）；低画质默认关阴影、降低 DPR cap、减少粒子；`fitAspect` 在窄屏沿视线后退并放宽 FOV（`4052–4063`） | 390×844：canvas 精确匹配视口；`pixelRatio: 1`、`shadows: false`、雨关闭、叶 `110`、布料 `0`，rAF 观察约 `57.7 fps` | 质量判定主要依靠 coarse pointer，不等价于设备性能；`q=low/high` 颗粒较粗，没有中档、显存探测或按效果逐项预算 |
| 动态分辨率调节 | `frame` 统计真实帧间隔，超过阈值降低 `PERF.scale`，低于阈值逐步恢复；最低缩放为 `.55`（`4676–4682`）；resize 同步像素比与后期目标（`4570–4587`） | 所测场景最终 `pixelRatio: 1`；未观察到页面错误 | 报告未记录 `PERF.scale` 时间序列，不能证明 governor 在各档的收敛质量；频繁 resize/render-target 重建可能产生抖动，需要专项 profiling |
| Reduced Motion 阅读路径 | CSS 有多处 `prefers-reduced-motion`；JS `REDUCE` 去掉文字延时、滚动平滑与摄影机 damping，布料不继续模拟（`1219`、`4160/4171`、`4337/4392`、`3778/3796`） | reduced-motion 场景：`reducedMotion: true`，正文、导航、3D 均可用，无控制台/页面错误 | 它不是“完全静止模式”：主 WebGL 循环仍在运行，环境更新是否全部停止未被证明；需要把 motion policy 做成可审计的逐效果清单 |
| 无 WebGL 内容降级 | `?nogl=1` 或 Three.js 缺失时抛错；早期 boot 失败进入 `fallback`，移除锁定并让隐藏内容显现（`2277–2279`、`4765–4781`） | fallback：正文长度 `2644`、`chapters: 6`、`navLinks: 4`，无 page error、无失败请求、无 error overlay | 强制降级会记录一条预期 `console.error`，所以总报告 `noConsoleErrors: false`；canvas 尺寸为 0。生产监控若不区分预期能力降级，会误报故障 |
| 导航与基本可访问语义 | header/nav/section/footer 为正常 DOM；canvas `aria-hidden`；章节 rail 按钮获得 `aria-label`；锚点点击尊重 reduced motion；移动菜单支持 Escape（`889–1149`、`4329–4393`） | 导航点击完成，页面不锁定；fallback 仍有导航与全文 | 目前只有结构观察，没有完成键盘全链路、焦点可见性、屏幕阅读器、色彩对比和 WCAG 自动审计 |
| 可复现审查状态与运行时探针 | 查询参数包括 `shot`、`q`、`post`、`shadow`、`dpr`、`adapt`、`nogl`、`driver`；`shot` 在 `4793–4801` 直接定帧到章节；`window.__kage` 暴露内部句柄（`4813`） | 七种自动化场景依靠这些入口稳定获取 hero、章节、移动、reduced、fallback、无后期状态 | 这是调试/审查入口，不是稳定公共 API；对象结构无版本承诺，不宜让产品代码依赖 |
| 分阶段启动与故障边界 | `JOBS` 将字体、renderer、世界、建筑、氛围、后期等分成 12 个启动任务（`4703–4747`）；加载条随任务推进；初始 renderer 失败进入阅读 fallback | 默认页面最终 `locked: false`，所有正常场景无错误 overlay | 中后段任务出错后代码仍会继续，缺少结构化错误分类、遥测、重试和资源释放；加载百分比是任务计数，不代表真实字节/时长 |

## 已验证运行矩阵

| 场景 | 关键结果 | 有界结论 |
| --- | --- | --- |
| Desktop hero，1440×900，`?shot=0` | WebGL2；后期开；阴影开；雨开；260 片落叶；3 个布料 canvas；无请求/页面错误；rAF 约 7.7 fps | 首屏完整启动。该低帧率只说明本 headless 环境的高画质首屏代价很高，不能直接等同用户实机 |
| Desktop gardens，1440×900，`?shot=2` | `activeSection: 2`；3 个布料 canvas 均激活；rAF 约 18.3 fps | 章节定帧、局部卡片与布料增强同时工作；仍需实机 profiling |
| Desktop navigation，1440×900 | 点击 `#lessons` 后滚动到 `2764`，镜头进度 `2.838`；无错误 | DOM 导航与连续摄影机映射能够协同完成一次真实跳转 |
| Mobile low，390×844，`?shot=1&q=low` | coarse pointer；无阴影、雨和布料；110 片落叶；rAF 约 57.7 fps | 移动路径不是简单缩放，而是主动删减高成本效果 |
| Reduced motion，1280×800，`?shot=3` | 媒体偏好被识别；内容、3D 和导航保留；无错误 | 阅读路径完整，但不能据此声称所有连续运动都已停止 |
| No WebGL，1280×800，`?nogl=1` | fallback 生效；全文和章节仍在；无请求/页面错误；有一条预期初始化错误日志 | 内容优先降级成立；监控需要把预期降级和真实异常分开 |
| Post disabled，1280×800，`?shot=2&post=0` | 直接渲染；187 calls、60,734 triangles；无错误 | 后期可作为独立质量开关；该模式也提供了更可信的场景复杂度采样窗口 |

## 主要工程限制

### 1. 作品结构，不是产品结构

章节、镜头、世界坐标、文案、视觉参数和质量策略共同存在于一个 HTML 文件。它有利于作品交付和离线运行，但会放大多人协作冲突，也不支持把“换内容”“换世界”“换镜头”“换质量策略”作为独立变更。

### 2. 性能预算仍未闭环

源码已经做了实例化、离屏停帧、卡片轮转刷新、动态 DPR、移动删效和静态阴影等有价值的优化；但当前桌面 headless 采样仍明显低于流畅线。下一轮必须在真实集显/独显、移动 Chrome/Safari 上分别记录 CPU、GPU、显存、上下文数量、热功耗和长任务，才可判断生产预算。

### 3. Reduced Motion 与 fallback 需要产品化

现状证明“内容不会丢”，但还没有效果级 motion registry、用户可见的画质/动效开关、fallback 原因分类和监控抑制规则。对品牌、文旅或公共展陈，这些都应成为明确验收项。

### 4. 内容、文化与素材强耦合

京都寺院语言是整体构图的一部分，不能把坐标和素材替换视为通用换肤。真实文旅项目还需要史实来源、文化顾问、图像授权、多语言和可访问替代内容，均不属于上游现成能力。

### 5. 版本与维护风险

上游 vendored Three.js r149，且使用旧式 `outputEncoding` 等 API。升级 Three.js 可能触发色彩管理、shader、render target 和 WebGL 行为变化，应建立固定视觉回归图和逐版本迁移记录，不能直接替换脚本文件。

## 许可与复用边界

- [`upstream/README.md`](../upstream/README.md) 明确写明：**目前没有授予 Kage 原始代码或美术的复用、再分发许可**。
- vendored Three.js 仍适用它自己的 MIT 许可；这不把 MIT 自动扩展到 Kage 的其他代码、布料实现、文案或素材。
- `PROMPT.md` 是构建说明，不是许可证。公开存在、可阅读或可本地运行，都不等于可以复制、改写后发布。
- 上游布料区注释称模拟与 shader 来自 Canvas UI Cloth；若未来要采用相同实现，必须单独追溯其确切来源与许可。
- 本研究文档可以记录事实、接口形态和有界结论；扩展实验应采用 clean-room 方式，使用原创主题、原创代码、无版权负担素材，不 import、不复制、不改写 upstream 源码与资源。
- 若要公开部署 Kage 衍生版本、商业复用其美术/代码或将其打包成库，必须先取得权利人明确授权并保留第三方归属。

## 对扩展实验的直接要求

首个独立实验不应追求复刻 Kage 画面，而应验证以下假设：

1. 章节、镜头、世界状态可以由一个带 schema 的 manifest 描述；
2. 相同 manifest 可以同时驱动 DOM 阅读层和 WebGL 增强层；
3. 摄影机曲线、章节 cue 与质量策略能够分模块测试；
4. `full / reduced / no-webgl` 三种体验共享同一内容真源；
5. 运行时诊断应暴露稳定、版本化的只读状态，而不是泄露整个内部场景对象。

如果这五项成立，Kage 对我们的意义就从“一个很美的参考页面”转化为“可配置沉浸式叙事系统的需求样本与回归基线”。
