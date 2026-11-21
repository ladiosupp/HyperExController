# HEC APK 同步债 full→hec 里程碑 — Wave C 前半改码回执（接力，2026-11-21）

> 统筹 relay-9（01a1fc32-fcb0-7773-93d5-8386f19ff231）派单续做 Wave C 前半（01a1fb60 后继）。用户 11-21「1、2、3、4都做」项③里程碑改码本批授权；发版/真机装机/真机 full→hec 模式切换另问。规格＝HANDOFF_2026-11-21-hec-sync-debt-waveC-spec.md（ef14674，统筹审过口径无冲突）。本批本地 commit（只 add shadow.js 两份＋本交接），push 另问。

## 0. 基线与落点
- HEC main ef14674（代码=17e2890 Wave B）；插件源 3cd2cd8（2.2.59）只读零改。
- **落点＝shadow.js 独立 section**（规格 §10 允许形式；避免动 index.html/测试沙箱加载链）：估计器纯函数＋显式传参（memory/history/prior 不依赖插件全局 state），经 HxShadow._est 暴露回放钩子。app/www＋app/src/main/assets/www 两份同步。**control.js/index.html/arbiter.js 零改**（ctx 字段已够；硬包线单一实现未动）。
- shadow.js 781→1753 行（两份各 +991/−19）。SHA256 **D820A35335D9198BF05F344FC18396356804183E118502A25B3B301F8092E53B**（www=assets=APK 内 entry 三方一致）。
- APK **6,827,146 字节 SHA256 762D20B27CCB7B0A5106ED13BB821F13A0D17031212D9ACB4690844D981FEDAC**（versionCode 37 未升版，发版另批）；install -r emulator-5554 Success（不动平板）。

## 1. 移植内容（规格 §0 范围全落）
- **①A 写侧**：estUpdateGainMemoryFromRun（签名 estGainRegimeForRun return+2~4s 优先/后段 60%＋四过滤；桶 estSelectGainBucket/estCreateGainBucket LRU＋estGainBucketLimit min(radius×1.25,gap/2)＋estGainBucketRadius 2.6×MAD clamp[.08,.20]；P2-3 双 null 删 scratch；观测 estGainStageObservation（oq available/tailMeanGS>0/ripple>25 拒/r∈[.2,3]/饱和 local＋alphaOverride .55/damped≥12/P1-3 base 命令路由键）；EWMA estGainBackfillAlpha（rescue .5/normal .12/P2-5 线性提速/dev>.15 .55/damped×.5/饱和覆盖）；band 行 steadyN/provisional（legacy null→2）；estGainConfidence reduced 封顶 MEDIUM；estGainMemoryQualityGuard 0.60/0.35/0.40）。
- **①A 读侧**：estGainMemorySuggestion（run.gainMemoryBucketId 优先→签名选桶→s1OutflowHint high 最高 center LOW→lastBucketId；跨桶借 n 降序 center 距次 stale/cross-bucket；**A② baseBand 路由** effectiveBand 降诊断；**P1-4 provisional 弃用回 overall**；local 门 lastLocalR＋dev>.15→LOW；ceiling min(8,lut×2)；crossBand 旗标）＋**成熟度门 estPlatformMemoryGain**（immature=!local&&bandMatched&&(bandN<3||provisional)→smoothedR；local 不受压；建议侧报告不改 P0-2）。
- **建议侧配套**：estApplyMemoryToS2Node（P0-2 tailHit/regimeChange/bandImmature 双支＋numeric pull HIGH 1/LOW .7＋**D3c 大缺口>30% ±50% 宽包线**（绝对量 .35 不动）＋direct-mapping P0-1 阻尼单步＋**manual 锚** HOLD role manual-anchor＋actuator guard 豁免 estGainMemoryQualityGuard）；estAddGainS2（span max(cmd×.12,.35)；eligible 2 杯≤5%/≥3 杯≤12% 不套混带收紧）。
- **④D1**：estAdaptiveEstimateFallback（HIGH gm→platformMemoryGain→snap(target/r) source gain-memory；次 eligible FF k（混带 spread≤.05）→feed-forward-k；都无 null→调用方 LUT 安全默认）。
- **④D2**：estStageGainEstimate（尾 8＋当杯；s3 按秒加权；mixedBand 旗标）/estFfKQualified（3 杯≤.12/2 杯≤.05/混带≤.05）/estS2FfPlatformCandidate/estS2RefillPumpEstimate（observed-tail 源；信任门 fpMatch 旗标传入）/estLiveTrimMemoryCandidate（s3 当杯优先序）/estMappedCommandForReal（标定表显式传入）/**estBoundedRefillControlBase**（FF k 第一候选＋P0-1 包线 hi=max(gm×1.25,gm+.35)/lo=min(gm×.75,gm−.35)→gain-memory→observed-tail→profile-base→lut）/**estLiveTrimControlCenter**（local blend 优先 count≥3/覆盖满窗/600ms 新鲜/weight min(.75,.15×(count−2))/local 夹 prior±25%/prior=platformMemoryGain||local.r→FF k 同包线→gm→lut→profile-base）。
- **④D3**：normalTrimQuanta 第 4 参 largeGap（S2 streak≥3?8:6）/recoveryTimeEstimate 透传/estLiveResponseIntervalMs（rescue 800/S3 2400/S2 largeGap 1000/S2 1200）；**updateLive 接入**：cc=estControlCenterForLive（estCache 记忆/历史/prior＋lv local 等价物）→gapRel=|command−cc.commandMlS|/cc.commandMlS→largeGap 仅 S2>.30→**rescueHot=(streak≥2||largeGap)&&predictedRel>.25&&actualRel≥.12&&cannotReturn**（后三门不动）；rRescue=cc.r>0?cc.r:RESCUE_R（空记忆/无历史/无 local→profile-base r=null→RESCUE_R，与旧口径逐字一致）；lv.largeGapS2/commandGapPct/controlCenterMlS/controlSource 每评估刷新；writes 台账补 largeGap/commandGapPct 字段位。
- **依赖链（最大隐含块）**：estControlOutputQuality（9249 逐字：scaleSampleGate 复用 Wave B 实现只 gate 学习侧；满窗 1.2s R²≥.90＋reduced 0.8s R²≥.95；plateauFallback；R-5）/estS2LearningWindow（settle 800/chain 1500；R-5 未确认 null）/estStage2PlateauStartMs（95% 峰+1.5s 下限学习窗；末段保 1.2s）/estStage2EffectiveCommand（泵跟随 targetFlowMlS 中位数 L-10/L-11）/estStage2CupOnset/estPhaseRawSamples(Untrimmed)/estDiagnosticRawRegression/estRegressionForRawSamples/estLinearRegression/estS1OutflowHint/estCommandBandOf/estLearningPolicy。
- **证据历史存储**：kv hecAdaptiveHistory 尾 8（loadAdaptiveHistory/saveAdaptiveHistory）；行 {runId,profileTruthSchema,fingerprint,numericFp,basket,s2:{command,measured,targetGS,measurementBasis},s3,source,capturedAt}；estHistoryForFp（fpKey null→[] live 不消费 FF；schema3＋key 匹配过滤）。
- **杯末钩子**：persist(c,final) 链内先 runCupEstimator 再落盘（失败不阻塞，estimatorError 暴露 status）；runViewFromCup 适配（samples/rawScaleSamples/trace/config 映射）；写侧→saveGainMemory→历史行（shadow-oq-tail 对）→读侧/平台/中心等价物记 **cup.estimator**（schema1＋degraded 旗标，additive 随导出）；estCache 杯首 refreshEstCache fire-and-forget。
- **样本补字段**：cup.samples push 补 **decaid**（plateau 峰值/S1 提示必需；Wave B 同款 additive）；cup.cfgView 逐样本快照（target/base/limiter 按阶段；cleanCup 删除不入库）。

## 2. 锚点映射（est* → plugin.js 2.2.59=3cd2cd8）
常量 GM_*→314–333；estRound/estFiniteOrNull→1003/1011；estMedian/estAverage→2580/2587；estClampNumber/estClampCommandFlow/estToDriverStep/estSnapCommandFlow/estSameCommandFlow/estFormatCommandFlow→600–652；estCommandBandOf→1559；estLinearRegression→7996；estRawTimeSecondsForSample/estRegressionForRawSamples→2636/2732；estPhaseRawSamplesUntrimmed/estPhaseRawSamples→2622/2656；estStage2CupOnset→2640；estDesiredRealForRunPhase→2948；estDiagnosticRawRegression→2592；estS2LearningWindow→2691；estStage2PlateauStartMs→1597；estStage2EffectiveCommand→1573；estControlOutputQuality→9249；estS1OutflowHint→1462；estGainRegimeForRun→1473；estGainBucketLimit/estGainBucketRadius→1512/1523；estSelectGainBucket/estCreateGainBucket→1528/1543；estGainConfidence→1419；estGainBackfillAlpha→1429；estGainStageObservation→1623；estGainMemoryQualityGuard→1667；estUpdateGainMemoryFromRun→1694；estGainMemorySuggestion→1775；estPlatformMemoryGain→3521；estStageGainEstimate→4919；estFfKQualified→3533；estS2FfPlatformCandidate→3539；estS2RefillPumpEstimate→3493；estAdaptiveEstimateFallback→3555；estLiveTrimMemoryCandidate→9583；estMappedCommandForReal→1125；estBoundedRefillControlBase→3572；estLiveTrimControlCenter→9650；estLiveResponseIntervalMs→9640；estNormalizeLearningLevel/estLearningPolicy→1315/1319；estAddGainS2→5128–5169（s2 支）；estApplyMemoryToS2Node→5170–5282＋guard 豁免 5285–5297；normalTrimQuanta/recoveryTimeEstimate 原地扩→9602/9612；updateLive D3→10228–10238；writes 台账→10442；证据历史尾 8→4857；杯末钩子→4828。

## 3. 验证回执 key
- **决策级回放对照 __wavec-replay.cjs（规格 §8 核心）**：24 杯全点语料（history-2..23 runId 去重时间序）；双 pass——A 连续记忆轨迹（空起）严格等价；B 逐杯真实记忆种子（**export N−1 的 gainMemory＝杯 N 前真实状态**，逐杯核过 last-shot 映射）。插件侧＝verify_v02259 harness vm cut＋补 hooks＋**注入捕获真 pre-memory s2 节点**（s2AdaptiveSuggestion 自身消费 gainMemory，禁用记忆法失真）；APK 侧＝shadow.js 沙箱 _est。证据行/diagnosticLast/stage2AdaptiveEvidence/stageActuatorEvidence/reconcileStageWithCurve＋curveCommandsForRun 离线喂（范围外函数同输入隔离）。
  - **严格对照 0 mismatches（24 杯×全字段）**：写侧 out（status/bucketId/bucketCreated/absorbed/center/radius/signature/signatureSamples/regime 五字段/stages s2+s3 status,r,n,observedR,deviationPct,alpha,confidence,reduced,source,drift,commandBand）＋记忆轨迹快照（去时间戳）＋读侧 25 字段（含 baseBand/effectiveBand/bandR/bandN/bandMatched/bandProvisional/local/crossBand/stale/fallback/hintApplied）＋oq 8 字段＋pumpEstimate 5 字段＋boundedRefillControlBase＋liveTrimControlCenter（含 confidence）＋stageGainEstimate 6 字段＋D1 fallback＋**建议门 usable/action/suggestedCommandMlS/confidence＋gainMemory role/applied/confidence/damped/band/bandN/r/commandMlS/bucketId＋reason 逐字**；gate skips 0。
  - **D3 事件级（裁⑦原生节拍：APK 样本驱动 vs 插件 250ms tick；对照点＝决策点＋写序列；ms 归一禁镜像）**：199 check＋46 write（排除插件守卫早退行 settle/ramp/silence/inertia——largeGap/cc 字段未算；排除启动执行窗 boost→complete——执行状态机 Wave E 范围）。无条件 largeGap 211/245、rescue 170/199；**条件等价全绿：cc 对齐（±1/16）12/12 largeGap＋10/10 gapPct；gapPct 对齐 37/37 largeGap；write 决策点 cc 对齐 7/7 largeGap＋5/5 gapPct**。无条件差归因输入状态：2 杯缺种子（1794870069039-5/1794873721382-6，首现 export 无前文件）→profile-base vs 真机 gain-memory；local blend 节拍差；prior 杯差（语料间隔非全点杯）。
  - **记录值保真（报告项，非等价门）**：seeded write vs 运行时 evidence.gainMemory **298/332 字段（10/22 杯全 match）**；差字段 s2.r 11/observedR 9/deviationPct 8/s3.r 2/n 2/confidence 1——主因轨迹漂移（export 间非全点杯更新缺种子）＋observedR ≤0.3% 微差（运行时流 vs 归档流；**插件 harness 与 APK 同归档输入逐字一致→非移植差**，追因另批只读）；plan cross 8/23（FF 历史语料差）。
- **移植专项 __wavec-specialty.cjs 101/101**（行为级手算期望禁镜像）：桶几何/LRU/P2-3/分区不变量（181 签名扫描 hit/create 两态）；签名窗四过滤；EWMA α 五支＋P2-5；band provisional/legacy steadyN；baseBand 路由；local 门/跨桶借/S1 提示/ceiling；成熟度门五态；FF 资格边界（.12/.121/.05/.051/混带）＋尾 8＋s3 秒加权＋<2 行门；D1 三优先；D2 选择序五层＋P0-1 包线双向＋local blend weight/夹幅/新鲜/count；D3 quanta 6/8＋静默四档＋recovery 透传＋**rescueHot 大缺口豁免合成杯（gap 60% streak0 触发；对照 gap 14.3% 不触发）**；建议门 manual 锚/HIT anchor/immature band/±50% 宽包线（2.5→3.75）/±25%（3.5→4）/addGain span；oq R-5/reduced/学习窗 800/1500；历史尾 8/fp 门；杯末钩子（estimator 附杯/记忆落盘/历史行/sent false/cfgView 不泄漏/writes 字段位）；gate 不 gate 控制回归微簇证。
- **六套回归 169 全绿**（提权，模拟器 versionCode 37）：summary **72/72**＋boot **8/8**＋分支 curvetag **8/8**＋TDS 矩阵 **33/33**＋TDS UI **31/31**＋WS 假死 **17/17**（专用 hec-stub 4810＋__set-addr-4810 前置切址）。
- **既有 shadow 决策回放逐字不变**：__rectify-r2345-test **27/27**＋__phaseB-integration-test **15/15**（D3 接入后复跑；桩场景指令偏差≤6.25%<30% largeGap 不触发，空记忆 cc r=null→RESCUE_R 与旧口径一致）。
- **Wave B 专项复跑 33/33**（normalize/gate/wetLat/export 无回归）。
- node --check 两份过；哈希三方一致；git 只改 shadow.js 两份（+1982/−38），别人 WIP 未碰。

## 4. live 降级（如实记录 cup.estimator.degraded；回放全离线喂规避）
- **s3 三帧证据**不可得（stage3AdaptiveEvidence 链不在本波）→live 只学 s2；回放喂插件 evidence.s3。
- **startupAction/rescue/check trace** 不可得（shadow 台账只观测 write/frame-change；打标 Wave D 插件 trace／Wave E hec 自执行）→live s2LearningWindow refill=false（oq 走 plateau/final60%）、gainBackfillAlpha 全 write 计 normal；回放喂真 trace＋真 plan。
- **stage2CommandOrigin** ext 未暴露→live manual 锚不触发（按 adaptive）；回放喂 commands.stage2.origin。
- **numeric fingerprint** APK 算不出（②待用户裁）→live 历史行 numericFp=null、FF k 不消费；回放 fixture fp（numeric key 排除 targets/温度/LUT 点，逐杯 targets 可变）。
- **LUT 标定表** APK 侧无→lut 分支跳过（profile-base 兜底）；回放喂 fixture points。
- **decaid** 已补捕获；scale WS weightFlow 缺时 null→plateau 降级 final60%（如实）。
- stage2PressureLimit live=ctx.limiterBar；回放 fixture 6（先例口径；仅 qualityGuard/pumpEst 消费）。

## 5. 插件侧观察（逐字镜像未改；插件仓零改；修插件须另授权批）
- gainStageObservation 读 **evidence.liveTrimChain（顶层）**，rememberAdaptiveEvidence 只置 ev.s2.liveTrimChain→顶层永不置位→2.2.59 该钩子 saturated/local 路径不可达（est 镜像同行为；回放同输入同输出）。
- selectGainBucket **absorb 支在 HYSTERESIS 1.25>1 下数学空**（limit=min(1.25r,gap/2)；最近邻距≤gap/2 恒命中；absorb 区间 (limit,r] 空）→分区不变量成立（专项扫描证）。

## 6. 红线遵守
影子 sent 恒 false（专项＋27+15 证）；硬包线 applyEnvelope 单一实现未动（arbiter.js 零改）；LUT 不被学习改写；记忆不删改（normalize 只校验 dropped 标注，学习＝EWMA 本身）；§0 萃取中不新增插件请求（估计器读本地样本/记忆镜像，external-status 既有轮询）；scaleSampleGate 不 gate 控制回归 trimRegression/决策 weightRegression/归档/soak/whole＋摄入不去重（专项微簇证）；FC_FACTOR=0 未涉（flood 律未移植）；UI 口径 v0.13–v0.23 未动（六套证）；stepstrip 未加；别人 WIP 不碰不代提交（git 只 2 文件；插件仓 HANDOFF_2026-10-31.md M 未碰；HEC untracked HANDOFF/review 未碰）。

## 7. 本轮坑
- **vm 双层 context**：verify setup() 内层 context 跑插件，globalThis 捕获变量不在外层 pctx；host 侧预置属性与 ctx 内写入脱钩（contextify）→注入 __setPreMem/__getPreMem hook 内层设取。
- **s2AdaptiveSuggestion 自身消费 gainMemory**（chain/tail 支 s2ReverseEstimate）→禁用记忆取标量节点失真→注入捕获真 pre-memory 节点（内存注入，shipped 插件零改）。
- **exec wrapper 管道断连留僵尸 node**（继续操作模拟器干扰下一跑；日志半截无 ERR）→Start-Process OS 级重定向＋-PassThru.ExitCode；只 kill 自己 PID（45036）。
- gradle native services 沙箱写 D:/android-dev 拒→require_escalated；**沙箱网络隔离误报 4801 DOWN**（存量桩在）→提权侧探。
- D3 对照须排除插件守卫早退行（largeGap/cc 未算）与启动执行窗（Wave E），否则假不匹配。
- assets 时间戳相同 gradle 跳任务→APK 内 entry 哈希必核（本次三方一致）。

## 8. 待办（每步先问）
- **②fingerprint 来源待用户裁**→C 后半（live pre-cup 镜像刷新＋⑤O1 暖机＋numeric fingerprint live 门）硬依赖；本波回放离线喂规避。②裁后统筹通知 C 后半。
- push 本批 commit/发版/真机装机/真机 full→hec 模式切换：另问。
- startupAction boost/return 打标：Wave D（插件 trace）/Wave E（hec 自执行）。
- observedR ≤0.3% 运行时 vs 归档微差：报告项非移植差；追因另批只读。
- absorb 死支/evidence.liveTrimChain 顶层未置：插件侧观察，修插件另授权批。

## 9. 产物索引／复跑
- 代码：app/www/shadow.js＋app/src/main/assets/www/shadow.js（本批 commit）。
- .tools（不入库）：__wavec-replay.cjs（＋__wavec-plugin-injected.js 注入副本＋__wavec-replay-report.json）／__wavec-specialty.cjs（＋report）／__wavec-dbg1.cjs／__wavec-cleanup.cjs／__wavec-baseurl-probe.cjs；日志 __wavec-{sum,boot,curvetag,tdsmatrix,tdsui,ws}.log（＋.err）／__wavec-stub4810.log／__wavec-setaddr.log／__wavec-cleanup.log。
- 复跑：node .tools/__wavec-replay.cjs（strict 0→exit 0）；node .tools/__wavec-specialty.cjs（101）；六套＝父仓 .tools __summary-regress/__boot-check/__tds-joint-matrix/__tds-joint-ui＋子模块 __coord-curvetag-test/__ws-watchdog-test 4810（前置 hec-stub 4810＋reverse 4810＋__set-addr-4810）；决策回放 __rectify-r2345-test/__phaseB-integration-test；Wave B __waveb-specialty。
- **收尾已做**：baseUrl 设回 4801＋重启重载（读回核实 http://127.0.0.1:4801）；删本批 reverse 4810（**4801 共享 reverse 保留**，并行对话套件需要）；停本批 hec-stub 4810（pid 45008）；stayon false；模拟器留运行；4801 存量桩未 kill。

## 10. 接力协议
本对话＝01a1fb60 后继（Wave C 前半）。上下文重按协议写自包含交接＋回叫统筹停下；统筹开后继。C 后半待②用户裁后统筹派单。新建后继显式 model=alibaba-token-plan/qwen4-max-preview＋嵌套 target（AGENTS 22）。

## 11. 补注：commit 实际落点与并行批（2026-11-21 16:20）
- **Wave C 三文件实际落在 a79eb3e**（统筹 UI 记录批，16:16:46）：本对话 git add 三文件后、commit 前，统筹批裸提交扫入已暂存内容（其 message 称「只 add HEC_COORDINATOR_STATE.md」，stat 实含 shadow.js ×2＋本交接）。**内容已核：git diff HEAD -- shadow.js 两份＝0，与工作区/已验 APK entry 逐字一致**。不改写历史（并行对话活跃，AGENTS 7 别人提交不回滚）；本补注单独 commit 作 Wave C 回执标记。
- **989025b（16:16:49）升版 v0.38**（versionCode 38，只 build.gradle）在本批 APK 构建（15:59，versionCode 37）之后→**本批回归跑在 37＋Wave C shadow**；下次构建起为 38。UI 取分修复 8a3c8fe（16:07，index.html＋summary.js 两份）明确「Wave C shadow WIP 留工作区未暂存」未碰本批；其改动在本批构建时已在工作区→APK/回归含该 UI 修复（组合态验证）。
- **共享模拟器并行干扰**：首轮 summary 跑半截断（36/72 无 ERR）系并行套件同抢 emulator-5554/CDP＋wrapper 管道断连留僵尸 node（已 kill 自己 PID 45036）；Start-Process OS 级重定向干净重跑 72/72。后续波次跑六套前先确认无并行套件占用模拟器。
