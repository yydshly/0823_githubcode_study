# Kage 固定版本静态审计

## 快照

| 项目 | 结果 |
| --- | --- |
| 固定提交 | `4399487d2fb42bce39c7b032fbbb50d230bf4f0b` |
| 提交时间 | 2026-08-09 12:46:42 +08:00 |
| 跟踪文件 | 22 个，3,629,919 B / 3.46 MiB |
| 主文件 | `index.html`：248,784 B，4,821 行 |
| Three.js | vendored r149，MIT |
| 运行时 WebP | 14 张，约 2.45 MiB |
| 网络依赖 | 无 fetch、XHR、WebSocket、analytics 或外部运行时 URL |
| 上游状态 | submodule clean；未作修改 |

上游 README 明确没有授予 Kage 原始代码和美术的复用或再分发许可。7 个内嵌 WOFF2 字体面也没有随仓库提供可供本项目抽取复用的独立许可说明。扩展 Lab 因此只采用 npm 安装的 MIT Three.js、系统字体、原创代码和程序化几何。

## 资源与内存边界

- 15 张仓库 WebP 共约 2.54 MiB；页面实际引用 14 张。
- 10 张 RGBA 前景图压缩体积约 1.90 MiB，但按原生通道解码约 58.1 MiB。
- 4 张 RGB 生成场景图压缩体积约 0.67 MiB，原生通道解码约 18.0 MiB。
- 仅这些运行时图像的解码通道下限约 76.1 MiB，尚未计 DOM 合成纹理、CanvasTexture、GPU 纹理副本、depth、MSAA 和 bloom render targets。
- 程序化 CanvasTexture 中存在 1024²/512²纹理与逐像素 Sobel 法线生成。low 档减少粒子，但不降低这些启动纹理的尺寸。

这解释了为什么“传输体积不大”不等于“显存和启动成本低”。生产化必须分别记录压缩字节、解码像素、GPU target 和峰值内存。

## 运行系统摘要

### 镜头与章节

- 6 个镜头关键点：hero、Sanmon、gardens、craft、afterlight、footer，分别声明 position、target、FOV（`upstream/index.html:4034`）。
- position 与 target 使用两条 Catmull–Rom 曲线；滚动测量把 `[data-cam]` 锚点映射成连续 `0…5` 进度（`4087–4104`）。
- 竖屏沿视线后退、抬高并放宽 FOV；另有 intro dolly、细指针视差和帧率独立阻尼。

### 环境与粒子

| 系统 | high | low |
| --- | ---: | ---: |
| 雾片 | 6 | 4 |
| 余烬 | 460 | 220 |
| 雨 | 900 条 | 关闭 |
| 水波 | 13 | 6 |
| 飘落叶 | 260 | 110 |
| 指针 wisps | 190 | 90 |
| 每枝梢枫叶片 | 9 | 5 |

程序化世界包含地面、40 级阶梯、两层山门、鸟居、灯笼、枫树、岩石、月亮和近景层；部分几何合并或实例化，叶片 shader 通过 `onBeforeCompile` 注入风摆。

### 后处理

主场景先进入 HalfFloat target；high 默认 2× MSAA。四级亮部金字塔分别横向、纵向模糊并回合成，最终 pass 增加色差、bloom、ACES 近似、饱和度、青色暗部、暖色高光、暗角、颗粒与 gamma。每帧除了主场景外约有 16 次全屏 pass。`?post=0` 可切到直接渲染路径。

### 布料卡片

桌面 fine pointer 下，3 张卡片分别创建一个 WebGL2 canvas。每张采用 `96×96` 网格、9,409 节点、18,432 三角形；CPU 用 `1/120s` 固定步长更新波动、风场、边缘固定和指针 imprint，再上传动态 buffer。`IntersectionObserver` 在离屏时暂停；WebGL2 不可用或粗指针设备保留静态图片。

## 确定性审查参数

| 参数 | 用途 |
| --- | --- |
| `shot=0…5` | 跳到 6 个镜头锚点 |
| `q=low/high` | 质量档；不等于 coarse pointer 模拟 |
| `post=0/1` | 关闭/开启自定义后期 |
| `shadow=0/1` | 强制阴影 |
| `dpr=<number>` | DPR 上限 |
| `adapt=0/1` | 锁定/启用动态分辨率 |
| `nogl=1` | 强制可读 fallback |
| `driver=timer/raf` | 选择主循环驱动 |

建议视觉基线使用 `?shot=0&adapt=0&dpr=1`；后期 A/B 追加 `post=0`。移动粗指针与 reduced-motion 必须由浏览器上下文模拟，不能只靠 query。

## 主要风险

1. **多上下文与并行 RAF。** fine pointer 可能同时运行主场景、自定义光标和最多 3 个布料 RAF，并建立 1 个主上下文与 3 个 WebGL2 上下文；主质量 governor 不控制布料网格。
2. **主场景可能隐性要求 WebGL2。** shader 注入使用 `gl_InstanceID`（`index.html:2959–2973`）；即使系数乘 `0.0`，WebGL1 编译器仍可能拒绝该标识符。
3. **HalfFloat/MSAA 缺少自动能力回退。** 没有 framebuffer completeness 或扩展能力分级；旧 GPU 需要手工 `post=0` 隔离。
4. **疑似不可见的 secondary-camera 工作。** `renderCards()` 会为 4 个 DOM frame 分配/更新 HalfFloat target（`4440+`），但 canvas 层位于使用不透明 RGB WebP 的 DOM 页面之后。桌面 cloth 会跳过三张卡；hero 与 coarse 模式仍可能渲染被覆盖的视图。此项是静态假设，需 GPU capture A/B 才能定案。
5. **reduced-motion 不完整。** DOM reveal、smooth scroll 和布料会缩短/停下，但主 WebGL 循环及叶、雾、雨、水波、灯光仍逐帧更新（`4597–4697`）。它保住阅读体验，但不是静止或低功耗模式。
6. **没有 context loss 恢复。** 未发现 `webglcontextlost/restored` 处理；中后段启动 job 出错也多为写 console 后继续，可能出现部分场景缺失而用户无提示。
7. **Three.js 升级成本。** r149 使用旧颜色管理与 encoding API；升级要专项验证 shader、render target、MSAA 和视觉基线。
8. **交互无障碍不完整。** 主导航与 rail 有语义，但部分 chip/card/course 只依赖 hover，缺少完整键盘等价路径。

## 审计结论

Kage 的价值是一个完成度高的作品证据：它证明了连续镜头、程序世界、DOM 前景、卡片微交互、后期和降级可以组合成一个强叙事页面。它的限制同样清晰：单文件耦合、多上下文成本、旧渲染栈、许可边界和不完整的 reduced/context-loss 策略，使其不适合直接作为生产依赖。扩展应抽象行为合同并独立实现。
