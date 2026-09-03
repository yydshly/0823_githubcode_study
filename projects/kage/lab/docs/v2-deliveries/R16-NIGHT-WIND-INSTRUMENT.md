# R16 · 夜间风谱仪单主题端到端验收

## Design contract

- Entry mode：brief-led generation acceptance
- Request revision：V2 R16 / R15 素材续跑后的首次单主题验收
- Target user and context：希望理解居住环境与自然节律的城市居民
- Desired first impression：一间安静的夜间房间里，风是可以被看见和触摸的真实存在
- Visual ambition：Immersive
- Experience architecture：Editorial Flow；持续 WebGL 场景承担空间、气流和情绪，DOM 承担清晰叙事与行动
- Visual anchor：一枚放在窗边、由月白陶瓷与氧化铜组成的无叶风谱仪；细纤维带必须随风速产生可读的物理变化
- Visual constraints：月白、铜褐、雾灰；真实室内尺度与落点；不要蓝紫科技风、玻璃仪表盘、随机粒子或章节海报切换
- Information constraints：开场建立产品与空间；中段让风速、风向、温湿度成为气流中的证据；终点回到装置并给出单一行动
- Operation constraints：滚动推进主叙事；指针只影响局部气流；触摸、键盘和 reduced-motion 保留阅读与行动
- State constraints：opening / airflow / evidence / resolve / mobile / reduced-motion / WebGL fallback
- Environment constraints：本地 127.0.0.1:8143；Codex 5.6 Terra 负责目标理解，Codex 5.6 Sol 负责专属 bundle；MiniMax 仅在素材门明确需要时备用
- Primary journey：描述想法 → V2 选择能力与参考 → 单候选构建 → 必要时补一个关键素材并续跑 → 浏览器验收 → 归档或拒绝
- User-defined phases：生成一个结果；检查质量和耗时；仅在通过时归档
- Required artifacts：一个独立可运行页面、本记录、任务耗时、桌面/手机/降级浏览器证据、明确归档决定
- Autonomy authorization：用户明确要求“继续”，并已要求后续快速推进、避免无限探索
- User-decision boundary：无；本轮不增加新 provider、不生成第二候选、不扩大参考研究

## Selected route

- Selected pattern：DOM + WebGL scroll story
- Evidence branch：continuous-media-scroll / semantic-interaction / identity-through-evidence
- Asset state：已接入 1 个专属夜间窗边环境资产 r16-night-wind-instrument-v1.png；错误温室候选已拒绝
- Asset quality boundary：如果系统判定真实主体为 L3/L4 责任，必须在作者阶段前补充一个经确认素材；不得用程序化占位物冒充产品
- Expected output：一个完整网页，不是模板组合或技术能力列表
- Skill update boundary：只把运行证据写回项目记录；本轮不修改通用 Skill

## Test brief

为一款帮助城市居民读懂夜间风的窗边气象装置设计沉浸式网页。开场是一枚月白陶瓷与氧化铜制成的无叶风谱仪，细纤维带在安静房间里几乎静止；滚动时视角穿过窗缝，纤维随不同风速弯曲，温湿度与风向证据沿真实气流轨迹出现，最终回到窗边，收束为“读取今夜的风”。面向关注居住环境与自然节律的人；画面安静、物理真实、偏月白、铜褐和雾灰，不要蓝紫科技风、玻璃仪表盘、随机粒子或章节海报切换。

## Coverage

| User phase | Requirement | Surface / state | Evidence | Owning stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 生成一个结果 | V2 约束进入真实任务 | job / contract summary | job JSON | Stage 0-1 | pass | job-47d295c3a466732a 保留同一创意合同 |
| 生成一个结果 | 关键主体真实且可用 | asset gate / opening | gate + runtime | Stage 1-2 | pass | 1 个专属资产通过门禁并绑定 continuity-environment |
| 检查质量 | 开场、中段、终点形成同一空间叙事 | desktop scroll states | browser evidence | Stage 2-6 | pass | 1440×900 三状态无溢出、无运行错误 |
| 检查质量 | 手机、键盘、reduced-motion、WebGL fallback 可用 | 390px / capability | browser evidence | Stage 7-8 | pass | 390×844 reduced-motion 保留标题、主体和语义内容 |
| 检查耗时 | 各阶段耗时和模型调用次数明确 | job history | timestamps | Stage 8 | pass | 正确素材续跑后作者约 151 秒；自动精修 90 秒超时并停止 |
| 归档决定 | 只在最终效果通过时进入案例库 | final route | archive result | Stage 9 | pass | 归档 dedicated-191bc3ce2125；错误候选不进入案例库 |

## Outcome

- Final run：dedicated-191bc3ce2125
- Final case：/cases/dedicated-191bc3ce2125/
- Model：Codex gpt-5.6-sol
- Asset generation：1 个关键环境素材，约 27 秒；MiniMax 未参与
- Checkpoint recovery：复用既有 V2 合同、参考证据与导演决策，从素材门后继续，避免重复约 76 秒的规划
- Authoring：13:31:18 → 13:33:49，约 151 秒；TypeScript 编译 505 ms
- Automatic refinement：模型精修达到 90 秒上限后停止，任务被如实标记失败，没有伪装成完成
- Evidence-led repair：浏览器发现 Canvas 占据首个 900px 文档流；将其固定为全屏增强层，并修正终点环境融合
- Final browser evidence：桌面 opening / middle / final + 390px mobile；0 横向溢出、1 个 Canvas、0 浏览器与资源响应错误
- Quality record：机械门 100；独立视觉验收 92；归档为 featured
- Key lesson：本轮真正耗时集中在 Codex 页面作者与一次超时精修，不在本地编译；后续应保留检查点、限制精修次数，并优先用浏览器证据进行小范围修复

## Stop rule

- 只创建一个任务和一个页面候选。
- 素材最多补一个关键视觉锚点。
- Codex 自动作者与已有受限精修之外，不启动第二轮自由生成。
- 若 15 分钟边界内没有可验收页面，停止并记录阻塞阶段；不以继续等待代替结论。
