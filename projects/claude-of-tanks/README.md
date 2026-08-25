# Claude of Tanks

> 研究一个不依赖 Unity/Unreal、直接以 Three.js + 自研确定性模拟构建的浏览器 3D 装甲战斗游戏，并用真实浏览器、完整测试和发布素材验证其能力边界。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | [Kevin-Liu-01/Claude-of-Tanks](https://github.com/Kevin-Liu-01/Claude-of-Tanks) |
| 研究版本 | `fba54d06a5ccf1053477efde5e60bb9b338584e9` |
| 上游提交 | `2026-08-23 · chore(vehicles): refresh PL-01 marking seats` |
| 开始日期 | 2026-08-24 |
| 当前状态 | Phase 01 已归档（2026-08-26）；满足恢复条件时再开启下一阶段 |
| 在线演示 | [能力总览](https://yydshly.github.io/0823_githubcode_study/projects/claude-of-tanks.html) · [Phase 01 归档](https://yydshly.github.io/0823_githubcode_study/projects/claude-of-tanks-archive.html) · [产品工作台](https://yydshly.github.io/0823_githubcode_study/projects/claude-of-tanks/workbench/) · [上游游戏](https://cot.kevinliu.studio/) |
| 许可证 | MIT；第三方例外见上游 `NOTICE.md` 与 `docs/ATTRIBUTION.md` |

上游源码通过 `upstream/` Git submodule 固定。研究脚本、实测证据和结论放在当前目录；本地 Scene Studio 集成差异单独保存为 `patches/studio-object3d-extension.patch`，不改变父仓库记录的上游提交。

## 先看能力

安装后启动本地服务：

```powershell
cd projects/claude-of-tanks/upstream
npm.cmd install --no-package-lock --no-audit --no-fund
npx.cmd vite --host 127.0.0.1 --port 4173 --strictPort
```

然后按下面顺序打开：

| 演示 | 地址 | 看什么 |
| --- | --- | --- |
| 车库与 Bot 战斗 | <http://127.0.0.1:4173/> | 车辆选择、20 张地图、涂装、装备、7v7 Bot、战斗 HUD |
| Tank Gallery | <http://127.0.0.1:4173/gallery?id=t90m> | 112 辆生产车辆、相机、装甲/模块/乘员覆盖层、精确表面标注 |
| Scene Studio | <http://127.0.0.1:4173/studio?map=desert> | 场景放置、车辆状态、特效、相机与车辆时间线、截图/录制 |
| 综合能力场景 | <http://127.0.0.1:4173/studio?map=desert&showcase=capabilities&nogate=1> | 4 辆载具、25 个实例、全部 17 类 Studio 效果、6 镜头与 3 条车辆轨道 |
| 工程文档 | <http://127.0.0.1:4173/docs> | 架构、模拟、联网、性能、Gallery 与 Studio 契约 |

Studio 加载后，可把 [`scripts/studio-full-demo.js`](scripts/studio-full-demo.js) 作为浏览器自动化 `eval` 脚本执行。它会构建 T-90M 对 M1A2 的 8 秒场景，安排移动、开火、ERA 命中、断履带、弹药架摧毁、两段相机轨道，并验证 1280×720 捕获元数据。

完整的 20 秒组合场景、能力边界和视觉审查记录见 [`analysis/combined-scene-capabilities.md`](analysis/combined-scene-capabilities.md)。自动验收脚本会在真实 Chromium/WebGL 中核对演员、效果类型、时间线与控制台错误，并保存三个时间点截图。

### 3D 能力研究平台（当前正式入口）

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-research-platform.ps1 -Port 4176
```

打开 <http://127.0.0.1:4176/research>。控制面把能力拆成渲染内核、场景逻辑、内容主体和展示逻辑四层，提供沙漠综合场景、七层视觉实验和程序化产品工作台三个正式入口，并直接展示复用结论、性能预算和风险。

Phase 01 已于 2026-08-26 暂时归档。新增的 <http://127.0.0.1:4176/research/archive> 用一个不加载 Three.js、模型或媒体的轻量页面汇总现有页面、能力、证据、风险与六个恢复方向。完整结论见 [`analysis/phase-01-stage-archive-2026-08-26.md`](analysis/phase-01-stage-archive-2026-08-26.md)，可审计归档包见 [`archive/threejs-capability-research-phase-01-2026-08-26/`](archive/threejs-capability-research-phase-01-2026-08-26/)。在出现明确资产、业务流程或目标设备预算之前，不继续扩张新场景。

归档页 v2 增加 6 个粘滞章节入口、hash 深链、活动章节和 `aria-current`；1440px 桌面、768px 平板、390px 移动与键盘/reduced-motion 共 27 项浏览器检查通过。最终三端截图、报告、Revision 2 契约与 14 项 SHA-256 位于上述归档包。

独立工作台位于 <http://127.0.0.1:4176/workbench>：真正 world:none，不请求游戏/world 或外部模型。SubjectAdapter v1 让 Atlas 巡检车与 Nova 能源节点复用同一 Product Stage v2；两个不同类别主体都支持三热点、三材质、分解、响应式镜头与 22 秒跨主体导演。它证明轻量产品展示可以脱离沙漠并替换程序化主体，但两者仍只是 L2 原型。

双主体验收 30 项全部通过；390px 手机无横向溢出、触控目标至少 44px、0 个控制台错误。Atlas 高质量从 151 calls 优化到 116（降低 23.2%）；Nova 高质量 51 calls、移动轻质量 37 calls，8 项工作台预算全部通过。详情见 [analysis/research-platform-v3.md](analysis/research-platform-v3.md)。

### GitHub Pages 阶段发布

Pages 只发布必要的三层：静态能力总览、轻量阶段归档、以及可独立运行的 `WORLD:NONE` 产品工作台。沙漠组合场景和视觉层实验室依赖完整上游运行时与本地 Studio 扩展，因此作为研究证据保留，不包装成线上通用产品能力。

独立工作台的生产构建转换 14 个模块；主 JS 约 599.93 kB（gzip 153.79 kB），已登记大块风险。真实 Chromium/WebGL 对总览、归档、桌面工作台和 390px 移动路径执行 26 项检查，结果全部通过：双主体切换、分解交互、`world:none`、0 外部 3D 模型、0 横向溢出、0 控制台错误。报告和 5 张发布截图见 [`evidence/pages-release/`](evidence/pages-release/)。

```powershell
.\upstream\node_modules\.bin\vite.cmd build --config scripts\vite-pages-workbench.config.mjs
node scripts\verify-pages-release.mjs
```

### 视觉分层实验

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-visual-layer-lab.ps1 -Port 4174
```

打开 `/studio?map=desert&showcase=capabilities&lab=layers&nogate=1`，按几何、材质、光影、环境、后期、镜头、特效 7 层检查画面；键盘 `←` / `→` 切层，`B` 对比上一层，`Space` 自动轮播。详情见 [`analysis/visual-layer-lab-final.md`](analysis/visual-layer-lab-final.md)。

### 工业展厅实验（已阻止作为正式入口）

这个分支证明了普通 `Object3D` 挂载、三种材质、三个热点、镜头状态和生命周期合同，但最终截图表明它仍由沙漠 world 和 Studio 相机主导，没有形成独立展厅与有效产品构图。因此它被登记为 **blocked 失败实验**，4175 服务已停止，研究平台不提供启动链接。

代码和 [`report.json`](evidence/industrial-showroom-final/report.json)、[`lifecycle-smoke.json`](evidence/industrial-showroom-final/lifecycle-smoke.json)、[`runtime-metrics.json`](evidence/industrial-showroom-final/runtime-metrics.json) 继续保留，用于说明“结构测试通过不等于视觉复用成功”。新的独立成功路径见 [`analysis/research-platform-v3.md`](analysis/research-platform-v3.md)。

## 能力地图

### 渲染栈

- Vite 多入口应用，核心依赖为 Three.js；没有 Unity、Unreal 或外部通用物理引擎。
- 自定义 WebGL renderer、相机、天空、雾、级联阴影、后处理、SMAA/FSR、实例化和粒子对象池。
- 固定 60Hz 模拟与可变刷新率渲染分离；质量等级只能改变画面成本，不能改变玩法规则。
- GPU/驱动诊断、动态分辨率、WebGL Context Loss 与黑帧恢复路径。

### 场景与资产

- 本研究版本审计出 122 个第一方程序化可玩模型、0 个 GLB 可玩模型、7 个隔离对比候选。
- 112 辆车辆进入公开 Gallery，151 条车辆规格保存在注册表中。
- 20 张完整地图、28 类共享结构、16 类可破坏结构、松散物体物理、残骸和公用设施网络。
- 一份车辆规格同时驱动几何、装甲、模块、乘员、弹药、Bot、车库、Gallery、Studio 与生成素材。

### 动作、物理与战斗

- 车辆动力、转向、制动、地形阻力、碰撞、悬挂姿态、履带行程与撞击。
- 五类弹药、真实炮口变换、重力弹道、装甲板命中、跳弹、过匹配、间隙/复合/ERA 防护。
- 乘员、发动机、燃油、弹药架、火炮、炮塔座圈、履带和火灾状态。
- 自动装填、导弹架、IFV 供弹、液气悬挂、固定炮车体瞄准等车型特有机制。

### 交互与工具

- 键鼠、手柄、移动触控、可重映射操作、自由观察、精确瞄准和消耗品。
- Gallery 支持五个图层、八个相机视角、车辆姿态、搜索过滤、结构化数据与表面审查包。
- Studio 支持车辆/地图/损伤状态、18 类以上特效、20 秒时间线、场景 JSON、高清 PNG 和 WebM。
- Puppeteer 驱动的截图、视频、性能、设备、网络与视觉发布门禁。

### 多人网络

- 单机直接运行；私人/LAN 房间使用 WebRTC；排位使用 Node WebSocket 权威服务。
- 客户端只发送控制意图；命中、伤害、侦察、装填和结果由权威端计算。
- 60Hz 权威模拟、20Hz 玩家专属快照、预测/校正、远端插值、可靠事件与可替换状态通道。
- 隐藏敌人坐标在服务器生成快照时移除，而不是传到客户端后仅做视觉隐藏。

## 本机验证结果

验证日期：2026-08-24，Windows，Node `v22.15.0`，npm `10.9.2`。

| 验证项 | 结果 | 证据/结论 |
| --- | --- | --- |
| 完整 `npm test` | 通过 | 模拟、网络、车辆、地图、UI、移动端、发布素材及 posttest 全部退出 0 |
| 私有生产构建 | 通过 | 295 个模块、5 个 HTML 入口；约 10.6 秒完成 |
| 公共 Vite 构建 | 构建通过，剥离门禁失败 | Windows ESM 路径被解析为 `protocol 'e:'`；隔离目录已不存在，但脚本拒绝放行 |
| 可玩资产来源 | 通过 | 122 第一方程序化可玩模型、0 GLB 可玩模型、7 隔离候选 |
| 首页/车库 | 通过 | 实际页面非空，交互快照包含 Bot、Studio、Gallery、文档、地图、车辆与涂装入口 |
| Bot 战斗 | 通过到战场运行态 | 读取到 7v7 阵容、2300 HP、15:00 计时、地图与战斗预热 HUD |
| Gallery 五层 | 通过 | T-90M：38 个装甲体、11 个模块体、3 个乘员体、55 个可标注网格 |
| Gallery 表面标注 | 通过 | 实际选中两个车体三角面，输出 hull 归属、rig 路径、边界、法线和代表三角形 |
| 双浏览器房间 | 通过 | 85ms 延迟、35ms 抖动、12% 丢包；116 快照、20.92m 位移、重赛与干净离开 |
| 2v2 浏览器容量 | 功能链完成，性能门禁未过 | 四人名单、开始转换、权威交接、四个握手完成；最大权威步进 34.8ms，高于 33ms 门槛 |
| 7v7 浏览器容量 | 未通过 | 14 页面和 13 个客端会话建立，但所有客户端未在 180 秒内收齐 14 人名单 |
| Studio 时间线自测 | 通过 | `studioTimeline.selftest` 的时长、归一化、相机轨道、切镜与车辆轨道通过 |
| Studio 浏览器组合场景 | 通过；完整输出门禁未重新认证 | 真实 Chromium 中约 18.3 秒进入场景，17 类效果审计和 3 个时间点截图通过；此前官方 2560px capture/WebM 全门禁仍未通过 |
| 移动 QA 功能路线 | 通过 | 车库、换车、战斗、观察、驾驶、开火、交战、重赛、换图、生命周期与 Context Loss 恢复均执行 |
| 移动 QA 性能/布局 | 未通过 | 7 个站点超预算；战斗加载 73.9 秒；竖屏计分板与小地图/移动 Chrome 重叠 |

移动 QA 的原始评分、追踪和截图位于 [`evidence/`](evidence/)；评分包含 3184 个采样帧、3670 个事件和 0 个运行时错误。

## 重要规模证据

- 完整自测确认：移动 98 项、战斗 268 项、侦察 99 项、装备 169 项。
- 122 辆车覆盖 12 类车轮/履带模式、40 个自动装填系统、15 个 IFV 供弹系统和 16 个导弹架。
- 114 辆炮塔车辆的炮管姿态与座点通过；8 辆车体瞄准车辆保持固定炮契约。
- 20 张地图的专用服务器碰撞清单、Bot 路线和战局节奏均被执行。
- 发布素材库自测覆盖 30 张动作画面、30 张前景画面、5 段 Studio 帧和 10 个 UI 状态。

## 已发现的工程边界

1. `package.json` 与 `package-lock.json` 不同步，`npm ci` 缺少 `@emnapi/core` 与 `@emnapi/runtime` 条目；本研究使用 `npm install --no-package-lock`，保持锁文件不变。
2. `npm run build` 使用 POSIX 环境变量写法，且公共剥离脚本/多人浏览器工具存在 Windows 路径兼容问题。
3. 车辆工厂和主入口的生产块分别约 2.26MB 与 2.57MB，gzip 后约 683KB 与 638KB，Vite 发出大块警告。
4. “连接成功”不等于“大房间已同步”：7v7 的 14 个会话建立后，完整名单仍可能不收敛。
5. 上游已发布的移动画面能展示设计目标，但本机真实 QA 显示弱 GPU/高 DPR 环境下加载与布局仍有明显风险。
6. 研究用综合场景现在已在本机实时 Studio 中加载、seek 并截图；但官方完整门禁的 2560px 原生 capture 与 WebM 录制尚未重新认证，发布素材仍不能替代当前机器的完整输出证明。

## 研究结论

这个仓库适合当作浏览器 3D 游戏的架构与生产管线样板，尤其值得复用：

1. 固定步长权威模拟与 Three.js 表现分离；
2. 单一车辆规格驱动玩法、几何、UI、工具与测试；
3. Gallery/Studio 与实际运行时共用资产和规则；
4. 把程序化资产、视觉、性能、网络和发布素材纳入可执行门禁；
5. 用 AI Agent 扩大产能，同时用所有权边界和证据约束修改。

它目前不应被直接认定为通用 3D 引擎或已经通过所有生产门槛。更合适的做法是提取渲染平台、固定步长模拟、规格系统、Studio、Gallery 和验证管线，再替换坦克领域模块。

## 参考资料与许可证

- [上游 README](https://github.com/Kevin-Liu-01/Claude-of-Tanks)
- [Technical Overview](https://github.com/Kevin-Liu-01/Claude-of-Tanks/blob/main/docs/TECHNICAL-OVERVIEW.md)
- [Multiplayer Architecture](https://github.com/Kevin-Liu-01/Claude-of-Tanks/blob/main/docs/MULTIPLAYER-ARCHITECTURE.md)
- [Tank Gallery](https://github.com/Kevin-Liu-01/Claude-of-Tanks/blob/main/docs/GALLERY.md)
- [Scene Studio](https://github.com/Kevin-Liu-01/Claude-of-Tanks/blob/main/docs/STUDIO.md)
- 上游代码为 MIT；复用时仍需保留许可证、版权声明以及第三方素材的单独归属记录。
