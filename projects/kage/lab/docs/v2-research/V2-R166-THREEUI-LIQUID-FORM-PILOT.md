# V2 R166 · ThreeUI Liquid Form 机制验证

## 阶段结论

R166 已完成 ThreeUI 第一项有界机制验证：把 Community `Liquid Form` 的 Raw WebGL 原理适配到 KAGE 独立原型，验证“主题化视觉场 + 真实输入因果 + 生产生命周期”能否可靠成立。

本次结果是 **E4 runtime-validated / research-only-until-product-proof**，不是正式产品案例，也没有进入精选参考库。

## 页面与来源

- 本地入口：`/pages/v2/prototypes/threeui-liquid-form/`
- 强制降级：`/pages/v2/prototypes/threeui-liquid-form/?webgl=off`
- 上游：<https://github.com/MengTo/threeui>
- 固定 revision：`68802d5428071ada5c20db8094b1649e6bb770ed`
- 许可说明：[`pages/v2/prototypes/threeui-liquid-form/THIRD-PARTY-NOTICE.md`](../../pages/v2/prototypes/threeui-liquid-form/THIRD-PARTY-NOTICE.md)

## 已验证能力

1. Raw WebGL ray-march 主体可以在 KAGE 页面中独立运行，不增加 React 或 ThreeUI package 依赖。
2. 真实指针输入会改变主体视线与高光，预设和滑杆会改变形变、噪声密度与指针作用强度。
3. 绘制限制在最高约 60 FPS，DPR 最高 1.5，避免高刷新率屏幕无意义增加 Shader 负担。
4. IntersectionObserver、页面可见性、ResizeObserver 和 pagehide 共同负责暂停、缩放与销毁。
5. 390px + reduced motion 状态保留完整内容与控件，并停止持续绘制。
6. `?webgl=off` 保留标题、解释、控件和 CSS 视觉回退，不出现横向溢出。

## 浏览器证据

- [桌面互动状态](./evidence/r166-threeui-liquid-form/01-desktop-interactive.png)
- [390px 减少动态效果](./evidence/r166-threeui-liquid-form/02-mobile-reduced.png)
- [无 WebGL 降级](./evidence/r166-threeui-liquid-form/03-webgl-fallback.png)

自动验收：3/3 通过，覆盖桌面 WebGL 动画与真实指针、390px reduced-motion、强制 WebGL fallback；无 page error、console error、请求失败或横向溢出。

## 可沉淀与不可沉淀

可以沉淀：

- 一个主题化视觉现象承担核心记忆点；
- 输入直接改变核心主体；
- 视觉质量与 resize、DPR、暂停、降级、销毁属于同一能力；
- 局部机制无需把整个第三方组件库变成生产依赖。

不可沉淀：

- 银色液态球体；
- 暗色背景；
- 中央单一主体；
- 把 WebGL Hero 当成所有产品网页的默认结构。

## 尚未晋级的原因

这个原型证明“机制可运行”，但还没有证明它能帮助 Codex 为一个新的用户想法做出更好的完整产品选择。只有在后续端到端产品创作中，机制确实强化主题、核心行动和用户感受，才可以把去外壳后的原则提升为 `ReferenceEvidencePack`。

下一小阶段转向动态排版机制，目的是保持创意媒介多样性，而不是继续精修这个液态视觉。
