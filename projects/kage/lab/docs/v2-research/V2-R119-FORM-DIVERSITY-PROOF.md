# V2 R119 · 页面形态去惯性与非工作台证明

## Design Contract

```text
Entry mode: Revision-led
Request revision: R119
Target user and context: 输入品牌、叙事、发布或文化类想法，希望得到主题专属、动态且有记忆点的优秀网页，而不是默认参数工作台的用户。
Desired first impression: 页面先像一本会呼吸的实验性杂志，再自然暴露阅读、探索和最终行动；不能先看到通用侧栏、滑杆和指标。
Visual ambition: Immersive
Experience architecture: Editorial Flow
Visual constraints: 不禁用工作台；页面形态必须服从内容。当前证明案例不使用持久参数面板、滑杆、实时指标簇或“保存方案”式行动。
Information constraints: 主题、阅读顺序和最终行动在无增强层时仍可理解；交互不可替代核心内容。
Operation constraints: 滚动承担叙事推进，指针只承担气味痕迹揭示；390px 仍可完成阅读与行动。
State constraints: opening、mid-scroll、core-action、mobile、reduced-motion、canvas-fallback 均可观察。
Environment constraints: 保留现有 V1、工作台、生成链、案例库和 R118；使用现有 Vite/TypeScript/CSS/Canvas，不接后台模型或新供应商。
Primary journey: 进入气味档案开场 → 滚动穿过三组气味记忆 → 指针揭示局部痕迹 → 进入本月气味档案。
User-defined phases: 模板惯性诊断 → 决策层修复 → 非工作台证明 → 浏览器验收与阶段结论。
Required artifacts: 页面形态决策字段、模板惯性诊断与测试、R119 delivery、浏览器证据、阶段记录。
Autonomy authorization: 用户已明确要求继续，并要求按小目标持续推进；本阶段内可自主做可逆实现和验证。
User-decision boundary: 不修改旧案例，不批量重做案例库，不建设后台 Codex 接入，不引入新供应商。
Observable completion criteria: 品牌/叙事 brief 得到非持久控件的编辑叙事形态；参数工具仍可得到直接工作台；重复骨架只产生 advisory 诊断；R119 页面无持久参数面板并通过桌面、滚动中段、行动、390px、reduced-motion 与 fallback 验收。
Coverage record: 见下表。
```

## 方向表

| 决策 | 选择 | 可观察约束 | 验收标准 |
| --- | --- | --- | --- |
| 页面形态 | Editorial narrative | 正常文档流与非均匀全幅章节 | 无固定右侧工作台骨架 |
| 控件可见度 | none / contextual | 只在内容需要时出现局部操作 | 无滑杆、指标簇和持久面板 |
| 动态 | scroll + ambient pointer | 滚动改变同一气味场的层次，指针揭示痕迹 | 输入前后有可见但不干扰阅读的变化 |
| 主视觉 | 真实档案环境 + 纸纤维/墨迹 Canvas | 图片承担场所，程序层承担气味扩散 | 图片不是矩形贴图，Canvas 失败仍可读 |
| 移动端 | 单列编辑流 | 不把桌面画面裁成一小块 | 390px 无横向溢出且 CTA 可达 |

## Coverage Manifest

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 模板惯性诊断 | 识别宏观骨架重复但不强制轮换 | recent deliveries | `v2-macro-skeleton-inertia.test.ts` | 0–1 | pass | closed |
| 决策层修复 | 内容适配的形态、控件可见度、交互方式进入作者包 | contract / author package | `v2-style-diversity`、`v2-direct-creative-*` 单测 | 1–3 | pass | closed |
| 非工作台证明 | 气味档案编辑叙事页面 | desktop opening / mid / action | R119 E2E、固定 bundle 身份测试 | 2–6 | pass | closed |
| 跨端 | 手机、reduced-motion、Canvas fallback 可用 | 390px / media / fallback | R119 E2E 第四场景 | 7–8 | pass | closed |
| 阶段结论 | 记录已完成、未扩展边界与下一目标 | docs / V2 index | V2 第 11 个已验证示例、生产构建 | 9 | pass | closed |

## 执行边界

- 一个非工作台方向。
- 一次现有素材批次，不重新生成图片。
- 一次完整构建，最多两次确定性修复，最多一次视觉精修。
- 不修改 R118，不批量重做旧案例，不把“近期重复”变成风格硬禁令。

## 阶段结果

- Exact brief 编译身份：`contract-1m4cpsk` → `direct-2ixs32`。
- 页面形态：`editorial-evidence / editorial-narrative / control none / scroll`；`街区` 不再在没有地点决策信号时误触发地图工作台。
- 最终 bundle：`ce0c602f0a6a0d5ada92247e8cc5f25c8e3bdffbaf4d02e8d5f7369dfbcb8124`，由 `index.html + style.css + main.ts` 有序计算；源码变化后证据测试立即失效。
- 浏览器证据：桌面开场、真实中段滚动与指针变化、最终行动、390px + reduced-motion + Canvas fallback 共 4/4 通过；V2 示例入口与 11 张封面回归共 4/4 通过。
- 工程证据：21 个相关单测通过，`tsc --noEmit` 通过，`build:pages` 通过。
- 视觉结论：R119 使用全幅环境、非均匀编辑章节、滚动节奏和局部 Canvas 痕迹；不包含持久参数面板、滑杆、实时指标簇或“保存配置”式行动。

## 停止结论

本阶段已关闭。工作台仍保留给真实参数工具；编辑、品牌、叙事、空间与趣味互动页面由内容选择宏观形态。下一阶段应验证一个新的非编辑、非工作台主题是否也能选择不同结构，而不是继续精修 R119 或批量重做旧案例。
