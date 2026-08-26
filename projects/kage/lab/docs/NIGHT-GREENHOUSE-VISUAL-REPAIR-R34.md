# R34 夜生材料温室视觉修复与验收

## 结论

原精选案例 `dedicated-aa926f0c00b0` 不应继续作为最终效果：首屏仅显示一个暗绿色占位几何体，模型生成素材和主文案都没有形成有效呈现。

最终保留案例：`dedicated-ac182411e506`

- 预览：`/cases/dedicated-ac182411e506/?quality=high&motion=full`
- 素材：`/creative-assets/biomaterial-night-greenhouse-v1.png`
- 生成结果包含 4 个源码文件、1 个模型生成素材；Three.js 负责纤维聚合、建筑显影和滚动响应。

## 根因

生成页面的实际 DOM 是 `#app > canvas + .night-greenhouse`，但第一次修订使用了 `.night-greenhouse canvas`。选择器无法命中，导致 canvas 保持普通文档流，高度 950px，把 hero 推到第二屏。

浏览器实测（修复前）：

- `heroY = 954`
- `canvasPosition = static`
- `canvasY = 0`

此外，早期场景中的大体积种子占位物遮住了环境素材；后续虽移除占位物，但纤维数量、长度和透明度仍过高，在中末段形成随机竹签式遮挡。

## 修复

1. 使用真实 DOM 选择器 `#app > canvas`，把 WebGL 画布固定到视口。
2. 让模型生成的温室素材成为全屏环境主体，不再使用中央海报框或绿色蛋形占位物。
3. 将纤维数量从 78 降到 30，缩短约一半并降低粗细、透明度和末段残留。
4. 降低建筑拱架、膜片、地面光和内部灯光强度，避免覆盖行动文案。
5. 将叙事容器从 `overflow:hidden` 调整为 `overflow:clip`，恢复 sticky 叙事行为。
6. 增加由 `--story` 驱动的 hero 淡出，滚动中段把视觉焦点让给素材和空间变化。

## 真实浏览器验收

修复后桌面布局：

- 视口：1080 × 950
- `heroY = 0`
- `canvasY = 0`
- `canvasPosition = fixed`
- 背景资源实际解析为 `biomaterial-night-greenhouse-v1.png`

移动端与无障碍降级：

- 视口：390 × 844
- `prefers-reduced-motion = true`
- hero 宽度：375px
- 标题：32px
- 画布仍固定在视口，文案和 CTA 可读。

验收证据：

- `evidence/r34-defect-baseline.png`
- `evidence/r36-final-opening.png`
- `evidence/r36-final-middle.png`
- `evidence/r36-final-ending.png`
- `evidence/r36-final-mobile.png`

## 对生成管线的约束

- 模型声称“已修复”不能作为完成证据；必须读取真实 DOM 和 computed style。
- 资产存在不等于资产形成视觉主体；需要同时验证资源加载、构图占比和首屏可见性。
- Three.js 层的价值是提供空间、时间和交互变化，不应无条件覆盖生成素材。
- 案例库只指向经过桌面首屏、中段、末段、移动端和 reduced-motion 验收后的最终 run。
