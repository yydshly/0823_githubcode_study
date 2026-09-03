# V2 R19 · 工作台决策与耗时透明度契约

## Design Contract

```text
Entry mode: revision-led implementation
Request revision: R19
Target user and context: 在工作台输入想法、等待唯一最佳网页的创作者；需要理解系统为何这样做以及时间花在哪里
Desired first impression: 当前目标、执行边界、真实进度和可运行结果一眼可辨
Visual ambition: Functional + Editorial
Experience architecture: Hybrid Workspace
Visual constraints: 保留现有暗色工作台；新增信息必须紧凑，不遮挡结果舞台，不制造新的超大标题
Information constraints: 只展示真实合同、任务 history 和实际错误；不得用预计进度冒充完成
Operation constraints: 不增加生成步骤，不调用新模型，不改变“输入想法 → 唯一最佳网页”主流程
State constraints: idle / running / complete / blocked / failed 均能解释当前阶段与恢复信息
Environment constraints: 本地 8143 为规范运行入口；桌面和 390px 窄屏可读
Primary journey: 输入想法 → 看懂选择依据 → 观察四阶段耗时 → 打开最终网页
User-defined phases: V2 研究服务第一目标；只总结优化方案，不做自由生成对比
Required artifacts: 可见决策依据、可见阶段耗时、测试、构建、真实浏览器证据、本研究记录
Autonomy authorization: 用户连续要求“继续”，授权在现有项目内完成可逆实现与验证
User-decision boundary: 不新增外部服务、模型供应商、部署或案例
Observable completion criteria: 工作台显示参考/能力/验收原因；运行任务显示四阶段真实耗时与当前消息；窄屏无溢出；原生成流程保持可用
```

## Coverage

| 用户目标 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 看懂为什么这样选择 | 合同卡 / idle、running、complete | DOM + 截图 | Stage 3 / 6 | pass | 已渲染真实参考、能力和验收依据 |
| 看懂耗时在哪里 | 任务追踪 / running、complete、failed | history 时间差 + DOM | Stage 6 / 8 | pass | 已按任务 history 汇总四阶段实际耗时 |
| 保持工作台体感 | 桌面 + 390px | 浏览器截图与 overflow | Stage 7 | pass | 两种宽度均无横向溢出 |
| 保持工程稳定 | TypeScript + Vitest + Vite | 测试和构建输出 | Stage 9 | pass | 定向回归、构建和浏览器验收均通过 |

## 实现结果

- 工作台在生成前展示参考来源及其相关性、能力选择依据、验收模式和特殊评审触发项。
- 运行任务根据持久化 `job.history` 计算规划、素材、Codex 构建、视觉验收四阶段真实耗时，不使用假进度。
- 完成态明确展示总耗时和最大耗时阶段；运行、阻塞和失败态保留当前阶段与恢复信息。
- 未增加模型调用、生成步骤、外部服务或案例；主流程仍是“输入想法 → 生成唯一最佳网页 → 打开结果”。

## 验收证据

- Vitest：5 个测试文件、15 项测试通过。
- Vite：生产构建通过；仅保留既有扩展名和大 chunk 提示。
- Playwright：2 条真实浏览器流程通过；覆盖生成前边界、键盘操作、持久化完成任务和阶段耗时。
- 桌面 1440×900：显示总耗时 54s、Codex 构建 28s，并识别为当前瓶颈。
- 移动端 390×844：决策依据和执行时序均可读，无横向溢出。
- 规范入口：`http://127.0.0.1:8143/workbench.html`。

当前拥有阶段：Stage 3、6、7、8、9。R19 已收口，不引入额外生成能力。
