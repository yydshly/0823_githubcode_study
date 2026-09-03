# V2 R102 — 植物观察桌真实生成验证

## 设计契约

- Entry mode：brief-led；R101 合同根因修复后的唯一真实交付验证。
- Target user：第一次学习观察植物的儿童与陪伴者。
- Desired first impression：明亮、可动手检查的植物标本桌。
- Visual ambition / architecture：Immersive Hybrid Workspace；完整标本与观察工具持续可见，任务和证据在同一工作区更新。
- Canonical contract：`contract-z5qyz3`；`editorial-field / interactive-field / procedural-field / single-image-hybrid(required=false)`。
- Visual anchor：完整叶片标本 + 可移动放大镜 + 同一标本上的叶脉、含水量和生长阶段证据。
- Primary journey：选择标本 → 拖动/触摸/键盘检查 → 同一主体与证据同步变化 → “开始一次观察”。
- Constraints：纸白、植物绿、柠檬黄、土壤棕；禁止暗色电影感、中央产品、巨型标题、固定三屏、通用网格/圆环/随机线条/粒子。
- Supported surfaces：1440×900、390×844、指针、键盘、reduced-motion、Canvas/增强失败 fallback。
- Autonomy：用户已授权持续按小阶段推进；本轮只创建一个新 Job。
- Stop boundary：一个作者候选、runner 既有一次恢复与一次视觉精修上限；不创建第二候选。只修阻断主题识别、主旅程或移动端完成度的确定性缺陷。
- Completion：机械浏览器门与独立视觉门均通过才标记精选；否则只按证据归档研究或淘汰。

## 提交前合同证据

使用与 Job 完全相同的 brief 直接编译：

- subject：`植物观察标本桌`
- desired feeling：`真实、自然`
- pattern / structure：`editorial-field / interactive-field`
- strategy / scene：`procedural-field / single-image-hybrid(required=false)`
- required asset：仅 `botanical-specimen-field / procedural`
- visual anchor：明确包含完整叶片、放大镜、叶脉、含水量、生长阶段，以及禁止通用网格与圆环。

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 合同 | 提交前合同与本文件一致 | repository | direct compile / tests | 0 | pass | 已锁定 |
| 运行 | 一个 Job 有界终止 | server | `job-aff5e46eb2dec97c` / 1 author / 1 runner refine | 1 | complete | 不创建第二候选 |
| 首屏 | 十秒识别标本桌、放大镜与行动 | 1440×900 | audit / screenshot | 2-3 | pass | 主题锚点成立 |
| 主旅程 | 选择与放大驱动主体和证据 | pointer / keyboard | causal probe / e2e | 4-6 | mechanical-pass / visual-revise | 转为 R103 契约缺口 |
| 手机 | 390px 等价完成且无溢出 | 390×844 | Playwright / task path | 7 | mechanical-pass / visual-revise | R103 强化移动端构图证据 |
| 降级 | reduced-motion 与增强失败仍可用 | reduced / fallback | browser audit | 8 | pass | 已闭合 |
| 工程 | 定向测试、build、console/request | repository/runtime | 51 unit / 2 e2e / build | 9 | pass | 已闭合 |
| 归档 | 最终效果决定精选、研究或淘汰 | cases / V2 | audit 100 / independent 68 | 9 | research-only | 保留运行与研究记录，不进入精选案例库 |

## 唯一运行与确定性修复

- Job：`job-aff5e46eb2dec97c`
- Run：`dedicated-af8bb4f05b56`
- 作者：`gpt-5.6-terra`，`authoringAttempts=1`，没有第二候选。
- Runner 首次探测失败不是主题失败：局部 Canvas 被错误设为完整视口 `1440×900`，覆盖了标本按钮；主控标记也错误落在不可点击的按钮组容器。
- 确定性修复：Canvas 改为父容器尺寸、裁切在标本桌内；标记移到真实按钮；标题上限从 `86px` 收敛到 `64px`。
- 审核基础设施修复：有 causal probe 时不再重复套用数值型 semantic probe；主体截图结束后恢复合同检查点滚动位置，避免终态截图被自动滚回主体区域。

## 验收结果

- `npx vitest run tests/visual-review.test.ts tests/visual-review-plan.test.ts`：`51 passed`。
- `npx playwright test r102-botanical-observation.spec.ts --project=desktop`：`2 passed`，覆盖桌面因果链、键盘移动、390×844、reduced-motion 与最终行动。
- `npm run build`：通过；仅保留既有的大 chunk 提示。
- 机械审核：`pass / 100`，无浏览器错误；桌面 causal anchor delta `4.4%`；移动端 control/result/action 均可达。
- 独立视觉验收：`revise / 68`。主题锚点和结构统一已经成立，但同一主体的视觉证据变化仍弱，终态未持续保留植物主体，移动端截图未形成完整的视觉闭环。

## 阶段结论

R102 证明了 R101 的路由修复有效：模型不再退回通用暗色网格/圆环，而能生成主题专属的植物标本桌。它也证明“有主题锚点”还不等于“优秀产品页”。下一层约束必须同时保证：

1. 主操作保持同一核心主体连续存在；主题切换只能是次级操作。
2. 证据变化必须发生在主体视觉内，不能主要依赖文字说明。
3. 终态需要同时看到主体、结果摘要和行动，而不是滚动后只剩表单或按钮。
4. 移动端不仅节点可达，还要在关键截图中形成完整的视觉任务闭环。

因此本运行只保留为研究证据，不写入精选案例库，也不继续无限精修；上述四条进入 R103 的生成契约与验收门。
