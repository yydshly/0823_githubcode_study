# AI 内容视频工厂

这不是一支固定视频，而是一套“结构固定、内容可变”的 HyperFrames 模板。

## 它演示什么

- `video-spec.example.json`：业务系统应该提供什么信息。
- `index.html`：信息如何映射到 6 个镜头与 18 秒导演剪辑时间轴。
- `batch.json`：同一模板的两组变量——AI 日报、产品更新。
- `render-demo.ps1`：一次命令批量输出两支 MP4。

## 直接运行

```powershell
cd E:\0823_codex_project\projects\hyperframes-launches\examples\ai-content-video-factory
.\render-demo.ps1
```

等价 CLI：

```powershell
npx.cmd --yes hyperframes@latest render --batch batch.json --output "renders/{name}.mp4" --quality high --resolution landscape --workers 2 --batch-concurrency 1 --strict-variables --json .
```

## 真正接入业务时

1. 数据源或 AI 先产出 `VideoSpec`。
2. 将 `content/evidence/distribution/theme` 展平为批处理的一行。
3. HyperFrames 把每一行注入同一个 HTML 时间轴。
4. 本地、CI 或云端渲染得到独立视频。
5. 发布服务将成片同步到网站、知识库、客户群或社交渠道。

最重要的边界：HyperFrames 负责“可编程画面与渲染”，数据采集、事实校验、AI 写稿与发布审批仍由你的上游系统负责。
