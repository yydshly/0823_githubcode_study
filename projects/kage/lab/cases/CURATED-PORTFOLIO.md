# 案例库分层（R71）

案例库服务于第一目标：证明系统能够把自然语言想法转化为具有主题辨识度、交互意义和可运行质量的网页。它不是所有生成结果的历史列表。

## 精选最终案例

精选案例是当前最适合直接展示项目能力的成品，只保留同一目标的最佳版本：

- `dedicated-ba4e9d10caaa-depth-field`：先锋时装，模型素材、无边界融合与 2.5D 景深。
- `dedicated-r36-delivery-final`：夜生表皮温室，连续资产叙事与滚动转化。
- `dedicated-1edb98865f4c`：智能声音产品，专属主体、声场与发布叙事。
- `dedicated-7c944e0c386f`：纸张修复工坊，同一页文献的连续修复旅程。
- `dedicated-191bc3ce2125`：窗边风谱仪，输入、物理响应与数据证据同步。
- `dedicated-b4d381a24320`：云杉音板调校台，同一主体的视觉状态、参数证据与 Web Audio A/B 声学反馈同步。
- `dedicated-braille-r121-repair`：六点光穹盲文练习场，标准六点阵列、直接选择、结果说明与保存行动共享同一状态；机械验收 100、独立视觉验收 92。

## 研究案例

研究案例已经可运行并经过针对性验证，但主要价值是沉淀一种方向、机制或边界，不与精选案例争夺主入口：

- `dedicated-8574ee46ab16`：梦境记录，同一房间的醒来与记忆空间。
- `dedicated-ef118f0f4962`：气味标本室，混合比例改变场景与记忆文字。
- `dedicated-1b9f0b05107b`：雨声记录器，产品、雨窗环境与声学反馈。
- `dedicated-c0514ddead80`：徐汇滨江饮水图册，真实地理与演示数据的边界。
- `dedicated-896cfb7e6657`：云上观测站，三段连续空间与电影化连接。
- `dedicated-mortise-final-r65`：榫卯结构，几何校正与滚动装配。
- `dedicated-lantern-final-r65`：折叠露营灯，同一产品的四状态叙事。
- `dedicated-53ab257bae4f`：发酵观察工作台，滚轮、参数和主体状态同步。
- `dedicated-76102bb2158c`：城市放映记忆，同一街区的年代档案。
- `dedicated-5694e0a3a022`：社区风扇诊断，明亮工具型界面与程序化装配。
- `dedicated-woodblock-adaptive-r46`：和纸木版套印，同一画布上的五状态自适应工序。

## 能力基准

- `capability-resonance-flagship`：资产驱动产品电影。
- `capability-tidal-archive`：环境、档案关系与空间叙事。
- `capability-coastline-evidence`：1984—2026 年份、海岸形态和证据数值同步变化。

## 不展示但保留追溯

以下目录不进入 `cases/catalog.json`，因此不会出现在案例页；它们只承担中间过程或被替代版本的追溯：

- `dedicated-5dfdc4d0650e`、`dedicated-ac182411e506`：已被同目标最终版替代。
- `dedicated-woodblock-asset-r32`：版画工序研究中间版本，已被自适应最终版替代。
- `dedicated-7d00f0096507`：平面证据和异常防护研究可追溯，但视觉代表性不足，不占用公共案例名额。
- `dedicated-f9ed58e5b7ea`：午夜电台研究样本保留在 `cases/runs` 与 `generated/runs`，但独立视觉验收为 `revise / 71`，主题锚点、交互因果和移动端构图均有重大缺陷；案例库达到 20 条上限后，由已通过 `pass / 92` 的六点光穹替换其公共名额，不删除生成证据。

`generated/runs` 和 `generated/jobs` 是运行数据，不自动成为案例。目录存在不等于质量通过。

## 维护规则

- 同一 brief 只保留一个最佳案例。
- 只有 `featured` 或 `refined` 条目进入 `cases/catalog.json`；前者显示为精选，后者显示为研究。
- 新结果没有明显胜出时，不替换现有案例。
- 案例必须有可运行代码、正确封面素材和基本浏览器证据。
- 模型调用成功、编译成功或生成了图片，都不等于案例质量通过。
- 失败、中断和被替代结果不进入公共案例页，也不触发自动反复修复。

详细门槛与阶段停止条件见 `docs/CASE-PORTFOLIO-AND-PROJECT-ASSURANCE-R42.md`。
