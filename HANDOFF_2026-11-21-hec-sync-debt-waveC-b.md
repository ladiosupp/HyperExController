# HEC APK 同步债 full→hec 里程碑 — Wave C 后半改码回执（live 镜像刷新＋O1 暖机＋numeric fp live 门，2026-11-21）

> 统筹 relay-10（01a1fd38-9fe3-7131-a24c-7983d70cf7f3）派；用户 11-21 批「改码本批授权」，发版/装机/模式切换另问。前置＝Wave C 前半（a79eb3e 落三文件）＋插件 2.2.60 已发布且用户已自装（hello 加性 gainMemory / fpKey / numericFpKey），即派单说的「C 后半前置已解除」。本批只改 APK 仓；插件仓零改；UI 零改。push 另问。

## 0. 基线、落点与产物

- HEC main 24f7dbd（v0.38 已发）。本批改 **shadow.js 两份＋control.js 两份**（assets 同步）。
- `app/www/shadow.js` 1753→1862 行（diff ＋126/−17）；`app/www/control.js` ＋16 行（3 处小改）。SHA256：shadow **8C638A2AE61E7979695CA830E9CFEF1A9AE99EF35A9557A0657FA8E11B4DF3A2**，control **B2DC5E8F771B6BA306B4AEC62DF36DD0A9CC803E463F996F00F4D01A1884CB95**（www＝assets＝APK 内 entry 三方一致，逐字节核过）。
- APK **6,824,039 字节 SHA256 FF31B656A31F9237629A9EC15450942836C37F5381948D986B8ACA0FA121DBA8**（versionCode 38 / versionName 0.38，本批未升版）。模拟器 emulator-5554 `install -r` Success，dumpsys versionCode=38。
- 专项/回放脚本在 `.tools`（不入库）：`__wavec-specialty.cjs` 扩到 **128**，`__wavec-replay.cjs` 未改仍 strict。

## 1. ① live 记忆镜像刷新（pre-cup 一次，§0 零新增萃取中请求）

- **数据源**：插件 2.2.60 `POST /external-hello` 加性返回 `gainMemory`（`normalizeGainMemory(persistentHistoryFile.gainMemory)` 只读镜像）＋ `fpKey` / `numericFpKey`；`GET /calibration-status` 的 `basketContext`。插件 master 只读，APK 永不回写。
- **摄入点（control.js）**：`hello()` 成功后 `HxShadow.ingestPluginMirror(body,{basket})` —— 连接 / 唤醒 / 回前台沿用既有 hello，**不新增**。
- **刷新时机**：`poll()` 里当 `!ext.extracting && !ext.settlingBusy && ext.settledRunId` 且该 runId 未刷过 → 触发**一次** hello（`mirrorHelloRunId` 去重）。即「杯末结算完成后、下一杯之前」，每杯最多一次，**萃取中零新增**。
- **存储**：镜像落独立键 `hecGainMemoryMirror`（`{schema,at,fpKey,numericFpKey,basket,memory}`），**不覆盖**本地 shadow 轨迹键 `hecGainMemory`（专项断言）。冷启动且插件暂不可用时用上次落盘镜像（`memorySource='mirror-persisted'`）；连镜像都没有才回本地轨迹（`'local'`）。
- **消费**：杯首 `refreshEstCache()` 把 `memory/fpKey/numericFpKey/basket` 装进 `estCache`，写侧/读侧/平台/trim 中心全部吃这一份（`estCache.memory`）。杯末学习从同一份记忆深拷贝接续（不就地改镜像对象）。
- **坏镜像**：`gainMemory` 非对象 → 置空；key 非字符串 → null；`body` 非对象 → `mirrorError='bad-body'`；一律不抛、保旧值（专项 4 条）。
- **降级**：旧插件不返回 `gainMemory` 字段时保留旧镜像；显式 `gainMemory:null` 视为插件暂无镜像（回落到落盘/本地）。
- **§0 请求点清单（全量）**：①`POST external-hello`（既有：连接/唤醒/回前台；新增：每杯结算后一次，空闲）；②`GET external-status` 700ms（既有）；③`GET calibration-status`（既有：连接与每杯首样本 `loadStageWeights`；本批只多解析一个 `basketContext` 字段）。**杯内（extracting）无新增请求**。

## 2. ② O1 暖机（只读 diagnosticLast 等价物，FF k 有 prior）

- **形态**：冷启动 `refreshEstCache()` 时若 `lastEstRun` 为空，从 shadow 持久化杯（IDB `hecShadowCups`／kv 回退）**倒序**取最近合格杯，用 `est.estimator.cfg`＋当杯 samples/writes 重建 `estRunViewFromCup` 的只读 prior，`restoredFromDisk=true`，`gainMemoryBucketId` 取当杯 `estimator.gainMemory.bucketId`。
- **信任门（照 2.2.54 口径，逐条落）**：
  1. `fpKey` 字符串相等（2.2.60 加性暴露；空则**不暖机**）；
  2. `numericFpKey` 相等（同上）；
  3. basket 一致（`calibration-status.basketContext`，字符串相等）；
  4. 学习合格 = 该杯证据行已被 oq 门接收（`estimator.evidenceRow===true`）；
  5. completed = 经 `onCupEnd()` 正常结算路径（`cup.completed=true`；runId 切换/中断结算的杯不算）；
  6. full samples 仍保留且只认**最近 4 杯**（插件 `HISTORY_FULL_SHOTS`）；
  7. `modeAtStart==='off'` 排除（对齐插件 observationOnly/off 排除）。
- **只读**：函数无写路径——不写记忆、不改 LUT、不发指令、不触发 autoApply；专项对比恢复前后 `hecGainMemory`/`hecAdaptiveHistory` 逐字节不变。
- **降级口径（须统筹核，见 §6 待拍板）**：插件 `trustedAdaptiveRun` 里的 `result='completed at …'`、`config.profileTruthVerified/profileTruthSchema`、`learningIntegrity`（事件类 learning_fault/跳帧/秤跳变）APK 侧拿不到；本批用 `evidenceRow`＋`onCupEnd` 结算＋`estimator.completed` 作等价物，并在 `cup.estimator.degraded` 记 `fingerprint/mirror` 旗标。**没有伪造 result/profileTruth 字段。**

## 3. ③ numericFpKey live 门（语义与插件 verify 一致）

- 证据行写入 `numericFp = 当杯 cup.mirrorId.numericFpKey`（杯首快照；无则回 `estCache.numericFpKey`），`basket` 同源；`profileTruthSchema` 保持 null（不伪造插件 profile truth）。
- `estHistoryForFp(history, numericFpKey)`：键字符串相等即匹配，接受 `profileTruthSchema===3`（插件行）或 `null`（live 行）；`fpKey` 为空仍返回 `[]`（红线：无键不消费）。
- 消费点：杯末平台/中心 `histForFp` 与杯内 `estControlCenterForLive` 均改传 `estCache.numericFpKey`；FF k 通过 `ffKQualified` 后进 `boundedRefillControlBase` / `liveTrimControlCenter` 第一候选（P0-1 包线与成熟 gm 并存不变）。
- 语义：插件 `numericLearningFingerprintKey` 是「去掉 targets/温度/LUT 点后的 canonical fingerprint」字符串；APK 不重算，只携带插件给的字符串做相等比较 —— 与插件 verify 的 numeric 键判等一致，无本地重算口径。

## 4. 附加字段（additive，均随 cup.estimator 落盘/导出）

- `cup.estimator` 新增 `fpKey / numericFpKey / basket / completed / evidenceRow / evidence(s2) / cfg`；`degraded` 增 `mirror`，`fingerprint` 语义改为「无 numericFpKey」。
- `cup.mirrorId`（杯首身份快照，随杯落盘）＋ `cup.completed`。
- `HxShadow.status()` 增 `mirror`（seen/at/fpKey/numericFpKey/basket/buckets/dropped/error）与 `est`（ready/memorySource/warm/fpKey/numericFpKey/buckets）只读摘要。
- 回放钩子：`ingestPluginMirror / setMirrorBasket / _mirror / _restoreWarmPrior / _loadCupRecords / _resetEstRun`。

## 5. 验证回执（全部本机实跑）

- **专项 `__wavec-specialty.cjs` 128/128**（101 基线＋27 新：镜像摄入/normalize dropped/坏镜像/坏 body/pre-cup 取镜像/镜像独立键/numeric 门三态/FF k 接管与回落/O1 七条门各自拒配/冻结窗/冷启动集成/坏记录降级/control 单点结构断言/shadow 无 setInterval）。
- **决策级回放 `__wavec-replay.cjs` 严格 0 mismatch**（24 杯全字段，`strictMismatches=[]`，gateSkips 0）；D3 条件等价维持 **cc 12/12＋10/10、gapPct 37/37、write 7/7＋5/5**；记录值保真 298/332 字段（与前半逐字相同）。live 门打开后回放无差异——回放走显式 history/prior 入参，`_setEstCache` 无 numericFpKey（等价于旧「不消费」），可解释。
- **既有 shadow 决策回放逐字不变**：`__rectify-r2345-test` **27/27**、`__phaseB-integration-test` **15/15**；`__waveb-specialty` **33/33**。
- **六套回归 169 全绿**（提权、模拟器独占、无并行套件）：summary **72/72**＋boot **8/8**＋分支 curvetag **8/8**＋TDS 矩阵 **33/33**＋TDS UI **31/31**＋WS 假死 **17/17**（专用 hec-stub 4810＋reverse 4810＋`__set-addr-4810` 前置）。
- `node --check` 两份（www＋assets）过；APK entry 哈希三方一致（见 §0）。
- **§0 自查**：新增插件请求仅「每杯结算后一次 hello（空闲）」，见 §1 清单；杯内零新增。

## 6. 冲突/待拍板（呈统筹，未自行取舍）

1. **O1 三条门为 APK 等价物**（§2 降级口径）：`result` 完成串、`profileTruthVerified`、`learningIntegrity` 插件没暴露。要么接受本批等价物（evidenceRow＋onCupEnd＋completed），要么批插件后续在 hello/ext-status 再加性暴露（如每杯 `result`/`learningEligible`）。**本批按保守等价物实现并标注 degraded；如需更严门请派插件加字段。**
2. **镜像一档延迟**：hello 在插件「结算完成」后立刻发，若插件 learning 落盘晚于 `settledRunId`，镜像可能慢一杯（下一杯结算后补齐）。要不要改成「结算后延时 1–2s 再 hello」（仍是空闲、不增萃取中请求）？
3. `hecGainMemory`（本地轨迹键）现改为「镜像＋本杯学习」的副本，纯 shadow 轨迹只存在于镜像缺失时的历史档；如要保留纯轨迹另立键请说。

## 7. 降级残留（如实）

- s3 三帧证据、startupAction/rescue/check trace 打标、stage2CommandOrigin manual 锚、LUT 标定表仍不可得（Wave D/E 范围，未动）。
- 旧插件（无 `settledRunId`/无 `gainMemory`）→ 镜像只在连接/唤醒 hello 刷新一次；O1 因缺 fpKey 不暖机（安全回落 profile-base），不报错。
- O1 的 `learningIntegrity`（秤跳变/丢重）**未**在 APK 侧复算：坏杯可能进暖机候选，靠 fpKey/basket/evidenceRow 与最近 4 杯限制兜底。

## 8. 真机待验项（另问，未做）

- 真机 Decaid + 插件 2.2.60：连接后 hello 拿到 `gainMemory` 非空、`fpKey/numericFpKey` 非空；杯末结算后 `HxShadow.status().mirror` 的 `at` 刷新、`buckets` 与插件 `diagnostic / history` 快照一致。
- 冷启动首杯：`estCache.warm=true`、`prior.runId` 为上杯；FF k 是否按预期接管（真机 trace 对照）。
- 真机装 APK（versionCode 38 未升版，发版另批）。

## 9. 复跑索引

- 专项：`node .tools/__wavec-specialty.cjs`（128，exit 0）；回放：`node .tools/__wavec-replay.cjs`（strict 0 → exit 0，report `.tools/__wavec-replay-report.json`）。
- 既有：`__rectify-r2345-test`（27）/ `__phaseB-integration-test`（15）/ `__waveb-specialty`（33）。
- 六套：父仓 `D:/vscode/.tools/__summary-regress.cjs`、`__boot-check.cjs`、`__tds-joint-matrix.cjs`、`__tds-joint-ui.cjs`；子模块 `.tools/__coord-curvetag-test.cjs`、`.tools/__ws-watchdog-test.cjs 4810`（前置 `node .tools/hec-stub.cjs 4810`＋`adb reverse tcp:4810 tcp:4810`＋`node .tools/__set-addr-4810.cjs`）。
- 构建：`JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9`、`GRADLE_USER_HOME=D:/android-dev/gradle-home`、`gradle.bat assembleDebug`（提权）；APK 内 entry 哈希用 `System.IO.Compression.ZipFile` 读 `assets/www/{shadow,control}.js`。
- 本批日志（不入库）：`.tools/__wavecb-{build,sum,boot,curvetag,tdsmatrix,tdsui,ws,stub4810,setaddr,cleanup,probe}.log`。
- **收尾已做**：baseUrl 设回 4801（读回 `http://127.0.0.1:4801`）；删本批 reverse 4810（4801 共享 reverse 保留）；停本批 hec-stub 4810（pid 46284）；stayon false；模拟器留运行。

## 10. 本轮坑

- `Start-Process -PassThru` 的 `WaitForExit(900000)` 在 exec 包装层被提前掐断时，node 仍在跑；日志停在 36/72 像卡死，其实是包装壳退出（**别急着杀**——本轮我先杀了一次健康进程，重跑才 72/72）。改用 `exec_command` 返回 session 后轮询。
- 杯末 hello 与 persist 链并发：身份必须在**杯首**快照（`cup.mirrorId`），否则杯末 hello 会把新 key 盖到旧杯证据行。
- 镜像与本地轨迹必须分键：写侧直接 `loadGainMemory()` 会让 live 估计与杯末等价物口径分裂（本批改为同源深拷贝）。
- `estHistoryForFp` 原过滤 `profileTruthSchema===3` 会把 live 行全滤掉；放开为 `schema3 || null` 后仍以 numericFp 键为唯一门。

