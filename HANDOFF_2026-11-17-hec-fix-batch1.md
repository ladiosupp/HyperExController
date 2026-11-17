# HEC 修复批1 交接（2026-11-17，审计修复对话 → 统筹）

> 轮名：hec-fix-batch1。授权：用户批准数据完整性+效率批（AGENTS 20 满足），范围严格锁定审计 M1/m2/m3/M2/M3/M4 六项。
> 基线：ca82a72（v0.18 产品代码 + 统筹审计确认规矩）；本批本地提交，**未推送、未装平板、未发版、版本号未升**（发版另须授权）。
> 红线复验：sent 恒 false（全仓 external-flow 仍仅 3 行注释，零发送代码）、第 1 层硬包线未动、单一写者未动——探针 P7 + 真机导出 20 杯 sentTrue=0。
> 不在本批（未碰）：m1 软预算墙（控制行为另批另授权）、m6（统筹已核关闭：工作流每杯启动去皮）、i2（阶段 D 有意暂缓）、m4/m5/m7–m18 其余 minor、控制律/§22 口径。

## 0. 一句话结论

六项全部落地并实测验证：影子持久化改链式 per-cup 存储（杯末立即导出不再丢杯、交错 persist 不再丢杯、旧数组首载迁移保 install -r 存活）；writes-only 杯两路径同口径保留；决策回归按 phase 过滤对齐离线 regAt；**模拟器取证证实后台 mid-cup 脏决策真实存在（基线 +12 笔/15s），stale 守卫后后台零脏决策**；wasm/模型改 asset loader 流式加载（免 base64 桥 ~120MB 瞬态峰值）；实时 UI 合帧节流实测 7.44Hz（基线 ~15Hz）、后台零重绘。回归 27/27 + 15/15 + 探针 30/30 全绿。

## 1. 改动清单（10 文件，+555/−141；www 与 assets 同步 SHA256 一致）

### M1 影子 persist 串行化 + per-cup 存储 + 迁移 + 导出回退
- app/www/app.js:86–91 — openDb 'hx-replay' v1→v2，onupgradeneeded 增建 objectStore('hecShadowCups', {keyPath:'runId'})（kv 保留）。
- app/www/app.js:114–145 — 新增 dbCupPut/dbCupAll/dbCupKeys/dbCupDel 四个助手（经典脚本顶层函数 → window 全局，shadow 经 window.dbCup* 调用）。
- app/www/shadow.js:348–375 — cupDb() 探测助手（无助手环境回退 kv 全数组路径，仍走链）；migrate() 首载迁移：旧 kv hecShadowCups 数组逐杯 put → 清空旧键，幂等（migratePromise 单例），load() 触发（shadow.js:57）。
- app/www/shadow.js:377–402 — persist 改链式（persistChain，同 app.js saveChain 模式）：调用时同步 JSON 快照 → 链内 migrate → per-cup put → getAllKeys 计数，>40 时 getAll 按 startedAt 升序淘汰最旧（FIFO 语义不变）；成功清 persistError，失败记 persistError。legacy 路径同样入链。
- app/www/shadow.js:560–582 — exportJSON 先 await persistChain + migrate 再读 per-cup store；persistError 时内存结算杯按 runId 并档（内存为准）；导出按 startedAt 时序排序（per-cup getAll 是 runId 字典序，必须排）+ 当前在跑杯末尾。

### m2 writes-only 杯 runId 切换保留
- app/www/shadow.js:410 — 切换条件改 (cup.decisions.length || cup.writes.length)，与 onCupEnd（551）同口径。

### m3 决策回归 phase 过滤（特征 parity 正确性，非口径变更）
- app/www/shadow.js:457–459 — 决策调用处 weightRegression(cup.samples.filter(x => x.phase === ctx.phase), ...)，对齐离线 build-dataset.js regAt 的 phaseRawSamples；weightRegression 本体不动（响应窗 settleResponses 仍不过滤，§6.12 物理响应口径）；trimRegression 的 phase+frame 过滤不动（§6.7 predictedGS 口径）。ext.rawGS 替代方案评估后不采用（700ms 滞后 + trim  inactive 时 null，改动更大）。

### M2 后台/ext 冻结守卫（先取证后修，见 §2）
- app/www/control.js:131 — lastPollSuccessAt 状态；poll 成功（209）与 hello 成功（199）置位。
- app/www/control.js:370–371 — onSample ctx 增 stale: document.hidden || (Date.now() - lastPollSuccessAt > 1500)（≈2 个 700ms 轮询周期；早于插件 4s 接管，防冻结上下文标签）。
- app/www/shadow.js:446–447 — 决策门增 || ctx.stale。样本/台账/updateLive 不受影响（杯末检测与曲线照常）；未采用 webView.onPause（会延迟杯末检测，派单权衡口径）。

### M3 asset loader 流式加载（零新依赖实现，见 §7 偏离说明）
- app/src/main/java/com/ladios/hxcontroller/MainActivity.java:31–56 — WebViewClient.shouldInterceptRequest 拦截 https://appassets.androidplatform.net/assets/www/*，getAssets().open 流式 WebResourceResponse（mime 按扩展名，81–95；CORS * 供 file:// fetch/import()；拒 ..  traversal；IO 线程回调）。
- app/src/main/java/com/ladios/hxcontroller/HxBridge.java:46–59 — readAssetBase64 保留作 fallback，is.close() 进 finally。
- app/www/shadow.js:18–19,30–44 — ASSET_HTTPS 常量 + assetHttpsOk 三态；assetBytes https-first → 桥读 → 相对 fetch。
- app/www/shadow.js:72–88 — load() 先用 22KB 模型探 asset loader：可用则 wasmPaths 指 https（ORT 自己流式 fetch/编译 wasm，不再 base64 注入 wasmBinary）；不可用回退旧路（wasmBinary + blob mjs）。
- app/www/arbiter.js:69,76–80 — 学习模型 JSON 同样 https-first + 桥 fallback。

### M4 实时 UI 合帧节流 + 差量 + 缓存
- app/www/control.js:927–941 — requestRender/renderTick：WS/轮询路径只标 dirty，rAF 按 ≤8Hz（125ms）合帧 renderCards+drawCharts；交互路径（拨轮/图例/resize/侧栏/样式切换）仍直接 drawCharts 即时响应；后台 rAF 暂停 → 零重绘。
- app/www/control.js:716–757 — renderCards 骨架按 hx/plain+语言 建一次（去皮监听只挂一次），各卡 .v 仅内容变化时 innerHTML（卡片结构/类名/顺序与原版逐字一致，七卡对齐 CSS 不受影响）。
- app/www/control.js:803–815 — setup() 画布尺寸/dpr 缓存（cv.__hecW/H/Dpr/Ctx），仅变化时重设 backing store。
- app/www/control.js:943–970 — seriesCache 增量缓存（decaid/raw/mflow/press/temp/tcmd/tgtHist 随样本追加；4000 shift 首元素变 → 全量重建）；targetSeries _live 目标常量缓存（目标值变化才重建）；drawCharts/drawMerge 消费缓存，rawSeries 孤儿函数移除。
- app/www/control.js:1068–1073 — renderLegends 签名差量（hx/RAW/滤波/样式/语言/隐藏集）。
- app/www/control.js:289,382,773 — onMachineSnapshot/onScaleSnapshot/renderAll 改走 requestRender；_state 增 draws 计数（1409）供回归测量。

## 2. M2 取证结论（模拟器 hxpad，hec-stub 4801 plain/full，CDP 9224，基线 v0.18 包）

**基线（修复前，证实审计静态推断）**：S2 中段 t+13s HOME 后台 15s——
- WS 投递不受后台影响：samples 121→263（~9.4Hz，与前台同速）；CDP 全程响应（WebView 未暂停，MainActivity 无 onPause）。
- ext 冻结：phase=stage2 / frame=1 / cmd=3.75 / hbAge=0 全程不变（poll 跳 hidden），桩实际 t+22 已进 S3。
- **影子按 1200ms 节拍出 12 笔脏决策（1→13）**，杯末结算后 modeAtStart=full + fixLevel=r1-r5、17 决策通过训练过滤，sentTrue=0。

**修复后（同流程复跑）**：
- 前台 t+13→18s 决策 1→5（正常 ~0.8/s）；HOME 后 12.4s **决策冻结 6→6（零脏决策）**，samples 197→311 照常（曲线/杯末检测不受影响）。
- 导出新杯 stub-1794922764205：6 决策全部 lastDecT≤18419（后台前），306 样本，sentTrue=0。
- 回前台即恢复（stale 随 poll 成功解除）。
- 结论：守卫方案按实测落地为决策门 stale（hidden || 轮询断档>1500ms）；后台样本仍记录但无决策产出，训练标签不再被冻结上下文污染。灭屏与 HOME 同走 document.hidden 路径（本轮只实测 HOME，灭屏未单独取证）。

## 3. 存储迁移说明（install -r 跨装机存活）

- IDB 'hx-replay' v1→v2：新增 hecShadowCups objectStore（keyPath runId），kv 不动；openDb onupgradeneeded 幂等建 store。
- 首载迁移（shadow.load → migrate，单例幂等）：旧 kv hecShadowCups 数组逐杯 put 进新 store → 成功后旧键置 []；迁移失败记 persistError，导出回退内存杯并档兜底。
- FIFO ≤40 语义不变：put 后 getAllKeys 计数，超限按 startedAt 升序淘汰最旧（旧数组插入序 ≈ startedAt 序）；getAll 仅在超限时触发（每杯一次量级），常态只写单杯 + 读键列表，消除 MB 级全数组读改写与 lost update。
- 无 dbCup* 助手的环境（旧测试沙箱/浏览器预览异常）回退 kv 全数组路径，仍链式串行、导出仍等链尾。
- **模拟器实证**：install -r 修复包后旧 18 杯历史 stub 归档 + 基线取证杯共 19 杯自动迁入新 store（oldLen=0、cupKeys=20 含新杯、exportCups=20、时序正确、persistError=null）。
- 导出顺序：per-cup getAll 为 runId 字典序，exportJSON 按 startedAt 排序恢复时序语义（learn.js 取末杯 = 最新杯不受影响）。

## 4. 验证回执

- node --check：shadow/arbiter/control/app 4/4 OK（learn/archive-core 未改）。
- 现有回归：__rectify-r2345-test.cjs **27/27**；__phaseB-integration-test.cjs **15/15**（旧沙箱无 dbCup* → legacy 路径兼容验证）。
- 审计探针（更新版）：__audit-probe.cjs **30/30**（P1 墙行为记录/P2 保留/P3 两路立即导出/P4 不丢杯/P5+P5b phase parity/P6 边界/P7 红线/P8 迁移/P9 FIFO/P10 stale/P11 回退）。
- www→assets SHA256：7 网页 + vendor JSON/ONNX **9/9 SAME**。
- 构建：gradle assembleDebug --offline **BUILD SUCCESSFUL**（Java 编译含 MainActivity/HxBridge 改动）。
- 模拟器装机：install -r + am start，versionCode 18（未升版）；conn=ok，loadState=ready。
- M3 实证：页面 fetch https://appassets.androidplatform.net/assets/www/vendor/bc_v0.onnx → **200**；ort.env.wasm.wasmPaths = https mjs/wasm（ORT 流式加载成功，base64 桥未用于 wasm）。
- M4 实证：前台 (1227−1189)/5.105s = **7.44Hz ≤8Hz**（基线 ~15Hz）；后台 3.1s **draws Δ=0**；回前台恢复 +15。
- UI 冒烟（CDP 量出来）：七卡标题 top 79.6×7 同一水平线、卡高 35×7、侧栏溢出 0；萃取中七卡值实时（S2/34.1g/4.99g/s/1.35bar/91.4°C/34°）；双画布非空；样式 2 合并图非空（23637 采样点）切回正常；去皮点击 → 桩 count=1（监听只挂一次仍有效）；曲线弹窗 6 曲线 6 常用位正常关闭；杯末冻结（时刻停 0:34.1、杯流回 —）。截图 .tools/__fix1-ui.png。
- 红线：全仓 external-flow 仅 control.js:2,6 / shadow.js:2 三行注释；探针 P7 sent 恒 false + takeover 门；导出 20 杯 sentTrue=0；硬包线代码（arbiter.js clip/applyEnvelope/arbitrate）零改动。
- 收尾：stayon false、reverse 4801 / forward 9224 已删、桩按端口精确停（pid 48356）；模拟器留修复包。

## 5. 新增回归与探针更新说明

- 探针更新（M1 存储改动影响，派单允许）：沙箱增 dbCupPut/All/Keys/Del shim（Map keyed runId，可注入延迟/失败）；P2/P3/P4 断言翻转为修复后预期（保留/含刚结算杯/不丢杯），P3 增 legacy 路径变体；新增 P5b（决策级边界 rawGS≈纯 S3 slope）、P8（迁移四断言）、P9（45 杯 FIFO）、P10（stale 门）、P11（persistError 回退）。P1 改为「墙仍在」行为记录（m1 本批不修）。16→30 断言。
- 模拟器取证/复验表达式（.tools，gitignore）：__m2-state/connect/export-kick/export-read.js（基线与修复后共用）、__fix1-asset-kick/read.js、__fix1-migrate-kick/read.js、__fix1-draws.js、__fix1-ui-smoke.js、__fix1-style2.js、__fix1-tare.js、__fix1-crv.js、__fix1-align.js；日志 __m2-evidence.log（基线）/ __fix1-m2-after.log（修复后）/ __fix1-ui.log。
- 复跑：node .tools/__audit-probe.cjs；模拟器流程见 §2/§4（桩 node .tools/hec-stub.cjs 4801 plain，提权侧）。

## 6. 边界遵守

- 只 add 本批 10 文件 + 本交接；别人未跟踪文件（HANDOFF_2026-11-17-hec-live-cups.md / review/hec-icon/）未碰未代提交；审计轮 HANDOFF_2026-11-17-hec-code-audit.md 仍属上一轮未跟踪交付，本批不代提交。
- 未推送、未装平板、未发版、未升 versionCode/versionName（发版 SOP 另批另授权）；父仓指针未动。
- 插件仓/技能/协议文档零改动；控制律与 §22 口径零改动（m3 是特征 parity 正确性修复，派单定性）。
- m1/m4/m5/m6/m7–m18/i2 等审计其余项一律未碰。

## 7. 待办 / 风险 / 偏离说明

- **M3 实现偏离（功能等效，报备）**：派单点名 WebViewAssetLoader（androidx.webkit），本机 gradle 缓存无该库、离线构建不引新依赖，改用 WebViewClient.shouldInterceptRequest 零依赖实现同款 URL（https://appassets.androidplatform.net/assets/）与流式语义；CORS/mime/路径守卫齐备，实测 200 + ORT 就绪。如统筹要求必须用 androidx.webkit 库，另批加依赖（需网络下载）。
- stale 阈值 1500ms 是工程选择（≈2 轮询周期，早于插件 4s 接管）；轮询正常时后台守卫由 document.hidden 兜底。真机 WebView 后台行为建议下一批真机取证复核（模拟器已证实）。
- 后台期间样本仍入 cup.samples（phase 标签用冻结 ext，可能误标），但决策门已挡标签产出；曲线/杯末检测依赖这些样本，故保留。若后续要求后台样本也停，需另议杯末检测替代路径。
- 基线取证杯 stub-1794922003805（17 决策含 12 脏）已随迁移留在模拟器归档——**离线并档时按 runId 排除**（stub- 前缀本就不进真机训练 universe，真机标签主来源是真机 full 杯）；建议统筹在 hx-train 并档规则记一笔模拟器脏杯 runId。
- m1 软预算墙、其余 minor 待另批授权；阶段 D 发送面/切档（i2）仍有意暂缓。
- 发版时记得：本批未升版本号，发版批按 SOP 升 19/0.19 + 干净基线 + 模拟器/平板回归。

## 来源对照

- 审计 = D:/vscode/HyperExController/HANDOFF_2026-11-17-hec-code-audit.md（M1/m2/m3/M2/M3/M4 定义与证据）
- 派单 = 统筹 01a1e90d-5863-7000-ad55-21e1080d21e9 修复批1（用户授权）
- 离线 parity 参照 = D:/vscode/.tools/hx-train/pipeline/build-dataset.js:30–46（regAt）
- 规矩 = 本仓 AGENTS.md（§1 授权/§2 工具链/§3 测试/§4 发版/§6 影子口径）；技能坑引 android-tablet-apk-dev
