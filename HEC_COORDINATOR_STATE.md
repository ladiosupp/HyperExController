# HEC 统筹状态活文档（唯一状态真源）

> 用户 2026-11-18 晚点名设立：统筹要跟踪的一切集中本文件，每事件更新；**每次统筹接力，新统筹第一动作读本文件＋本仓 AGENTS.md＋decentplugin 技能 §22**，不逐份读历史交接。轮次细节在各 HANDOFF_*.md，本文件只留现行状态。
> 维护纪律：回叫/派单/拍板/发版/接力到达即更新对应节＋§8 日志一行；随统筹批 commit（只 add 本文件＋AGENTS.md），push 问用户。执行对话交接 MD 只作轮次细节，状态以本文件为准。

## 0 硬规矩指针

AGENTS 20 改代码/发版/推送/装机/开闭环先问（当次授权只对当次那批）；16 全程中文；7 git 四件事＋只 add 本批；21 控制律先读 §22；15 正斜杠绝对路径；19 改哪一侧先说清。影子 sent 恒 false；第 1 层硬包线永不放宽；单一写者（插件代写 A010；HEC 档 APK 经 external-flow 交插件校验代写）；LUT 不被学习改写；adb/构建/回环/gh 一律提权；GitHub push 走 VPN 代理 127.0.0.1:57890；§22 控制律敏感须用户另授权；S3≥5 ml/s 标定已撤销别再提；matched 只校准素材不是增益裁判；离线证不出增益别造阳性；真实仓写操作除非用户明说一律不做（模拟器写云先确认 coffee.beans.testMode=1）。

## 1 线程表（hostId local；项目「decent 相关」5f74cf60-4cb4-4b5c-b439-b5bdf0cde7e5）

| 角色 | threadId | 状态 |
|---|---|---|
| 统筹（现） | 01a1ef1c-40c3-7490-bcc4-b7043ebc1800 | active |
| 插件接力（2.2.50 发版＋核码） | 01a1ee30-8d3c-7b23-a455-0d3793534e58 | A 修复批进行中（1+2，用户 11-19 授权） |
| 取证接力（陪杯/导出） | 01a1eec0-d9b7-7703-8793-a4d9168accfb | 杯 11 完成／待命下一杯 |
| UI 入口（UI8） | 01a1eeac-1f2d-77d2-8b80-568d0821aa27 | v0.24 已发（用户直管全链） |
| 规矩整理 | 01a1e6c9-2d1f-7100-a059-25c9c20d6b87 | idle |
| 杯末弹窗评估 | 01a1ebd1-6605-7ca0-b952-bd6fa2c81723 | idle |
| 离线验证 | 01a1e911-f0bd-7cb3-ace3-bfc591a27582 | idle（三轮到顶） |
| 审计修复发版 | 01a1e98a-1064-75e1-8706-32658810d676 | idle（34 项闭环） |

退位/归档：旧统筹 01a1dcec / 01a1e44a / 01a1e90d / 01a1eb9b / 01a1ee1f；旧取证 01a1e685；旧修复批 01a1ebac；旧 UI7 01a1e8e3；UI 接力 01a1eeaa（已归档）。create_thread 用嵌套 target:{type:"project",projectId,environment:{type:"local"}}（AGENTS 22，拍平必报错）。

## 2 基线（统筹远端核过）

- 插件 **2.2.50**：代码 930ce25＋回执 e734f1e（branch auto-hyperex），tag v2.2.50；Release 449845323／asset RA_kwDOVO5zXc4teoab；zip 510796 B SHA256 2C3B7378F86D8E67200508043F2B11190D8B564C9E857B9523D92600DEE4D863；夸克 22cb7d9183be426c94d7444be269b95d；平板 Download/ 已推、**用户自装**。verify_v02250 837/837（统筹独立复跑）。五项：cutoff 背 stop 0.85＋accel 中位滤波＋predicted 显示 sanity（shaping 未封顶）＋manual 锚＋regimeChange 排除 manual＋删重复 push；§22.18 记录过冲约束峰≤40%。
- APK **v0.24**（UI8 四批合发，用户已批全链，11-19）：沉浸全屏 immersive sticky＋去 HX 侧栏指令卡 hecBox（接管提示保留）＋控制中心样式 1/2 拆 HX/非HX 独立存盘（hecChartStyleByType、旧键迁移）＋杯末总结全屏 3s 倒计时/去控制分大数字（小字行保留控制/TDS/加权）。tag v0.24=5167bb0；Release 450739200／asset 765634999；APK 6,732,561 B SHA256 2824AFEFA7DC756E600108555BD99B3BAFE8A84378747FF4FC864315210FCBCC（本地 app-debug.apk 字节数与 asset 一致）；夸克 3d836dc013fb4326b80f60ed43f611a6；平板＋模拟器 versionCode 24 冒烟过；回归 summary 35/35＋拆分 6/6＋m10 20/20＋targetline 14/14＋flowcard 6/6＋boot 8/8。子模块 main **85f8964**（v0.24 交接；commits 0020b1d/e924d8b/148d519/5167bb0/85f8964）；父仓 main **ff7ea13**（指针同步 85f8964）。交接 HANDOFF_2026-11-19-hec-v024-release.md。规矩 251 行／155 条。
- 两仓 origin ahead 空（11-19 UI8 v0.24 全链 push 后本地核：子模块 origin/main=85f8964、父仓=ff7ea13；统筹批 b48ee50…715279d 随 UI8 main 推送一并上远端，统筹未单独 push）。v0.21=杯末总结弹窗、v0.22=样式 1 目标线、v0.23=目标杯流历史化（样式 1+2，Release 450011833）、v0.24=四批合发。

## 3 真机最新裁决（杯 11＝1795046308506-2，11-19 07:58；统筹独立复跑核实）

红线全 PASS：峰秤流 **38.8%**≤40% 绊线（峰顶 6.941@21.5s，return 后 retained-water 峰；余量薄）；cutoff rawGS 3.535≤backstop 4.25（basis predicted）；两段收口 complete（boost 8→bleed 1.8125→return 5.25，本杯无 trim 步）；base 3.875 manual 保住；sent 0（15 杯逐杯核）；writes 全 plugin；audit differences=[]；杯后 autoApply 未覆盖 manual。**manual-anchor 章首次真机实证**（建议侧 action=HOLD／role=manual-anchor／applied=false）。101.5 g apiStop；影子 660 样本／34 决策。
**质量回退＋估计器冲突（待拍板见 §4）**：S2 whole NEAR +19.8%／tail +18.93% 非 HIT（rippleCV 0.38% 平直偏高＝系统性增益不匹配）；S3 HIT −5.7%。**工况（用户确认）**：两杯间研磨调粗（grinderSetting 字段未同步仍 20、dose 19，以用户实际为准）→tail 回退双因素：粉饼变粗（同指令增益升高）＋平台被 band r 0.95 抬高；band r 离群与研磨无关（细粉历史 band 4–5 杯 -7 r≈1.24／-8 r≈1.30 也对不上 0.95）。机制：s2StartupPlan controlSource=gain-memory、controlGain 0.9524（杯 10 profile-base 1.2903）→平台/return 5.25（＝targetGS 5/0.9524，≠manual base 3.875）→flood adaptive 1.8×5.25 夹硬包线 8。同杯 feed-forward k=1.257（spread 5.5%、9 样本、eligible）／实测尾段 k≈1.22／建议侧 observedR 1.3179 三路一致 1.2–1.3，plan 的 band r=0.95 离群（baseBand 3.0-4.0 vs commandBand 4.0-5.0 路由待核；§22.11 已警告高命令档 r 含爬升暂态污染，0.88 例同形状）。regime g2→g3（signature 0.3725 vs 0.4836）疑内生于平台 5.25。插件接力只读核码闭环（统筹独立复跑 eval×3＋代码抽查核实；MD decenthyperexplugin/HANDOFF_2026-11-19-cup11-platform-estimator-eval.md）：**缺陷＝杯内读取侧无成熟度门＋band 路由按 effective/commandBand 而非 base**——g2「4.0-5.0」r0.9562（n=2，饱和杯 -4 暂态种 0.9174＋杯 6 1.2405 EMA）经 plan(3031)/trim 中心(8769) 无 bandN<3 门驱动平台（P0-2 门只守建议侧 4406/4449）；选行 effectiveBand||stateRow.commandBand(1676-1677)，baseBand 只做 crossBand 旗标(1694)。自强化环实证闭合：杯 10 return 窗 1 样本→late60 签名 0.3906→g2→plateauStart 23394>23195→band 回退陈旧「4.0-5.0」→trim 上写 4.125→杯 11 plan 再取 0.9562→平台 5.25/flood 夹 8。regime g2→g3 内生于平台（machineFlow +35% 主导）。**auto 主流同受害**：g3「>=5.0」n=1 r1.1401 将驱动杯 12 平台 4.375（与 origin 无关）。修复 A=1+2 用户 11-19 已授权、B 另批（§4）；原 D「manual 平台尊重」按裁定作废。
口径裁定（续）：2.2.50 后 **autoApply ON＋manual base 允许**；manual 杯不学习＝no-observation 预期；role 章在**建议侧** adaptiveDecision.s2.gainMemory.role；影子 writes 台账漏快笔→收口序列以插件 trace 为准（minor 候选）。**§22.18 manual 尊重现只覆盖杯间建议侧，杯内平台律未动**（本杯冲突即此缺口）。**11-19 用户裁定：manual 尊重不延伸杯内平台**——设计意图（原话）「稳定后尽量不要 manual，手动调参只是给少量高阶用户的，绝大部分还是以插件、apk 自动控流」；manual 是临时手段、主流 auto，杯内平台律维持不动；杯 11 离群 r 归 auto 主流路径的估计路由修复议题（②，核码中）。
杯 10（2.2.50 首杯，11-18，对照基线）：峰 20.3%、S2 tail −0.63% HIT、return 3.875＝manual base、profile-base 1.2903；导出 __rectify-tablet-shadow-export-live-2026-11-18T2056.json（14 杯）。
导出：APK .tools/__rectify-tablet-shadow-export-live-2026-11-19T0811.json（15 杯）＋history-7/shots-8/audit-2026-11-19a/workflow-2026-11-19a/status-2026-11-19a；复核脚本 __relay-cup11-verify.cjs／__relay-cup11-extra.cjs（统筹 11-19 复跑全 PASS）。

## 4 在途与待拍板

- 在途：插件接力 01a1ee30 **A 修复批进行中**（用户 11-19 授权选项 1+2：读取侧成熟度门＋baseBand 路由；升 2.2.51＋新 verify＋回归＋杯 6–11 回放；改码不发版，发版另问）。核码 MD decenthyperexplugin/HANDOFF_2026-11-19-cup11-platform-estimator-eval.md。取证接力杯 11 完成、待命下一杯；研磨调粗已用户确认（grinderSetting 字段未同步；调粗几格取证侧已问、可选记工况表）。出杯前复冒烟照旧（版本/心跳/mode=full/秤遥测几百 ms/胶囊亮/前台亮屏，逐杯导出）；秤休眠须唤醒复测才放行；autoApply ON 不再拦放行。
- 在途（UI）：**UI8 v0.24 已发版闭环**（用户直管全链，11-19；四批合发，详见 §2／交接 HANDOFF_2026-11-19-hec-v024-release.md），统筹不介入。两仓 origin ahead 空（统筹批随 UI8 push 上远端）。
- 待拍板：**发版**（A 代码完成＋验证全绿后问用户：2.2.51 Release＋夸克＋推平板 Download/，用户自装→叫用户测杯 12，取证接力陪杯）；**B＝选项 3 接 eligible FF k**（A 落地＋杯 6–11 回放后另批；k 优先级/±25%·0.35 阻尼/带同质性门细则）；**改名** holdingReference.sourceRunId（核 APK/取证/协议消费方后另批或仅文档注明）。已拍板：A=1+2 先行（用户 11-19「修复按默认排，A 完成以后叫我测杯」）；杯 12 先修后验；① manual 不延伸（§3）；选项 4 不做、原 D 已否。
- 常设待办：功能设置/其他其余内容等用户定义；二期回放页逐杯回看；三期插件提案①compact 持久化 5 指标②summary 轻量端点③TDS 集成（另批授权）；非 HX profileFrame 色带真杯验证；校准杯验证随缘；backstop 0.85/accel 历史 4/predicted cap 1.6 真机后可调（另批）；影子快笔台账 minor 候选。

## 5 回叫与接力协议

- 执行→统筹：send_message_to_thread（**prompt 字段**不是 message），带轮名/key 数字/交接 MD 路径/待拍板事；纯确认不回叫。统筹→执行：派单/批准/口径校准同字段。
- 执行接力：上下文重→写自包含轮次交接 MD＋回叫停下；统筹开后继线程读交接续做。
- 统筹接力：新统筹第一动作读**本活文档**＋AGENTS＋§22；更新 §1 线程表＋AGENTS §1.8 ID 行（用户已授权常规同步）；给执行对话发回叫转移通知。
- 批准链：用户当次批准→统筹转执行对话→执行回执 key 数字→统筹远端抽查（ls-remote／Release API／父仓 ahead）→落本文件§2/§8。

## 6 路径与复跑索引

插件仓 D:/vscode/decenthyperexplugin（auto-hyperex；代码实体 decenthyperexplugin.reaplugin/plugin.js，仓根无 plugin.js，2.2.50=930ce25）；APK 仓 D:/vscode/HyperExController（父仓子模块）；父仓 D:/vscode；离线 D:/vscode/.tools/hx-train。
adb=D:/android-dev/sdk/platform-tools/adb.exe；平板 mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp；模拟器 emulator-5554；gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；GRADLE_USER_HOME=D:/android-dev/gradle-home。
复跑：node decenthyperexplugin.reaplugin/tests/verify_v02250.cjs（837）；APK 回归父仓 .tools：__summary-regress 27／__targetline2-check 14／__m10-regress 20／__m6m8-regress 8+5／__flowcard-check 6／__boot-check 8；子模块 .tools：__yield-regress 19／__rectify-r2345-test 27／__phaseB-integration-test 15。杯 11 估计器分析（只读，统筹复跑核过）：HEC .tools/__cup11-platform-eval.cjs／eval2.cjs／eval3.cjs。桩 4801（父仓 __m6m8-stub）/4802（子模块 hec-stub）**每端口都要 adb reverse**、套件开头复位 workflow 与 baseUrl；提权侧起、随对话死、别 kill 旧桩。
发版：gh token 用 git credential fill（不回显）＋HTTPS_PROXY/-Proxy 57890、curl -H 'Expect:' --data-binary 耐慢传；夸克 quarkclouddrive CLI「来自：Codex」（notice.text 非空原样展示）；插件平板只推 zip 不代装；APK install -r 须用户批准。

## 7 别碰

影子发送/仲裁发送面、温度链路、HX 液重（非本批不碰）；别人未提交/未跟踪不碰不代提交不回滚；记忆数据不删；旧桩端口别 kill；stepstrip 概览胶囊别加回；UI 口径 v0.13–v0.23 全集别回退（AGENTS §7）；hec 杯与 pre-fix 旧杯不进训练；5 异常杯排除留压力测试集；stub- 模拟器杯不进真机 universe。

## 8 更新日志

- 11-18 晚：设立活文档（用户点名「每次要统筹的都更新到一个 md、接力统筹都读它写进规矩」）；此前 chronology 见 decenthyperexplugin/HANDOFF_2026-11-18-hec-coordinator-relay-2.md 及各自交接。
- 11-18 晚：杯 10 裁决＋两观察项闭环＋autoApply ON 口径落档（§3）。
- 11-18 晚：v0.23 发版＋规矩同步 71cc3c3／父仓 82290f5 已推（§2）。
- 11-18 晚：统筹接力 01a1ee1f → 01a1ef1c（活文档制）：§1 线程表／§2 基线（ab8d7a8／344ab2c）／AGENTS §1.8 同步；给 7 个执行对话发回叫转移通知（§5）。
- 11-19 早：杯 11 回叫落档（红线全 PASS／manual-anchor 首证／S2 tail +18.9% 质量回退＋估计器冲突，统筹独立复跑核实）；派插件接力只读核码；杯内平台 manual 尊重待用户拍板（§3／§4）。
- 11-19：git log 见 UI8 新批 0020b1d（沉浸全屏＋去 hecBox，回归全绿，active 回叫未到）；§1／§4 记在途，本地待推范围含此批。
- 11-19：取证补充杯 11 工况（用户确认研磨调粗）→双因素归因落 §3、§4 ① 注（base 偏旧／k 跟研磨）；核码三项不变，补充已转插件接力。
- 11-19：用户拍板 ① manual 尊重不延伸杯内平台（设计意图：稳定后尽量 auto、manual 仅少量高阶）→§3 口径裁定、§4 ① 闭环；② 估计路由修复仍待核码＋另批（服务 auto 主流）。UI8 由用户直接对接。技能 §22.18 补裁定注。
- 11-19：插件接力核码闭环（三点证实＋形态修正：缺陷在读取侧无成熟度门＋band 路由，自强化环实证，auto 同受害；统筹复跑 eval×3＋代码抽查核实）；修复选项 A=1+2／B=3 待用户另批，杯 12 预警平台 4.375（§3／§4）；§6 补插件代码实体路径。
- 11-19：用户授权 A=选项 1+2 先行（「修复按默认排，A 完成以后叫我测杯」）→派插件接力修复批（升 2.2.51，改码不发版、发版另问）；B 回放后另批、杯 12 先修后验、改名另批按默认。
- 11-19：UI8 v0.24 四批合发回叫落档（用户直管全链；Release 450739200／asset 765634999／夸克 3d836dc0／子模块 85f8964／父 ff7ea13 已推，统筹批随 push 上远端；§2 基线推 v0.24、§1/§4 UI8 闭环）。
