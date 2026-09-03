# V2 R30：生成页面的共享 Three.js 运行边界

## 目标

本轮服务第一目标：让 Codex 更快、更稳定地把新想法构建成优秀网页，同时不把视觉结果固化为模板。

不新增主题、不调用模型、不归档新案例。只把与创意无关、每次重复生成的 Three.js 工程逻辑下沉到 SDK。

## 证据

抽查最近 12 个生成运行：

- 12/12 都重新创建 `WebGLRenderer`；
- 11/12 重复实现 DPR、尺寸同步和透视相机更新；
- 多数重复维护 geometry/material 集合或遍历场景释放资源；
- 主体几何、材质、灯光、镜头状态和 DOM 构图仍具有明显主题差异，不适合下沉。

## 已实现

新增 `createGeneratedThreeRuntime`，只负责：

- renderer、标准透视 camera 和 scene 的建立；
- high/balanced/low 的 DPR 上限；
- resize、render；
- geometry、material、texture 的去重跟踪与 dispose；
- 多材质对象和材质纹理的安全释放。

它不提供主体几何、材质配方、灯光设计、镜头路径、滚动节奏、DOM 内容或页面构图，因此不是视觉模板。

Codex 作者合同已调整：标准透视场景优先使用该运行边界；只有正交相机、多 render target 或特殊渲染管线才自行管理 renderer。

## 迁移验证

将 R28 “潮汐机械罗盘”迁移到共享运行边界，未修改主题主体、材质、灯光和 director：

- `scene.ts`：10,071 B → 9,065 B，减少 1,006 B；
- 一致化后的四文件源码：25,095 B；
- TypeScript 编译：335 ms；
- 验证运行：`dedicated-5d0e5dd33398`；
- 浏览器确认 WebGL 正常、progress=1、CTA 可见、滚动行程 1,800 px、无横向溢出、无控制台错误；
- 截图：`.artifacts/r30-managed-runtime-final.png`。

该运行只用于 R30 技术证据，没有进入案例库。

## 有界结论

- 共享运行时能减少重复代码和资源释放错误，并让模型更集中于创意实现。
- 单个真实场景只减少约 1 KB，不能单独显著缩短模型作者阶段；当前主要输出仍是主题场景、DOM 和 CSS。
- 因此不再继续扩大通用 runtime。下一次真实生成只记录它是否被模型正确采用、作者耗时和源码体积；未获得新证据前不再抽象更多视觉层。
