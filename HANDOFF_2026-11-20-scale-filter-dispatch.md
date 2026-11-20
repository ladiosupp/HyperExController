# 派单交接：秤样本摄入门滤波改码批（scaleSampleGate，2.2.57 候选）

> 统筹派 01a1f67b（插件实施）。**用户 11-20 批方向「过滤一个可以用的参数写进去」→改码本批授权；发版/push/tag/装机另问**。统筹复核＋发版 SOP。取证 relay-3 只读提案（角色红线不改插件码），本交接自包含。基线＝插件 2.2.56 HEAD（代码 eb43a9f，branch auto-hyperex）。

## 0. 一句话任务

在喂给瞬时估计（oq tail 滚动回归／Vb3 instantCross／学习 observedR）的秤流摄入处加单一门 scaleSampleGate={minGapMs:60, monotonic:true}，压回秤缓冲 flush 噪点（100Hz 微簇/dt=0 碰撞/负增量），保留真实 10Hz 信号；whole-phase 回归/控制律/硬包线/targets/归档零改。

## 1. 改哪侧

**插件 plugin.js 秤样本/瞬时估计层**（APK 做不到——秤遥测摄入与瞬时估计在插件内）。取证只读不改插件码。

## 2. 背景与证据（杯 23 秤噪点异常杯）

- 杯 23（1795163773778-3，v0.35 装机重启后首杯）秤遥测污染：周期 ~2.8s 报告 burst（S2/S3 同节律、间隔 2.75–2.84s 极规整＝硬件报告非通道）＋100Hz 微簇（超秤 10Hz＝缓冲 flush）＋dt=0 碰撞 46（杯21/22=2/4）＋微簇 30（3/6）＋全杯唯一负增量 2 处（41.34/41.43s −2.7g 精确回轨迹＝真秤噪点）。
- 后果：oq tail +18.53% burst 推高；Vb3 instant-cross 首次活体触发疑噪点误触；学习 observedR 1.635 dev+23.7% MEDIUM→base 3.625→3.0（噪点驱动）。
- 去尖峰（用户口径尖峰全当噪点，只读）物理干净达标：S2 平台 5.02（+0.5%）/S3 1.49 平直/observedR≈1.39 dev+5% 本应 HOLD。图 D:/vscode/.impeccable/review/hec-live/cup23-deglitch.png。
- 复跑索引（HEC .tools）：__relay-cup23-verify.cjs / __relay-cup23-deglitch.cjs / __relay-cup23-peakgate.cjs。

## 3. 最小滤波参数设计（取证提案，统筹审过）

scaleSampleGate={minGapMs:60, monotonic:true}，作用于喂 oq tail/Vb3 instantCross/学习 observedR 的原始秤流摄入：

1. **minGapMs:60**：与上一已接受样本间隔 <60ms 的丢弃——把 100Hz 缓冲 flush/dt=0 碰撞压回 ≤16Hz，保留秤真实 10Hz（100ms 间隔）信号。
2. **monotonic:true**：萃取期负增量拒收——去 41.3s 负跳（物理萃取杯重单调增，负增量必为噪点；杯21/22 负增量=0，正常杯零影响）。

只护瞬时估计；whole-phase 回归（rawRegressionGS HIT 判定）/控制律/硬包线/targets 零改。

## 4. 红线（务必）

- **归档 rawScaleSamples 保持原始不改**：取证/标定需原始噪点证据；gate 只作用于喂瞬时估计的摄入副本，不改归档/导出/历史 JSON。
- **soakWettingObservation（2.2.56 soak 压力观测）不受影响**：gate 作用于秤流/重量瞬时估计 stream，soak 压力样本流另路；改后杯21/22/23 soakRatio 复算须不变（0.5435/0.5747/0.6763）。
- **正常杯零误触/逐字不变**：决策级回放杯21/22 及历史干净杯 oq/Vb3/observedR/写序列不变（gate 对 10Hz 正常样本无作用）。
- whole-phase 回归/控制律/硬包线 0.10–8.00 与 1/16/targets/LUT/gain memory 结构/sent 恒 false/单一写者零改。
- 控制律相邻：**先读技能 §22（§22.4 决策模型/§22.13/§22.18/§22.19）**，冲突先问统筹/用户。
- 别人 WIP 不碰（HANDOFF_2026-10-31.md 等）；APK 仓/取证功能区不碰。

## 5. 验证要求

- verify_v02257：既有基线＋新增 gate 测试（minGap 压缩 100Hz→≤16Hz/dt=0 拒收/负增量拒收/正常 10Hz 保留/soak 签名不变/归档原始不变/正常杯瞬时估计逐字不变）。禁镜像，断言行为。
- sim-regression 5/5。
- 决策级回放：杯23 去 flush 后 oq tail/Vb3/observedR 改善（observedR 趋近 1.39）＋正常杯21/22 逐字不变。
- 真杯验：装机后陪杯（取证），滤噪点不去真实 boost 过冲。
- node --check/manifest 短简介 275（§1.15）/README 置顶。

## 6. 口径裁决（统筹，e 项）

- **闭环验收批用真实峰（不去尖峰）**：杯23 峰门复跑（1.6s 插件口径）原始峰 7.903=+58.1%、去尖峰峰 6.61=+32.2%；批门 26.3%=6.315 g/s、40% 绊线=7.0。**去尖峰 32.2% 仍 > 批门 26.3%（≤40 过但批门不过）→杯23 不计闭环合格杯，批仍 2/5**。滤波去噪点不去真实过冲。
- 去尖峰 wetLat~2.66/rise/b2b 作 **Vi 重拟合标定第 3 样本**（标定素材与闭环验收批分开；现标定素材 3 杯 21/22/23-deglitch，验收批 2/5）。
- 峰门口径不改（默认维持真实峰验收；用户若要把去尖峰重评纳入验收＝改口径须用户另裁）。

## 7. APK 同步债 / 发版

- scaleSampleGate → shadow/arbiter 等价物，full→hec 里程碑（与 D1–D6/O1/Va/Vb3/Vd15/2.2.56 新律债合并）。
- 版本 2.2.57 候选；改码完成回叫统筹复核（verify＋sim＋决策级回放＋diff 审红线）→呈用户发版（发版/push/tag/装机另问）。

## 8. 待用户并行拍板（不阻塞本改码批）

- a 杯23 标记 scale-noise 独立异常类别（仿杯17，标记不删/学习标签不进训练）——取证执行待批。
- b 已 applied base 3.0（噪点驱动）回滚/干预须用户明说（写记忆硬规矩）；统筹倾向荐授权回滚 3.625（去尖峰应 HOLD，3.0 低 17% 有下杯欠流风险）。
- d 影子决策停摆（杯23 仅 3 vs 21/22 各 33）疑 v0.35 预取阻塞——预取已回退 284be06，v0.36 装机后复验，仍停摆再派 APK 排查。
- v0.36 APK 发版链（预取回退＋胶囊修复，已合并 3d25166 回归全绿）待用户批。
