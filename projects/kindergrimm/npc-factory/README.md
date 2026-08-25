# NPC Asset Factory v0.6

这是 Kindergrimm 研究项目基于固定上游提交建设的第一个新生产工作流。它没有复制或修改上游生成器，而是直接调用：

```text
newRecipe → ensureParams → buildContentCharacter → upstream buildCharacter
```

功能包括：

- 8 / 12 / 24 个 NPC 批量生成；
- Master Seed、内容包、物种、手绘媒介与颜色策略；`Original` 保持原行为，`苔光旅站` 锁定自有美术方向约束；
- 稳定的批次顺序和 Recipe 指纹复验；
- 单角色选择与收藏；
- 带来源信息的 Recipe JSON 下载；
- 1024×1024 透明 PNG 下载；
- 完整 Batch Manifest JSON 下载；
- 4 列、256px tile 的透明 Sprite Sheet PNG；
- Original ZIP 保持 `manifest.json + spritesheet.png`；自定义包额外携带 `content-pack.json`；
- Mosslight 为每个 Recipe 生成独立 Visual Fingerprint，并追加 12 个真实 CanvasTexture 部件，覆盖 ambient / head / face / body / ground；
- 使用同一共享核心和 fingerprint 的运行场景；
- 场景可校验并导入 Batch Manifest，失败时不清空当前场景；
- WebGL 不可用时保留 Recipe 和 JSON 路径。

## 启动

从仓库根目录运行：

```powershell
.\projects\kindergrimm\scripts\npc-factory.ps1
```

打开：

```text
http://127.0.0.1:8882/projects/kindergrimm/npc-factory/
http://127.0.0.1:8882/projects/kindergrimm/npc-scenarios/?seed=240824
```

必须通过 HTTP 打开，因为浏览器需要加载上游 ES modules 和 Three.js import map。

## 它是否使用大模型？

角色生成运行时不使用大模型，也不调用远程生成 API。核心驱动是 Seed、Mulberry32 伪随机数、物种概率偏置、部件参数、共享 Layout、Canvas 2D 绘制和 Three.js 合成。

仓库唯一的 Gemini 提及位于 `upstream/assets/music/README.md`：它只是建议开发者可以用 Lyria、Gemini 或其他工具离线生成可选音乐 MP3。运行时 `audio.js` 只读取本地 MP3，这与角色生成无关。

## 内容包合同

`runtime/content-packs.js` 定义可复验的 `kindergrimm-content-pack/0.1` 合同。内容包的完整快照与 fingerprint 会进入 Batch Manifest；导入端同时校验包本身、每个 Recipe 的约束和固定 Seed 的生成结果。旧 v0.3 Manifest 没有 `contentPack` 时自动按 Original 解释。

`苔光旅站 / mosslight-waystation` 是研究用自有内容层：它限定 human/cat/dog、watercolor/ink、彩色策略，并提供角色名、职业和场景呈现语义。v0.6 的 `mosslight-canvas-decorator` 先调用上游 Canvas 纸片角色，再根据 Recipe + renderer descriptor 的确定性记录追加 12 个自有 CanvasTexture 平面。它已经形成从环境、头部、脸部、身体到地面的可携带视觉套件，但仍复用上游骨骼、动画与主体部件，不等于完整的新绘图后端。详见 [`analysis/content-pack-authoring.md`](../analysis/content-pack-authoring.md) 与 [`analysis/mosslight-v06-extension-blueprint.md`](../analysis/mosslight-v06-extension-blueprint.md)。

## v0.6 原理与边界

```text
Content Pack visual descriptor
→ renderer fingerprint
→ Recipe + renderer → Visual Record / Visual Fingerprint
→ upstream buildCharacter
→ append descriptor.features 中的 12 个 authored CanvasTexture planes
→ existing animator / depth sorting / scene / export
```

运行时没有大模型参与。驱动来自 Master Seed、Pack 约束、Mulberry32 伪随机数和稳定哈希；同一 Recipe + 同一 renderer descriptor 必须得到相同 Visual Fingerprint 与部件变体。

v0.6 消费端仍精确支持 v0.5 renderer `0.1.0`：旧 Manifest 只重建原来的 3 个 features，保持 pack `f78b264d`、renderer `f7d84f29` 和首项 visual `aef31a9b`，不会被自动升级成 12 部件。

- 不是后台资产管理系统；
- ZIP 使用无压缩 store 模式，优先保证无依赖、CRC 可校验和标准工具可解压；
- 尚未将 Voxel/Gloss 导出为 glTF；
- 尚未接入“自然语言 → Recipe”的大模型适配层；
- 已有一个十二部件自有视觉套件，但主体、姿势和动画仍来自上游；替换完整 media/core parts 才会形成独立的底层视觉语法。
