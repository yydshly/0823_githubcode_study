# V2 媒体主导权单次复验 R61

## 设计契约

- Entry mode: Repair-led / revision-led validation
- Request revision: R61
- Target user and context: 普通访客通过一个榫卯互动学习网页理解两个真实木构件如何对齐、咬合、传递受力，并能预约线上拆解课。
- Desired first impression: 温暖自然光下的真实旧木构件是第一视觉主角；页面具有克制的博物馆编辑感，而不是程序化 3D 草模。
- Visual ambition: Immersive
- Experience architecture: Spatial Stage
- Scene base: DOM + approved full-bleed image；Canvas / WebGL 只在能增强素材时使用。
- Scene persistence: 同一组真实木构件贯穿开场、对齐、咬合、受力与结尾。
- Foreground control model: 阶段导航、证据说明和最终 CTA 位于可读 DOM 前景层，不遮挡关键榫卯关系。
- State-to-scene mapping: 开场分离 → 构件对齐 → 咬合成立 → 受力路径显现 → 修复档案与预约行动。
- Mobile transformation: 390px 下保持主体完整可辨，文字和 CTA 不与主体争夺同一中心区域。
- Fallback: 没有 WebGL 或 reduced motion 时仍使用同一张真实素材、稳定裁切、证据说明和主要行动。
- Visual constraints: 真实木材质感、温暖自然光、克制编辑层级；禁止低质量基础几何重建或遮挡已获批主体素材。
- Information constraints: 十秒内看懂对象、变化、学习价值和最终行动。
- Operation constraints: 复用现有 Job 架构、素材目录、Codex authoring 和质量评审；不增加平台或 API。
- State constraints: 新建一个复验 Job；不重新生图；完整 authoring 一次；失败时最多一次有明确问题清单的增量修改。
- Environment constraints: 保留现有 `8143` 演示服务，复验临时运行于 `http://127.0.0.1:8144`；覆盖桌面、390px 与 reduced motion，媒体路线不强制 WebGL。
- Primary journey: 观察真实构件 → 看见对齐和咬合 → 理解受力与修复证据 → 预约课程。
- User-defined phases: 实现素材主导权硬门禁；单次复验；浏览器验收；通过则归档，否则明确停止。
- Required artifacts: 门禁代码与单测、唯一复验 Job、真实浏览器证据、R61 结论。
- Autonomy authorization: 用户已明确“确定”，允许在当前项目和现有架构内继续。
- User-decision boundary: 不创建第二候选，不再次生图，不扩展业务或外部服务，不无限精修。

## 可观察完成标准

1. 当前失败 bundle 在构建阶段被媒体主导权门禁明确拒绝。
2. 媒体主导路线仍允许背景平面、遮罩、景深和轻量证据标注，不等同于禁止 Three.js。
3. 同主题复验只创建一个 Job，并复用 `mortise-tenon-museum-environment-v1`。
4. 新页面中真实木构件持续承担主视觉，对齐、咬合、受力和 CTA 均可从桌面及 390px 页面理解。
5. 未通过时只允许一次有视觉问题清单的增量修改；仍未通过则停止并保留 `review-required`。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 门禁实现 | 低质量主体重建被拒绝 | bundle validation | `media-dominance-gate.test.ts`；旧 BoxGeometry 主体被拒绝 | Stage 0/9 | pass | none |
| 单次复验 | 一个新 Job，复用已有素材 | server job | `job-10651d420284864e`；只使用 `mortise-tenon-museum-environment-v1` | Stage 1 | pass | none |
| 首屏主导权 | 真实素材为第一视觉主角 | desktop opening | `01-opening.jpg`；真实旧木与工作台全屏主导，无基础几何遮挡 | Stage 2 | pass | none |
| 状态因果 | 对齐、咬合、受力可辨认 | desktop journey | 独立视觉判断 82；裁切和标注可读，但未证明真实咬合变化 | Stage 5/6 | reject | 后续版本需多状态素材或可检查模型，不在本轮继续修补 |
| 跨表面 | 手机、reduced motion、fallback | 390px / capability | `05-mobile.jpg`；无横向溢出，但对象说明与正文、CTA 重叠 | Stage 7/8 | reject | 后续版本重新编排移动端语义顺序 |
| 交付判断 | 归档或明确拒绝 | case / job | Job 为 `review-required`，final score 82，`finalEligible=false` | Stage 9 | pass | 明确停止，不归档 |

## 单次复验结果

- 唯一复验页面：`dedicated-1317159fcbac`。
- 执行边界：一次 Codex authoring、零次新素材生成、一次独立视觉判断；视觉模型认为问题超出一次可靠增量修改后，没有伪造修订 bundle，也没有开启第二轮循环。
- 构建结果：媒体主导权门禁通过，主体基础几何计数为 0；真实素材持续承担首屏和各状态的主视觉。
- 浏览器结果：四个桌面语义状态与一个 390px 状态均可运行，无脚本错误、响应错误、横向溢出或素材请求失败。
- 视觉判断：82 分 / `revise`。主题、材质、编辑气质和 CTA 基本成立；对齐与咬合仍主要依赖裁切、箭头和文案，移动端存在信息重叠，终点仍保留过程标注。
- 终端决定：`review-required`，保留为内部复验依据，不进入精选案例库。

## 本轮沉淀

1. 媒体主导路线增加构建前硬门禁：高质量 L3/L4 素材存在时，禁止大批基础几何重新充当主体；背景平面、遮罩和轻量证据标记仍可使用。
2. 浏览器预检按 renderer route 判断 Canvas 是否必须可见；`dom-media-hybrid` 不再因有意隐藏 SDK Canvas 被误判为运行阻断。
3. 直接精修接口不再把被拒绝结果写成 `complete/100`；它会重新计算交付质量并保持 `review-required` 与真实视觉分数。
4. 质量门禁不能只证明“素材出现了”，还必须证明素材能够表达用户要求的状态变化。单张环境图适合主导气氛和空间，但不足以可靠证明两个实体逐步咬合。

## 交接结论

- 这次验证已完成，不再继续修此页面。
- 下一轮若再次选择“真实物体装配/拆解”目标，规划层必须在 authoring 前选择：连续一致的多状态素材、真实 GLB/扫描模型，或能被审查的分层主体；不能把单张静态图误当成完整状态资产。
- 当前项目目标没有改变：让用户想法变成优秀网页；本轮的价值是把一个高频失败从人工发现变成可阻断、可解释、会停止的系统行为。
