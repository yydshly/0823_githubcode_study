# R95 · 音板调校声音反馈修复

## Design contract

- Entry mode: repair-led
- Request revision: R95
- Target user and context: 需要比较同一块云杉音板调校前后响应的制琴学习者
- Desired first impression: 音板调校不只是图片变化，用户能立即听见参数变化对应的模拟敲击差异
- Visual ambition: Immersive
- Experience architecture: Hybrid Workspace（左侧 Canvas 音板是持续视觉证据，右侧测量台负责控制、声音与保存）
- Visual constraints: 保留 R94 的音板主视觉、信息层级与浅色工坊材质；声音控件不得夺走音板焦点
- Information constraints: 必须区分基准/当前，明确程序化教学模拟声不是真实录音
- Operation constraints: 声音只能由用户手势解锁；滚动不自动发声；滑杆释放后试听；可静音和调节音量
- State constraints: idle、playing、ready、muted、unsupported 均需可读；音频不可用时视觉和数值仍能完成比较
- Environment constraints: Chrome/Chromium；桌面 1440×900、移动 390×844；支持 reduced motion
- Primary journey: 打开案例 → 点击 A/B 比较 → 调整厚度并松开试听 → 静音/恢复 → 保存方案
- User-defined phase: 为声音产品补齐与产品特点相关的听觉反馈
- Required artifacts: 案例源码、同步 bundle、浏览器交互测试、本记录
- Autonomy authorization: 用户明确“继续”，允许在当前案例内直接实现并验证
- User-decision boundary: 不接入真实录音、外部 API 或改造全局生成架构
- Observable completion criteria: 首次点击可解锁并播放；A/B 状态可区分；滑杆释放触发当前模拟声；静音阻止播放；移动端无横向溢出；无页面错误

## Refinement ledger / coverage

| Item | Surface / state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| A/B 敲击 | desktop / foreground | Playwright 确认 AudioContext 成功后 `audio-state=playing`，A/B 高亮与文案一致 | 5 | pass | — |
| 滑杆试听 | desktop / manual | `input + change` 后人工接管、2.70 mm 数值与当前敲击联动 | 5 | pass | — |
| 静音恢复 | desktop / muted | `aria-pressed` 与 `audio-state` 在 muted/ready 间一致切换 | 6 | pass | — |
| 无 Web Audio 回退 | desktop / unsupported | 禁用 AudioContext 后提示回退，厚度控制与保存仍可用 | 6 | pass | — |
| 移动端布局 | 390×844 / reduced motion | 控件可见，横向溢出 0 px，非必要声波动画停用 | 7 | pass | — |
| 工程闭环 | bundle / build | 5 个案例源码已同步；案例编译 0 error；项目 build 通过；归档完整性 8/8 | 9 | pass | — |

## Runtime

- Start: `npm run dev -- --host 127.0.0.1 --port 8143 --strictPort`
- Canonical URL: `http://127.0.0.1:8143/cases/dedicated-b4d381a24320/?quality=high&motion=full&revision=r95-audio`
- Recorded: 2026-08-30, Asia/Shanghai

## Validation closure

- `npm run build`: pass
- `compileDedicatedSources(dedicated-b4d381a24320)`: 0 errors
- `vitest`（case catalog / asset / archive integrity）: 8/8 pass
- `playwright e2e/soundboard-audio-r95.spec.ts`: 2/2 pass
- 正式音板图集已从临时 API 切换到 `/creative-assets/r92-luthier-soundboard-state-atlas-v1.png`
- 本阶段无 `continue`、无 `defer`、无 `blocked`
