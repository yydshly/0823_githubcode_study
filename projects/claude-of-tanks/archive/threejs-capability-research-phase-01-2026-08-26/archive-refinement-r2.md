# Phase 01 归档展示优化 · Revision 2

日期：2026-08-26

## 设计契约修订

- Entry mode：Revision-led refinement。
- Request revision：用户在 Phase 01 归档后要求“继续优化”；本轮只改善已归档研究的阅读与验证体验，不恢复新 3D 功能开发。
- Target user and context：需要快速浏览结论、跳转证据、再按需进入 3D 页面的人。
- Desired first impression：页面仍然是严谨的阶段档案，但长页面可以快速定位、知道当前阅读位置并返回顶部。
- Visual ambition：Editorial。
- Experience architecture：Editorial Flow。
- Visual constraints：保留当前深色技术档案风格；不增加图片、视频、Canvas、WebGL 或持续动画。
- Information constraints：不改变 Phase 01 的能力结论、演示数量、风险状态和恢复边界。
- Operation constraints：增加语义化页内导航；桌面可粘滞定位，移动可横向浏览；活动状态不能只依赖颜色；键盘焦点可见。
- State constraints：活动章节由滚动位置和 hash 共同驱动；浏览器不支持 IntersectionObserver 时仍可用普通锚点。
- Environment constraints：canonical runtime 为 `http://127.0.0.1:4176`；桌面 1440×900、平板 768×1024、移动 390×844；仅深色主题。
- Primary journey：进入归档 → 使用章节导航定位“页面/能力/意义/证据/边界/方向” → 阅读 → 返回顶部或进入正式演示。
- User-defined phase：继续优化。
- Required artifacts：优化后的归档页、更新后的浏览器报告、桌面/平板/移动截图、键盘/hash/无 Three.js 验证、刷新后的 Phase 01 归档包。
- Autonomy authorization：用户明确要求继续优化，可直接实施项目内可逆改动。
- User-decision boundary：不新增业务场景、外部资产、后端、部署或重型 Three.js 性能重构。

## 基线证据

- 2026-08-26 浏览器终验：归档页 21 项检查通过、0 控制台错误、无 Three.js/模型/媒体请求。
- 桌面完整页高 4206px；移动完整页高 7918px。
- 当前只有顶部跨页面入口和首屏“按推荐顺序查看”，没有持续可见的页内章节定位。
- 现有工作台性能预算全部通过；超预算集中在视觉实验冷启动、移动完整战斗与历史失败场景，不适合作为本轮长页交互优化的隐式重构对象。

## 可观察完成标准

1. 归档页出现 6 个语义化章节入口，并保持现有页面入口不变。
2. 点击章节入口更新 hash，并把对应标题滚动到粘滞导航下方。
3. 滚动时活动章节具有文字/边框双重状态，设置正确的 `aria-current`。
4. 桌面、平板与移动均无页面级横向溢出；移动章节导航允许自身横向滚动。
5. 键盘可依次访问跨页面入口与章节入口，焦点轮廓至少 2px。
6. reduced-motion 下取消平滑滚动与非必要过渡。
7. 页面继续保持 DOM-only，不请求 Three.js、游戏入口、模型、图片或视频。
8. 研究首页往返、4 条推荐观看路线、7 个能力组、6 份证据和 6 个方向不回归。
9. 更新后的报告、截图和哈希归档全部通过。

## 覆盖清单

| 用户阶段 | 要求或产物 | 表面/状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 继续优化 | 长页章节定位 | 1440px 默认滚动 | 6 个章节、hash 深链、桌面截图 | 3–5 | pass | 已完成 |
| 继续优化 | 活动章节反馈 | 滚动与点击 | `aria-current=location`、文字圆点与边框状态 | 6 | pass | 已完成 |
| 继续优化 | 移动和平板适配 | 768px、390px | 两端无横向溢出、目标均至少 44px | 7 | pass | 已完成 |
| 继续优化 | 键盘与 reduced-motion | Tab、motion reduce | 2px 焦点轮廓、滚动行为 `auto` | 7 | pass | 已完成 |
| 继续优化 | 轻量性能边界 | 首次加载 | ready 789ms、0 个 Three.js/模型/媒体请求 | 8 | pass | 已完成 |
| 继续优化 | 既有内容不回归 | 全页与往返 | 归档 27/27、研究首页 17/17、注册表 10/10 | 9 | pass | 已完成 |
| 继续优化 | 阶段包刷新 | archive 目录 | 14 个 SHA-256、27 项浏览器检查、0 问题 | 9 | pass | 已完成 |

