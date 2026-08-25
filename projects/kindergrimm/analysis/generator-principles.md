# KinderGrimm 生成原理与驱动方式

结论：KinderGrimm 的角色与物件生成器不是文生图、文生 3D，也不是大模型推理服务。它是一套由 Seed 驱动的程序化 2D 绘制系统，再借 Three.js 把多个透明 2D 部件作为平面组合到 WebGL 场景中，形成可分层、可换装、可摆动、带景深关系的“2.5D”角色。

## 一条真实的运行链路

```text
Seed
  → FNV-1a hashStr
  → Mulberry32 可复现伪随机数
  → 物种 / 媒介 / 配色及部件参数
  → JSON Recipe
  → 共享人体布局与骨骼挂点
  → Canvas 2D 绘制每个部件
  → CanvasTexture 上传 GPU
  → Three.js 平面分层、骨骼变换与纹理帧切换
  → WebGL 画面 / 透明 PNG
```

1. `upstream/src/rng.js` 用 `hashStr` 把字符串 Seed 转为 32 位整数，用 `mulberry32` 产生可复现的随机序列。
2. `upstream/src/rig.js` 的 `newRecipe`、`ensureParams`、`rerollPart` 和 `regenUnlocked` 生成及修正 Recipe。Recipe 是普通 JSON 数据，记录物种、媒介、配色与各部件参数。
3. 物种不是另一套模型；它通过概率偏置和参数约束改变鼻口、耳朵、尾巴、比例等部件组合。
4. `upstream/src/part.js` 为各部件创建 Canvas，调用对应的 2D 绘制函数，生成多张轻微变化的 boil 帧，再包装成 `THREE.CanvasTexture`。
5. `upstream/src/main.js` 创建正交相机和 WebGLRenderer，把部件纹理挂到骨骼组中的平面上。动画主要来自骨骼位置/旋转/缩放变化和 CanvasTexture 帧替换，并非 3D 网格形变。

因此，它产出的核心资源是：程序化 2D 插画部件、角色 Recipe 和 WebGL 中的 2.5D 分层组合；不是带拓扑、UV、骨骼蒙皮的完整 3D 模型，也没有直接导出 glTF/FBX 的能力。

## 是否使用大模型

运行时没有。

- 仓库的 JS、HTML、JSON 与 Markdown 中没有 OpenAI、Anthropic、Hugging Face、Transformers、TensorFlow、ONNX、Chat Completion 或 API Key 等角色生成调用。
- 角色随机化、绘制、组合和导出都在浏览器本地完成，不需要网络推理。
- 仓库中唯一与 Gemini 相关的文字位于可选音乐素材说明：开发者可以在仓库外用 Lyria、Gemini 等工具预先制作 MP3。运行时的 `audio.js` 只是加载本地 `assets/music/*.mp3`，它不驱动角色、物件或 3D 内容。

未来可以接大模型，但建议只把它放在 Recipe 之前：把“阴郁森林里的年老犬巫师”翻译为受约束的物种、媒介、配色、部件参数，然后仍由确定性的 KinderGrimm 渲染器执行。这样既保留自然语言创作，也保留可复现、可测试、可批量生产和低成本的渲染核心。

## 如何驱动

- 数据驱动：Seed、species、medium、color mode 和 part params 决定同一个 Recipe。
- CPU 驱动：JavaScript 计算概率与几何参数，并用 Canvas 2D 绘制透明部件。
- GPU 合成：Three.js/WebGL 负责把纹理平面按 z-order、骨骼和相机组合成最终画面。
- 时间驱动：动画循环更新步态、摆动、表情及纹理帧；输入并不重新调用生成服务。
- 玩法驱动：游戏可读取同一 Recipe 或部件标签，把视觉差异映射为职业、阵营、装备、稀有度或剧情状态。

## 本研究子项目的扩展边界

当前 v0.2 已验证“固定 Seed → 批量 Recipe → 真实渲染预览 → JSON / 透明 PNG / Batch Manifest / Sprite Sheet → 同 Seed 场景重建”。下一阶段可以沿四层演进：

1. 资产生产：ZIP、spritesheet、多朝向、多动作、批次 manifest、重复检测。
2. 参数系统：Recipe Schema、版本迁移、部件依赖规则、命名与标签规范、模板预设。
3. 场景应用：对话角色、敌人图鉴、换装编辑器、卡牌头像、剧情状态和商店 NPC 演示。
4. AI 编排：自然语言转受约束 Recipe、参考图风格检索、自动评分与筛选；AI 不直接取代确定性渲染器。

## 判断标准

当一个扩展仍可通过 Seed 和 Recipe 重建相同结果，它就适合进入生产管线；当结果只能依赖一次不可复现的模型采样，它应被视为外部素材来源，并记录模型、提示、版本、授权和原始文件，而不是混入核心生成器。
