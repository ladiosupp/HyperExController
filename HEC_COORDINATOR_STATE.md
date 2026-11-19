# HEC 统筹状态活文档（唯一状态真源）

> 用户 2026-11-18 晚点名设立：统筹要跟踪的一切集中本文件，每事件更新；**每次统筹接力，新统筹第一动作读本文件＋本仓 AGENTS.md＋decentplugin 技能 §22**，不逐份读历史交接。轮次细节在各 HANDOFF_*.md，本文件只留现行状态。
> 维护纪律：回叫/派单/拍板/发版/接力到达即更新对应节＋§8 日志一行；随统筹批 commit（只 add 本文件＋AGENTS.md），push 问用户。执行对话交接 MD 只作轮次细节，状态以本文件为准。

## 0 硬规矩指针

AGENTS 20 改代码/发版/推送/装机/开闭环先问（当次授权只对当次那批）；16 全程中文；7 git 四件事＋只 add 本批；21 控制律先读 §22；15 正斜杠绝对路径；19 改哪一侧先说清。影子 sent 恒 false；第 1 层硬包线永不放宽；单一写者（插件代写 A010；HEC 档 APK 经 external-flow 交插件校验代写）；LUT 不被学习改写；adb/构建/回环/gh 一律提权；GitHub push 走 VPN 代理 127.0.0.1:57890；§22 控制律敏感须用户另授权；S3≥5 ml/s 标定已撤销别再提；matched 只校准素材不是增益裁判；离线证不出增益别造阳性；真实仓写操作除非用户明说一律不做（模拟器写云先确认 coffee.beans.testMode=1）。

## 1 线程表（hostId local；项目「decent 相关」5f74cf60-4cb4-4b5c-b439-b5bdf0cde7e5）

| 角色 | threadId | 状态 |
|---|---|---|
| 统筹（现） | 01a1ef1c-40c3-7490-bcc4-b7043ebc1800 | active |
| 插件接力（2.2.50 发版＋核码） | 01a1ee30-8d3c-7b23-a455-0d3793534e58 | 2.2.51 已发；⑤ 改码完成 851/851（4bca7ef 本地）／2.2.52 发版待批 |
| 取证接力（陪杯/导出） | 01a1eec0-d9b7-7703-8793-a4d9168accfb | 杯 12 完成（2.2.51 验证通过）／待命下一杯 |
| UI 入口（UI8） | 01a1eeac-1f2d-77d2-8b80-568d0821aa27 | v0.24 已发；简单档示意图 v3 待用户审（用户直管迭代） |
| 规矩整理 | 01a1e6c9-2d1f-7100-a059-25c9c20d6b87 | idle |
| 杯末弹窗评估 | 01a1ebd1-6605-7ca0-b952-bd6fa2c81723 | 排查完成（根因证实）／修复待批，实现归 UI8 |
| 离线验证 | 01a1e911-f0bd-7cb3-ace3-bfc591a27582 | idle（三轮到顶） |
| 审计修复发版 | 01a1e98a-1064-75e1-8706-32658810d676 | idle（34 项闭环） |

退位/归档：旧统筹 01a1dcec / 01a1e44a / 01a1e90d / 01a1eb9b / 01a1ee1f；旧取证 01a1e685；旧修复批 01a1ebac；旧 UI7 01a1e8e3；UI 接力 01a1eeaa（已归档）。create_thread 用嵌套 target:{type:"project",projectId,environment:{type:"local"}}（AGENTS 22，拍平必报错）。

## 2 基线（统筹远端核过）

- 插件 **2.2.51**（A 平台路由加固＋③ 诊断页回学习入口，用户授权合并发，11-19；统筹远端独立核过 ls-remote/Release API/zip SHA256）：代码 a07dc30＋回执 07159d9（branch auto-hyperex，自 e734f1e 快进），tag v2.2.51=a07dc30；Release 450771204／asset RA_kwDOVO5zXc4tpLJQ（state uploaded）；zip 516564 B SHA256 87A471D53B8D2CE3D29C6611FBD2729C82DDF1FA1B17919575839FE9E7F83A34（本地 release/ zip 复算一致）；夸克 dbd3d84950124c479e76f81b4bd1f3ca；平板 Download/ 已推 ls 核 516564（09:37 mDNS）、**用户 Decaid 自装**。verify_v02251 846/846（837 基线＋A6＋③3）；闭环＋污染 immature 带行注入峰≤40%/rise≤1.5s/maxCmd≥7/两段 complete。杯 6–12 决策级回放平台 before→after：杯8 4.375→4.25（门）/杯10 4.3125→4.125（路由）/杯11 5.25→3.875（精确复现旧律 gain0.9524/flood8 并修掉）/杯12 预测 4.375→4.125（降温）；杯6/7/9 不变。A① 消费端成熟度门（bandN<3/provisional→overall r，local 不受压）② 选行带改 baseBand（effectiveBand 降诊断、删 stage 级陈旧带回退）③ S1/S2 加 ADAPTIVE 选项 mode=adaptive 立即应用最新合格学习值/无则清锚。§22.11/§22.18 不动。交接 decenthyperexplugin.reaplugin/HANDOFF_v02251.md（§5 APK 移植同步点）。前版 2.2.50（930ce25/e734f1e，Release 449845323，837/837）。
- APK **v0.24**（UI8 四批合发，用户已批全链，11-19）：沉浸全屏 immersive sticky＋去 HX 侧栏指令卡 hecBox（接管提示保留）＋控制中心样式 1/2 拆 HX/非HX 独立存盘（hecChartStyleByType、旧键迁移）＋杯末总结全屏 3s 倒计时/去控制分大数字（小字行保留控制/TDS/加权）。tag v0.24=5167bb0；Release 450739200／asset 765634999；APK 6,732,561 B SHA256 2824AFEFA7DC756E600108555BD99B3BAFE8A84378747FF4FC864315210FCBCC（本地 app-debug.apk 字节数与 asset 一致）；夸克 3d836dc013fb4326b80f60ed43f611a6；平板＋模拟器 versionCode 24 冒烟过；回归 summary 35/35＋拆分 6/6＋m10 20/20＋targetline 14/14＋flowcard 6/6＋boot 8/8。子模块 main **85f8964**（v0.24 交接；commits 0020b1d/e924d8b/148d519/5167bb0/85f8964）；父仓 main **ff7ea13**（指针同步 85f8964）。交接 HANDOFF_2026-11-19-hec-v024-release.md。规矩 251 行／155 条。
- 两仓 origin ahead 空（11-19 UI8 v0.24 全链 push 后本地核：子模块 origin/main=85f8964、父仓=ff7ea13；统筹批 b48ee50…715279d 随 UI8 main 推送一并上远端，统筹未单独 push）。v0.21=杯末总结弹窗、v0.22=样式 1 目标线、v0.23=目标杯流历史化（样式 1+2，Release 450011833）、v0.24=四批合发。

## 3 真机最新裁决（杯 12＝2.2.51 首杯 1795053602320-1，11-19 09:59；统筹独立复跑核实）

**2.2.51 修复真机验证通过，质量大幅回升**：S2 whole HIT +0.2%（raw 5.009/5、R² 0.99454）／tail −6.73%（带内 HIT anchor，晚段走低 trim +1 步到 3.9375）；S3 HIT −0.7%／tail −2.63%（杯 11 是 +19.8/+18.93）。平台路由：plan controlSource=profile-base、controlGain 1.2903、controlBase/return 3.875（＝manual base）、flood 7（离开硬包线 8）、commandBasis「base fallback (no observed tail)」、sourceRunIds=[]——**污染高带 r（杯 11 0.9524→5.25）不再被消费**；实盘 base fallback 与回放预测 4.125（g3 baseBand r1.2078）有差异，交核码①。regime 回 g2（signature 0.4312，return 窗压力 1.672/机器流量 3.828）——杯 11 g3 内生于平台假说再加一证。
红线全 PASS：峰 39.1%≤40（余量薄，峰顶 6.955@22.4s）；两段收口 complete（boost 7→trim 5.125→bleed 1.375→return 3.875）；base 3.875 manual 保住＋manual-anchor 第二次实证（HOLD/applied=false）；sent 0（16 杯）；writes 全 plugin（13=9write+4frame-change）；audit differences=[]；杯后 autoApply stage2=3.875/manual 未覆盖（S1 学习 3.125→3.063、S3 shape 0.625/0.813/0.813）。101.80 g apiStop（Decaid 102.8g）；影子 674 样本/33 决策、matched 1（S3 EARLY model 0.625 执行 resp 1.733 但帧切换污染窗 matchedPure 0）。
**两项观察核码闭环（插件接力只读，统筹复跑探针证实；非紧急、峰绊线成立）**：① 冷启动 profile-base fallback＝预期安全默认（reload 后 diagnosticLast 空→gain-memory/observed-tail 门均 null→落用户曲线指令 3.875，同杯 10 机制，非 LUT 饿死）；杯 13 gain-memory 恢复消费 g2 baseBand r1.2802 bandN7 HIGH→平台/return **3.875**（snap(5/1.2802)=3.875 探针实证，派单≈3.9375 修正）、flood 7；暖机恢复 diagnosticLast 可选另批、建议不动。② cutoff rawGS 4.517>backstop 4.25＝250ms tick 离散 artifact（predicted 主判先触发，rawGS 是触发当刻 0.75s 回归斜率、超约一个 tick 升幅）；§22.18「≤4.25」是近似界（≤4.25＋tick 裕量）；**峰余量薄主因 retained-water 物理非 backstop 迟到**（峰 6.955@return+0.5s）。建议 c+d：(c) 诊断字段加固小批（refill check 记 rawGS/predicted 序列＋cutoff estHistory/firingTickMs/margin，非控制律低风险）＋(d) 暂不动控制律（监控破 40% 再凭回放评估 a 降 backstop 0.80/b 密检 100ms）＋§22.18 文案澄清近似界。
③ 回学习入口用户未试（仍 manual）；s2 no-observation 预期、s3 updated r1.8372/n10。
口径裁定（续）：autoApply ON＋manual base 允许；manual 不学习＝no-observation；role 章在建议侧；§22.18 manual 尊重只覆盖杯间建议侧（用户 11-19 裁定不延伸杯内平台，§4）。
杯 11（2.2.50 缺陷杯，11-19 早）：峰 38.8%、S2 tail +18.93% NEAR、平台 5.25（污染 band r0.9562），2.2.51 已修。杯 10（2.2.50 首杯）：峰 20.3%、tail −0.63% HIT、return 3.875。
导出：APK .tools/__rectify-tablet-shadow-export-live-2026-11-19T1004.json（16 杯）＋history-8/shots-9/audit-2026-11-19b/workflow-51/status-51；复核 __relay-cup12-verify.cjs／extra.cjs／ev.cjs（统筹复跑：质量/红线核过，cutoff rawGS>backstop 旗标证实）。

## 4 在途与待拍板

- 在途：插件接力 01a1ee30 **⑤ 改码完成，统筹独立核过**（commit 4bca7ef 本地未推/无 tag；只 6 文件 plugin.js 18 行非控制律；verify_v02252 851/851 复跑通过；§22.18 近似界文案已补；③ 按钮改名 APPLY SELECTED MODES & COMMANDS/应用所选模式与指令＋ADAPTIVE 置灰＋adaptiveModePreview 预览）。**2.2.52 发版待用户批**（批后全 SOP tag/Release/夸克/平板，装机取证核 cutoff 新诊断字段导出）。2.2.51 已发＋杯 12 验证＋观察核码闭环（杯 13 平台 3.875）。B/改名/backstop 控制律加固另批。
- 在途（弹窗）：杯末弹窗评估 01a1ebd1 **排查完成，根因统筹复跑证实**（__sum-eval-diag.js：phases 是数组、现状解析 total=null/修正 total=85；strict TypeError 复现；portModel 真数据杯8=31/杯9=70/杯10=82/杯11=48；APK 直写归档无 commands＋trace 无分类→port=null；persisted null 遮蔽 port；回归 GOOD_DIAG 镜像断言 35/35 绿真机恒 null 违 §3.13）。**根因＝summary.js collect 把 controlReview.phases 数组当对象索引**（非缺数据）。零插件改动修复 fix1（collect 数组 find＋writes 映射＋trace 分类＋startedAt ~25 行）/fix2（persisted.total==null fall through port ~6 行）/fix3 可选（control.js archiveRun 补 commands 快照 ~8 行）/fix4（回归 mock 真形状＋真数据交叉＋在线 total≠null 断言 ~30 行）。MD HANDOFF_2026-11-19-hec-popup-score-eval.md。**UI8 简单档示意图 v3 待用户审**（popup-simple-v3.png；用户直管迭代 v1→v2→v3：hero 128px、简单档去下一杯 S2 提示〔标准/完整保留建议表〕、顶栏仅标题+✕、TDS％+确认重算与研磨度录入移评分左侧〔仅 TDS 触发重算/研磨度只记录〕、研磨建议右列、再来一杯居中短按钮；实现只 www summary.js＋index.html CSS、研磨度 hecShotTds 同款、不需 control.js 钩子）。修复＋重构待用户批并入 UI8 v0.25 批。
- 在途（UI）：**UI8 v0.24 已发版闭环**（用户直管全链，11-19；四批合发，详见 §2／交接 HANDOFF_2026-11-19-hec-v024-release.md），统筹不介入。两仓 origin ahead 空（统筹批随 UI8 push 上远端）。
- 待拍板：**⑤ 2.2.52 发版**（改码完成 851/851 统筹核过，待用户批全 SOP：tag/Release/夸克/平板，装机取证核 cutoff 诊断字段）；**④ APK 弹窗批 v0.25（UI8）**：评分解析 fix1+2+4（＋fix3 可选）＋简单档 UI（v3 示意图待用户审）＋TDS 确认重算（三档）＋研磨度仅记录；hero 仅简单档；待用户批范围＋审图，发版另批。**B＝选项 3 FF k 入平台**（另批）；**改名** holdingReference.sourceRunId（另批）；backstop 控制律加固（提前量/密检）留待破 40% 另批。已拍板闭环：A=1+2＋③ 合并发 2.2.51（杯 12 验证通过）；⑤ 改码授权完成（c＋§22.18 文案＋③ UX）；杯 12 观察①冷启动预期不动；杯 13 先验（平台 3.875）；① manual 不延伸；选项 4 不做、原 D 已否；历史杯分数三期。
- 常设待办：功能设置/其他其余内容等用户定义；二期回放页逐杯回看；三期插件提案①compact 持久化 5 指标②summary 轻量端点③TDS 集成（另批授权）；非 HX profileFrame 色带真杯验证；校准杯验证随缘；backstop 0.85/accel 历史 4/predicted cap 1.6 真机后可调（另批）；影子快笔台账 minor 候选；**插件算法→APK 移植版同步**（用户 11-19 点名）：full→hec 切换时做一次，同步债＝A 平台律（gain-memory band 记忆＋baseBand 路由＋成熟度门，APK shadow/arbiter 当前无对应物＝hec 切换需新增移植，HANDOFF_v02251 §5）＋③ 清 manual 入口（APK 走 external-flow 不复用 test-command-set，hec 若需按③语义新增）＋后续插件批，full→hec 里程碑一并移植（AGENTS §1.12）。

## 5 回叫与接力协议

- 执行→统筹：send_message_to_thread（**prompt 字段**不是 message），带轮名/key 数字/交接 MD 路径/待拍板事；纯确认不回叫。统筹→执行：派单/批准/口径校准同字段。
- 执行接力：上下文重→写自包含轮次交接 MD＋回叫停下；统筹开后继线程读交接续做。
- 统筹接力：新统筹第一动作读**本活文档**＋AGENTS＋§22；更新 §1 线程表＋AGENTS §1.8 ID 行（用户已授权常规同步）；给执行对话发回叫转移通知。
- 插件→APK 算法同步（用户 11-19 点名「改完插件要同步到 apk 里面的算法里头」）：插件控制律/估计改动须同步 APK 移植版（shadow/arbiter 同口径）；时机＝插件不用 full 可 hec 时**做一次**（full→hec 里程碑，阶段 D），期间改动记 §4 同步债；插件批交接 MD 标注 APK 移植同步点。A 批只改插件，APK 同步留 hec 切换批。
- 批准链：用户当次批准→统筹转执行对话→执行回执 key 数字→统筹远端抽查（ls-remote／Release API／父仓 ahead）→落本文件§2/§8。

## 6 路径与复跑索引

插件仓 D:/vscode/decenthyperexplugin（auto-hyperex；代码实体 decenthyperexplugin.reaplugin/plugin.js，仓根无 plugin.js，2.2.50=930ce25）；APK 仓 D:/vscode/HyperExController（父仓子模块）；父仓 D:/vscode；离线 D:/vscode/.tools/hx-train。
adb=D:/android-dev/sdk/platform-tools/adb.exe；平板 mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp；模拟器 emulator-5554；gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；GRADLE_USER_HOME=D:/android-dev/gradle-home。
复跑：node decenthyperexplugin.reaplugin/tests/verify_v02250.cjs（837）；APK 回归父仓 .tools：__summary-regress 27／__targetline2-check 14／__m10-regress 20／__m6m8-regress 8+5／__flowcard-check 6／__boot-check 8；子模块 .tools：__yield-regress 19／__rectify-r2345-test 27／__phaseB-integration-test 15。杯 11 估计器分析（只读，统筹复跑核过）：HEC .tools/__cup11-platform-eval.cjs／eval2.cjs／eval3.cjs。杯 12 复核：__relay-cup12-verify.cjs／extra.cjs／ev.cjs（统筹复跑核过）。桩 4801（父仓 __m6m8-stub）/4802（子模块 hec-stub）**每端口都要 adb reverse**、套件开头复位 workflow 与 baseUrl；提权侧起、随对话死、别 kill 旧桩。
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
- 11-19：用户点名常设规矩——插件算法改动须同步 APK 移植版，时机＝full→hec 切换做一次；落 AGENTS §1.12＋活文档 §4/§5，A 批平台律记入同步债，派单补充令插件交接标注 APK 移植同步点。
- 11-19：用户发现诊断页 S2 没法选回算法学习→统筹核码证实（stageTestRow 无 ADAPTIVE 选项，mode=auto→origin=original，manual→adaptive 仅 autoApply 间接路、OFF 则断）；记 §4 待拍板 ③，修复待用户批（插件侧 UI，独立小批或随 A 同发）。
- 11-19：用户批 ③ 修复＋合并 A 发 2.2.51（偏好立即应用最新学习值）→③ 语义定（选 ADAPTIVE 立即应用最新合格学习建议 origin=adaptive、无则清锚 armed）；发版 2.2.51 全 SOP 授权（Release＋夸克＋推平板 zip，用户自装→测杯 12）；派单补充转插件接力（A＋③ 合并、解除发版暂停）。
- 11-19：用户反馈杯末弹窗总「缺数据不评分」＋要求补录 TDS 后确认重算按钮（重算一次加权分，非无 TDS 自动补算）→统筹定位 summary.js（total=null 四路源／stageQuality 门／TDS change 自动重算无按钮／weighted total=null→null），派弹窗评估 01a1ebd1 只读排查根因＋按钮方案；修复待批（§4 ④）。
- 11-19：用户追加杯末弹窗简单档 UI 重构（中央大数字＋两侧精简建议＋TDS/研磨度补录清晰＋底部「再来一杯」确认关闭按钮，简洁；完整档保留细节）→§4 ④ 扩；派单补充转弹窗评估 01a1ebd1（方案加简单档重构节）；impeccable 设计稿选项已问用户（AGENTS 5，不擅自启用）。
- 11-19：用户定杯末弹窗简单档实现路径——按概念让 UI8 改 summary.js、先出示意图、不行喂 impeccable 抽卡→派 UI8 示意图先行（HTML mock→截图→用户审→实现，§4 ④）；评分根因仍弹窗评估 01a1ebd1 并行排查；发版 v0.25 候选另批。
- 11-19：插件 2.2.51 发版回叫＋统筹独立远端核过（ls-remote auto-hyperex=07159d9/tag v2.2.51=a07dc30；Release 450771204 asset 516564 uploaded；本地 zip SHA256 87A471D5…3A34 一致；verify 846/846；回放杯11 5.25→3.875/杯12 4.375→4.125）→§2 基线推 2.2.51、§1/§4 闭环、同步债补 HANDOFF_v02251 §5；待用户装机测杯 12（取证陪杯已通知）。
- 11-19：弹窗评估排查完成＋统筹复跑证实根因（collect 把 phases 数组当对象索引→total 恒 null，非缺数据；回归镜像断言违 §3.13；修复后杯10=82/杯11=48）；零插件改动 fix1+2+4＋fix3 可选，待用户批并入 UI8 v0.25；UI8 简单档示意图 v2 待用户审（用户直管迭代）。
- 11-19：UI8 简单档示意图 v3（用户五条反馈：hero 128px/简单档去下一杯 S2/顶栏精简/录入移左/研磨右列），用户直管迭代待审；弹窗修复批 v0.25 范围授权（fix1+2+4＋fix3 可选）仍待用户批。
- 11-19：杯 12（2.2.51 首杯）回叫＋统筹复跑核实——修复真机验证通过（S2 whole HIT +0.2%/tail −6.73% vs 杯11 +19.8/+18.93，污染 r 不再消费，红线全 PASS 峰 39.1%）；两项观察旗标（profile-base fallback 门因／cutoff rawGS 4.517>backstop 4.25 tick 粒度）派插件接力只读核码，无新待拍板（§3／§4）；regime 回 g2 证杯 11 g3 内生于平台。
- 11-19：杯 12 两项观察核码闭环（统筹复跑探针证实：① 冷启动 base fallback 预期安全、杯 13 gain-memory 平台 3.875；② cutoff rawGS>backstop 系 250ms tick 离散 artifact、峰余量薄主因 retained-water 物理，建议 c+d 诊断小批＋暂不动控制律＋§22.18 文案澄清）；用户实测 ③ ADAPTIVE 入口反馈应用按钮歧义（数字vs状态、HOLD 时清回 LUT）→记 §4 ⑤ 插件小批待批（c＋文案＋③ UX）。
- 11-19：用户批 ⑤ 插件小批（「派插件接力做」）→派插件接力改码（c cutoff 诊断字段加固＋§22.18 近似界文案＋③ UX 应用按钮歧义修，2.2.52 候选，改码不发版、发版另问）；§1/§4 状态。
- 11-19：⑤ 小批改码完成＋统筹独立核过（4bca7ef 本地未推/无 tag、6 文件 plugin.js 18 行非控制律、verify_v02252 851/851 复跑通过、§22.18 近似界文案补、③ UX 按钮改名＋ADAPTIVE 置灰预览）；2.2.52 发版待用户批（§4）。
