# HEC 统筹状态活文档（唯一状态真源）

> 用户 2026-11-18 晚点名设立：统筹要跟踪的一切集中本文件，每事件更新；**每次统筹接力，新统筹第一动作读本文件＋本仓 AGENTS.md＋decentplugin 技能 §22**，不逐份读历史交接。轮次细节在各 HANDOFF_*.md，本文件只留现行状态。
> 维护纪律：回叫/派单/拍板/发版/接力到达即更新对应节＋§8 日志一行；随统筹批 commit（只 add 本文件＋AGENTS.md），push 问用户。执行对话交接 MD 只作轮次细节，状态以本文件为准。

## 0 硬规矩指针

AGENTS 20 改代码/发版/推送/装机/开闭环先问（当次授权只对当次那批）；16 全程中文；7 git 四件事＋只 add 本批；21 控制律先读 §22；15 正斜杠绝对路径；19 改哪一侧先说清。影子 sent 恒 false；第 1 层硬包线永不放宽；单一写者（插件代写 A010；HEC 档 APK 经 external-flow 交插件校验代写）；LUT 不被学习改写；adb/构建/回环/gh 一律提权；GitHub push 走 VPN 代理 127.0.0.1:57890；§22 控制律敏感须用户另授权；S3≥5 ml/s 标定已撤销别再提；matched 只校准素材不是增益裁判；离线证不出增益别造阳性；真实仓写操作除非用户明说一律不做（模拟器写云先确认 coffee.beans.testMode=1）。

## 1 线程表（hostId local；项目「decent 相关」5f74cf60-4cb4-4b5c-b439-b5bdf0cde7e5）

| 角色 | threadId | 状态 |
|---|---|---|
| 统筹（现） | 01a1ee1f-0841-7c91-866d-668705990047 | active |
| 插件接力（2.2.50 发版＋核码） | 01a1ee30-8d3c-7b23-a455-0d3793534e58 | idle |
| 取证接力（陪杯/导出） | 01a1eec0-d9b7-7703-8793-a4d9168accfb | 待命陪杯 |
| UI 入口（UI8） | 01a1eeac-1f2d-77d2-8b80-568d0821aa27 | idle |
| 规矩整理 | 01a1e6c9-2d1f-7100-a059-25c9c20d6b87 | idle |
| 杯末弹窗评估 | 01a1ebd1-6605-7ca0-b952-bd6fa2c81723 | idle |
| 离线验证 | 01a1e911-f0bd-7cb3-ace3-bfc591a27582 | idle（三轮到顶） |
| 审计修复发版 | 01a1e98a-1064-75e1-8706-32658810d676 | idle（34 项闭环） |

退位/归档：旧统筹 01a1dcec / 01a1e44a / 01a1e90d / 01a1eb9b；旧取证 01a1e685；旧修复批 01a1ebac；旧 UI7 01a1e8e3；UI 接力 01a1eeaa（已归档）。create_thread 用嵌套 target:{type:"project",projectId,environment:{type:"local"}}（AGENTS 22，拍平必报错）。

## 2 基线（统筹远端核过）

- 插件 **2.2.50**：代码 930ce25＋回执 e734f1e（branch auto-hyperex），tag v2.2.50；Release 449845323／asset RA_kwDOVO5zXc4teoab；zip 510796 B SHA256 2C3B7378F86D8E67200508043F2B11190D8B564C9E857B9523D92600DEE4D863；夸克 22cb7d9183be426c94d7444be269b95d；平板 Download/ 已推、**用户自装**。verify_v02250 837/837（统筹独立复跑）。五项：cutoff 背 stop 0.85＋accel 中位滤波＋predicted 显示 sanity（shaping 未封顶）＋manual 锚＋regimeChange 排除 manual＋删重复 push；§22.18 记录过冲约束峰≤40%。
- APK **v0.23**：tag v0.23=94803be；Release 450011833／asset 763474919；APK 6,731,125 B SHA256 EDB2F5A14C18C5659C0C07C62E1D2705CF435C4C5CA0D181351DF1577DEB4AD5；夸克 8c7f7e47378b426a9df5bf2e45ce3afb；平板＋模拟器 versionCode 23 冒烟过。子模块 main **71cc3c3**（规矩同步 v0.23）；父仓 main **82290f5**。规矩 251 行／155 条。
- 两仓 origin ahead 空（11-18 晚 push 后核）。v0.21=杯末总结弹窗、v0.22=样式 1 目标线、v0.23=目标杯流历史化（样式 1+2）。

## 3 真机最新裁决（杯 10＝2.2.50 首杯 1795005952147-1）

峰秤流 **20.3%**≤40% 绊线（2.2.49 杯 9 为 58.6%）；cutoff rawGS 2.988≤backstop 4.25（basis predicted）；两段收口 trim 5.1875→bleed 1.375→return 3.875（ACK 73/157/145ms）；base 3.875 manual 保住；S2 whole HIT +2.8%／tail −0.63%；101.60 g apiStop；影子 688 样本／35 决策、sent 0（14 杯逐杯核）。
口径裁定：2.2.50 后 **autoApply ON＋manual base 允许**（用户自开试锚；「必须 OFF」为 2.2.49 过渡门禁，退役）；manual 杯不学习＝no-observation 预期（origin 回 adaptive 恢复学习）；role 章在**建议侧** adaptiveDecision.s2.gainMemory.role（HIT 先行＝hit-anchor；真拦下改动才 manual-anchor），不在学习侧 gainMemory.stages；影子 writes 台账漏 257ms 快笔（~700ms 轮询差分局限）→收口序列以插件 trace 为准（minor 候选未立项）。
导出：APK .tools/__rectify-tablet-shadow-export-live-2026-11-18T2056.json（14 杯）＋history-6/shots-7/audit-18c/workflow-cup50/status-cup50；复核脚本 .tools/__relay-cup10-verify.cjs / __relay-cup10-final.cjs。

## 4 在途与待拍板

- 在途：**无阻塞**。取证接力待命陪杯；出杯前复冒烟照旧（版本/心跳/mode=full/秤遥测几百 ms/胶囊亮/前台亮屏，逐杯导出）；秤休眠须唤醒复测才放行；autoApply ON 不再拦放行。
- 待拍板：**无**。
- 常设待办：功能设置/其他其余内容等用户定义；二期回放页逐杯回看；三期插件提案①compact 持久化 5 指标②summary 轻量端点③TDS 集成（另批授权）；非 HX profileFrame 色带真杯验证；校准杯验证随缘；backstop 0.85/accel 历史 4/predicted cap 1.6 真机后可调（另批）；影子快笔台账 minor 候选。

## 5 回叫与接力协议

- 执行→统筹：send_message_to_thread（**prompt 字段**不是 message），带轮名/key 数字/交接 MD 路径/待拍板事；纯确认不回叫。统筹→执行：派单/批准/口径校准同字段。
- 执行接力：上下文重→写自包含轮次交接 MD＋回叫停下；统筹开后继线程读交接续做。
- 统筹接力：新统筹第一动作读**本活文档**＋AGENTS＋§22；更新 §1 线程表＋AGENTS §1.8 ID 行（用户已授权常规同步）；给执行对话发回叫转移通知。
- 批准链：用户当次批准→统筹转执行对话→执行回执 key 数字→统筹远端抽查（ls-remote／Release API／父仓 ahead）→落本文件§2/§8。

## 6 路径与复跑索引

插件仓 D:/vscode/decenthyperexplugin（auto-hyperex）；APK 仓 D:/vscode/HyperExController（父仓子模块）；父仓 D:/vscode；离线 D:/vscode/.tools/hx-train。
adb=D:/android-dev/sdk/platform-tools/adb.exe；平板 mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp；模拟器 emulator-5554；gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；GRADLE_USER_HOME=D:/android-dev/gradle-home。
复跑：node decenthyperexplugin.reaplugin/tests/verify_v02250.cjs（837）；APK 回归父仓 .tools：__summary-regress 27／__targetline2-check 14／__m10-regress 20／__m6m8-regress 8+5／__flowcard-check 6／__boot-check 8；子模块 .tools：__yield-regress 19／__rectify-r2345-test 27／__phaseB-integration-test 15。桩 4801（父仓 __m6m8-stub）/4802（子模块 hec-stub）**每端口都要 adb reverse**、套件开头复位 workflow 与 baseUrl；提权侧起、随对话死、别 kill 旧桩。
发版：gh token 用 git credential fill（不回显）＋HTTPS_PROXY/-Proxy 57890、curl -H 'Expect:' --data-binary 耐慢传；夸克 quarkclouddrive CLI「来自：Codex」（notice.text 非空原样展示）；插件平板只推 zip 不代装；APK install -r 须用户批准。

## 7 别碰

影子发送/仲裁发送面、温度链路、HX 液重（非本批不碰）；别人未提交/未跟踪不碰不代提交不回滚；记忆数据不删；旧桩端口别 kill；stepstrip 概览胶囊别加回；UI 口径 v0.13–v0.23 全集别回退（AGENTS §7）；hec 杯与 pre-fix 旧杯不进训练；5 异常杯排除留压力测试集；stub- 模拟器杯不进真机 universe。

## 8 更新日志

- 11-18 晚：设立活文档（用户点名「每次要统筹的都更新到一个 md、接力统筹都读它写进规矩」）；此前 chronology 见 decenthyperexplugin/HANDOFF_2026-11-18-hec-coordinator-relay-2.md 及各自交接。
- 11-18 晚：杯 10 裁决＋两观察项闭环＋autoApply ON 口径落档（§3）。
- 11-18 晚：v0.23 发版＋规矩同步 71cc3c3／父仓 82290f5 已推（§2）。
