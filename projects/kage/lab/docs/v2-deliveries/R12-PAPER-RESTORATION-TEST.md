# R12 · 纸张修复工坊受约束生成测试

## Design contract

- Entry mode：brief-led generation acceptance
- Request revision：R12 / first real R11 loop trial
- Target user and context：对纸本文献修复感兴趣、需要提交修复委托的个人或小型收藏机构
- Desired first impression：安静、触觉真实、像进入修复师工作台，而不是档案后台或科技演示
- Visual ambition：Immersive
- Experience architecture：Editorial Flow；持续主视觉服务阅读节奏，不把控件变成空间操作台
- Visual anchor：一张严重破损但仍可辨认的纸页；纤维断面、补纸与墨迹恢复必须保持同一对象连续性
- Visual constraints：暖灰纸色、矿物黑、克制金棕；不要紫色科技风、随机粒子、玻璃仪表盘和矩形海报拼贴
- Information constraints：开场说明损伤；中段解释纤维对齐、补纸、压平；末段给出可理解的提交行动
- Operation constraints：滚动推进；指针只做局部检查；触摸、键盘与 reduced-motion 保留完整阅读与行动
- State constraints：opening / process / resolve / mobile / failure fallback
- Environment constraints：本地 `127.0.0.1:8143`；Codex 5.6-sol 主构建；MiniMax 只在素材职责明确且目录无合适素材时备用
- Primary journey：描述主题 → V2 合同选择 → 单候选构建 → 浏览器验收 → 打开最终网页
- Autonomy authorization：用户明确要求由 Codex 创建未使用主题并测试
- User-decision boundary：无；本轮不增加模型、能力研究或多候选对比

## Test brief

为一间纸本文献修复工坊设计沉浸式网页。开场是一张受潮、撕裂且墨迹模糊的旧纸页；滚动时沿同一张纸的纤维断面进入修复过程，依次看到纤维对齐、手工补纸和墨迹重新可读，最后纸页在安静的工作台光线中恢复完整，并收束为“提交一页待修复文献”。面向个人收藏者和小型档案机构；质感真实、克制、温暖，不要紫色科技风、随机粒子或玻璃仪表盘。

## Coverage

| Requirement | Evidence | Status | Next action |
| --- | --- | --- | --- |
| 主题未在现有项目使用 | 仓库全文检索无匹配 | pass | — |
| V2 合同可见且进入任务 | job-3c48d576f4a290dc + 工作台合同摘要 | pass | — |
| 一个最终可运行网页 | /cases/dedicated-7c944e0c386f/ | pass | 已通过门禁并精选归档 |
| 桌面 opening / middle / ending | .artifacts/r12-paper-final/01-opening.png 至 03-final.png | pass | — |
| 390px mobile 与键盘/回退 | .artifacts/r12-paper-final/04-mobile.png + reduced-motion | pass | — |
| 运行完整性 | 浏览器 0 脚本错误、0 HTTP 错误、0 横向溢出 | pass | — |
| 耗时记录 | job timestamps + 定向修复 | pass | 进入 V2 性能基线 |

## First run finding

- Job：`job-637c95929f305a52`
- Result：failed in authoring after 6m57s
- Planning：约 95s；命中 `spatial-exploration / dom-media-hybrid / identity-through-evidence`
- Asset defect：单个泛化词“纤维”错误召回旧生物材料温室三素材；不符合本测试主题隔离要求
- Engineering defect：两次代码输出均直接访问 `Mesh.material.opacity`，未处理材质数组联合类型，TypeScript 门禁正确阻止发布
- Decision：不把失败页面归档为案例；先修复素材召回与专属代码类型约束，再进行一次有边界的复验

## Controlled rerun and final result

- Job：job-3c48d576f4a290dc
- Dedicated run：dedicated-7c944e0c386f
- Model：gpt-5.6-sol
- Planning：命中 V2 合同缓存，未重复自由理解
- MiniMax asset stage：约 76s，生成两张纸张主题素材
- Codex authoring：约 186s，首次编译通过
- Server task total：约 6m08s；自动视觉精修因 90s 超时被跳过，页面仍可运行
- Automatic review finding：首版存在图片框边界、突兀黑色几何体、首屏标题缺失、移动端内容缺失和 8px 横向溢出，因此不按任务状态“complete”直接认定为优秀结果
- Asset decision：MiniMax 单张质感可用，但两张素材不是同一页文献，无法承担“同一对象被修复”的连续证据；不采用为最终视觉
- Final asset route：使用 ChatGPT 图像生成得到同一页文献的破损态与修复态；保存到 public/creative-assets/r12-paper-restoration/
- Targeted Codex refinement：保留原有 DOM 内容与滚动导演，移除相框、黑色几何体和伪补纸；素材改为全屏环境交叉融合，Three.js 只承担纤维对齐和裂缝缝合反馈
- Final browser evidence：桌面 opening / middle / ending 与 390px mobile 均可运行；scrollHeight=5004/4811，overflow=0，browserErrors=[]，responseErrors=[]
- Archive decision：用户查看成品后确认继续；案例以 featured 归档到 /cases/dedicated-7c944e0c386f/，并作为第二个完整成品接入 V2 已验证示例。失败版本与 MiniMax 候选不进入案例库

## Reusable project decisions

- 已验证的纸张破损态与修复态进入项目素材目录，使用精确主题标签；“纤维”等泛词不再触发召回。
- MiniMax 输出固定为 L2 候选；若自动视觉验收未完成，任务只能提供预览，不能被标记为最终成品。
- 多张 MiniMax 候选无法证明同一主体连续时，Codex 不得硬切成序列；优先保留单一锚点并用 Three.js 状态变化，或改由 ChatGPT 图像生成连续素材。

## Stop rule

服务器生成最多一次受控复验；之后只允许基于明确视觉缺陷做一次定向修复，不再启动新的自由探索任务。最终只保留一个候选结果。

## 2026-08-27 · 案例库入口修复

- Scope：只修复 `/cases.html` 中“纸张修复工坊”精选卡片缺少背景的问题；成品页和归档 bundle 保持不变。
- Before evidence：本地浏览器计算样式显示卡片 `previewKind=null`、`--case-preview` 为空、伪元素 `backgroundImage=none`。
- Root cause：R12 已将破损态与修复态素材接入成品页，但遗漏 `src/case-presentations.ts` 的案例库封面登记。
- Intervention：复用已验收的 `paper-damaged-v1.png` 作为开场封面；不重新生成、不复制素材，并补充该案例独有的精修过程说明。
- After evidence：桌面与 390px 手机均得到 `previewKind=environment` 和实际背景 URL；素材返回 200（2,175,116 bytes），页面无横向溢出、无浏览器错误。
- Acceptance：pass；卡片使用专属纸张素材、计算样式不再为 `none`，其他精选案例映射保持完整。
