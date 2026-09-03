# R169 · KAGE 感受取景器

## 设计契约

- Entry mode：brief-led；以 KAGE 自身为产品主题，验证“一句想法先形成可感受的创意方向，再进入完整创作”。
- Request revision：R169 / capability-guided formal product validation。
- Target user and context：已经有产品想法、但不知道它应该给人什么感受、采用什么视觉与互动表达的独立创作者。
- Desired first impression：文字不是被塞进模板，而是在同一片空间里逐渐获得光、材质、深度和行动；页面本身要让人想靠近探索。
- Visual ambition：Immersive；正式主视觉承担身份，运行时景深、光域、纸纤维、指针与滚动只负责让同一视觉世界发生有意义的状态变化。
- Experience architecture：Spatial Stage；连续主场景覆盖 `idea → feeling → formed → continuation`，操作贴合场景边缘，不改造成仪表盘或多卡片工作台。
- Scene base：一次生成的正式宽幅无字主视觉 + CSS mask / blend / depth layers + Canvas 光纹；语义 DOM 承担产品说明、输入和结果。
- Foreground control model：一句想法输入、三种情绪取向、滚轮/拖动推进“成形程度”、最终创作行动。
- State-to-scene mapping：`idea` 为柔焦纸面与未聚合光迹；`feeling` 让选择的色温、节奏和文案进入；`formed` 打开清晰空间并显示主题、媒介、互动职责；`continuation` 进入已有创作入口。
- Mobile transformation：390px 保留同一全屏场景，把文字和控制压缩为上下两个半透明层；不变成长表单或卡片列表。
- Fallback：主视觉或 Canvas 不可用时，背景退回柔和渐变，产品身份、想法输入、方向选择、结果和主要行动仍可完成。
- Visual constraints：不预设暗色、三屏、中央主体或某种技术；本次自主选择“纸面光域展开为空间”的编辑式日光构图，因为它能直接表达想法形成体验。
- Information constraints：首屏明确 KAGE 为谁、做什么、第一动作；结果明确这是方向试演而非已完成的实时生成，不伪造后台模型结果。
- Operation constraints：滚轮、拖动和键盘方向键都可推进；按钮和输入可由键盘完成；视觉变化必须与状态同步且可解释。
- Environment constraints：沿用现有 Vite + TypeScript；不接工作台后台、不新增模型供应商、账号、付费或外部部署。
- Primary journey：理解 KAGE → 写下想法 → 选择希望留下的感受 → 推进场景成形 → 阅读创意方向 → 进入真实创作入口。
- User-defined phases：一个方向、一次素材批次、一次构建、最多两次确定性修复、最多一次视觉精修；最终产品效果优先，不无限等待。
- Required artifacts：正式主视觉、可运行产品页、设计契约、桌面开场/操作前后/结果、390px、键盘、减弱动效与素材回退证据、最终身份记录。
- Autonomy authorization：用户已明确要求持续按小阶段推进，不频繁询问；本阶段可以自主完成可逆的产品设计和实现。
- User-decision boundary：真实模型生成、云端保存、登录与正式部署不在本阶段范围；现有 V1 和已部署站点不得改动。
- Observable completion criteria：产品价值一眼可懂；正式素材真实加载并承担主视觉职责；输入—情绪—成形—继续闭环真实可用；变化不是装饰；390px 无阻断；无控制台错误；最终证据绑定当前 bundle。

## 方向选择与正向参考

Codex 内部比较三个方向后，只实施一个：

1. 前后对照切屏：理解快，但容易退回普通案例展示，未选。
2. 3D 棱镜隧道：视觉强，但可能让技术抢走 KAGE 的产品含义，未选。
3. **纸面光域展开为空间**：把“想法获得情绪、媒介和行动”放在同一个持续场景中，已选。

借用原理而不复制页面：

- `prism-seed-theatre`：主体本身承担光源与记忆点。
- `rainlight-walk-recorder`：连续环境承载进入、使用、结果和继续。
- `threeui-liquid-form`：视觉变形必须回应明确语义输入，不把 shader 当装饰。

能力选择是开放建议，不是技术白名单：`asset-led-environment`、`continuous-state-story`、`procedural-webgl`、`semantic-interaction`、`editorial-composition`。

## 素材计划

- 一次内置生图批次，只生成一张宽幅无字主视觉。
- 素材职责：建立“纸面想法向可进入空间展开”的产品身份，并提供可供遮罩、景深和光纹增强的连续环境。
- 禁止把低质量 CSS 几何冒充关键素材；CSS / Canvas 仅承担交互态、光域和景深变化。
- 生成失败则停止素材阶段并明确记录，不静默重复抽卡。

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 产品进入 | 产品身份、受众、价值和第一动作清晰 | desktop idea | `01-desktop-opening.png` + DOM | pass | 无 |
| 产品使用 | 输入与情绪选择真实改变同一场景 | desktop feeling | `02-desktop-feeling.png` + 状态快照 | pass | 无 |
| 产品结果 | 创意方向、媒介与互动职责可理解 | desktop formed | `03-desktop-formed.png` + DOM | pass | 无 |
| 产品继续 | 主要行动进入现有创作入口 | desktop continuation | 携带 brief、direction、source 的链接与键盘路径 | pass | 无 |
| 正式素材 | 主视觉真实加载并承担声明职责 | enhanced / fallback | naturalWidth > 1600 + 素材阻断测试 | pass | 无 |
| 移动产品 | 390px 闭环可用且无横向溢出 | mobile idea / formed | `04-mobile-opening.png`、`05-mobile-formed.png` | pass | 无 |
| 键盘 | 输入、方向、推进和主要行动可操作 | keyboard | Enter / End 路径 | pass | 无 |
| 减弱动效 | 信息与操作不依赖动画 | reduced motion | Chrome 媒体偏好路径 | pass | 无 |
| 工程与身份 | 类型、定向测试、Pages 构建、最终哈希 | repository | 7/7 单测、Pages build、5/5 Chrome、最终 JSON | pass | 无 |

## 有界执行记录

- 当前阶段：正式产品验收完成并进入归档。
- 已使用素材批次：1 / 1。
- 已使用完整构建：1 / 1。
- 已使用确定性修复：2 / 2（测试文案断言对齐；最终身份输入收窄到资格判定器的严格 schema）。
- 已使用视觉精修：1 / 1（结果定位与浏览器证据等待对齐）。
- Canonical command：`npm.cmd run dev:8143`。
- Canonical URL：`http://127.0.0.1:8143/pages/v2/deliveries/kage-feeling-lens/?quality=high&motion=full&revision=r169-browser-proof`。
- Final identity：`direct-r169-kage-feeling-lens` / `08472f8b9d36229381e9a71af98f636a9236f56b541f7af3753f03886e9b7550`。
- 停止原因：7/7 定向单测、TypeScript、Pages 构建和 5/5 本机 Chrome 验收通过，正式素材、桌面/390px、真实互动、键盘、减弱动效、素材回退与正式产品入口都有最终证据；达到本阶段质量门后停止，不继续无限精修。
