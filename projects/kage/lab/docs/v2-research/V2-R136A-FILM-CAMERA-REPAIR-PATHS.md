# V2 R136A · 旧胶片相机维修判断

## Design Contract

- Entry mode：brief-led；验证普通想法能否自主进入代码原生 SVG 与分支汇合结构。
- Request revision：R136A。
- Exact brief：为第一次参加社区旧物修理日的人设计一个维修判断网页。开场是一台刚从储物间取出的旧胶片相机。访客先选择快门还能动作或已经卡住，进入不同路径：一条检查过片拨杆和测光窗，另一条检查电池仓和快门钮；两条路径都保留刚才的判断，最终汇入同一张维修判断卡，给出清洁、送修或妥善保存的初步建议。访客从对相机状态毫无头绪，走到看懂下一步该做什么，最终行动是保存今天的维修判断卡。画面像一本亲切的印刷故障手册与手绘机构图，让人清楚看见每个判断为什么导向下一步，也愿意真的把旧物修好。
- Target user and context：第一次参加社区旧物修理日、不了解机械相机的普通访客；页面只帮助形成安全的初步判断，不代替维修师诊断。
- Desired first impression：一台可辨认的胶片相机被画成具有油墨套色、编号引线与内部关系的整页机构图；不是产品广告、照片贴图或参数工作台。
- Visual ambition：Editorial；主题本身是判断逻辑与机构关系，因此 SVG 是主视觉和主媒介。
- Experience architecture：Editorial Flow / Branching Confluence；开场认识相机，随后直接选择两条可重放路径，最后汇入同一张判断卡。页面长度由流程自然形成，不固定屏数。
- Visual constraints：暖白说明书纸、墨黑结构线、钴蓝与朱红套色；相机占据第一视觉层，路径与文字服从机构图；不增加与任务无关的摄影背景、卡片矩阵或高成本 3D。
- Information constraints：所有建议标注为非专业初步判断；不声称精确故障、维修成功率、型号兼容或电气安全结论；不指导拆机和接触电池泄漏物。
- Operation constraints：鼠标、触摸和键盘均可选择路径、推进两步检查、返回并重放、汇合和保存；路线 A/B 必须改变相机 SVG 的部件几何、连接路径与结果内容，不能只换文案或颜色。
- State constraints：`opening → fork → route-a/route-b → confluence → saved`；分支结果保留 routeId 与检查历史，返回后可运行另一条路径。
- Environment constraints：沿用现有 Vite 多页与 8143 运行时；桌面、390px、reduced-motion 与 enhancement-off 均保留完整旅程；无外部素材、无第二素材批次。
- Primary journey：看见旧相机 → 选择快门状态 → 检查两处相关机构 → 形成初步建议 → 返回比较另一条路径或保存判断卡。
- User-defined phases：R136 正向参考回灌 → R136A 一个方向实现 → 浏览器验收 → 通过才进入 V3 registry；不并行制作第二案例。
- Required artifacts：设计契约、正向参考证据、可运行页面、浏览器报告与最终截图、DirectCreativeRun、`runId + bundleHash`、V3 媒介与结构一致性门。
- Autonomy authorization：用户要求持续按小目标推进且不频繁确认；可逆实现、测试和本地归档均已授权。
- User-decision boundary：真实相机型号、商业维修建议、外部服务、部署、远端提交与第二条 R136 验证不属于本阶段。

## Positive reference evidence

1. 社区风扇诊断台：借用“同一对象上的部件、检查顺序和安全说明共享一个判断状态”，不复制风扇、横向阶段或原页面视觉。
2. 高彩城市接力：借用“两条路径必须产生可见结构后果、可以返回重放并在同一结果面汇合”，不复制运动主题与高彩赛道。
3. 纸张修复工坊：只借用近距离证据与说明文字指向同一对象的编辑关系，不复制旧纸材料或修复过程。

这些参考均为 advisory；只有当前用户目标、真实性边界与通用质量门属于 hard。

## Design direction

| Decision | Chosen direction | Why it serves the goal | Observable constraint | Acceptance criterion |
| --- | --- | --- | --- | --- |
| Composition | 大幅相机机构图贯穿开场、分支与汇合；文字沿编号引线和纸张边缘出现 | 判断发生在同一对象上，避免流程变成普通表单 | 隐藏标题后仍能辨认胶片相机、镜头、拨杆、测光窗、电池仓和快门钮 | 五秒内看懂“这是相机维修判断” |
| Focal hierarchy | 相机与当前检查部件第一，路径第二，建议和保存第三 | 让视觉证据先于说明 | 同时只突出一组机构关系，不让结果卡提前争夺注意 | 每一步都能指出正在看相机的哪里 |
| Typography | 宋体标题、无衬线步骤、等宽编号 | 建立亲切的印刷故障手册语气 | 字号和行长适合桌面与 390px；不使用巨大标题遮住相机 | 主动作和安全说明均可读且层级清楚 |
| Palette | 暖纸、墨黑、钴蓝、朱红与少量旧黄 | 套色本身帮助区分路径和机构 | 颜色不作为唯一状态证据；几何、编号与文字共同变化 | 灰度理解仍然成立，焦点与 CTA 有可读对比 |
| Material | SVG 线稿、套色错版、半色调与纸张纹理 | 代码原生素材适合机构图，可精确绑定状态 | 可关闭纸张噪点；主旅程不依赖 Canvas 或图片 | enhancement-off 与 reduced-motion 仍完整 |
| Motion | 拨杆转动、仓门位移、快门叶片与连线路径按选择变化 | 动效直接解释检查对象和路径后果 | reduced-motion 使用离散终态，不丢失几何变化 | A/B 前后 SVG path 或 transform 与像素证据不同 |
| Structure | 正常文档流中的分支汇合，不是持久控制台 | 先理解对象，再做判断，最后保存 | 没有永久侧栏、实时指标簇或无关参数 | 开场、分支、结果和返回重放均可自然滚动到达 |

## Coverage Manifest

| Requirement | Surface / state | Evidence needed | Status | Next action |
| --- | --- | --- | --- | --- |
| 相关正向参考进入首稿 | V3 author package | 维修 + 分支两个 evidence packs | pass | `positive-community-repair-diagnostic` 与 `positive-color-relay-branching` 被精确选中 |
| 内容适配媒介 | contract / V3 run | code-native primary + SVG rendering | pass | V3 medium gate 锁定 `code-native / svg + dom-css` |
| 主题专属首屏 | desktop opening | screenshot + camera SVG component proof | pass | 首屏可辨胶片相机、镜头、拨杆、测光窗、快门钮和电池仓 |
| 两条真实路径 | route A / route B | input、部件几何、path/hash、结果差异 | pass | A/B 的 route hash、机构 geometry hash、部件 transform 与结果均不同 |
| 汇合、返回与保存 | confluence / saved | route history、focus、status、saved | pass | 两条路径均可重放，历史保留并汇入同一张可保存判断卡 |
| 跨表面可用 | 390px / reduced motion | screenshot、overflow、keyboard/touch | pass | 390×844 reduced-motion 完整到达 saved，无横向溢出 |
| 增强关闭 | enhancement-off | SVG/DOM 完整旅程 | pass | enhancement-off 仍保留机构图、双路径、判断与保存 |
| 工程与身份 | tests / builds / evidence | runId + bundleHash + V3 gate | pass | `direct-r136a-film-camera-repair-paths` 绑定最终 bundle 与五个浏览器状态 |
| 有界耗时 | first preview / final | 时间戳、尝试次数、停止原因 | pass | 一次零外部素材决策、一次构建、一次确定性修复、一次视觉精修后停止 |

## Stop Boundary

- 一个主题、一个创意方向、零个外部素材批次、一次完整构建。
- 最多两次确定性修复；最多一次依据浏览器证据的视觉精修。
- 相机不可辨、分支只换文案/颜色、建议越过真实性边界或移动端旅程失败时，停止为研究结果，不进入精选库。
- 不在本阶段制作第二个 R136 页面、不引入 3D/生图来装饰机构图、不接后台模型或部署。

## Final Outcome

- 结论：通过并进入 V3 精选；R136A 到此停止，不再精修。
- 页面：`pages/v2/deliveries/film-camera-repair-paths/`。
- 运行身份：`direct-r136a-film-camera-repair-paths` + `f4c32fc7300996f0fac8c9afa82aeac0c8c01e721ff42cd1fb7c88d2a1838977`。
- 质量：Quality 93；自愿执行的 Wow 评估 92；五个浏览器检查点全部无阻断错误。
- 素材事实：零外部素材、零生图调用；协议中的 `assetBatches: 1` 表示一次有界的“无需外部素材”决策，不代表生成过素材。
- 阶段价值：证明普通 brief 能在正向参考帮助下自主选择代码原生 SVG 和分支汇流，而不是再次落入暗色、三屏、中央主体或参数工作台。
