# 交接：HyperExController（HEC）APK 控制页实现 + UI 定稿（2026-11-15）

> 前序：HANDOFF_2026-11-15-hec-apk-ui.md（UI 示意阶段，已复制进 docs/）、HEC_PROTOCOL_FOR_APK.md（接口契约，10:13 修订版，已复制进 docs/）、
> HANDOFF_2026-11-15-replayer-v1.6-ui.md（回放基线，在插件仓库）。技能 android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（控制口径）。
> 仓库规矩照 AGENTS.md（7 四件事、20 先问、16 中文）。分工：本对话只做 APK 侧；插件端由插件对话负责。
> **本轮已把控制页从示意落成可运行 APK（v0.1），UI 按用户逐条点名定稿；控制律（APK 算指令的算法）未写，external-flow 通道就绪但不自动发指令。**

## 0. 一句话现状

新仓库目录 D:/vscode/HyperExController 已建好（**尚未 git init、未建 GitHub 远端、未发版**——等用户确认）。
以 ProfileReplayer v1.6 为基线，包名改 com.ladios.hxcontroller、应用名 HyperExController、versionCode 1 / versionName 0.1。
控制页（control.js + index.html 控制视图）已实现并在模拟器 hxpad 跑通：连接/握手/轮询/双路 WS 实时曲线/趋势角/接管态/温度液重拨轮/曲线选择/休眠唤醒/中英文/控制·回放双视图。
回放页 = v1.6 原页，逐字未动。插件 2.2.48（e8d6219）已发版，HEC 三档 + external-* 端点齐全。
下一步：用户确认 → git init + 建公开 GitHub 仓库 HyperExController（首提交带本交接）→ 真机联调（协议 §8，需用户出杯）→ 控制律另议。

## 1. 仓库结构（D:/vscode/HyperExController）

- app/www/：网页源。index.html（回放 + 控制双视图）、app.js（回放页，v1.6 原样 + 3 处钩子）、control.js（控制页，本轮新增 ~828 行）、archive-core.js（合并内核）、orbitron.woff2（拨轮数字字体，6.5KB）。
- app/src/main/assets/www/：打包来源，**改 www 后必须同步再构建**（技能硬规矩）。本轮收尾已同步，www 与 assets 的 control.js 哈希一致（342AEAE9…）。
- app/src/main/java/com/ladios/hxcontroller/：MainActivity / HxBridge / FetchService / MergeCore。包名从 hxreplay 改来；FetchService 通知渠道/标题改 HyperExController。
- app/build.gradle：namespace/applicationId = com.ladios.hxcontroller，versionCode 1 / versionName 0.1，compileSdk 34 / minSdk 26 / targetSdk 34，JDK 17。
- settings.gradle：rootProject.name = hyperexcontroller。local.properties：sdk.dir=D:\\android-dev\\sdk（**properties 转义，双反斜杠**）。
- docs/：HEC_PROTOCOL_FOR_APK.md + HANDOFF_2026-11-15-hec-apk-ui.md（从插件仓库复制，含用户未提交修改，按现状快照）。
- review/hec-apk-mock/：UI 示意阶段产物（index.html / png / woff2），可入库作设计参考。
- sim/：archive-core.js + tests/archive-core-check.cjs（合并内核 13 项，node 可跑）。
- .tools/：联调与回归脚本（**不入库**，见 §5）。.gitignore 已含 local.properties / .gradle / build / .tools 之外的产物；**.tools 尚未写进 .gitignore，建仓库前补一行 .tools/**。
- .gradle-build.log：构建日志（不入库）。

## 2. 控制页实现要点（control.js）

### 2.1 链路与协议（照 docs/HEC_PROTOCOL_FOR_APK.md）

- 单一写者：APK 不碰 BLE / raw ws；指令只经 POST external-flow（通道已就绪，**本版不自动发指令**，控制律另议）。
- 插件端点无 CORS → 全部 REST 走 HxBridge.httpJson(method,url,body,callback) 原生桥（HxBridge.java:160，子线程 HttpURLConnection，回调 {ok,status,body}）；浏览器预览无桥时回退 fetch。
- 连接流程：GET status 核版本（calibration.pluginVersion ≥ 2.2.48，verAtLeast）→ GET control-mode 核档位 → loadCurves（GET /profiles?includeHidden=true）→ loadWorkflow（GET /workflow）→ POST external-hello → 700ms 轮询 GET external-status（兼心跳兼上下文）。
- 两路官方 WS WebView 直连（平板实测可行，不需 Java 桥 WS）：ws/v1/machine/snapshot（state/substate/flow/pressure/targetFlow/profileFrame/五路温度）、ws/v1/scale/snapshot（weight/weightFlow/timestamp）。断线 2s 重连。
- RAW dW/dt：相邻秤快照差分，去皮重置识别 TARE_RESET_THRESHOLD_G=2.0（照搬 recorder）；时间戳 scaleTsSec 兼容 ns/us/ms/s。
- 趋势角（技能 §19 口径）：相邻带 rawGS 检测点连线 vs 目标线夹角；2% 带内斜率≈0 记 0°；朝目标 atan(|slope|/max(.3,target))、平行 90°、背离 180−atan；检测点节奏 ≥1s、最近 1.2s 线性拟合 r²≥0.5。矢量方向=指令增减、长度=|指令差|。
- 接管：ext.takeover 非 null 即本杯接管（无 active 字段）→ 红色横幅 + 接管卡（原因/时刻/当前指令），停发指令、曲线照常画；下一杯心跳恢复自动回 HEC。
- 温度应用：宿主 Brew tile 语义整条曲线平移（shiftedTemperatures，PUT /workflow 只发 steps，形状基准优先用选中曲线存储记录）。液重：HyperEx 曲线 = POST 插件 settings {FinalWeight}（会 reload 插件→丢心跳→1.5s 后重发 hello）；其它曲线 = PUT /workflow {profile:{target_weight}}。都只空闲可改，萃取中锁拨轮与应用。
- 休眠/唤醒：PUT /api/v1/machine/state/sleeping|idle；状态以机器确认为准（轮询/WS 回来再变胶囊），不做乐观切换。

### 2.2 与回放页的隔离

- app.js 只加 3 处钩子：applyLang 末尾调 HxControl.onLang；renderDe1Pill 末尾调 HxControl.onMachine；启动末尾调 HxControl.init。回放逻辑逐字未动。
- 双视图：body.hec-mode 类切换；控制页隐藏回放 aside/view/抓取按钮/status/白名单警示条，回放页隐藏控制 aside/view/握手/recorder/休眠/预算。模式持久化 dbSet('hecMode')。
- 中英文：控制页自带 EN 键，共用词（插件/逻辑帧/预算等）回退全局 t()（app.js 顶层 const EN 不挂 window，走 window.t）。
- 地址持久化 dbSet('hecBaseUrl')；连接按钮颜色=连接状态（绿 ok / 红 bad / 灰 off）。

## 3. 用户已定的 UI 口径（本轮逐条点名，均已落实并实测）

- 顶栏：标题 + 版本 + 控制/回放胶囊下拉 + DE1 状态胶囊 + 握手胶囊 + recorder 胶囊（非 HyperEx 在录才显示）+ 咖啡机休眠按钮 + 语言选择。**所有胶囊/按钮统一 34px 高**（header 选择器强制 height:34px）。
- recorder 胶囊紧跟只读/握手胶囊之后（左侧），不靠右。
- 预算/拒绝：**在左侧 HEC 指令卡内**（kvBudget/kvRejects 两行），不在顶栏；顶栏 hstat 只保留接管态「只读·下一杯恢复」。
- 左侧 HEC 指令卡：标题胶囊「HEC · 本杯锁定」（**HEC 大写**）；行：插件/逻辑帧/基值·当前/目标杯流/限压/预算/拒绝。接管时换成接管卡（原因/时刻/当前指令）。**指令卡自然布局，不做下沿对齐**（对齐尝试会撑出左侧滚动条，用户点名撤销）。
- 温度/液重拨轮：Orbitron 大数字左对齐；▲▼ 是**拨片**（30×14px，宽扁），内部三角 SVG 6×4px；▲ translateY(-1px)、▼ translateY(1px)（用户最终微调，不再强制底边对齐）；按住数字上下拖动可调；步进 0.5、边界夹取（温 70–100、重 10–300）；数值变化 bump 动效；萃取中锁定。
- 曲线选择 = 按钮 + 弹窗列表（HyperEx / 非 HyperEx 分标，名称两行省略）；Decaid 地址 = 按钮 + 弹窗填写。
- 中间两张曲线卡撑满高度：杯流图（decaid 杯流 + RAW + 目标虚线 + 趋势矢量）、压力图（压力 + 机器流量 + 目标指令 + APK 指令 + 温度归一 88–96°C→0–10 右轴）。**压力图右侧图题只写「温度」**（原「压力(bar)·流量(ml/s)·温度(0–10)」已改）。
- 相位分段背景色带（S1 蓝/泄压红/浸泡紫/S2 橙/S3 绿）；开杯即落第一段色带（用插件当前相位，避免 S1 标签重叠）。
- 趋势矢量箭头：指令增→上半圆（蓝）、减→下半圆（黄）；控制角定半圆内角度；**长度上限 MAX_LEN=72px 且夹在绘图区内**，超限按上限画示意（方向/角度仍真实）；**超长时在角度旁标真实指令差**（如 +2.50，capped 判定 rawLen>len+0.5）。**角度标注在箭头起点**，数字 10px + ° 上标 7px。
- 趋势角卡片：数字 + **° 上标**（sup.deg，9px vertical-align:super）。
- **事件日志卡已移除**（压力曲线下面那块，用户点名取消）；操作反馈改底部短暂 toast（hecToast，2.6s），不占曲线空间。
- 非 HyperEx 曲线：无相位分段/趋势角/指令，6 卡（含机器流量）；recorder 在录胶囊。
- 界面小字只用于状态/标题（AGENTS 17）；无「上下滑动/点击这里」类操作提示。

## 4. 验证回执（模拟器 hxpad，emulator-5554，CDP 9224）

- 构建：gradle 8.7 + JDK 17（D:/android-dev），assembleDebug 成功；APK ~2.04MB；install -r 进模拟器。
- 联调桩 hec-stub.cjs（.tools/，提权侧 node 起，port 4795，adb reverse tcp:4795）：模拟 Decaid REST + external-* + 两路 WS，scenario=hec|plain|takeover|nohello，/__start 出杯（S1→泄压→浸泡→S2→S3 全相位）。
- 实测通过：连接/版本核对/握手 ok；出杯后 7 卡（时刻/相位/秤重/杯流/压力/温度/趋势角）、相位色带、趋势矢量、RAW 差分；中英文整页切换（含图例/卡片/弹窗）；控制↔回放双视图切换无残留；曲线弹窗 4 条可选、地址弹窗、休眠确认弹窗（取消不变）；萃取中拨轮锁定、步进 92.0→92.5→92.0；顶栏高度全 34px；预算/拒绝在指令卡；事件卡已移除；趋势角 sup.deg 上标；矢量超长注入 dc=2.5 验证 +2.50 标注与上限夹取；左侧无滚动条（scrollHeight==clientHeight==657）；运行时 errors=[]。
- 回归脚本：.tools/__probe1..16.js + __final.js（CDP 同步求值，awaitPromise:false）；截图 .tools/__shot-*.png。
- **未做**：真机（平板）回归、协议 §8 联调清单（需用户出杯）、控制律、发版。模拟器结论可代表平板同分辨率，但最终验收以真机为准。

## 5. 工具链 / 进程 / 复跑

- JDK：D:/android-dev/jdk17/jdk-17.0.21+9；gradle：D:/android-dev/gradle/gradle-8.7；SDK：D:/android-dev/sdk；GRADLE_USER_HOME=D:/android-dev/gradle-home。
- 构建：$env:JAVA_HOME=…; $env:GRADLE_USER_HOME=…; gradle.bat -p D:/vscode/HyperExController assembleDebug。**改 www 先 Copy-Item app/www/* app/src/main/assets/www/ -Force**。
- 模拟器 hxpad 活着（emulator-5554）；平板 mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp 在线。stayon 已恢复 false。
- 联调桩复跑（提权侧）：node .tools/hec-stub.cjs 4795 hec；adb -s emulator-5554 reverse tcp:4795 tcp:4795；CDP：adb forward tcp:9224 localabstract:webview_devtools_remote_<pid>（pidof com.ladios.hxcontroller）。
- CDP 求值：node .tools/cdp-eval.cjs 9224 <exprFile> [shotPath]（node 24 内置 WebSocket，同步求值 + fromSurface:false 截图）。
- 装机后 App 内填地址 http://127.0.0.1:4795 连接联调桩；真机填 http://127.0.0.1:8080（真实 Decaid）。
- agent-browser 会话 task-hec-apk-ui（示意阶段用，提权侧）；本阶段改用 CDP 直连模拟器。

## 6. 工作区 / 别碰

- 插件仓库 D:/vscode/decenthyperexplugin HEAD e8d6219（2.2.48）。**别人未提交的不碰**：HANDOFF_2026-10-31.md、HEC_PROTOCOL_FOR_APK.md 的修改是插件对话的；release/ zip、tests/verify_v0226 等未跟踪也不碰。
- 本仓库 D:/vscode/HyperExController 是新建目录，**尚未 git init**；docs/ 里两份 MD 是从插件仓库复制的快照（含其未提交修改），建仓库时按现状入库即可。
- .tools/ 探针/桩/截图不入库（建仓库前 .gitignore 补 .tools/）。app/build/、.gradle/、.gradle-build.log 不入库。

## 7. 待办 / 下一步（按顺序）

1. 用户确认本轮 UI 与实现 → git init + 建公开 GitHub 仓库 HyperExController（v1.6 基线 + 控制页，首提交带本交接；.gitignore 补 .tools/）。推送走 VPN 127.0.0.1:57890（AGENTS 18），gh token 走 git credential fill。
2. 真机联调：装平板 → 协议 §8 清单逐条（切档 hec→hello→心跳；不 hello 出杯→hec-no-handshake 接管；停轮询 4s→hec-heartbeat-lost；正常 hec 杯 external-flow 进 trace external:true；越界/跨帧/上行限压/预算各 409；接管后 409 hec-takeover、下一杯恢复）。需用户出杯，与插件对话配合。
3. 控制律（APK 算指令的算法）按技能 §22 口径另议——本版只定 UI 与链路，external-flow 不自动发。
4. 发版（升 versionCode/versionName → 构建 → 真机回归 → GitHub Release + 夸克）先问用户（AGENTS 20）。

