# Nanobrowser

> 对 [nanobrowser/nanobrowser](https://github.com/nanobrowser/nanobrowser) 的轻量源码评估：说明它能做什么、如何工作、能为 Agent 工程提供哪些参考，以及为什么当前没有继续深入研究的必要。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | [nanobrowser/nanobrowser](https://github.com/nanobrowser/nanobrowser) |
| 研究基线 | `v0.1.13`，并参考 2026-08-26 前的 `master` 源码、Issue 与 Roadmap |
| 研究方式 | README、架构与关键源码阅读；未进行本地运行和成功率基准测试 |
| 当前状态 | 已完成轻量评估，暂时归档 |
| 上游许可证 | Apache License 2.0 |

## 核心结论

Nanobrowser 是一个运行在 Chrome/Edge 中的开源浏览器 Agent。它将当前浏览器包装为一组受约束的动作，让大模型根据自然语言目标选择动作，再由本地 TypeScript、Chrome API 和 Puppeteer 代码执行。

它没有提出新的 Agent 算法，主要组合了已有的工程模式：

- DOM 状态压缩与交互元素索引；
- LLM Tool Calling、Zod 和 JSON Schema；
- Planner、Navigator 与 Executor 分层；
- Observe–Think–Act 反馈循环；
- 最大步数、失败重试和终止条件；
- 历史动作保存与启发式重放；
- Prompt Injection 内容标记与正则清洗；
- 多模型路由和侧边栏实时状态展示。

因此，它对我们的主要意义是一个**浏览器 Agent 工程案例**，而不是前沿 Agent 技术。理解核心链路即可，没有必要投入大量时间完整部署或长期研究。

## 能力边界

### 可以完成的任务

- 接收自然语言描述的多步骤网页任务；
- 搜索、访问 URL、前进和返回；
- 点击元素、输入文本和发送键盘按键；
- 页面或局部容器滚动、定位文本；
- 读取和选择原生下拉选项；
- 打开、关闭和切换标签页；
- 跨页面收集并缓存信息；
- 根据动作结果和错误调整下一步；
- 暂停、恢复、取消和继续任务；
- 在配置开启时保存并尝试重放历史任务；
- 为 Planner 与 Navigator 配置不同模型；
- 在侧边栏展示规划、动作、成功、失败和完成状态。

典型场景包括网页调研、商品比较、信息搜集、低风险重复录入、人工在回路的运营辅助和浏览器 Agent 原型验证。

### 不适合作为默认方案的任务

- 高吞吐、强确定性的批量采集；
- 对成功率、时延或成本有严格 SLA 的核心流程；
- 无人监督的支付、删除、发送和公开发布；
- 验证码、强反自动化和频繁登录验证的网站；
- Canvas、复杂 iframe、Shadow DOM、富文本编辑器等难以稳定转换为 DOM 状态的应用；
- 能够直接使用 Playwright、API 或普通脚本稳定解决的固定流程。

## 工作原理

```text
用户任务
  ↓
Side Panel 将任务交给后台 Executor
  ↓
BrowserContext 读取当前标签页、精简 DOM、交互元素索引和可选截图
  ↓
Planner 判断整体进度、困难、下一步和是否完成
  ↓
Navigator 根据当前状态输出结构化 Action
  ↓
ActionRegistry 找到动作实现，代码控制浏览器执行
  ↓
ActionResult 将结果或错误写回上下文
  ↓
读取新的网页状态并继续循环，直到完成或触发终止条件
```

三个核心角色的边界如下：

| 组件 | 职责 | 不负责什么 |
| --- | --- | --- |
| Planner | 检查任务、观察进度、给出下一步、验证是否完成 | 不直接点击网页 |
| Navigator | 根据当前网页状态选择一个或多个具体动作 | 不管理整个任务生命周期 |
| Executor | 调度 Planner/Navigator，维护步骤、失败、暂停和终止状态 | 不替代模型理解开放式任务 |

这不是复杂的并行多 Agent 系统，更接近两个模型角色组成的串行状态机。

## 九个 Agent 工程问题

### 1. 如何把网页转换为模型可理解的状态

`BrowserContext` 和 `Page` 读取当前 URL、标题、标签页、可见文本、精简 DOM、可交互元素及可选截图。每个可交互元素获得一个索引，模型看到的状态类似：

```text
[12] <input placeholder="Search">
[13] <button>Search</button>
[14] <a>React Tutorial</a>
```

模型只需要引用索引，不必自己生成 CSS Selector 或任意 JavaScript。这个设计说明 Agent 不应直接面对完整环境，而应先获得压缩、结构化、与任务相关的观察状态。

相关源码：[BrowserContext](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/browser/context.ts)、[browser/dom](https://github.com/nanobrowser/nanobrowser/tree/master/chrome-extension/src/background/browser/dom)。

### 2. 如何用 Action Schema 约束模型输出

每个动作具有固定名称、说明和 Zod 参数结构，随后被动态转换为 JSON Schema。Navigator 应输出可以校验的 JSON，而不是自然语言建议：

```json
{
  "action": [
    {
      "input_text": {
        "index": 12,
        "text": "browser agent"
      }
    },
    {
      "send_keys": {
        "keys": "ENTER"
      }
    }
  ]
}
```

这样可以限制模型能力、提前验证参数，并让动作可执行、可记录、可重试和可审计。模型仍可能输出不合法 JSON，因此代码中还保留了手动解析和修复路径。

相关源码：[ActionBuilder](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/actions/builder.ts)、[Action schemas](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/actions/schemas.ts)、[Navigator](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/agents/navigator.ts)。

### 3. 如何实现 Planner 与 Executor/Navigator 分离

Executor 创建 Planner 和 Navigator，并按 `planningInterval` 周期调用 Planner；Navigator 报告完成时，也要再由 Planner 验证。Planner 输出观察、困难、下一步、完成状态和最终答案，Navigator 输出当前状态与动作数组。

这种分工降低了单个提示词同时承担长期规划、页面理解和动作执行的复杂度，但本质上仍是固定角色编排，并不是新的规划算法。

相关源码：[Executor](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/executor.ts)、[Planner](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/agents/planner.ts)。

### 4. 如何把动作结果和错误重新放回上下文

动作返回 `ActionResult`，其中包含提取内容、错误、是否完成、是否写入记忆和被操作元素等信息。Navigator 在下一步前把需要保留的结果和错误加入消息历史：

```text
动作 → ActionResult → 消息上下文 → 新网页状态 → 下一次模型判断
```

这构成了 Agent 的反馈闭环。没有结果回流，系统只是一系列彼此无关的模型调用。

### 5. 如何设置最大步数、连续失败和任务终止条件

Executor 使用代码而不是模型维护运行边界，包括：

- `maxSteps`：任务最大步骤数；
- `maxFailures`：最大连续失败数；
- `planningInterval`：Planner 调用间隔；
- `maxActionsPerStep`：单轮允许的最大动作数；
- 暂停、恢复、停止和取消状态；
- Navigator 完成信号与 Planner 最终确认。

任务会在 Planner 确认完成、达到最大步骤、连续失败过多或用户取消时停止。关键原则是：模型负责提出行动，程序负责限制资源和生命周期。

### 6. 如何保存成功历史并尝试重放

启用 `replayHistoricalTasks` 后，系统保存每一步的模型动作、动作结果、浏览器状态和被操作元素。重放时不会只复用旧索引，而会尝试根据历史元素特征在新 DOM 中寻找对应元素，再更新动作索引。

这比坐标录制更能适应小幅页面变化，但仍然是启发式匹配。页面结构、文本或业务流程发生较大变化时，重放仍会失败。

更值得采用的长期方向是：首次由 Agent 探索，成功后编译为确定性工作流；普通执行使用脚本，失败时才调用 Agent 修复。

### 7. 如何给不同角色配置不同模型

Executor 接收 Navigator、Planner 和内容提取模型配置；未单独配置时可以复用同一模型。典型策略是用较强模型承担低频规划，用便宜、快速的模型承担高频页面操作。

这体现了 Agent 系统中的模型路由思想：按照角色的推理、视觉、上下文和调用频率需求选择模型，而不是让最昂贵的模型处理所有步骤。

### 8. 如何把 Agent 状态实时展示给用户

Planner、Navigator、Action 和 Executor 会发送 `TASK_START`、`STEP_START`、`ACT_START`、`ACT_OK`、`ACT_FAIL`、`TASK_PAUSE`、`TASK_CANCEL`、`TASK_OK` 等事件。侧边栏订阅事件并展示当前进度。

这解决了 Agent 长时间执行时的黑盒问题，但仍不等于完整生产可观测性。生产系统还需要记录模型输入输出、Token、成本、耗时、截图、重试和失败分类。

相关源码：[agent/event](https://github.com/nanobrowser/nanobrowser/tree/master/chrome-extension/src/background/agent/event)、[Side Panel](https://github.com/nanobrowser/nanobrowser/tree/master/pages/side-panel)。

### 9. 如何处理网页 Prompt Injection 和高权限环境

项目将网页内容包装为不可信内容，并使用正则识别任务覆盖、系统提示引用、可疑标签和部分敏感数据。浏览器上下文还支持允许与禁止 URL。

这些措施只能降低风险，不能提供可靠安全保证。扩展仍申请 `<all_urls>`、`debugger`、`scripting`、`tabs`、`storage` 和 `webNavigation` 等高权限；使用云模型时，HTML 和截图还会直接发送到用户选择的模型服务商。

生产化仍需补充最小权限、域名白名单、敏感信息隔离、高风险动作人工确认、独立动作 Verifier 和完整审计记录。

相关源码：[Guardrail patterns](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/services/guardrails/patterns.ts)、[Manifest](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/manifest.js)、[Privacy Policy](https://github.com/nanobrowser/nanobrowser/blob/master/PRIVACY.md)。

## 对我们的研究意义

| 方向 | 参考价值 | 原因 |
| --- | --- | --- |
| 浏览器 Agent | 高 | 提供了较完整的页面状态、动作执行和反馈闭环 |
| Agent 工程闭环 | 高 | 能看到 Schema、调度、错误回流、终止和 UI 如何组合 |
| 通用 Agent 架构 | 中 | 设计可以迁移，但工具和环境高度绑定浏览器 |
| 多 Agent 协作 | 较低 | 主要是 Planner/Navigator 串行分工 |
| Agent 理论或新算法 | 低 | 没有新的学习、规划、记忆或验证算法 |
| 生产可靠性 | 作为反例和改进题有价值 | 不确定性、成本、安全和网页兼容性问题明显 |

建议只保留四个核心认识：

1. 复杂环境需要先转换成紧凑、结构化的观察状态；
2. 模型只能从受约束的 Action Schema 中选择动作；
3. 动作结果和错误必须回流，形成可停止的反馈闭环；
4. 权限、预算、失败和终止条件必须由确定性代码控制。

如果未来需要实现网页自动化，应优先考虑“确定性脚本 + 局部 AI 增强”：Playwright 或 API 执行固定流程，模型只负责非结构化内容理解、路径探索和异常恢复。

## 限制与风险

- Planner 与 Navigator 都可能产生额外模型调用，DOM、历史和截图会增加 Token、延迟和费用；
- 每一步都依赖模型判断和动态网页状态，成功率难以像固定脚本一样保证；
- 当前动作后仍存在固定等待，既增加延迟，也不能保证慢页面已经稳定；
- 结构化输出仍受模型和供应商兼容性影响；
- 历史重放依赖 DOM 元素启发式匹配，不是稳定的程序重放；
- 默认浏览器权限范围较大，不应直接用于高风险账号和不可逆操作；
- “本地运行”主要指编排和浏览器执行；远程模型仍会接收相关网页数据；
- 本次没有运行真实任务，因此没有对成功率、成本和兼容性作实验性结论。

## 最小阅读路径

若只想理解其 Agent 实现，按以下顺序阅读即可：

1. [README](https://github.com/nanobrowser/nanobrowser#readme)：产品定位与支持范围；
2. [executor.ts](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/executor.ts)：完整主循环；
3. [navigator.ts](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/agents/navigator.ts)：状态、结构化输出、动作执行和反馈；
4. [builder.ts](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/actions/builder.ts)：浏览器动作定义；
5. [context.ts](https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/browser/context.ts)：浏览器和标签页状态；
6. [guardrails](https://github.com/nanobrowser/nanobrowser/tree/master/chrome-extension/src/background/services/guardrails)：不可信内容处理及其边界。

## 研究决定

本项目完成轻量理解后暂时归档：

- 不克隆上游源码为子模块；
- 不进行完整环境搭建；
- 不开展模型成功率与成本测试；
- 不把它作为通用 Agent 框架或生产自动化底座；
- 未来仅在出现明确的浏览器 Agent、网页操作助手或混合自动化需求时重新评估。

## 参考资料与许可证

- [上游仓库](https://github.com/nanobrowser/nanobrowser)
- [Releases](https://github.com/nanobrowser/nanobrowser/releases)
- [Roadmap](https://github.com/nanobrowser/nanobrowser/discussions/85)
- [Security Policy](https://github.com/nanobrowser/nanobrowser/blob/master/SECURITY.md)
- [Privacy Policy](https://github.com/nanobrowser/nanobrowser/blob/master/PRIVACY.md)
- 上游采用 [Apache License 2.0](https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE)。本文仅记录源码阅读结论，不复制上游实现。
