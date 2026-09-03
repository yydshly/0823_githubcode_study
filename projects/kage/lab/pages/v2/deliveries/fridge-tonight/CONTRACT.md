# R143 · 冰箱今晚 · 设计与验收合同

## 目标锁定

- Entry mode: brief-led direct implementation / non-spatial medium regression
- Request revision: R143
- Target user and context: 希望在食材过期前安排一人晚餐的独居者；打开页面后可直接完成一次选择、判断与保存。
- Desired first impression: 像打开一扇明亮、有人生活过的冰箱门；厨房杂志的秩序与手写磁贴的亲近感同时成立。
- Visual ambition: Editorial
- Experience architecture: Editorial Flow
- Primary journey: 选择 2–4 样食材 → 同一选择状态同步改变新鲜度时间带、今晚菜谱与补买项目 → 可撤回 → 保存今晚清单。
- Autonomy authorization: 用户已明确“确定并继续”；允许在当前项目内直接完成可逆实现与验证，不重复询问。
- User-decision boundary: 不接真实库存、营养、食品安全或购买服务；若要把演示数据升级为真实建议，需要新的产品与数据授权。

## 原始 brief

> 为一款帮助独居者在食材过期前安排今晚晚餐的产品设计网页。开场像一扇明亮的冰箱门，现有食材以带日期的编辑插画切片和磁贴出现。访客选择二到四样食材后，新鲜度时间带、今晚可做的菜和仍需补买的项目要在同一页同步重排；取消选择时结果即时撤回。最终行动是保存今晚清单。所有食材、日期和建议都是概念演示。页面像一本厨房杂志与手写便签的结合，不做参数工作台，也不按固定屏数排版。

用户没有禁止 Three.js、WebGL、生成图或外部素材。R143 必须证明：不选择 Three.js 是由内容职责决定，而不是人为增加风格禁令。

## 媒介与结构决策

- Selected pattern: editorial household tool / continuous refrigerator-door composition。
- Rendering base: semantic DOM + CSS + inline SVG。
- Primary visual responsibility: 食材磁贴、日期、新鲜度与晚餐结果在同一二维编辑表面形成可读、可操作的因果关系。
- Why not Three.js: 当前任务没有深度遮挡、可检查装配树、多姿态拓扑、空间测量或环绕观察责任；WebGL 不增加理解，只增加载荷与降级成本。
- Asset plan: `none`。本轮不等待生图、不创建素材批次；食材使用主题专属编辑插画与文字，不冒充真实摄影或食品结论。
- Interaction value: 选择集合是真实业务状态；DOM 控件、SVG 时间带、菜谱、补买清单和 CTA 必须从同一状态派生。
- Macro structure: 内容适配的连续编辑流，不是固定三屏、卡片工作台、中央 3D 产品舞台或参数面板。

## 视觉方向

| 决策 | 选择 | 可观察约束 | 通过标准 |
| --- | --- | --- | --- |
| 构图 | 一扇连续冰箱门作为编辑画布，食材、时间与结果自然向下展开 | 不出现持久侧栏、等宽仪表卡或三段等高页面 | 首屏无需说明即可辨认“冰箱食材 + 今晚计划” |
| 焦点 | 食材选择面是第一操作对象，结果从它自然生长 | 标题、指标和 CTA 不得压过食材与因果反馈 | 第一眼先看到可选食材及日期关系 |
| 排版 | 高对比杂志衬线 + 清楚无衬线 + 少量手写便签角色 | 不依赖巨型标题制造视觉冲击 | 文本角色清楚，390px 无阻断换行 |
| 色彩 | 冰箱瓷白、番茄红、叶菜绿、蛋黄黄、冷藏蓝 | 不回到暗色科技、紫色辉光或随机粒子 | 色彩来自食材和厨房语义，状态不只靠颜色 |
| 动效 | 磁贴轻位移、时间带重排、结果纸条展开 | 动效解释状态，不劫持滚动 | reduced-motion 下信息与操作完全保留 |
| 互动 | 点击与键盘选择/撤回、保存完成反馈 | 不能只改 active class、文案或数字 | 同一输入同步改变时间带、菜谱、补买与 CTA |

## 状态与边界

- Initial: 六样演示食材和日期可见，结果区说明请选择 2–4 样。
- Active: 2–4 样选择形成完整晚餐建议；少于 2 样时仍提示缺口，超过 4 样必须阻止并解释。
- Reversible: 取消任一食材后，时间带、菜谱、补买项目和 CTA 立即从同一状态撤回。
- Saved: 用户手势保存本地演示清单，页面显示可理解的完成反馈；刷新后可恢复或提供明确重置。
- Mobile: 390×844 纵向完成相同旅程，无横向溢出，触控目标可用。
- Keyboard: 食材选择、保存与重置可按逻辑顺序聚焦，focus-visible 清楚。
- Reduced motion: 取消非必要位移与展开动画，不隐藏状态。
- Base/fallback: 不依赖 WebGL、Canvas、远程字体或外部图片完成主要旅程；脚本不可用时仍有可读食材、示例菜谱、真实性披露与行动说明。
- Truth boundary: 所有食材、日期、新鲜度和菜谱建议均为概念演示，不构成食品安全、营养或购买建议。

## 有界执行

- 创意方向：1 / 1。
- 素材批次：0 / 1（本轮选择 `none`，不得因视觉焦虑静默转向生图）。
- 完整构建：1 / 1。
- 确定性修复：最多 2 次。
- 视觉精修：最多 1 次，只能针对真实浏览器中一个最高优先级缺陷。
- 任一远程或本地步骤超过 60 秒必须报告状态；失败不得静默重试。
- 只有最终 `runId + bundleHash` 绑定的证据可用于归档；未通过即停止为研究结果。

## 覆盖清单

| User phase | Requirement / artifact | Surface / state / input | Evidence needed | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| R143 路由 | 普通家庭 brief 不滥用 Three.js | contract / execution brief | Vitest：code-native、dom-css、无 spatial topology | 0 | continue | 完成结构化媒介回归 |
| R143 开场 | 冰箱与今晚计划立即可辨 | desktop opening | screenshot + DOM witness | 2 | continue | 浏览器检查首屏 |
| R143 因果 | 选择 2–4 样同步改变四类结果 | desktop click + keyboard | before/after snapshot + SVG/DOM witness | 5 | continue | 验证选择与撤回 |
| R143 保存 | 最终行动产生完成态 | desktop saved | interaction + persistence witness | 6 | continue | 验证保存与重置 |
| R143 移动 | 390px 完整可用 | mobile / touch / reduced | screenshot + overflow + state witness | 7 | continue | 验证窄屏与减动效 |
| R143 基础层 | 无增强仍可理解 | JavaScript disabled | browser screenshot + semantic content | 8 | continue | 验证基础内容 |
| R143 工程 | 无 Three/WebGL/Canvas，生产路由可开 | source/build/production | import scan + build + production smoke | 9 | continue | 完成最终回归 |
| R143 归档 | 唯一最终版本与证据绑定 | final bundle | DirectCreativeRun + bundleHash | 9 | continue | 质量门通过后再接入 |

## 停止条件

通过标准是：路由正确、主题一眼可辨、互动具有双向因果、桌面与移动端可用、基础层可读、生产构建可打开，并通过独立视觉判断。达到后立即停止；不得为了“再好一点”新增第二方向、第二素材批次或无限精修。
