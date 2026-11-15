# 交接：HyperExController（HEC）APK 侧设计 + UI 示意（2026-11-15）

> 前序：HANDOFF_2026-11-15-replayer-v1.6-ui.md（基线）、HEC_PROTOCOL_FOR_APK.md（**接口契约，10:13 修订版为准**）、
> HANDOFF_2026-11-15-hec-mode-proposal.md（插件侧提案）。技能 android-tablet-apk-dev（通用坑唯一维护处）、
> decentplugin §22（控制口径）。仓库规矩照 AGENTS.md（7 四件事、20 先问、16 中文）。
> 分工（用户点名）：本对话只做 APK 侧；插件端由插件对话负责；中立对话统筹两边。
> **本轮只做了只读排查 + UI 示意，APK 代码一行未改、仓库未建**（等用户确认 UI 后动手）。

## 0. 一句话现状

UI 示意已按用户逐条点名改完并实测（review/hec-apk-mock/，可交互）；实现方式与协议口径已核清。
插件 2.2.48 已发版（e8d6219 / 6e6c2bb，HEC 三档 + external-* 端点 + 握手保险，818/818）。
下一步：用户确认 UI → 建 GitHub 仓库 HyperExController（v1.6 基线）→ 按协议实现控制页。

## 1. 用户已定的 UI 口径（逐条，示意图都已落实）

- 基线 replayer v1.6；标题旁胶囊切换「控制 / 回放」两页，回放页原样保留。
- 左侧窄控制列、内容靠上、下方留白，纵向空间让给曲线；右侧曲线撑满高度。
- 曲线选择 = 按钮 + 弹窗列表（HyperEx / 非 HyperEx 分标）；样式与温度拨轮同款卡片；名称两行、超出省略。
- 萃取温度 / 萃取液重 = 大数字拨轮：Orbitron 科技字体（内嵌 woff2，离线可用）；数字左对齐；
  ▲▼ 同一行、缩小、科技感渐变描边微光；按住数字上下拖动可调；步进 0.5、边界夹取；数值变化有 bump 动效。
- Decaid 地址 = 按钮 + 弹窗填写；按钮颜色 = 连接状态（绿已连 / 红失败 / 灰未填）。
- 主页面中英文选择（右上角 中文/EN，整页 data-i18n 切换，含图例）。
- 温度与压力**分成两张卡片**（先合后拆，用户最终点名拆开）；数字同字号。
- 温度归一：实际温度 88–96°C **线性映射**到右轴 0–10（粉色线）；实际 °C 在温度卡数字里。
- 杯流图叠加**趋势矢量箭头**：指令增→上半圆（蓝）、指令减→下半圆（黄）；
  控制角决定半圆内实际角度（0° 贴目标、90° 平行偏离、>90° 背离）；长度 = |指令差|；带半圆参考弧 + 角度标注。
- 相位分段背景色带照搬 replayer（S1 蓝 / 泄压红 / 浸泡紫 / S2 橙 / S3 绿）；趋势角单独成卡。
- 非 HyperEx 曲线：无相位分段、无趋势角、无指令；recorder 在录做成胶囊（蓝色、呼吸点）。
- 插件接管态：红色胶囊 + 横幅，APK 停发指令、曲线照常画；接管原因显示协议原值（hec-heartbeat-lost 等）。
- 界面小字只用于状态/标题（AGENTS 17）；示意图里的操作说明都在页脚「示意说明」，不在 UI 内。

## 2. 示意图产物（review/hec-apk-mock/，可交互）

- index.html：单文件、字体内嵌（base64 woff2）、零依赖。三块画面：① HEC 调流中（S3 快照）② 非 HyperEx 只读 ③ 插件接管。
  拨轮可拖、▲▼ 可点、曲线/地址弹窗可选可填、RAW 开关、模式下拉、中英文切换全部真实可交互。
- hec-apk-mock.png：整页截图（agent-browser，viewport 1400）。
- orbitron.woff2：Orbitron 700 子集（6.5KB，Google Fonts 下载，已内嵌进 html）。
- 合成数据：hxData() 完整 S1→泄压→浸泡→S2→S3；CHECKS 六个检测点分散在 S2 平台与 S3 衰减段，
  角度 62/118/31/23/12/140°、指令差有正有负，两种半圆都展示。
- QA 回执（agent-browser eval 实测）：卡片数 7/6/7；中英文标签全切换；拨轮拖动 92.0→94.5、步进夹取 70–100；
  弹窗循环 5 次无残留；resize 重绘尺寸稳定；连续 6 次语言切换 + 60 次步进无错误、无监听器重复。
- 复跑：agent-browser open file:///D:/vscode/decenthyperexplugin/review/hec-apk-mock/index.html（提权侧）。

## 3. 实现方式（已核清，待动手）

### 3.1 落点

纯 APK 侧。新仓库 HyperExController，以 replayer v1.6 为基线（app/ 全套 + archive-core）。
插件 / 皮肤 / 宿主都不碰。控制页新增 www 页面或同页双视图，回放页 = v1.6 原页。

### 3.2 实时数据（已真机验证）

- 两路官方 WS，WebView 从 file:// 直连成功（平板实测，无 Origin/CORS 拦截，不需 Java 桥接 WS）：
  - ws/v1/machine/snapshot ≈4Hz：state/substate、flow、pressure、targetFlow、targetPressure、profileFrame、五路温度。
  - ws/v1/scale/snapshot ≈10Hz：weight、weightFlow（decaid 杯流）、battery、timestamp。
- RAW dW/dt：相邻秤快照差分，去皮重置识别照搬 recorder（TARE_RESET_THRESHOLD_G=2.0）。
- 趋势角 APK 自算（技能 §19 口径）：相邻带 rawGS 检测点连线 vs 目标线夹角；
  0°=贴目标（2% 带内斜率≈0）、90°=平行偏离、>90°=背离。矢量箭头方向=指令增减、长度=|指令差|。
- 插件端点无 CORS → HTTP 走 HxBridge 原生桥（现有 machineState/checkPlugins 同款模式，需加通用 httpJson 桥方法）。

### 3.3 控制链路（HEC_PROTOCOL_FOR_APK.md 10:13 修订版，逐条实现）

- 单一写者：APK 只经 POST external-flow 发指令，插件代写 A010；不碰 BLE / raw ws。
- 版本核对：GET /status 的 calibration.pluginVersion 或 GET /external-status 顶层 pluginVersion
  （**control-mode 返回没有 pluginVersion**）；HEC 需 ≥2.2.48，旧插件提示升级。
- 切档：POST /control-mode {"mode":"hec"}，仅空闲 200、运行中 409；开杯锁存，萃取中不切档。
- 握手：POST external-hello；之后 500–1000ms GET external-status 兼心跳兼上下文；external-flow 也刷心跳。
- 心跳超时 heartbeat.heartbeatTimeoutMs=4000；**takeover 非 null 即接管（没有 active 字段）**，
  heartbeat.takeover 与顶层 takeover 同一对象；计数 externalWrites/externalRejects/watchdogs 在 heartbeat 块、每杯清零。
- 保险：S2 补水前无握手→hec-no-handshake 接管；stage2/3 断流 4s→hec-heartbeat-lost 先收基值再接管；S1 不判心跳。
  接管后本杯 external-flow 一律 409 hec-takeover；下一杯心跳恢复自动回 HEC。
- 指令：command 0.10–8.00、1/16 量化；逻辑帧 S1=0（仅连续模式）/S2=1/S3=2/3/4，省略=当前帧；
  pending 串行（决策周期≥300ms 或读 pending 再发）；上行限压门 ≥limiter×0.90 拒上行、下行不限。
- 拒绝分支白名单：hec-mode-required / hec-takeover / not-extracting / frame-not-confirmed / frame-mismatch /
  frame-not-writable / write-pending / write-budget / pressure-upward-blocked / telemetry-stale / command-busy；
  400：command-invalid / command-out-of-bounds。**未知 reason 一律停发 + 显示原文，不按前缀猜**。
- 学习：hec 杯进杯间学习与自动下一杯；trace write 带 external:true；增益指纹暂不加模式维度。
- 状态机照协议 §6；联调清单照 §8 逐条真机验。

### 3.4 温度 / 重量调节

- 温度：宿主 Brew tile 语义整条曲线平移（PUT /workflow 只发 steps，brew-temp.js 的 shiftedTemperatures 口径）。
- 重量：HyperEx 曲线 = 插件 FinalWeight（settings POST，会 reload 插件→丢心跳→重发 hello）；
  其它曲线 = profile.target_weight（PUT /workflow 只发 target_weight）。
- 都只在空闲可改，萃取中锁定拨轮与应用按钮。

## 4. 工作区 / 进程

- HEAD e8d6219（插件对话的 2.2.48 发版提交）。**别人未提交的不碰**：HANDOFF_2026-10-31.md、
  HEC_PROTOCOL_FOR_APK.md 的修改是插件对话的；release/ 一堆 zip、tests/verify_v0226 等未跟踪也不碰。
- 本对话产物：review/hec-apk-mock/（示意，可入库）、.tools/__*.cjs|js（探针/编辑脚本，不入库）。
- 平板 adb mDNS 名 adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp；模拟器 emulator-5554 活着（上一对话起的）。
- 本轮临时 forward 18080 已删；9223/9224 是上一对话遗留。stayon 已恢复 false。
- agent-browser session task-hec-apk-mock（提权侧）。

## 5. 待办 / 下一步

1. 用户确认 UI 示意 → 建 GitHub 仓库 HyperExController（公开，v1.6 基线导入，首提交带交接）。
2. 控制页实现：双视图切换、左控制列、拨轮、弹窗、WS 实时曲线、矢量箭头、温度归一、中英文。
3. HxBridge 加通用 httpJson 桥；按 §3.3 落状态机与拒绝分支白名单。
4. 模拟器预览 → 用户确认 → 装平板；联调清单 §8 与插件对话配合逐条跑（需用户出杯）。
5. 控制律本身（APK 算指令的算法）按技能 §22 口径另议——本轮只定 UI 与链路，未写控制律。

