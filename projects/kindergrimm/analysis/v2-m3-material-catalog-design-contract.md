# V2-M3 · Material Catalog Design Contract

## Design contract

| 字段 | 决策 |
| --- | --- |
| Entry mode | Brief-led implementation，基于已锁定 V2-M3 交付合同 |
| Request revision | 3 · Moonharbor Inkcut 素材产出扩展 |
| Target user and context | 研究者/内容设计者，在浏览器中验证非角色素材与风格语法解耦 |
| Desired first impression | 一眼看见同一组 Prop 在 Mosslight / Moonharbor Inkcut / Sunpatch 三种语法中的并排差异 |
| Visual ambition | Editorial |
| Experience architecture | Editorial Flow |
| Visual constraints | 延续 Kindergrimm 深色研究工具；素材预览使用纸张/织物浅色画布；不伪装 3D |
| Information constraints | Seed、Recipe FP、Visual FP、style FP、named parts、输出与来源必须可见 |
| Operation constraints | 生成 12 样本、切换/选择、四输出预览、确定性验证、ZIP 检查 |
| State constraints | loading、ready、selected、verified、Canvas fallback |
| Environment constraints | canonical 127.0.0.1:8882；桌面、390px、reduced-motion；dark-only product boundary |
| Primary journey | 输入 Seed → 生成 12 Recipe → 并排比较三套风格 → 选择素材 → 查看四输出 → 检查 ZIP |
| User-defined phases | Contract → Prop 双风格 → Catalog → Output/ZIP → Scene → Regression |
| Required artifacts | asset-catalog 页面、12×3 实际 Canvas 素材、四输出、Manifest/ZIP、浏览器证据 |
| Autonomy authorization | 用户明确“继续”，允许在既定 V2-M3 范围内直接实现 |
| User-decision boundary | 新增第三种 Prop 风格、外部发布、真实 3D 或后端服务需要另行决策 |
| Observable completion criteria | 12 Recipe 唯一；36 Visual 唯一；每资产 5/5 authored parts、0 upstream；四输出与 ZIP 可验证；390px 无横向溢出 |

## Visual direction

| 决策 | 方向 | 可观察约束 |
| --- | --- | --- |
| Composition | 左侧生成合同，中间双风格比较，右侧选中素材/输出 | 首屏能看见 Seed、两种 Style 和至少一组素材 |
| Focal hierarchy | 双风格资产板为主，控制与证据为辅 | 预览不被大标题或指标抢占 |
| Typography | UI sans + fingerprint mono | 长指纹不溢出，中文解释可读 |
| Palette | 深色工具外壳 + Mosslight 绿色 + Sunpatch 暖红 | 风格差异不依赖标签才能辨认 |
| Material | 纸张画布、细边框、少量织物/手绘暗示 | 不增加模糊、假景深或 3D 光照 |
| Motion | 只用于 loading/selection；reduced-motion 关闭 | 信息不依赖动画 |

## Coverage manifest

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Contract | Asset Type 与双风格语法可验证 | Node contract | 10/10 verifier | 0 | pass | 已关闭 |
| Prop 三风格 | 12 Recipe × 3 Style 实际 Canvas | desktop ready | 36/36 unique visuals + desktop screenshot | 1–3 | pass | 已关闭 |
| Catalog | Seed/选择/确定性主旅程 | desktop interaction | 12 unique recipes + browser interaction | 4–6 | pass | 已关闭 |
| Output/ZIP | 四输出与 stored ZIP/CRC | selected asset | 4 output records + 8-entry CRC-valid ZIP | 5–6 | pass | 已关闭 |
| Cross-surface | 390px、keyboard、reduced-motion | mobile / accessibility | mobile/reduced screenshots + keyboard focus audit | 7 | pass | 已关闭 |
| Capability | Canvas 不可用仍保留 Recipe/来源 | canvas=off | 12 recipes / 36 visual records / manifest enabled | 8 | pass | 已关闭 |
| Scene | Prop/Icon/Scene Component 真实组合 | runtime scene | 12 recipes / 36 visuals / 3 embedded generated props | 8 | pass | 已关闭 |
| Regression | V2-M2/M1/M0/v1 不回退 | Node suites | 10/10 + 7/7 + prior suites all pass | 9 | pass | 已关闭 |

当前 owning stage：Stage 9 · Completion audit closed。
## Revision 2 · Output Effect Showcase

用户要求“重点看产出、看效果”。保留原合同与已通过能力，重新打开视觉层级、场景效果、交付形态和跨表面证据；不新增后端、第三风格或 3D。

| 决策 | 方向 | 验收标准 |
| --- | --- | --- |
| Entry mode | Revision-led | 保留原确定性与导出能力，只重排效果展示层 |
| Desired first impression | 首屏先看到同一 Scene Recipe 的 Mosslight / Sunpatch 完整场景效果 | 1440×900 内两个场景均可见，不需要滚动到页面末端 |
| Focal hierarchy | 真实场景产出 > 双风格素材矩阵 > 指纹/机制说明 | 场景图面积和位置成为中心主视觉 |
| Interaction | 点击任一风格场景切换选中素材和四输出 | 场景按钮可键盘操作，状态与 Inspector 同步 |
| Capability boundary | Canvas2D enhancement；Recipe/Visual/Manifest 为基础层 | canvas=off 保留可读成果记录与禁用图像状态 |
| Performance | 仅生成当前 Scene Recipe 的两套场景预览 | 首屏构建无 console error，结果在可接受时间内出现 |

### Revision coverage

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 看产出 | 双风格真实场景进入首屏 | desktop ready | stage bottom 663px + 2×1200×600 images + screenshot | 2–3 | pass | 已关闭 |
| 看效果 | 点击场景联动 Style、Inspector 与四输出 | desktop interaction | mouse + keyboard style/output fingerprint transition | 4–6 | pass | 已关闭 |
| 移动效果 | 390px 场景堆叠且无横向溢出 | mobile ready | viewport/scrollWidth 390 + stacked screenshot | 7 | pass | 已关闭 |
| 降级效果 | Canvas-off 明确显示记录可用、图像不可用 | canvas=off | 2 visual records / 0 rendered / fallback visible | 8 | pass | 已关闭 |
| 工程闭环 | M3 contract/browser 与既有回归不退化 | Node suites | M3 10/10 + browser 8/8 + full regression pass | 9 | pass | 已关闭 |

当前 owning stage：Stage 9 · Revision 2 completion audit closed。
## Revision 3 · Moonharbor Inkcut Prop & Scene Output

用户再次要求继续，且上一轮明确下一步是增加风格素材包与主题场景组合。本切片复用项目已交付的 Moonharbor Inkcut 结构语言，为 Prop 与 Scene Component 增加第三套独立材质/笔触实现。

| 决策 | 方向 | 验收标准 |
| --- | --- | --- |
| Entry mode | Revision-led | 保留 Mosslight / Sunpatch 与全部输出、ZIP、fallback |
| Baseline | 12 recipes / 24 prop visuals / 24 scene visuals / 2 showcase styles | 基线截图保存在 .tmp，不作为新交付证据 |
| New style | Moonharbor Inkcut Props | 独立 rendererId、palette、4+ grammar tokens 与 renderer 分支 |
| Visible grammar | angular silhouette、hard ink edge、hatching、signal cyan | 不能落入 Mosslight soft wash 或 Sunpatch blanket stitch 分支 |
| Output scale | 12 Recipe × 3 Style = 36 Prop Visuals；12 Scene × 3 Style = 36 Scene Visuals | 指纹全唯一、named parts 5/5、0 upstream |
| Showcase | 同一 Scene Recipe 三风格首屏对照 | 桌面三列；390px 三卡纵向；点击/键盘联动四输出 |
| Boundary | 仍为程序化 Canvas2D | 0 runtime LLM、0 cloud API、非 3D |

### Revision 3 coverage

| User phase | Requirement | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 第三风格产出 | Inkcut Prop grammar + renderer | contract / canvas | 12 rendered props + e008924b grammar + hard-edge/hatch branch | 2–3 | pass | 已关闭 |
| 三风格效果 | 3 Scene visuals 首屏同 Recipe 对照 | desktop ready | stage bottom 621px + 3 unique visual FP + screenshot | 2–3 | pass | 已关闭 |
| 产出联动 | Inkcut 切换后四输出全部更新 | desktop interaction | four Inkcut FP + 3-style manifest + 8-entry CRC ZIP | 4–6 | pass | 已关闭 |
| 多表面 | 390px/reduced-motion/Canvas-off | environment matrix | 390 width + 3 fallback records + reduced-motion pass | 7–8 | pass | 已关闭 |
| 工程闭环 | golden + M3 + 历史回归 | Node suites | M3 10/10 + browser 8/8 + all historical suites pass | 9 | pass | 已关闭 |

当前 owning stage：Stage 9 · Revision 3 completion audit closed。
