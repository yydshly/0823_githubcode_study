# Kindergrimm 渲染架构拆解

## 结论

Kindergrimm 不是纯 3D 资源库，而是由三条生成管线组成的混合系统：

```text
参数 / Seed / 物种权重
├─ Canvas 2D 手绘管线
│  └─ 角色部件、物品、教程插图
├─ CanvasTexture → Three.js 平面管线
│  └─ 可运动的手绘角色、Crowd、Orla、主游戏
└─ Three.js 程序几何管线
   └─ Voxel、Gloss、植物、Pipes、Photo、Marbles
```

“是否使用 WebGL”和“资产是否真正为 3D”是两个不同问题。Editor、Crowd、Orla、Game 都使用 Three.js/WebGL 组织镜头、命中检测和场景，但主要角色仍是动态生成的二维 Canvas 纹理平面。

## 14 个演示的准确归类

| 演示 | 显示层 | 资产本体 | 判断 |
| --- | --- | --- | --- |
| Editor | Three.js/WebGL | 每个手绘部件是 CanvasTexture 平面 | 2D 资产 + 3D 舞台 |
| Crowd | Three.js/WebGL | 手绘整角色情境纹理和平面 | 2D 资产 + 3D 排布 |
| Items | DOM + Canvas 2D | 程序绘制的物品缩略图 | 纯 2D |
| How | DOM + Canvas 2D | 实时展示手绘生成步骤 | 纯 2D 教程 |
| Voxel | Three.js/WebGL | 自建 BufferGeometry、体素表面网格 | 真 3D |
| Voxel Crowd | Three.js/WebGL | 多个体素网格、灯光、Sprite 辅助效果 | 真 3D |
| Gloss | Three.js/WebGL | 控制笼 + Catmull-Clark 曲面 + PBR 材质 | 真 3D |
| Gloss Crowd | Three.js/WebGL | 多个高细分曲面角色 | 真 3D |
| Objects | Three.js/WebGL | 程序几何植物、花、树和表面材质 | 真 3D |
| Photo | Three.js/WebGL | Gloss 角色 + Objects 植物 + AO 后期 | 真 3D 场景 |
| Pipes | Three.js/WebGL | 管线、平面图形、曲线与 Gloss 角色 | 真 3D，但刻意做成平面插画观感 |
| Orla | Three.js/WebGL | 手绘 CanvasTexture 角色与物品 | 2D 资产 + 3D 舞台 |
| Kindergrimm Game | Three.js/WebGL | CanvasTexture 角色/道具 + 平面场景 + 后期 | 2.5D 游戏 |
| Marbles | Three.js/WebGL | 3D 桌面、弹珠、敌人、Gloss 奖励角色 | 真 3D 游戏 |

## 1. 手绘角色管线

手绘系统的真实生成单位不是一张固定图片，而是“部件”。每个部件包含：

- `gen()`：根据 Seed 生成稳定参数；
- `bones()`：声明部件挂在哪个骨骼/锚点；
- `size()`：计算所需 Canvas 尺寸；
- `draw()`：使用 Canvas 2D 绘制；
- 可选表情状态、物种限制、绘制层级和镜像规则。

`src/sketch.js` 创建 Canvas 2D 上下文；`src/part.js` 将部件的多个 boil 帧上传为 `THREE.CanvasTexture`；`src/rig.js` 把部件平面挂到骨骼组；`src/anim.js` 移动骨骼并切换纹理状态。

这里的动画主要不是网格变形，而是：

```text
骨骼组的位置/旋转变化
+ 预绘制表情纹理切换
+ 多个手绘 boil 帧按不同节奏切换
= 会呼吸、眨眼、抖动的手绘角色
```

因此它很适合生成具有统一画风的角色、立绘、贴片动画和 2.5D 游戏演员，但不能直接当作可自由旋转观察的 3D 模型。

## 2. Voxel 管线

Voxel 并不是加载现成模型。`src/voxel/carve.js` 根据体素单元生成 `BufferGeometry`，并剔除内部不可见面，再写入位置、颜色和法线属性。

其优势是结构简单、风格高度可控、容易按部件重生成。当前输出仍是运行时 Three.js 网格，仓库没有正式 glTF 导出流程。

## 3. Gloss 管线

Gloss 是该库最完整的真 3D 角色生成器：

```text
低模控制笼
→ Catmull-Clark 细分
→ BufferGeometry
→ glossy / rubber / ceramic / pearl / chrome 等 PBR 材质
→ 灯光、环境和表情系统
```

它没有使用 GLTFLoader，也不依赖外部角色模型。形体、头发、五官和装饰主要由代码生成。这让风格和参数非常统一，但高细分群组会带来明显的顶点与 CPU 构建压力。

## 4. Objects、Photo 与 Pipes

- Objects 使用程序几何生成植物结构，并通过 matte、glaze、fuzz 等材质控制观感。
- Photo 复用 Gloss 角色和 Objects 植物，加入灯光、环境、AO 与合成后期，属于“生成资产的场景化消费端”。
- Pipes 使用真实 Three.js 曲线、平面、球体和网格，但采用正交相机、平面材质和纸张配色，所以视觉上接近立体插画。

## 5. 游戏层

Kindergrimm Game 复用手绘角色和物品管线，通过 Three.js 处理房间、镜头、鼠标命中、角色排布和后期效果。其核心演员是 2D 纹理平面，因此准确称呼是 2.5D 游戏。

Marbles 则更接近真正的 3D 游戏：包含几何桌面、弹珠运动、敌群、战斗、特效、奖励选择和独立缩略图渲染器。

## 对研究方向的影响

后续不应把整个仓库抽象为一个统一的“3D 模型生成器”，而应拆成可组合的四层：

1. **Recipe 层**：Seed、物种偏置、部件参数、锁定和重生成。
2. **Asset Builder 层**：Canvas 2D、Voxel 网格、Gloss 曲面、植物几何。
3. **Presentation 层**：Three.js 场景、相机、灯光、后期、群组排布。
4. **Experience 层**：编辑器、拍照、游戏、战斗、导出和资产管理。

最有复用价值的是 Recipe 与 Asset Builder 的分离：同一套参数化思想可以生成不同视觉维度的资产，而展示层和玩法层只负责消费这些资产。
