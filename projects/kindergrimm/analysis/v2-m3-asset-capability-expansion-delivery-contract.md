# V2-M3 · Asset Capability Expansion Delivery Contract

## 状态

DONE

## 主目标

复用已经验证的 Seed、Recipe、Style Renderer、Output Profile、Manifest 与 ZIP 体系，把 Kindergrimm 从“多风格角色素材”扩展为“角色周边素材族”。重点是素材类型和风格语法复用，不建设通用游戏系统。

## 第一批素材类型

1. Prop / Item：灯笼、包、徽章、卷轴、路标等透明可拾取或可摆放素材。
2. Icon / Emblem：由 Prop/Identity 派生的 UI 图标、任务标记和卡片徽记。
3. Scene Component：摊位、路牌、灯柱、植物、布旗等模块化 2D 场景摆件。

## 架构

~~~text
Asset Type Recipe
      ↓
Style Grammar Adapter
  ├─ Mosslight
  ├─ Inkcut
  └─ Sunpatch Felt
      ↓
Named Parts + stable ids
      ↓
Output Profiles
      ↓
Factory / Catalog / Runtime Scene
~~~

## 必须交付

- Asset Type Contract：type、slots、parts、bounds、anchor、output roles 与 provenance。
- 至少 3 类非角色素材，且每类至少 12 个确定性样本。
- 至少 2 套结构风格能生产同一种 Prop，证明风格语法与素材类型解耦。
- 透明 PNG、icon、catalog card、sheet 与 ZIP 可导出。
- 组合场景必须真实消费场景组件和 Prop，不用 CSS 占位图冒充素材。
- 不修改 v1 release，不破坏 V2-M0/M1/M2 回归。

## 不做

- 不建设库存、战斗、关卡、导航或通用 ECS。
- 不把角色 anatomy 或动作系统当作主线。
- 不把 2D 场景摆件称为 3D 模型。
- AI 不进入确定性 Renderer 核心。

## Gate

| Gate | 退出条件 |
| --- | --- |
| G1 Contract | Asset Type 与 Style Grammar Adapter 合同可验证 |
| G2 Types | 3 类非角色素材 × 12 deterministic samples |
| G3 Cross-style | 同一种 Prop 至少有 2 套独立风格实现 |
| G4 Output | PNG / icon / card / sheet 的 Output Record 完整 |
| G5 Scene | 真实组合场景消费 Prop 与 Scene Component |
| G6 Portability | Manifest / ZIP / CRC / provenance PASS |
| G7 Regression | V2-M2、V2-M1、V2-M0、v1 全部持续通过 |

## 实现顺序

Asset Type Contract → Prop 最小闭环 → 多风格 Grammar Adapter → Icon 派生 → Scene Component → 组合场景 → 打包与回归。
## 完成证据

- G1 Contract：Asset Type、Visual Record、Output Record、Style Grammar 与 Scene Component 合同验证 10/10 PASS。
- G2 Types：Prop、Icon、Scene Component 各 12 个确定性样本；浏览器样本指纹全部唯一。
- G3 Cross-style：同一组 12 个 Prop 由 Mosslight Gouache、Moonharbor Inkcut 与 Sunpatch Felt 三套独立 renderer/grammar 生成，36 个 Visual FP 唯一。
- G4 Output：transparent prop、inventory icon、catalog card、prop sheet 四类真实 Canvas 输出及 Output Record 完整。
- G5 Scene：12 个 Scene Component recipes、36 个三风格 visuals；每个场景实际嵌入 3 个生成 Prop。
- G6 Portability：8-entry stored ZIP、Manifest、CRC 与 provenance 全部通过。
- G7 Regression：V2-M2 Output 9/9、V2-M2 Style 10/10、V2-M1 10/10、V2-M0 8/8、v1 8/8。
- 环境：桌面、390px、reduced-motion、Canvas-off 与键盘主旅程均通过。
- 运行时：0 LLM calls、0 cloud generation calls、0 upstream visible parts。

## 交付入口

- Material Catalog：`asset-catalog/index.html`
- 完成报告：`analysis/v2-m3-completion-report.md`
- Golden fixture：`fixtures/golden/v2-m3-asset-types.json`
- Browser review：`analysis/v2-m3-browser-review.json`
