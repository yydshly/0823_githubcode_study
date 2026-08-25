# Reverse Skill：AI 安全技能架构与知识地图

> 研究 `reverse-skill` 如何把逆向与网络安全知识组织成可路由、可执行、可审查的 AI Skill 系统；本阶段只研究架构和知识地图，不安装安全工具，也不对目标执行安全操作。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) |
| 研究版本 | `66cd74c997344d5ed5509fb2561dba0e44be176e`（2026-08-23） |
| 开始日期 | 2026-08-24 |
| 当前状态 | 本阶段完成：架构、44 个 Skill 与知识地图已整理；暂不进入工具安装和实战 |
| 在线展示 | [Reverse Skill 架构与知识地图](https://yydshly.github.io/0823_githubcode_study/projects/reverse-skill.html) |

## 推荐阅读路径

不需要从 44 个 Skill 逐个读起，可按目标选择入口：

1. **3 分钟抓住本质**：先读下方“核心结论”和“架构拆解”，理解它为什么不是一件逆向工具。
2. **10 分钟看懂运行方式**：打开[在线架构地图](https://yydshly.github.io/0823_githubcode_study/projects/reverse-skill.html)，依次阅读“系统架构 → Skill 控制”。
3. **按问题查能力**：在网页“Skill 图谱”中搜索对象、技术或工具，查看每个 Skill 的能力、意义与调度时机。
4. **建立专业知识框架**：阅读网页“知识地图”，区分逆向工程、安全业务，以及两者的交集。
5. **准备实际使用时再深入**：只有在具备明确授权、隔离环境和具体任务后，才需要研究工具安装、单项 Skill 操作细节与实战验证。

一句话结论：这个库最值得借鉴的不是某个安全工具，而是如何把专业知识组织成“可路由、可执行、可留证、可审查、可迭代”的 AI 作业系统。

## 研究问题

1. 它是“逆向工具”“Skill 集”还是一个更完整的工作系统？
2. 用户任务如何被路由到 PRIMARY Skill，歧义如何处理？
3. Skill、工具索引、MCP、授权范围、证据链和 field journal 如何协作？
4. 44 个 Skill 分别具有什么能力、系统意义，以及何时被调度？
5. 逆向工程与网络安全是什么关系，各自有哪些核心技术点？
6. 哪些架构思想可以迁移到其他大型专业 Skill 系统？

## 核心结论

`reverse-skill` 的本质不是新的反编译引擎，而是六层 AI 安全作业架构：

```text
意图与授权边界
→ 确定性任务路由
→ 专业 Skill 操作手册
→ 本机工具 / CLI / MCP
→ Case 与 Evidence→Finding→Path
→ 报告、经验回写与回归测试
```

真正执行反编译、动态插桩、抓包和扫描的仍是 jadx、IDA、Frida、Burp、Ghidra 等外部工具。仓库的主要价值在于选择、约束、编排、记录和复用。

## 架构拆解

| 层 | 核心文件或机制 | 解决的问题 |
| --- | --- | --- |
| 意图与边界 | `RULES.md`、`ops/scope-contract.md` | 目标是什么、是否授权、允许做什么 |
| 路由 | `config/routing.json`、`master-route.*` | 当前首先加载哪个 Skill |
| 专业方法 | 各目录 `SKILL.md` | 这个领域应该按什么步骤分析 |
| 工具平面 | `tool-index`、`bootstrap-manifest.json`、MCP | 当前机器实际能调用什么 |
| 案件与证据 | `work/<case>`、`case-review` | 结论能否回溯到命令、文件与观察 |
| 交付与记忆 | docs、diagrams、field journal、routing benchmark | 如何报告、复用并防止规则漂移 |

## 路由原理

路由单一事实源是 `skills/config/routing.json`：

- `must` 命中后把路由加入候选；
- `mustAll` 要求额外上下文全部存在；
- `exclude` 排除容易误判的语境；
- 同一路由多条规则命中会累计分数；
- 最高分为 PRIMARY，同分时按 `priority` 顺序选择；
- 没有强命中时回退 R0 通用逆向。

这是一套可解释、可回归测试的规则路由，不是一个单独训练的语义分类模型。仓库的 173 条用例用于验证“输入提示是否得到预期路由”，不能证明后续安全分析一定正确。

## Skill 能力地图

网页展示以自动生成的 `skills/INDEX.md` 为边界，共整理 44 个索引 Skill，并为每个 Skill 统一记录：

- 能力：可以处理的对象和技术；
- 意义：它在整体系统中的职责；
- 调度：什么目标、语境或工具会触发它。

为便于阅读，本研究把它们归为五组：逆向分析、进攻与验证、检测与取证、平台安全、编排与交付。该分组只是阅读导航，不修改上游 PRIMARY 路由优先级。

## 逆向与网络安全的关系

网络安全是更大的目标空间，研究如何保护资产、身份、数据和业务连续性。逆向工程是在缺少源码或文档时理解已有实现的方法之一。

- 逆向但不一定是安全：兼容旧格式、理解遗留软件、迁移数据；
- 安全但不一定需要逆向：云权限审计、API 越权检查、事件日志调查；
- 二者交集：恶意软件、漏洞研究、客户端安全、固件与协议分析。

## 研究边界

- 不克隆或执行上游 bootstrap；
- 不安装 IDA、Frida、Burp、扫描器或 MCP 服务；
- 不对互联网或其他真实目标发起扫描、Hook、利用或重放；
- 页面只整理公开仓库中的架构、能力说明和安全知识；
- 对仓库规模和安全加固的描述标记为上游自述，不把自身回归测试当作独立质量证明。

## 文件

```text
projects/reverse-skill/
├─ README.md
└─ analysis/
   ├─ design-contract.md
   ├─ coverage.md
   └─ handoff.md              # 浏览器验收后生成

docs/
├─ projects/reverse-skill.html
├─ reverse-skill.css
└─ reverse-skill.js
```

## 主要来源

- [README](https://github.com/zhaoxuya520/reverse-skill)
- [Skill 导航索引](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/INDEX.md)
- [路由单一事实源](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/config/routing.json)
- [PRIMARY 快路径](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/MASTER-ROUTING.md)
- [Scope 契约](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/ops/scope-contract.md)
- [Evidence → Finding → Path](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/ops/evidence-finding-path.md)
- [供应链边界](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/ops/skill-supply-chain.md)
- [安全问题 #32](https://github.com/zhaoxuya520/reverse-skill/issues/32)

## 许可证说明

上游核心以 MIT 发布；`CTF-Sandbox-Orchestrator/` 标注为 GPLv3，调用的第三方工具继续受各自许可证约束。本研究只链接公开资料并编写独立的中文架构解读页面。
