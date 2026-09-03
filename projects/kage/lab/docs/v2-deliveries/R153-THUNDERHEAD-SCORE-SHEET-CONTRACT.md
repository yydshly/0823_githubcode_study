# V2 R153 · 雷暴气象乐谱重构

## 设计契约

- Entry mode：revision-led；用户确认 R149 与 R152 视觉骨架相似，要求继续推进并消除模板惯性。
- Request revision：R153 / 1。
- Target user and context：浏览沉浸式创意网页的普通访客；需要第一眼辨认出雷暴主题，也要感到这不是上一案例换图换文案。
- Desired first impression：一张正在演奏的气象乐谱，而不是铺满屏幕的摄影海报。
- Visual ambition：Immersive。
- Experience architecture：Spatial Stage；同一雷暴因果状态持续存在，但改为明亮纸面、局部摄影窗口、垂直阶段谱与编辑式信息关系。
- Scene base：保留已验证的雷暴环境素材、Canvas 天气轨迹和 Web Audio；素材从全屏背景改为受控的气象窗口。
- Scene persistence：滚动四阶段始终可见；窗口形态、图像位置、光、电荷、雨线和数据共同变化。
- Foreground control model：滚轮推进、指针改变风切、按钮/空格控制声音、垂直谱点跳转、完成后保存。
- State-to-scene mapping：上升、塔云、电荷、降雨继续共享同一状态；视觉由纸面留白、窗口裁切、相位色与纵向谱线表达。
- Mobile transformation：摄影窗口位于上半屏，文字与阶段说明形成下半屏，谱点保留为紧凑横向控件。
- Fallback：Canvas 或主素材失效时保留纸面结构、阶段、交互与保存行动。
- Visual constraints：不新增暗色/亮色、3D、三屏、素材来源等全局规则；本轮只依据已观察到的宏观骨架重复进行一次案例修订。
- Operation constraints：不生成新素材；一次结构重构；最多两次确定性修复；不扩展新案例。
- Environment constraints：`npm run dev:8143`；目标 URL 为 `http://127.0.0.1:8143/pages/v2/deliveries/thunderhead-score/?quality=high&motion=full&revision=r153-score-sheet`。
- Primary journey：进入气象乐谱 → 滚轮穿过四个乐章 → 指针改变风切并看到/听到变化 → 保存合唱谱。
- Autonomy authorization：用户已要求“继续”，无需再次确认可逆的项目内修订。
- User-decision boundary：不部署、不提交远端、不重做 R149、不修改其他案例。
- Observable completion criteria：桌面首屏主图宽度小于视口 70%，页面为明亮编辑纸面与局部窗口；不再使用底部横向全屏阶段轨道；既有滚轮、指针、声音、保存、390px 与降级旅程仍通过。

## 覆盖记录

| 用户阶段 | 要求 / 产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 结构纠偏 | 从全屏摄影海报改为气象乐谱 | desktop opening | 首屏截图与 DOM 几何 | 2–3 | pass | 主图宽度低于视口 70%，垂直谱轴通过 |
| 因果保留 | 滚轮、风切、声音、保存保持联动 | desktop states | 浏览器旅程 | 5–6 | pass | 中段与完成态通过 |
| 跨表面 | 390px、减少动态、双回退 | required surfaces | Playwright | 7–8 | pass | 真素材手机态与双回退通过 |
| 工程闭环 | 类型、构建、最终身份与归档预览 | repository | 定向测试与 final record | 9 | pass | 最终身份与预览已更新 |

## 当前观察与干预

- Observed evidence：R145、R149、R152 都以生成环境图铺满视口，并叠加大型标题、细线导航与阶段轨道；主题不同但宏观构图可互换。
- Root cause：候选方向在语义上不同，但没有把“图像承担什么版面角色、控制沿哪个轴组织、文字与场景是什么空间关系”落实为构建差异。
- Minimal intervention：只修订 R152 的页面拓扑和构图；保留已验证素材与因果代码，不引入新的技术或素材批次。
- Adjacent regression surfaces：真实滚轮、指针、声音、保存、390px、减少动态、Canvas fallback、asset fallback。
- Observed result：桌面开场改为亮色纸面与局部倾斜云体窗口；中段说明依附窗口边界；完成态保持左右编辑构图。手机端主图、文字和阶段轴形成上下节奏，真素材与回退均可用。
- Decision：pass；R153 替换 R152 成为同一路由当前精选，R152 仅保留为研究历史。

## 最终结论

- 最终 `runId`：`direct-r153-thunderhead-score-sheet`。
- 最终 `bundleHash`：`c03da35dd9edbef7fe1477927335269adff30639fd4f1f04c8e28a465989f710`。
- 新增素材批次：0；沿用已验证雷暴环境素材，没有为了改风格重新生图。
- 结构差异：从 `full-bleed image + title overlay + bottom rail` 改为 `light score sheet + bounded storm aperture + vertical movement axis`。
- 因果保留：滚轮阶段、指针风切、程序化声音和保存结果全部通过。
- 限制反思：本轮没有新增全局样式禁令，也没有规定后续必须使用亮色、局部窗口或垂直轴；只是依据真实浏览器证据纠正当前案例。

## 验证记录

- `npx tsc --noEmit`：通过。
- R153 Playwright：3 个场景通过，覆盖桌面开场、中段、保存、390px 真素材、减少动态及 Canvas/素材双回退。
- 定向 Vitest：2 个文件、4 个测试通过。
- 最终证据：
  - `docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/01-desktop-opening.png`
  - `docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/02-desktop-charge.png`
  - `docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/03-desktop-saved.png`
  - `docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/04-mobile-charge.png`
  - `docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/05-mobile-fallback.png`
  - `docs/v2-research/evidence/r153-thunderhead-score-sheet.final.json`
