# HEC APK 同步债 full→hec 里程碑 — Wave B 改码回执（2026-11-21）

> 统筹 relay-9 审过 Wave A＋Wave B 派单（改码本批授权，里程碑项③；发版/真机装机/模式切换另问）。本批改 shadow.js＋control.js（www＋assets 各两份）；fingerprint 协议子项不做（②待用户裁，schema 预留 fpKey 位）。执行对话 01a1fb60。

## 0. 基线
HEC main f7f1e25（代码=c290d77 v0.37）；插件源 3cd2cd8 只读。本批本地 commit（只 add 4 代码文件＋本交接），push/发版另问。

## 1. 改动（4 项）
- **①gainMemory IDB schema＋normalize**：shadow.js 新增 emptyGainMemory/normalizeGainMemory（插件 1335–1407 逐字同口径含 legacy 容错：r[0.2,3] 越界 dropped 尾 20/id 去重/samples 截 6/桶截 12/seq=max/lastBucketId 校验/band steadyN null 保留/viBuckets[12,40] 按带去重 LRU3/fpKey 字段位）＋kv 存储 loadGainMemory/saveGainMemory（键 hecGainMemory；插件主本＋APK 镜像裁①，pre-cup 刷新与消费 Wave C）。
- **②scaleSampleGate helper**（插件 2715–2731 同口径 minGapMs60＋monotonic＋tareReset 清基线，摄入副本输入不改，字段兼容 APK{stamp,weight,tare}/插件{scaleTimestampSeconds,weightG,tareReset}）＋学习侧消费点 gatedLearningRegression（oq 等价路径，gate 副本后回归供 Wave C observedR；决策/控制回归仍走未 gate）。
- **③shadow 字段补**：cup.samples push（452）补 pressure/mflow/tcmd＋machineAgeMs/machineTelemetryValid 逐样本快照；control.js onScaleSnapshot ctx 补 machineAgeMs（ext.machineAgeMs）/machineTelemetryValid（machine WS 新鲜＋压力有限，插件同名旗标 APK 等价）；write 台账补 startupAction 字段位（boost/return 打标基础设施，shadow 模式需插件 trace Wave D／hec 自执行 Wave E，additive 默认 null）。
- **④wetLat 时基修复**：updateS2Onset 窗点补记到达 t，cup.s2FirstT=onset 到达 t（s.t 杯内相对秒）；s2FirstStamp 保留供回归窗（trimRegression 用 stamp 不破坏）；newCup 加 s2FirstT:null。wetLat=onset.t−boost.t 同基（Wave D Vi_obs 消费）。

## 2. 关键修复（roundtrip 抓出）
gmFiniteOrNull 初版 Number(null)=0 误判有限→lastDeviation null→0 非幂等；修为先判 null/undefined/""→null（插件 finiteOrNull 1011 逐字）。normalize roundtrip 幂等过。

## 3. 验证回执
- **六套回归**（提权，模拟器 versionCode 37/lastUpdateTime 06:37:09）：summary 72/72＋boot 8/8＋分支 8/8＋TDS 矩阵 33/33＋TDS UI 31/31＋WS 假死 17/17 全绿。
- **移植专项 .tools/__waveb-specialty.cjs 33/33**：normalize roundtrip 幂等＋legacy（r/vi 越界 dropped、dup 去重、桶 12/vi LRU3、steadyN null、lastBucketId 校验、fpKey 保留）；gate 边界（合成微簇<60ms 全拒/monotonic/tareReset 清基线/输入不改；干净杯 25–28 微簇 62/47/50/51 max62≤65＋gate 后无微簇；合成杯23型 257 微簇 gate 全拒；正常杯 gated==ungated 回归行为级）；wetLat fixed onset 4 杯 Δ=0.000（2.419/2.535/2.342/2.530）＋stamp 混基负例>1e6；export additive（新字段齐＋旧字段 intact＋startupAction/s2FirstT 字段位）。
- **既有 shadow 决策回放逐字不变**：__rectify-r2345-test 27/27＋__phaseB-integration-test 15/15（schema/gate/字段补不涉及决策消费）。
- node --check 两份过；assets 同步哈希一致（shadow 3840FD5C/control A7D3DF02）；APK 内 entry 哈希与 www 一致；assembleDebug 成功＋install -r 模拟器。
- APK 6,783,721 字节 SHA256 2979299C4B6BF60DE6C7E4A4497607B9AB57AEA073DE2CCF38BAD8F95F43B384（versionCode 37 未升版，发版另批）。

## 4. 红线遵守
影子 sent 恒 false（未触发送面）；硬包线 applyEnvelope 单一实现未动；LUT 不被学习改写；记忆不删改（normalize 只校验 dropped 标注）；§0 萃取中不新增插件请求（machineAgeMs 读已轮询 ext，镜像刷新 pre-cup 待 Wave C）；scaleSampleGate 不 gate 控制回归 trimRegression/决策 weightRegression/归档/soak/whole，摄入不去重保微簇；FC_FACTOR=0 钉死（本批未涉 flood 律）；UI 口径未动（六套回归证）；stepstrip 未加；别人 WIP 不碰（只 add 本批 4 文件）。

## 5. 本轮坑
- summary-regress 首跑红＝App baseUrl 停 4810（Wave A 探针设的，cleanup __set-addr 写 IDB 但运行中 App 内存未重载）→conn bad；设回 4801＋重启重载即绿，非代码。**__set-addr 写 IDB 后须重启 App 才重载 baseUrl**。
- gmFiniteOrNull null→0 roundtrip bug（专项抓出已修）。
- 杯23 原始带时间戳样本已被 HISTORY_FULL_SHOTS=4 裁剪（history-23/hx-history 均无），gate 边界用合成 257 微簇等价＋干净杯 25–28 max62 交叉；257/65 参考值源自插件批。
- 4801 为并行对话共享 __m6m8-stub（我起的 EADDRINUSE 退出，存量桩服务同端点）；ws-watchdog 用专用 4810 避扰。
- 模拟器本批两次掉线（重起 swiftshader_indirect）。

## 6. 待办（每步先问）
- **②fingerprint APK 来源待用户裁**（统筹荐插件 ext/hello 暴露 fpKey 加性字段，插件小改码批另授权）；Wave C⑤O1/D⑩Vi 完整指纹门硬依赖②。Wave B schema 已预留 fpKey 位。
- Wave C 起待 B 审＋②裁（gainMemory schema＋scaleSampleGate 已落不被②阻）。
- push 本批 commit/发版/真机装机/模式切换：另问。
- startupAction shadow 模式 boost/return 识别需插件 trace（Wave D）；hec 自执行打标（Wave E）。
- gainMemory pre-cup 镜像刷新机制（裁①）Wave C 落（数据源依赖②）。

## 7. 别碰＋产物
- 别碰：shadow/arbiter 发送面、温度链路、HX 液重、插件仓/皮肤/宿主（只读）、别人 WIP、记忆数据、旧桩、stepstrip、UI 口径全集。
- 产物：shadow.js＋control.js 各两份（本批 commit）；.tools/__waveb-specialty.cjs（专项 33，不入库）；日志 __sum-regress/__boot-check/__tds-ui/__ws-watchdog.log。

