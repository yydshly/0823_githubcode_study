# V2 R132 · 月光潮池夜巡图卷

## Design Contract

- Entry mode：brief-led / continuous implementation。
- Request revision：R132；在 R131 代码生成对象场之后，专门验证“图像模型承担视觉记忆点，代码承担互动因果”。
- Target user and context：第一次参加海岸自然夜巡的亲子访客；进入活动页后快速理解三个潮池生态区，并保存今晚路线。
- Desired first impression：一幅具有真实材质、月光层次和连续空间关系的宽幅潮池图卷，而不是代码几何、卡片目录或工作台。
- Visual ambition：Immersive。
- Experience architecture：Editorial Flow 中的横向全景穿行；主图持续承担空间身份，说明与行动随当前站点更新。
- Scene base：一张内置图像模型生成的宽幅主视觉；DOM/SVG/CSS 负责检查镜、站点、路线和状态反馈。
- Scene persistence：全景从开场到三站完成持续存在；页面不切换成参数面板或独立详情长页。
- Foreground control model：滚轮、拖拽、触摸、方向键、前后按钮共享横向位置；检查镜、站点说明、进度与最终保存位于可读前景层。
- State-to-scene mapping：开场 → 岩岸站 → 海葵站 → 蟹洞站 → 路线可保存 → 已保存；每站同时改变全景位置、检查镜、焦点、说明和路线。
- Mobile transformation：390px 保留横向全景；底部紧凑说明层与前后按钮可触达，不产生 body 横向溢出。
- Fallback：主图缺失时显示同位置关系的简化 SVG 潮池剖面，三站和保存旅程仍可完成。
- Visual constraints：月光青蓝、湿岩墨绿、海藻金绿与少量珊瑚橙；禁止通用紫色科技、中央孤立产品、三栏工作台、图片卡片墙和多图拼接接缝。
- Information constraints：教育概念插画披露、三个生态区、物种观察提示、路线进度和保存行动属于同一旅程；不伪装真实分布或调查数据。
- Operation constraints：不劫持全局页面滚动；横向容器有可见按钮、方向键和触摸替代；热点必须落在最终主图实际可辨认对象上。
- State constraints：到达站点必须产生可观察的图像位移、局部聚焦、说明变化和路线进度；不能只改边框或文案。
- Environment constraints：沿用现有 Vite 多页与 8143 运行时；不接后台模型或新供应商；唯一主图必须进入项目目录并纳入最终 bundleHash。
- Primary journey：看见连续潮池 → 横向巡游并检查三站 → 三站形成夜巡路线 → 保存今晚路线。
- User-defined phases：一个方向；一次素材批次且只生成一张主图；一次完整构建；最多两次确定性修复；最多一次视觉精修；通过后归档。
- Required artifacts：设计合同、唯一生成主图、可运行页面、桌面开场/中段/完成态、390px、reduced-motion、键盘、缺图回退、最终 DirectCreativeRun 与精选入口。
- Autonomy authorization：用户已要求继续并持续按小阶段实现，不重复确认范围内可逆决定。
- User-decision boundary：不采购或宣称真实生态调查素材；不扩展票务后台、地图服务或真实预订接口。

## 方向与素材职责

- 主视觉：单张连续月光潮池全景，明确包含岩岸、海葵浅池、蟹洞三段，并留出可读前景区；由内置图像生成能力一次生成。
- 代码增强：横向位置、检查镜、热点、站点焦点、路线和保存反馈；不使用低质量 CSS 图形替代主图。
- 参考原理：借用 R125“生成环境负责地点、代码负责互动”的职责分离；借用横向穿行研究中的非劫持式导航和多输入等价原则，不复制既有视觉外壳。
- 素材失败边界：只检查一次生成结果；若主题、连续空间或三站对象不可辨认，则停止为研究结果，不静默重生。

## 可观察完成标准

1. 主图真实加载、无水印或内嵌文字，三段空间连续且无拼接边界。
2. 前 3 秒可理解“月光潮池夜巡”和横向巡游方式。
3. 滚轮、拖拽、触摸、方向键或按钮至少三种输入改变同一横向位置与站点状态。
4. 到达三个站点时，全景位置、检查镜、说明、进度与路线同步变化。
5. 三站完成后保存动作可用并给出成功反馈。
6. 390px 无 body 横向溢出；reduced-motion 去除惯性但保留完整状态。
7. 主图加载失败时，简化 SVG 回退仍可完成三站与保存。
8. 最终证据绑定同一 `runId + bundleHash`，哈希必须包含主图原始字节。

## 覆盖清单

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 目标锁定 | 横向全景而非已验证旧结构 | contract | 文档 / schema test | 0 | pass | 已冻结并完成 |
| 素材 | 唯一生成式宽幅潮池主图 | delivery asset | 文件 / 视觉检查 / hash | 1 | pass | 单批次生成并纳入哈希 |
| 首屏 | 主图、标题与巡游入口可理解 | desktop opening | `01-desktop-opening.png` / asset state | 2-3 | pass | 已通过 |
| 横向穿行 | wheel / drag / touch / Arrow / buttons 共享位置 | desktop / mobile | 浏览器输入与 snapshot | 4-5 | pass | 五种输入已验证 |
| 三站因果 | 位移、检查镜、说明、进度、路线同步 | three stations | 前后状态 / 像素证据 | 5-6 | pass | 三站已验证 |
| 保存 | 三站后保存路线 | completion | `03-desktop-route-saved.png` | 5-6 | pass | 已通过 |
| 手机 | 390px 可触摸、按钮可达、body 无溢出 | mobile | `04-mobile-reduced.png` / 操作 | 7 | pass | 已通过 |
| 动效边界 | reduced-motion 保留离散穿行 | reduced | 浏览器状态 | 7-8 | pass | 已通过 |
| 素材回退 | 主图失败不阻断旅程 | fallback | `05-fallback-complete.png` | 8 | pass | 已通过 |
| 工程 | tests / build / console / request | repository/runtime | Vitest / Playwright / build | 9 | pass | 5/5 浏览器验收与构建通过 |
| 归档 | 只保存通过质量门的最终版本 | V2.5 registry | `direct-r132-moonlit-tidepool-panorama` + image-bound hash | 9 | pass | 质量 95 / Wow 96，进入精选 |

## 执行边界

- 一个方向：月光潮池横向全景。
- 一次素材批次：一张生成式主图；不生成第二候选。
- 一次完整构建；最多两次确定性修复；最多一次视觉精修。
- 任一阶段超过 60 秒报告状态；失败不静默重试。
- 通过质量门后才新增 `horizontal-panorama` 宏观结构和精选案例；未通过则诚实停止。
