# 发版回执：v0.33（杯末总结→杯末评分 改名批＋READY EN 词条补齐）（2026-11-20）

> lineage：UI11 批 1（HANDOFF_2026-11-20-hec-ui11-rename-score.md）→ 本份。用户授权「EN 词条补上，然后再走发版链」。UI 批用户直管，不回叫统筹。

## 1. 发版资产

- Release **452309833** / tag **v0.33** / asset **770607781**（HyperExController_v0.33.apk，**6,739,181 字节**，uploaded；uploads 直连 201 一次过）。
- SHA256 **7C7831FEBC7ED06EF3DB26521FDFE08AB13701BB5EB4B136B3CFD6E108245C56**。
- 夸克「/来自：Codex」fileId **52ee608af2cc41f68dc385b32324d33c**（非秒传；session 1795152989-sg5iu2）。

## 2. 装机与验证

- 平板 versionCode **33** @2026-11-20 13:31:18；模拟器 33。
- 平板冒烟 4/4：iw=1138／ver v0.33／开关「杯末评分弹窗」／胶囊「本杯评分」（真机可见）；实拍 review/hec-ui5/tablet-v33.png。
- __summary-regress **72/72**＋__boot-check **8/8**（模拟器 v0.33）。
- 改名取证 7/7（批 1，中英逐处）；实拍 review/hec-ui5/rename-*.png。

## 3. git

- 子模块 main 推至 **568655a**（升版）→ 回执提交再推；tag v0.33 已推；ls-remote 核 main/tag 均 568655a708a1。
- 提交链：2ab6136（UI10 交接）→ 3fb6928（接力回填）→ 7d2f33f（改名批 1）→ 27181e0（EN 词条补齐）→ 568655a（升版）→ 本回执。区间核净：代码 diff 只含预期 7 文件，无插提交。
- 父仓指针同步（见父仓 log）。

## 4. 口径 / 待办

- 承 v0.32 全部不变量（relay §1）；本批只追加文案口径（批 1 §1：用户可见统一「评分」，EN Shot score／Shot score popup）。
- UI10 EN 遗留已补齐（27181e0），工作区无本批未提交代码。
- 待办/别碰照 relay 与批 1；加热进度胶囊作废；标准/完整档 TDS/粉量仍原生 input。
