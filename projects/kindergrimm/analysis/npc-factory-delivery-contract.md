# NPC Asset Factory v0.1：交付合同

## Routing

```text
Selected pattern: Product prototype / character-driven asset factory
Evidence branch: Kindergrimm Drawn 2D recipe → Canvas parts → Three.js composition
Required inputs: 固定上游提交、现有四物种与六媒介、浏览器下载能力
Expected output: 批量生成、选择、收藏、Recipe JSON 与透明 PNG 导出的新工作流
What should update the skill: 无；先沉淀项目证据
```

## Design contract

```text
Entry mode: Brief-led / direct implementation
Request revision: R2 — 从能力研究进入第一个新生产能力原型
Target user and context: 需要批量生产游戏 NPC 的美术、策划和技术人员
Desired first impression: 这是一个真实资产工厂，而不是原始编辑器的包装或截图墙
Visual ambition: Functional + Editorial
Experience architecture: Hybrid Workspace
Visual constraints: 延续深色研究工作台；生成的手绘 NPC 是视觉主体；状态不只依赖颜色
Information constraints: 明确标注上游现有能力、本轮新增工作流、生产边界和“无运行时大模型”
Operation constraints: 静态浏览器应用；不改上游；不引入依赖、后台、账号或远程 API
State constraints: 初始、生成中、批次完成、选中、收藏、导出成功、WebGL 不可用回退
Environment constraints: 通过根目录 HTTP 服务；桌面优先；390px 移动端可完成主流程；深色主题
Primary journey: 设置 Seed/数量/物种/媒介 → 批量生成真实 NPC → 选择与收藏 → 导出 JSON/PNG
User-defined phases:
  1. 确定并继续建设新能力
  2. 说明实现原理、是否使用大模型以及如何驱动
Required artifacts:
  - NPC Asset Factory 可运行页面
  - 真实上游生成器批量调用
  - 确定性批次、唯一性指标和收藏状态
  - 单角色 Recipe JSON 与透明 PNG 导出
  - 原理说明与无大模型证据
  - 启动说明和浏览器证据
Autonomy authorization: 用户明确“确定并继续”
User-decision boundary: 自有视觉风格、后台资产库、正式 SDK、glTF 和 AI Recipe 适配不在 v0.1
Observable completion criteria:
  - 固定相同输入重复生成时，全部 Recipe 指纹顺序一致
  - 8/12/24 批量选项可用，角色来自上游 buildCharacter
  - 选择、收藏、JSON 下载、PNG 下载均有可见反馈
  - 页面明确展示驱动链路并说明运行时 LLM/API 调用为 0
  - 桌面和 390px 移动端无横向溢出，主要操作键盘可达
Coverage record: 见下表
```

## Hybrid workspace

```text
Scene: 中部批量 NPC 资产网格
Scene operations: 选择、筛选、收藏和比较生成结果
Detail flow: 左侧生成参数，右侧单资产 Inspector 与导出操作
Mobile transformation: 参数 → 网格 → Inspector 单列顺序；不依赖抽屉才能完成主流程
Fallback: WebGL 失败时仍生成 Recipe 卡片并允许 JSON 导出，PNG 明确禁用
```

## Coverage manifest

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 真实上游批量生成 | desktop / populated | 12 张真实 NPC 图；12/12 唯一；`npc-factory-v02-desktop.png` | 5 | pass | 完成 |
| 1 | 确定性批次 | repeated input | 默认 12/12、固定 dog + graphite 8/8 指纹顺序一致 | 6 | pass | 完成 |
| 1 | 选择与收藏 | selected / saved | 键盘选中 NPC 03；收藏计数 0→1；收藏筛选保留 1 项 | 5 | pass | 完成 |
| 1 | Recipe JSON 导出 | selected / export | 生成 `npc-9b8ee20e.json`；manifest 含 schema、commit、20 parts、LLM=0 | 5 | pass | 完成 |
| 1 | 透明 PNG 导出 | selected / export | 1024×1024 PNG；`image/png`；角像素 alpha=0 | 5 | pass | 完成 |
| 2 | 原理说明 | explanation | 页面六步驱动链路；`analysis/generator-principles.md` | 3 | pass | 完成 |
| 2 | 无运行时大模型结论 | explanation | 扫描 152 个 JS/HTML/JSON/MD 文件；页面标注 LLM/API=0 | 3 | pass | 完成 |
| 全部 | 键盘与焦点 | keyboard | 资产卡是 button；Enter 将选中项从 NPC 01 切至 NPC 03；全局 `:focus-visible` | 7 | pass | 完成 |
| 全部 | 移动端 | 390×844 | 12 张预览；无横向溢出；`npc-factory-v02-mobile.png` | 7 | pass | 完成 |
| 全部 | reduced motion / fallback | emulation | 动画降至 1e-06s；关闭 WebGL 时 12 Recipe、12 占位、JSON 可用、PNG 禁用 | 8 | pass | 完成 |
| 全部 | 本地复现 | HTTP / README | `scripts/npc-factory.ps1`；默认 8882；页面 HTTP 200 | 9 | pass | 完成 |

## Design direction

| 决策 | 方向 | 验收 |
| --- | --- | --- |
| 构图 | 参数 / 资产网格 / Inspector 三栏 | 首屏同时看到输入、结果和单资产出口 |
| 主操作 | “生成批次”唯一强主按钮 | 不阅读说明也能启动主流程 |
| 资产状态 | 选中使用边框、编号和 Inspector 同步 | 不只依赖颜色 |
| 原理教育 | 用六步链路和“LLM/API = 0”证明 | 不将规则生成描述成 AI 生成 |
| 动效 | 仅用于生成进度与选择反馈 | reduced-motion 下不损失信息 |

