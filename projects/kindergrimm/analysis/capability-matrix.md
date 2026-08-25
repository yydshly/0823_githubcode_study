# Kindergrimm 全入口能力矩阵

基线提交：`de339ad739d8cbd28ff2dd4a940af38c0ede86c8`。除特别说明外，所有入口均已在本地 `serve.py` + Chromium 中打开、截图并检查页面错误。

| 入口 | 类别 | 展示能力 | 已验证交互 | 结果 |
| --- | --- | --- | --- | --- |
| `/` | 菜单 | 14 个演示路由和视觉缩略图 | 导航元素快照 | 通过 |
| `/orla` | 游戏 | 10 选 5 的班级合影、扑克式组合评分、两轮照片 | Canvas 选五人、拍照、评分 | 通过，示例 440 分 |
| `/game` | 游戏 | 纸片角色进入 3D 暗场、光照可见性、集体移动、自动战斗、装备 draft | 开始、地面移动、旋转/缩放、奖励 | 通过 |
| `/marbles` | 游戏 | 冰道、蓄力拖拽、碰撞、自动战斗、波次、Boss、升级、音乐 | 开始、拖拽发射、远端战斗 | 通过 |
| `/editor` | Drawn 2D | recipe、种子、物种、媒介、颜色、20 部件、姿势、表情、动画开关 | 固定种子、锁定、表情+攻击、局部面板 | 通过 |
| `/crowd` | Drawn 2D | 7×5 活角色、物种/媒介过滤、群体微行为 | 页面、群像、错误检查 | 通过 |
| `/items` | Drawn 2D | 13 物品族 × 4 品阶 contact sheet | 全页生成 | 通过，156 canvases |
| `/how` | 教学 | pencil、shape、material、head、map、parts、species、boil、face、pose、seed | 11 个 live step | 通过，3 canvases |
| `/voxel` | Voxel 3D | 同一 recipe 思想转为 cells、可旋转角色、表情与调色板 | 页面、调试 stats/audit | 通过，audit 0 issue |
| `/voxelcrowd` | Voxel 3D | 20 个实体角色装配、月夜平台、真实灯光和阴影 | 完整队列、统计、帧率烟测 | 通过，约 81k–83k tris |
| `/gloss` | Gloss 3D | Q 版实体角色、体型、姿态、调色板、材质、表情、局部参数 | 页面、构建统计 | 通过，示例 61k verts |
| `/glosscrowd` | Gloss 3D | 7×5 表情群像、视线和反应、筛选 | 等待 35/35、统计、帧率烟测 | 通过，约 6.35M–6.68M verts；性能高风险 |
| `/photo` | Gloss 3D | 一个 seed 生成巨人、班级、天气和花园的摄影棚合影 | 页面、队列统计 | 页面通过；早调 `stats()` 有时序缺陷 |
| `/objects` | Object 3D | grass / plant / tree / flower 的实体对象生成器 | 参数页、bounds/stats | 通过，示例 10,994 verts |
| `/pipes` | 实验 | 三层活示意图、自绘、角色沿管线移动、八站观察 | settle、board、reveal 调试 API | 通过，示例 13 figures |

## 纸片角色内容注册表

- Species：human、dog、cat、nightmare。
- Media：graphite、ink、watercolour、oil、charcoal/chalk、marker。
- Parts：tail、legs、torso、arms、wings、paws、quad legs、offhand、held、hair、crest、skull、ears、eyes、brows、nose、mouth、extras、tears、worn。
- Poses：idle、walk、run、sit、sleep、attack、play。
- Expressions：idle、angry、scared、crying、sleeping。
- Items：sword、bat、wand、shield、crown、hat、charm、doll、mutation、lamp、lantern、toy、bed。
- Ranks：sketch、inked、gilded、nightmare。

## 其他生成后端

### Voxel

- Species：human、dog、cat、nightmare。
- Palettes：graphite、crayon、clay、gloom、candy。
- 14 个 build-order parts；cell ownership 避免 z-fighting。

### Gloss

- Casting profiles：wildcard、bear、bunny、cat、monster、rock、slime、humanoid、robot。
- Body：sphere、cube、rock、slime；stance：none、biped。
- 14 套 palette；11 种 material，包括 glossy、rubber、ceramic、pearl、flocked、wood、wool、resin、chrome、crazed、skin。
- 12 个部件：body、frame、crest、hair、hat、eyes、brows、specs、nose、mouth、blush、mark。

### Objects

- Species：grass、plant、tree、flower、wildcard。
- Parts：mound、stem、leaves、bloom。
- Palettes：meadow、lime、fern、bloom、desert、tundra。
- Finishes：matte、glaze、fuzz。

### Marbles

- 7 个弹珠种类：popper、ember、frost、spike、bolt、boulder、goo。
- 12 个敌人种类：mote、walker、runner、spitter、bomber、splitter、carapace、mender、brood、herald、brute、boss。
- 最大敌人数配置为 720；包含阵型、行进方式、波次、Boss、升级、连锁、粒子和生成式音频系统。
