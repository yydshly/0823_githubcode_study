# V2 R124 · 内容驱动的结构决策修正

日期：2026-08-31  
状态：阶段关闭  
范围：创意决策、正向参考、最终结构验收；不新增主题案例，不改 V1 运行时与既有成品。

## 用户问题

近期验证页虽然题材、颜色与互动细节不同，但多数仍呈现为同一种“单视口动态场 + 左侧文案 + 右侧信息/控件 + 底部行动”的工作台母版。R123 证明了 3D 与因果互动能力，却没有证明宏观页面结构已真正自适应。

结构审计结果：最近 7 个案例中 6 个桌面首观近似单屏，5 个硬锁单视口，5 个使用右侧浮层；只有 `after-rain-archive` 明确采用多章节滚动结构，`sign-language-season` 采用编辑网格。

## 根因

1. `interactive-field`、`task-flow`、`continuous-canvas` 与 `spatial-inspection` 曾被候选选择器直接解释为 `focus / single-gaze`。
2. 只要 brief 同时出现“调整/结果/保存”等常见词，结构层就容易升级为持久参数工作台。
3. 正向参考只按语义相关性排序，可能连续返回相同宏观骨架。
4. 已有模板惯性诊断仅提示，不判断当前内容是否真的需要持久工作台。

## R124 修正

### 1. 互动不再等于单舞台

- `interactive-field`、`task-flow`、`continuous-canvas` 与 `spatial-inspection` 不再自动选择 `focus`。
- `object-field` 与用户明确分支仍可选择 `branching`。
- 编辑、声音排版和引导序列仍可选择 `journey`。
- 只有 `direct-workbench + persistent controls` 且当前任务具有结构依据时才选择 `focus`。

持久工作台的内容依据为以下任一项：

- 用户当前明确要求持久/常驻控件；或
- 至少两个并发受控参数、结果需要实时反馈、最终行动依赖当前状态。

单参数工具、选书、装箱等直接操作仍可使用互动，但控件降为 `contextual`，不再自动形成侧栏仪表盘。

### 2. 正向参考增加宏观结构轴

`ReferenceEvidencePack` 新增兼容字段 `macroStructureCategory`：

- `fixed-single-subject-overlay-workbench`
- `editorial-flow`
- `spatial-journey`
- `object-field`
- `sequence`
- `catalog`

选择器仍以最高语义相关案例为 Top 1；只有显式语义命中的相关候选才参与补充。当相关候选充足时，Top 1–3 优先覆盖至少两类宏观结构，并最多保留一个固定单主体浮层工作台。没有足够相关案例时仍返回 0 或 1 条，不为了多样性引入无关参考。

### 3. 内容合理性进入最终归档门

新增 `reviewMacroStructureContentFit`，区分两件事：

- 模板惯性只用于要求重新核对，不形成“必须换风格”的禁令；
- 没有当前内容依据的持久参数工作台会得到 `unjustified-persistent-workbench / revise`。

真正的多参数实时工具即使与近期案例骨架相似也可以通过。视觉分数高但结构缺少产品依据的页面不能归档。

### 4. 版本边界

- 旧 `createDirectCreativeRunFromContract` 保持协议版本 1，R115/R116/R118/R120/R123 可原样重建。
- 新 `createDirectCreativeRunFromContractV2` 与 Direct Codex 作者包使用协议版本 2，并要求最终证据包含 `content-fit-required` 宏观结构判断。
- 没有重写旧证据，也没有削弱运行、素材、交互、移动端、身份绑定或 WowGate。

## 验证

- R124 关键回归：17 个测试文件、110 项通过。
- 全量 Vitest：99 个测试文件、537 项通过。
- `npm run build`：通过（包含 TypeScript）。
- `npm run build:pages`：通过；仅保留既有运行时绝对素材路径提示与 chunk size 提示，未形成构建失败。
- V2 Composer 真实浏览器回归：4/4 通过，覆盖同源作者包、390px、能力路由和漂移停止。
- 旧案例兼容：R115、R116、R118、R120、R123 证据重建通过。

本阶段没有生成新网页，因此没有伪造浏览器视觉证据。R124 验证的是决定层与归档门，而不是新案例的美术效果。

## 阶段结论与下一步

R124 已关闭“互动需求自动变成工作台”的主要协议路径，也阻止无内容依据的重复工作台进入新精选库。下一阶段只做一个未使用主题的端到端验证：主题需要动态或空间吸引力，但产品任务不需要持久参数面板。成功标准是最终页面在保持真实动态、3D/空间感或有意义互动的同时，采用内容适配的非工作台结构；只生成一个方向、一次素材批次、一次构建和最多一次明确视觉精修。
