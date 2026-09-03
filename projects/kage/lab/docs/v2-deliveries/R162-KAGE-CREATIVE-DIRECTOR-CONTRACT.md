# R162 · KAGE 创意导演产品页

## 设计契约

- Entry mode：brief-led，基于现有 KAGE V2 产品能力进行正式产品交付。
- Request revision：R162 / V5 product delivery。
- Target user and context：希望把一句想法直接发展成优秀创意网页的独立创作者、产品设计者和研究者。
- Desired first impression：这不是模板生成器，而是一位能调用真实案例经验、视觉素材和互动媒介的网页创意导演。
- Visual ambition：Immersive。
- Experience architecture：Hybrid Workspace；真实案例画面承担品牌与结果证明，想法输入和方向选择承担核心操作。
- Visual constraints：不预设暗色、三屏、中央主体或特定技术；本次选择高对比编辑式构图，并让真实案例截图成为主视觉资产。
- Information constraints：首屏必须说清产品是谁、为谁、解决什么；使用状态必须解释参考方向；结果状态必须给出真实案例去向和继续创作路径。
- Operation constraints：键盘可完成输入、方向选择和主要行动；滚动和指针只增强体验，不阻断任务。
- State constraints：`entry → composing → direction-selected → result → continued`；不得把点击后的局部视觉变化冒充最终结果。
- Environment constraints：沿用现有 Vite + TypeScript；不新增后台、模型供应商、登录或真实生成接口。
- Primary journey：阅读产品价值 → 输入想法 → 生成三种有依据的创意方向 → 选择方向 → 查看真实案例结果 → 打开完整案例或进入工作台继续。
- User-defined phases：完整产品而非单个特效；使用正式素材；与用户当前 KAGE 产品有关。
- Required artifacts：可运行产品页、设计契约、桌面/移动/键盘/减弱动效覆盖记录、工程测试、产品交付证据。
- Autonomy authorization：用户已明确“确定，最好与我的产品有关的主题”，并要求持续推进，无需重复确认可逆实现选择。
- User-decision boundary：真实后台生成、账号体系、付费、外部部署不在本阶段范围。
- Observable completion criteria：产品价值一眼可理解；真实素材成功加载；输入—方向—结果—继续完整可用；390px 无阻断；减弱动效仍可完成；不存在调试残留或虚假生成承诺。

## 素材职责

| 素材 | 来源 | 页面职责 |
| --- | --- | --- |
| 棱镜种子剧场 | 已验证案例截图 | 首屏记忆点与“生成视觉 + 运行时增强”证明 |
| 模块化声音空间 | 已验证案例截图 | 声音媒介方向的真实结果证明 |
| 西岸集合点图卷 | 已验证案例截图 | 真实地图与地点产品方向证明 |
| 折光成形 | 已验证案例截图 | 连续产品状态与真实产品素材证明 |

这些截图作为 KAGE 已有研究成果的真实产品证据，不伪装成当前页面实时生成的结果。

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 产品进入 | 产品身份、价值和第一行动明确 | desktop opening | 浏览器截图 + DOM | 2 | pass | 首屏截图与产品身份断言通过 |
| 产品使用 | 输入想法并得到三个方向 | desktop composing | 输入与点击交互 | 5 | pass | 声音 brief 触发声音方向推荐 |
| 产品结果 | 方向改变真实案例预览、解释和去向 | desktop result | 操作前后截图 + DOM | 6 | pass | 键盘选择地点方向后预览与解释同步更新 |
| 产品继续 | 打开完整案例或进入工作台 | desktop continued | 链接目标 + 状态记录 | 5 | pass | 完整案例与携带 brief、direction 的工作台路径均有效 |
| 正式素材 | 四张真实截图成功加载 | desktop enhanced | 资源加载观察 | 8 | pass | 四张图片 naturalWidth 均大于 800 |
| 移动产品 | 390px 完整闭环，无溢出 | mobile | 浏览器截图 + 交互 | 7 | pass | 完整路径通过，横向溢出为 0 |
| 键盘 | Tab、方向按钮和主要行动可操作 | desktop keyboard | 键盘路径 | 7 | pass | Tab、Enter 与方向按钮路径通过 |
| 减弱动效 | 信息和操作不依赖动画 | reduced motion | 媒体偏好观察 | 8 | pass | reduced motion 下完整路径通过 |
| 工程 | 类型、测试、Pages 构建通过 | repository | 命令输出 | 9 | pass | `tsc`、26 项定向测试和 Pages 构建通过 |

## 有界执行

- 一个主题：KAGE 想法到创意网页。
- 一组素材：复用四张已验证案例截图，不再触发生图批次。
- 一次完整构建。
- 最多两次确定性修复。
- 最多一次基于真实浏览器问题的视觉精修。
- 已取得最终 Chrome 浏览器证据，并与最终 `runId + bundleHash` 绑定后标记为正式产品。

## 当前运行证据

- Canonical command：`npm.cmd run dev:8143`
- Canonical URL：`http://127.0.0.1:8143/pages/v2/deliveries/kage-creative-director/?quality=high&motion=full&revision=r162-product-first`
- Runtime：页面与四张正式案例素材均返回 HTTP 200。
- Engineering：`npx.cmd tsc --noEmit` 通过；R162 与 V5 产品交付门相关的 26 项定向测试通过；`npm.cmd run build:pages` 通过。
- Browser：用户已明确授权本机 Chrome；`npx.cmd playwright test e2e/v2-r162-kage-creative-director.spec.ts` 4/4 通过（产品页 3 项 + 正式产品入口 1 项），无运行时或控制台错误。
- Evidence：`docs/v2-deliveries/evidence/r162-kage-creative-director/` 保存桌面开场、使用、结果和 390px 开场、结果五张最终截图。
- Final identity：`direct-r162-kage-creative-director` / `cca916f2df90b7d6d2d069efac826649399faaa31f9be34aaa338bcd7ea672bd`。
- Visual refinement：只进行一次移动端标题与首屏图片遮罩校准，复跑浏览器验证后停止。
