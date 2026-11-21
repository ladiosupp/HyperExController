# HEC APK 同步债 full→hec 里程碑 — Wave C 前半移植规格交接（接力，2026-11-21）

> 执行对话 01a1fb60 已连续完成 Wave 1（方案）/A（验证）/B（schema/gate/字段/wetLat 改码），上下文重，按派单明示接力协议写自包含规格交接＋回叫停下，统筹开后继读 Wave 1/A/B 交接＋本份＋派单续做。本份＝Wave C 前半的精确移植规格（Boole 子代理提取＋主对话核），后继据此镜像 plugin.js，无需重新盘点。

## 0. 派单范围与基线
- **范围（改码授权，里程碑项③）**：①A 平台律（band/baseBand 路由/成熟度门 platformMemoryGain 等价）＋④D1 清锚 fallback/D2 FF k 入平台/D3 largeGap 增量——估计器纯函数＋证据历史存储，shadow 模式 sent 恒 false 只记录等价物。
- **不做（留 C 后半待②裁）**：live pre-cup 镜像刷新（数据源依赖②）＋⑤O1 暖机（完整 fpKey 硬依赖②）。numeric fingerprint APK 本地算不出→回放用插件证据行离线喂，live 门留 C 后半，冲突先问。
- **基线**：HEC HEAD 4e0b3e4（代码=17e2890 Wave B）；插件源 3cd2cd8（2.2.59）只读。Wave B 已在 shadow.js：gainMemory schema/normalize（emptyGainMemory/normalizeGainMemory/loadGainMemory/saveGainMemory 键 hecGainMemory）、scaleSampleGate/gatedLearningRegression、样本 pressure/mflow/tcmd/machineAgeMs/machineTelemetryValid、writes startupAction 字段位、s2FirstT（onset 到达 t）。
- **验证**：决策级回放对照（离线喂插件 history JSON，插件 verify harness vs APK 估计器，逐杯比 bucketId/center/radius/r/band/bandN/provisional/confidence/commandMlS/controlSource，事件级节拍对齐⑦，禁镜像）＋六套回归 72+8+8+33+31+17＋既有 shadow 决策回放逐字（r2345 27/phaseB 15）。

## 1. 常量（plugin.js 314–333）
ALPHA .35／DEVIATION_ALPHA .55／DEVIATION .15／BUCKET_RADIUS .12／BUCKET_MIN_RADIUS .08／BUCKET_MAX_RADIUS .20／SIGNATURE_SAMPLES 6／HYSTERESIS 1.25／GAIN_R_MIN .2／GAIN_R_MAX 3／MIN_SAMPLES 10／MAX_BUCKETS 12。commandBandOf（1559–1568）：<1.0／1.0-2.0／2.0-3.0／3.0-4.0／4.0-5.0／>=5.0。

## 2. ①A 平台律——写侧 updateGainMemoryFromRun（1694–1774）
杯末钩子 rememberAdaptiveEvidence（4828，4832 调写侧；同钩子 4836 Vi、4841 下一杯建议、4857 原子落盘）。
- **签名 gainRegimeForRun（1473–1508）**：S2 样本≥10；窗优先**补水 return＋2~4s**（trace kind write && startupAction return && frame1 的 tMs），否则后段 60%（slice floor(n*.4)）；过滤 |machineFlowMlS|≥.15、machineTelemetryValid!==false、machineAgeMs≤600、ratio=pressureBar/machineFlowMlS∈(0.05,5]；signature=median(ratio) round4。
- **桶选择 selectGainBucket（1528–1542）**：最近 center；命中限 gainBucketLimit（1512）=min(radius×1.25, 最近邻桶距/2)（分区不重叠 L-4）；dist≤limit 命中；≤radius absorb 加宽最近桶不建新；否则 createGainBucket（1543–1556，LRU 淘汰最旧 updatedAt，永不淘汰新/active 桶）。
- **P2-3**：先算两阶段观测，双 null→删 scratch 桶、返回 no-observation，不动既有桶 center/radius。
- center=median(samples≤6)；radius=clamp(2.6×MAD,.08,.20)（gainBucketRadius 1523，<3 样本回默认 .12）。
- **观测 gainStageObservation（1623–1666）**：s2：stage2CommandOrigin==="manual" 拒；controlOutputQuality(run,"stage2")（9249）available && tailMeanGS>0；tailRippleCVPct>25 拒；r=tailMeanGS/stage2EffectiveCommand∈[.2,3]；饱和（evidence.liveTrimChain.usable===false）→local=true,alphaOverride .55；damped=ripple≥12；**P1-3 路由键=base 命令 cfg.stage2CommandMlS**（拿不到退 effective），commandBand=commandBandOf(routeCommand)。stage2EffectiveCommand（1573–1590）分母=泵实际跟随 targetFlowMlS 中位数（L-10/L-11）；cutoff=stage2PlateauStartMs（1597：平滑杯流 95% 峰＋1.5s，下限 s2LearningWindow（2691）startMs；refill 未 confirmed 一律 null R-5）；有效行≥6、tail≥4 点。s3：manual 拒；evidence.source.length===3 且无 stallQualitative；r=mid.measured/mid.command；drift=late/mid∈(0,3]。
- **EWMA gainBackfillAlpha（1429–1457）**：基 .35；trace 逐帧（s2 frame1/s3 frame≥2）rescue>0→.5、normal>0→.12；P2-5 dev∈(0,.15]→max(α,.35×dev/.15) 线性提速；dev>.15→max(α,.55)；damped×.5；饱和 alphaOverride .55 最后覆盖。dev>.15 或 local→lastLocalR。r←r+α(obs−r) round4，n++，drift 同 α。
- **band 行（cut8/L-7＋P1-4，1746–1766）**：每命令带独立 r；既有行 bandAlpha=α||.35 EWMA、n++、steadyN（legacy null→2）非 local 观测＋1、provisional=steadyN<2；新行 {r:obs,n:1,steadyN:steady?1:0,provisional:true}。**provisional 行永不驱动建议基值**。
- **gainConfidence（1419–1428）**：reduced（短窗 fallback）封顶 MEDIUM（n≥2）；n≥3 && dev≤.15→HIGH；n≥2→MEDIUM；else LOW。
- **gainMemoryQualityGuard（1667–1693）**：usable≥4、coverage≥.60、压力≥limit×.95 占比<.35、flow<command×.70 占比<.40（machineAgeMs≤1000），供建议侧 actuator guard 豁免。

## 3. ①A 平台律——读侧 gainMemorySuggestion（1775–1847）＋成熟度门
- 桶来源：run.gainMemoryBucketId 优先→签名选桶；无签名→s1OutflowHint（1462–1472：S1 首次≥0.5g/s 时刻≥6.3s 或 S1 时长≥8s→high 候选 LOW）选最高 center 桶，否则 lastBucketId。
- 阶段行缺失→借样本最多他桶（n 降序、center 距次序 1799–1803），标 fallback:"cross-bucket",stale（L-4）。
- **A② baseBand 路由（2.2.51，1818–1820）**：baseBand=commandBandOf(cfg.stage2CommandMlS)（仅 s2）；effectiveBand 降诊断量；band=baseBand||stateRow.commandBand||commandBandOf(stateRow.commandMlS)。断杯 10→11 trim 自强化环。
- **P1-4 门（1821–1824）**：bandRow provisional===true→弃用回 overall r。
- local（1827–1829）：lastLocalR 有效 && lastDeviation>.15→r=当杯 localR，confidence 强制 LOW。
- r=local?localR:(bandR||stateRow.r)∈[.2,3]；ceiling=min(8,lut×2)；command=snap16(clamp(target/r,.10,ceiling))。crossBand 旗标（1837）。
- 输出：r/smoothedR/band/effectiveBand/bandR/bandN/bandMatched/bandProvisional/baseBand/confidence/local/deviationPct/commandMlS/drift/crossBand/bucketId/activeBucketId/sourceRunId/s1Hint/hintApplied/applied:false。
- **成熟度门 platformMemoryGain（3521–3526）**：immature=!gm.local && gm.bandMatched && (bandN<3||bandProvisional)→回退 gm.smoothedR（overall 桶 r），否则 gm.r；local 不受压。三消费：boundedRefillControlBase（3590）、liveTrimControlCenter blend prior（9656）＋gain-memory 分支（9663）。建议侧 r/bandN/bandMatched 报告不改（P0-2）。
- 建议侧配套门（nextShotAdaptiveSuggestion）：P0-2（5184–5199、5243–5249）tailHit=|oq.tailErrorPct|≤policy.deadband && !regimeChange→hit-anchor 扣 pull；bandImmature=!regimeChange && bandMatched && bandN<3→immature-band HOLD；regimeChange=local||(!manualOrigin && baseBand≠commandBand)。manual 锚（5278–5282，2.2.50）stage2CommandOrigin==="manual"→HOLD role="manual-anchor"（记忆/标量只建议不覆盖）。

## 4. ④D1 清锚 fallback adaptiveEstimateFallback（3555–3571）
输入=下一杯建议 s2 节点（gainMemory/gainFeedForward）。优先级①gm.confidence==="HIGH"→r=platformMemoryGain(gm)（immature 回退 overall）→snap(clamp(target/r))，source="gain-memory"；②ff.eligible && k>0 && ff.targetGS>0 && (!mixedBand||spread≤.05)→snap(clamp(ff.targetGS/k))，source="feed-forward-k"；③都无→null（调用方回 {mode:auto,origin:original,command:null} LUT 安全默认）。命中→{mode:manual,origin:adaptive,command,estimateSource}。仅 stage2。APK 不复用 test-command-set 编辑器，hec「无合格立即建议」fallback 同构移植。

## 5. ④D2 FF k 入平台/trim 中心
- **stageGainEstimate（4919–4938）**：rows=state.adaptiveHistory 尾 8（numeric fingerprint/basket 过滤）＋当杯 evidence；k_i=measured/command（s3 按秒加权）；≥2 行；k=median；spread=RMSE(k)/k；mixedBand=commandBandOf(cmd) 集合 size>1。
- **ffKQualified（3533–3538）**：samples≥3→spread≤.12；samples===2→spread≤.05；mixedBand 收紧≤.05。
- **s2FfPlatformCandidate（3539–3547）**：prior=diagnosticLast||diagnosticCurrent；command=snap(clamp(target/k))。
- **boundedRefillControlBase（3572–3612）** 选择序：FF k 第一候选（当杯 local blend 之后）→与成熟 gmCommand 并存套 **P0-1 包线 hi=max(gm×1.25,gm+.35),lo=min(gm×.75,gm−.35)**（防资格抖动跳变）→gain-memory→observed-tail→profile-base→lut。controlSource="feed-forward-k" 入 trustedControl。
- **liveTrimControlCenter（9650–9679）**：当杯 local blend 优先（count≥3、coverage≥required、age≤600ms；weight=min(.75,.15×(count−2))；local.r 夹 prior×[.75,1.25]；r=prior×(1−w)+bounded×w，prior=platformMemoryGain(gm)||local.r）→FF k（同 P0-1 包线，平台与 trim 中心同估计）→gain-memory→lut→profile-base。
- 建议侧 addGain（5128–5169）：span=max(cmd×policy.s2[0],policy.s2[1])（.12/.35）；bounded=snap(clamp(clip(target/k,cmd±span)))；eligible 门 2 杯≤5%/≥3 杯≤12%（建议侧不套混带收紧）；eligible && |bounded−cmd|≥.005→suggestedCommandMlS。

## 6. ④D3 largeGap 增量（shadow 已有 rescueHot/normalTrimQuanta/recoveryTimeEstimate，加 largeGap）
- liveTrimTick rescue（10228–10238）：gapRel=|command−ccRescue.commandMlS|/ccRescue.commandMlS；largeGap=gapRel>.30；t.largeGapS2 每 tick 刷新；**rescueHot=(rescueAngleStreak≥2||largeGap)&&predictedRel>.25&&actualRel≥.12&&cannotReturn**（后三门不动）。
- normalTrimQuanta（9602–9611）第 4 参 largeGap：S2 largeGap→streak≥3?8:6；常规 relErr>.15&&streak≥6→8/streak≥3→6；S3 relErr>.15?4:2；默认 4。
- liveResponseInterval（9640–9648）：rescue 800／S3 2400／**S2 largeGap 1000**／S2 常规 1200。recoveryTimeEstimate（9612–9619）透传 largeGap。
- 杯间 P0-1 pull（5212–5217）＋direct-mapping（5254–5257）包线 wide=|memoryTarget−base|/base>.30→**±50%**（hi=max(base×1.5,base+.35),lo=min(base×.5,base−.35)），否则±25%；绝对量 .35 不动；pull=HIGH?1:.7。check 行 commandGapPct/largeGap（10237）、write 记录（10442）。
- shadow 衔接：updateLive 已有 rescueAngleStreak/bigAngleStreak/recoveryTimeEstimate；需核 ccRescue.commandMlS 等价物（当杯 trim 中心指令）。

## 7. 依赖链与证据历史存储
- 观测前置件：controlOutputQuality（oq tail，受 scaleSampleGate 保护，Wave B 已有 gate＋gatedLearningRegression）、s2LearningWindow、stage2PlateauStartMs、stage2EffectiveCommand、commandBandOf、trace 逐帧 rescue/normal 计数、evidence.liveTrimChain/s3。**这些 oq/窗函数 APK 尚无，须一并移植（本波最大隐含工作量）**。
- 证据历史：state.adaptiveHistory 尾 8 证据行（numeric fingerprint 过滤，restoreAdaptiveHistoryFromPersistentFile 4720–4739 重建）；APK 需证据历史存储（command/measured/runId/basket/numericFp）。shadow per-cup IDB FIFO40 是否含等价字段须核。
- **numeric fingerprint**：含校准身份 APK 本地算不出→回放用插件证据行离线喂；live 门留 C 后半（②）。冲突先问。
- FF k 与 O1 强耦合（冷启动无 diagnosticLast 则 FF k 无 prior）——O1 留 C 后半，本波 FF k prior 回放用插件 diagnosticLast 离线喂。

## 8. 决策级回放对照方法（验证核心）
- 数据：.tools/__live-plugin-history-*.json（fullRecord rawScaleSamples＋trace＋evidence＋commands）；参照先例 __cup11-platform-replay2.cjs（v02251 §3）/__d16-o1-replay.cjs（v02254 §2）。
- 同一真机数据喂插件 verify harness 与 APK 估计器，逐杯比 bucketId/center/radius/r/band/bandN/provisional/confidence/commandMlS/controlSource。
- **事件级节拍对齐（裁⑦）**：两侧各跑原生节拍（APK 样本驱动＋1200ms 静默／插件 250ms tick），对照点=决策点＋写序列＋杯末状态；hotStreak/fresh-check 时间跨度按 ms 归一非 tick 计数；**禁镜像断言**（技能 §22 测试规矩）。
- 干净杯写序列/HIT 不变（用户裁 A 行为级）；噪杯（杯23）微簇门交叉。

## 9. 红线（同 B）
影子 sent 恒 false／硬包线 applyEnvelope 单一实现永不放宽／LUT 不被学习改写／记忆不删改／§0 萃取中不新增插件请求（镜像刷新仅 pre-cup，本波不做 live 刷新）／scaleSampleGate 不 gate 控制回归 trimRegression/归档/soak/whole＋摄入不去重／FC_FACTOR=0／UI 口径 v0.13–v0.23 不回退／stepstrip 别加回／别人 WIP 不碰。

## 10. 落点与工作量
- shadow.js 增估计器纯函数（建议独立 section 或新模块 gainmemory-estimator.js，经 HxShadow 暴露回放钩子）；证据历史 IDB；oq/窗函数移植。control.js 若需 ctx 补字段 additive。
- 工作量：①大（常量/门密集＋oq/窗依赖）；D1/D2 中~大（证据链）；D3 小（shadow 增量）。风险：字段缺口静默 no-observation、oq 窗语义偏差、节拍对齐失真、numeric fingerprint 离线喂口径。
- 验证：六套回归＋既有 shadow 决策回放（r2345/phaseB）＋决策级回放对照表（逐杯）＋构建＋模拟器（提权）。

## 11. 待裁/注记
- ②fingerprint 来源仍待用户裁（C 后半硬依赖）；本波回放离线喂插件证据行规避。
- oq/窗函数移植若与 §22 口径冲突先问；numeric fingerprint 离线喂口径若与插件 verify 不一致先问。
- push/发版/真机装机/模式切换另问。

## 12. 产物索引
- Wave 1 方案 HANDOFF_2026-11-21-hec-sync-debt-wave1.md；Wave A HANDOFF_2026-11-21-hec-sync-debt-waveA.md；Wave B HANDOFF_2026-11-21-hec-sync-debt-waveB.md（commit 17e2890）。
- 本份＝Wave C 前半移植规格（接力）。后继读 Wave 1/A/B＋本份＋派单＋技能 §22.3/§22.10/§22.18＋plugin.js 锚点续做。

