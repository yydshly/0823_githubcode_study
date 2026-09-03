# V2 R99 — 声音排版场真实生成验证

## 验证主题

> 为一部没有画面的午夜电台短篇小说设计可聆听的编辑式网页，声音为主，文字和声音共同构成排版画面。开场是一句未读完的台词和长停顿；滚动或键盘切换“耳语、雨点、远钟”三个叙事声部时，字距、标点、声纹线和章节情绪在同一画布中同步变化；点击试听时用三种明显不同的程序化声景表现，提供播放、静音和音量，并明确说明不是真人录音。最后行动是“保存这一段夜话”。使用夜纸灰、路灯琥珀和清晨蓝，安静、有节奏。不要参数侧栏、中央产品、紫色科技风、随机粒子、地图或固定三段卡片长页。

预检曾淘汰“城市鸟鸣 / 街区记录”版本：其中“街区”触发空间地图结构，而“聆听”单一信号不足以启用产品语义音频。该版本没有创建 Job、没有消耗模型生成；本轮改用明确的声音排版题目验证合同门禁能否在生成前阻止方向错误。

## 设计契约

- Entry mode：brief-led；验证 R97/R98 是否能把新主题生成成非工作台结构。
- Request revision：R99。
- Contract ID：`contract-1tnt3s0`；预检结果为 `typographic-sonic-field`、`workbenchPolicy=forbidden`、`product-semantic-audio-feedback score=85`。
- Target user and context：希望在深夜阅读并试听一段声音叙事、但不需要专业声学工具的普通访客。
- Desired first impression：像一张可以听见的午夜文学副刊，而不是参数仪表盘。
- Visual ambition：Editorial。
- Experience architecture：Editorial Flow；排版是持续主体，声音作为产品语义反馈层。
- Visual constraints：夜纸灰、琥珀和清晨蓝；字体尺度有节奏但不得用巨型标题压倒内容；无紫色科技风、随机粒子、中央产品或卡片拼盘。
- Information constraints：台词、叙事声部、声音差异、章节情绪和最终保存行动属于同一阅读链；明确说明程序化声景不是真人录音。
- Operation constraints：滚轮与键盘都能推进；声音必须由用户启动；首次人工输入停止任何自动演示。
- State constraints：至少三种可听且可见差异状态；静音、reduced-motion 或 Web Audio 不可用时仍能读懂同一内容。
- Environment constraints：规范运行端口 8143；总任务预算 5 分钟；一个作者候选、最多一次自动精修。
- Primary journey：进入声音排版场 → 选择/推进叙事声部 → 看见且听见差异 → 保存这一段夜话。
- User-defined phases：形成合同、启动一个 Job、等待有界完成、检查真实页面、仅在阻断缺陷时做一次最小修复、决定是否归档。
- Required artifacts：Job/合同记录、可运行页面、桌面/390px/键盘/reduced-motion/声音启动证据、质量结论、本记录。
- Autonomy authorization：用户已明确“继续”，授权本轮唯一一次真实 Codex 构建。
- User-decision boundary：不购买或接入真人录音素材，不新增模型供应商，不开启第二候选或无限精修。
- Observable completion criteria：
  1. V2 选择声音排版场且禁止默认套工作台；
  2. 只创建一个服务端 Job，并在预算内结束为 complete、review-required、blocked 或 failed；
  3. 成品不存在参数侧栏/指标仪表盘/固定三栏工作台，业务与最终行动无需解释即可识别；
  4. 至少三种声音/文字状态有明显差异，滚轮或键盘改变同一状态；
  5. 桌面、390px、reduced-motion 和无声音降级仍可完成阅读与行动；
  6. 只有达到归档门禁才进入案例库，否则保留为研究结果并明确问题。

## 覆盖记录

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 合同选择 | 声音排版场、非工作台、单次预算 | V2 contract | 合同 JSON / Job 摘要 | Stage 0 | accept | 已命中声音排版、禁止工作台与音频反馈 |
| 有界构建 | 一个 Job 在 5 分钟内停止 | server job | `job-92919e03379673f9` 历史与耗时 | Stage 1 | block | 唯一候选在 63.2 秒返回；安全与 TypeScript 门禁停止，未开启第二候选 |
| 首屏与结构 | 可听编辑场而非工作台模板 | desktop opening | 浏览器截图 / DOM | Stage 2-3 | block | 未形成可运行 bundle，不伪造页面证据 |
| 交互与声音 | 三状态、滚轮/键盘、用户启动声音 | desktop interaction | 浏览器交互 / 状态 DOM | Stage 5-6 | block | 未进入浏览器，不声称声音联动通过 |
| 跨端与降级 | 390px、reduced-motion、静音/无音频仍可读 | mobile / motion / fallback | 浏览器观察 | Stage 7-8 | block | 未进入跨表面验收 |
| 归档决定 | 只把最终合格结果接入案例库 | cases | 质量门与案例记录 | Stage 9 | block | 不归档失败候选；仅保留本研究记录 |

## 实际结果与根因

- 唯一 Job：`job-92919e03379673f9`；作者模型 `gpt-5.6-terra`；作者阶段 63,224ms；模型只调用一次。
- 第一次门禁：候选使用 `setInterval`，被生成 bundle 安全规则阻止。
- 一次本地恢复：把 3 个周期定时器降级为可取消的一次性声音提示，没有再次调用模型。
- 第二次门禁：候选自定义 `quality: 'low' | 'medium' | 'high'`，与 SDK 的 `low | balanced | high` 不兼容。一次恢复额度用尽后终止，未绕过 runner 继续追补。
- 合同污染：虽然结构多样性层正确选择声音排版场，但原 experience pattern 因配色词“夜纸灰”中的“纸”误入 `material-transformation`，进而带入纸张、墨层和木版状态。说明结构方向不能只在末端覆盖，必须在上游体验规划中优先识别声音编辑语义。

## 已完成的项目修复

- 新增声音编辑优先路由：同类 brief 现在得到 `editorial-field / editorial-flow / dom-only`，并生成 `unfinished-line → voices-emerge → night-composes → quiet-save` 的内容驱动状态，不再被“纸”或“材质”词污染。
- 新增有界安全修复：生成代码若出现 `setInterval`，本地修复只降级为可取消的一次性 `setTimeout`，不会制造新的循环。
- 扩展质量档修复：`low | medium | high` 会确定性归一为 SDK 的 `low | balanced | high`。
- 作者提示已明确禁止 `setInterval`，并要求重复视觉更新走 SDK update、短音频提示走可取消 `setTimeout`。
- 定向回归：3 个测试文件、53 项测试通过。

修复后的同一 brief 合同仍为 `contract-1tnt3s0`，但执行内容已收敛为声音排版：`editorial-field`、`editorial-flow`、`dom-only`、4 个内容状态、音频反馈必选。下一阶段只需再运行一个新 Job 验证修复后的真实页面；不会复活本次失败候选，也不会把它加入案例库。

## 停止规则

本轮不会为了“看起来更好”自动创建第二个主题、第二个候选或第二轮开放式精修。若唯一结果未通过，优先记录结构或生成链缺口；只有一个范围明确、可在现有 bundle 内完成的阻断修复才允许执行。
