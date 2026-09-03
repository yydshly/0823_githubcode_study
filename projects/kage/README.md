# Kage · Idea to Three.js Experience

> 用户描述一个期望的想法，系统按需理解目标、生成或组织素材，并把它构建成专属、可运行、可继续精修的 Three.js 网页体验。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | https://github.com/MengTo/kage |
| 固定版本 | `4399487d2fb42bce39c7b032fbbb50d230bf4f0b` |
| 开始日期 | 2026-08-24 |
| 当前状态 | V1 已归档并独立部署；V2.5 直接创作基线已冻结；V3 五类媒介、直接创作入口与静态生产恢复基线均已验证，下一阶段只做一个全新 brief 产品回归 |
| 原版本地入口 | `http://127.0.0.1:8143/upstream/` |
| 公开工作台入口 | [打开工作台](https://yydshly.github.io/0823_githubcode_study/projects/kage/workbench.html)（本地确定性生成；模型专属构建需本机服务） |
| V1 Pages 入口 | [查看 V1 案例](https://yydshly.github.io/0823_githubcode_study/projects/kage/v1/) |
| V2 Pages 入口 | [查看 V2 方向](https://yydshly.github.io/0823_githubcode_study/projects/kage/v2/) |
| V2 参考研究 | [查看研究系统](https://yydshly.github.io/0823_githubcode_study/projects/kage/v2/research/)（首批 34 / 462 条公开案例，按证据、原理和组合分层） |

## 当前交付

- V1 已证明“想法 → 素材 → Codex 专属网页 → Three.js 运行 → 视觉精修 → 最佳案例归档”的完整链路。
- 公开工作台可直接完成“描述 → 本地生成 → Three.js 预览”，并明确区分静态演示与需要本机服务的 Codex/MiniMax 能力。
- V1 公开演示只保留六个最终案例，失败版本和中间版本不进入公共案例库。
- V1 源码、运行时与案例保持冻结；静态 Pages 构建可以独立重现全部案例。
- V2 基于 V1 的稳定运行时与经验，但使用独立入口、独立页面和独立后续代码边界。
- V2 的核心是参考证据与创意合同：减少模型自由搜索范围，而不是增加更多固定模板。
- V2 已将本地优秀案例沉淀为可组合机制，并在编码前明确视觉职责、交互含义和 DOM/媒体/Canvas/Three.js 技术路线。
- V2 关键素材不足时会停止伪生成，允许复制精确 Codex 任务或上传本地素材并恢复同一 Job；最终门禁会拒绝批注残留、素材边界和连续主体错位。
- V2.5 的公共主动作会导出 protocol v3 有界包，由当前 Codex 直接创作；当前阶段不会从页面静默启动后台模型任务。
- V2.5 新精选必须绑定同一最终 `runId + bundleHash`，并通过内容结构依据、最终质量门与适用的 WowGate；R125“冰芯来信”是冻结锚点。
- V3 的程序化 WebGL、生成主视觉、代码原生 SVG、真实媒体与真实动画 GLB 五条计划路线均已闭环；R138 又完成 protocol v3 入口真实性和静态生产恢复验收。`5/5` 不是产品完成率，下一步只用一个未出现过的 brief 检验从想法到成品的产品回归。

## 版本入口

- [V1 归档定义](lab/docs/releases/V1-IDEA-TO-EXPERIENCE-BASELINE.md)
- [V1 耗时、问题与 V2 约束](lab/docs/releases/V1-PERFORMANCE-AND-GAPS.md)
- [V2.5 直接创作冻结基线](lab/docs/releases/V2.5-DIRECT-CREATIVE-BASELINE.md)
- [V2.0–V2.2 历史参考驱动合同](lab/docs/V2-REFERENCE-GUIDED-CREATIVE-CONTRACT.md)
- [MotionSites 首批研究沉淀与创意组合](lab/docs/v2-research/MOTIONSITES-R05-FIRST-BATCH-SYNTHESIS.md)
- [本地优秀案例研究与七类视觉机制](lab/docs/v2-research/LOCAL-EXEMPLARS-R06.md)
- [V2 视觉决策层与工作台操作](lab/docs/v2-research/V2-DECISION-LAYER-R07.md)
- [V2 R125 冻结锚点与最终证据](lab/docs/v2-research/V2-R125-ICE-CORE-LETTERS.md)
- [V2/V3 R137 当前状态与下一阶段](lab/docs/v2-research/V2-PROGRAM-STATUS-R137.md)
- [V2/V3 R138 入口与静态生产恢复基线](lab/docs/v2-research/V2-PROGRAM-STATUS-R138.md)
- [R137 狐步三拍最终证据](lab/docs/v2-deliveries/R137-FOX-GAIT-OBSERVATORY.md)
- [六个精选案例](lab/cases/CURATED-PORTFOLIO.md)

## 安装与复现

```powershell
git submodule update --init projects/kage/upstream
cd projects/kage/lab
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run build:pages
cd ..
powershell -ExecutionPolicy Bypass -File scripts/demo.ps1 serve -Port 8143
```

查看全部确定性入口：

```powershell
powershell -ExecutionPolicy Bypass -File projects/kage/scripts/demo.ps1 list
```

Lab 单独开发：

```powershell
cd projects/kage/lab
npm.cmd run dev
```

## 版本边界

- `lab/pages/v1/`：冻结的 V1 静态演示与案例加载器。
- `lab/cases/runs/`：V1 精选案例的不可变运行 bundle。
- `lab/pages/v2/`：独立 V2 演示与阶段状态。
- V2 后续实现放入独立的 planner/evidence/contract 边界；只复用 V1 稳定 SDK 与 schema，不覆盖 V1 页面和案例。

## V1 演示什么

### 上游现有能力

- 滚动位置映射为连续 Three.js 摄影机；
- 程序化建筑、地形、纹理、光雾、雨、落叶、水波与指针粒子；
- DOM 文案、透明 WebP、局部场景镜头与 WebGL2 布料卡片混合；
- 自定义 half-float bloom/色调/色差/暗角/颗粒后期；
- 移动删效、动态 DPR、reduced-motion 阅读路径与 no-WebGL fallback。

### 原创扩展能力

- `StoryConfig` 同时驱动正文、导航、camera shot 与 scene state；
- `observatory / archive / explainer` 三套配置共用同一 runtime；
- `quality / motion / renderer / chapter / debug` 查询参数可稳定复现；
- 不依赖上游目录即可构建、测试和运行。

## 研究文档

- [交付与许可隔离契约](analysis/delivery-contract.md)
- [上游能力、原理、证据与限制](analysis/upstream-capability-map.md)
- [固定版本静态审计](analysis/static-audit.md)
- [使用场景与扩展优先级矩阵](analysis/scenario-matrix.md)
- [Signal Story Lab 扩展实验报告](analysis/lab-extension-report.md)
- [原版运行报告](evidence/runtime-report.json)
- [Lab 运行报告](evidence/lab-runtime-report.json)

## 场景路线

1. **P0 品牌叙事样板**：最接近现有能力，最快验证理解、记忆和 CTA。
2. **P0 可视化导演台**：将章节、镜头、世界 cue 和质量参数变成团队生产工具。
3. **P1 游戏世界观**：增加轻探索、lore hotspot、状态与可回放 fixture，不直接扩成战斗引擎。
4. **P1 文旅展陈**：有内容伙伴后增加来源、权利、多语言、无障碍、离线 kiosk 与运维。
5. **P2 AI 叙事副驾驶**：只生成受 schema 约束的草案，经 lint 和人工批准后预览。

## 许可与限制

Kage README 明确没有授予原始代码或美术的复用、再分发许可；vendored Three.js 仍适用其 MIT 许可。本项目只在本地保留 upstream 供研究与原版演示。Signal Story Lab 使用当前 npm Three.js、系统字体和原创程序场景，但不应对外宣称经过法律审计的 clean-room certification。

Headless FPS 数据只用于相对观察，不是实机性能承诺；下一轮需要集显、独显、Android Chrome 与 iOS Safari 的 CPU/GPU/显存/热功耗矩阵。
