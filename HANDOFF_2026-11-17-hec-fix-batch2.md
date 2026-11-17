# HEC 修复批2 交接（2026-11-17 晚，审计剩余项一次做完，用户 broad 授权）

> 轮名：hec-fix-batch2。授权：用户「继续吧，把所有不需要真实杯验证的都安排下去做了」；统筹派单范围锁定。
> 基线：8332f87（v0.19 已发）。本批本地提交，未推送、未装平板、未发版、版本号未升（仍 19/0.19）。
> 红线复验：sent 恒 false（零发送代码）、第 1 层硬包线永不放宽（i5 refactor 行为逐字不变，探针 P1 包线断言 + phaseB 15/15 核）、单一写者。
> 不在本批：i8（§6.12 已文档化响应窗口径，不动）；插件仓/技能/控制律 §22 口径零改动（m1 是对齐 §6.4 documented 口径）。

## 0. 一句话结论

派单 20 项全部落地（m1/m4/m5/m7/m8/m9/m10/m11/m12/m13/m15/m16/m17/m18/i3/i4/i5/i7/i9/i10/i11/i12），node/模拟器全验：R2–R5 27/27、阶段 B 15/15、审计探针 50/50（更新版）、m5 Java/JS parity 6/6、构建通过、模拟器三段回归全过（含 m11 切回放结算、m4 trace kind、i7 遥测胶囊 stale、i11 IDB 计数、i12 学习文案、m16 滑杆防抖）。

## 1. 逐项改动（file:line）

### 控制行为（影子期，对齐 documented 口径）
- m1 软预算逃生：app/www/arbiter.js:39 — algo-hold 分支 if (used >= softCap && preference < 0.7) 才 hold，与 both-valid 分支（:33）同口径（§6.4/§6.17 倾向不是墙）。学习仲裁路径不用软预算、未动。探针 P1 翻转验证（pref 0.9 逃生 / pref 0.5 仍 hold）。
- i5 包线共用：arbiter.js:24-27 — arbitrate 内联包线提取为 applyEnvelope 单一调用（:44 起，规则/学习共用）；行为逐字不变（P1 的 ==cur→hold / 高压上行拒 / 越界夹取 + phaseB 高压包线断言全过）。
- i4 网格加固：arbiter.js:12 — clip 改先夹后 snap，输出恒在 1/16 网格（旧先 snap 后夹可产非网格 0.10；插件 toDriverStep 同口径）。P6 翻转（clip(0.05)=0.125）。

### 可靠性/正确性
- m4 回放归档 trace kind：app/www/control.js:256（noteExternal cmd 台账带 f=logicalFrame）、:331-337（archiveRun 按同帧 write / 跨帧与首笔 frame-change，复用影子 R2 逻辑，对齐 §6.10）。模拟器 hec 桩 + host 注入 external-flow 4.0/4.25 实证 kinds={frame-change:2, write:2}、全带 frame。
- m5 MergeCore 对齐 archive-core.js：app/src/main/java/com/ladios/hxcontroller/MergeCore.java:62（applyFull 温度守卫）、:78（hasTemp）、:88（parseIsoMs）、:138-142（startedAt 冲突抛错 + Date.parse 相等豁免）、:25/:163/:188/:214-216（gainMemory 透传：随导出更新、无则保留）。parity harness 6/6（温度守卫/最长取胜/gm 更新与保留/冲突抛错/尾零豁免，Java↔JS 逐字段一致）。
- m7 HTTP 池：HxBridge.java:28 — newSingleThreadExecutor → newFixedThreadPool(3)，慢请求不堵心跳；control.js:185-193 connect 内 control-mode/stageWeights 与 curves→workflow 链并行。
- m8 失败清旧态：control.js:175-181（connect 失败 closeWs + ext=null + takeLast=null + 未结束杯冻结并影子结算）、:203（stopPoll 清 ext）。模拟器 incidental 实证（reverse 缺失致 conn bad → WS 关、ext 清、胶囊隐、无残杯）。
- m9 阶段重量：control.js:286（开杯钩子补拉 loadStageWeights）；shadow.js:455（stageWeightsMissing 计数：萃取中 stage2/3 且重量非有限）、:601（status 暴露）。模拟器 stub curveEditor 成功路径 missing=0；探针 P12 失败路径计数暴露。只做 APK 侧，未改插件。
- m10 推理可观测：shadow.js:24（inferErrors/lastInferError/busySince）、:486（busy 5s 超时自愈）、:565（catch 计数）、:601（status 暴露）。探针 P13：throw 计数 + hang 挡决策 + 5s 自愈恢复。
- m11 切页结算：control.js:1311-1316（setMode 离开控制页：run 未结束 → 冻结 + archiveRun + HxShadow.onCupEnd）。模拟器 mid-cup 切回放实证 archived 0→1、导出含结算杯（sentTrue 0）。
- m12 原子取走：HxBridge.java:241（takePending rename 到 pending-buffer.taken.json 再读删，与 FetchService writeBuffer 的 tmp→rename 交错不再丢轮）。

### 效率
- m13 内存摘要：shadow.js:32（summaryOf）、:447/:593（cups.push 摘要）、:25/:433/:437（failedCups 全量留失败杯供导出回退）、:609-611（回退改 iter failedCups）、_debug 形状兼容（P14）。
- m15 启动并行：app.js:1264-1278（6 键 Promise.all 批读；HxControl.init 提前到 mergePending 之前并行；autoOn 复用批读值）。
- m16 学习中心：learn.js:337（滑杆 input 防抖 150ms + updatePrefDisplay 局部刷新 :340，不重建整页、不失焦）、:211/:253（fillDecisions/fillArbiter 改 HxShadow.latestCup 单杯读）；shadow.js:623（latestCup：在跑杯优先 → lastRunId 单杯 get → 兜底 all 排序）、:396/:435（lastRunId 维护）、app.js:146（dbCupGet）。模拟器实证滑杆节点 identity 保持 + 80% 局部刷新 + 防抖后决策列表 19 行。
- m17 窗起点索引：shadow.js:369（winStart 缓存，键独立 t3/s3/sr/so，shift 首元素变重置）、:120（weightRegression startIdx+phase 参）、:187（trimRegression sinceStamp+startIdx，原 S2 pool 过滤并入谓词）、:271（updateS2Onset 索引）、:314（updateLive 调用）、:498（决策调用）、:579（settleResponses slice）；control.js:412-413（maybeCheck run._mcIdx）。探针 P16：4500 样本 shift 后决策 rawGS 与全扫描参照 1e-9 一致、trimReg 索引与全扫描逐字一致；模拟器趋势角 44° 正常产出。
- m18 resize 防抖：control.js:133/:1414（150ms clearTimeout 同款回放页）。模拟器实证 80ms Δdraws=0、300ms Δ=1。

### UI 语义/维护
- i11 归档计数：learn.js:192（占位）、:281/:349-350（fillArchCount 读 dbCupKeys 真实计数，内存结算降为副标注）。模拟器实证 IDB 23 == 显示 23，sub「per-cup 存储 · max 40 · 内存结算 3」（§6.15 语义对齐）。
- i12 学习文案：learn.js:235-239（注脚按 learnedReady 显 LightGBM 树数/阈值，未就绪显规则 v0 参数）、:372（tab 副标题动态）。模拟器实证「学习仲裁 · LightGBM 300 棵 · 阈值 0.5」+ sub「学习仲裁 · LightGBM」。
- i7 遥测胶囊：index.html:14-16/:418（telePill  markup+CSS，34px 顶栏齐高）、control.js:708-719（renderHeaderState 透出 ext.machineAgeMs/scaleAgeMs，>1s 标红 stale；状态标注非操作小字，§7 口径）、:1302（setMode 隐藏）。模拟器实证「遥测 0.1/0.1s」→ 注入 scaleAgeMs 90000 →「遥测 0.1/90.0s」stale 红 → 恢复。
- i3 文档笔误：docs/HEC_PROTOCOL_FOR_APK.md:1/:31 — HyperExControler → HyperExController（改文档不改代码；插件仓那份只读参照未动）。

### 理论边界处置
- i9 加固：shadow.js:562-563（checkpoint 按累计 _decTotal 而非截断后 length，2000 上限后不再每决策 persist）、:404（cleanCup 剥离 _decTotal/_winIdx）。P17 验证不进存储/导出。
- i10 加固：control.js:578（applyDials 机器态 espresso 兜底 ext 滞后）、:1368（拨轮 drag pointermove 中途开杯守卫）。代码级验证（模拟器未做 drag 注入）。
- i8 不动（§6.12 已文档化响应窗口径）。

## 2. 验证回执

- node --check：改动 JS 全过（arbiter/shadow/control/app/learn + index 无关）。
- 现有回归：__rectify-r2345-test.cjs 27/27；__phaseB-integration-test.cjs 15/15（i5 refactor 后包线/回落/零发送不变）。
- 审计探针更新版：__audit-probe.cjs 50/50（P1–P17，详见 §3）。
- m5 parity：.tools/__m5-parity.cjs + __M5Parity.java（javac 独立编译 MergeCore + org.json jar）6/6。
- www→assets SHA256：7 网页 + vendor JSON/ONNX 9/9 SAME。
- gradle assembleDebug --offline BUILD SUCCESSFUL（MergeCore/HxBridge 编译过）。
- 模拟器三段（hxpad，桩 4801，提权 adb/CDP）：
  一段：boot 控制直达 v0.19/conn ok/ready/2.2.48；i7 胶囊正常+stale+恢复；m9 missing=0；七卡 79.6×7/35×7/溢出 0；趋势角 44°（m17）；m18 防抖 80ms Δ0/300ms Δ1；m11 mid-cup 切回放 archived 0→1 + 导出含结算杯；m8 失败路径 incidental 实证。
  二段：hec 桩 + host external-flow 4.0/4.25（200×2）→ m4 trace kinds={frame-change:2, write:2} 全带 frame；stageWeightsMissing 0。
  三段：i11 IDB 23==显示 23；i12 学习文案+副标题；m16 滑杆 identity 保持/80% 局部刷新/防抖后 19 行；样式 2 合并图 ink 18922；去皮 count 1；曲线弹窗 6/6；红线导出 sentTrue=0。
- 收尾：stayon false、forward 9224 / reverse 4801 删除、桩按 pid 精确停（49844/46476）；模拟器留本批包。

## 3. 探针更新说明

- P1 翻转：m1 修复后 pref 0.9 algo-hold 超软预算 → model（逃生）；新增 pref 0.5 仍 hold、==cur→hold、高压上行拒、越界夹取（i5 包线行为断言）。
- P6 翻转：i4 后 clip(0.05)=0.125 恒网格（原断言 0.10 非网格是旧行为记录）。
- 新增 P12（m9 缺失计数）、P13（m10 错误计数+busy 自愈）、P14（m13 摘要+_debug 兼容）、P15（m16 latestCup）、P16（m17 索引与全扫描参照一致，含 4500 样本 shift）、P17（i9 内部计数剥离）。16→50 断言。
- P13 坑（本轮踩）：hang 测试若 await 永不 resolve 的 onSample，探针事件 loop 排空会静默 exit 0（P14+ 不跑）；改 kick 不 await + sleep 保活。
- harness 增 dbCupGet shim；m5 parity 独立 harness（javac + org.json jar，.tools gitignore）。

## 4. 已知权衡 / 待办

- m11 杯分裂权衡：切回放冻结影子杯后若切回控制页且同一插件杯仍在萃取，会新建 run（同 runId）→ per-cup upsert 以最后一段覆盖结算杯（导出反映末段）。这是 runId 键控 + 模式切换的固有语义，非本批引入；如需保两段可另议 suspended 标记方案（派单允许的二选一里取了 onCupEnd 结算）。
- m7/m12 为代码级验证（编译过 + 逻辑核），未做慢请求堵心跳/ rename 交错的运行时压测；如需可另批注入延迟验证。
- i10 drag 守卫代码级验证，模拟器未做 drag 注入（真机手势另批）。
- stub 增 curveEditor.stageWeights（.tools/hec-stub.cjs，gitignore，m9 成功路径可测）——共享桩改动，向后兼容。
- AGENTS §5.18「app.js 只 3 处钩子…启动末 init」措辞因 m15 init 提前过时，待统筹规矩批更新（本批不碰 AGENTS）。
- m1 已修（规则 v0 倾向层）；学习仲裁路径与 §22 控制律未动。其余审计项已全清，无剩余 minor。
- 发版时按 SOP 升 20/0.20 + 干净基线 + 回归（本批未升版）。

## 5. 边界遵守

- 只 add 本批 15 个改动文件 + 本交接；别人未跟踪文件（audit MD / live-cups MD / review/hec-icon/）未碰未代提交。
- 未推送、未装平板、未发版；父仓指针未动。
- 插件仓/技能/协议插件仓副本零改动；i8 口径不动；红线三条复验成立。

## 来源对照

- 审计 = HANDOFF_2026-11-17-hec-code-audit.md（项编号源）；批1 = HANDOFF_2026-11-17-hec-fix-batch1.md；v0.19 = HANDOFF_2026-11-17-hec-v019-release.md
- 口径 = 本仓 AGENTS.md §6.4/§6.10/§6.12/§6.15/§6.17/§7；技能 §22（只读对照）
- parity 参照 = app/www/archive-core.js；离线 regAt = D:/vscode/.tools/hx-train/pipeline/build-dataset.js
