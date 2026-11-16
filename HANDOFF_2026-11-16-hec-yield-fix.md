# 交接：HEC 液重停杯修复（2026-11-16）→ 真机验收通过，已提交，未发版

> 前序：RECTIFY_2026-11-16-hec-shadow.md（v0.10 整改，HEAD 583cc66）、HANDOFF_2026-11-15-hec-v08.md。
> 技能：android-tablet-apk-dev（通用坑唯一维护处）。规矩照 AGENTS.md（7 四件事、20 先问、16 中文、15 正斜杠链接）。

## 0. 一句话现状

用户报：HEC 选拉杆曲线、设液重、点应用，到重不停杯；回 Streamline 看目标液重是 0。
根因已钉死并修复；模拟器回归 10/10 过。
**平板已装新包**（用户 2026-11-16 同意；v0.10 debug，lastUpdateTime 07:43，-r 保数据）。
**真机验收通过**（用户 2026-11-16 原话「液重真机验了没问题了」）。修复已随本交接一起提交；发版仍要先问用户。
装机后实测基线：曲线「John Weiss开发的拉杆程序」，target_weight=25、context.targetYield=25（两字段已一致，
应是用户事后在 Streamline 首页重设过——首页写法两个都发）。验收时建议在 HEC 改一个新液重再应用，
看 Streamline 液重块是否同步、出杯是否到重即停。提交/发版仍要先问用户。

## 1. 根因（Decaid 源码钉死，别再猜）

- **Decaid 停杯读 workflow.context.targetYield，不读 profile.target_weight**：
  ShotSequencer 开杯时 targetYield = context?.targetYield ?? 0（de1_state_manager.dart:782、app.dart:398），
  判定 targetYield > 0 && projectedWeight >= targetYield（shot_sequencer.dart:451）；
  Bengle 固件停杯桥同样只读 context.targetYield（bengle_saw_bridge.dart:40）。
  源码检出：D:/vscode/.tools/.tmp-decaid（2026-10-30，df177b7）。
- HEC 原来只发 {profile:{target_weight}}（应用液重）和 {profile:整份曲线}（切曲线），都不带 context；
  Decaid PUT 是深合并（json_utils.dart deepMergeJson），context 保持原值——平板上它是 0/缺失，所以永不停杯。
- Streamline 首页的写法（对照基准）：液重编辑同发 context.targetYield + profile.target_weight（ui.js updateDoseValue），
  切曲线也随带 context.targetYield（profileManager.js sendProfileRecordToMachine）。
- Streamline 液重块显示优先 context.targetYield（workflow-watch.js），所以用户看到 0。
- 温度链路 HEC 与 Streamline brewTempProfilePatch 同口径，没有问题，未动。

## 2. 本轮改了什么（用户 2026-11-16 确认「动手改吧」）

app/www/control.js（assets 已同步，两份哈希一致）：
1. applyDials 液重分支：PUT {profile:{target_weight:v}, context:{targetYield:v}} 一次两字段。
2. selectCurve：PUT {profile:整份曲线, context:{targetYield:拨轮当前液重}}——**用户拍板带拨轮当前值**，
   不做按曲线记忆（那是新功能，没让做）。
3. loadWorkflow 存 liveContext；syncDialsFromProfile 拨轮优先回读 context.targetYield（>0 才用），
   缺失回退 target_weight（老行为）。
4. HyperEx 曲线「液重由插件控制」锁原样；温度应用仍只发 steps。

.tools（不入库）：hec-stub.cjs 补 context 深合并 + /__puts 台账 + /__ctx 清 context；
__yield-regress.cjs 回归脚本（幂等：先复位 context=36 再断言）。

## 3. 验证（都做过）

- node --check 两份 JS 过；gradle assembleDebug 过（.tools/__yield-build.log）。
- 模拟器装新包 + 4798 桩 + CDP 回归 **10/10**：切拉杆带 context、拨轮回读 context、
  应用液重双字段=36.5、再切曲线 context 跟随拨轮、HyperEx 锁不变、温度只发 steps。
  截图 D:/vscode/.impeccable/review/yield-fix-lever.png。
- context 缺失回退：清桩 context 重连，拨轮回读 target_weight=36 ✓。
- 回归脚本两个坑：断言用数值比较别比字符串（DOM 文本可能是 "36"）；重跑要先复位桩 context（否则拨轮累积）。
- 收尾已做：4798 桩已停、reverse/forward 已删、stayon 已恢复 false。4795/4796/4797 没碰。

## 4. 待办（新对话按顺序，每步先问用户）

1. 发版（升 versionCode/Name、构建、push 走 VPN、Release、夸克）先问用户；v0.10 影子整改也还没发版，可一起。
2. 沿用前序待办：夸克补传 v0.6、影子数据核对等，见 RECTIFY 单与 v0.8 交接。
3. 复跑回归：.tools/__yield-regress.cjs（幂等）；只读取证可经 adb forward GET /workflow 看 context.targetYield。

## 5. 别碰

- 插件仓（decenthyperexplugin）与皮肤：本修复不涉及，两侧写法只是对照基准。
- 温度链路、HyperEx 液重锁、影子/仲裁（v0.10 整改产物）。

