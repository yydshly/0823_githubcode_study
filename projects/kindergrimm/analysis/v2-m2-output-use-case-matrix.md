# V2-M2 · Output Use-case Matrix

## 结论

同一 Sunpatch Felt 素材身份 Asset 8c67d2d8 / Visual ff18f7b3 / Pack f51ce69c / Renderer f1d70ebd 已被派生为四类 Output Profile。输出层不修改 Recipe，不调用大模型或云 API。

| 使用场景 | 消费的能力 | 实际输出 | 证据 |
| --- | --- | --- | --- |
| 游戏角色 / 运行时群组 | transparent-character + live rig | 1024×1024 透明角色；8 actor / 208 authored planes / 0 upstream | npc-scenarios；waystation / encounter / council 浏览器截图 |
| 叙事头像 / 对话 | portrait-avatar | 512×512 透明头像；Output FP 5d770ef2 | Production Studio 四输出对照 |
| 卡牌 / 图鉴 / 素材目录 | card-catalog | 768×1024 实底卡片；Output FP ca06e723 | Factory 与 Production Studio 实际 Canvas 输出 |
| 批量资产交付 | sprite-sheet | 12 角色、4×3、1024×768、透明、row-major | Factory ZIP / spritesheet / Output Record |

## 消费边界

- 游戏运行时继续使用 Recipe + Visual Record 构建可动画平面角色；透明 PNG 是可交付表现，不替代运行时身份。
- 头像和卡片是同一角色的派生交付物，不是重新生成的新角色。
- Sprite Sheet 的批次记录不伪造单资产 fingerprint；单资产和批次资产保持不同 Output Record。
- 这些都是程序化 2D CanvasTexture/PNG 能力，不是 3D mesh、骨骼模型或 glTF。
- derivation.runtimeLlmCalls = 0，derivation.cloudApiCalls = 0。

## 迁移链

~~~text
Recipe + Visual Record
      ↓
Output Profile Record
      ↓
PNG / portrait / card / spritesheet
      ↓
manifest.json + output-profiles.json + content-pack.json
      ↓
stored ZIP + per-entry CRC
~~~

浏览器验收中 ZIP 共四个 entry，全部 CRC PASS；WebGL-off 时图像不渲染，但四个 Output Record 仍可审查。
