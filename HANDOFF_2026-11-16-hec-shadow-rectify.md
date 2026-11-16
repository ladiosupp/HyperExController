# 整改回执：HEC 影子记录 R1–R5（2026-11-16，APK 整改对话 → 统筹复核）

> 任务来源：RECTIFY_2026-11-16-hec-shadow.md（本批唯一）。仓库 D:/vscode/HyperExController。
> 基线 HEAD 1993fa2（v0.9 未发版）→ 本批 bump v0.10（versionCode 10 / versionName "0.10"）。
> 用户已授权本轮代码改动；**发版 / 推送 / 装机仍须另行问用户**（AGENTS 20），本批未做。
> 全程只改 APK 仓；插件仓与技能文件未动；协议文档（已更正版）未动。

## 0. 已定口径执行情况（用户 2026-11-16 拍板）

- full 档攒标签：影子杯记 modeAtStart（开杯时 ext.mode）；并档规则写进导出说明（训练只取 modeAtStart=full 且 fixLevel 齐全）。✓
- hec 档验链路：hec 杯 modeAtStart=hec，并档排除训练。✓
- 影子只记录不发送：sent 恒 false（桩数据 27 项断言含「sent 恒 false」全过）；external-flow 通道未碰。✓
- 安全包线 / 仲裁三层 / 软预算数值 / UI 七卡 / 回放页：未动。✓

## 1. R1 特征补齐（predictedGS / rescue）—— 离线逐点比对达标

移植锚点 plugin.js:9134（predictedGS=decisionGS 计算链）与 :9198（rescueHot）。
**两处按事实修正整改单表述**（已核对插件源码）：

1. 整改单写「机器流量阶跃拟合（死区 0.35 + 爬升 0.85 + τ0.4）」是技能 §22.4 对**机器时延的物理描述**；
   插件 predictedGS 的实际计算链是 liveTrimRegression 的**尾段/头段加速度外推**：
   S2 1.6s 窗 / 尾 0.75 头 0.65 / 前瞻 1.5s；S3 3s 窗 / robust 回归 / 尾 1.2 头 1.2 / 前瞻 1.2s；
   predicted = fastSlope + clamp(acceleration×horizon, ±0.6×target)，decisionGS = predicted ?? slope。
   按整改单指定的锚点（plugin.js:9134）移植，未用阶跃拟合公式。
2. 整改单写「趋势角已有 lastCheck.ang 可复用」——**不可复用**：救急连击判据用的是插件**内部角**
   （liveTrimTick 主判据，atan(|slope|) 不除目标），而特征第 4 维 / lastCheck.ang 是**记录角**
   （finally 块，atan(|slope|/max(.3,target)) 除目标）。两者公式不同，120° 阈值在记录角下几乎永不触发。
   故救急角在 shadow 内按内部角口径自算（lv.trendAngleDeg），特征第 4 维仍用 ctx.trendAngleDeg（记录角，与 bc-features 同序）。

救急四判据（§22.4 + 2.2.31 实际误差门）：内部角≥120° 连续≥2、predictedRel>25%、actualRel≥12%、
recoveryTimeEstimate.fastestS > remainingS。remainingS=(阶段目标重量−累计)/max(.1,decisionGS)。
r 优先当杯局部增益估计（updateLiveGain 同口径：静默一个回归窗 + R²≥.98 + 快慢斜率一致 + 压力留余量 + 机器流量贴指令），
缺省回落 RESCUE_R（S2 1.2 / S3 1.8，插件无增益记忆时的缺省）。跨杯增益记忆是插件内部状态，APK 拿不到，未移植。
救急锁存（rescueMode）+ 平静退出（predictedRel<.06 或角<90 连续 2）+ rescueActive=predictedRel≥.08，与插件一致。
判定只供特征与记录，不触发任何写入。

### 比对方法（.tools/__rectify-r1-replay.cjs，不入库）

- 归档：hyperex-history-all.json 里 2.2.41/43/45 且带全点 rawScaleSamples 的 21 杯。
- predictedGS：在插件 trace 每个 fresh check/write 的 **tick 时刻**，用 APK 移植的 _trimReg 按插件同口径重算
  （接收时刻窗 + 秤时间戳回归 + S2 onset 裁剪 + **profileFrame===frame 过滤**，S3 子帧 2/3/4 各自独立窗），与 row.predictedGS 逐点比对。
- rescue：顺序驱动 APK _updateLive 状态机（与真机 onSample 同路径，样本驱动），trace 点取 rescueActive 与 row.rescue 比对。
- 累计重用插件 updateCumulativeWeight 同口径（基线 + 去皮进位），逻辑帧按物理帧分布推断（release 存在与否）。

### 实测数字（验收线：predictedGS ≤0.05 g/s 的点 ≥95%；rescue 布尔一致 ≥95%）

| 项 | 比对点数 | 达标 | 一致率 | 中位差 | p95 差 | 最大差 |
|---|---|---|---|---|---|---|
| predictedGS | 2125 | 2099 | **98.78%** | 0.00025 g/s | 0.0005 g/s | 2.24 g/s |
| rescue | 2181 | 2167 | **99.36%** | — | — | — |

- rescue：插件 25 个 rescue=true 点，APK 检出 25 个（bothTrue 18，另 7 个为锁存态在相邻点的时序差）；无漏检真实救急。
- predictedGS 中位差 0.00025、p95 0.0005 → **公式逐字同口径**。剩余 26 个超差点集中在 S2 补水边界与 S3 子帧切换瞬间：
  插件按定时器 tick（~250ms）评估、APK 影子按 §22.4 设计口径「只在拿到新秤样本时决策」，评估瞬间相差几十 ms，
  接收时刻窗滑过的样本略不同 → 属架构内禀时序差，非公式偏差。最大差 2.24 出现在一杯 S2 补水 onset 附近（单点）。
- 关键移植修正：回归窗必须按 **profileFrame===frame** 过滤（S3 子帧独立窗），否则子帧切换处混帧，predictedGS 一致率掉到 ~94.8%。

## 2. R2 写入台账帧标记 —— 桩数据验证通过

- writes 行加 frame（变化时刻 ext.logicalFrame）与 kind：帧号变化引起的跳变记 frame-change，同帧变化记 write。
- 仲裁算法候选只消费 kind:'write'（cup.lastPluginWriteCmd 仅在 write 时置位）；frame-change 一律不当候选。
- 桩验证：帧切换 1→2 记 frame-change（frame=2）、同帧 4.0→4.25 记 write；S3 首决策算法候选 null（frame-change 未混入）。✓

## 3. R3 实际生效指令回记 —— 桩数据验证通过

- 决策点后跟踪同帧下一次真实写入（kind:'write'），回记 realizedCommandMlS / realizedAtMs / realizedFrame / matched。
- matched = arbiter.pick==='model' 且 realizedCommandMlS===arbiter.commandMlS（同帧、量化后相等）。
- 帧切换不算 realized；杯结束仍无同帧写入记 realized:null（finalizeCup）。
- 桩验证：模型候选 4.25 被仲裁选中 → 插件同帧写 4.25 → matched=true、realized=4.25/frame=1；杯尾无写入 → realized:null/matched:false。✓

## 4. R4 写后响应窗 —— 桩数据验证通过

- 决策点后 0.75–2.75s（插件 controlRunReview 同窗，**秤时间戳口径**）RAW 回归，回记 responseGS / responseR2 / responseWindow。
- 回归复用 weightRegression（去重、跳变≤0.6s、R²≥0.90、slope>0）；窗内样本不足或杯尾截断记 responseIncomplete:true。
- 响应属于实际执行的指令；模型候选反事实响应不在此记录（仍靠植物估，S3 保留照旧）。
- 桩验证：线性流 5 g/s → responseGS≈5、responseR2≥0.90、responseWindow=[0.75,2.75]；杯立即结束 → responseIncomplete:true/responseGS:null。✓

## 5. R5 杯级档位与修复标记 —— 桩数据验证通过

- cup 加 modeAtStart（开杯时 ext.mode）与 fixLevel:'r1-r5'；exportJSON 顶层 rectify:'2026-11-16'、schema:2。
- 并档规则（写进导出说明）：训练标签只取 modeAtStart=full 且 fixLevel 齐全的杯；hec 杯与平板 pre-fix 旧杯
  （1794727769993-1 / 1794731835503-2，无 fixLevel）只作链路证据，不进训练。
- 桩验证：full 杯 modeAtStart=full、hec 杯 modeAtStart=hec、fixLevel=r1-r5、rectify 标记、并档排除 hec。✓
- 内部运行态（live 状态机 / pendingRealized / pendingResponse / _decStamp）不进存储与导出（cleanCup 剥离），避免决策点重复序列化。✓

## 6. control.js 钩子改动

- 影子钩子补传 mode / pending / stage2WeightG / finalWeightG；移除写死的 predictedGS:null / rescue:false（改由 shadow 内状态机自算）。
- 新增 loadStageWeights()：连接时拉 calibration-status 的 curveEditor.stageWeights（**external-status 不带阶段目标重量**，
  救急 remainingS 需要；这是只读 GET，不改插件）。阶段目标重量是插件设置（Stage2Weight/FinalWeight），非 workflow target_weight。
- appVer 缺省 0.9→0.10。

## 7. 边界遵守

- 发送逻辑未碰：external-flow 通道保持「就绪不自动发」，sent 恒 false。✓
- 仲裁三层 / 安全包线 / 软预算数值未动；UI 七卡 / 回放页未动。✓
- 插件仓 / 技能文件 / 协议文档未动。✓
- 别人的未提交文件未碰；本批提交只 add 清单内文件（见 §8）。✓

## 8. 本批提交文件清单

- app/www/control.js、app/www/shadow.js（+ assets 对应两份 app/src/main/assets/www/{control,shadow}.js）
- app/build.gradle（versionCode 10 / versionName "0.10"）
- DECISION_ARBITER_MODELS.md（更正阶段 A「切 hec 攒标签」→ full 口径；随本批入库）
- HANDOFF_2026-11-15-decision-arbiter-record-gap.md（无需更正，随本批入库）
- RECTIFY_2026-11-16-hec-shadow.md（整改单，随本批入库）
- HANDOFF_2026-11-16-hec-shadow-rectify.md（本回执）
- arbiter.js 未改（assets 与 www 哈希一致，无需同步）。

## 9. 真机验证待办（需用户配合，装机先问）

离线已达标，真机尚未跑（本批未装机）。按整改单 §4.2：
1. full 档出 1–2 杯 → 导出 JSON 自查：writes 无 frame-change 混入候选、predictedGS 非全 null、rescue 有真实判定、
   matched 子集与响应列齐全。
2. hec 档按协议 §8 清单验链路（接管演练照旧）。
**装机 / 发版 / 推送先问用户**（AGENTS 20）。

## 10. 统筹复核点对照（整改单 §5）

- predictedGS / rescue 逐点比对数字：见 §1（98.78% / 99.36%，均 ≥95%）。✓
- full 杯导出算法候选非空、frame-change 零混入：桩验证 §2/§3（真机待 §9）。✓（离线）
- matched 子集响应窗完整率：桩验证 §3/§4（真机待 §9）。✓（离线）
- hec 杯正确排除训练标签：§5 并档规则 + 桩验证。✓
- 提交只含本批文件；影子仍零发送：§8 清单 + sent 恒 false 断言。✓

## 11. 复跑索引（离线产物在 .tools/，不入库）

- R1 比对：node .tools/__rectify-r1-replay.cjs → __rectify-r1-report.json / __rectify-r1-pairs.json
- R2–R5 桩验证：node .tools/__rectify-r2345-test.cjs → __rectify-r2345-report.json（27 PASS / 0 FAIL）
- 依赖：D:/vscode/.tools/hx-train/pipeline/{plugin-metrics,reconstruct}.js、hx-data/hyperex-history-all.json（只读）


---

## 12. 真机自查（2026-11-16 08:13 取证，统筹放行 §4.2 第一步；只读，未改代码未发送未装机）

### 取证通道

adb mDNS `adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp`（tablet.json 里的 192.168.31.15:46113 已失效，mDNS 名直连可用）→
pidof com.ladios.hxcontroller=17309 → forward tcp:9224 → CDP 同步求值 `HxShadow.exportJSON()`（异步 promise 先 kick 后读，避开坑 8）。
取证前置按技能坑 11：平板当时锁屏+通知栏遮罩（mCurrentFocus=NotificationShade），BACK+上滑无效，`wm dismiss-keyguard` 解锁后 am start 拉前台恢复。
全文导出落地 `.tools/__rectify-tablet-shadow-export.json`（199,752 字符，不入库），核对脚本 `.tools/__rectify-tablet-check.cjs`。

### 平板现场（v0.10，插件 2.2.48，链路正常）

- appVer=0.10，HxShadow loadState=ready（bc_v0 ONNX 就绪），conn=ok，心跳 ok=true / ageMs=0 / client=HyperExController 0.10。
- ext.mode=**full**，phase=idle。导出 kind=HecShadowLog **schema=2 rectify=2026-11-16** ✓（R5 导出标记真机生效）。

### 导出 4 杯逐条核对（实测数字）

| runId | modeAtStart | fixLevel | samples | decisions | writes（write/frame-change/legacy） | 判定 |
|---|---|---|---|---|---|---|
| 1794727769993-1 | (absent) | (absent) | 683 | 34 | 0/0/4 | pre-fix 旧杯 → 排除训练 ✓ |
| 1794731835503-2 | (absent) | (absent) | 699 | 35 | 0/0/4 | pre-fix 旧杯 → 排除训练 ✓ |
| live-1794782815357 | (absent) | (absent) | 270 | 0 | 0/0/3 | v0.9 时期残杯 → 排除训练 ✓ |
| live-1794786975824 | **full** | **r1-r5** | 374 | **0** | **0/3/0** | v0.10 新杯，但无有效相位（见下） |

- **并档规则真机验证 ✓**：训练候选=modeAtStart=full 且 fixLevel=r1-r5，只有 live-1794786975824 一杯入选；
  两杯 pre-fix（1794727769993-1 / 1794731835503-2）与 v0.9 残杯全部排除。旧杯 34/35 个决策 predictedGS 全 null、rescue 全 false（写死缺省时代的记录），正是本单要修的对象，不进训练。
- **R2 帧标记真机已生效**：v0.10 新杯 3 条 writes 全部 kind=frame-change（frame 0→1→2，指令 0.5625→3.3125→3.8125→0.5625 的帧基值跳变），
  write=0、算法候选零混入 ✓。旧杯 writes 无 kind/frame 字段（legacy），与 pre-fix 判定一致。
- **零发送 ✓**：4 杯全部决策 sent=true 计 0。
- **R1/R3/R4 真机数值尚未取证**：唯一 v0.10 杯 374 个样本**相位全程 idle**（ext.phase 未跟上，runId 也是 live- 兜底而非插件 runId），
  影子决策门（phase∈{stage2,stage3}）正确地一个决策都没出——这不是缺陷，是这杯没被识别为萃取中。
  该杯 writes 能记到帧跳变说明 ext 有值但 phase 停在 idle，疑似出杯时控制页未连接/刚启动（hello 晚于萃取），插件 runId/phase 未同步进 ext。
  另一杯 live-1794782815357（v0.9）同样全 idle，同模式。
- **结论：平板暂无「full 档 + 相位正常」的新杯。需要在控制页已连接（心跳 ok）的状态下、full 档出 1–2 杯再导出**，
  才能对 predictedGS 非全 null、rescue 真实判定、matched 子集、responseGS/responseWindow、杯尾 responseIncomplete 取到真机数字。
  离线验收（§1：98.78%/99.36%）与桩验证（27/27）不受影响。

### 待用户配合（先问再做）

1. **full 档出杯**：确认控制页「已连接」胶囊亮着（当前已满足），正常出 1–2 杯 HyperEx；出完我再拉导出核对 R1/R3/R4 数字。
2. **hec 档 §8 链路清单**（切 hec → hello → 心跳 ok；不 hello 出杯 → hec-no-handshake；停轮询 4s → hec-heartbeat-lost+基值收回）：
   需要切档与多次出杯，与用户另行约时间。


---

## 13. 收口：用户暂缓真机自查（2026-11-16）

用户 2026-11-16 表态「没空测真机」，§12 的两项真机待办**暂缓**，不阻塞本单交付。

- **本单（R1–R5）验收以离线为准，已闭环**：R1 逐点比对 98.78% / 99.36%（§1）、R2–R5 桩验证 27/27（§2–§5）、本地提交 583cc66（v0.10）、交接回执（本文）。
- **真机已确认**（§12 只读取证，不依赖出杯）：R5 导出标记 + 并档排除、R2 帧标记零混入、零发送。
- **仍未取证（留待用户有空）**：R1/R3/R4 真机数值（predictedGS 非全 null、rescue 真实判定、matched 子集、responseGS/responseWindow、杯尾 responseIncomplete）+ hec 档 §8 链路清单。需 full 档正常出 1–2 杯（控制页已连接）+ hec 切档演练。
- **残余风险（如实说明）**：APK 真机决策路径尚未在「相位正常的 full 杯」上跑通（唯一 v0.10 杯相位全 idle，§12）。离线公式同口径 + 桩逻辑全过 + 控制页钩子与 v0.9 同构（v0.9 两杯曾正常出 34/35 决策），风险低，但**真机端到端未验证**不掩盖。
- **补充观察**：全 idle 的 live- 杯在 v0.9（live-1794782815357）与 v0.10（live-1794786975824）各一杯，模式相同 → **非 v0.10 回归**；更像该杯未被插件序列接管（非 HyperEx 曲线 / 未 arm）或出杯时控制页未连接，影子决策门正确地不出决策。待真机确认。
- **下一步（阶段 B 学习仲裁）**：可用现有归档 21 杯 full 离线重建标签训练，**无需用户出杯**；但超出本单边界（本单冻结仲裁三层），是否开工由用户 / 统筹定。

