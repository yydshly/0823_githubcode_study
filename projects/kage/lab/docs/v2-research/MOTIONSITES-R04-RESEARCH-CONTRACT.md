# R04 · MotionSites 研究系统交付契约

## Design Contract

```text
Entry mode: Revision-led implementation
Request revision: R04 — 从单能力验证扩展为完整参考研究系统
Target user and context: Kage 项目维护者，需要知道研究覆盖、证据强度、原理沉淀和能力转化状态
Desired first impression: 这是一个可持续研究系统，不是案例缩略图收藏夹
Visual ambition: Editorial
Experience architecture: Editorial Flow
Visual constraints: 研究信息优先；低装饰；保持 V2 现有浅色编辑系统；不复制外部案例视觉
Information constraints: 案例、原理、能力、融合配方四层必须分离；所有结论带证据等级
Operation constraints: 支持按分类、证据和能力簇筛选；支持查看案例详情与融合边界
State constraints: 全部、筛选结果、空结果、选中详情、移动端都必须可理解
Environment constraints: 本地 Vite 与 GitHub Pages；公开数据；无登录、无付费内容抓取
Primary journey: 查看研究覆盖 -> 筛选案例 -> 阅读证据 -> 查看原理原子 -> 查看创意融合 -> 回到 V2 Composer
User-defined phases: MotionSites 研究 -> 原理沉淀 -> 能力融合 -> 后续生成复用
Required artifacts: 数据结构、首批案例、原理原子、融合规则、独立研究页、测试、Pages 构建
Autonomy authorization: 用户明确要求“请开始继续”
User-decision boundary: 付费内容授权、外部登录和复制受限素材不在本轮范围
Observable completion criteria: 页面可运行；首批案例可筛选；证据不越级；融合配方显示来源、互补点和冲突；桌面/移动端通过；构建通过
```

## Coverage Manifest

| 用户阶段 | 要求或产物 | 页面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| MotionSites 研究 | 首批公开案例结构化 | 数据层 | 单元测试 | 3 | done | 34 / 462 条首批样本已建模 |
| 原理沉淀 | 原理原子有来源和证据边界 | 数据层 | 单元测试 | 3 | done | 13 个原理按 E1–E4 分层 |
| 能力融合 | 互补组合与冲突拒绝 | 数据层 / 融合状态 | 单元测试 | 5 | done | 四个组合与冲突检查通过 |
| 可见研究 | 覆盖、筛选和详情可操作 | 桌面 1440px | 浏览器截图与交互 | 2–6 | done | 独立研究页专项通过 |
| 可见研究 | 阅读顺序和筛选适配 | 移动 390px | 浏览器截图与溢出检查 | 7 | done | 无横向溢出 |
| 发布 | V2 与研究页互链并进入 Pages | 构建产物 | build:pages | 9 | done | Pages 产物已生成，等待随项目提交发布 |

## 本轮证据边界

- E1：公开目录标题、分类、热度或作者；只能作为研究目标和方向信号。
- E2：公开教程描述通用实现路线；可以形成候选原理，不能声称具体案例已验证。
- E3：公开完整提示词或实现规格；可以提取可执行契约。
- E4：Kage 本地原型、浏览器证据和测试通过；可以进入正式能力目录。

本轮不会把 E1 缩略图推断升级为技术结论，也不会复制 MotionSites 的视觉素材或受限提示词。

完成记录与下一单元见 [R05 首批研究沉淀与创意组合](./MOTIONSITES-R05-FIRST-BATCH-SYNTHESIS.md)。
