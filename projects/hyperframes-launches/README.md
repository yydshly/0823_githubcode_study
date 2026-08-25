# HyperFrames Launches 能力研究与全量演示

> 把 HeyGen 的真实发布视频工程，整理成可浏览、可检查、可渲染、可扩展的 HTML 原生视频案例库。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | <https://github.com/heygen-com/hyperframes-launches> |
| 本地上游目录 | `upstream/`（Git submodule） |
| 固定提交 | `199f7dc34c8e3f1d798c55f2074fe1bcbd6fd5ba` |
| HyperFrames CLI | `0.8.10`（兼容性基线） |
| 开始日期 | 2026-08-23 |
| 当前状态 | 本轮研究完成：19 个顶层项目已实渲，28 支视频在演示页内直接播放 |
| 在线展示 | <https://yydshly.github.io/0823_githubcode_study/projects/hyperframes-launches.html> |

## 研究过程与交付物

本目录保留的不只是最终页面，还包括从盘点、验证、实渲、复杂案例建设到质量修订的完整过程：

| 研究产物 | 内容 |
| --- | --- |
| [在线演示页](https://yydshly.github.io/0823_githubcode_study/projects/hyperframes-launches.html) | 28 支页面内 MP4、原理、能力、复杂目标、使用和扩展说明 |
| [能力矩阵](analysis/capability-matrix.md) / [JSON](analysis/capability-matrix.json) | 19 个顶层项目、25 个上游运行入口的结构化盘点 |
| [兼容性验证](analysis/verification.md) / [JSON](analysis/verification.json) | 全入口 lint、版本差异、错误和迁移边界 |
| [运行证据](analysis/runtime-evidence.md) | 浏览器、布局、动效、对比度和实际渲染结果 |
| [前端交付记录](analysis/frontend-delivery.md) | 展示页的信息架构、直接播放策略和浏览器验收 |
| [复杂案例交付](analysis/complex-demo-delivery.md) | AI 内容视频工厂的目标、输入协议、批量渲染和验收 |
| [质量修订记录](analysis/quality-revision.md) | 针对画质、循环播放和叙事重复问题的修订结果 |
| [自建复杂案例](examples/ai-content-video-factory/README.md) | 一套 HTML 时间轴由两行 VideoSpec 数据生成两支 1080p 成片 |
| [复现脚本](scripts/) | 盘点、预览、检查、渲染、素材生成与页面同步工具 |
| `upstream/` | 固定到提交 `199f7dc34c8e3f1d798c55f2074fe1bcbd6fd5ba` 的原始案例子模块 |
## 最终结论

这次研究最重要的结论不是“HyperFrames 能做出哪些炫酷效果”，而是厘清了三个容易混淆的对象：

| 对象 | 本质 | 与我们的关系 |
| --- | --- | --- |
| `hyperframes-launches` | HeyGen 使用 HyperFrames 制作的 19 组发布视频工程案例 | 案例、分镜、动效与工程组织参考，不是引擎源码 |
| `hyperframes` | 把 HTML、CSS、媒体和可定位动画确定性渲染为 MP4 的开源框架 | Remotion 的平行替代路线，不是必须依赖 |
| HeyGen 平台 / API | 数字人、口型、声音、翻译等生成能力 | 可以给视频流水线提供人物和声音素材，与 HyperFrames 是不同能力 |

HyperFrames 的技术本质可以简化为：让无头浏览器定位到视频的每一个明确时刻，离线渲染网页画面，再由 FFmpeg 编码画面、混合音频并输出 MP4。它不是实时录屏，也不是视觉特效生成器；文字飞入、图表、Shader、3D 和镜头运动仍由 HTML/CSS/SVG/GSAP/Three.js 等代码实现。

```text
HTML / CSS / SVG / Canvas / Three.js / 媒体
                         ↓
            可 seek 的确定性时间轴
                         ↓
          Headless Chrome 逐帧离线渲染
                         ↓
              FFmpeg 编码与音频混合
                         ↓
                         MP4
```

它真正解决的不是“能不能做这个效果”，而是“如何把网页效果可靠地变成可重复、可测试、可批量生产的视频”。最有价值的场景包括：把已有网页、GSAP 或 WebGL 动画做成产品演示；使用一套模板按 JSON 生成多客户、多语言、多画幅视频；让 AI 编程代理直接编写 HTML 视频工程。

Remotion 完全可以实现同类结果。二者都属于代码视频路线，主要差别是创作模型：Remotion 以 React 和逐帧计算为中心，HyperFrames 以普通 HTML 和可定位网页动画为中心。一般应按现有技术栈二选一，不需要组合使用。

**我们当前的技术决策：**保留本仓库作为 HeyGen 发布片、HTML 原生视频和 Agent 视频生产方式的研究参考；不把 HyperFrames 设为核心生产依赖。若主系统已经使用 React / Remotion，继续以 Remotion 作为统一编排层；只有在需要直接复用现有网页、GSAP、Three.js 或让 AI 快速生成普通 HTML 视频时，再评估 HyperFrames。

如果只是临时演示一个网页，录屏工具更简单；如果演示需要稳定重渲染、自动更新、批量变量、多语言和多画幅，HyperFrames 或 Remotion 才会体现真实价值。
## 最快看懂：直接看视频

演示页现在是“打开就看”的视频展厅：首屏自动播放 10.8 秒完整模板，第二段直接播放 6 支能力片段，第四段是 19 个顶层项目的全量样例墙，并包含 2 支自建复杂目标成片；不需要展开目录或点击外部 Viewer。

全页共有 28 个原生视频播放器。19 个全量样例使用本机真实渲染的中段预览，接近视口才加载、进入视口后静音播放、离开后暂停；每张卡片仍保留源码入口。

```powershell
python -m http.server 8879 --bind 127.0.0.1 --directory docs
```

然后打开：

```text
http://127.0.0.1:8879/projects/hyperframes-launches.html
```

首支视频预载；其余视频只预载 metadata，进入视口后才自动静音播放。所有视频都有原生播放控件；系统开启“减少动画”时自动播放关闭，但仍可手动播放。

## 它是什么

这个子项目包含两层：

1. `upstream/` 是 HeyGen 公开的真实产品发布视频源码，不是视频生成模型；
2. 本目录的 `scripts/`、`analysis/` 和本文档，是我们增加的统一演示、验证与使用层。

HyperFrames 把视频表示成 HTML：元素通过 `data-start`、`data-duration` 和 `data-track-index` 进入时间轴；GSAP、CSS、Lottie、Canvas、Shader 或 Three.js 动画接受明确时间；无头 Chrome 逐帧捕获，再由 FFmpeg 编码和混音。

```text
脚本 / 数据 / 品牌 / 图片 / 视频 / 音频
                    ↓
             HTML 场景与子合成
                    ↓
          可 seek 的动画与媒体时间轴
                    ↓
        Headless Chrome 逐帧捕获画面
                    ↓
             FFmpeg 编码与混音
                    ↓
                 MP4
```

## 全量能力概览

本地自动盘点结果：

- 19 个顶层发布项目；
- 25 个可直接定位的 `index.html` 运行入口；
- 181 个 HTML 文件；
- 97 个视频、106 个音频、244 个图片、171 个字体文件；
- 569 个 Git LFS 文件全部下载完成；
- 画布覆盖 1920×1080、1080×1080、720×720 和 720×1280。

能力可以归为八组：

| 能力 | 能做什么 | 推荐先看 |
| --- | --- | --- |
| 产品发布片 | 标题、功能证明、CTA、品牌收尾 | `hyperframes-launch` |
| UI / 网站演示 | 网页捕获、光标、界面操作、产品素材 | `website-to-hyperframes`、`figma-launch` |
| 模板换品牌 | 保留镜头与缓动，替换 Logo、颜色、文案和故事 | `heygen-apple-motion/01-ui-sting` |
| 技术内容视频 | PR、代码变更、研究论文和产品能力讲解 | `pr-to-video-launch`、`claude-paper-launch` |
| 声音设计 | 旁白、音乐、SFX、节拍与视觉事件同步 | `sfx-music-launch` |
| WebGL / VFX | Shader、折射、Canvas、粒子与视频叠加 | `liquid-brand-refraction`、`vfx-heygen-combined` |
| 数据变量 | 一套模板批量生成不同文本、素材和版本 | `variables-launch` |
| 多比例社交视频 | 横屏、方形、竖屏输出 | `figma-launch`、`heygen-apple-motion/04-generate-reel` |

完整逐入口矩阵见 [analysis/capability-matrix.md](analysis/capability-matrix.md)。

## 一分钟开始使用

以下命令从仓库根目录运行。

### 1. 查看全部可运行入口

```powershell
.\projects\hyperframes-launches\scripts\demo.ps1 list
```

### 2. 打开一个模板预览

```powershell
.\projects\hyperframes-launches\scripts\demo.ps1 preview `
  -Project "heygen-apple-motion/01-ui-sting"
```

### 3. 检查运行时、布局、动效和对比度

```powershell
.\projects\hyperframes-launches\scripts\demo.ps1 check `
  -Project "heygen-apple-motion/01-ui-sting"
```

### 4. 渲染 MP4

```powershell
.\projects\hyperframes-launches\scripts\demo.ps1 render `
  -Project "heygen-apple-motion/01-ui-sting" `
  -Quality draft
```

渲染文件出现在该案例的 `renders/` 目录。`draft` 用于迭代，交付时换成 `standard` 或 `high`。

### 5. 重新生成能力盘点与兼容性报告

```powershell
node .\projects\hyperframes-launches\scripts\inventory.mjs
node .\projects\hyperframes-launches\scripts\verify-all.mjs
```

## 已完成的运行证据

代表性模板 `heygen-apple-motion/01-ui-sting` 已在本机完成：

- HyperFrames `check` 通过；
- 浏览器运行时 0 error / 0 warning；
- 9 个布局采样点 0 issue；
- 动效检查 0 error / 0 warning；
- 11/11 文本通过 WCAG AA；
- 生成 5 张检查快照；
- 实际渲染 325 帧，输出 720×720、30fps、10.8 秒 MP4；
- 本次 draft 渲染约 18.2 秒完成。

最新 CLI 对 25 个入口的全量 lint 结果是：11 个零错误兼容，14 个需要迁移，共 115 errors / 163 warnings。详见 [analysis/verification.md](analysis/verification.md)。

“需要迁移”不等于作品不能播放。这个仓库跨越多个 HyperFrames 制作时期，部分项目还在 `package.json` 中固定了 `0.6.x` 或 `0.7.x`；最新 `0.8.10` 增加了更严格的资产路径、GSAP seek、安全编辑 ID、字体和布局规则。

## 怎么把模板改成自己的产品视频

推荐从 `heygen-apple-motion/01-ui-sting` 开始：

1. 复制整个案例到你自己的工作目录，不直接修改 `upstream/`；
2. 替换 `assets/` 中的 Logo、字体和产品图片；
3. 修改 `index.html` 中的标题、数字、导航和 CTA；
4. 尽量保留原来的切点、运动方向和缓动曲线；
5. 运行 `lint`，再运行 `check --snapshots`；
6. 用 `draft` 渲染确认节奏，最后输出 `high`。

不要只做“换 Logo 和颜色”。一个有效的换品牌需要把原模板的叙事槽位映射到你的产品：入口是什么、用户采取什么动作、哪个数字最重要、最终成果是什么。

## 对我们的意义

它最适合成为自动化视频系统中的“确定性合成层”：

```text
信息采集 → 内容理解 → 脚本 / 分镜 → 素材生成
                                      ↓
                           HyperFrames 场景编排
                                      ↓
                         自动检查 → 渲染 → 发布
```

上游图片、数字人、视频生成和 TTS 模型可以变化；只要输入遵守我们的场景数据协议，标题、字幕、Logo、图表、转场和时间轴就可以稳定复用。相比每条视频都让模型重新“自由创作”，这种方式更容易控制品牌、质量、成本和批量产量。

## 面向 AI 新闻视频的扩展路线

### 第一阶段：一个可重复的新闻模板

建立 `NewsVideoSpec`：

```json
{
  "headline": "今日 AI 头条",
  "summary": "三句话摘要",
  "source": "官方博客",
  "publishedAt": "2026-08-23",
  "heroImage": "assets/hero.jpg",
  "voiceover": "assets/voiceover.wav",
  "accentColor": "#a7f06f"
}
```

先覆盖开场、核心事实、数据/引用、影响和来源五类场景。

### 第二阶段：场景路由器

让内容模型根据新闻结构选择场景，而不是直接写整条 HTML：

- 人物或公司新闻 → 人物卡 / 公司卡；
- 融资和市场数据 → 数字冲击 / 图表；
- 产品发布 → UI 演示 / 特性列表；
- 时间演变 → 时间线；
- 多方观点 → 引用对比；
- 证据不足 → 来源页与保守表述。

### 第三阶段：音频驱动时间轴

用旁白词级时间戳决定字幕、镜头切换、音乐 ducking、SFX 和图表动画落点。视觉时间轴应该服从内容和声音，而不是平均切成固定长度。

### 第四阶段：自动质量门

在发布前加入：

- 来源完整性和事实字段检查；
- 字幕安全区与中英文断行；
- 黑帧、空帧、冻结帧检查；
- 布局、遮挡、对比度和运动检查；
- 音量、响度和削波检查；
- 固定 Chrome、字体、依赖与渲染环境。

### 第五阶段：批量生产

同一份 `NewsVideoSpec` 可以生成 16:9、9:16、1:1，多语言、多品牌和不同栏目风格，再接本地队列、HeyGen Cloud、AWS Lambda 或 Cloud Run。

## 复杂目标实战：AI 内容视频工厂

已新增一套不依赖上游案例的自有模板：

```text
examples/ai-content-video-factory/
├─ index.html                  # 18 秒、6 个镜头的导演剪辑版模板
├─ video-spec.example.json    # 面向业务系统的输入协议
├─ batch.json                 # AI 日报与产品更新两行变量
├─ render-demo.ps1            # 一条命令批量渲染
├─ renders/                   # 两支完整 MP4 与 manifest
└─ README.md                  # 单案例使用说明
```

它证明的不是“有两个相似视频”，而是：同一份 HTML 时间轴只建设一次，换一行结构化变量即可得到另一支内容、证据、渠道和品牌主题都不同的成片。

直接运行：

```powershell
cd E:\0823_codex_project\projects\hyperframes-launches\examples\ai-content-video-factory
.\render-demo.ps1
```

实际结果：AI 日报版和产品更新版均为 1920×1080、30fps、18 秒、540 帧、high 质量；HyperFrames Lint 为 0 错误、0 警告，批处理 manifest 为 2/2 成功。

建议接入顺序：真实数据源与人工审批 → VideoSpec → 已验证场景库 → 批量渲染 → 黑帧/溢出/字幕/音频质量门 → 多渠道发布。HyperFrames 是其中的确定性合成层，不负责替代上游事实校验或自由生成式影视模型。

## 边界与许可证

- `hyperframes` 引擎采用 Apache-2.0；本案例仓库根目录目前没有独立 LICENSE 文件，不能把“公开源码”自动等同于“任意商用素材”。
- 上游包含商业字体、人物画面、商标和品牌素材。正式发布前必须替换或逐项确认授权。
- 案例中的 CDN 脚本和在线字体会影响离线稳定性；生产项目应将依赖与字体本地化并锁定版本。
- “确定性”以固定浏览器、字体、GPU/SwiftShader 和素材为前提；不同环境仍可能改变精确像素。
- 这是合成与渲染框架，不是文生视频模型。真实人物、图片、B-roll 和配音仍来自外部素材或生成服务。

## 目录说明

```text
projects/hyperframes-launches/
├─ upstream/                     # 固定版本的上游 submodule
├─ examples/
│  └─ ai-content-video-factory/ # 自有 VideoSpec + 批量变量复杂实战
├─ scripts/
│  ├─ demo.ps1                  # list / preview / lint / check / render
│  ├─ sync-complex-demo-page.mjs# 复杂实战页面同步
│  ├─ inventory.mjs             # 生成全量能力清单
│  └─ verify-all.mjs            # 最新 CLI 全量兼容性检查
├─ analysis/
│  ├─ capability-matrix.md      # 全入口能力矩阵
│  ├─ capability-matrix.json    # 机器可读盘点
│  ├─ verification.md           # 兼容性结果
│  ├─ verification.json         # 机器可读验证结果
│  └─ complex-demo-delivery.md  # 复杂目标验收记录
└─ README.md                    # 本指南
```

