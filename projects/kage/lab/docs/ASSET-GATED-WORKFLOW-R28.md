# R28 — 素材门禁进入专属网页主流程

日期：2026-08-26

## 目标

把已经验证有效的“理解目标 → 准备素材 → Codex 构建 → 浏览器评审”收进工作台主路径，避免以下两种失真：

1. 项目已有合适素材，却仍用程序化占位物生成网页。
2. 用户明确要求 GLB、真实音频或视频，但系统把缺失资产静默降级成球体、圆柱或普通贴图。

本轮不新增案例；继续保留每个目标一个最优完整结果。

## 已实现流程

```text
原始 brief
  → 模型 / 本地解释形成 EffectSpec
  → 素材门禁同时读取原始 brief、EffectSpec、项目素材目录与 provider 状态
      ├─ 已有匹配素材：复用并记录来源
      ├─ 图片类高收益需求 + MiniMax 可用：生成、物化、预算检查
      ├─ 经门禁确认不需要素材：允许程序化 Three.js 路线
      └─ GLB / Avatar / 真实音频 / 视频等必需素材缺失：停止代码生成
  → Codex 5.6-sol 生成独立 TypeScript / Three.js bundle
  → 编译、安全门、真实浏览器四状态评审
  → 只根据证据做增量精修
```

## 核心变更

- 新增 `asset-resolution.ts`，把素材复用、按需生成、程序化与阻断变成可测试决策。
- 专属代码控制器每次构建前都执行素材门禁；不再只在“素材列表为空”时判断。
- 原始 brief 中明确出现 GLB、glTF、FBX、OBJ、VRM、Live2D、真实 3D、3D/三维模型、产品拆解等要求时，形成 `model-3d` 硬需求。
- 明确的真实音频文件和实拍/上传视频要求也形成硬需求。
- 一张匹配图片不能满足明确的 GLB 要求。
- MiniMax 只有在图片素材经过收益门禁且 API 可用时才会调用；当前缺少 `MINIMAX_API_KEY`，界面不会伪装已经生成。
- Codex 创意解释与专属构建默认模型统一为 `gpt-5.6-sol`。
- “用 Codex 构建专属网页”与“自动视觉精修”按钮从固定悬浮层移回“当前最佳结果”区域。
- 主按钮不再依赖轮询猜测选择状态；工作台在 `runId + selectedId + Manifest` 就绪后发出 `creative-lab:selection-ready`，再进入素材与专属代码阶段。
- 生成链路会显示项目素材目录的真实命中，例如当前声音产品为：
  - `1 APPROVED`
  - `transparent acoustic product hero`

## 运行证据

### 当前声音产品

浏览器调用 `window.__creativeLab.prepareAssets()` 返回：

```json
{
  "status": "ready",
  "assets": 1,
  "message": "复用 1 个与当前目标匹配且有来源记录的项目素材。"
}
```

工作台显示 `1 APPROVED`，素材为已沉淀的透明声学产品主体。

### 缺失 GLB

使用描述“为真实硬件产品构建可拆解的 GLB 产品网页，需要真实 3D 模型和清晰材质”时，浏览器状态为：

```text
ASSET GATE
CODE GENERATION HELD
已停在素材阶段：当前目标缺少必须的 model-3d 素材（brief-explicit-model）；
现有图片生成器不能产出这些资产，不能用占位效果替代。
```

阻断后没有启动 Codex 子进程，也没有形成无效生成目录。

### Provider

- Codex：可用，`gpt-5.6-sol`
- MiniMax 图片：不可用，原因是缺少 `MINIMAX_API_KEY`

## 验证

- 全量测试：28 个测试文件、84 项测试全部通过。
- TypeScript 检查与 Vite 生产构建通过。
- 浏览器页面非空，无 Vite 错误覆盖层。
- 真实指针点击“生成最佳网页”后，无需第二次点击即可自动到达 GLB 素材阻断状态。
- 构建按钮父级为 `.wb-selection-actions`，计算样式 `position: static`。
- 当前仍有两个非阻断工程警告：
  - Vite native config 对部分无扩展名导入的未来兼容提示。
  - 主体验 chunk 超过 500 kB 的拆包提示。

## 下一步

下一最小闭环不是再生成案例，而是在阻断状态提供真实的资产补充入口：

1. 上传或登记用户自有 GLB / 音频 / 视频。
2. 对文件做格式、大小、来源、浏览器可寻址和质量等级检查。
3. 资产通过后，从同一 brief 继续专属构建，不重新创建一批候选或案例。

