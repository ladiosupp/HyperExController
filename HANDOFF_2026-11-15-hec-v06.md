# 交接：HEC v0.6（2026-11-15 第四轮）→ 新对话做「回放页温度」

> 前序：HANDOFF_2026-11-15-hec-v05.md（v0.5 现状/通道/坑）、HANDOFF_2026-11-15-hec-ui-v03.md（通道细节）。
> 技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22。
> 规矩照 AGENTS.md（7 四件事、20 先问、16 中文、15 正斜杠链接、17 小字只状态/标题、18 推送走 VPN、8 不拉整份 CodeInfo）。
> **本轮只改了控制页温度纵轴（v0.6 已发版）。回放页温度是新对话的任务，本轮没动回放页一行代码。**

## 0. 一句话现状

HEC 仓库 HEAD 225b886（v0.6，versionCode 6），tag v0.6，main 与 origin 同步，GitHub Release v0.6 带 APK（HEC-v0.6.apk）。
平板与模拟器 hxpad 都已装 v0.6（dumpsys 核对 versionName=0.6）。父仓库指针提交 3017ef6（**未推送**，随下次发版推）。
**夸克 v0.6 没传上去**（见 §5 待办 1）：APK 备好在 .tools/HyperExController_v0.6.apk，命名照旧 HyperExController_v0.X.apk，目标目录「/来自：Codex」。
本交接文档提交后 HEAD 会再前进一格，父仓库指针会再脏一格——正常，随下批一起提。

## 1. v0.6 改了什么（225b886，只动控制页）

- **温度纵轴自适应**：control.js 删掉 TEMP_LO=88/TEMP_HI=96/tempNorm，新增 tempRange(samples, target)：
  取本杯样本 temp 的 min/max（目标温度 dial.temp.v 也纳入），上下各留 max(1, 跨度×0.15) 边距后 floor/ceil 取整；
  跨度不足 6°C 时以中心扩到 6°C；无数据回退 {lo:88, hi:96}。每次重绘按当前样本重算（数据只增不减，量程只扩不缩）。
- **右轴刻度标真实 °C**（带 ° 后缀，5 档），温度线直接用 tr.lo/tr.hi 画，不再归一化到 0–10。
- 压力/流量/指令仍走左轴 0–10，不动。版本号 build.gradle 6/0.6，control.js appVer 兜底 '0.6'。
- 起因：用户真机看「温度那么低」。实测那杯 mix 87.3–99.2°C 并不低，是固定 88–96 窗口把过冲削顶、深蹲压底、92 目标挤中段造成的观感。
- 对比示意图：.impeccable/review/hec-temp-axis-mock.png（稿在 .impeccable/mocks/hec-temp-axis-mock.svg，父仓库未跟踪）。
- **未做真机/模拟器出杯验收**（用户叫停了喂数据重播）；算法用真机全点离线验证过（85–101°C 量程，过冲深蹲完整）。

## 2. 新对话任务：回放页加温度（用户点名）

### 2.1 事实（本轮只读排查已确认，别再重复查）

- **回放页现在没有任何温度**：app.js 三张图 chartDefs（cFlow/cWeight/cPress，约 788–802 行）和状态卡都没有温度字段。
- **HyperEx 导出的全点不带温度**：fullRecord.samples 与 rawScaleSamples 的字段里没有任何 temperature 列（71 杯全核过）。
- **温度数据在哪**：
  ① Decaid shot REST：GET /api/v1/shots 列表、GET /api/v1/shots/<id> 详情，measurements[].machine 带
     mixTemperature/groupTemperature/targetMixTemperature/targetGroupTemperature/steamTemperature（真机那杯 297 点，约 4Hz）。
  ② ProfileRecorder 的 history-export：samples 带同样五列温度（但它只记非 HyperEx 杯、只留最新 4 杯）。
  ③ 实时 WS ws/v1/machine/snapshot 也带这五列（控制页已在用）。
- **回放页数据流**：app.js doFetch 抓 srcUrl（HyperEx history-export）+ 推导的 recorder 地址，HxArchive.merge（archive-core.js，runId 去重+全点回填）存 IndexedDB 'hx-replay'；
  loadCup 取 frames = isRaw ? rawScaleSamples : samples；本地导入走 #fileInput（change 事件 mergeIncoming）。
- **时间轴对齐坑**：Decaid shot.timestamp 是机器进 espresso 的时刻，HyperEx run.startedAt 是开杯（pour）时刻，两者差约 9.75s（那杯实测）。按时间窗匹配+插值，别直接按下标对齐。

### 2.2 方案选项（先听用户口径，按 AGENTS 20 先问再改）

- **A. 只改 APK**：抓取/合并时顺带拉 Decaid shots，按时间窗把温度插值回填进 fullRecord（或回放时按需拉），回放图加温度线/温度卡。不动插件，历史杯也能补温度。代价：多一路 REST 依赖、匹配逻辑。
- **B. 改插件**：HyperEx fullRecord 加温度列（照 ProfileRecorder extractMachine 的写法）。只对未来杯生效，且插件仓库有别人未提交改动、发版走插件流程——**必须先问用户**。
- **C. 只用 recorder 温度列**：非 HyperEx 杯现成有温度，HyperEx 杯没有。覆盖不全。
- 纵轴口径可直接复用控制页 tempRange（app.js 与 control.js 是两个 IIFE，照现有风格各放一份或抽小工具，别过度抽象）。
- 展示形态（cPress 加右轴温度线 vs 独立温度卡）让用户定。

### 2.3 回放测试通道

- 4797 桩**没有 history-export 端点**，回放页对桩抓取会 404。测试用**本地文件导入**：CDP DOM.setFileInputFiles 把 .tools/__hx-history.json / __rec-history.json 塞进 #fileInput，走真实 mergeIncoming 路径。
- 真机全点已拉回本地（.tools/，不入库）：__hx-history.json（HyperEx 71 杯）、__rec-history.json（recorder 4 杯带温度）、__shot-latest.json（最新杯 Decaid 详情）、__cup-frames.json（706 帧合并+温度插值）、__target-temp.json。
- 真机 Decaid 可 adb forward tcp:8081 tcp:8080 后从本机 REST 读（本轮建过，可能还在）。

## 3. 本轮踩的坑（项目特有）

- **页面内 setTimeout 链会被 WebView 节流**：706 个帧定时器只跑了 2 个就冻住。重播注入要**宿主侧逐帧推**（一条常驻 CDP 连接按帧时间 send），驱动在 .tools/__replay-host.cjs（写完没跑完，用户叫停）。
- **注入期间要屏蔽桩 WS**：覆写 window.WebSocket 拦 /ws/v1/ 新建连接，否则桩 100ms 广播覆盖注入值；收尾恢复（.tools/__rp-clean.js）。
- **别杀 MCP 服务进程**：夸克上传 -203 时我杀了 quark-nd-mcp.exe 想重启，结果本会话 MCP 管道 Transport closed 且不自动重连，要重启 Codex 应用才恢复。MCP 故障先查文档错误码，别动进程。
- **gh 在沙箱里报 token 失效是假象**（读不到 keyring）；提权 + HTTPS_PROXY=http://127.0.0.1:57890 后正常。
- 父仓库 .git 沙箱只读，指针提交要提权。
- cdp-eval.cjs 加了第 5 参超时（默认 20s），长循环用。

## 4. 通道 / 复跑（沿用 v0.5 §3）

- adb：D:/android-dev/sdk/platform-tools/adb.exe；真机 mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp；模拟器 emulator-5554。
- 构建：JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9、GRADLE_USER_HOME=D:/android-dev/gradle-home、gradle-8.7 -p D:/vscode/HyperExController assembleDebug；**改 www 先 Copy-Item 同步 assets**。
- CDP：9223 真机 / 9224 模拟器；App 重启 pid 变要重 forward；只同步求值。
- 桩 4797 是我们的；**4795/4796 是别的对话的，别 kill**。

## 5. 待办（新对话按顺序）

1. **夸克补传 v0.6**（需用户先重启 Codex 应用恢复夸克 MCP）：.tools/HyperExController_v0.6.apk → 「/来自：Codex」。upload_file 参数是 dest_path/local_path。
2. **回放页温度**（§2，先问口径再动手）。
3. 温度传感器选择（mix/group/steam 切换，v0.5 §6 遗留）：用户本轮没定口径，仍挂着，别丢。
4. v0.6 真机出杯验收自适应纵轴（用户唤醒机器后自验）。
5. 沿用前序：影子杯数据核对 → 攒数据 → 学习仲裁 → 自动发送须协议 §8 联调+用户同意 → 发版先问。

## 6. 别碰

- 插件仓库别人未提交改动；父仓库未跟踪目录；4795/4796 桩。
- 标题配色（h1 灰/大写白/版本号琥珀）v0.3 定稿。
- .tools/ 不入库；review/ 截图不入库。

