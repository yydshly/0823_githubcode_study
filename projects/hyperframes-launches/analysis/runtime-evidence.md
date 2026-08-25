# 代表性运行与渲染证据

## 验证对象

- 入口：`upstream/heygen-apple-motion/01-ui-sting`
- 项目锁定版本：HyperFrames `0.7.94`
- 实际验证 CLI：HyperFrames `0.8.10`
- 环境：Windows、Node `22.15.0`、FFmpeg `n6.1.3`
- GPU：NVIDIA GeForce RTX 4070 Laptop GPU（ANGLE / D3D11）

## Browser Check

2026-08-23 执行：

```powershell
.\projects\hyperframes-launches\scripts\demo.ps1 check `
  -Project "heygen-apple-motion/01-ui-sting"
```

结果：

- lint：0 errors / 3 warnings；
- runtime：0 errors / 0 warnings；
- layout：9 个采样点，0 issues；
- motion：0 errors / 0 warnings；
- contrast：11/11 文本通过 WCAG AA；
- snapshots：生成 5 张 PNG；
- 总结：`Check passed`。

三个 lint warning 分别是重复媒体发现风险、单文件偏大、单轨时间元素偏密；它们没有阻断运行或渲染。

## MP4 Render

执行：

```powershell
.\projects\hyperframes-launches\scripts\demo.ps1 render `
  -Project "heygen-apple-motion/01-ui-sting" `
  -Quality draft
```

结果：

- 画布：720×720；
- 帧率：30fps；
- 时长：10.8333 秒；
- 捕获：325 / 325 帧；
- 视频素材轨：0；
- 音频轨：0；
- 输出：938.7 KB MP4；
- 渲染耗时：18.2 秒；
- 最终状态：`Render complete`。

本地输出位于上游案例的忽略目录：

```text
upstream/heygen-apple-motion/01-ui-sting/renders/
```

生成结果不提交，以避免把上游品牌、字体和衍生视频误当成我们的可发布资产。

## 证据边界

这证明了：

1. 子模块和 LFS 素材完整；
2. HyperFrames CLI、浏览器捕获、GPU、FFmpeg 编码路径真实可用；
3. 至少一个现代模板在当前环境能通过检查并输出 MP4。

这不证明：

1. 25 个入口都无需迁移即可使用最新 CLI；
2. 上游字体、商标、人物和媒体素材自动获得我们的发布授权；
3. 不同浏览器、字体和 GPU 环境能够保持逐像素一致。

