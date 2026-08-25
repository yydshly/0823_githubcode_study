# 工业展厅复用证明

> **状态更正（2026-08-24）：该实验已判定为 blocked，不能作为展厅复用成功证据。** 自动验收确认了普通 Object3D 挂载、材质、热点、镜头状态和生命周期合同，但最终人工截图显示原沙漠 world 仍占据画面，巡检车与展台没有形成有效产品构图。本文保留为失败实验记录；当前正式结论与入口以 [research-platform-v1.md](research-platform-v1.md) 为准。

## 结论

本实验原计划验证 **C1：单主体、可选择热点的工业产品展厅**。它只证明 Claude of Tanks 的 Scene Studio 可以在不加载坦克演员、不复制 renderer/camera/post 管线的前提下挂载普通工业设备对象；它没有证明独立展厅场景、有效产品构图或场景替换。

结论只覆盖当前程序化原型与已执行的浏览器验收，不把它描述为真实商品、生产级商品模型或通用空间编辑器。

## 启动与验证

历史复现方式（非正式入口，默认不再启动）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-reuse-showroom.ps1 -Port 4175
```

打开：

```text
http://127.0.0.1:4175/studio?map=desert&showcase=industrial-showroom&nogate=1
```

服务运行时，在另一个终端执行：

```powershell
node scripts/verify-industrial-showroom.mjs http://127.0.0.1:4175
```

结构化证据包括最终验收 [`report.json`](../evidence/industrial-showroom-final/report.json)、F8/手动相机生命周期 [`lifecycle-smoke.json`](../evidence/industrial-showroom-final/lifecycle-smoke.json) 与稳定页性能采样 [`runtime-metrics.json`](../evidence/industrial-showroom-final/runtime-metrics.json)。

## 为什么选择 C1

C1 的目标是验证“现有 WebGL 产品能否承载一个边界清楚的单主体产品展厅”，而不是把一次实验扩张为房间配置器。当前体验只需要：

- 一个明确 hero：`atlas-inspection-rover`；
- 三种可逆材质表达；
- 三个命名部件热点及一一对应的检查镜头；
- 桌面、键盘、触控和减少动态模式；
- 可审计的资产来源与运行时隔离。

这与需要对象库存、拖放布局、吸附/碰撞、保存、分享的空间编辑器是不同产品类型。

## 架构复用

展厅通过独立 Vite 配置 [`../scripts/vite-reuse-showroom.config.mjs`](../scripts/vite-reuse-showroom.config.mjs) 继承 canonical Lab/full 配置，再追加严格匹配 `showcase=industrial-showroom` 的虚拟模块 bootstrap。`showcase=capabilities` 与 `showcase=industrial-showroom` 分支互斥，因此展厅不会导入 capability 或 visual-layer-lab 模块，也不改变 R8 preload/marker 时序。

运行时复用同一个 Scene Studio：

```text
同一 renderer + 同一 camera + 同一 post
                  │
                  └─ Studio Object3D extension root
                     ├─ mountObject3D(root)
                     ├─ unmountObject3D(root)
                     ├─ invalidate()
                     └─ registerTick(fn)
```

- `mountObject3D` 把展厅根对象挂进 Studio 所属的 Three.js scene，不建立第二个 canvas 或 renderer。
- `registerTick` 只在相机插值或转台确实变化时返回 `true`，由 Studio 统一触发重绘。
- 展厅持有自己的资源生命周期；销毁时先注销 tick、卸载根对象，再释放程序化几何、材质与生成纹理。
- 进入展厅时清空 Studio actor/effect，实测 `tankActorCount = 0`。

## 资产 provenance 与 manifest

主体契约：

| 字段 | 值 |
| --- | --- |
| `id` | `atlas-inspection-rover` |
| `kind` | `industrial-equipment` |
| `origin` | `procedural` |
| `qualityClaim` | `Prototype / L2 — procedural presentation asset; not a commercial production model` |
| `sourceModule` | `showcase/industrial-showroom-asset.js` |
| `externalModelCount` | `0` |
| `generatedMeshCount` | `59`（本次报告） |

程序化 factory 返回统一资产接口：`root`、named `parts`、`sockets`、`manifest`、`materialVariants`、`applyMaterialVariant()`、材质 fingerprint 与幂等 `dispose()`。稳定 manifest 记录版本、主体类型、来源、质量声明、生成网格数、mesh fingerprint、part IDs、socket IDs 和材质变体 IDs。

三个 socket 与展示语义一一对应：

| Socket / Part | 热点 | Camera preset |
| --- | --- | --- |
| `sensor-system` | 传感系统 | `sensor-system` |
| `energy-module` | 能源模块 | `energy-module` |
| `all-terrain-drive` | 全地形驱动 | `all-terrain-drive` |

三种材质变体是 `graphite-field`、`rescue-orange`、`arctic-service`。切换只更新同一组目标材质，不重建 subject root、不重置选择，也不替换相机。

## 交互与公开契约

页面暴露 `window.__COT_INDUSTRIAL_SHOWROOM`，包含：

- `version`、`status`、`subject`、`provenance` 与 `manifest`；
- 三个 `materialVariants`、三个 `hotspots`、三个 `cameraPresets`；
- 当前 subject、part、variant、hotspot 与 camera preset；
- `reducedMotion` 和 `motion`；
- `selectVariant()`、`selectHotspot()`、`showOverview()`、`setAutoRotate()`、`audit()` 与 `dispose()`。

交互约定：

- 点击画面投影热点或面板热点进入对应近镜头；
- `Enter` 激活获得焦点的原生按钮；
- `1` / `2` / `3` 选择三个热点；
- `V` 循环三种材质；
- `Escape` 返回 overview；
- 390px 视口使用 bottom sheet，主要触控目标不小于 44px；
- `prefers-reduced-motion: reduce` 下相机动画时长为 0，自动转台关闭，CSS transition/animation 归零。

DOM 热点通过公开 `getCamera()` 状态重建投影相机，再把三个 socket 的世界坐标投影到 viewport；WebGL 负责空间主体与镜头，DOM 负责可读标签、选择状态和键盘/触控语义。

## 浏览器验收证据

本次报告结果为：

| 指标 | 结果 |
| --- | --- |
| Checks | **17 / 17 通过** |
| F8 / manual camera lifecycle smoke | **6 / 6 通过** |
| Console error + page error | **0** |
| 外部模型请求 | **0** |
| 有界截图 | 5 张（上限 6） |
| 首次 ready | 约 **45.7s**（`showroomReadyMs = 45678`） |
| 稳定页 rAF 间隔 | median **4.2ms** / p95 **4.3ms** |
| Subject | **59 meshes** |
| 整页 renderer memory | **331 geometries / 109 textures** |

17 项检查覆盖：路由 ready、静态契约、非坦克主体、程序化 provenance、三材质、三热点/三镜头、指针、键盘、移动触控、减少动态、单文档复用、展厅隔离、Lab 隔离、full-demo 隔离、确定性 guard metadata、证据数量与无错误。独立生命周期 smoke 的 6 项覆盖 route ready、手动移动 Studio 相机后的 marker 同步、F8 suspended、同页重入 ready、mount/tick 计数不重复和无控制台错误。

外部模型请求监听匹配 `.glb`、`.gltf`、`.fbx`、`.obj`、`.vrm`；本次记录为空。这个结果证明当前版本没有请求外部 3D 模型，不代表未来 GLB 版本无需单独做许可证、压缩和加载预算审查。

性能采样发生在默认转台关闭、无相机 transition 的稳定页。4.2ms / 4.3ms 是 60 个样本的浏览器主线程 rAF 间隔，不是 GPU timer query。`renderer.info.memory` 的 331 geometries / 109 textures 是完整 Studio/world 页面口径，受地形、环境、展台、主体、灯光和特效共同影响；subject-only 契约只确认 59 meshes。由于 `renderer.info.autoReset = true`，采到的 1 call / 1 triangle 仅描述最近一次整页渲染管线调用，不可据此推导 subject draw-call 或 triangle 预算。

## 已知边界

当前实现明确不包含：

- 真实商品或生产级 GLB/glTF；GLB adapter 尚未实现；
- 低性能/移动端转台质量档（阴影、后期与投影降级）；
- 初始化中途失败已实现事务式回滚，但尚未执行故障注入浏览器验收，仍按 P2 风险跟踪；
- 多对象库存与场景布局编辑；
- 拖放、吸附、碰撞或尺寸测量；
- 配置保存、恢复、持久化或分享链接；
- 展厅视频录制、编码或发布导出。

因此它是 Studio 复用与交互契约的 **Prototype / L2 证明**，不是通用配置器或已完成的商业产品查看器。

## 下一步：GLB adapter

下一步不应改写展厅 controller，而应增加一个 GLB adapter，使外部模型适配为与程序化 factory 相同的接口：

```js
{
  root,
  parts,
  sockets,
  manifest,
  materialVariants,
  applyMaterialVariant(id),
  getMaterialFingerprint(),
  dispose(),
}
```

Adapter 需要显式完成：

1. 从 glTF named nodes 或独立映射表解析 part IDs；
2. 验证三个必需 socket，缺失时失败而不是猜测位置；
3. 记录原始文件、作者/许可证、版本、单位、包围盒和外部请求数；
4. 建立材质 target 映射，同时保留默认材质的可逆恢复；
5. 增加 Draco/Meshopt、纹理尺寸、首屏加载和移动显存预算；
6. 复用现有 17 项契约与 6 项生命周期 smoke，并把 provenance 期望改为真实外部资产来源。

这样可以把“程序化证明”升级为“真实资产适配”，同时保持路由、Studio 挂载、热点、镜头、无障碍和验收协议稳定。
