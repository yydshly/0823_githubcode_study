# R137 · 狐步三拍（Fox Gait Observatory）

## 阶段结论

R137 已形成一个通过 V3 最终门的 `threejs-spatial` 交付，用于补齐 V3 已验证媒介中的真实 3D 模型路线。页面不是程序化狐狸、静态贴图或暗色参数工作台：同一只本地 Fox GLB 持续作为空间主体，按钮与键盘切换模型内 `Survey`、`Walk`、`Run` 三套真实命名动画；拖拽、滚轮、动作说明、足迹节距与观察卡保存均围绕同一状态工作。

- Delivery: `pages/v2/deliveries/fox-gait-observatory/`
- Run: `direct-r137-fox-gait-observatory`
- Bundle hash: `7b234dd7c3d49d642a974b7e6797fb47d14967f9a9f34b6d1c93664b1c9f83e6`
- Medium: `threejs-spatial`
- Rendering: `threejs-3d` + `dom-css`
- Macro structure: `spatial-inspection`
- Final verdict: `pass`
- Visual quality: `92`
- WowGate: `91` / `pass`

## 模型真实性

唯一模型来自 KhronosGroup `glTF-Sample-Assets / Models/Fox`，本地文件是官方 binary glTF 的未修改副本。

- File: `assets/Fox.glb`
- Bytes: `162,852`
- SHA-256: `d97044e701822bac5a62696459b27d7b375aada5de8574ed4362edbba94771f7`
- GLB: version 2；1 scene；26 nodes；1 mesh / primitive；1 skin；1 material / texture / image
- Animations: `Survey`、`Walk`、`Run`，每套 21 channels / 21 samplers
- License boundary: Fox model CC0；rigging / animation / glTF conversion CC BY 4.0
- Visible disclosure: 页面持续显示模型来源、许可和“模型动作演示 · 不是野外测量数据”

真实性由 `asset-manifest.json`、`MODEL-CREDITS.md`、GLB 内嵌 copyright、静态测试及最终 bundle hash 共同约束。模型字节、页面、交互源码、manifest、credits 和合同任一修改都会使旧浏览器证据失效。

## 浏览器验收

最终 report：`docs/v2-research/evidence/r137-fox-gait-observatory/report.json`

1. `desktop-opening`：自然观察手册壳 231ms 可见；Fox GLB 单次 200 响应、162,852 bytes，并成为 Survey 空间主体。
2. `desktop-gait-inputs`：按钮、数字键、左右方向键共享同一动作状态，覆盖 Survey / Walk / Run。
3. `desktop-orbit-saved`：reduced-motion 下分别证明拖拽环绕与滚轮缩放产生不同 canvas hash；Run 观察卡跨重载保存。
4. `mobile-reduced`：390×844 保留模型、三种动作与可达按钮，无横向溢出。
5. `fallback-complete`：`fallback=1` 不请求 GLB、不显示 Canvas、不冒充动画播放，仍可选择三种说明并保存观察卡。

五个 checkpoint 均无 page error、console error、request failure 或 response error。

## 已知边界

本地 Vite + 软件 WebGL 的浏览器冷启动中，主题壳在 231ms 出现，但完整模型 ready 为 10,010ms。两者在同一 report 中分别记录，未把模型到达伪装成五秒 Hero。模型本身仅 162,852 bytes；发布阶段仍应使用生产构建复核首模到达时间。该项作为唯一 minor finding 保留，不在本阶段发起第二素材批次、视觉返工或无界性能探索。

R137 只证明“可追溯动画 GLB 作为专属网页主体”的路线已经成立，不代表任意 3D 资产都自动具有相同质量，也不扩展到模型生成后台、动物识别、真实野外测量或商业发布服务。
