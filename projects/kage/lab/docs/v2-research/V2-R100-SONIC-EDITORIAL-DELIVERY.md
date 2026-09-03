# V2 R100 — 声音排版真实交付验证

## 设计契约

- Entry mode：brief-led；R99 根因修复后的唯一真实交付验证。
- Request revision：R100。
- Target user and context：深夜阅读并试听一段声音叙事的普通访客。
- Desired first impression：一张可以听见的午夜文学副刊，不是参数仪表盘或中央产品海报。
- Visual ambition：Editorial。
- Experience architecture：Editorial Flow。
- Visual constraints：夜纸灰、路灯琥珀、清晨蓝；排版安静但有节奏；无紫色科技风、随机粒子、地图、中央产品或固定卡片长页。
- Information constraints：未完成台词、耳语/雨点/远钟三个声部、章节情绪、真实性说明和保存行动属于同一阅读链。
- Operation constraints：滚轮与键盘推进同一状态；按钮可直接选择；声音仅由用户启动，并提供播放、静音、音量。
- State constraints：三种声音与文字状态必须明显不同；reduced-motion、AudioContext 失败时仍能阅读和保存。
- Environment constraints：`npm run dev -- --host 127.0.0.1 --port 8143 --strictPort`；规范 URL `http://127.0.0.1:8143`；一个作者候选、一次有界恢复/精修、总 Job 预算 5 分钟。
- Primary journey：读到未完成台词 → 用户启动试听 → 用滚轮/键盘/按钮比较三声部 → 看见同源文字与章节变化 → 保存夜话。
- User-defined phases：创建唯一 Job、等待有界终止、浏览器验收、最小阻断修复（如允许）、决定归档。
- Required artifacts：Job/合同记录、可运行页面、桌面和 390px 最终截图、键盘/声音/reduced-motion/降级证据、质量与归档结论。
- Autonomy authorization：用户已明确要求持续推进并以小目标完成；本轮允许一个新 Job 与范围内可逆验证。
- User-decision boundary：不新增模型供应商、不购买真人录音、不创建第二候选、不绕过 runner 次数限制。
- Observable completion criteria：合同为 `editorial-field / editorial-flow / dom-only / typographic-sonic-field`；页面可运行；业务无需解释可识别；三声部和声音控制真实联动；桌面/390px/键盘/reduced-motion/音频失败可完成；只有质量门通过才归档。

## 方向校准

| 决策 | 方向 | 可观察约束 | 验收 |
| --- | --- | --- | --- |
| 构图 | 连续编辑排版场 | 文字与声音状态是主画面；无参数侧栏或中央产品 | 首屏十秒内识别午夜电台、试听与保存目标 |
| 字体 | 台词、注释、声部形成三级节奏 | 标题不遮挡声部、正文或行动 | 桌面与 390px 无裁切、重叠 |
| 色彩 | 夜纸灰、琥珀、清晨蓝 | 不退化为通用紫色科技暗场 | 文字和控件对比清楚 |
| 动作 | 同一 canonical state 驱动排版与声音 | 滚轮、键盘、按钮不互相打架 | 三种状态可辨，人工输入可控 |
| 增强 | DOM/CSS 为主，Web Audio 为语义反馈 | 无音频时仍完成阅读和保存 | fallback 与 reduced-motion 可用 |

## 覆盖清单

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 合同 | 正确声音编辑合同 | server contract | `job-bdc6a58191ac0576` | 0 | complete | `editorial-field / editorial-flow / dom-only` 已命中 |
| 运行 | 一个 Job 有界停止 | server job | durations / attempts | 1 | complete | 仅 1 次模型 authoring，未创建第二候选 |
| 首屏 | 午夜电台业务与主行动可识别 | 1440×900 | Playwright screenshot / DOM | 2-3 | complete | 主标题、试听入口与声音主题同屏 |
| 控件 | 试听、静音、音量可达 | desktop | Playwright interaction | 4-6 | complete | 播放、静音、音量与状态标记通过 |
| 状态 | 滚轮、键盘、按钮驱动同一三声部状态 | desktop | causal probe / before-after | 5-6 | complete | 视觉锚点、文字、结果与可听状态同步 |
| 手机 | 390px 无溢出且任务可完成 | 390×844 | screenshot / interaction | 7 | complete | 无横向溢出，首屏保留试听与保存行动 |
| 降级 | reduced-motion 与音频失败仍可阅读保存 | reduced/fallback | browser observation | 8 | complete | AudioContext 缺失时诚实提示且保存可用 |
| 工程 | 定向测试、build、console/request | repository/runtime | Vitest / Playwright / build | 9 | complete | 25 项合同与目录测试、3 项归档浏览器测试通过 |
| 归档 | 只保留达到门禁的最终版本 | cases | archive record | 9 | complete | 视觉验收未达 featured，诚实归档为 refined 研究案例 |

## 停止规则

本轮只运行一个新 Job。若失败，保留 Job 与根因，不创建第二候选；若页面可运行，只允许一次与当前 bundle 直接相关的有界修复。未通过独立视觉验收的结果不得标记为 featured；若其功能与研究证据完整，可明确标记为 refined 研究案例，供下一版约束学习。

## 交付结论

- 唯一 Job：`job-bdc6a58191ac0576`；唯一运行：`dedicated-f9ed58e5b7ea`。
- 模型 authoring 约 71.5 秒；规划与素材判断不足 0.3 秒；首次审查约 7.8 秒。主要耗时仍在模型自由编写，而不是浏览器测试。
- 自动机械评审：`pass / 100`；Playwright：桌面、键盘、滚轮、音频、390px、reduced-motion 与音频失败降级共 3 项全部通过。
- 独立视觉验收：`revise / 71`。页面已经形成可用的声音编辑闭环，但“通用网格/圆环/线条”仍不足以成为主题专属午夜电台视觉锚点，因此没有冒充精选最终版。
- 稳定研究案例：`/cases/dedicated-f9ed58e5b7ea/`；案例库标题为“午夜电台短篇 · 三声部编辑式声景”。
- 架构回写：声音编辑路线现在明确禁止通用网格、等距圆环和装饰线条单独冒充声音主体；同时要求 390px 首屏保留主标题、试听入口、第一声部与保存行动。约束进入 Creative Contract 和 Codex 执行包，不影响其他生成路线。
