# 交接：HEC UI9 第一批修复——杯末弹窗打分恢复＋倒计时等待态平滑（2026-11-19，本地未发版）

> lineage：HANDOFF_2026-11-19-hec-v025-release.md（v0.25 口径全集／验证通道／别碰照旧）→ 本份。
> 轮名：hec-ui9-score-countdown-fix。UI9（01a1f1cd-d4c7-7241-a1ea-b96ddcd48a3c）用户直管（AGENTS §1.13：UI 批不回叫统筹）。
> 触发：用户真机（平板 v0.25＋插件 2.2.52）报「倒计时到 1 后还抽搐好几秒才弹窗；完整档仍 5 项缺失不打分」。

## 0. 一句话现状

子模块 main HEAD = 本批提交；**修复只在本地与模拟器**（versionCode 仍 25），未装平板、未发版、未推送、父仓指针未动（一律先问）。回归 __summary-regress **50/50**＋__boot-check **8/8**。

## 1. 根因（与弹窗评估 MD 一致，磁盘现状核实）

- **打分恒 null**：插件 controlReview.phases 是**数组**（{phase,status,output,writes:**数字**,directionReversals,actionGroups,learningStatus}），summary.js collect 按阶段名当对象索引 → 全阶段 q=null → total=null → 「不评分 · 5 指标缺」。review 无 runId 字段，匹配键是 **summary.runId**。
- **抽搐＋超窗**：等待态旧实现每 200ms 把 cdEnd 拨到 now+400 → 环 dashoffset 在 4–8% 来回抖（视觉抽搐）；且 collect 在 diagnostics 之后**串行**再等一次 calibration-status（原生桥无超时、杯末插件忙时排队）→ 数据到得晚于 5s 窗 → 停 1 等待好几秒。
- **回看锁死**：坏 persisted（total=null）优先于 portModel → 兜底被遮蔽。
- 回归 GOOD_DIAG 与错误假设同形（镜像断言，违 §3.13）→ 46/46 绿但真机恒 null。

## 2. 本轮改动（app/www/summary.js＋index.html，assets 同步）

- collect：phases 数组按 phase find；writes 改 **writeStats({liveFlowTrim: body.liveFlowTrim}, ph)**（trace 分类，port 同口径，公式 v2 只数常规+救急；不再给数字赋属性）；validationStatus 只读 body[ph]；补 **startedAt**（头部日期）。
- collect 关键路径：**open() 提前到 diagnostics 解析毕**；calibration-status 改异步补进同一 m（弹窗前到随渲染、后到重渲染；fetchSeq 守卫；3s 刷新照旧）。autoApply 胶囊不再挡弹窗。
- 倒计时：初始数字 3→**5**（旧 3s 残留）；等待态改**圈停满（offset 0）＋数字 1 加 .wait 平滑脉冲**（sumwait 1.1s opacity 1↔.4；prefers-reduced-motion 关），去掉 cdEnd 抖动。语义不变：5s 宽裕窗、慢于窗停 1 等到即弹、新杯/关开关取消。
- 回看兜底（review＋openOffline 两处）：persisted 仅当 **total≠null 或 fault** 才用，否则 fall through portModel→compact（中止杯 fault 态保留）。
- 公式 v2／权重／TDS 门控／三档渲染／简单档 v7 **零改动**。
- 父仓 .tools（gitignore，不入库）：__summary-regress GOOD_DIAG 换真形状（phases 数组＋writes 数字＋trace fixture）；mismatch 改 summary 级 runId；**真数据交叉 3 断言**（__diag-live.json 真响应 → online／控制 85／S2 91·S3 80，与评估修正值一致）；**等待态脉冲 1 断言**（桩延迟 600ms 确定性覆盖）；degraded 断言改轮询（重试耗尽随请求延迟漂移）；__m6m8-stub 加 /__setdiagDelay 开关。

## 3. 验证回执

- __summary-regress **50/50**（46 基线＋真交叉 3＋等待态 1）；__boot-check **8/8**。模拟器 hxpad（emulator-5554）装本批 APK。
- 实拍（review/hec-ui5/，gitignore）：sum-full-scored.png（完整档真数据 85／91／80＋日期＋已自动应用胶囊）、sum-wait.png（圈满＋1 脉冲）、sum-modal.png、sum-simple-v7.png、sum-count.png。
- 真机预期：新杯在线打分恢复；若插件 finalize 慢于 5s，等待态是平滑呼吸不再抽搐；旧杯回看 null persisted 落 compact（直写杯无 commands/分类 trace，port 门守住；老杯全量分数仍待三期 compact 持久化或插件导出合并）。

## 4. 本轮坑（项目特有；通用坑引技能 android-tablet-apk-dev）

- **apply_patch 多 hunk（≥3）在本仓会报最后一个 hunk 找不到**（内容明明一致）：拆 ≤2 hunk/次即过。
- 回归「degraded opens」别用固定 sleep：6 次重试耗尽时刻＝6×(延迟+请求开销)+5s，随 adb reverse 开销漂移；轮询 VIS 最稳。
- 真 /diagnostics 顶层是 {summary, run}；collect 取 summary；**run.liveFlowTrim.trace 与 summary.liveFlowTrim.trace 同份**（writeStats 用 summary 那份即可）。
- 桩延迟开关用完复位 0，别留给下一套。

## 5. 待办 / 别碰

- **装平板／发版（升 versionCode 26）／推送／父仓指针：先问用户**。用户真机复测完整＋简单两档。
- 评估 MD 顺带 minor 未做（另批）：增益带行 cal.gainMemory 真机恒空（改读 archive.gainMemory）；fix3 archiveRun 补 commands 快照（可选，直写杯「等待合并」态）。
- 别碰照 v0.25 §4：影子/仲裁发送、温度链路、HX 液重、插件仓在途批、他人未跟踪文件；v0.13–v0.25 UI 口径不回退。

