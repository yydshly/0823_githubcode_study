# V2-M2 · Third Structural Style Decision

## 决策

第三套独立结构风格采用 Sunpatch Felt 2D：

- Pack id：sunpatch-felt-2d
- Renderer id：sunpatch-felt-2d
- Media id：sunpatch-felt
- 表示：本地确定性 Canvas 2D 部件 → CanvasTexture planes
- 来源：local-authored procedural 2D；低层 makePart / RNG / Group 协议来自固定上游 Unlicense 提交
- AI / cloud：0 runtime LLM calls；0 cloud API calls

## 为什么选择毛毡贴花

| 已有风格 | 主要结构语言 | 主要材质语言 |
| --- | --- | --- |
| Mosslight Core | 圆润童话比例、叶冠、斗篷、灯笼 | gouache、柔边、苔光颗粒 |
| Moonharbor Inkcut | 窄长比例、角面面具、硬边服装、信号道具 | 深色墨块、斜线 hatch、纸张切割感 |
| Sunpatch Felt | 宽短软体比例、层叠布片、圆角兜帽、纽扣与口袋 | felt grain、毛边、blanket stitch、布艺贴花 |

Sunpatch 在轮廓、比例、五官、服装主体、边缘和材质上都有独立语法，能够证明 Style Renderer 扩展不依赖换色。它也天然适合头像、卡片和透明 Sprite 等素材输出。

## 结构范围

至少 18 个 feature ids，覆盖：

- head：felt-head、felt-ears、felt-hair-patch、felt-hood
- face：button-eyes、thread-brows、patch-nose、stitched-mouth、freckle-knots
- body：soft-shadow、felt-body、belly-patch
- limbs：felt-arms、felt-feet
- clothing：scallop-cape、blanket-collar、utility-pocket
- prop：sun-token、spool-lantern

单角色目标 24–28 authored visible planes；0 Mosslight / Inkcut visible parts。

## 视觉语法

- silhouette：宽短、圆角、略不对称的手工裁片。
- edge：深色 blanket stitch 与短纤维毛边，不使用 Inkcut miter contour。
- fill：低对比 felt grain、叠片阴影、局部补丁，不使用 Gouache wash。
- face：纽扣眼、线缝眉嘴、布片鼻；表情通过合法状态纹理变化。
- palette：oat、tomato、sunflower、sage、denim、plum、thread。
- variation：patch shape、stitch spacing、hood notch、pocket side、button type、token glyph。

## 输出适配

| Output Profile | 构图 |
| --- | --- |
| transparent-character | 全身透明背景，保留脚下软阴影 |
| portrait-avatar | 头肩裁切，强化纽扣眼和兜帽边缘 |
| card-catalog | 全身 + 风格标签 + Recipe / Visual identity |
| sprite-sheet | 与现有批次合同一致的透明 row-major atlas |

## 退出门槛

1. 独立 module、descriptor、Pack、Visual Record 与 tamper check。
2. 50 Recipe / 50 Visual fingerprints；human、cat、dog。
3. 每角色 0 既有风格 visible-part reuse。
4. Factory、Studio、Runtime 与四种 Output Profiles 可消费。
5. 390px、reduced-motion、WebGL-off、ZIP/CRC、预算和三层回归通过。
