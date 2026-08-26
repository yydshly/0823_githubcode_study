# 案例库修复结果 R43

## 结论

案例目录现保留两个能力基准与五个自然语言目标的当前最优作品。案例卡不再共享先锋时装背景，而是直接使用各自最终构建过程中沉淀的真实素材。

“夜生表皮”和“从一枚种子开始呼吸”不是两个遗漏案例：前者是归档标题，后者是该作品首屏的核心叙事句，二者属于同一个最终案例 `dedicated-r36-delivery-final`。

## 当前五个目标

| 案例 | 稳定归档 | 案例卡素材 | 状态 |
| --- | --- | --- | --- |
| 智能声音产品 | `/cases/dedicated-1edb98865f4c/` | `acoustic-resonance-instrument-v1.png` | 精选 |
| 夜生表皮温室 | `/cases/dedicated-r36-delivery-final/` | `biomaterial-mature-greenhouse-v1.png` | 精选 |
| 先锋时装 | `/cases/dedicated-ba4e9d10caaa-depth-field/` | `fashion-fluid-couture-cutout-v2.png` | 精选 |
| 梦境记录 | `/cases/dedicated-8574ee46ab16/` | `dream-room-awakening-v1.png` | 备用精修 |
| 云上观测站 | `/cases/dedicated-896cfb7e6657/` | `observatory-approach-v1.png` | 备用精修 |

海洋记忆方向仍只有低完成度程序化预览，没有专属资产和最终视觉验收，因此没有为了凑数量加入案例库。

## 本轮修复

- 为每个案例建立独立、显式的展示素材映射；主体素材采用 `contain`，环境素材采用 `cover`。
- 主操作改为“打开稳定归档”，生成目录只作为次要的“生成记录”。
- 为五个案例分别记录真实的素材生成、场景构建和精修过程，不再复用先锋时装说明。
- 更新案例页标题与数量：2 个能力基准、3 个精选案例、2 个备用精修案例。
- 增加目录、素材、展示映射和真实浏览器端到端测试。

## 验证证据

- 单元与完整性测试：4 个文件、10 项断言通过。
- 浏览器验收：桌面与手机共 2 项通过；五个案例使用五个不同素材，稳定归档链接正确，手机端无横向溢出。
- 生产构建通过；仅保留项目原有的 Vite 导入扩展名和大包警告。
- 视觉证据：`docs/evidence/cases-r43/desktop-overview.jpg`、`mobile-overview.jpg`、`contact-sheet.jpg`。
