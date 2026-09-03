# V2 R84 — 屋顶温室分层场景阶段交付

## 阶段目标

验证 V2 新增的场景构成路由是否真正缩小了模型自由度：先把一个新主题确定为 `layered-2d`，再用一套同源素材包完成一次有界 Codex 构建、交互验收和案例归档。此阶段不修改 V1，也不改写既有程序化 Canvas/Three.js 路线。

测试 brief：

> 为一座城市屋顶温室设计清晨观察网页。滚动时视角从结露玻璃外穿入温室，前景水滴、中景番茄藤和后景城市天际线产生真实视差；拖动湿度后，叶片凝露覆盖范围同步变化，最后保存今日温室记录。明亮自然，不要科技风。

## 设计合同

- Entry mode：brief-led implementation。
- Visual ambition：Immersive。
- Experience architecture：Editorial Flow + persistent layered stage。
- Primary journey：进入温室 → 滚动观察空间 → 调整湿度 → 保存记录。
- Autonomy：用户授权持续开发，以小目标闭环，不重复询问。
- Boundary：一次专属代码生成、一次候选恢复；不接入无关服务，不回写 V1。
- Completion：四个独立素材通过门禁；页面可运行；桌面、手机、键盘、reduced-motion 和案例归档可复现。

## 素材包

目录：`public/creative-assets/r84-rooftop-greenhouse/`

| 职责 | 文件 | 质量 | 说明 |
| --- | --- | --- | --- |
| environment | `greenhouse-master-v1.png` | L4 | 同一机位、光线和空间坐标的全幅母图 |
| subject | `greenhouse-subject-v1.png` | L3 | 真实 Alpha 番茄藤；只承担克制中景视差 |
| foreground | `greenhouse-foreground-dew-v1.svg` | L3 | 真透明露珠前景和湿度反馈 |
| depth | `greenhouse-depth-field-v1.svg` | L2 | 像素对齐的可检查深度/状态场 |

图像模型生成的第一张“透明结露层”实际为 24-bit RGB 棋盘格，已拒绝进入项目。没有继续无限重试，而是使用同画布程序化 SVG 作为可控透明前景。`asset-pack.json` 保存连续性键、画布和职责关系。

## 工程结果

- `scene-composition-plan` 将 brief 路由到 `layered-2d`。
- 生成任务会按合同所需素材数选择最多六项目录素材，不再固定只取三项。
- 四个独立素材 ID 通过 `asset-quality-gate`，同一图片不能重复满足多层职责。
- 当生成 bundle 已声明但漏用批准的 `seamless-field` 时，本地候选恢复可以将该场接入 CSS 合成遮罩；不重新调用模型。
- 专属构建只调用一次 `gpt-5.6-terra`；最终运行 ID 为 `dedicated-beed36a85788`。
- 稳定归档：`/cases/dedicated-beed36a85788/`；案例库封面使用该主题自己的温室母图。

## 浏览器证据

Canonical runtime：`npx vite --host=127.0.0.1 --port=8146`

Canonical URL：`http://127.0.0.1:8146/cases/dedicated-beed36a85788/?quality=high&motion=full`

| 覆盖项 | 证据 | 结论 |
| --- | --- | --- |
| Desktop opening | 1440×900；标题、母图、结露玻璃与番茄藤均可见；无错误覆盖层 | pass |
| Scroll state | `scrollY=820` 后 `--enter=0.684`；番茄藤和露珠 transform 不同 | pass |
| Humidity control | 键盘 End 将 58% 改为 92%；`--humidity=1`，露珠 opacity 变为 0.9 | pass |
| Save action | “保存今日温室记录”变为“已保存”，aria-live 输出保存状态和湿度 | pass |
| Mobile | 390×844 无横向溢出；标题、滑杆和保存行动可达 | pass |
| Reduced motion | 根节点获得 `reduced-motion`；媒体 transition 为 `0s` | pass |
| Runtime health | 无 Vite overlay、无浏览器错误；TTFB 5.9ms，FCP 64ms，LCP 136ms，CLS 0 | pass |
| Archive | `/cases.html` 显示“晨露屋顶温室”，使用专属温室封面 | pass |

浏览器临时证据位于系统临时目录 `kage-r84-evidence`，没有把迭代截图堆入产品仓库。

## 阶段结论

阶段目标完成：V2 已证明“想法 → 场景路由 → 同源素材职责 → 一次 Codex 构建 → 真实交互验收 → 精选研究案例”的闭环。该结果不是通用终局；下一阶段应把同一闭环用于另一个不同视觉/交互家族，验证路由的扩展性，而不是继续精修同一个温室页面。
