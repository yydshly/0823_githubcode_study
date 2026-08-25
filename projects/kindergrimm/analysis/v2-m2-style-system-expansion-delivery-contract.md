# V2-M2 · Style System Expansion Delivery Contract

## 状态

DONE · 2026-08-25

## 主目标

继续研究 Kindergrimm 的程序化素材生成机制，并基于上游的 Seed、Recipe、CanvasTexture part、Three.js plane/group 与 animator 协议，建立可持续扩展素材风格的方式。V2-M2 不建设通用骨骼系统，也不把项目改造成游戏引擎。

## 研究问题

1. 上游哪些参数真正改变轮廓、表情、服装、媒介和部件组合？
2. 哪些能力属于 Recipe，哪些属于 Renderer，哪些只属于展示页面？
3. 如何新增风格而不复制 Mosslight 或 Inkcut 的可见部件？
4. 同一个素材身份如何输出透明角色图、头像、卡片图和 Sprite Sheet？
5. 风格扩展如何保持确定性、来源、预算、打包和运行时可消费？

## 架构边界

~~~text
Upstream capability evidence
        ↓
Seed + Recipe identity
        ↓
Style Renderer
  ├─ silhouette / proportion
  ├─ authored parts
  ├─ stroke / fill / material grammar
  └─ palette and variation bounds
        ↓
Output Profile
  ├─ transparent character
  ├─ portrait / avatar
  ├─ card / catalog preview
  └─ sprite sheet
        ↓
Factory / Studio / export / scenario demo
~~~

角色 anatomy、动作和 socket 只在某种素材风格或输出确实需要时作为局部支撑能力，不作为 Program 主线。

## 必须交付

1. 上游能力到本地扩展的 traceability matrix：源码机制、现有效果、可扩展接口、限制与证据。
2. Style Renderer 模板与 capability descriptor，明确结构、笔触、材质、palette、部件覆盖和预算。
3. 在 Mosslight 与 Inkcut 之外新增至少一套真正独立的 2D 风格 Renderer；不得只换 palette、CSS 或页面背景。
4. 三套结构风格对同一组固定 Recipe 进行并排审查；每套至少 50 个可复算 Visual fingerprints。
5. 至少四种 Output Profiles：transparent character、portrait/avatar、card/catalog、sprite sheet。
6. NPC Factory 支持风格与输出档案选择；Production Studio 支持同素材身份的风格/输出比较。
7. 至少三个使用场景演示：游戏角色、叙事头像/对话、卡牌或素材目录；均消费导出的真实素材记录。
8. Manifest、PNG、Sprite Sheet、ZIP、CRC、provenance、390px、reduced-motion 与 WebGL-off 证据。

## 不可偏离

- 每个新增能力必须能回指 Kindergrimm 上游机制或明确标注为本地扩展。
- 重点是素材的样式、类型、输出和使用能力，不建设通用战斗、骨骼、AI 或关卡系统。
- 不把 2D 平面空间感称为 3D 素材；真正 3D 继续属于独立 Program。
- AI 最多作为可选参考或意图适配层，不进入确定性 Renderer 核心。
- v1 Release df8ac08c、V2-M0 family 与 V2-M1 Inkcut 必须持续回归通过。

## Gate

| Gate | 退出条件 |
| --- | --- |
| G1 Research | traceability matrix 覆盖生成、部件、媒介、动画、导出与限制 |
| G2 Style | 至少三套结构风格；新增 Renderer 0 既有 visible-part reuse |
| G3 Output | 四种 Output Profiles 均由同一 Recipe / Visual 身份确定性派生 |
| G4 Visual | 每套 50 golden；同槽对照可辨识结构与笔触差异 |
| G5 Portability | PNG / Sheet / Manifest / ZIP / CRC / provenance 可恢复 |
| G6 Scenarios | 游戏角色、叙事头像、卡牌/目录三个场景使用真实导出能力 |
| G7 Regression | V2-M1 10 / 10、V2-M0 8 / 8、v1 release 8 / 8 |

## 实现顺序

上游能力矩阵 → Style Renderer 模板 → 第三风格后端 → Output Profiles → Factory → Studio → 场景演示 → 浏览器与回归矩阵。

## 完成定义

只有当研究证据、第三结构风格、四类素材输出、真实场景演示、可迁移打包和三层回归同时通过，V2-M2 才能标记 DONE。单纯增加下拉选项、换色或页面效果不构成完成。

完成证据见 analysis/v2-m2-completion-report.md、analysis/v2-m2-output-use-case-matrix.md、analysis/v2-m2-output-profile-browser-review.json 与 analysis/v2-m2-sunpatch-scene-browser-review.json。
