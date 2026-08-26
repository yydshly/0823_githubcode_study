# R41 梦境记录产品真实生成验收

## 交付契约

- Entry mode：brief-led / product case
- Request revision：R41
- Target user and context：希望在刚醒时快速记录梦境、并逐渐找回梦中空间关系的人。
- Desired first impression：像在真实清晨醒来，视觉仍带残余睡意；安静、可信，不像科幻控制台或抽象粒子演示。
- Visual ambition：Immersive
- Experience architecture：Hybrid Workspace。工作台负责生成与状态；最终页以持续全屏场景承载梦境叙事，DOM 承载可读文本和行动。
- Scene base：Three.js 持续 Canvas + 三段真实环境素材 + DOM 叙事层。
- Visual anchor：同一间刚醒来的卧室及其空间连续性，而不是一个漂浮几何物。
- State-to-scene mapping：开场为模糊真实房间；中段为房间结构裂解成可探索记忆路径；结尾重新收束到可记录今晚梦境的安静场所。
- Visual constraints：无紫色科技风、无霓虹 HUD、无中央海报框、无通用球体/圆柱主体；三张素材保持同一房间、镜头和晨光方向；Three.js 负责景深、视差、薄雾、记忆碎片和滚动连续性。
- Information constraints：首屏建立“刚醒来”的情绪；中段解释记忆如何被找回和组织；末段只保留“记录今晚的梦”主行动。
- Operation constraints：一次主按钮完成 Codex 解释、素材匹配、专属 bundle、四状态评审与最多一轮精修。
- State constraints：desktop opening/middle/final、390px mobile、reduced motion 均需 ready、可读、无溢出和阻断错误。
- Environment constraints：`http://127.0.0.1:8143`，Chrome + WebGL，desktop 1440×900，mobile 390×844。
- Primary journey：自然语言 brief → 三段正式素材 → Codex 独立网页 → 滚动形成空间 → 最终 CTA → 浏览器双门禁 → 唯一案例。
- Required artifacts：3 个项目内正式素材、最终生成 URL、首中尾和移动端证据、模型/素材/耗时记录、案例决策。
- Autonomy authorization：用户已提供完整真实 brief；可使用内置 ChatGPT 图像生成、Codex 5.6-sol 和项目内可逆生成/归档流程。
- User-decision boundary：不新增外部付费服务；MiniMax 仅在内置图像生成失败时备用。
- Observable completion criteria：三张素材具备连续空间与不同叙事状态；bundle 实际引用素材；滚动不是纯位移；最终机械与独立视觉验收通过；同一 brief 只归档最终版。

## 路由决策

- Selected pattern：DOM + WebGL scroll story / continuous environment transformation。
- Evidence branch：观测站三段连续环境与 R36 双重视觉门禁；不复用其造型或风格。
- Required inputs：用户 brief、三张连续卧室/记忆空间素材、Codex 5.6-sol。
- Expected output：真实房间逐渐转化为可探索梦境空间，并在结尾收束为记录行动的完整网页。
- What should update the skill：仅记录由本轮运行证明的连续素材与滚动状态结论，不扩展模板库。

## 覆盖记录

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 素材 | 同一房间形成三段连续状态 | generated assets | 三张 1672×941 项目素材与来源记录 | 0/2 | pass | 已登记为当前 brief 的 3 个 required assets |
| 生成 | brief 真实进入 Codex 主链 | workbench / job | `job-981dcdfe263015aa`、`gpt-5.6-terra`、`gpt-5.6-sol` | 1/5 | pass | 最终 bundle 为 `dedicated-8574ee46ab16` |
| 叙事 | 房间→记忆空间→记录行动 | desktop opening/middle/final | `evidence/r41-dream-journal-live/exact-state-final` | 2/3/5 | pass | 0 / 0.50 / 1.00 三状态可复现 |
| 跨端 | 移动端与降级可用 | mobile reduced | ready、Canvas=1、overflow=0、无浏览器错误 | 7/8 | pass | 390×844 检查通过 |
| 案例 | 只保存最终最佳版本 | case library | `/cases/dedicated-8574ee46ab16/` | 9 | pass | 仅归档最终精修版；失败候选不进入目录 |
| 交付 | 结果可直接打开和复现 | project | URL、构建、15 项定向测试 | 9 | pass | 页面、记录与验证已完成 |

## 素材规格

1. `dream-room-awakening-v1`：真实清晨卧室，刚醒的轻微离焦与残留睡意，建立空间和情绪。
2. `dream-memory-fragments-v1`：保持同一镜头与房间身份，墙面、床品、窗光以克制方式裂解为可进入的记忆路径。
3. `dream-night-record-v1`：保持同一空间连续性，碎片重新聚合为安静可停留的记录场所，为 DOM CTA 留出稳定阅读区。

三张均无人物、文字、Logo 和水印；作为全屏环境素材，不承担界面文字。

## 运行结果

- 最终页面：`http://127.0.0.1:8143/generated-runs/dedicated-8574ee46ab16/?quality=high&motion=full`
- 最终案例：`http://127.0.0.1:8143/cases/dedicated-8574ee46ab16/?quality=high&motion=full`
- 模型链：brief 解释使用 `gpt-5.6-terra`；专属 bundle、视觉修订与着色器修订使用 `gpt-5.6-sol`；MiniMax 未调用。
- 素材链：内置 ChatGPT 图像生成；开场母图 1,648,240 B，中段 1,509,494 B，结尾 1,731,294 B；三张均为 1672×941。中段和结尾以开场母图为唯一连续性参考重新生成。
- 实现结构：三张全屏 DOM 环境层保证叙事素材可靠可见；Three.js 使用单纹理、全屏羽化回声平面负责景深、指针视差与记忆气息；文案与 CTA 保持独立可访问。
- 视觉结论：开场、中段、结尾为同一房间和同一机位；中段无矩形叠片边界；结尾在原床头柜显示空白记录本，CTA 无卡片底色。
- 浏览器证据：desktop 1440×900 的进度为 0.0000 / 0.5002 / 1.0000；mobile 390×844 ready；Canvas=1；overflow=0；三张素材响应 200；errors=[]。
- 流程修复：SDK 在 `visual-review=1` 时跳过交互缓动并暴露 `data-generated-progress`；正式验收器与本地验证器同步发送 `signal-lab:preview-progress`，防止把中段误当成终点。
- 验证：4 个定向测试文件、15 项测试通过；`tsc --noEmit && vite build` 通过。Vite 仅保留已有的扩展名与大 chunk 警告。
- 案例决策：归档为 `refined`，未标记 `featured`。原因是最后一次独立截图器在保存截图阶段超时；当前页面本身已由同参数真实浏览器截图验证通过，后续修复截图器后可再提升评级，无需重做页面。
