# V2 R117 — 直接创作包产品收口

## 设计契约

- Entry mode：revision-led。R116 已完成通用视觉野心与浏览器 Wow 证据；本轮把现有决策能力收口为用户可见、可复制给 Codex 的同源作者包。
- Request revision：R117。
- Target user and context：在 V2 Composer 输入一个网页想法，希望直接交给 Codex 创作、同时不理解内部研究对象的普通创作者。
- Desired first impression：生成契约后，用户首先看见“模型准备怎么做、何时形成记忆点、用什么媒介、到哪里停止”，而不是一长页内部能力说明。
- Visual ambition：Editorial。
- Experience architecture：Hybrid Workspace。左侧输入属于编辑流；右侧契约区负责决策与直接交付，研究详情继续保留但不阻断主要行动。
- Visual constraints：沿用当前浅色编辑系统；新增一个紧凑执行摘要，不增加新的长章节、装饰动画或固定风格要求。
- Information constraints：摘要只显示视觉野心等级、Hero、渲染媒介、动态/互动与尝试预算；完整研究合同留档，不进入复制包。
- Operation constraints：复制按钮输出版本化 `DirectCreativeAuthorPackage`；工作台入口明确为实验入口。本轮不调用模型、不接后台、不引入供应商或部署。
- State constraints：每次 brief 改变时，合同、作者输入、初始 DirectCreativeRun、包 ID 与 UI 摘要必须同步；复制成功或失败要有明确反馈。
- Environment constraints：沿用现有 Vite、TypeScript、Clipboard API 与回退复制路径；不新增依赖。
- Primary journey：输入想法 → 生成契约 → 看懂视觉与执行摘要 → 复制同源有界创作包 → 直接交给 Codex 构建。
- User-defined phases：同源数据包、入口可见性、复制交付、跨表面验收、工程回归。
- Required artifacts：版本化作者包 schema/builder、Composer 摘要、真实复制内容、桌面与 390px 浏览器证据、单元/回归/构建结果、阶段结论。
- Autonomy authorization：用户已明确“继续”，允许在现有项目内持续完成可逆实现与验收，不重复询问。
- User-decision boundary：后台自动调用 Codex、真实模型服务、部署、外部授权素材和最终自动归档属于后续独立阶段。
- Observable completion criteria：同一 brief 的 `contractId`、紧凑输入与初始 run 同源；复制包不包含研究全文；用户能在首个契约视区看见视觉野心与停止边界；桌面/390px/键盘/Clipboard 回退可用；旧 V2 示例、R113、R115、R116 不回归。

## 浏览器基线

- Canonical URL：`http://127.0.0.1:8143/pages/v2/?revision=r116-final`
- Start command：`npx vite --host 127.0.0.1 --port 8143`
- Existing evidence：`docs/screenshots/v2-composer-desktop.png`，2026-08-31 的 R116 回归产物。
- Observed gap：复制按钮仍调用包含完整 Execution Brief 的旧 `buildV2AuthoringPrompt`；页面未显示 R116 新增的视觉野心，也未把初始 DirectCreativeRun 与紧凑作者输入绑定。

## 覆盖记录

| 用户阶段 | 要求或产物 | 表面 / 状态 | 所需证据 | 内部阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 同源数据包 | `DirectCreativeAuthorPackage` 绑定合同、紧凑输入、初始 run 与 deadline | 数据 / 默认及新 brief | 5 项 schema、确定性、漂移、预算与大小单测 | 0–1 | pass | 已形成版本化 builder 与 serializer |
| 入口可见性 | 显示野心、Hero、媒介、动态和预算 | Composer 首个契约视区 | 桌面 DOM、`v2-composer-r117-package.png` | 2–3 | pass | 摘要直接展示同源 package / run 身份 |
| 复制交付 | 按钮复制同源作者包，不复制研究全文 | Clipboard 成功、输入过期 | Playwright 读取真实复制内容与 stale 防护 | 4–6 | pass | 旧合同在输入改变后立即失效 |
| 跨表面 | 390px 与键盘保持摘要及复制行动可达 | 手机 / keyboard | `v2-composer-r117-package-mobile.png`、无横向溢出 | 7 | pass | 单列摘要与复制按钮保持可达 |
| 工程回归 | V2 Composer、三项精选案例与页面构建不受破坏 | 测试 / build | 505 Vitest、14 Playwright、TypeScript、Vite Pages | 9 | pass | R117 阶段完成 |

## 停止条件

五行全部 `pass` 后结束 R117。本轮不实现最终 bundle 自动归档适配器；该能力只有在作者包被真实使用并形成新候选后才进入下一阶段，避免再次把范围扩成后台工作流。

## 实现结果

- 新增 `DirectCreativeAuthorPackage`：一个合同只生成一个紧凑作者输入和一个初始 `DirectCreativeRun` seed；包 ID、合同 ID 与 run ID 可确定性追溯。
- 复制内容包含一个方向、一次素材批次、一次构建、两次确定性修复、一次视觉精修、60 秒报告、绝对截止线、零静默重试和最终证据要求。
- Composer 在首个合同区域显示视觉野心、五秒 Hero、渲染媒介、空间深度、动态驱动、验收检查点与停止预算。
- 用户一旦修改 brief，旧合同、旧复制包和旧工作台链接立即变为不可执行；成功重新生成后才恢复。
- 研究全文继续保存在完整 V2 合同中，不再重复复制给一次性网页作者。

## 最终验收

- `npx tsc --noEmit`：通过。
- `npm test`：91 个文件、505 项测试通过。
- Composer + R113 手语演出季 + R115 薄膜实验室 + R116 动作谱浏览器回归：14/14 通过。
- `npm run build:pages`：通过。仍存在历史案例素材运行时路径和 Three.js 大 chunk 两类既有警告，本轮未扩大处理范围。

## 阶段结论

R117 已完成。当前 V2 不再只是“内部已经计算视觉野心”，而是能把同一想法的正向参考、视觉方案、有界预算和验收要求打成可见、可复制、不会与输入漂移的 Codex 直接创作包。下一阶段只有在这个包真实产出一个新候选后，才连接最终 bundle 身份、浏览器证据与精选归档；不建设后台模型调用，也不重新扩展案例数量。
