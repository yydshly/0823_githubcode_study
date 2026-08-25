# NPC Portability v0.3：ZIP Bundle 与 Manifest 导入合同

## Design contract

```text
Entry mode: Revision-led / direct continuation
Request revision: R4 — 从同仓共享代码进入可携带资产文件与消费者校验
Target user and context: 需要把 NPC 批次交给另一个页面、工具、关卡或团队成员的资产生产与运行时开发人员
Desired first impression: 资产不再依赖当前页面内存；一个文件包可以被验证、携带和重新装配
Visual ambition: Functional + Immersive
Experience architecture: Hybrid Workspace
Visual constraints: 延续工厂和运行场景；文件状态靠文案、边框和状态标签共同表达
Information constraints: 明确 bundle 文件、schema、来源、校验结果、导入来源及恢复方法
Operation constraints: 纯浏览器；无新依赖、后台、账号或上传服务；ZIP 使用 store 模式
State constraints: bundle 构建中/成功/失败；导入待选/校验中/成功/错误；错误不破坏现有场景；可恢复 Seed
Environment constraints: 统一 8882 HTTP；桌面、900px、390px；深色主题；键盘；reduced-motion；WebGL 降级
Primary journey: Factory 生成批次 → 下载 ZIP Bundle → Scene 选择 manifest → 校验 provenance/fingerprint → 用文件 Recipe 重建 8 个角色 → 可恢复 Seed 模式
User-defined phases:
  1. 继续生产类似能力，形成可交付技术扩展
  2. 让场景真正消费资产，而不是只共享随机生成逻辑
Required artifacts:
  - 无依赖 ZIP store writer 与条目检查器
  - ZIP 包含 manifest.json 和透明 spritesheet.png
  - Batch Manifest 结构、来源、数量、唯一性和逐 Recipe fingerprint 校验
  - 场景端文件选择、成功状态、错误状态和恢复 Seed
  - 导入后直接使用 manifest 中的 Recipe buildCharacter
  - 文档、浏览器证据和最终审计
Autonomy authorization: 用户再次明确“继续”；属于已建研究子项目的下一顺序阶段
User-decision boundary: 压缩算法、签名/加密、后台上传、正式包管理器 SDK、跨版本迁移和联网资产库不在 v0.3
Observable completion criteria:
  - ZIP magic 为 PK\x03\x04，条目恰好包含 manifest.json 与 spritesheet.png
  - manifest 和 spritesheet 的 byte length、tile layout、asset count 一致
  - 有效 manifest 导入后 source=imported，8 个 fingerprint 与文件一致，actors=8
  - 修改一个 fingerprint 的无效 manifest 被拒绝，场景和已选角色保持不变
  - 恢复 Seed 后 source=seed，确定性重新通过
  - 文件控件键盘可达；390px 无溢出；WebGL 关闭时仍可导入并检查 roster
Coverage record: 见下表
```

## Hybrid workspace revision

```text
Scene operation: 保留模式切换、选角、姿态和暂停
New foreground operation: Manifest 文件选择、来源状态、恢复 Seed
Imported state mapping:
  idle → 显示 Seed 生成来源
  validating → 文件名和校验中状态
  imported → 场景/roster 使用文件 Recipe，来源标记为 IMPORTED
  invalid → 错误摘要；当前场景不重建、不清空
  recovered → 使用 Seed 重新生成并更新来源标记
Mobile transformation: 文件选择与恢复按钮放在用途模式前，随控制详情流出现；场景仍优先展示
Fallback: WebGL 关闭时可导入、校验、选择 roster；只跳过角色增强层和 ZIP 的 spritesheet 路径
```

## Coverage manifest

| 用户阶段 | 要求 | 表面 / 状态 | 最终证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ZIP writer | module / unit | `50 4b 03 04`；2 entries；store；两个 CRC 均通过 | 1 | pass | — |
| 1 | 完整 Bundle 导出 | factory / success | 430,192 bytes；manifest 77,716；sheet 352,246；1024×768 | 5 | pass | — |
| 1 | Bundle 降级 | factory / no WebGL | Manifest enabled；Sheet / Bundle disabled | 8 | pass | — |
| 2 | Manifest validator | runtime / valid | schema / commit / count / unique / fingerprint 全链校验 | 1 | pass | — |
| 2 | 有效文件导入 | scene / imported | source=imported；8 actors；8/8 fingerprint 与文件一致 | 5 | pass | — |
| 2 | 无效文件拒绝 | scene / error | `deadbeef` 被拒；8 fingerprints、actors、选中角色均保持 | 6 | pass | — |
| 2 | 恢复 Seed | scene / recovered | source=seed；确定性 true；恢复按钮重新 disabled | 6 | pass | — |
| 2 | 无 WebGL 导入 | scene / fallback | source=imported；8 roster；actors=0；fallback visible | 8 | pass | — |
| 全部 | 键盘与状态语义 | keyboard | 两次真实 Tab 到 `manifest-file`；label outline 3px solid | 7 | pass | — |
| 全部 | 跨视口 | 1440 / 900 / 390 | 900 与 390 均 overflow=false；移动按钮宽 309px | 7 | pass | — |
| 全部 | 工程和文档 | syntax / HTTP / contracts | 5 JS syntax pass；3 routes 200；浏览器 errors=[]；上游固定 | 9 | pass | — |

## Final verification

- 浏览器：全新 Chromium 会话中 Factory 与 Scene 均 `errors=[]`，无错误覆盖层；Seed、Imported、Rejected、Recovered、Fallback 与 reduced-motion 状态均实测。
- ZIP：`manifest.json` 与 `spritesheet.png` 恰好两个条目，compression=0，CRC 均有效；批次为 12 个唯一 Recipe，图集为 4×3、256px tile、透明背景。
- Manifest：使用真实 `File + DataTransfer + change` 事件；有效文件重建 8 个 live actors；篡改第 1 个 fingerprint 后返回 `assets[0].fingerprint: expected 9b8ee20e`，当前场景未重建。
- 响应式：390×844 时 documentWidth=375、无横向溢出，导入与恢复控件均为 309px 单列；900×900 同样无横向溢出。
- 可访问性：文件输入在交互快照中为可达 button；真实 Tab 后 activeId=`manifest-file`，关联 label 显示 3px focus-visible；reduced-motion 下 paused=true。
- HTTP：Factory 8506 bytes、Scene 6519 bytes、研究展厅 10883 bytes，均返回 200。
- 上游：`projects/kindergrimm/upstream` 保持 `de339ad739d8cbd28ff2dd4a940af38c0ede86c8`，未修改子模块内容。
- 最终截图：`npc-factory-v03-desktop.png`、`npc-factory-v03-mobile.png`、`npc-scenarios-v03-seed-desktop.png`、`npc-scenarios-v03-imported-desktop.png`、`npc-scenarios-v03-mobile.png`。
- 覆盖汇总：11 pass / 0 continue。
## Design direction

| 决策 | 方向 | 验收 |
| --- | --- | --- |
| Bundle | ZIP store，两个透明可审计条目 | 无依赖且标准解压工具可识别 |
| 校验顺序 | 结构 → 来源 → 数量 → fingerprint | 错误能指出具体字段和资产索引 |
| 错误恢复 | 先完整校验，再替换当前场景 | 无效文件不会清空正在工作的角色 |
| 来源状态 | Seed 与 Imported 是运行时来源，不进入视觉 Recipe | Inspector 和 HUD 可见但 Recipe 保持纯净 |
| WebGL 边界 | 文件校验与 roster 不依赖 WebGL | 增强层失败不阻断资产消费 |
