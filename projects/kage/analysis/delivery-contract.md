# Kage 研究与扩展交付契约

## Design contract

```text
Entry mode: Reference-led research and implementation
Request revision: 1
Target user and context: 当前研究仓库的开发者；需要先理解、演示，再将模式转化为可独立演进的能力
Desired first impression: 原版能力可立即运行、证据与推断边界清楚、扩展入口不污染上游
Visual ambition: Immersive
Experience architecture: Hybrid Workspace
Visual constraints: upstream 保持原样；扩展实验不得复用 Kage 原始代码或美术；实验台保持可读、克制、以证据为中心
Information constraints: 中文优先；每项结论区分 source evidence、runtime evidence、bounded conclusion 与 hypothesis
Operation constraints: Windows 本地一条命令启动；原版、实验台和研究文档有稳定 URL；不需要密钥或外部服务
State constraints: 覆盖加载、默认、章节滚动、导航、桌面细指针、移动粗指针、reduced-motion、无 WebGL fallback
Environment constraints: Chromium/WebGL；桌面 1440×900、移动约 390×844；上游固定提交；证据保留不超过六张最终截图
Primary journey: 启动研究服务 → 观看原版五章节 → 检查交互与降级 → 进入独立实验台 → 按使用场景理解扩展路线
User-defined phases: 安装子项目；演示已有能力；按能力扩展；按使用场景深入研究
Required artifacts: upstream submodule、启动脚本、README、能力地图、使用场景矩阵、扩展实验台、浏览器证据、交接记录
Autonomy authorization: 用户已明确授权安装、研究、演示并继续扩展
User-decision boundary: 需要真实品牌/世界观/商业素材或取得 Kage 作者授权时再请求；首轮研究与原创技术实验无需额外确认
Observable completion criteria: 原版和实验台均可从文档命令打开；关键章节/交互/移动与 fallback 有真实浏览器证据；无可执行 continue；许可证边界写清
Coverage record: 见下表
```

## Selected research route

```text
Selected pattern: Research → DOM + WebGL scroll story → production hardening
Evidence branch: Kage source + pinned upstream runtime + independent lab runtime
Required inputs: 上游仓库 URL、当前 Windows/Chromium 环境、原创扩展代码与无版权负担的程序化素材
Expected output: 可复现原版基线、能力地图、场景矩阵、独立扩展实验和可审计浏览器证据
What should update the skill: 先只更新项目文档；仅在运行证据形成稳定通用结论后考虑技能更新
```

## Coverage manifest

| 用户阶段 | 要求或产物 | Surface / state | Evidence needed | Owning stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 安装子项目 | 建立隔离研究目录与契约 | Repository | 文件 | Stage 0 | pass | 固定上游提交 |
| 安装子项目 | upstream Git submodule，不直接修改 | Repository | Git status / commit | Stage 1 | continue | 添加并记录 submodule |
| 演示已有能力 | 原版可启动 | Desktop default | 浏览器截图、控制台、DOM | Stage 1 | continue | 建立脚本并打开基线 |
| 演示已有能力 | 五章节滚动与导航 | Desktop interaction | 交互观察、章节状态 | Stage 5 | continue | 自动走完滚动/导航 |
| 演示已有能力 | 细指针视差与布料卡片 | Desktop pointer | 交互观察 | Stage 5 | continue | hover / pointer 验证 |
| 演示已有能力 | 移动布局与低画质路径 | 390×844 coarse | 截图、DOM、运行状态 | Stage 7 | continue | 移动视口验证 |
| 演示已有能力 | reduced-motion | Desktop reduced motion | 浏览器观察 | Stage 7 | continue | 模拟媒体偏好 |
| 演示已有能力 | no-WebGL 阅读 fallback | Capability fallback | 浏览器截图、DOM | Stage 8 | continue | 使用 `?nogl=1` 验证 |
| 深入研究 | 源码能力地图 | Analysis | 文档与源码位置 | Stage 9 | continue | 运行 probe 并写能力地图 |
| 深入研究 | 使用场景与扩展优先级矩阵 | Analysis | 文档 | Stage 9 | continue | 建立场景/价值/风险矩阵 |
| 根据能力扩展 | 独立实验台可运行 | Desktop + mobile | 浏览器截图、交互 | Stage 1-7 | continue | 实现不引用上游源码/素材的 lab |
| 根据能力扩展 | 至少一条原创扩展路线 | Enhanced + fallback | 浏览器与源码证据 | Stage 5-8 | continue | 实现配置化章节/镜头研究原型 |
| 交付 | README、项目索引、证据与交接 | Repository | 文件与终端审计 | Stage 9 | continue | 完成后统一更新 |

## Support boundary

- 本轮目标是研究基线与原创实验，不宣称 Kage 是可复用 SDK。
- Kage 原始代码、美术与 `PROMPT.md` 未获复用/再分发许可；upstream 仅用于本地研究和运行对照。
- 独立实验台不得 import、复制或改写 upstream 源文件，也不得引用其图片或字体。
- 真实商业落地、公开部署衍生版本、品牌素材生产不在首轮授权范围内。
