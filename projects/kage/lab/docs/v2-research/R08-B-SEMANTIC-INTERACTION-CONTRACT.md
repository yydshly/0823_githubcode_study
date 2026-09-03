# R08-B · 交互即信息 E4 原型契约

状态：E4 已通过；R08-C 已接入并总结归档  
更新时间：2026-08-27

## 路由

```text
Selected pattern: Prototype / DOM + WebGL scroll story / Spatial Stage
Evidence branch: Scroll Scrub Media E4 + MotionSites Interactive Discovery + local Spotlight evidence
Required inputs: project-owned procedural coastline data; no external assets or APIs
Expected output: independent runnable prototype with semantic multi-input interaction and readable fallback
What should update the skill: none before browser evidence and a bounded conclusion exist
```

## 设计契约

```text
Entry mode: brief-led implementation
Request revision: R08-B / initial
Target user and context: Kage 能力研究者；需要判断一种交互是否值得交给生成器复用
Desired first impression: 安静、真实、像一份可触摸的海岸证据档案，不是霓虹科技演示
Visual ambition: Immersive
Experience architecture: Spatial Stage
Visual constraints: 单一沙岩、潮水和纸张色系；无紫色科技风；主视觉与证据文字必须属于同一信息关系
Information constraints: DOM 承载年代、数值、解释和操作；WebGL 只表达海岸形态、侵蚀范围与时间变化
Operation constraints: 滚动切换叙事层；指针和触摸横向比较年代；方向键切换年代；所有操作有可见结果
State constraints: opening / compare / consequence；1984 / 2004 / 2026；enhanced / fallback；full / reduced motion
Environment constraints: desktop 1440×900；mobile 390×844；Chrome；暗色单主题；中文单语言
Primary journey: 进入档案 → 理解三种证据层 → 比较年代 → 看见海岸损失及对应数字 → 明白交互表达了什么
User-defined phases: R08-B 独立原型；R08-C 接入生成器并完成能力总结
Required artifacts: 独立路由、源代码、浏览器验收、最终桌面和手机证据、研究结论
Autonomy authorization: 用户已明确“继续”，允许项目范围内的可逆实现与验证
User-decision boundary: 新增外部素材、API、部署或改变 V1 冻结行为才需要新授权
Observable completion criteria: 交互改变年代、数字和 WebGL 海岸形态；桌面与手机无溢出；键盘可达；减少动态效果和无 WebGL 回退仍可阅读与操作；构建和浏览器测试通过
```

## Spatial Stage 约束

- Scene base：WebGL；程序化地形与粒子，不下载外部资产。
- Scene persistence：三个滚动状态中保持全屏；到页面结束仍保留最终证据。
- Foreground control model：页头、阶段标识、年代选择器、数值和操作说明均为语义 DOM。
- State-to-scene mapping：滚动改变观察层；年代改变侵蚀边界、相机与证据数值；失败时使用 CSS 海岸轮廓背景。
- Mobile transformation：时间选择器和数据证据压缩到下方可触达区域，不使用 hover 作为必要入口。
- Fallback：`?fallback=1` 强制可验证；内容、年代切换、数值和结论必须完整保留。

## 视觉决策

| 决策 | 选择 | 可观察约束 | 验收 |
| --- | --- | --- | --- |
| 构图 | 右侧/中央持续海岸场，左侧阶段叙事，下方年代控制 | 主视觉不被独立卡片框住 | 首屏能同时识别主题、证据和操作 |
| 焦点 | 当前海岸形态与损失数字共同领先 | 数字变化必须与场景变化同时发生 | 切换年代时两者同步 |
| 排版 | 编辑式衬线标题 + 等宽证据标签 | 标题不遮挡操作；正文保持短行 | 390px 无裁切 |
| 色彩 | 岩灰、潮蓝、湿沙、纸白 | 无紫色和高饱和霓虹 | 暗色单主题可读 |
| 深度 | WebGL 地形、雾和少量粒子；DOM 为清晰前景 | 不用强辉光制造焦点 | 文字对比稳定 |
| 动效 | 时间与滚动解释状态变化 | reduced motion 立即到达目标状态 | 信息不因停用动画而丢失 |

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| R08-B | 可运行独立原型 | desktop / enhanced / opening | 本地路由与运行快照 | Stage 1 | pass | — |
| R08-B | 交互改变信息 | desktop / compare / pointer | 年代、数字、SVG 岸线与 Three.js 场景同步 | Stage 5 | pass | — |
| R08-B | 触摸等价路径 | mobile / compare / touch | 真实 touch context 与年代选择 | Stage 7 | pass | — |
| R08-B | 键盘等价路径 | desktop / keyboard | 左右方向键、焦点与状态快照 | Stage 7 | pass | — |
| R08-B | 减少动态效果 | desktop / reduced motion | Playwright `reducedMotion: reduce` | Stage 8 | pass | — |
| R08-B | WebGL 失败回退 | desktop / fallback | `?fallback=1` 可读模式 | Stage 8 | pass | — |
| R08-B | 响应式完整 | 1440×900 / 390×844 | 最终截图、无横向溢出 | Stage 7 | pass | — |
| R08-B | 工程闭环 | type / unit / build / Pages | 46 文件、148 测试、两种构建通过 | Stage 9 | pass | — |
| R08-B | 研究结论 | capability promotion decision | E4 能力契约与研究队列 | Stage 9 | pass | — |

## 停止条件

- 如果移除交互后仍能得到完全相同的理解，原型失败，不进入能力库。
- 如果核心比较只能依赖 hover，原型失败。
- 如果无 WebGL 或减少动态效果时数据和操作不可用，原型失败。
- 如果实现需要外部素材、后端或 API 才能证明核心机制，停止扩展并缩回程序化证据。

## 最终证据

- Canonical runtime：`npm.cmd run dev -- --host 127.0.0.1 --port 8143`
- URL：`http://127.0.0.1:8143/pages/v2/prototypes/semantic-interaction/`
- 桌面：`docs/screenshots/v2-semantic-interaction-desktop.jpg`
- 手机：`docs/screenshots/v2-semantic-interaction-mobile.jpg`
- 强制回退：`docs/screenshots/v2-semantic-interaction-fallback.jpg`
- 浏览器验收：3 项通过，覆盖 pointer、touch、keyboard、scroll、reduced motion 和 fallback。
- 工程验收：46 个测试文件、148 项测试通过；`build` 与 `build:pages` 通过。
- Pages 构建：原型入口约 5.85 kB gzip；Three.js 动态增强块约 184.83 kB gzip，`?fallback=1` 不触发动态导入。

## 有界结论

`semantic-responsive-interaction` 晋级为 E4。有效做法不是增加鼠标跟随，而是让一个输入同时改变选择状态、可读数字和空间结果。原型还证明了混合渲染比强迫所有信息进入 WebGL 更可靠：DOM 负责可访问的证据和操作，SVG 负责精确边界，Three.js 负责深度、材质与空间记忆。

该结论只进入 Kage 项目能力库，不更新通用技能。R08-C 已把适用信号、拒绝信号、输入语义和降级要求接入 V2 生成契约并完成总结；不再执行单独的自由生成对照。
