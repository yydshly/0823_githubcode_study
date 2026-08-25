const skills = [
  {
    route: "R12",
    name: "api-security",
    category: "platform",
    ability: "评估 REST、GraphQL、WebSocket、SOAP 的发现、认证、授权、限流与 CI/CD 安全。",
    meaning: "把接口从“能调用”提升为按身份、对象和业务规则正确受控。",
    trigger: "提到 API 安全、GraphQL、BOLA/BFLA、接口越权或未授权访问时。"
  },
  {
    route: "R1",
    name: "apk-reverse",
    category: "reverse",
    ability: "APK 解包、Java 反编译、smali 修改、重打包、Frida Hook，并可转入 native 分析。",
    meaning: "为 Android 包建立从静态代码到运行时行为的专用路径。",
    trigger: "出现 APK、Android、jadx、apktool、smali、Root 检测或证书校验时。"
  },
  {
    route: "R10",
    name: "attack-chain",
    category: "offense",
    ability: "编排侦察、初始访问、提权、横向移动和目标达成等多阶段攻击路径。",
    meaning: "解决单个漏洞 Skill 无法表达的跨阶段依赖与证据交接。",
    trigger: "任务要求完整渗透、红队、内网横向或从外网走到域内目标时。"
  },
  {
    route: "R15",
    name: "binary-diff",
    category: "reverse",
    ability: "比较二进制版本，并把旧版本符号和已知分析结果迁移到新版本。",
    meaning: "减少每个版本从零命名函数和重新定位逻辑的成本。",
    trigger: "提到 BinDiff、版本对比、PDB 缺失、符号迁移或补丁前后定位时。"
  },
  {
    route: "R19",
    name: "browser-automation",
    category: "orchestration",
    ability: "统一调用 Playwright 浏览器自动化和 Windows 桌面应用自动化。",
    meaning: "为需要真实 UI 操作的其他 Skill 提供执行表面，而非承担安全结论。",
    trigger: "任务明确需要浏览器/桌面自动化、自动填表或 OpenReverse 时。"
  },
  {
    route: "R30",
    name: "browser-extension-reverse",
    category: "reverse",
    ability: "分析 Chrome/Firefox 扩展的 manifest、后台 worker、权限、消息通道与敏感数据路径。",
    meaning: "覆盖扩展这种既有前端代码又有浏览器特权的特殊客户端。",
    trigger: "出现浏览器扩展、Chrome extension、CRX、XPI 或 Manifest V3 时。"
  },
  {
    route: "R40",
    name: "case-review",
    category: "orchestration",
    ability: "只读检查 scope、Evidence、Finding、Path、时间线、工作项引用和制品哈希。",
    meaning: "在报告交接前发现缺证据、断链和文件完整性问题。",
    trigger: "提到案件复核、证据链、可追溯性、fixity 或正式交接时。"
  },
  {
    route: "R23",
    name: "cloud-k8s",
    category: "platform",
    ability: "评估云元数据、IAM、容器逃逸路径、Kubernetes RBAC 与集群配置。",
    meaning: "把云身份、控制面和工作负载的信任关系放在同一视图检查。",
    trigger: "出现云安全、K8s、Kubernetes、容器逃逸、IMDS、S3 或存储桶时。"
  },
  {
    route: "R26",
    name: "code-audit",
    category: "defense",
    ability: "使用 Semgrep、CodeQL 和危险 API 模式开展源代码审计与修复验证。",
    meaning: "在拥有源码时优先从数据流和调用点发现问题，避免不必要的逆向。",
    trigger: "提到代码审计、白盒、SAST、Semgrep、CodeQL 或 source review 时。"
  },
  {
    route: "R41",
    name: "ctf-sandbox",
    category: "orchestration",
    ability: "作为 CTF、AWD、靶场多类型任务的薄路由，交给 42 个侧车子 Skill 编排。",
    meaning: "给比赛混合题型一个统一入口，同时允许具体 pwn 等路由优先。",
    trigger: "用户只说明 CTF、AWD、靶场或比赛题，尚未明确具体技术类型时。"
  },
  {
    route: "R35",
    name: "database-security",
    category: "platform",
    ability: "检查 PostgreSQL、MySQL、MSSQL、MongoDB、Redis 的暴露、授权与危险执行路径。",
    meaning: "区分数据库自身配置风险与应用层 SQL 注入问题。",
    trigger: "出现数据库安全、MySQL、Postgres、Mongo、Redis 或数据库渗透时。"
  },
  {
    route: "R39",
    name: "diagram-generator",
    category: "orchestration",
    ability: "从自然语言、代码和表格生成并校验 Mermaid、Graphviz、PlantUML 等图表。",
    meaning: "把调用链、攻击路径和安全架构变成可审查的视觉交付物。",
    trigger: "要求流程图、架构图、时序图、数据流图或攻击路径图时。"
  },
  {
    route: "R25",
    name: "digital-forensics",
    category: "defense",
    ability: "开展内存、磁盘、PCAP、时间线和应急响应制品的取证与保存。",
    meaning: "回答事件发生后“发生了什么、何时发生、证据是否完整”。",
    trigger: "出现取证、内存转储、Volatility、Autopsy、时间线或应急响应时。"
  },
  {
    route: "R20",
    name: "docs-generator",
    category: "orchestration",
    ability: "生成 README、架构说明、安全报告和渐进披露的技术文档。",
    meaning: "把分析过程转换为不同受众能理解和复现的正式交付。",
    trigger: "主要目标是 writeup、生成报告、逆向报告或技术文档时。"
  },
  {
    route: "R5",
    name: "dotnet-reverse",
    category: "reverse",
    ability: "分析 .NET/C# assembly、IL、元数据、NativeAOT 与 ConfuserEx 等混淆。",
    meaning: "利用托管元数据保留的信息，采用不同于原生机器码的逆向路径。",
    trigger: "出现 .NET、C#、dnSpy、de4dot、ConfuserEx 或托管 EXE/DLL 时。"
  },
  {
    route: "R18",
    name: "edr-bypass-re",
    category: "offense",
    ability: "研究 EDR/AV 的 Hook、ETW、AMSI 和 syscall 监控实现，再评估针对性绕过。",
    meaning: "把防御实现的逆向观察转为有边界的红队验证。",
    trigger: "授权场景中明确提到 EDR、AV bypass、AMSI、ETW 或 direct syscall 时。"
  },
  {
    route: "R36",
    name: "email-security",
    category: "defense",
    ability: "分析钓鱼邮件、邮件头、SPF/DKIM/DMARC、BEC 模式与邮箱令牌滥用。",
    meaning: "把内容判断、身份验证和账号风险连接起来。",
    trigger: "出现钓鱼邮件、SPF、DKIM、DMARC、BEC 或邮件安全时。"
  },
  {
    route: "R8",
    name: "firmware-pentest",
    category: "reverse",
    ability: "从固件镜像提取文件系统，进行静态分析、模拟和漏洞验证。",
    meaning: "覆盖没有常规安装环境的 IoT/路由器完整分析链。",
    trigger: "出现 firmware、binwalk、IoT、EMBA、路由器固件或嵌入式镜像时。"
  },
  {
    route: "R22",
    name: "ghidra-reverse",
    category: "reverse",
    ability: "使用免费 Ghidra GUI/headless 反编译、交叉引用与可选 MCP 工作流。",
    meaning: "在没有 IDA 时提供开放、可自动化的二进制分析路径。",
    trigger: "明确提到 Ghidra、analyzeHeadless、开源反编译或无 IDA 时。"
  },
  {
    route: "R33",
    name: "go-rust-reverse",
    category: "reverse",
    ability: "识别并恢复 stripped Go/Rust 二进制的运行时结构、符号线索和语言习惯。",
    meaning: "处理通用反编译器面对大型运行时与泛型模式时的特殊噪声。",
    trigger: "出现 Golang、Rust binary、pclntab、stripped Go 或 Rust 逆向时。"
  },
  {
    route: "R34",
    name: "hardware-security",
    category: "platform",
    ability: "研究 UART、JTAG、SWD、调试焊盘、Secure Boot 和离线芯片/固件提取。",
    meaning: "处理软件边界之外的物理接口和启动信任根。",
    trigger: "出现 UART、JTAG、SWD、flashrom、串口 Shell、芯片提取或 USB 设备逆向时。"
  },
  {
    route: "R6",
    name: "ida-reverse",
    category: "reverse",
    ability: "使用 IDA Pro 深入分析 PE、ELF、DLL、SO、SYS 等原生二进制。",
    meaning: "承担需要反编译、交叉引用、类型恢复和地址级证据的深度主线。",
    trigger: "明确提到 IDA、反汇编、反编译、native、JNI、SO/ELF 静态分析时。"
  },
  {
    route: "R37",
    name: "identity-federation",
    category: "platform",
    ability: "评估 SAML、OIDC、OAuth2、SSO 流程中的配置、令牌和身份混淆。",
    meaning: "专门处理跨系统传递身份与信任时产生的协议级风险。",
    trigger: "出现 SAML、OIDC、OpenID Connect、OAuth2、SSO 或联邦身份时。"
  },
  {
    route: "R3",
    name: "js-reverse",
    category: "reverse",
    ability: "定位前端签名链、运行时采样、抓包重放、补环境复现，并联动 CDP/Hook。",
    meaning: "把网页中分散的代码、浏览器状态和网络请求还原为可复现逻辑。",
    trigger: "出现 JS 逆向、Webpack、CryptoJS、前端签名、加密参数、抓包或请求重放时。"
  },
  {
    route: "R14",
    name: "llm-security",
    category: "platform",
    ability: "评估 Prompt Injection、工具滥用、RAG 暴露、记忆污染和模型供应链。",
    meaning: "把传统输入信任问题扩展到会调用工具和保存状态的 AI 系统。",
    trigger: "出现 LLM 安全、提示注入、模型越狱、Agent security、garak 或 PyRIT 时。"
  },
  {
    route: "R31",
    name: "macos-reverse",
    category: "reverse",
    ability: "分析 Mach-O、codesign、Objective-C/Swift、XPC 与 macOS 恶意程序表面。",
    meaning: "覆盖 Apple 桌面平台特有的二进制、运行时和签名体系。",
    trigger: "出现 macOS、Mach-O、codesign、Objective-C、Swift reverse 或 XPC 时。"
  },
  {
    route: "R9",
    name: "malware-analysis",
    category: "defense",
    ability: "结合静态、动态和行为分析提取 IOC，编写 YARA/Sigma 并识别反分析。",
    meaning: "从“可疑文件”形成行为、影响、检测和处置依据。",
    trigger: "出现恶意软件、病毒样本、木马、勒索、webshell、YARA 或沙箱时。"
  },
  {
    route: "R2",
    name: "mobile-reverse",
    category: "reverse",
    ability: "覆盖 Android/iOS 应用分析、运行时插桩、SSL pinning、越狱/Root 环境问题。",
    meaning: "当任务横跨移动平台或以 IPA/iOS 为主时提供统一移动视角。",
    trigger: "出现 IPA、iOS reverse、Objection、MobSF、mobile reverse 或 iOS 越狱时。"
  },
  {
    route: "R28",
    name: "ot-ics",
    category: "platform",
    ability: "以被动优先方式评估 Purdue 分区、PLC/SCADA 暴露和工业协议。",
    meaning: "把安全验证约束在高可用、高安全影响的工业环境规则内。",
    trigger: "出现 OT、ICS、SCADA、PLC、Modbus、DNP3、S7comm 或工控时。"
  },
  {
    route: "R16",
    name: "patch-diff-exploit",
    category: "offense",
    ability: "比较厂商补丁定位漏洞点，建立 PoC，并评估 N-day 利用路径。",
    meaning: "用已修复版本的变化缩小漏洞研究范围。",
    trigger: "出现 N-day、patch diff、Patch Tuesday、补丁差分或 CVE 补丁分析时。"
  },
  {
    route: "R11",
    name: "pentest-tools",
    category: "offense",
    ability: "编排信息收集、端口/漏洞扫描、Web 测试、注入、目录枚举和密码审计工具。",
    meaning: "作为授权主动安全测试的通用工具链入口。",
    trigger: "出现渗透、Nmap、Nuclei、SQLMap、FFUF、Burp、Hashcat 或提权时。"
  },
  {
    route: "R11 / secondary",
    name: "src-hunter",
    category: "offense",
    ability: "提供 SRC、众测和 Bug bounty 的 intake、recon、enum、hunt、report 五阶段 Playbook。",
    meaning: "把通用渗透工具组织成面向漏洞提交的连续工作流。",
    trigger: "在 pentest-tools 路线中进一步明确 SRC、众测、Bug bounty 或漏洞挖掘时。"
  },
  {
    route: "R21",
    name: "protocol-reverse",
    category: "reverse",
    ability: "从 PCAP、代码与交互恢复自定义二进制协议、Protobuf/gRPC 和 WebSocket 帧。",
    meaning: "把未知流量变成字段、消息类型、状态机和可复现解析器。",
    trigger: "出现协议逆向、PCAP、Wireshark、Protobuf、gRPC、流量分析或 dissector 时。"
  },
  {
    route: "R17",
    name: "pwn-chain",
    category: "offense",
    ability: "从二进制逆向、漏洞原语、ROP/堆利用走到可工作的 Exploit。",
    meaning: "连接“理解程序”与“证明可利用”的完整工程链。",
    trigger: "出现 pwn、栈/堆溢出、ROP、ret2libc、pwntools 或 kernel pwn 时。"
  },
  {
    route: "R7",
    name: "radare2",
    category: "reverse",
    ability: "通过 r2/rabin2 等 CLI 完成二进制侦察、反汇编、函数分析、差分与补丁。",
    meaning: "为自动化和无商业工具环境提供轻量命令行逆向能力。",
    trigger: "明确提到 radare2、r2、rabin2、radiff2、r2mcp 等工具时。"
  },
  {
    route: "R38",
    name: "radio-sdr",
    category: "platform",
    ability: "在屏蔽实验环境中识别射频信号、研究重放可行性与无线协议。",
    meaning: "覆盖 Wi-Fi 之外的物理层和专用无线信号。",
    trigger: "出现 SDR、HackRF、RTL-SDR、GNU Radio、URH、射频、蓝牙或 BLE 时。"
  },
  {
    route: "R4",
    name: "dsl-vm-reverse",
    category: "reverse",
    ability: "恢复基于 JavaScript 的自定义 DSL/VM、switch opcode 解释器和类 WASM 运行时。",
    meaning: "针对控制流被虚拟指令集重写、通用 JS 阅读失效的场景。",
    trigger: "出现 DSL VM、自定义虚拟机、opcode VM、Fireye 或 switch 解释器时。"
  },
  {
    route: "R0",
    name: "reverse-engineering",
    category: "reverse",
    ability: "提供跨平台 triage、静态、动态、反混淆、加壳与虚拟化分析方法。",
    meaning: "作为通用逆向方法论和无强关键词命中时的安全回退。",
    trigger: "任务只说逆向、反调试、OLLVM、符号执行或未知二进制，尚未明确专用路径时。"
  },
  {
    route: "R13",
    name: "supply-chain-security",
    category: "defense",
    ability: "检查 SBOM、SCA、CI/CD、容器镜像、构建完整性、依赖来源与漏洞。",
    meaning: "保护软件从依赖获取到构建发布的生产链，而不只检查最终程序。",
    trigger: "出现供应链、SBOM、Trivy、Gitleaks、Syft、依赖扫描或构建完整性时。"
  },
  {
    route: "R32",
    name: "thick-client",
    category: "platform",
    ability: "评估桌面厚客户端的本地存储、更新通道、IPC、网络流量和客户端信任。",
    meaning: "连接二进制分析与应用安全，覆盖 Electron、WPF、WinForms 等桌面形态。",
    trigger: "出现 thick client、桌面客户端、Electron app、WinForms 或 WPF 安全时。"
  },
  {
    route: "R27",
    name: "threat-hunting",
    category: "defense",
    ability: "开展威胁狩猎、SIEM 查询、Sigma/YARA 检测工程与规则验证。",
    meaning: "主动在环境中寻找尚未告警的攻击行为，并把发现固化为检测。",
    trigger: "出现 threat hunting、蓝队、检测工程、Sigma 规则或 SIEM 查询时。"
  },
  {
    route: "R44",
    name: "threat-intelligence",
    category: "defense",
    ability: "从公开来源扩充 IOC、攻击活动、仿冒、诈骗和威胁组织上下文。",
    meaning: "把单个指标连接到时间、基础设施、活动与可信来源。",
    trigger: "出现 OSINT、CTI、威胁情报、IOC enrichment，或安全语境下的社交媒体调查时。"
  },
  {
    route: "R29",
    name: "wifi-wireless",
    category: "platform",
    ability: "评估 Wi-Fi 捕获、WPA 握手、伪造 AP 检测和实验室内 deauth。",
    meaning: "处理 802.11 接入、认证和无线环境中的专门风险。",
    trigger: "出现 Wi-Fi、Aircrack、Airmon、WPA handshake 或无线渗透时。"
  },
  {
    route: "R24",
    name: "windows-ad",
    category: "platform",
    ability: "研究 Kerberos、AD CS、BloodHound、NTLM relay 和域权限提升路径。",
    meaning: "把 Windows 身份对象和关系转换为可验证的域攻击/防护路径。",
    trigger: "出现 Active Directory、AD CS、BloodHound、Kerberoast、Certipy、Mimikatz 或域渗透时。"
  }
];

const categoryLabels = {
  reverse: "逆向分析",
  offense: "进攻与验证",
  defense: "检测与取证",
  platform: "平台安全",
  orchestration: "编排与交付"
};

const skillGrid = document.querySelector("#skillGrid");
const skillSearch = document.querySelector("#skillSearch");
const skillCount = document.querySelector("#skillCount");
const skillEmpty = document.querySelector("#skillEmpty");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
let activeFilter = "all";

function renderSkills() {
  const query = skillSearch.value.trim().toLocaleLowerCase("zh-CN");
  const visibleSkills = skills.filter((skill) => {
    const categoryMatch = activeFilter === "all" || skill.category === activeFilter;
    const searchable = [skill.route, skill.name, skill.ability, skill.meaning, skill.trigger, categoryLabels[skill.category]].join(" ").toLocaleLowerCase("zh-CN");
    return categoryMatch && (!query || searchable.includes(query));
  });

  skillGrid.replaceChildren();
  const fragment = document.createDocumentFragment();

  visibleSkills.forEach((skill) => {
    const article = document.createElement("article");
    article.className = "skill-card";
    article.dataset.category = skill.category;
    article.innerHTML = `
      <header>
        <span class="skill-route">${skill.route}</span>
        <span class="skill-category">${categoryLabels[skill.category]}</span>
      </header>
      <h3>${skill.name}</h3>
      <dl class="skill-facts">
        <div><dt>能力</dt><dd>${skill.ability}</dd></div>
        <div><dt>意义</dt><dd>${skill.meaning}</dd></div>
        <div><dt>调度</dt><dd>${skill.trigger}</dd></div>
      </dl>`;
    fragment.append(article);
  });

  skillGrid.append(fragment);
  skillCount.textContent = String(visibleSkills.length);
  skillEmpty.hidden = visibleSkills.length !== 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderSkills();
  });
});

skillSearch.addEventListener("input", renderSkills);
skillSearch.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && skillSearch.value) {
    skillSearch.value = "";
    renderSkills();
  }
});

const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];

function activateTab(tab) {
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== tab.getAttribute("aria-controls");
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex !== index) {
      event.preventDefault();
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    }
  });
});

const themeToggle = document.querySelector(".theme-toggle");
const themeLabel = document.querySelector(".theme-label");

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "切换浅色主题" : "切换深色主题");
  themeLabel.textContent = isDark ? "浅色" : "深色";
  if (persist) localStorage.setItem("reverse-skill-theme", theme);
}

const savedTheme = localStorage.getItem("reverse-skill-theme");
setTheme(savedTheme === "dark" ? "dark" : "light", false);

themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

renderSkills();
