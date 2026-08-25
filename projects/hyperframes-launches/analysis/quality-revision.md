# HyperFrames 复杂案例 · 质量修订契约

## 修订原因

用户反馈“效果差，并且一直循环重复”。真实浏览器基线确认：

- 两支复杂成片均带 `loop=true`；播放头放到 16.55 秒后，0.9 秒内回到 1.27 秒继续播放。
- 桌面 1440×1000 下，每支成片只有 290×163，文字和镜头细节难以理解。
- 输出使用 `draft` 质量、960×540，适合快速验证，不适合作为复杂案例的最终展示。
- 现有镜头虽完整，但构图连续采用同类暗色卡片，宽/中/近景和最终记忆点不足。

## 修订方向

```text
Entry mode: revision-led
Selected pattern: cinematic editorial product case
Preserve: VideoSpec、双变量批处理、黑绿页面、懒加载、reduced-motion、失败回退
Reopen: 成片构图、镜头层次、输出质量、页面展示尺寸、播放结束状态
Primary journey: 看清成片 → 播放一次 → 停在收尾 → 理解同模板双版本
```

## 验收标准

| 项目 | 标准 | 状态 |
|---|---|---|
| 循环 | 两支复杂成片无 `loop`；自然结束后 `ended=true`、`paused=true`、停在最后一帧 | pass |
| 展示 | 1440px 桌面每支约 560px 或更宽；390px 手机单列无页面溢出 | pass |
| 输出 | 1920×1080、30fps、H.264、high 质量；两行批量均成功 | pass |
| 镜头 | 建立、主标题、证据、装配、分发、CTA 六镜头均清晰，有尺度与构图变化 | pass |
| 质量 | HyperFrames Lint 0 error / 0 warning；关键帧无空帧、裁切、残留 | pass |
| 控制 | 原生控件保留；键盘可重播；reduced-motion 不自动播放 | pass |
| 相邻面 | 19 项样例墙与其他 7 支视频行为不变 | pass |


## 最终证据

- 旧基线：桌面视频 290×163；loop=true；接近结尾后自动回到 1.27 秒。
- 新桌面：视频 950×534；loop=false；18 秒结束后 ended=true、paused=true、currentTime=18。
- 重新进入视口：保持 ended=true 和 18 秒，不自动重播。
- 键盘：结束后聚焦播放器并按 Enter，从 0 秒重新播放。
- 输出：两行批量 2/2 completed；1920×1080、H.264、yuv420p、30fps、18 秒、540 帧。
- 视觉：六个代表关键帧均有内容；建立、主标题、证据近景、纵深装配、多画幅分发、最终 CTA 清晰。
- 手机：390×844，视频 333×187，页面 overflow 0；VideoSpec 为单列，代码仅在自身内部滚动。
- reduced-motion：28/28 视频暂停，autoplay 属性为 0。
- 失败降级：第一支资源失败时只标记第一张卡；第二支 readyState 4 并继续播放。
- 工程：HyperFrames Lint 0 error / 0 warning；修复后的冒烟渲染无 GSAP target warning。
