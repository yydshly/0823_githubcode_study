# Claude of Tanks · 3D Visual Layer Lab

## 交付结果

本研究层不修改 `upstream/`，而是在同一套 Three.js / Scene Studio 运行时上增加一个可重复验证的 3D 视觉分层实验。

- 分层实验：`http://127.0.0.1:4174/studio?map=desert&showcase=capabilities&lab=layers&nogate=1`
- 原四车全能力场景：`http://127.0.0.1:4174/studio?map=desert&showcase=capabilities&nogate=1`
- 最终版本：R11（R8 确定性预载、R9 减少动态、R10 宽电影镜头、R11 镜头锁）
- 浏览器验收：PASS，20/20，0 console/page errors

## 这个实验回答什么

“看起来不错的 3D”不是 Three.js 自动生成的单一效果，而是七层结果叠加：

1. **几何与轮廓**：程序化 Mesh、部件层级、比例、负重轮节奏和剪影。
2. **颜色与材质语义**：涂装、金属、橡胶、玻璃和透明部件分类。
3. **PBR、光照与阴影**：让装甲斜面、接触关系和重量感被读出来。
4. **地图与空间尺度**：地形、植被、结构和空气透视提供真实尺度。
5. **后期统一**：色调映射、抗锯齿、环境遮蔽和输出调色统一画面。
6. **镜头与导演构图**：同一资产通过低机位、焦距和主体关系获得叙事性。
7. **动态特效与反馈**：炮口、曳光、命中、烟尘、燃烧、爆炸和战损解释事件。

前五层锁定同一检查镜头；Stage 06/07 锁定同一电影镜头。`对比上一层` 会在相邻层之间往返，避免用记忆主观比较。

## 最终场景设计

- Lab 在 `studio.load()` 之前即精简为唯一 `red-lead`，不是加载四车后再隐藏三车。
- 英雄载具固定在沙漠高度场 `(30, -82)`；T-90 footprint 复算倾角约 `0.254°`，避免原 `(12, -125)` 陡坡干扰几何判断。
- Lab 编排 16 个可读事件、15 类代表性 FX；重定时到 Stage 07 附近以保证截图中实际可见。
- 非 Lab 路由仍保留原始 4 actors、25 effects、17 effect types、3 actor tracks、6 shots。
- 能力导演的延迟自动播放在 Lab 中被锁住；ready 后时间、actor pose 和 camera 不漂移。
- 电影镜头使用更宽的前右 3/4 构图，并在 Stage 06 创建后锁定给 Stage 07，避免 FX 扩大包围盒时二次改机位。

## 操作

- 点击七个阶段按钮，或使用 `←` / `→`。
- `B`：对比上一层 / 返回当前层。
- `Space`：开始 / 停止自动轮播。
- `Studio 工具`：显示原生 Scene Studio 工具；实验面板会自动左移。
- `截图`：使用实验层当前状态输出截图。

桌面默认隐藏原生 dock 和旧能力导演，减少视觉竞争。390px 视口使用底部 sheet；`prefers-reduced-motion` 下取消动态模糊并将自动轮播间隔放慢到 5200ms。

## 启动与验证

```powershell
cd E:\0823_codex_project\projects\claude-of-tanks
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\start-visual-layer-lab.ps1 -Port 4174
node scripts\verify-visual-layer-lab.mjs http://127.0.0.1:4174
```

最终验收只完整加载一个 Lab 文档，并在同一文档切换桌面、390×844 和 reduced-motion；另开一个不等待重资产的 non-Lab 页面验证四车数据未被污染。

最终一次合并配置回归：

- ready：82.020s（无头 WebGL、共享机器负载下；已观察范围约 53–130s）
- 几何：91ms
- 材质：90ms
- 光照：88ms
- 环境：94ms
- 后期：1175ms
- 镜头：1384ms
- FX：641ms
- 20 项契约全部通过，0 console/page errors

## 证据

- [`report.json`](../evidence/visual-layer-lab-final/report.json)：完整自动验收结果与每层 audit。
- [`contact-sheet.png`](../evidence/visual-layer-lab-final/contact-sheet.png)：几何、后期、FX、Studio 工具和移动端最终画面。
- `01`–`05` PNG：五个独立最终截图。

## 能力边界

- Lab 是视觉变量研究面，不代替原四车全能力演示；完整 17 类效果由 non-Lab 路由证明。
- 首次地图、程序化载具和 WebGL shader 构建仍是主要启动成本；热态层切换已经降到毫秒至约 1.4 秒。
- 当前仍是坦克领域实现，不是通用 3D 引擎；可复用的是场景规格、层级演示、Studio、相机、FX、验证和资产管线方法。
- 画面中的车辆、地形、材质、光照、粒子和后处理均来自代码驱动的 Three.js 运行时；它不是 AI 直接生成的一张 3D 图片。
