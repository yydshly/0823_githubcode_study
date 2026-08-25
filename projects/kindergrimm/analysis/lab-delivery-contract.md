# Kindergrimm 能力与场景实验室：交付合同

## Design contract

```text
Entry mode: Revision-led / direct implementation
Request revision: R1 — 从研究展厅扩展为可操作的能力、技术扩展与场景实验室
Target user and context: 需要理解仓库价值并决定下一步研发路线的产品/技术团队
Desired first impression: 先看到“可操作的真实能力”，再看到如何复制能力和落入产品场景
Visual ambition: Immersive
Experience architecture: Hybrid Workspace
Visual constraints: 延续现有深色研究站语言；真实演示是视觉锚点；不伪造新上游能力
Information constraints: 严格区分已有能力、可扩展方向、场景假设和生产缺口
Operation constraints: 静态前端；所有演示来自固定上游子模块；不需要安装依赖
State constraints: 能力分类、技术路线、场景步骤、iframe 加载、刷新和新窗口打开
Environment constraints: 本地 HTTP 服务；桌面 Chromium 为主；移动端可阅读和操作；仅支持深色主题
Primary journey: 选择三类工作区之一 → 选择能力/路线/场景 → 在同屏真实预览中操作 → 读取下一步研发动作
User-defined phases:
  1. 展示已有能力
  2. 驱动继续生产类似能力并做技术扩展
  3. 分析使用场景并构建场景演示
Required artifacts:
  - 可运行实验室页面
  - 14 项能力目录和真实本地预览
  - 技术扩展路线图
  - 至少 4 个使用场景及分步现场演示
  - 本地启动脚本与复现说明
Autonomy authorization: 用户明确要求构建并继续；允许范围内可逆本地实现和验证
User-decision boundary: 新自有视觉方向、商业场景优先级、正式导出格式、后台与部署均不在本轮决定
Observable completion criteria:
  - 14 项能力均可从实验室选择并加载对应上游页面
  - 三个用户阶段均有独立、清晰、可操作的界面
  - 场景步骤会改变真实演示与上下文说明
  - 桌面和移动端无布局遮挡，主要操作可键盘到达
  - 页面无阻塞控制台错误；资源引用无缺失
Coverage record: 见下表
```

## Experience architecture

```text
Scene base: same-origin iframe，加载固定上游 Three.js / Canvas 演示
Scene persistence: 桌面端在三种工作区切换时始终可见；移动端位于控制区之后
Foreground control model: 顶部分区按钮 + 左侧目录/步骤 + 舞台工具栏
State-to-scene mapping:
  loading → 舞台显示加载状态
  active → 显示路由、能力类型、当前说明
  switched → 新演示加载，状态文字同步变化
  recovery → 可刷新当前演示或在新窗口打开
Mobile transformation: 单列工作区；舞台保持可操作高度；控制项横向滚动或自然换行
Fallback: 无 JavaScript 时显示项目说明和原始演示入口；iframe 不可用时仍可新窗口打开
```

## Coverage manifest

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 14 项已有能力完整目录 | 桌面 / capability | DOM 14 项；`lab-desktop.png` | 3 | pass | 已完成 |
| 1 | 真实本地演示预览 | 桌面 / iframe active | 14/14 HTTP 200；Editor/Voxel/Game iframe 实际加载 | 5 | pass | 已完成 |
| 2 | 技术扩展路线 | 桌面 / extensions | 5 条路线均含输入、落点、下一建设与验收 | 3 | pass | 已完成 |
| 2 | 路线与现有证据联动 | 桌面 / extension selected | Export 路线切换至 Voxel Lab；`lab-extension.png` | 5 | pass | 已完成 |
| 3 | 使用场景分析 | 桌面 / scenarios | 4 个场景均含价值、边界和三步骤 | 3 | pass | 已完成 |
| 3 | 分步场景演示 | 桌面 / scenario steps | 装备生态从 Items 切换至 Kindergrimm；`lab-scenario.png` | 5 | pass | 已完成 |
| 全部 | 键盘与焦点可见 | keyboard | ArrowRight 移动 tab；active/selected 同为 extensions；outline solid | 7 | pass | 已完成 |
| 全部 | 移动端适配 | 390px viewport | scrollWidth = 390；舞台高 490；`lab-mobile.png` | 7 | pass | 已完成 |
| 全部 | reduced motion | CSS fallback | matchMedia = true；动画 0.000001s；scroll-behavior auto | 8 | pass | 已完成 |
| 全部 | 本地复现 | PowerShell / README | 默认 `lab.ps1` 启动 8881；入口 HTTP 200 | 9 | pass | 已完成 |

## Design direction

| 决策 | 方向 | 可观察约束 | 验收标准 |
| --- | --- | --- | --- |
| 构图 | 控制台 + 持久演示舞台 | 舞台占据桌面首屏主要面积 | 首屏即可选择并操作演示 |
| 层级 | 三个用户目标为一级导航 | 不把路线图埋在长文后方 | 任一目标一次点击到达 |
| 色彩 | 深色研究台 + 纸张暖色强调 | 状态不只依赖颜色 | 选中项同时有边框、标记和文本 |
| 动效 | 只解释状态切换 | 尊重 reduced-motion | 禁用后不影响信息与操作 |
| 内容 | 已有 / 推断 / 待建严格分层 | 不将路线图包装成当前能力 | 每张扩展卡明确“下一建设” |

