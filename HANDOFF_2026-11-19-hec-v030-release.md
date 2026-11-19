# 发版回执：v0.30（杯末弹窗键盘/仅按钮关/研磨落记录/右侧建议版式）（2026-11-19）

> lineage：HANDOFF_2026-11-19-hec-ui10-keypad-close-grind.md（UI10 批 1 改动与验证）→ 本份（发版链回执）。用户当轮授权「按发版链都走一遍吧」。UI 批用户直管，不回叫统筹。

## 1. 发版资产

- GitHub Release **451147860** / tag **v0.30** / asset **767125100**（HyperExController_v0.30.apk，**6,737,721 字节**，state uploaded；uploads 直连 201 一次过，未用代理回退）。
- APK SHA256 **729D5070B31A1377D3F8AED2643B1A0DA87AB0F34E1F7E6A0F43EECFAE1F8C44**。
- 夸克「/来自：Codex」fileId **b06e1d723844407fb7b73c10e61aba3d**（6,737,721 字节，非秒传；session 1795081763-jc9ehw）。

## 2. 装机与验证

- 平板 dumpsys versionCode **30** / lastUpdateTime 2026-11-19 17:48:06；模拟器 versionCode 30。
- 平板冒烟：iw=1138 / ver v0.30 / mode control / conn ok / lvl 0 / on true / HX 曲线 / 胶囊 curvetag sum lv0。
- 发版基线（v0.30 装机后复跑）：__summary-regress **69/69**＋__boot-check **8/8**；同代码此前连带 __targetline2 14/14＋__flowcard 6/6＋__m10 20/20＋__style-split 6/6。
- 平板只读核对（__ui10-tablet-look.cjs，不写盘）：回看弹窗开／TDS 键盘开（带小数点）／键盘外取消弹窗仍在／✕ 关／颗粒度恢复原值。实拍 review/hec-ui5/tablet-keypad.png、tablet-review.png。

## 3. git

- 子模块 main 推 3b4eff2..**c0f279e**（携带：b1d846e 接力入口／88466a5 UI10 回填／8266994+8dc27a1+bfc6410 统筹活文档批／e3fbc91 UI10 改动／c0f279e 升版）；tag v0.30 已推（ls-remote 核）。
- 发版前核区间：e3fbc91..HEAD 对 app/www、assets、build.gradle 零差（统筹插提交只动 HEC_COORDINATOR_STATE.md）。
- 回执提交后 main 再推；父仓指针同步（见父仓 log）。

## 4. 口径与待办

- 本批覆盖旧口径见 UI10 批 1 §3（键盘语义／仅按钮关／右侧两子元素），下一任别回退。
- 标准/完整档 TDS/粉量仍原生 input（用户只点名简单档拨号）。
- 待办/别碰照接力入口与 UI10 批 1：加热进度胶囊作废；影子/仲裁/温度/插件仓不碰；统筹活文档 UI 不写。
