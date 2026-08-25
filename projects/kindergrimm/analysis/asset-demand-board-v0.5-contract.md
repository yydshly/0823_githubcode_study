# Asset Lab v0.5 — 场景素材需求与补产板契约

Entry mode: revision-led continuation
Request revision: 5
Target user and context: 研究 Kindergrimm 源库能力，并据具体使用场景判断素材是否可直接使用、需要扩展或必须由其他管线生产。
Desired first impression: 先看到场景效果，再立即看懂素材覆盖率、真实表示与下一步补产方向。
Visual ambition: Immersive
Experience architecture: Hybrid Workspace
Visual constraints: 保留 v0.4 三个使用场景与现有 Asset Lab；需求板属于同一使用模式，不另建无关页面。
Information constraints: 每条需求必须包含消费者、表示、来源、状态、缺口与下一步；不得把 2D 素材宣称为真实 3D。
Operation constraints: 切换使用场景或场景预设时，需求板同步更新；键盘路径和现有导航继续有效。
State constraints: source-ready / generated-ready / extension-needed 三种状态；WebGL 关闭时仍可读取需求与边界。
Environment constraints: canonical URL http://127.0.0.1:8882/projects/kindergrimm/asset-lab/?mode=usage；桌面、平板、390px 手机、reduced-motion、WebGL fallback。
Primary journey: 选择素材预设 → 查看实际场景 → 切换消费者 → 检查素材覆盖率与缺口 → 得到明确扩展方向。
User-defined phases: 保留已有能力；继续围绕源库素材样式和能力扩展；以使用场景驱动补产。
Required artifacts: 同页需求板、数据注册表、浏览器验收报告、自动验证脚本、有限证据截图。
Autonomy authorization: 用户明确“继续”。
User-decision boundary: 完整对话系统、库存后端、可玩关卡和新外部生成服务不在本轮；是否深入其中一个产品方向留待后续选择。
Observable completion criteria: 三个消费者均显示完整需求行和覆盖率；至少一个真实能力缺口被诚实标记；预设与消费者切换同步；响应式、键盘、降级、性能和既有能力回归通过。

## Coverage record

| User phase | Requirement or artifact | Surface / state | Evidence needed | Owning stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 场景驱动 | 三个场景的素材需求注册表 | source | file | Stage 0 | pass | 建立数据注册表 |
| 场景驱动 | 当前场景覆盖率摘要 | usage/default | DOM + screenshot | Stage 3 | pass | 实现摘要 |
| 场景驱动 | 每条素材的表示、来源与状态 | usage/all proofs | DOM observations | Stage 3 | pass | 实现需求矩阵 |
| 场景驱动 | 缺口与补产方向 | usage/all proofs | DOM observations | Stage 6 | pass | 实现缺口卡片 |
| 联动 | 切换消费者同步需求板 | usage/tabs | browser interaction | Stage 5 | pass | 绑定现有 tabs |
| 联动 | 切换预设同步素材事实 | usage/preset | browser interaction | Stage 5 | pass | 接入生成流程 |
| 边界 | 2D / procedural 3D / missing capability 诚实区分 | usage/all proofs | DOM + source | Stage 6 | pass | 验证表示分类 |
| 适配 | 桌面、平板与 390px 手机 | responsive | screenshots + dimensions | Stage 7 | pass | 浏览器验证 |
| 输入 | 键盘焦点与语义 | usage/tabs | keyboard evidence | Stage 7 | pass | 浏览器验证 |
| 动效 | reduced-motion | preference | computed style | Stage 7 | pass | 浏览器验证 |
| 降级 | WebGL 关闭仍可用 | renderOff | browser evidence | Stage 8 | pass | 浏览器验证 |
| 性能 | 需求板不重复创建高成本渲染器 | usage | measured observation | Stage 8 | pass | 浏览器验证 |
| 回归 | v0.4 使用场景与 v0.3/v0.2 能力保留 | all | automated checks | Stage 9 | pass | 执行回归 |
| 交付 | 浏览器报告、验证脚本和交接记录 | repository | files | Stage 9 | pass | 生成并审计 |
## Closure evidence

- Canonical browser route: http://127.0.0.1:8882/projects/kindergrimm/asset-lab/?mode=usage
- Browser report: analysis/asset-demand-board-v0.5-browser-review.json
- Automated acceptance: ASSET DEMAND BOARD V0.5 19/19
- Regression: v0.4 20/20, v0.3 22/22, v0.2 18/18
- Measured coverage: narrative 3/5 (60%), collection 3/5 (60%), world 4/6 (67%)
- Browser surfaces: 1440 desktop, 1024 tablet, 390 mobile, reduced-motion, WebGL-disabled fallback
- Console errors: 0
- Final evidence: evidence/asset-lab-v05-demand-world-gaps.png, evidence/asset-lab-v05-demand-mobile.png

