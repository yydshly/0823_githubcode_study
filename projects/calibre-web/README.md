# Calibre-Web 使用评估

> 对 [janeczku/calibre-web](https://github.com/janeczku/calibre-web) 的轻量评估：已经完成项目定位、工作原理、能力边界和扩展方向的理解。它是 Calibre 书库之上的 Web 管理、阅读与设备分发层，不提供书籍正文数据源；当前没有明确的电子书库管理需求，因此不继续部署或深度研究。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 上游仓库 | [janeczku/calibre-web](https://github.com/janeczku/calibre-web) |
| 研究基线 | e1f04638c8fa1697b9676f70689882c294d6d33f，上游 master 于 2026-08-26 的 HEAD |
| 项目定位 | 基于 Calibre 数据库的自托管电子书 Web 管理、在线阅读和设备分发服务 |
| 研究方式 | 官方 README、Wiki、依赖与核心模块阅读；未进行本地部署或性能测试 |
| 当前状态 | 已完成定位理解，轻量评估后归档 |
| 许可证 | GPL-3.0 |

## 核心结论

Calibre-Web 不是电子书内容平台、书籍搜索引擎或数据采集系统。它要求用户先拥有合法来源的 EPUB、PDF、漫画或有声书，并将这些内容组织为 Calibre 书库；随后提供网页访问、元数据管理、权限、在线阅读、下载以及 Kobo、Kindle、OPDS 等分发能力。

    人工上传 / 合法外部数据源
              ↓
    电子书文件 + Calibre metadata.db
              ↓
    Calibre-Web
      网页管理 / 搜索 / 阅读 / 权限 / 设备分发

项目能够查询 Google Books、Amazon、豆瓣等服务来补充封面、作者、ISBN、简介和标签，但这些属于元数据，不是书籍正文来源。它解决的是“已经有书以后如何管理和阅读”，不解决“内容从哪里来、如何持续采集、如何进行 AI 理解”。

## 主要能力

- 浏览、搜索、筛选和整理 Calibre 书库；
- 编辑书名、作者、封面、系列、标签和自定义字段；
- 上传 EPUB、PDF、MOBI、AZW、漫画和音频等文件；
- 在浏览器中阅读 EPUB、PDF、TXT、DJVU 和漫画；
- 管理多用户、角色、下载权限和分用户内容可见性；
- 创建个人书架，记录已读状态和部分设备阅读状态；
- 通过 OPDS 向兼容阅读器提供目录和下载；
- 通过邮件发送到 Kindle，并同步 Kobo 书库；
- 调用 Calibre ebook-convert、Kepubify、ImageMagick 等外部工具完成格式转换和封面处理；
- 通过 LDAP、OAuth 或反向代理接入身份认证。

## 工作原理

Calibre-Web 是一个以 Flask、SQLAlchemy 和服务端模板为核心的 Python 单体应用。它同时使用两类数据：

1. Calibre 的 metadata.db 与书籍文件目录，保存公共书目、格式和文件路径；
2. Calibre-Web 自有 SQLite 数据库，保存用户、权限、书架、下载记录、配置和 Kobo 同步状态。

Web 页面、OPDS Feed 和 Kobo 兼容接口从这两部分数据构造响应。格式转换等重型任务并非由 Calibre-Web 自行实现，而是通过子进程调用外部程序。

这种设计适合个人、家庭、NAS 和小团队书库，但核心仍受 Calibre 文件布局与 SQLite 数据模型约束，不应直接视为高并发、多租户内容平台。

## 对我们的价值判断

| 方向 | 当前价值 | 结论 |
| --- | --- | --- |
| 电子书和 PDF 统一管理 | 当前低 | 暂无明确的大规模书库管理需求，不部署 |
| 书籍内容数据源 | 无 | 项目不提供书籍正文、采集或下载能力 |
| AI 知识库与语义搜索 | 间接价值 | 可作内容展示层，但不提供解析、向量检索或问答能力 |
| Kindle、Kobo、OPDS 分发 | 观察价值 | 出现阅读器分发需求时可直接复用或参考 |
| 多用户私人图书馆 | 观察价值 | 家庭或小团队书库形成规模后再评估 |
| 产品平台核心 | 较低 | 传统单体与 Calibre 数据边界会限制多租户和深度产品化 |

当前只保留以下认识：

1. Calibre-Web 是书库的 Web 管理与分发层，不是数据源；
2. Calibre 负责底层书库格式，Calibre-Web 增加用户和访问体验；
3. OPDS、Kobo 和 Kindle 是它最值得复用的设备分发能力；
4. 如果未来建设 AI 阅读产品，优先采用旁路 AI 服务，而不是把采集、解析和模型任务直接塞入 Calibre-Web；
5. 在没有真实书库和设备分发需求前，继续研究源码的边际收益较低。

## 当前不继续研究的原因

- 没有需要统一管理的大规模 EPUB、PDF、漫画或有声书资产；
- 项目不提供我们更关心的内容数据源、采集、清洗、OCR、语义检索和 AI 问答；
- 当前研发方向不依赖 Kobo、Kindle 或 OPDS 分发；
- 其主要能力可以在需求出现时直接部署验证，无需提前维护运行环境；
- 已能够准确判断定位、依赖、数据边界和适用场景，继续拆解的投入产出比较低。

## 重新评估条件

只有出现以下任一情况时再启动部署或源码研究：

- 已积累大量电子书、PDF、漫画或有声书，需要统一管理；
- 需要为家庭或团队提供带权限的私人图书馆；
- 需要把自有内容同步至 Kobo，或通过 OPDS、Kindle 邮件分发；
- 正在建设 AI 阅读或知识产品，需要一个成熟的电子书展示与下载层；
- 自研书库管理、书架、阅读状态或设备协议的成本开始高于复用现有项目。

## 整理决定

- 不克隆 Calibre-Web 上游源码为 Git submodule；
- 不搭建 Calibre、Calibre-Web、Kepubify 或 ImageMagick 运行环境；
- 不保存书籍样本、数据库或第三方内容；
- 不进行性能、设备同步或公网部署测试；
- 不发布单独的 GitHub Pages 演示；
- 保留本说明、准确上游入口、研究基线、核心结论和重新评估条件；
- 在仓库外部 README 中标记为“轻量评估后归档”。

## 参考资料

- [上游仓库与官方 README](https://github.com/janeczku/calibre-web)
- [配置说明](https://github.com/janeczku/calibre-web/wiki/Configuration)
- [Kobo 集成说明](https://github.com/janeczku/calibre-web/wiki/Kobo-Integration)
- [OPDS 实现](https://github.com/janeczku/calibre-web/blob/master/cps/opds.py)
- [Kobo 实现](https://github.com/janeczku/calibre-web/blob/master/cps/kobo.py)
- [数据库模型](https://github.com/janeczku/calibre-web/blob/master/cps/db.py)
- [用户数据模型](https://github.com/janeczku/calibre-web/blob/master/cps/ub.py)
- [GPL-3.0 许可证](https://github.com/janeczku/calibre-web/blob/master/LICENSE)
