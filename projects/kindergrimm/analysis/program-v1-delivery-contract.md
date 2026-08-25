# Kindergrimm Program v1：架构驱动升级交付合同

## Design contract

```text
Entry mode: Revision-led / goal-driven direct implementation
Request revision: R9 — 从连续对话式实验切换为宏观目标、分层架构、阶段门槛和证据驱动交付
Target user and context: 需要持续建设自有程序化游戏资产能力的产品、技术美术、前端与运行时团队
Desired first impression: 一眼知道最终目标、已完成能力、当前阶段、下一依赖和完成判据
Visual ambition: Editorial
Experience architecture: Editorial Flow
Visual constraints: 保留现有深色研究站、14 项能力证据与本地演示入口；架构状态不只依赖颜色
Information constraints: 严格区分上游能力、研究扩展、自有能力、计划能力和生产边界
Operation constraints: 当前阶段不引入后端、账号、远程 API、训练模型或新增运行依赖
State constraints: done / active / next / planned；每个阶段必须有输入、产物、门槛和证据
Environment constraints: 研究站支持 file URL；交互工厂使用 canonical HTTP :8882；桌面与 390px 手机；dark-only boundary
Primary journey: 打开研究站 → 理解 North Star → 阅读目标架构与阶段 → 识别当前/下一里程碑 → 进入对应本地工具或文档
User-defined phases:
  1. 定制完整宏观目标
  2. 按前端、架构、扩展、审查等架构级进行分析和汇总
  3. 以架构和依赖为基础依次推进实现效果
  4. 用目标、阶段门槛和证据取代对话式推进
Required artifacts:
  - Program v1 主计划（North Star、目标架构、工作流、阶段、门槛、非目标）
  - 当前能力到目标能力的差距矩阵
  - 前端 / 核心契约 / 渲染扩展 / 运行时 / 审查发布五条工作流
  - 研究站中的可见架构推进台
  - README 中的单一计划入口、当前阶段和下一阶段
  - 桌面与 390px 浏览器证据
Autonomy authorization: 用户明确要求“分析，汇总，推进”，并要求不再对话式逐项确认；允许范围内可逆实现与验证
User-decision boundary: 商业题材与最终品牌视觉定稿、真实后端/账号/云服务、训练或付费模型、独立 3D 产品线投资
Observable completion criteria:
  - North Star 能用一句话定义输入、核心、输出和应用价值
  - 架构层之间的责任、数据合同和依赖方向明确，前端不拥有领域事实
  - 路线图每阶段都有退出门槛；当前阶段和下一阶段唯一
  - 研究站首屏后即可看到宏观目标、当前状态和架构流水线
  - README、主计划、研究站三者阶段状态一致
  - 1440×900 与 390×844 无横向溢出；新入口键盘可达；无页面错误
Coverage record: 见下表
```

## Architecture decision

```text
Selected asset route: deterministic hybrid 2D-first platform
Current evidence branch: Kindergrimm Recipe + CanvasTexture rig + Mosslight v0.6 content pack + Manifest/ZIP + three runtime scenes
Primary v1 output: independent visual-language 2D Content Pack and portable runtime asset bundle
Separate future branch: Voxel / Gloss / glTF 3D backend; it does not block 2D v1
AI position: optional intent-to-valid-Recipe adapter after deterministic contracts; never the core renderer
```

## Revised design direction

| 决策 | 选择 | 可观察约束 | 验收 |
| --- | --- | --- | --- |
| 信息层级 | North Star → 当前状态 → 架构流水线 → 阶段路线 | Program 信息出现在全量演示之前 | 首次阅读无需滚到底部才知道下一步 |
| 构图 | 一张目标声明 + 六层流水线 + 阶段卡片 | 不复制完整主计划；只展示决策所需摘要 | 桌面为横向层级，移动为自然纵向 |
| 状态 | DONE / ACTIVE / NEXT / PLANNED 文本和形态同时区分 | 不只依赖颜色；只有一个 ACTIVE 和 NEXT | DOM 状态数量符合 Program |
| 操作 | Program 文档、NPC 工厂和运行场景为明确出口 | 新区域不增加虚假执行按钮 | 每个出口指向真实文件或 canonical URL |
| 动效 | 只保留既有轻量 hover；状态本身静态 | reduced-motion 不丢失信息 | reduce 下无非必要过渡 |
| 响应式 | 920px 以下减少列数，640px 以下单列 | code、长标签和 URL 可换行 | 390px 无横向溢出 |

## Coverage manifest

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 所需证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | North Star、成功标准、非目标 | 主计划 / goal lock | PROGRAM.md：North Star、8 项成功定义、5 项非目标 | 0 | pass | — |
| 2 | 五层目标架构与依赖方向 | 主计划 / architecture | 六层架构、7 条依赖规则、7 项差距矩阵 | 0 | pass | — |
| 2 | 五条工作流和审查门槛 | 主计划 / governance | 六条工作流、M0–M8、G0–G7 release gates | 0 | pass | — |
| 3 | 可见架构推进台 | 研究站 / default | 浏览器：6 layers、7 milestones、1 ACTIVE M2、1 NEXT M3 | 2/3 | pass | — |
| 4 | 单一状态入口 | README / current | PROGRAM、README、研究站均为 M2 ACTIVE / M3 NEXT | 9 | pass | — |
| 全部 | 桌面信息层级 | 1440×900 / dark | #program 标题 top 136px；6 层与状态完整；无横向溢出 | 2/3 | pass | — |
| 全部 | 移动端布局 | 390×844 / dark | scrollWidth 375 / viewport 390；架构与路线单列；ACTIVE 可见 | 7 | pass | — |
| 全部 | 键盘与 reduced motion | keyboard / reduce | Tab 聚焦“架构推进”；2px solid outline；Enter 到 #program；transition 0s | 7/8 | pass | — |
| 全部 | 工程与交付一致性 | files / canonical | 4 产物存在；NPC Factory HTTP 200；浏览器 0 page errors | 9 | pass | — |

## Scope boundary

R9 交付“宏观目标与架构推进系统”，不把未来阶段伪装为本轮已完成。完整 2D Content Pack、契约核心重构和生产工厂升级由主计划排入后续里程碑；它们是持续目标的下一阶段，不是 R9 的未完成返工。


## Final delivery record

- Status: pass — R9 Architecture Lock delivered.
- Program state: M0 Evidence DONE；M1 Architecture DONE；M2 Contract Core ACTIVE；M3 Independent 2D Pack NEXT。
- Desktop: Chromium 1440×900，Program 标题、6 层架构、7 个里程碑、唯一 ACTIVE/NEXT 均可见，无横向溢出。
- Mobile: Chromium 390×844，scrollWidth 375，架构和路线单列，无横向溢出。
- Keyboard: Tab 可聚焦“架构推进”，2px solid focus，Enter 到 #program。
- Motion/errors: reduced-motion 下相关 transition 0s；页面错误为空。
- Canonical runtime: NPC Factory 8882 返回 HTTP 200。
- Evidence boundary: 本轮只完成宏观目标与推进系统；持续目标现进入 M2，不把 M3–M8 计划项包装为 R9 未完成项。