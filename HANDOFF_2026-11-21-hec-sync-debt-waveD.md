# HEC APK 同步债 Wave D 改码回执（soak＋Va/Vb3＋viBuckets，shadow 模式；2026-11-21）

> 统筹 relay-10（01a1fd38-9fe3-7131-a24c-7983d70cf7f3）派；用户 11-21 批「改码本批授权」，发版/装机/模式切换另问。基线 HEC main **06785f5**（Wave C 后半 d442ad3 已入）；插件只读参照 **b2101ee / 2.2.61**（Wave D 三项锚点与 2.2.56/2.2.55/2.2.59 代码逐字一致）。本批只改 APK 仓，插件仓零改，UI 零改；**APK 二进制仍 v0.38（build.gradle 未动）**，只本地 commit（push/发版/真机装机/模式切换另问）。

## 0. 落点与产物

- 代码：`app/www/shadow.js`＋`app/src/main/assets/www/shadow.js`（两份各 **＋417/−4**，1862→**2276 行**）。`control.js`／`arbiter.js`／`index.html` **零改**。
- SHA256：shadow **FB5C223FA79EDAC647A10CE6A9AF096B89B63DAFAD3BAE98FCB6F2ED9E2A90B3**（www＝assets＝APK 内 entry 三方一致）；control 未动 **B2DC5E8F771B6BA306B4AEC62DF36DD0A9CC803E463F996F00F4D01A1884CB95**。
- APK：**6,834,487 字节 SHA256 0EFD05D0E7E1CB84CCF5EE4898DF5A4437A50BBA0DEF8B196FF2696A0FBFF084**（versionCode 38 / versionName 0.38，未升版）。模拟器 emulator-5554 `install -r` Success，dumpsys versionCode=38；**平板未动**。
- 专项/回放脚本在 `.tools`（不入库）：`__waved-replay.cjs`＋`__waved-replay-report.json`、`__waved-specialty.cjs`、`__set-addr-4801.cjs`、`__waved-smoke.cjs`。

## 1. 改动（三项，全部 shadow 只算与记录）

### ⑦ soak 观测＋自适应灌水律纯函数（`estSoakWettingObservation` 1426 / `estRefillAdaptiveFloodDecision` 1580）
- 插件 `soakWettingObservation` 3302 六拒收门逐字：no-samples／<10 样本／头 5 压力<3 有限／p0≤0.05bar／无距首≥2s 样本／p2 非有限；输出 `soakP0Bar/soakP2sBar/soakP2sRatio/soakTauES/soakSeconds`。
- 律逐字：`fRise=4.8/0.8=6.0`；`fc=0×platform`；`viLaw=clamp(34.057−32.251×ratio,15,36)`，无信号兜底 24.8；`F_budget=fc+vi/max(0.3,holdCfg/1000+0.274−0.8)`；`flood=snap16(clamp(max(F_rise,F_budget),3.5,8))`；冷启动 `max(5,headroom+1/16)`；`holdMs` 只在可行时缩、不可行时抬，`round100` clamp[2000,7000]，`budgetInfeasible` 旗标与 reason 逐字。
- `estRefillFloodFloor()`=3.5（绝对下限）。常量全部与插件同名同值（RISE_TARGET .8／RR_QUANTILE 4.8／CUTOFF_LEAD .274／FC_FACTOR 0／VI_A 34.057／VI_B −32.251／FALLBACK 24.8／FLOOD_MIN 3.5／FLOOD_COLD 5／HOLD 2000–7000 默认 4000）。
- **只记录**：`cup.estimator.soak`＋`cup.estimator.refillPlan`（flood/holdMs/holdAdjusted/binding/viMl/viLawMl/viUsedSource/viLearning/budgetInfeasible/observation…），不产生任何机器指令、不走 external-flow。

### ⑥ Va/Vb3 估计器（`estS2RefillFlowEstimate` 1653 / `estS2RefillWouldReturn` 1712）
- Va 逐字：窗 stage2/frame1/杯龄≤1300ms/尾 0.75s/6 点/span≥0.6/stale 600/r2≥.90/slope>0/**slope-zero 门**；accel＝estHistory 最近 4 相邻差分中位、夹 ±target；`predicted=slope+accel×1.5`；`predictedCapped=min(predicted,1.6×target)` 仅显示。输入改为显式 `st={nowCupMs,frameStartCupMs,predictionSeconds,estHistory,lastEstimate,lastEstimateGate}`（时间基＝杯内到达 tMs，不用秤 stamp）。
- Vb3 逐字：boosting 期 `scaleSampleGate` 末 3 样本连续 2 个瞬时 dw/dt≥target×1.1→早 cutoff，`basis='instantaneous-cross'`；predicted/backstop 尾段同口径（threshold=target×cutoffFraction，observed 噪声地板 threshold×.6，backstop 0.85×target）。
- **shadow 只镜像 would-be 判定**（`predicted/backstop/wouldCutoff`），不发指令；压力/holdMs/秤 stale/blindFlood 门属执行状态机 Wave E，本批不计入。
- `estRefillShadowTrace` 1757：有插件 trace `startupAction=boost/bleed` 时按 250ms 原生节拍回放记录 `va`＋`vb3`；**live 缺 startupAction 时如实 `{available:false,reason:'no-boost-trace'}`，不猜、不补假数据**。

### ⑩ viBuckets 学习（`estViConfidence` 1449 / `estViBandFor` 1457 / `estViMemorySuggestion` 1465 / `estViObservation` 1482 / `estUpdateViMemoryFromRun` 1534）
- 独立 ratio 带（B 键，与 r 的 g 桶分离）：`[0.2,0.4)/[0.4,0.6)/[0.6,0.8]`，末带含 0.8；存储 [12,40]、消费 [15,40]、ALPHA_UP .5/DOWN .15、DEV .55/.3、WETLAT[.8,8]s、NEG_MAX 2、DT0_MAX 5、CLUSTER_MAX 100、BRIDGE_GAP 2s、CLUSTER<60ms 间隔。normalize/IDB 复用 Wave B 已有实现（含 fpKey/floodMode/LRU3）。
- 杯末七门逐字：basket coffee／learningAllowed（调用方给，见 §3 降级）／soak 六门＋支撑域／onset 检出＋桥接 >2s 拒／neg≤2＋dt0≤5＋微簇<60ms≤100／Vi_obs[12,40]＋wetLat[.8,8]／censored（onset 晚于 bleed）α 减半收录。
- 非对称 EWMA＋dev>15% α 提速＋damped/censored 减半＋cap 100；fpKey 变更 reseed n=1；置信 HIGH n≥3 dev≤15%／MEDIUM n≥2（censored 封顶 MEDIUM）／LOW n=1。
- 消费：HIGH 全量／MEDIUM 0.5 半混／LOW 律；`vi_used=max(viLaw,blended)` 夹[15,40]＋`floored` 旗标＋`-floored` source；完整指纹门（row.fpKey===镜像 fpKey）不符→LOW→律。
- 杯末钩子接在 `runCupEstimator`（1901 起）：先以**杯首镜像记忆**算 `soak/refillPlan/viSuggestion`，再杯末学习并 `saveGainMemory`；加法字段进 `cup.estimator`（`soak/refillPlan/vi{observation,suggestion,update}/va/vb3/refillTrace`），随 persist/导出。

## 2. 验证回执（全部本机实跑）

- **决策级回放 `__waved-replay.cjs`：严格 0 mismatch**。25 杯全点真机语料（history-2..24 runId 去重）；
  - P1 连续记忆 25 杯（Vi 逐杯学习并消费）＋P2 真实导出种子 23 杯（export N−1 gainMemory）；
  - 逐杯比 soak 6 字段/拒收原因、flood/holdMs/holdAdjusted/binding/viMl/viLaw/viUsedSource/viLearning、viSuggestion、viObservation 15 字段、viUpdate 18 字段、Vi 快照；**Va 362 tick**（每 tick slope/stamp/r2/accel/predicted/capped＋gate 名）、**Vb3 19 次触发**（fire tick/basis/cutoff 12 字段）逐字一致。
  - **记录值保真（报告项，非等价门）**：2.2.59 杯 adaptiveFlood **4/4 全字段一致**；2.2.56/2.2.58 杯 0/5——原因是 **2.2.59 VI_A 由 40.929 重拟合为 34.057**（技能 §22.19 b 约束拟合），旧导出的 plan 属旧律时代，不是移植差。
- **移植专项 `__waved-specialty.cjs` 67/67**：soak 六门/ratio/tau；律 4 态（ratio 0.2→viLaw 27.61/flood 7.9375；ratio 0.8→15/6/hold 3600；冷启动 5/24.8/hold 6300；hold 2000→2800）；地板函数 3.5＋律输出恒在[3.5,8]；vi 带/置信/censored 封顶；EWMA 上行 .55、下行 .3、damped/censored 减半、指纹 reseed n=1；HIGH/MEDIUM/LOW/地板/floored 四态；viObservation 14 门（basket/learning/soak/extrapolated/no-boost/bridge/onset/wetlat/vi-band/neg/dt0/cluster/censored/正常）；Va 八门＋accel 正负 clamp＋predictedCapped；Vb3 instant/predicted/backstop；shadow 无 boost trace 降级＋`cup.estimator` additive＋无发送字段。
- **六套回归 169 全绿**（提权、模拟器独占）：summary **72/72**＋boot **8/8**＋分支 curvetag **8/8**＋TDS 矩阵 **33/33**＋TDS UI **31/31**＋WS 假死 **17/17**（专用 hec-stub 4810＋reverse 4810＋`__set-addr-4810` 前置）。
- **既有回放/专项不回退**：`__rectify-r2345-test` **27/27**、`__phaseB-integration-test` **15/15**（逐字不变）、`__waveb-specialty` **33/33**、`__wavec-specialty` **128/128**、`__wavec-replay` **REPLAY STRICT PASS**。
- `node --check` 两份过；www/assets 哈希一致；APK entry 三方一致；模拟器 install -r 成功。运行时冒烟：`HxBridge.appVersion()=0.38`，`HxShadow._est` 新钩子齐、`HxShadow.status().estimatorError=null`。

## 3. 降级项（如实，均已标注 `cup.estimator.degraded`）

1. **Va/Vb3/Vi_obs 依赖 boost trace**：shadow 台账只有 write/frame-change，`startupAction` 恒 null → live 无法识别 boosting/boost.tMs。本批如实 `refillTrace.available=false, reason='no-boost-trace'`、`va=null/vb3=null`、`vi.observation.reason='no-boost-write'`，**不猜、不用假数据凑**。回放/专项用插件 verify harness 真 trace 验精确性；Wave E 自执行打标后 live 自动解锁。
2. **holdMs 设置 APK 不可得**：ext-status/hello 未暴露 `maxDurationMs`，live 的 `refillPlan` 用默认 4000（`degraded.holdCfg=true`）；回放按真机 plan settings 喂。若统筹要把 live plan 当准值，需插件加性暴露 holdMs（另批）。
3. **learningRunAllowed 为 APK 等价物**：插件 `result/profileTruthVerified/learningIntegrity` 仍不可得，沿用 Wave C O1 已裁等价物（`evidenceRow＋onCupEnd completed＋basket coffee`）传入 `viObservation`；七门其余逐字。Wave E/插件加字段后可收紧。
4. **soak 律的真实性仍待真机**：结构已验（Wave A），本批回放证明移植精确；stub 恒压验不了 ratio 形状，真机 soak 衰减正确性随陪杯。
5. **budgetInfeasible / flood 下限结构不可达**（与插件一致，非移植差）：`needed` 在 Vi[15,40]、flood≤8 时最大约 5.3s，永远 ≤7000ms，故 `budgetInfeasible` 恒 false；signaled 时 `F_rise=6.0` 恒 ≥ `F_budget`（vi≤36 时 fBudget≤10.36 但会被 flood clamp 到 8，needed 仍<7），所以 flood 实际落在 [6,8]，3.5 只是 clamp 下限、冷启动落 5。旗标/下限保留，供未来系数变化。
6. **W1 记录值差异**：仅 2.2.56/2.2.58 旧 era 的 adaptiveFlood，见 §2 报告项。

## 4. APK 同步点（插件 → HEC）

| 插件锚点（2.2.61） | APK shadow |
|---|---|
| `soakWettingObservation` 3302 | `estSoakWettingObservation` 1426 |
| `refillFloodFloor` 3309 | `estRefillFloodFloor` 1422 |
| `refillAdaptiveFloodDecision` 3336 | `estRefillAdaptiveFloodDecision` 1580 |
| `viConfidence` 1849 / `viBandFor` 1858 / `viMemorySuggestion` 1868 / `viObservation` 1889 / `updateViMemoryFromRun` 1946 | 1449/1457/1465/1482/1534 |
| `s2RefillFlowEstimate` 3794 | `estS2RefillFlowEstimate` 1653 |
| `s2RefillReturnReason` Vb3 3878–3897＋predicted/backstop 尾段 | `estS2RefillWouldReturn` 1712 |
| `rememberAdaptiveEvidence` 4836 杯末钩子 | `runCupEstimator` 1901（Vi 学习接续） |

Wave E 待办：执行状态机（armed/boosting/bleeding/returning/complete）＋external-flow 发送＋409/takeover＋压力/holdMs/stale/blindFlood 门＋Vd15 旁路；本批均未做。

## 5. 复跑索引

- `node .tools/__waved-replay.cjs`（严格 0 → exit 0；report `.tools/__waved-replay-report.json`）
- `node .tools/__waved-specialty.cjs`（67/67，exit 0）
- 既有：`__rectify-r2345-test`（27）/`__phaseB-integration-test`（15）/`__waveb-specialty`（33）/`__wavec-specialty`（128）/`__wavec-replay`（strict pass）
- 六套：父仓 `.tools/__summary-regress.cjs`、`__boot-check.cjs`、`__tds-joint-matrix.cjs`、`__tds-joint-ui.cjs`；子模块 `.tools/__coord-curvetag-test.cjs`、`.tools/__ws-watchdog-test.cjs 4810`（前置 `hec-stub.cjs 4810`＋`adb reverse tcp:4810`＋`__set-addr-4810.cjs`）。
- 构建：`JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9`、`GRADLE_USER_HOME=D:/android-dev/gradle-home`、`gradle.bat assembleDebug`（提权）；entry 哈希用 `System.IO.Compression.ZipFile` 读 `assets/www/{shadow,control}.js`。
- 收尾已做：baseUrl 设回 4801（读回 ack=1）；删本批 reverse 4810（4801 共享 reverse 保留）；停本批 4810 桩（pid 31820）；stayon false；模拟器留运行；**4801 存量桩（pid 44280）未 kill**。

## 6. 本轮坑

- 回放若把整杯 rawScaleSamples 喂给插件 `s2RefillFlowEstimate`，插件自身不检查 `x.tMs>now`（运行时样本尚未产生），会“看见未来样本”。本批两侧都喂**截断到 t 的 run 视图**，APK 侧另加 `at>nowCupMs` 过滤（live 语义正确），确保同一输入、同一口径。
- `Number(null)=0`：soak 头压力/p2 的 `Number.isFinite(Number(null))` 为真，与插件一致地落到 `p0/p2=0`（分别触发 pressure-low/pressure-window 之外的分支）；专项用 `'x'` 构造 NaN 才命中 head/window 门。
- viBuckets 快照比较要按 band 排序：同杯多带更新时 `updatedAt` 相同，稳定排序保留插入顺序，插件与 APK 的数组顺序可能不同（语义相同）。
- 回放报告里的 `observed` 差异必须先按插件版本分层，否则会把 2.2.59 VI_A 重拟合的历史差异误读成移植差。

## 7. 待拍板（呈统筹）

1. live Va/Vb3/Vi_obs 要脱离“trace 不可得”降级，需要插件在 hello/ext-status 加性暴露**当杯 startupAction 写入序列**（或 Wave E 自执行打标）；本批未改插件。
2. live `refillPlan.holdMs` 若要等于插件实际配置，需插件加性暴露 `maxDurationMs`（或 APK 从 plan 镜像读取）；当前默认 4000 并标 degraded。
3. `learningRunAllowed` 三字段（result/profileTruthVerified/learningIntegrity）是否要插件加性暴露以替换 APK 等价物。
4. push 本批 commit / 发版 / 真机装机 / full→hec 模式切换：均另问。

