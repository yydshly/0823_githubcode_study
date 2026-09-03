# V2 地域证据案例沉淀契约（R23）

- Entry mode: revision-led
- Primary goal: 服务“用户想法生成优秀网页”，把已验证的真实地域表达沉淀为可复用证据，不扩张为送水业务系统。
- Target surface: `/cases.html` 案例卡片与 `/cases/dedicated-c0514ddead80/` 稳定归档页。
- Desired first impression: 明亮公共图册、真实地域关系、信息优先；不回到暗色电影产品页。
- Visual ambition: Editorial + Immersive enhancement
- Experience architecture: Editorial Flow；Three.js 地图是信息增强层，DOM 保留完整内容和操作。
- Preserve: 徐汇滨江真实底图、四个地标关联演示站点、站点选择、路线与证据同步、署名和演示披露。
- Reject: 前序伪地图候选、同一 brief 多个案例、把演示站点包装为真实设施、继续开发配送业务。
- Primary journey: 案例库识别该方向 → 打开稳定归档 → 选择站点并核对地图与证据。
- Required artifacts: 专属案例封面、稳定运行包、案例说明、四步研究过程、完整性测试。
- Authorization: 用户已明确要求沉淀并接入示例库，可直接实施可逆项目修改。
- Completion: 案例目录只新增一个最终版本；卡片使用自己的地图封面；归档页桌面与 390px 可访问、无横向溢出、无脚本或资源错误；键盘可选择站点。

## 覆盖记录

| Requirement | Surface / state | Evidence | Status |
| --- | --- | --- | --- |
| 最佳版本唯一归档 | catalog + stable run | `case-catalog-integrity` 通过；`cases/runs/dedicated-c0514ddead80` 完整 | pass |
| 专属地图封面与真实性说明 | cases desktop/mobile | 卡片使用 `xuhui-west-bund-osm-map-v1.jpg`；说明含真实地理与演示数据边界 | pass |
| 卡片进入稳定归档 | cases → case | 链接为 `/cases/dedicated-c0514ddead80/`，浏览器返回完整页面 | pass |
| 站点选择与证据同步 | case selected state | 点击切换到油罐艺术中心；键盘 Enter 切换到龙美术馆，证据同步 | pass |
| 键盘、reduced motion、资源与溢出 | case cross-surface | 桌面/390px 溢出 0；焦点轮廓可见；署名可见；无失败资源；强制无 WebGL 后 DOM 与四站点保留 | pass |
| 研究规则进入后续生成 | V2 capability/reference | `place-grounded-experience` 与 `kage-xuhui-place-evidence` 已接入；17 项定向测试和完整构建通过 | pass |

## 归档结论

案例以 `refined` 身份进入案例库，不宣称精选视觉成品。正常 WebGL 路径没有脚本错误；强制禁用 WebGL 时 Three.js 会报告预期的上下文创建错误，但页面正确进入 `.webgl-unavailable`，标题与四个站点仍可读可操作。浅色主题是该案例的明确视觉边界，未声明暗色主题。
