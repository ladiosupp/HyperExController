# 交接：HEC UI10 → UI11 接力入口（v0.32 已发版；下一任接用户下一条 UI 指令）（2026-11-20）

> lineage：HANDOFF_2026-11-19-hec-ui9-ui10-relay.md（UI9→UI10）→ UI10 批 1–4（keypad-close-grind／countdown-speedup／notopbar-speedup2／ready-intro-bridge）→ v030/v031/v032 回执 → 本份。细节分批见 those MD。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md（开工四件事、先问后改、中文、正斜杠、推送走 VPN 57890）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。
> **UI 批用户直管（AGENTS §1.13）：不回叫统筹、统筹不派单不追踪；状态真源 HEC_COORDINATOR_STATE.md 由统筹维护，UI 不写。**
> **本接力目的：用户将直接向你下达下一条 UI 修改/ bug（内容以用户当轮原话为准）。**

## 0. 一句话现状

子模块 main HEAD = 本交接提交（ee5812a 之后）；**v0.32 已发版装双机**（Release 452287607 / asset 770522410 / 6,739,177 字节 / SHA256 3CCAE903826984EB343F6AC9DF1A97845C67B24CA4A41908A566341FD0997987 / 夸克 1e9783a2e52143bd9356f44a7737b8f0；平板 versionCode 32 @11-20 12:56:15）。回归 __summary-regress **72/72**＋__boot-check **8/8**。父仓指针 759337f 已推；**本交接提交本地未推**（推送/父仓指针先问用户）。

## 1. UI 口径不变量（v0.13–v0.32 全集别回退；含 UI10 覆盖）

- **简单档 v7 布局**：左 S1/S2/S3 三行与右列上下沿对齐（3×24px+8px gap）；中央 192px tier 色数字（good≥80/warn≥60/bad<60；未确认=控制分、确认后=加权分）；缺分 hero「—」＋缺数据胶囊、三行全 —；底部拨号 TDS 默认 3.50（toFixed2/步0.01/0–15）＋研磨 000（padStart3/步1/0–999）竖滑 4px/步；蓝确认重算仅 TDS 触发；存 hecShotTds {tds,grind}（按 runId）；动效一次编排（开场 400ms/rowin 60ms 阶梯/morph 240ms/.no-anim 不重播/reduced-motion 全 snap）。
- **简单档无顶栏（v0.31 B 采纳）**：不渲染 lrn-top/✕；modal 加 sum-notop（.lrn-body padding-top 20px）；**唯一关闭＝「再来一杯」**；render 的 sumX 绑定存在性守卫。标准/完整档保留顶栏仅标题＋✕（v0.27；它们无再来一杯）。
- **弹窗仅按钮关（v0.30，全档）**：sumDim 空白点击/Esc 不关；系统事件 onExtracting 新杯/setEnabled(false) 仍关。
- **自定义数字键盘（v0.30）**：点数字开弹窗内键盘（不切系统键盘）；TDS 带小数点（buf≤5、单个 '.'）、研磨整数（≤3、无小数点键）；⌫ 退格、橙色完成 clamp 提交；**点键盘外＝取消本次输入（值不变、弹窗不关）**；竖滑照旧；finish 一次性守卫。原生 input/.dv-in 已删别加回。
- **研磨输入落记录（v0.30）**：control._attachInput 写归档 shot 顶层 grindInput（cleanSummary 保留→合并/导出不丢）；**只记录不参与计算**（weighted 只读 tds）；回放 renderCupInfo 有值加「研磨输入 012」行（EN Grind input）。
- **简单档右侧（v0.30）**：标题「研磨调整建议」（EN Grind adjustment advice）；置信 .s 行删；建议 .v grid-row:2/4 可换行；与左三行对齐不变；缺数据 .v「—」。标准/完整 grindSec 不动。
- **倒计时开场（v0.32 定稿，总 7s）**：READY_MS 2000＋CD_MS 5000；0–0.7s 棕 #3d2c17 clip-path 圆扩满窗＋HEC 连字（图标母版同 path/#f5c078）淡入；0.7–1.0s 字与棕底同淡出；0.9–2s「准备好了吗」/EN READY 黑体 900 72px 琥珀最上层（#sumCountReady 独立层）；2–7s **黑底**倒数（圈琥珀/数字暖白）；慢于窗圈停满＋数字 1 脉冲（.wait）；新杯 onExtracting/setEnabled(false) 取消（stopCountdown+fetchSeq++）。四层 innerHTML：sc-brown/sc-hec/sumCountReady/sumCountBox；tick 前 2s 50ms 相位、后 100ms。reduced-motion 棕/HEC 跳过 READY 直显。
- **收集兜底（v0.32）**：首请求 3s＋200ms×40 密轮询；单请求 2s race 超时；**8.5s 总 deadline 在 3s 等待之前**到点必 openOffline 弹；open() 在 now>=cdEnd 立即 doOpen。别回退 1s 重试格/无 deadline（真机圈满干等根因）。
- **原生桥（v0.32）**：HxBridge 池 **6**、readTimeout **5s**；JS race 取消不了原生任务→僵尸占槽堵后续（真机根因）；别回退池 3/8s。
- **胶囊**（#sumReviewTag）：底色三档 lv0 蓝 #20304d/#9cc0ff／lv1 琥珀 #3d2c17/#f5c078／lv2 绿 #173a2a/#8fe0b0；**总开关关＝整颗隐藏**（v0.29）；开＝档位色＋本杯总结；点击=review()。
- **开关纯显示门（v0.29）**：enabled 仅 summary 内四处读；HxShadow.onCupEnd 独立先于 summary；shadow/arbiter 零引用 HxSummary；off collect 不跑、_attachSummary 不碰归档。
- **打分解析（v0.26）**：controlReview.phases **数组**按 phase find；writes 数字→writeStats(body.liveFlowTrim.trace)（v2 只数常规+救急）；匹配键 summary.runId；startedAt 补头部日期；calibration-status 异步补 m.auto 不挡弹窗；persisted total=null 非 fault→portModel→compact（review+openOffline 两处）。
- **冷 boot（v0.27）**：openDb 记忆化 dbReady＋七 db 助手 openDb().then；init 读盘不落默认；**新增启动读盘必须走 db 助手**。
- 标准/完整档（level 1/2）v0.13–v0.24 布局口径不变（无大数字、样式分类型、沉浸全屏、去 hecBox）；其 TDS/粉量仍原生 input（用户只点名简单档拨号，别擅自扩）。

## 2. 验证通道（可复跑）

- adb=D:/android-dev/sdk/platform-tools/adb.exe；gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；GRADLE_USER_HOME=D:/android-dev/gradle-home。**改 app/www 先 Copy-Item -Path（-LiteralPath 不展开 wildcard）到 app/src/main/assets/www/ 再构建**（两份入库、SHA256 一致是验收项）。
- 模拟器 hxpad（emulator-5554）CDP 9224；平板 CDP 9223（装机后双 webview socket：按 pidof 当前 pid forward，先 --remove）。**模拟器/桩随对话死、机器睡眠也死→新对话先提权重起**（emulator -avd hxpad -no-snapshot-load -gpu auto；Start-Process node __m6m8-stub.cjs 4801；adb reverse tcp:4801）。
- 桩 4801：父仓 .tools/__m6m8-stub.cjs 提权侧起；/__setdiag、/__setdiagDelay（用完复位 0）、/__setcal、/__setext。
- 回归（父仓 .tools，gitignore）：__summary-regress **72**／__boot-check 8／__targetline2-check 14／__flowcard-check 6／__m10-regress 20／__style-split-check 6。**回归开头 await 写盘复位、收尾 await ack**。__restart-emu.ps1 已加 CDP 列表 6 次重试（瞬时断流假崩）。
- 开场三帧实拍已内嵌回归 cancel 块（sum-hec/sum-ready/sum-count.png）；独立 __ready-shots.cjs warmup 不足易假空，优先用回归内嵌。
- 发版 SOP：升 versionCode/Name→构建→改名 app/build/outputs/apk/HyperExController_vX.apk＋SHA256→双机 install -r→**先解锁亮屏（stayon true+WAKEUP+wm dismiss-keyguard）再冒烟/回归**（锁屏视口 0 假红）→push main+tag（VPN 57890）→Release REST（git credential fill 取 token 不回显；模板 .tools/__release32.ps1）→夸克 upload --parent-fid（目录 fid 经 search --keyword "来自：Codex" --search-type dir --stdout-only；session-id 同对话复用）→回执 MD→push→父仓指针（父仓 .git 沙箱只读需提权）→收尾 stayon false。**uploads.github.com 走 VPN 卡死→直连一次过；卡死处置 kill curl→DELETE 未完成 asset→直连限时→失败再代理 --http1.1；别重跑整份发版脚本（重复 Release）**。
- 实拍取证丢 .impeccable/review/hec-ui5/（gitignore）；回复贴图正斜杠绝对路径。

## 3. 坑（项目特有；通用坑引技能条号）

- apply_patch **≤2 hunk/次且按文件位置排序**（≥3 或乱序报找不到）。
- 内联 node -e 多层转义必脆→写 .tools 脚本；CDP eval 串反斜杠被模板串吃→String.fromCharCode/lastIndexOf 避逃。
- 同 checkout 多对话并行：push/发版前核 git log 区间＋git diff <bump> HEAD -- app/www assets build.gradle 确认插提交不碰代码；commit 只 add 本批；别人未提交/未跟踪不碰。
- 镜像断言禁令（子模块 AGENTS §3.13）：mock 真形状＋真数据交叉（GOOD_DIAG phases 数组＋writes 数字＋trace；__diag-live.json 真响应→85/91/80）。
- WebView IDB fire-and-forget＋短 sleep 丢写盘→await Promise.all ack。
- 平板首启 DOM 未渲染 innerText 空；版别以 dumpsys versionCode 为准。
- 回归慢 CDP 时序假红→断言加落定等待/轮询；晚就绪断言＝在线接住＋≤2.5s（模拟器桥尖峰防假红）。
- EN 词条整行锚：summary.js EN 是一长行，加词改 app.js EN（summary t() 兜底 window.t）。

## 4. 待办 / 已作废 / 别碰

- **incoming：用户下一条 UI 指令**（本接力目的）。已修别重复修/别回退：打分恒 null、倒计时抽搐+超窗、简单档重启不生效、顶栏小字、胶囊关开关、系统键盘/点外关弹窗、研磨不落记录、右侧置信行、真机圈满干等（桥/deadline）、开场时序。
- **加热进度胶囊＝用户「算了」作废**（核证：REST/WS 无加热进度字段；红圈 Decaid 核心自算；规格宿主 4001 平板穿不过）。除非用户重提不做。
- 评估 MD minor 另批：增益带行 cal.gainMemory 真机恒空（改读 archive.gainMemory）；fix3 archiveRun 补 commands 快照。
- 功能设置其余等用户定义；二期回放回看／三期插件提案另批；profileFrame 非 HX 色带待真杯；老杯全量分数待插件导出合并/三期 compact 持久化。
- 别碰：影子/仲裁发送面、温度链路、HX 液重、插件仓在途批、他人未跟踪；装平板/发版/推送/父仓指针一律先问。

## 5. 协作 / 接力

- 统筹：**01a1f239-4de7-7213-bca0-f947b70c0c1b**（hostId local，relay-3 活文档制）；**UI 批不回叫**（§1.13）。
- 卸任 UI10：**01a1f310-1125-73e3-b3fd-30e8729dd2b1**。
- **接力对话 ID：01a1f75f-93c0-7fa3-bb41-5a25d946a2a4**（UI11，2026-11-20 回填；create_thread 用嵌套 target:{type:"project",projectId:"5f74cf60-4cb4-4b5c-b439-b5bdf0cde7e5",environment:{type:"local"}}，AGENTS 22 拍平必报错）。
- 示意稿 mocks/hec-popup-simple/（v7 锁稿＋v8 去顶栏＋ready-intro-v1；帧 3 棕底倒数已被用户改黑底，以 §1 为准）；取证 review/hec-ui5/（gitignore）。
