# Phase 5 — Virtual synthesis workspace

这一阶段把 `CapabilityProposal` 向前推进了一步：提案现在可以生成一组可检查的虚拟文件，并在浏览器内完成静态审计。它仍然不是可执行插件，也不会写入或修改运行时注册表。

## 安全链路

```text
CapabilityProposal v1
  -> deterministic kind-specific scaffold
  -> SynthesisWorkspace v1
     -> virtual files in memory
     -> static safety and contract checks
     -> draft | blocked
     -> execution = never
     -> registration = not-registered
```

当前实现故意把“生成”和“运行”拆开。工作台点击“生成隔离草案”只调用确定性生成器，展示 JSON 产物；不会 `eval`、动态导入、写文件、联网、调用构建器或改动 `CapabilityCatalog` / `PluginRegistry`。

## 分类型脚手架

- `scene / effect`：插件类、完整生命周期方法、契约测试和边界文档；状态仍是视觉占位。
- `driver`：只定义确定性的进度输出、重置与释放边界，不接触相机或场景。
- `asset`：只生成资产 intake manifest、待办测试和文档；`qualityLevel` 必须是 `L0-missing`，不生成虚假 GLB/glTF。
- `output`：只生成导出计划和元数据契约，不录制、不编码，也不声称存在 MP4。
- 其他能力：生成最小契约、待办测试与文档，保持不可运行。

## 静态审计

每个工作区都检查：

- 目标 ID 只能使用安全的 kebab-case；
- 文件必须位于目标能力允许的 `src / tests / docs / assets` 相对路径；
- 总文本预算不超过 24 KB；
- 禁止网络请求、动态代码执行、浏览器全局写入、Node 运行时访问和远程资产 URL；
- TypeScript import 只能来自相对模块、`three` 或 `vitest`；
- 必须同时有测试脚手架与边界文档；
- Scene/Effect 必须拥有完整生命周期；
- Asset 必须诚实标记 `L0-missing`；
- 审计本身始终声明 `execution=never`。

任何阻断项都会把工作区标记为 `blocked`。通过静态审计只代表“可以人工检查”，不代表代码正确、视觉成立、性能合格或具备注册资格。

## 演示与证据

打开 `workbench.html?provider=local`，选择“能力缺口”，生成后在任意提案上点击“生成隔离草案”。示例资产提案会展示三个虚拟文件、十项审计、零阻断，同时明确保留 `L0-missing`。

视觉证据：[390px 虚拟合成工作区](screenshots/phase5-synthesis-workspace-mobile.png)

验证结果：TypeScript/Vite 生产构建通过；8 个测试文件共 22 个单元测试通过；18 个真实浏览器测试通过。

## 下一阶段

下一阶段不是直接让模型自由改仓库，而是增加第二道隔离层：

1. 只有人工选中的 `draft` 才能物化到独立临时目录；
2. 模型只能补全提案允许的文件和 import，不得修改运行时核心；
3. 在受限进程中运行类型、契约和预算检查，并保存可复现日志；
4. Scene/Effect 必须进入真实浏览器视觉评审，Asset 必须经过来源、许可、比例和负载门禁；
5. 人工比较差异并明确批准后，才产生“可推广构件”；注册仍是独立动作。

因此，本阶段完成的是安全的“提案 → 草案”桥梁，而不是自动编程终点。
