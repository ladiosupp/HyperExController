# 发版回执：v0.32（杯末开场定稿＋真机圈满干等根因修）（2026-11-20）

> lineage：ready-intro-bridge（批 4）→ 本份。用户授权「走发版链」。UI 批用户直管，不回叫统筹。

## 1. 发版资产

- Release **452287607** / tag **v0.32** / asset **770522410**（HyperExController_v0.32.apk，**6,739,177 字节**，uploaded；uploads 直连 201 一次过）。
- SHA256 **3CCAE903826984EB343F6AC9DF1A97845C67B24CA4A41908A566341FD0997987**。
- 夸克「/来自：Codex」fileId **1e9783a2e52143bd9356f44a7737b8f0**（非秒传；session 1795081763-jc9ehw 复用）。

## 2. 装机与验证

- 平板 versionCode **32** @2026-11-20 12:56:15；模拟器 32。
- 平板冒烟 iw=1138 / ver v0.32 / conn ok / lvl 0 / 胶囊 lv0。
- __summary-regress **72/72**（晚就绪 588ms）＋__boot-check **8/8**。
- 坑留档：首跑回归在重启取 CDP 列表瞬时断流（Invalid URL，55 绿后崩）→ __restart-emu.ps1 加列表 6 次重试后复跑全绿；非代码回归。

## 3. git

- 子模块 main 推至 **1331939**（升版）→ 回执提交再推；tag v0.32 已推。携带统筹活文档插提交（代码区间核净）。
- 父仓指针同步（见父仓 log）。

## 4. 口径 / 待办

- 承批 4 §2 开场定稿（棕扩+HEC→同淡出→READY 黑体→黑底 5s）与 §1 桥/deadline 修。
- 待办/别碰照 relay 与批 1–4；加热进度胶囊作废；标准/完整档 TDS/粉量仍原生 input。
