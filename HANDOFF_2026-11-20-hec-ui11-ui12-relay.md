# 交接：HEC UI11 → UI12 接力入口（v0.36 已发版；下一任接用户下一条 UI 指令）（2026-11-20）

> lineage：HANDOFF_2026-11-20-hec-ui10-ui11-relay.md（UI9→UI10→UI11 入口）→ UI11 批 1 改名／批 2 两段取＋READY／批 3 预取（已回退）＋杯末超时修 → v0.33/v0.34/v0.35/v0.36 回执 → 本份。细节分批见 those MD（本仓 HANDOFF_2026-11-20-hec-ui11-*.md / hec-v03*-release.md）。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md（开工四件事、先问后改、中文、正斜杠、推送走 VPN 57890）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。
> **UI 批用户直管（AGENTS §1.13）：不回叫统筹、统筹不派单不追踪；状态真源 HEC_COORDINATOR_STATE.md 由统筹维护，UI 不写。**
> **本接力目的：用户将直接向你下达下一条 UI 修改/bug（内容以用户当轮原话为准）。**

## 0. 一句话现状

子模块 main HEAD = 738aa62（统筹活文档插提交在我执据 ed8f60d 之上）；**v0.36 已发版装双机**（Release 452506216 / asset 771256323 / 6,742,065 字节 / SHA256 52E27716A4AD782FE01A5D9258861738B781229A952B6BF9E875E9EB40CEE8B0 / 夸克 0b26d5dbc8f74359b2abba5417bb14a5；平板 versionCode 36 @11-20 17:39:30）。胶囊分支 8/8＋回归 72/72＋boot 8/8＋慢响应 3/3。父仓指针 aba3140 已推；**本交接提交本地未推**（推送/父仓指针先问用户）。

## 1. UI 口径不变量（v0.13–v0.36 全集别回退；含 UI11 覆盖）

- **简单档 v7 布局**：左 S1/S2/S3 三行与右列上下沿对齐；中央 192px tier 色数字（good≥80/warn≥60/bad<60；未确认=控制分、确认后=加权分）；缺分 hero「—」＋缺数据胶囊；底部拨号 TDS 默认 3.50（toFixed2/步0.01/0–15）＋研磨 000（padStart3/步1/0–999）竖滑 4px/步；蓝确认重算仅 TDS 触发；存 hecShotTds {tds,grind}（按 runId）；动效一次编排（.no-anim 不重播/reduced-motion 全 snap）。
- **简单档无顶栏**：不渲染 lrn-top/✕；modal 加 sum-notop；**唯一关闭＝「再来一杯」**。标准/完整档保留顶栏仅标题＋✕。
- **弹窗仅按钮关（全档）**：sumDim 空白/Esc 不关；onExtracting 新杯/setEnabled(false) 仍关。
- **自定义数字键盘**：点数字开弹窗内键盘（不切系统键盘）；TDS 带小数点（buf≤5、单个 '.'）、研磨整数（≤3）；⌫ 退格、橙色完成 clamp 提交；**点键盘外＝取消本次输入（值不变、弹窗不关）**；finish 一次性守卫。原生 input/.dv-in 已删别加回。
- **研磨输入落记录**：control._attachInput 写归档 shot 顶层 grindInput（cleanSummary 保留）；**只记录不参与计算**；回放 renderCupInfo 有值加「研磨输入 012」行。
- **简单档右侧**：标题「研磨调整建议」；置信行删；建议可换行；缺数据「—」。标准/完整 grindSec 不动。
- **倒计时开场（v0.32 定稿＋UI11 挪 1.0s，总 7s）**：READY_MS 2000＋CD_MS 5000；0–0.7s 棕 #3d2c17 clip-path 圆扩满窗＋HEC 连字淡入；0.7–1.0s 字与棕底同淡出；**1.0–2s「准备好了吗」/EN READY 黑体 900 72px 琥珀最上层（UI11 挪 1.0s，HEC 完全淡出后进，无交叠）**；2–7s 黑底倒数（圈琥珀/数字暖白）；慢于窗圈停满＋数字 1 脉冲（.wait）；新杯取消。**readypop 动画只在入场挂 .in 触发（CSS .n.ready.in；tick e≥1000 挂 .in），防插入即播 opacity 0→1 盖过 inline opacity:0 致 HEC 期间漏 READY**；reduced-motion 棕/HEC 跳过直显 READY（.n.ready.in animation:none）。
- **收集兜底（UI11 修）**：首请求 3s＋200ms×40 密轮询；**单请求 5s race（对齐原生 readTimeout；原 2s 短于插件杯末结算延迟 3–6s 致全超时→缺5项，v0.32 引入 UI11 修）**；**8.5s 总 deadline 硬截断**到点必 openOffline；open() now>=cdEnd 立即 doOpen。
- **两段取（UI11 批 2）**：PICK1 打分子集（runId/startedAt/result/controlReview/trace 仅 write 投影/stage2Startup overshoot+target/stage2·3 validationStatus/grindAdvice/shotCommands）**杯末**经原生 httpJsonPick 提取（几 KB 注入，避插件 2.2.56 全量 447KB 堵主线程）；PICK2 nextShotAdaptive 弹窗后异步 enrich 给标准/完整（简单档不取、切颗粒度补）；未到时标准/完整下一杯建议区显「加载中…」。enrich/refresh 守卫只判 seq（倒数期间 model 未赋值），渲染才判 model===m。
- **原生桥**：HxBridge 池 **6**、readTimeout **5s**、httpJsonPick 原生线程提取子集再注入；别回退池 3/8s/无 pick。
- **萃取中不能干预取值（UI11 批 3 回退立的新硬不变量，用户点名）**：杯内不得新增竞争性插件请求（预取/轮询 diagnostics 等）/占桥池影响 control 实时 external-status/机器/秤快照；杯末弹窗数据只能杯末取或离线算。**预取方案作废别重做**（插件侧主动推送杯末结算属插件批候选）。
- **胶囊 #sumReviewTag**：三档色 lv0 蓝 #20304d/#9cc0ff／lv1 琥珀 #3d2c17/#f5c078／lv2 绿 #173a2a/#8fe0b0；**总开关关＝整颗隐藏**；开＝档位色＋**本杯评分**；点击=review()。
- **曲线卡片胶囊档位标签（统筹修 3d25166，control.js）**：renderCurveBtn 按 **ext.mode** 分档 full→「HyperEx · 插件全控」／hec 无接管→「HyperEx · HEC」／hec+takeover→「HyperEx · 插件接管」／off→「HyperEx · 只读」／未连接 ext=null→仅「HyperEx」／非 HX→「非 HyperEx · 只读」；takeover 仅 hec 档心跳保险锁存（full 恒 null）；i18n 补「插件全控/只读」两词条；tag.className/lock.hidden 原样；control.js 两份哈希 FF84E4B8…。
- **开关纯显示门**：enabled 仅 summary 内读；HxShadow.onCupEnd 独立先于 summary；off collect 不跑、_attachSummary 不碰归档。
- **打分解析**：controlReview.phases **数组**按 phase find；writes 数字→writeStats(body.liveFlowTrim.trace)（v2 只数常规+救急）；匹配键 summary.runId；persisted total=null 非 fault→portModel→compact（review+openOffline 两处）；portModel 需 rawScaleSamples＋trace 写入分类＋commands（目标流量）。
- **冷 boot**：openDb 记忆化 dbReady＋七 db 助手 openDb().then；新增启动读盘必须走 db 助手。
- **文案（UI11 批 1）**：本杯总结→**本杯评分**、杯末总结弹窗→**杯末评分弹窗**（胶囊/倒数小字/顶栏标题/设置开关）；EN **Shot score／Shot score popup**；加载中…＝Loading…。代码注释旧名「总结」保留不动。
- 标准/完整档（level 1/2）v0.13–v0.24 布局口径不变；其 TDS/粉量仍原生 input（用户只点名简单档拨号，别擅自扩）。

## 2. 验证通道（可复跑）

- adb=D:/android-dev/sdk/platform-tools/adb.exe；gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；GRADLE_USER_HOME=D:/android-dev/gradle-home。**改 app/www 先 Copy-Item -Path 到 app/src/main/assets/www/ 再构建**（两份入库、SHA256 一致是验收项）。
- 模拟器 hxpad（emulator-5554）CDP 9224；平板 CDP 9223（按 pidof 当前 pid forward，先 --remove）。**模拟器/桩随对话死、机器睡眠也死→新对话先提权重起**（emulator -avd hxpad -no-snapshot-load -gpu auto；**GPU 栈会卡死 SurfaceFlinger 起不来→emu kill＋重起 -gpu swiftshader_indirect 软件渲染**；Start-Process node __m6m8-stub.cjs 4801；adb reverse tcp:4801）。
- 桩 4801：父仓 .tools/__m6m8-stub.cjs 提权侧起；/__setdiag、/__setdiagDelay（用完复位 0）、/__setcal、/__setext；**/diagnostics 条件包 {summary,run}（diag 已是新形状则不重复包；__diag-live.json 本身是新形状）**。
- 回归（父仓 .tools，gitignore）：__summary-regress **72**／__boot-check **8**／__targetline2-check 14／__flowcard-check 6／__m10-regress 20／__style-split-check 6；统筹 __coord-curvetag-test **8**（胶囊六态，VM 抽 renderCurveBtn 非镜像，沙箱可跑）；UI11 专项 __tf-realshape **8**（真形状 S2 100/S3 82/总 90 手算交叉）／__tf-slowcup **3**（杯末 3.5s 延迟仍在线出分）／__hec-phase-check **5**（HEC 期间 READY 全隐）。**断言已轮询化**（wait-state/READY/calibration 杯末，防 adb/CDP 开销假红）；回归开头 await 写盘复位、收尾 await ack。
- 发版 SOP：升 versionCode/Name→构建→改名 app/build/outputs/apk/HyperExController_vX.apk＋SHA256→双机 install -r→**先解锁亮屏再冒烟/回归**→push main+tag（VPN 57890）→Release REST（git credential fill 取 token 不回显；模板 .tools/__release36.ps1）→夸克 upload --parent-fid（目录 fid 经 search --keyword "来自：Codex" --search-type dir --stdout-only；session-id 同对话复用）→回执 MD→push→父仓指针（父仓 .git 沙箱只读需提权）→收尾 stayon false。**uploads.github.com 直连一次过；卡死 kill curl→DELETE 未完成 asset→直连限时→失败再代理 --http1.1；别重跑整份发版脚本（重复 Release）**。
- 实拍取证丢 .impeccable/review/hec-ui5/（gitignore）；回复贴图正斜杠绝对路径。

## 3. 坑（项目特有；通用坑引技能条号）

- apply_patch **≤2 hunk/次且按文件位置排序**；锚点必须整行（半行报 Failed to find）。
- **CRLF 噪声致 git revert 拒**（control.js 工作区 CRLF、git diff 空但 status M）：整文件回退用 git checkout <parent> -- <文件> 或手工删改，别 git revert（会拒或盖别人 WIP）。
- 内联 node -e 多层转义必脆→写 .tools 脚本；CDP eval 串反斜杠被模板串吃→String.fromCharCode/lastIndexOf 避逃。
- **同 checkout 多对话并行**：统筹胶囊修复曾被我整文件回退附带覆盖→统筹重落 3d25166；**提交前 git diff --cached --stat 核索引无别人预暂存**，只 add 本批（或 git commit -- <本批路径>）；别人未提交/未跟踪不碰不代提交不回滚；push/发版前核 git log 区间＋代码 diff 确认插提交不碰代码。
- **模拟器跑多轮退化**（webview devtools 僵死/回归卡 restart/GPU SurfaceFlinger 卡）→杀卡死 node（Win32_Process CommandLine 过滤）＋emu kill＋swiftshader_indirect 重起；boot-replay 偶发时序竞态（v0.35 既有，复跑即绿，非代码）。
- 镜像断言禁令（子模块 AGENTS §3.13）：mock 真形状＋真数据交叉。
- EN 词条整行锚：summary.js EN 是一长行，加词改 app.js EN（summary t() 兜底 window.t）。

## 4. 待办 / 已作废 / 别碰

- **incoming：用户下一条 UI 指令**（本接力目的）；真机陪杯验 v0.36（曲线平滑无尖峰／倒数完按时出分／full 档胶囊「插件全控」）。
- 已修别重复修/别回退：打分恒 null、倒计时抽搐+超窗、简单档重启不生效、顶栏小字、胶囊关开关、系统键盘/点外关弹窗、研磨不落记录、右侧置信行、真机圈满干等（桥/deadline）、开场时序、**评分文案、两段取、READY 1.0s、readypop 入场触发、杯末 5s race、胶囊档位标签**。
- **加热进度胶囊＝用户「算了」作废**（REST/WS 无加热进度字段；除非重提不做）。
- **插件杯末结算堵 HTTP 是插件侧根因**（2.2.56 起每杯自动归档＋学习结算）；APK 已用杯末 5s race 接住慢响应。统筹另派 scaleSampleGate 2.2.57（秤样本滤波，插件批 01a1f67b，撞红线停下待用户裁）与 UI 无关。
- 评估 MD minor 另批（增益带行 cal.gainMemory 真机恒空改读 archive.gainMemory；fix3 archiveRun 补 commands 快照）；功能设置其余等用户定义；二期回放回看／三期插件提案另批；profileFrame 非 HX 色带待真杯；老杯全量分数待插件导出合并/三期 compact 持久化。
- 别碰：影子/仲裁发送面、温度链路、HX 液重、插件仓在途批、他人未跟踪；装平板/发版/推送/父仓指针一律先问。

## 5. 协作 / 接力

- 统筹（现）：**01a1f6fa-dbfc-7dd3-9d84-3da8449ec6f7**（relay-6，hostId local；活文档 HEC_COORDINATOR_STATE.md §1 每次接力更新）；**UI 批不回叫**（§1.13）。
- 卸任 UI11：**01a1f75f-93c0-7fa3-bb41-5a25d946a2a4**。
- **接力对话 ID：待接力第一批回填**（UI12；create_thread 用嵌套 target:{type:"project",projectId:"5f74cf60-4cb4-4b5c-b439-b5bdf0cde7e5",environment:{type:"local"}}，AGENTS 22 拍平必报错）。
- 示意稿 mocks/hec-popup-simple/（v7 锁稿＋v8 去顶栏＋ready-intro；帧 3 棕底倒数已被用户改黑底，以 §1 为准）；取证 review/hec-ui5/（gitignore）。
