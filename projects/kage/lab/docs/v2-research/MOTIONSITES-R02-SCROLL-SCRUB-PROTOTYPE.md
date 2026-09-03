# R02 · Scroll-scrub media 能力验证

日期：2026-08-27  
状态：验证通过，建议进入 V2 能力候选层；尚未接入生成工作台。

## 这次只验证什么

把 MotionSites `Scroll Landing Page` 案例中可复用的结构，缩成一个可运行实验：

> 固定全屏媒体场 + 滚动进度 + 连续素材状态 + 独立 DOM 叙事内容。

它验证的是“用户想法如何被组织为连续网页体验”，不是验证某个固定页面模板，也不要求为了技术标签使用 Three.js。

参考来源：

- <https://motionsites.ai/lesson/build-scroll-animated-website-with-ai>
- 该案例公开提示词明确包含固定全屏媒体、滚动进度、`0.12` 平滑插值、响应式和验收要求。

## 输入与实现

输入使用项目已有、可归属的梦境案例连续素材：

1. `dream-room-awakening-v1.png`：醒来时的模糊房间。
2. `dream-memory-fragments-v1.png`：记忆开始成形。
3. `dream-night-record-v1.png`：收束到记录行动。

实现位置：`pages/v2/prototypes/scroll-scrub-media/`

实现结构：

- 三个全屏媒体层按滚动进度连续交叉溶解；
- 画面只负责氛围和空间，标题、正文和 CTA 保持语义化 DOM；
- `requestAnimationFrame` 使用 `0.12` 阻尼追随滚动目标；
- 使用轻微缩放和位移建立景深，不把素材装进可见矩形卡片；
- 提供 `prefers-reduced-motion` 与 390px 移动端适配；
- 暴露 `window.__scrollScrubPrototype`，便于精确回放和自动验收。

## 运行证据

- 开场：[`v2-scroll-scrub-r01-opening.png`](../screenshots/v2-scroll-scrub-r01-opening.png)
- 中段：[`v2-scroll-scrub-r01-middle.png`](../screenshots/v2-scroll-scrub-r01-middle.png)
- 结尾：[`v2-scroll-scrub-r01-ending.png`](../screenshots/v2-scroll-scrub-r01-ending.png)
- 移动端：[`v2-scroll-scrub-r01-mobile.png`](../screenshots/v2-scroll-scrub-r01-mobile.png)

浏览器验收结果：

- 1 个 Playwright 专项用例通过；
- 三张素材均完成加载；
- 三个语义阶段均可由滚动精确到达；
- 结尾“记录今晚的梦”行动可见；
- 390 × 844 视口无横向溢出；
- 无页面脚本错误；
- TypeScript 类型检查通过。

本地冷启动观测：

- DOMContentLoaded：147ms；
- 三张素材全部就绪：162ms；
- 素材传输合计约 4.89MB；
- 三张素材请求耗时分别约 77ms、75ms、78ms。

这些数据只代表本机本地服务。远端发布前仍需做 WebP/AVIF 派生、首图优先和后续图延迟预取。

## 结论

### 通过的部分

该结构可以成为 V2 的一种“呈现策略”，建议命名为 `media-scroll-scrub`。它特别适合：

- 有连续环境图、概念图或产品状态图；
- 目标依赖情绪推进，而不是复杂自由视角 3D；
- 需要高视觉完成度，同时希望实现和验收速度稳定。

### 暴露的问题

当前三张图的机位和光线连续，但状态差异偏弱。页面能成立，叙事变化仍不够强。这说明 V2 不能只要求“生成三张同风格图片”，还必须给素材生成增加镜头契约：

- 保持主体、机位和空间连续；
- 每个阶段必须有一个清楚、可读的状态变化；
- 变化要服务叙事动词，而不是只改亮度或色调；
- 首尾必须支持标题安全区和行动收束。

### 尚未验证

- 视频逐帧 seek、canvas 帧缓存与 90 帧缓存上限；
- Three.js / GLB 产品拆解路线；
- 远端网络下的图片格式、预加载和带宽策略；
- 如何由 brief 自动选择该策略。

## 是否进入 V2

建议进入，但只沉淀为“能力配方”，不固化为整页模板。下一步应该把本实验抽成以下四段约束数据，而不是继续精修这个梦境页面：

1. 适用条件：连续媒体、情绪或状态推进、低自由视角需求；
2. 素材契约：连续性、阶段变化、安全区、尺寸与格式；
3. 运行时契约：滚动映射、阻尼、降级、移动端；
4. 验收契约：开场、中段、结尾、移动端四个证据状态。

完成这一步后，V2 才能让模型在看到新想法时“选择并组合能力”，而不是重新自由开发一整套网页。
