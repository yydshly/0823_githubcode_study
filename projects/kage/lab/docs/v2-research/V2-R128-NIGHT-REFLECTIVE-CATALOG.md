# R128 · 夜行反光材料样本馆

## Design contract

- **Entry mode:** brief-led direct implementation
- **Request revision:** R128 / V2.5 catalog validation
- **Target user and context:** 夜间骑行装备、舞台服装与公共安全视觉的设计学习者；希望快速理解不同反光表面的视觉差异，不把页面当作认证工具
- **Desired first impression:** 像进入一间夜间材料阅览室；八件可辨认样本同时出现，移动光束时各自产生不同的反射纹理与亮度形态
- **Visual ambition:** Immersive
- **Experience architecture:** Editorial Flow / Catalog；多对象并列浏览与比较是主体验，不使用持续中央英雄、长滚动空间旅程或持久参数面板
- **Scene base:** Canvas 2D 为每件样本生成主题专属反光响应，DOM 承担目录、筛选、选择、比较、收藏与语义回退
- **Scene persistence:** 八件样本在筛选和比较中保持身份、编号、材质纹理与相对尺度；详情在样本附近或比较层出现
- **Foreground controls:** 顶部轻量类别筛选；每件样本可选择；选满两件后出现比较层；最终行动为“收藏这组夜行材料”
- **State-to-scene mapping:** `overview → filter → inspect → compare → saved`
- **Mobile transformation:** 390px 转为单列样本流与底部比较条；触摸样本可移动离散光点；不裁切桌面目录
- **Fallback:** Canvas 不可用时保留每件材料的 SVG/CSS 纹理、筛选、二选比较、收藏和真实性说明
- **Visual constraints:** 黑灰夜场、道路钠灯琥珀、反光银、警示黄绿与安全橙；不使用紫色科技霓虹、通用玻璃卡、中央产品或三栏工作台
- **Information constraints:** 所有反光表现均明确标注为视觉模拟；不伪造 EN/ANSI 等级、照度、可视距离、品牌或安全认证
- **Operation constraints:** 指针、触摸与键盘必须真实改变样本局部光束和反射响应；筛选保持可选状态一致；最多同时比较两件
- **State constraints:** 比较层支持 Escape 与焦点返回；reduced-motion 停止自动扫光但保留人工光束；刷新后只保存最终收藏编号，不保存虚构性能数据
- **Environment constraints:** 复用现有 Vite、Canvas、V2.5 DirectCreativeRun 和归档门；不接后台 Codex、不引入外部模型服务、不生成第二方向
- **Primary journey:** 看见八件样本 → 按用途筛选 → 用光束检查表面 → 选择两件并排比较 → 收藏当前组合
- **User-defined phases:** 一个方向；一次程序化素材批次；一次构建；最多两次确定性修复；最多一次明确缺陷的视觉精修
- **Required artifacts:** 可运行目录页、catalog 路由能力与测试、DirectCreativeRun v2、最终 `runId + bundleHash`、桌面/比较/390px/reduced-motion/fallback 证据；只有 pass 才进入 V2.5 示例库
- **Autonomy authorization:** 用户已要求持续开发、按小目标推进并避免频繁确认；本阶段可逆实现与验证无需再次确认
- **User-decision boundary:** 真实材料测试、认证数据、商业品牌、外部接口和部署不在本阶段；如成为必须条件才请求新授权

## Positive reference evidence

1. **R120 纸蝶日光游园 · 多对象身份连续性**：借用“多个对象始终保留身份、相对尺度与可选择关系”的原理；不复制温室、纸蝶或 3D 队形。
2. **纸张修复工坊 · 材质证据靠近对象**：借用“近距离材质细节与解释文字指向同一对象”的原理；不复制旧纸、暖色工作台或修复流程。
3. **MotionSites catalog research · opening discovery**：只借用“首屏即可探索且输入本身承担发现”的方向信号；公开目录元数据不作为实现细节或视觉复制依据。

以上均为 advisory。用户当前要求与通用质量门才是 hard；相关性不足的案例不进入执行输入。

## Design direction

| Decision | Chosen direction | Why it serves the goal | Observable constraint | Acceptance criterion |
|---|---|---|---|---|
| Composition | 非均匀 4×2 接触印样本墙，比较层按需浮起 | 第一眼即可理解“这是一个可浏览集合” | 未选择时不得出现中央英雄或持久侧栏 | 隐藏标题后仍能辨认八件不同样本与目录关系 |
| Focal hierarchy | 样本纹理与移动光束第一，筛选第二，文字第三 | 让交互直接解释材料差异 | 标题和导航不得压过样本墙 | 五秒内看懂“移动光束、选择两件比较” |
| Typography | 工业标牌式窄体标题 + 中性正文 + 编号标签 | 建立材料阅览室而非科技仪表盘 | 单卡只保留名称、类别与一句响应描述 | 桌面与 390px 均无过密参数表 |
| Palette | 煤黑、沥青灰、反光银、黄绿与安全橙 | 主题来自夜间道路与反光材料 | 不出现紫色霓虹和通用玻璃渐变 | 光束与纹理在每个样本上均可辨 |
| Material | 玻璃微珠、微棱镜、编织丝、蜂巢膜等程序化纹理 | 程序化渲染正好承担可变化的反光职责 | 八种纹理不能只是同色渐变换名 | 至少四类可从纹理和光束响应直接区分 |
| Motion | 慢速环境扫光 + 人工指针/触摸接管 | 先演示再让用户检查，不制造等待 | 首次输入立即停止自动扫光 | 人工输入后状态明确为 manual；reduced-motion 无自动扫光 |
| Comparison | 两件样本并排、同一光束坐标下比较 | 保留可比尺度与因果一致性 | 最多两件，第三件选择给出明确反馈 | 比较前后画面、文案和收藏状态同步变化 |

## Coverage manifest

| 用户阶段 | 要求 / 产物 | Surface / state | Evidence needed | Stage | Status | Next action |
|---|---|---|---|---:|---|---|
| 目标锁定 | catalog 缺口、设计契约与停止条件 | document | file + contract test | 0 | pass | 实现 catalog 路由 |
| 产品能力 | 明确目录 brief 路由为 catalog 而非 object-field | contract output | unit test | 0–1 | pass | 已通过 catalog 与旧 object-field 回归 |
| 构建 | 八件并列、非工作台目录页 | desktop overview | screenshot + DOM + runtime snapshot | 1–3 | pass | 已生成八件非均匀材料墙 |
| 光束 | 指针、触摸、键盘改变局部反射 | inspect | browser interaction + pixel/state witness | 4–6 | pass | 真实输入与 Canvas 像素变化已验证 |
| 筛选 | 用途筛选不破坏身份和已选状态 | filter | click + DOM/state | 4–6 | pass | route/wear/stage 真实按钮路径已验证 |
| 比较 | 最多二选并排、Escape 与焦点返回 | compare | click + keyboard + screenshot | 4–7 | pass | 二选、同光束、Escape 与焦点返回已验证 |
| 收藏 | 保存当前二选组合 | saved | action + persistence | 5–6 | pass | 页面按钮完成本地收藏 |
| 移动 | 390px 完成筛选、检查、比较和收藏 | mobile | screenshot + overflow + state | 7 | pass | 390px 触摸路径无横向溢出 |
| 动效 | reduced-motion 无自动扫光但可人工操作 | reduced-motion | browser state | 7–8 | pass | 自动扫光暂停，人工触摸接管 |
| 回退 | Canvas 不可用仍可完成主要行动 | forced fallback | screenshot + journey | 8 | pass | 纯 CSS 材料、无比较 Canvas，完整行动通过 |
| 身份 | 最终证据绑定当前 bundle | final files | runId + SHA-256 + test | 9 | pass | `direct-r128-night-reflective-catalog` + `ef0ae714…ca379` |
| 质量 | 主题专属、具有记忆点且不是普通卡片墙 | final checkpoints | adaptive evidence + WowGate | 9 | pass | FinalQuality 93 / WowGate 93 |
| 归档 | 只保留一个通过版本 | V2.5 library | archive gate + registry | 9 | pass | 已注册 catalog 最终版并停止 |

## Completion and stop rule

完成条件：catalog 路由测试通过；八件样本身份可辨；光束、筛选、二选比较、收藏、390px、reduced-motion 与 fallback 有真实浏览器证据；无认证伪造；FinalQuality 与 WowGate 均 pass；证据绑定最终身份。

停止条件：一次构建与一次视觉精修后仍像普通卡片墙、光束不能解释材料差异或主要行动无法完成，则记录为研究结果并停止，不进入注册表、不循环重做。

## Final result

- **Verdict:** pass
- **Final identity:** `direct-r128-night-reflective-catalog` / `ef0ae71482af63a997095d6398b03f806833a418593d1ac46b8d0e709faca379`
- **Bounded usage:** 方向 1、素材批次 1、构建 1、确定性修复 1、视觉精修 1
- **Browser evidence:** 桌面开场、真实鼠标与键盘比较、390px 触摸 + reduced-motion、纯 CSS fallback，4/4 通过
- **Quality:** FinalQuality 93 / WowGate 93；页面结构为 `catalog`，不是工作台、中央产品或持续 3D 长滚动
- **Stop reason:** 已达到阶段完成条件并写入 V2.5 示例库；同一目标不再继续生成版本。
