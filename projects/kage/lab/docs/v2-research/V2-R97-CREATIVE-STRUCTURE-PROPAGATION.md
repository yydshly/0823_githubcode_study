# V2 R97 — 创意结构约束进入真实作者链

## 设计契约

- Entry mode：revision-led；修复近期页面虽业务不同但反复出现“明亮工作台＋主体＋参数卡＋CTA”的结构同质化。
- Request revision：R97。
- Target user and context：在 Kage 工作台输入新想法、期望得到专属网页的创作者。
- Desired first impression：结果首先体现当前业务适合的体验构成，而不是案例库中最近一次安全骨架。
- Visual ambition：Editorial / Immersive 按 brief 选择。
- Experience architecture：Editorial Flow、Spatial Stage、Hybrid Workspace 按合同选择，不预设工作台。
- Visual constraints：保留主题主体、因果变化、素材质量和移动端门禁；不得用换色、换图或换字体冒充结构创新。
- Information constraints：结构差异必须服务业务理解；参数模拟仍可使用工作台，非参数目标不得被工作台吞并。
- Operation constraints：不增加模型调用、候选数量或精修轮次。
- State constraints：创意指纹和结构拒绝项必须真正进入 Codex authoring 输入，而不只存在于完整留档合同。
- Environment constraints：沿用本地 8143 规范运行入口；V1 与既有案例不改写。
- Primary journey：用户 brief → V2 选择业务结构与风格指纹 → Codex 获得同一约束 → 单候选构建。
- User-defined phases：先修真实传递缺口，再做定向契约与浏览器验证；本阶段不生成新案例。
- Required artifacts：代码、定向测试、构建、V2 项目页浏览器证据、本记录。
- Autonomy authorization：用户已明确“继续”，允许在当前项目内直接实施。
- User-decision boundary：不新增业务、后端、模型供应商或固定视觉模板。
- Observable completion criteria：
  1. compact authoring brief 含创意指纹、结构差异轴和禁止复刻项；
  2. Codex prompt 明确区分“业务适合工作台”和“默认套工作台”；
  3. 工作台型、地图型、连续叙事型目标得到不同结构约束；
  4. 定向测试、TypeScript、生产构建和 V2 项目页浏览器路径通过。

## 覆盖记录

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 修复传递 | 创意结构进入真实 authoring 输入 | compact JSON / Codex prompt | `v2-style-diversity`、`v2-workbench-main-loop` 断言 | Stage 6 | pass | 阶段完成 |
| 防止误伤 | 参数任务保留工作台，其他目标使用合适结构 | 参数、地图、连续叙事、档案四类 brief | 定向结构选择测试 | Stage 6 | pass | 阶段完成 |
| 项目可见 | V2 页面继续显示风格差异且无运行异常 | `/pages/v2/` 桌面 / 390px | `e2e/v2-composer.spec.ts` | Stage 7 | pass | 阶段完成 |
| 工程收口 | 类型、构建与既有测试通过 | repository | 41 项 Vitest、TypeScript、Vite | Stage 9 | pass | 阶段完成 |

## 边界

R97 只修“已存在的创意多样性约束没有进入真实 Codex 作者输入”这一主链缺口，并补充业务结构适配规则。它不通过随机换骨架制造差异，不生成新主题，也不把案例数量当作进度。

## 实施结果

### 根因

完整 V2 合同已经包含六轴创意指纹和相邻案例差异，但真实专属网页生成链使用的是精简 authoring payload；该 payload 之前没有携带 `styleDiversity`。因此项目页能展示多样性规则，真正编写页面的 Codex 却只看到了业务 brief 与通用工程约束，容易回落到近期验证较多的工作台外壳。

### 本阶段修复

- 把创意指纹、必须差异轴和结构方向传入精简 authoring payload，而不是只保留在研究留档中。
- 新增业务结构选择：连续叙事、直接工作台、编辑证据、空间地图、对象场、声音排版场和空间检查。
- 明确 `workbenchPolicy`：真正的参数因果任务可要求工作台；地图、档案、声音叙事和连续体验禁止默认套用参数侧栏、指标面板或固定三栏。
- 把近期已验证但结构相似的案例加入相似度基线，让后续选择能识别“又一次工作台”而不只比较早期案例。
- Codex 作者提示把结构方向提升为硬约束；仅换颜色、图片、标题或圆角不再视为创意差异。

### 验证证据

- 定向回归：5 个测试文件、41 项测试全部通过。
- 工程验证：TypeScript 与生产构建通过；仅保留既有的大 chunk 提示，不构成本阶段回归。
- 浏览器验证：V2 项目页桌面与 390px 移动路径通过 Playwright，能力选择、验证案例和横向溢出检查正常。

### 阶段结论

R97 已完成。它修复的是“约束没有进入真实作者链”的确定性缺口，不声称尚未生成的新页面已经天然多样。下一次真实构建将用于验证输出差异；下一项目阶段应把 V2 结构合同稳定接到一次有界 Codex 构建入口，而不是继续增加案例或开放式精修轮次。
