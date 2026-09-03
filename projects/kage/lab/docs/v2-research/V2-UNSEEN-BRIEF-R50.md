# V2 未见主题端到端验证 R50

## 设计契约

- Entry mode: Brief-led validation
- Request revision: R50
- Target user and context: 独立剧场灯光设计师在浏览器中快速排练一幕舞台的灯位、光束与 cue。
- Desired first impression: 像真实黑盒剧场的灯光排练台，安静、专业、可操作，而不是通用科技海报。
- Visual ambition: Immersive + Functional
- Experience architecture: Spatial Stage；舞台始终是操作表面，参数和 cue 作为前景控制层。
- Scene base: Three.js / WebGL；DOM 承担灯具选择、参数、照度证据和保存动作。
- Scene persistence: 从选择灯具、调整光束、切换 cue 到保存方案，始终保留同一舞台与灯位关系。
- Foreground control model: 灯具选择、俯仰/方位/光束角/亮度/色片、cue 切换和保存操作均可键盘访问。
- State-to-scene mapping: 选择灯具 → 调整灯位 → 光束/落点/阴影/照度同步变化 → 切换 cue → 保存第一幕方案。
- Mobile transformation: 舞台保留为主视觉，控制面板变为紧凑抽屉或底部控制区，不退化为长篇叙事页面。
- Fallback: 无 WebGL 或 reduced-motion 时保留灯具参数、cue、照度说明与保存操作。
- Visual constraints: 黑盒舞台、暖白工作灯、钨丝橙和少量真实色片色；不要紫色科技风、巨大标题、随机粒子、中央装饰球或固定三屏长滚动。
- Information constraints: 只展示完成灯光排练所需的灯具、角度、亮度、色片、cue 和照度状态。
- Operation constraints: 单一 Codex 候选，最多一次有明确证据的必要修订；不调用 MiniMax，不新增外部服务。
- State constraints: 控件值与可见值一致；操作必须同时改变舞台视觉与可读结果；照度、亮度和 cue 不得互相矛盾。
- Environment constraints: `http://127.0.0.1:8143`；桌面、390px 手机、键盘、reduced-motion 和 WebGL fallback。
- Primary journey: 选择灯具 → 调整光束 → 观察舞台与照度 → 切换 cue → 保存“第一幕灯光方案”。
- User-defined phases: 生成；浏览器验收；归档决定。
- Required artifacts: 一个专属运行、最终质量结论、少量真实浏览器证据、本研究记录。
- Autonomy authorization: 用户已明确“继续”，允许本项目内可逆生成、验证和必要的一次修订。
- User-decision boundary: 不发布远端、不增加付费服务、不自动晋级精选案例。

## 验证 brief

> 为独立剧场灯光设计师制作一个实时灯光排练台网页。中央始终是同一个真实感黑盒舞台，用户选择 1—3 号灯并调整俯仰、方位、光束角、亮度和色片时，舞台上的光束、落点、阴影与照度读数必须同步变化；可以切换排练 cue，最后保存“第一幕灯光方案”。视觉像真实排练厅的工作灯与纸质灯位图，使用黑、暖白、钨丝橙和少量色片颜色。不要紫色科技风、巨大标题、随机粒子、中央装饰球或固定三屏长滚动。

## 覆盖记录

| 用户阶段 | 要求 | 状态 / 表面 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 生成 | 新主题被路由为灯光排练工作区 | 合同与专属运行 | `dedicated-639b6558bc63` | Stage 0/1 | done | 合同由错误的 editorial/dom-only 修正为 product-atmosphere/interactive-field/dom-three-hybrid |
| 浏览器验收 | 舞台是持续操作表面，控件可用 | 桌面默认与操作后 | `01-source-opening.jpg`、`02-cue18-adjusted.jpg` | Stage 2—6 | done | 03 号灯、方位 65°、俯仰 35°、光束 50°、亮度 88% 后照度变为 473 lx；保存状态可见 |
| 浏览器验收 | 产品在窄屏和降级路径仍可完成 | 390px、reduced-motion、WebGL off | `03-mobile.jpg`、自适应机械评审 | Stage 7/8 | done | 机械门 100；独立视觉评审指出移动端操作闭环证据不足 |
| 归档决定 | 只有最终质量达标才进入案例库 | 最终候选 | 独立视觉验收 | Stage 9 | done | 82 分 / revise；保留研究运行，不进入精选案例库 |

## 可观察完成标准

1. 首屏可识别为灯光排练台，而不是通用 3D 展示页。
2. 至少一次真实控件操作同时改变控制值、可见读数与舞台光照结果。
3. 舞台与控制关系在产品需要的状态间连续，不制造无意义的固定三页。
4. 桌面、移动端、reduced-motion 和无 WebGL 路径均不阻断核心信息与操作。
5. 自动质量门通过后才允许归档；未通过则记录明确原因并停止无限精修。

## 本轮结论

- 有效候选：`dedicated-639b6558bc63`；预览 `/generated-runs/dedicated-639b6558bc63/?quality=high&motion=full`。
- 生成耗时主要来自模型：创意解释约 87 秒；第一次专属代码约 147 秒后编译失败；第二次约 132 秒成功。浏览器机械复验约 11 秒，独立视觉判断约 34 秒。
- 代码失败已转化为生成约束：Three.js `mesh.material` 必须处理单材质与材质数组联合类型；初版限制为 4 个必要文件、目标源码不超过 18 KB。
- 可用性证据：桌面 1 个 Canvas、12 个可见控件、无横向溢出和运行错误；参数、照度、cue 与保存反馈有因果变化。390px 页面无横向溢出，但页面高度超过单一视口。
- 独立视觉结果：机械 100；视觉 82 / revise。主要阻断是移动端截图未完整证明“调参—结果—保存”的闭环；次要问题是舞台略暗、最终 cue 完成感偏弱。
- 决策：不继续开放式精修，不进入精选案例库。本轮已经证明 V2 约束可生成非固定三屏、产品专属的语义 Three.js 工作区，也暴露了移动端验收证据与首轮代码稳定性仍需加强。
