# R03 · 第一项能力进入 V2 契约层

日期：2026-08-27  
状态：完成。

## 本轮目标

把 R02 已验证的 `scroll-scrub-media` 原型从单一梦境案例抽离，成为 V2 可以判断“适合 / 不适合”、可以交给作者模型执行、可以自动验收的能力契约。

## 已完成

### 1. 能力定义

新增 `src/v2/presentation-capabilities.ts`，定义：

- 适用体验模式和正向信号；
- 明确阻断信号，例如真实 GLB 拆解、自由旋转、配置器；
- 连续媒体素材契约；
- 固定全屏媒体、滚动进度、0.12 阻尼和减少动态效果契约；
- opening / middle / ending / mobile / asset-request / runtime 验收证据；
- 初始素材与总素材预算。

### 2. 契约生成器接入

`createV2CreativeContract()` 现在会先规划体验和素材，再计算能力分数：

```text
brief
  -> experience pattern
  -> asset responsibilities
  -> capability scoring
  -> selected strategy or custom route
  -> self-contained Codex authoring prompt
```

梦境连续媒体 brief 会命中 `media-scroll-scrub`。真实 GLB 拆解 brief 会保留 `model-spatial` 自定义路线，不会为了复用而强行套能力。

### 3. V2 页面可见

`pages/v2/` 已从旧静态说明页补齐为可操作的契约页面：

- 输入或切换示例 brief；
- 查看意图、参考证据、体验节点、素材职责和验收边界；
- 查看被选中的已验证能力及原因；
- 直接进入该能力的运行原型；
- 复制包含完整契约的 Codex 构建输入。

### 4. 发布与验证

- TypeScript：通过；
- Vitest：2 个文件、6 个测试通过；
- Playwright：能力命中、错误路线拒绝、桌面端和移动端通过；
- GitHub Pages 构建：通过；
- V2 页面和滚动原型均进入 Pages 产物；
- 原型依赖的三张素材均存在于发布目录。

## 当前边界

V2 现在不是“已经能自动构建所有优秀网页”，而是完成了可扩展的第一项能力：

```text
一个运行验证过的优秀模式
  -> 一份有适用条件的能力契约
  -> 一个能拒绝错误场景的选择器
  -> 一套可复现的验收证据
```

当前能力目录只有一项，尚不能覆盖 GLB 产品、材质实时变形、空间探索和编辑式交互。

## 下一研究单元

继续从 MotionSites 选择一个与第一项明显不同的案例，优先验证“真实 3D 产品滚动展示”路线。目标不是增加页面数量，而是回答：

1. 什么条件下连续媒体不足，必须选择 Three.js + GLB；
2. 模型、相机、光照和滚动状态应形成什么资产与运行时契约；
3. 如何在生成前拒绝低质量或不存在的 3D 素材；
4. 它与 `media-scroll-scrub` 的选择边界是否可被测试证明。
