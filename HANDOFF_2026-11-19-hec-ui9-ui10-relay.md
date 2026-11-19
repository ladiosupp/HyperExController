# 交接：HEC UI9 → UI10 接力入口（v0.29 已发版；下一任接杯末弹窗 bug）（2026-11-19）

> lineage：HANDOFF_2026-11-19-hec-v029-release.md（v0.29 回执）→ 本份（接力入口）。细节分批见：hec-ui9-score-countdown-fix（打分恢复+等待态）／hec-ui9-boot-persist-fix（冷 boot 竞态）／hec-ui9-tag-tier-color（胶囊三档色）／hec-ui9-tag-off-state（关开关隐藏+纯显示门）。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md（开工四件事、先问后改、中文、正斜杠、推送走 VPN 57890）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。
> **UI 批用户直管（AGENTS §1.13）：不回叫统筹、统筹不派单不追踪；状态真源 HEC_COORDINATOR_STATE.md 由统筹维护，UI 不写。**
> **本接力目的：用户将直接向你下达杯末总结弹窗的 bug 修改（bug 内容以用户当轮原话为准）。**

## 0. 一句话现状

子模块 main HEAD = 本交接提交（3b4eff2 之后）；**v0.29 已发版装平板**（Release 451045472 / asset 766854496 / 6,736,613 字节 / SHA256 C63F07F03C1E4FAEAE4E3C865F385F0AF923F6600BAEC0FD784C0D36F1FC34F7 / 夸克 66ab0ded029244789cccbcf34abf5018；平板 versionCode 29 @16:11:01）。回归 __summary-regress **59/59**＋__boot-check **8/8**。父仓指针 b55696a 已推；**本交接提交本地未推**（推送/父仓指针先问用户）。

## 1. UI 口径不变量（v0.13–v0.29 全集别回退；要点 inline）

- **简单档 v7**（level 0）：左 S1/S2/S3 匹配度三行与右研磨三行上下沿对齐（3×24px 行格+8px gap）；中央 192px tier 色数字（good≥80/warn≥60/bad<60；未确认=控制分、确认重算后=加权分）；缺分 hero「—」＋缺数据胶囊、三行全 —；底部拨号式 TDS 默认 3.50（toFixed2/步0.01/0–15）＋研磨 000（padStart3/步1/0–999），竖滑 4px/步、点数字弹输入（Enter/Esc/失焦，done 一次性守卫）；蓝确认重算仅 TDS 触发；存 hecShotTds {tds,grind}；动效一次编排（开场计数 400ms、rowin 60ms 阶梯、morph 240ms、.no-anim 不重播、reduced-motion 全 snap）；顶栏仅标题+✕；居中短「再来一杯」=close。
- **倒计时 5s 宽裕窗**：CD_MS=5000；+100ms collect 并行；圈 5→0 转完弹有数据窗（cdQueued 排队）；慢于窗**圈停满＋数字 1 平滑呼吸脉冲**（.wait/sumwait，reduced-motion 关）等到即弹；新杯 onExtracting/setEnabled(false) 取消（stopCountdown+fetchSeq++）。别回退 3s/早到收零/圈后 limbo 旧语义。
- **顶栏全档仅标题＋✕**（runId/时刻小字已删，v0.27）；完整档来源行 srcSec 的 runId 尾 6 保留（非顶栏）。
- **胶囊**（曲线选择下 #sumReviewTag）：底色＝颗粒度三档 lv0 蓝 #20304d/#9cc0ff／lv1 琥珀 #3d2c17/#f5c078／lv2 绿 #173a2a/#8fe0b0；**总开关关＝整颗隐藏**（v0.29 用户定稿，覆盖旧「回看标签保留」）；开＝档位色＋「本杯总结」；点击=回看 review()。
- **开关纯显示门**（v0.29）：enabled 仅 summary 内四处读；HxShadow.onCupEnd 独立先于 summary 钩子；shadow/arbiter 零引用 HxSummary；off 时 collect 不跑、_attachSummary 不碰归档。回归锁死（off shadow ingest／off 归档无 summary）。
- **打分解析**（v0.26）：controlReview.phases 是**数组**按 phase find；writes 是数字→writeStats(body.liveFlowTrim.trace) 分类（公式 v2 只数常规+救急；插件 directionReversals 含供水反转不能直接扣分）；匹配键 summary.runId（review 无 runId 字段）；startedAt 补头部日期；calibration-status 异步补 m.auto 不挡弹窗；persisted total=null 且非 fault → fall through portModel→compact（review+openOffline 两处）。
- **冷 boot**（v0.27）：app.js openDb 记忆化 dbReady＋七 db 助手 openDb().then 等开库；init 读盘（颗粒度/开关/lastRunId）不再落默认。**新增启动读盘必须走 db 助手**。
- 标准/完整档（level 1/2）v0.13–v0.24 布局口径不变（无大数字、样式分类型、沉浸全屏、去 hecBox）。

## 2. 验证通道（可复跑）

- adb=D:/android-dev/sdk/platform-tools/adb.exe；gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；GRADLE_USER_HOME=D:/android-dev/gradle-home。**改 app/www 先 Copy-Item 到 app/src/main/assets/www/ 再构建**（两份都入库）。
- 模拟器 hxpad（emulator-5554）CDP 9224；平板 CDP 9223（**装机后双 webview socket：按 pidof 当前 pid forward，先 --remove**）；冒烟脚本 .tools/__ui9-tablet-smoke.cjs（ver 读 h1 textContent，首启 innerText 可能空）。
- 桩 4801：父仓 .tools/__m6m8-stub.cjs 提权侧起（随对话死）+ adb reverse tcp:4801；/__setdiag 注入诊断、/__setdiagDelay 拉长重试窗（用完复位 0）、/__setcal、/__setext。
- 回归（父仓 .tools，gitignore）：__summary-regress **59**（含真数据交叉 3：子模块 .tools/__diag-live.json 真响应→控制 85/S2 91/S3 80；等待态脉冲 1；冷 boot 3；顶栏 1；胶囊三档 1；开关态/独立性 4）／__boot-check 8／__targetline2-check 14／__flowcard-check 6／__m10-regress 20／__style-split-check 6。**回归开头 await 写盘复位起始态、收尾 await ack**（状态卫生，别改回 fire-and-forget）。
- 发版 SOP：升 versionCode/Name→构建→改名 app/build/outputs/apk/HyperExController_vX.apk＋SHA256→双机 install -r→冒烟/回归→push main+tag（VPN 57890）→Release REST（git credential fill 取 token 不回显；模板 .tools/__release29.ps1）→夸克 upload --parent-fid（目录 fid 经 search --keyword "来自：Codex" --search-type dir --stdout-only；session-id 同对话复用）→回执 MD→push→父仓指针（**父仓 .git 沙箱只读需提权**）。**uploads.github.com 走 VPN 会卡死（curl CPU≈0/asset starter）→直连一次过；卡死处置模板 .tools/__rel29-retry.ps1（kill curl→DELETE 未完成 asset→直连限时→失败再代理 --http1.1）；别重跑整份发版脚本（重复 Release）**。
- 实拍取证丢 .impeccable/review/hec-ui5/（gitignore）；回复贴图正斜杠绝对路径。

## 3. 坑（项目特有；通用坑引技能条号）

- apply_patch **≥3 hunk 会报最后一个 hunk 找不到**（内容一致也报）：拆 ≤2 hunk/次。
- 内联 node -e 多层转义必脆：写 .tools 脚本文件；CDP eval 串里反斜杠会被模板串吃（\d→d、\n→真换行致 SyntaxError）：用 String.fromCharCode(10)/lastIndexOf 等避逃。
- 同 checkout 多对话并行：push/发版前核 git log 区间＋`git diff <bump> HEAD -- app/www assets build.gradle` 确认插提交不碰代码；commit 只 add 本批；别人未提交/未跟踪不碰。
- 镜像断言禁令（子模块 AGENTS §3.13）：mock 必须真形状＋真数据交叉；GOOD_DIAG 已是 phases 数组＋writes 数字＋trace fixture。
- WebView IDB：fire-and-forget dbSet＋短 sleep 会丢写盘（实测）；await Promise.all ack。
- 平板首启 DOM 未渲染 innerText 空；版别以 dumpsys versionCode 为准。
- 回归慢 CDP 时序假红（读早于闸门落定）：断言加落定等待/轮询，别当业务 bug 改。

## 4. 待办 / 已作废 / 别碰

- ** incoming：用户将直接下达杯末弹窗 bug**（本接力目的）。已修过的弹窗问题别重复修/别回退：打分恒 null（解析形状）、倒计时抽搐＋超窗（等待态+关键路径）、简单档重启不生效（冷 boot 竞态）、顶栏 runId/时刻小字、胶囊关开关状态（隐藏）。
- **加热进度胶囊＝用户「算了」作废**。核证结论留档防重复：REST /machine/state、/machine/info（静态 GHC:true）、WS /ws/v1/machine/snapshot 均无加热进度字段（萃取期实测全键）；红圈为 Decaid 核心 UI 自算（不在任何皮肤包）；规格在宿主 4001（rest_v1.yml/websocket_v1.yml），平板 8080 代理穿不过；平板会话曾布只读观测器 window.__heatLog（App 重启即死，勿依赖）。除非用户重提，不做。
- 评估 MD 顺带 minor 未做（另批）：增益带行 cal.gainMemory 真机恒空（改读 archive.gainMemory）；fix3 archiveRun 补 commands 快照（可选，直写杯「等待合并」态）。
- 功能设置其余等用户定义；二期回放回看／三期插件提案另批；profileFrame 非 HX 色带仍待真杯；老杯全量分数待插件导出合并/三期 compact 持久化。
- 别碰：影子/仲裁发送面、温度链路、HX 液重、插件仓在途批、他人未跟踪文件；装平板/发版/推送/父仓指针一律先问。

## 5. 协作 / 接力

- 统筹：**01a1ef1c-40c3-7490-bcc4-b7043ebc1800**（hostId local）；**UI 批不回叫**（§1.13）。
- 卸任 UI9：**01a1f1cd-d4c7-7241-a1ea-b96ddcd48a3c**。
- **接力对话 ID：01a1f310-1125-73e3-b3fd-30e8729dd2b1**（UI10；create_thread 用嵌套 target:{type:"project",projectId:"5f74cf60-4cb4-4b5c-b439-b5bdf0cde7e5",environment:{type:"local"}}，AGENTS 22 拍平必报错）。
- 示意稿 mocks/hec-popup-simple/（v7 锁稿）；取证 review/hec-ui5/（gitignore）。

