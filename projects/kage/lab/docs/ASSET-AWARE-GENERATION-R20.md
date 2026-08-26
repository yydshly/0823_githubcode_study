# R20 · 资产感知的专属网页生成

## 设计契约

- Entry mode: revision-led implementation
- Request revision: R20
- Target user and context: 输入一个创意想法，希望得到非模板、素材与 Three.js 共同构成的完整网页
- Desired first impression: 首屏有可信视觉主体，而不是抽象几何占位；滚动和鼠标继续改变空间关系
- Visual ambition: Immersive
- Experience architecture: Hybrid Workspace
- Selected pattern: asset-aware DOM + WebGL scroll story
- Evidence branch: ChatGPT 生成的 `fashion-fluid-couture-v1.png` 与 GPT-5.6 Sol 专属代码生成
- Visual constraints: 素材形成主体与材质证据；WebGL 形成深度、光场、视差与运动；DOM 形成可读叙事
- Information constraints: 回执明确显示模型、源码文件、素材数、编译和安全状态
- Operation constraints: 一个主生成动作；素材自动匹配；未匹配时安全回退到程序化路线
- State constraints: generating、asset-aware、compiled、failed 可辨认；失败保留旧预览
- Environment constraints: Codex CLI 0.149.1；GPT-5.6 Sol low；ChatGPT 内置图像生成；420 秒单次有界预算；沙箱无网络
- Primary journey: brief → 匹配有来源项目素材 → GPT-5.6 生成专属源码 → 白名单/TS → sandbox → 跨端验收
- Required artifacts: 项目素材、资产目录、资产感知请求契约、运行时安全校验、真实 bundle、桌面/移动端证据、测试
- Autonomy authorization: 用户明确“继续”并要求持续实现与演示
- User-decision boundary: 不虚构 GLB、音频或发布许可；真实外部素材 API 仍需用户配置密钥
- Observable completion criteria: 时装 brief 自动选中资产；请求和 bundle 记录资产；代码实际引用获批 URI；沙箱可加载；Canvas/DOM/滚动/指针有效；390px 无溢出；浏览器零阻断错误；回归和构建通过

## 验收结果

| 用户阶段 | 要求 | 结果 | 证据 |
| --- | --- | --- | --- |
| 素材 | ChatGPT 素材进入项目且有来源 | pass | `public/creative-assets/fashion-fluid-couture-v1.png`；1,851,938 bytes |
| 调度 | brief 自动匹配高收益素材 | pass | catalog unit；真实请求 `reference.assets[0]` |
| 安全 | 生成代码只能使用获批本地 URI | pass | 未获批/未使用/未声明三类拒绝测试；opaque-origin CORS |
| 画面 | 素材与 Three.js 形成完整首屏和滚动故事 | pass | opening/middle-pointer/ending；2 Canvas；Three + Shader |
| 跨端 | 390px、reduced motion、无横向溢出 | pass | 390×844；ready true；overflow 0 |
| 工程 | unit、browser、build | pass | 67 unit；56 browser；production build |

## 真实生成回执

- Run: `dedicated-ba4e9d10caaa`
- Model: `gpt-5.6-sol`
- Duration: 159 秒
- Attempts: 1
- Bundle: 4 files / 19,645 bytes
- Asset: `fashion-fluid-couture-v1` / ChatGPT generated / 1,851,938 bytes
- Compile: 672 ms
- Runtime: Three.js + Shader + TextureLoader
- Desktop: 1440×900；scrollHeight 2911；scroll 0 → 1006 → 2011；overflow 0
- Mobile: 390×844；scrollHeight 2737；overflow 0
- Browser errors: 0
- URL: `/generated-runs/dedicated-ba4e9d10caaa/?quality=balanced&motion=full`
- Evidence: `evidence/r20-asset-aware-live-final`

## 视觉评审

- 首屏：素材提供可信高定轮廓；大字与暗部留白形成明确层级。
- 中段：相机推进并放大材质细节，双 Shader 薄幕分离，中文主张成为叙事节点。
- 结尾：运动减弱，页面回到稳定可读构图并保留明确行动。
- 指针：导演将 pointer 映射到相机 x/y 与场景轻微倾斜；最终状态自动衰减，避免持续晃动。
- 回退：素材加载失败时显示程序化 TorusKnot；DOM 内容不依赖 Canvas。

## 运行与验证

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 8143
node scripts\run-asset-aware-demo-r20.mjs
npm.cmd test
npx.cmd playwright test
npm.cmd run build
```
