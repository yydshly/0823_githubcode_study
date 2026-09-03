# R159 · 风把信送过山谷 · 直接创作契约

## 设计契约

- Entry mode: `brief-led`
- Request revision: `R159 / first build`
- Target user and context: 想把一封短笺送给远方朋友、希望过程本身具有情绪价值的人
- Desired first impression: 一阵真实山风掠过巨大山谷，前景信纸被风托起；安静、辽阔、让人想跟随
- Visual ambition: `Immersive`
- Experience architecture: `Editorial Flow`，全幅环境持续贯穿，文字和行动随旅程自然出现；不是固定参数面板
- Visual constraints: 高质量山谷环境与真实纸张质感形成主视觉；界面不冒充照片，不用随机粒子代替风
- Information constraints: 用户需要理解“写下短笺 → 让风带走 → 抵达山屋”的单一变化
- Operation constraints: 滚轮、触摸滚动、指针风向和键盘均可推进；最终行动为“把信交给风”
- State constraints: `waiting → lifted → crossing → arriving → delivered`；场景、信纸和文案必须共享同一状态
- Environment constraints: 现有 Vite/TypeScript 项目；一批生成素材；无后端、账号或真实投递承诺
- Primary journey: 看见信纸被风托起，滚动穿过山谷，调整风向避开山脊，抵达并投进山屋邮箱
- User-defined phases: R159 一个新主题、一次素材批次、一次完整构建、最多一次视觉精修、浏览器验收
- Required artifacts: 可运行页面、项目内生成素材、桌面开场/中段/完成态、390px、reduced-motion 与图像失败回退、最终记录
- Autonomy authorization: 用户已持续授权“继续”，且要求以小目标阶段推进，不频繁确认
- User-decision boundary: 只有改换主题、引入真实服务或第二批素材才需要新决定；本轮均不触发
- Observable completion criteria: 首屏可辨识山谷与信纸；滚动真实改变信纸路径和环境深度；指针风向有明确效果；最终投递可达；移动端无阻断溢出；素材加载失败仍可完成旅程

## 正向参考证据

1. `月光潮池夜巡图卷`：借用“一张连续环境承载完整旅程”，不复制横向巡游或海岸视觉。
2. `棱镜种子剧场`：借用“生成素材建立身份，运行时代码承担不可替代变化”，不复制种子、温室或光谱。
3. `同桌时刻`：借用“空间距离最终收束为人与行动关系”，不复制双餐桌构图。

## 媒介与素材职责

- 主媒介：`generated-image + DOM/CSS/Canvas runtime`
- 唯一生成素材：无字、无人物的宽幅写实山谷环境；包含近景草坡、中景峡谷气流通道、远景山屋与可用天空留白
- DOM/CSS：信纸、邮戳、文字、进度、行动与可访问回退
- Canvas：低成本风线，只呈现方向和速度，不作为主视觉
- 不使用：第二批生成图、整页 AI UI 截图、伪 3D 产品、无意义粒子、自动循环替代真实输入

## 设计方向

| 层 | 选择 | 可观察标准 |
| --- | --- | --- |
| 构图 | 16:9 山谷全幅背景，信纸从近景左下穿向远景右上山屋 | 第一眼同时看到地点、主体和目的方向 |
| 焦点 | 信纸为最近前景；远处山屋用暖光作为终点 | 不靠标题也能理解“从这里到那里” |
| 排版 | 小号邮务标记 + 大幅短句，但不遮住信纸轨迹 | 文案服务旅程，不能成为巨型模板标题 |
| 色彩 | 雨后冷绿山谷、乳白信纸、终点暖琥珀光 | 冷暖只用于起点与到达的语义对比 |
| 材质 | 真实山体与草坡、可见纸纤维、柔和空气透视 | 素材与代码层之间没有贴图边界感 |
| 深度 | 背景轻微视差、信纸缩放与模糊随距离变化 | 滚动中能感到跨越，而不是换幻灯片 |
| 动效 | 滚动决定旅程，指针只偏转风向；减弱动效保留离散阶段 | 任何自动动效都不替代用户输入 |

## 覆盖清单

| 用户阶段 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 开场 | 1440×900 / waiting | `desktop-opening.png` + DOM | 9 | pass | 一眼可见山谷、信纸与暖光终点 |
| 旅程 | 滚轮中段 / crossing | `desktop-crossing.png` + 路径数值 | 9 | pass | 滚动、侧风、景深与距离共享进度 |
| 完成 | delivered | `desktop-delivered.png` + 行动结果 | 9 | pass | 山屋抵达、0.0 km 与保存行动一致 |
| 移动端 | 390px | `mobile-opening.png` + 无横向溢出 | 9 | pass | 主体、文案和操作无阻断裁切 |
| 减弱动效 | reduced-motion | 离散阶段与可读行动 | 9 | pass | 保留完整任务路径，不依赖连续动画 |
| 素材失败 | image error fallback | 可操作 DOM 场景 | 9 | pass | 生成图失败时仍可滚动并完成投递 |
| 工程闭环 | build / type / browser | 最终记录与自动化结果 | 9 | pass | 已绑定最终 `runId + bundleHash` |

## 执行边界

- 一个方向：风把一封信送过山谷。
- 一次生成调用，只选择该输出。
- 一次完整构建；最多两次确定性编译修复。
- 浏览器发现明确视觉缺陷时最多一次精修。
- 未达到优秀标准则停止为研究结果，不进入 12 项精选库。

## 最终结果

- Final run: `direct-r159-windborne-letter-valley`
- Bundle hash: `8faa876a0edc448053d60e506e1cdd8f7ff70c30cafd3b8a15844f63485bf832`
- 最终记录：`docs/v2-research/evidence/r159-windborne-letter-valley.final.json`
- 浏览器环境：Chromium，1440×900、390×844、reduced-motion 与关键图像失败回退。
- 结论：通过。一个生成环境素材负责地点与距离，运行时信纸、风线、雾带和暖光负责真实输入驱动的旅程；以该结果替换精选库中较弱的 `same-table-tonight`，总量保持 12。
- 停止：已用完一次视觉精修额度，不继续换主题、补素材或开启第二轮优化。
