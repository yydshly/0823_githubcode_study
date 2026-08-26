# Phase 3 — Model provider layer

这一阶段把“自然语言到 Three.js 网页”从离线规则演示推进为可实际调用模型、但仍受架构约束的生成链路。当前主要依赖 Codex CLI 或 MiniMax；本地基线保留为离线回归基准，OpenAI API 是可选适配器。

## 已实现的行为

```text
用户明确点击生成
  -> same-origin /api/creative/interpret
  -> provider selector (auto / Codex / MiniMax / OpenAI / local)
  -> 受约束的 BriefInterpretation
  -> Zod 校验与 canonical normalization
  -> ManifestCompiler
  -> ExperienceManifest validator
  -> CapabilityPlanner
  -> 选择候选并进入真实 Three.js 预览
```

- 页面首次打开只运行本地基线，不产生远程模型费用。
- 切换示例、模型或画质不会静默发起远程请求；必须再次点击“生成”。
- 明确选择远程 provider 时，错误会直接显示，不会伪装成本地结果。
- `auto` 按“显式配置 → MiniMax → OpenAI → Codex → local”选择可用项；远程失败会回退并在 provenance 中记录原因。
- 浏览器只收到 provider 状态和结构化结果；密钥与 AI SDK 只存在于服务端模块，未进入 workbench bundle。
- 模型不能生成并直接执行 JavaScript。它只能从现有结构、场景插件、节奏与主题 token 中提出三个方向。

## 为什么模型不会把架构重新变成模板

模型输出不是页面源码，而是受约束的创意决策。当前每次都要求覆盖 `focus / journey / branching` 三种关系，并允许改变：主体证据、叙事论点、场景语法、节奏、颜色、节点内容和理由。归一化层只固定运行时必须理解的 ID 与节点数量，不固定主题、文案和氛围。

新创意超过现有目录时，不应该让模型偷偷拼接任意代码。正确扩展顺序是：记录 unsupported capability → 人或隔离的能力合成流程实现新插件 → 单元、性能和视觉评审 → 注册到能力目录 → 后续模型才可选择它。
Phase 4 已实现这条链路的前半段：模型识别缺口，确定性规划器形成不可执行的审核提案。插件源码生成、隔离验证与注册仍未实现，详见 [Phase 4](PHASE4-CAPABILITY-SYNTHESIS.md)。


## 本地配置

复制 `.env.example` 为 `.env.local`，不要提交真实密钥。Vite 配置显式加载服务端环境变量。

Codex 使用现有 CLI 登录态：

```dotenv
CREATIVE_PROVIDER=codex
CODEX_CREATIVE_MODEL=gpt-5.4
CODEX_CREATIVE_REASONING_EFFORT=high
```

当前 Windows 环境已用 `codex-cli 0.142.5 + gpt-5.4` 完成真实烟雾测试。显式覆盖推理强度是为了避免用户全局配置中的新模型参数与旧 CLI 不兼容。升级 CLI 后可通过环境变量切换模型，不需要修改生成管线。

MiniMax 使用 OpenAI-compatible Chat Completions：

```dotenv
CREATIVE_PROVIDER=minimax
MINIMAX_API_KEY=your_server_side_key
MINIMAX_MODEL=MiniMax-M3
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
```

因为当前 MiniMax 兼容文档没有明确承诺 Structured Outputs，适配器使用 JSON object 输出后再进行 Zod 校验，而不是信任模型返回。

## API 与可审计性

- `GET /api/creative/providers`：返回可用 provider、模型和不可用原因。
- `POST /api/creative/interpret`：接受 `{ provider, brief }`，请求体上限 16 KB。
- 每次结果记录 `requested / selected / model / mode / latencyMs / fallbackReason`。
- Codex 在临时只读目录、ephemeral 会话和 JSON Schema 约束下运行，结束后删除临时文件。
- `BriefInterpretation` 仍需通过编译器、manifest 校验和能力预算，不因模型来自可信 provider 而绕过边界。

## 部署边界

当前 API 由 Vite 的 dev/preview middleware 提供，适合研究与本地演示。纯静态托管只会保留本地基线，不能提供远程 provider。生产部署需要把相同的 provider service 挂到真实服务端路由，并增加认证、限流、配额、日志脱敏、请求取消与持久化。

官方接口参考：[OpenAI Responses](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) · [MiniMax OpenAI-compatible API](https://platform.minimax.io/docs/api-reference/text-chat-openai)
