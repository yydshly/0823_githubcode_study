# OpenChatCut 能力研究与实测

> 结论：它是一套可手动剪辑、也可由 Codex/Claude Code 通过 MCP 修改的本地优先视频工程系统。它的关键价值不是“AI 一键生成成片”，而是让 AI 和人共同操作同一条可预览、可撤销、可继续编辑的多轨时间线。

## 本阶段决策

**第一轮研究已经完成，项目暂时归档，后期出现明确剪辑需求时按需启用。**

我们的当前工作流以“从创意、脚本或提示词直接生成整条视频”为主，暂时没有稳定的实拍视频、录音或多段素材入口。OpenChatCut 的优势集中在生成之后：把视频、旁白、字幕、背景音乐、音效和动态图形组织成可预览、可撤销、可继续编辑的真实多轨工程。因此，它不是当前生成链路的核心依赖，继续深入研究的边际收益较低。

对它的最终理解是：

- 它首先是一款完整的多轨剪辑软件，其次是一款能被 AI 驱动控制的剪辑软件。
- Codex、Claude Code 等 Agent 通过 MCP 读取工程并执行建轨、切分、移动、字幕、混音和导出等结构化操作。
- 它不负责替代视频生成模型；生成模型负责创造素材，OpenChatCut 负责组织、修改和交付素材。
- 如果生成结果可以直接发布，则没有必要引入它；如果生成后经常需要两步以上的拼接、配音、字幕、混音或局部修改，就值得重新启用。

重新启动研究的触发条件：

1. 多个生成镜头需要稳定拼接和节奏控制；
2. 需要统一旁白、BGM、音效与字幕；
3. 需要只替换某个镜头，而不是整条视频重新生成；
4. 需要横屏、竖屏等多个版本；
5. 希望 Codex 自动完成粗剪，但仍保留人工预览、撤销和精修能力。

当前更高优先级的研究方向是：**创意 → 脚本 → 分镜 → 直接生成 → 一致性检查 → 发布**。当这条链路遇到“能生成，但难以组装、修改和复用”的瓶颈时，再把 OpenChatCut 作为 AI 可控的后期剪辑底座接入。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | [0xsline/OpenChatCut](https://github.com/0xsline/OpenChatCut) |
| 研究版本 | `v0.2.9` / `7896af6772383aa2a8fae5be9532c33c4d727f4a` |
| 本地源码 | [`upstream/`](upstream/)（Git submodule） |
| 技术栈 | React 19、TypeScript 6、Vite 8、Remotion 4、FFmpeg、Electron 43、MCP SDK |
| 许可证 | AGPL-3.0-or-later；社区资源另按各自许可证 |
| 实测环境 | Windows x64、Node.js `24.19.0`、npm `11.17.0` |
| 研究日期 | 2026-08-24 至 2026-08-26 |
| 当前状态 | 第一轮研究完成，暂时归档；后期出现多轨剪辑需求时按需启用 |

## 它到底是什么

OpenChatCut 同时有三种身份：

1. **剪辑软件**：有素材池、预览器、属性面板、多视频/音频/字幕轨、裁剪、切分、波纹、滑移、关键帧、转场、特效、LUT、MG、字幕和导出。
2. **AI 剪辑工作台**：内置 Agent 能读取工程并调用结构化编辑工具；没有配置模型时，普通手动剪辑仍然可用。
3. **Agent 可操作的工程后端**：通过 Streamable HTTP MCP，让 Codex、Claude Code、Cursor 等外部 Agent 读写真实工程，而不是只生成一条 FFmpeg 命令。

因此，它既适合“自己录完再配背景乐、多音轨、字幕和包装”，也能接收 AI 生成的图片、视频、旁白、音乐和音效继续组装。AI 生成并不是使用它的前提。

## 原理与数据流

```text
本地/生成素材
    ↓ 素材池、探测、代理文件、波形/转写
真实工程模型（timeline / track / item / transition / caption / marker）
    ↕
React 编辑器 ←→ 命令、撤销/重做、版本、提案式编辑
    ↑                         ↑
内置 Agent 工具           外部 MCP Agent（Codex 等）
    ↓                         ↓
编辑会话草稿 → 校验 → 审阅/原子提交 → 新工程修订
    ↓
Remotion 合成 + FFmpeg 编码 → MP4/WebM/MP3/ProRes/SRT/FCPXML
```

关键实现取舍：

- **不是让模型直接改 JSON**：Agent 调用有 JSON Schema 的工具，例如读时间线、建轨、移动/切分片段、改字幕、设画幅和标记。
- **事务式编辑**：外部 Agent 先 `begin_edit_session`，修改进入草稿，再由 `review_edit_session` 一次提交；提交后旧修订会变成 `stale`，避免继续覆盖新数据。
- **在线与离线两套执行路径**：编辑器在线时可通过活动页面执行；页面不在线时，服务端只暴露经过筛选、依赖闭合的纯数据工具。本次实测离线工具面为 30 个工具。
- **本地优先**：工程、素材、设置与开发 profile 放在本机；开发模式按 checkout 隔离。仓库同时实现 JSON 存储和 SQLite 迁移路径。
- **可交付渲染**：预览/合成基于 Remotion，媒体处理和最终编码使用 FFmpeg；Windows 实测自动选中 NVIDIA NVENC。
- **外部入口有边界保护**：MCP 需要本机 bootstrap token、`Origin`/请求形状校验和工程修订绑定。直接无凭据请求实测返回 HTTP 403。

## 能力地图

| 领域 | 已确认能力 | 本次证据 |
| --- | --- | --- |
| 专业时间线 | 多轨、裁剪、切分、波纹、滑移、变速拉伸、吸附、关键帧、多选、标记、撤销/重做 | 实际编辑器操作；`verify:editor`、`verify:production-contracts` 通过 |
| 音频 | 多音轨、音量关键帧、旁白、响度归一、人声隔离、音乐分析、自动闪避 | 实际导入 BGM/音效并调音量；官方音频验证通过 |
| 字幕/文字稿 | 转写任务、按文字剪辑、停顿/填充词处理、字幕样式、SRT/TXT | `verify:captions` 通过；界面入口已加载 |
| 视觉包装 | 33 个 FX、16 个 LUT、16 个转场、10 个缩放、235 个 MG | 官方 Agent 工具目录验证；实际加入柱状图 MG |
| 音效资源 | 39 个内置 SFX | 官方目录验证；实际加入 `Simple Whoosh` |
| AI/Agent | 内置聊天 Agent、技能、草稿/提案、外部 MCP、Codex CLI 集成 | `verify:mcp`、`verify:agent-tools` 通过；实际 MCP 工程提交 |
| 导出 | MP4/WebM、MP3、透明 ProRes 4444、SRT/TXT、FCPXML、后台队列、质量检查 | 实际完成 720p H.264/AAC MP4；`verify:export-adaptive` 通过 |
| 桌面与部署 | 浏览器开发版、Electron Windows/macOS/Linux 构建配置 | 源码与构建脚本确认；本次未打 Electron 安装包 |
| 生成能力 | 图片、视频、语音、音乐、音效的多厂商任务 | 源码与工具模式确认；需要各服务 API Key，本次未消费外部额度 |

## 实际案例一：自己录制素材后的多轨包装

目标是模拟最常见的创作者流程：原有画面和声音不推倒重来，只追加背景音乐、音效和数据动效，再导出成片。

实际完成：

1. 打开内置示例工程，确认已有两条视频轨和两条音频轨。
2. 从资源库加入 `Bar Chart - Annual Sales` 动态图形，属性面板可继续调整位置、缩放和关键帧。
3. 加入 `Simple Whoosh` 音效，把片段音量设为 25%。
4. 用本地 FFmpeg 生成 10 秒无版权测试和弦 [`demo-bgm.wav`](evidence/demo-bgm.wav)，通过素材池上传、探测并加入时间线，把音量设为 20%。
5. 以 720p、30 fps、自动码率导出 MP4，并启用导出后质量检查。

导出结果：

| 属性 | 实测值 |
| --- | --- |
| 文件 | `C:\Users\yun68\Downloads\示例工程.mp4` |
| 大小 | 3,622,934 bytes |
| 时长 | 11.35 秒 |
| 视频 | H.264 Main、1280×720、30 fps、约 2235 kb/s、NVENC |
| 音频 | AAC-LC、48 kHz、立体声、约 317 kb/s |
| SHA-256 | `A6C793E195341BB704AD4A307857956C7575F67959052519A7BAC020A42B2F8A` |

界面证据：

- [`01-home.png`](evidence/01-home.png)：工程管理页和 MCP/设置入口。
- [`02-editor-loaded.png`](evidence/02-editor-loaded.png)：示例工程、多面板与四轨时间线加载完成。
- [`03-bgm-sfx-mg-edited.png`](evidence/03-bgm-sfx-mg-edited.png)：BGM 已导入并加入时间线，片段音量为 20%；同时完成 SFX 和 MG 添加。
- [`04-export-history.png`](evidence/04-export-history.png)：导出历史记录 `示例工程.mp4`、H.264、约 3.5 MB。

这说明它确实是剪辑软件，而不只是 AI 自动拼接器。现阶段最自然的定位是：**人负责审美和最终判断，Agent 负责批量、重复和结构化操作。**

## 实际案例二：Codex 通过 MCP 建立口播多轨模板

通过本机 MCP bootstrap 和 SDK 客户端，新建并原子提交工程 `Codex MCP 多轨演示`：

| 别名 | 类型 | 名称 | 混音语义 |
| --- | --- | --- | --- |
| C1 | caption | 中文字幕 | 独立字幕轨 |
| V2 | video | 数据包装层 | 标题、图表、贴片等上层包装 |
| V1 | video | 主画面 | 主摄像机/录屏 |
| A1 | audio | 人声主轨 | `anchor`，说话时触发闪避 |
| A2 | audio | 背景音乐 | `follower`，闪避深度 `-12 dB` |
| A3 | audio | 音效轨 | Whoosh、点击、提示音等 |

同时创建了三个工程标记：第 0 帧“片头：建立主题”、第 90 帧“主体：演示产品或讲解观点”、第 240 帧“结尾：行动号召”。随后用全新的只读 MCP 会话重新读取，六条轨道、混音角色、路由参数和三个标记全部存在。

可复现脚本：

- [`mcp-multitrack-create.mjs`](scripts/mcp-multitrack-create.mjs)：bootstrap、创建工程、草稿编辑和提交。
- [`mcp-inspect-project.mjs`](scripts/mcp-inspect-project.mjs)：新会话只读检查后丢弃草稿，不修改工程。

实测也暴露了一个边界：该外部 bootstrap 客户端创建的是 `offline` 绑定工程；在当前隔离开发 profile 中，直接把返回的 editor URL 粘到已有浏览器会退回仪表盘，但 MCP 仍能重新读取完整工程。当前版本不应把“返回 editor URL”等同于“任意已有浏览器身份都能立即接管工程”。

## 和“直接把视频扔给 Codex 剪”有什么区别

| 维度 | Codex 直接写 FFmpeg/脚本 | Codex → OpenChatCut MCP |
| --- | --- | --- |
| 工作对象 | 输入文件和一段一次性命令 | 有轨道、片段、字幕、标记、转场和版本的工程 |
| 人工接手 | 通常要重写参数或换到别的软件 | 可在同一时间线预览、拖动、撤销和细调 |
| 修改粒度 | 擅长批处理、转码、拼接、裁切 | 兼顾批量自动化与可视化精剪 |
| 状态安全 | 脚本自行负责中间文件和覆盖风险 | 编辑草稿、审阅、原子提交、修订冲突保护 |
| 可重复性 | 命令很容易复现 | 工程、工具调用和导出配置都可保留 |
| 适合任务 | 统一转码、批量压缩、规则明确的流水线 | 口播/访谈、字幕、BGM、多轨、包装和反复审阅 |

两者不是替代关系。最实用的组合是：**Codex 用脚本完成素材预处理和大批量机械工作，再通过 OpenChatCut MCP 把结果写入可视时间线，由人完成最后 10% 的审美判断。**

## 安装与复现

仓库已作为子模块固定在 `upstream/`。从干净 checkout 复现：

```powershell
git submodule update --init --recursive
cd projects/openchatcut/upstream
# 必须是 Node 24.x；系统 Node 22 不满足 engines
npm ci
npm run build
npm run dev
```

打开 `http://localhost:5199`。

Windows v0.2.9 注意事项：`scripts/sync-whisper-cli.mjs` 直接执行 `unzip`，原生 Windows 没有该命令时，`prebuild`/`predev` 会失败。本次把官方下载的 `whisper-bin-x64.zip` 用系统 `tar.exe` 解压，再把 `whisper-cli.exe` 放入 `public/whisper-cli/win32-x64/` 后，生产构建成功。该二进制实测 SHA-256 为 `95E3C0B0E778AD9499EB0125F97C1DCF437DD9EB4EA77050B043574F93C2631D`。

## 构建与测试结果

| 检查 | 结果 |
| --- | --- |
| `npm ci` | 成功，安装 796 个包 |
| `npm run build` | 成功；Vite 转换 1,893 个模块，约 4.06 秒 |
| 浏览器启动检查 | 首页和编辑器可用，无 Vite/React 错误覆盖层 |
| `verify:editor` | 通过 |
| `verify:captions` | 通过 |
| `verify:mcp` | 通过 |
| `verify:agent-tools` | 通过 |
| `verify:production-contracts` | 通过 |
| `verify:export-adaptive` | 通过 |
| 实际 MP4 导出 | 完成，100% |

没有把整套 `npm test` 写成“全绿”，因为发现两处上游 v0.2.9 问题：

- `server/keystore-profile.verify.ts` 在 Windows 只覆盖 `HOME`，但 `os.homedir()` 仍读取 `USERPROFILE`，测试写到了真实 profile 路径并失败。这是测试隔离问题，不是本次修改造成的。
- `verify:export-gl` 的前置导出/GL 测试均通过，但 `shader-contract.verify.ts` 记录的 `ascii-rain-blur.frag` 哈希与 tag 内实际文件不一致，后续用例因此未继续。

依赖审计当前为 929 个依赖节点、0 low、3 moderate、11 high、0 critical；涉及 `@huggingface/transformers`、`onnxruntime-node`、`sharp`、`undici` 等 14 个包。没有运行会改 lockfile 的 `npm audit fix`。

生产构建还提示主编辑器 chunk 约 4.05 MB（gzip 约 1.08 MB），说明后续可以继续做路由/面板级代码分割。

## 适用场景

- 自己录制的口播、课程、播客和访谈：删停顿、按文字剪、字幕、人声+BGM+SFX。
- 产品演示和知识视频：录屏/主画面之上叠加标题、数据卡、动态图表和转场。
- 长视频拆短视频：转写后选高光，批量改成 9:16，再人工复核主体位置。
- 多素材快速粗剪：Codex 先按规则整理、命名和落轨，人再调整节奏。
- 可审计的自动化剪辑：需要保留工程、版本、操作结果和后续人工可编辑性。

不太适合当前版本的情况：只想一次性生成不可编辑的 AI 视频、顶级调色/混音/大型团队协作，或者要求完全无人值守且不能容忍早期项目兼容性问题。

## 可扩展方向

1. **工作流模板化**：把“口播净剪 → 字幕 → BGM 自动闪避 → 包装 → 质检 → 导出”固化为可复用技能和 MCP 编排。
2. **资源与插件生态**：扩充 MG、SFX、转场、FX、Zoom、LUT，并为团队建立带许可证和品牌约束的私有资源库。
3. **AI 理解层**：结合本地 ASR、镜头检测、人脸/主体几何、节拍分析，实现更可靠的删停顿、自动重构和 B-roll 建议。
4. **企业工程层**：完善 SQLite 默认路径、共享存储、审阅评论、权限、多用户协作和作业队列。
5. **Agent 安全与可观测性**：为每次工具调用提供 diff、成本、耗时、失败重试和可回放记录；增强跨浏览器身份的工程交接。
6. **工程质量**：修复 Windows `unzip` 与 home 隔离测试、同步 shader contract、减少安装脚本告警、升级有风险依赖、拆分超大前端 chunk。

## 对你的意义

如果你的主要素材是自己录制的，它的意义很直接：你不必在“全自动 AI 成片”和“完全手工剪辑”之间二选一。OpenChatCut 可以作为可视化工程与渲染底座，Codex 则充当会操作这套工程的自动化剪辑助理。

推荐落地方式：

1. 先用于口播/教程这一类结构明确的视频，不要一开始就挑战电影级复杂项目。
2. 固定 `主画面 / 人声 / BGM / SFX / 字幕 / 包装` 轨道模板。
3. 让 Codex 处理导入、粗剪、删停顿、字幕、BGM 闪避和批量版本；你只检查节奏、审美与事实正确性。
4. 导出前保留人工复核，并把项目文件和最终成片一起归档。

这比“直接让 Codex 调 FFmpeg”多出来的核心资产，是一个人和 AI 都能持续理解、修改和交付的真实剪辑工程。

## 参考

- [上游中文 README](upstream/README_ZH.md)
- [上游变更记录](upstream/CHANGELOG.md)
- [AGPL-3.0-or-later](upstream/LICENSE)
- [MCP 工具模式快照](upstream/assets/agent/openchatcut-tool-schemas.json)
