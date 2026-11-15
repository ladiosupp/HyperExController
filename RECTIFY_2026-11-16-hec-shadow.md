# APK 整改单：影子记录整改（2026-11-16，统筹对话下发）

> 执行者：APK 整改新对话。仓库：D:/vscode/HyperExController（HEAD 1993fa2，v0.9 未发版）。
> **用户已授权本轮代码改动**（2026-11-16 原话「你写单子开新对话做 apk 整改」）；授权只对本单这一批有效。
> **发版 / 推送 / 装机发布仍须另行问用户**（AGENTS 20）。
> 先读：DECISION_ARBITER_MODELS.md、HANDOFF_2026-11-15-decision-arbiter-record-gap.md、
> docs/HEC_PROTOCOL_FOR_APK.md（已按插件 2.2.48 实测更正的版本）、decentplugin 技能 §22。

## 0. 已定口径（用户 2026-11-16 拍板，不许偏离）

- **full 档攒标签**：影子标签采集在插件 full 档跑（插件照常控杯、照常写 A010）。
  「算法候选 = 插件实际写入」只有 full 档才成立；模型并联提议、仲裁记录取舍，零风险。
- **hec 档验链路**：hec 只用于协议 §8 联调（握手 / 心跳 / 接管演练），其影子杯**不作为训练标签**。
- **影子只记录不发送**：sent 恒 false，闭环发送维持阶段 D，本单不做。
- 安全包线（仲裁第 1 层）与插件侧一概不动；本单只改 APK 仓。

## 1. 背景：统筹核查发现的三个问题（比记录缺口稿更深一层）

1. **特征缺口**：control.js:324 给 shadow 的钩子固定传 predictedGS:null、rescue:false。
   训练集 3315 个样本里 3237 个（97.6%）带真实 predictedGS、25 个 rescue=true。
   真机影子 13 维里第 3 维（预测误差）永远退化成当前误差、第 13 维永远 0——
   恰好是大幅写入最重要的两个信号，事后离线补不回来。
2. **hec 下算法候选为空 + 台账把帧切换当写入**：hec 未接管时插件 observe-only 一笔不写
   （plugin.js liveTrimTick 在 intervention==="hec" 直接 return），lastCommandMlS 只随逻辑帧切换跳变。
   平板 2 杯的「4 次插件写入」即 S1→S2→S3(2/3/4) 的 4 次帧跳，不是真实写入；
   仲裁的算法候选全程 null/跳变，标签语义与离线回放（full 杯真实写入）对不上。
3. **记录缺口 A/C**（记录缺口稿）：决策点没有「实际生效指令配对」与「写后响应窗」。
   原料（samples + writes）在导出里，离线可重建，但应导出自带列，且配对必须区分帧切换。

## 2. 整改项（四项 + 一项记录，一轮构建）

### R1 特征补齐（control.js 钩子 + shadow.js 决策点）

- predictedGS：在影子决策点按**插件预测同口径**计算——机器流量阶跃拟合
  （死区 0.35s + 爬升 0.85s + 一阶 τ≈0.4s，技能 §22.4）；
  插件锚点：plugin.js:9134 row.predictedGS=decisionGS 的计算链（liveTrimTick 内）。
  移植该链到 APK（只读计算，不写任何东西）；拿不到时置 null 走缺省并记 predictedAvailable:false。
- rescue：按 §22.4 三判据 + 2.2.31 实际误差门移植：
  趋势角 ≥120° 连续 ≥2、外推剩余时间回不到带内、预测误差 >25% 且实际误差 ≥12%
  （锚点 plugin.js:9198 rescueHot）。趋势角已有 lastCheck.ang 可复用；
  remainingS 用 (目标重量 − 累计)/当前杯流。判定只供特征与记录，不触发任何写入。
- 验收：同一份归档杯离线重放，APK 算的 predictedGS / rescue 与 decisions.jsonl 对应字段
  逐点比对，predictedGS 偏差 ≤0.05 g/s 的点 ≥95%，rescue 布尔一致率 ≥95%（写明实测数）。

### R2 写入台账帧标记（shadow.js cup.writes）

- writes 行加 frame 字段（变化时刻的 ext.logicalFrame）；
  帧号变化引起的 lastCommandMlS 跳变记 kind:'frame-change'，同帧变化记 kind:'write'。
- 仲裁「算法候选」只消费 kind:'write' 的行；frame-change 一律不当候选。
- full 档下插件真实写入（同帧）照常进候选，语义与离线回放一致。

### R3 实际生效指令回记（思路 1，shadow.js 决策点）

- 决策点后跟踪同帧下一次**真实写入**（R2 的 kind:'write'），回记
  realizedCommandMlS / realizedAtMs / realizedFrame / matched。
- matched 定义：arbiter.pick=model 且 realizedCommandMlS === arbiter.commandMlS（同帧、量化后相等）。
  帧切换不算 realized；等到杯结束仍无同帧写入记 realized:null。
- matched=true 的子集 = 「插件恰好写了模型候选」的无偏响应标签，学习仲裁优先用它。

### R4 写后响应窗（思路 2，shadow.js 决策点）

- 决策点后 0.75–2.75s（插件 controlRunReview 同窗，秤时间戳口径）做 RAW 回归，
  回记 responseGS / responseR2 / responseWindow；窗内样本不足或杯尾截断记 responseIncomplete:true。
- 回归口径与 shadow.js weightRegression 现有实现一致（去重、跳变 ≤0.6s、R²≥0.90、slope>0）。
- 注意：影子杯只有一条真实轨迹，响应属于**实际执行的指令**（full 档即插件写入）；
  模型候选的反事实响应仍靠植物估（S3 不可靠的保留照旧），不得把响应直接标给未执行的候选。

### R5 杯级档位与修复标记（shadow.js cup 元数据）

- cup 加 modeAtStart（开杯时 ext.mode）与 fixLevel:'r1-r5'；
  exportJSON 顶层加 rectify:'2026-11-16'。
- 离线并档规则（写进导出说明即可，不用改离线管线）：
  训练标签只取 modeAtStart=full 且 fixLevel 齐全的杯；hec 杯与平板现存 2 杯
  （1794727769993-1 / 1794731835503-2，pre-fix）只作链路证据，不进训练。

## 3. 边界（别碰）

- 不改发送逻辑：external-flow 通道保持「就绪不自动发」；sent 恒 false。
- 不动仲裁三层结构、安全包线、软预算数值；不动 UI 七卡布局与回放页。
- 不碰插件仓（decenthyperexplugin）与技能文件；协议文档已是更正版，不要再改。
- 别人的未提交文件不碰不代提交；本批提交只 add：
  app/www/{control,shadow}.js、app/src/main/assets/www/ 对应两份、
  本单与两份交接 MD（DECISION_ARBITER_MODELS.md、HANDOFF_2026-11-15-decision-arbiter-record-gap.md，
  目前未跟踪，随本批入库）、版本号文件（若 bump）。
- 两份 MD 里与事实不符处可顺手更正（如「切 hec 攒标签」改为 full 口径），改动最小化。

## 4. 验收与交付

1. 离线：R1 一致性比对报告（数字写进交接）；用归档 full 杯构造桩数据跑 shadow+arbiter，
   验证 R2 帧标记、R3 matched、R4 响应窗各分支（含帧切换、杯尾截断、算法 hold）。
2. 真机（用户配合，装机先问）：full 档出 1–2 杯 → 导出 JSON 自查：
   writes 无 frame-change 混入候选、predictedGS 非全 null、rescue 有真实判定、
   matched 子集与响应列齐全；hec 档按协议 §8 清单验链路（接管演练照旧）。
3. 版本号 bump（v0.10 或沿仓库惯例），本地提交；**装机 / 发版 / 推送先问用户**。
4. 交接文档写回本仓（RECTIFY 回执或新 HANDOFF），交统筹对话复核。

## 5. 统筹复核点（交回时我查这些）

- predictedGS / rescue 与插件口径的逐点比对数字。
- full 杯导出里算法候选非空、frame-change 零混入。
- matched 子集响应窗完整率；hec 杯被正确排除在训练标签外。
- 提交只含本批文件；影子仍零发送。
