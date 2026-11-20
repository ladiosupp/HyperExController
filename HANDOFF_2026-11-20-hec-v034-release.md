# 发版回执：v0.34（两段取＋READY 1.0s＋readypop 泄漏修）（2026-11-20）

> lineage：UI11 批 2 两段取（988a028）＋READY 1.0s（1738d3c）＋readypop 泄漏（e92c9f3）→ 升版 1dc12c3 → 本份。用户授权「走 v0.34 发版链」。UI 批用户直管，不回叫统筹。

## 1. 发版资产

- Release **452414802** / tag **v0.34** / asset **770983013**（HyperExController_v0.34.apk，**6,741,713 字节**，uploaded；uploads 直连 201 一次过）。
- SHA256 **9B61FA677C47D0F6742D63D8BE942199149FD1E1A229438E9305511F3EF9668A**。
- 夸克「/来自：Codex」fileId **0a6c38e88a374a8f9ccabafd30b42603**（非秒传；session 1795152989-sg5iu2 复用）。

## 2. 装机与验证

- 平板 versionCode **34** @2026-11-20 15:50:26；模拟器 34。
- 平板冒烟 4/4：iw=1138／ver v0.34／开关「杯末评分弹窗」／胶囊「本杯评分」；实拍 review/hec-ui5/tablet-v34.png。
- __summary-regress **72/72**＋__boot-check **8/8**。
- 两段取验证（批 2）：真形状交叉 8/8（S2 100／S3 82／总 90 手算全中）；HEC 期间 READY 全隐逐帧 5/5。
- 断言稳健化（本轮）：wait-state／READY／校准杯末改轮询或单循环同采落定——硬 deadline 把离线弹窗提前到 8.5s，固定 sleep 被 adb/CDP 开销推出窗致假红（失败点跨轮漂移＝环境抖动，非 app bug）；稳健化后 72 全绿。

## 3. git

- 子模块 main 推至 **1dc12c3**（升版）→ 回执提交再推；tag v0.34 已推；ls-remote 核 main/tag 均 1dc12c39fa5b。
- 携带统筹活文档插提交（9189979/e658740/f16c56a/cbe5cd9/ad9c7d4/5e8a152，均只 add HEC_COORDINATOR_STATE.md）；代码区间 d8d10b9..1dc12c3 核净（只含预期 7 文件）。
- 父仓指针同步（见父仓 log）。

## 4. 口径 / 待办

- 承 v0.33 全部不变量；本批新口径见批 2 交接 §2（两段取／READY 1.0s／readypop 入场触发）。
- 待办/别碰照 relay 与批 1/2；加热进度胶囊作废；标准/完整档 TDS/粉量仍原生 input。
- incoming：用户下一条 UI 指令。
