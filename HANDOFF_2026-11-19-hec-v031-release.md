# 发版回执：v0.31（简单档去顶栏 B＋提速二轮 3s/200ms）（2026-11-19）

> lineage：notopbar-speedup2（批 3）→ 本份。用户授权「按发版链发 v0.31」。UI 批用户直管，不回叫统筹。

## 1. 发版资产

- Release **451385762** / tag **v0.31** / asset **767806038**（HyperExController_v0.31.apk，**6,737,925 字节**，uploaded；uploads 直连 201 一次过）。
- SHA256 **025AA9FBC922BE05267E4B5C6300CCE38F6F34CB8CC13EFECA3B23E09777A749**。
- 夸克「/来自：Codex」fileId **99cb2e490f274b49860bb9391d7a5431**（非秒传；session 1795081763-jc9ehw 复用）。

## 2. 装机与验证

- 平板 versionCode **31** @2026-11-19 21:25:10；模拟器 31。
- 平板冒烟 iw=1138 / ver v0.31 / conn ok / lvl 0 / 胶囊 lv0。
- __summary-regress **71/71**（late-ready 828ms 含脚本滞后）＋__boot-check **8/8**。
- 坑留档：首跑 boot 2 红＋平板 iw=0＝锁屏/视口压 0（技能既有坑）；双机 svc power stayon true＋WAKEUP＋wm dismiss-keyguard 后复跑全绿；收尾 stayon 恢复 false。

## 3. git

- 子模块 main 推至 **cf85c6f**（升版）→ 回执提交再推；tag v0.31=cf85c6f 远端核过。携带统筹活文档插提交（只动 HEC_COORDINATOR_STATE.md，代码区间核净）。
- 父仓指针同步（见父仓 log）。

## 4. 口径 / 待办

- 承批 3 §3 覆盖清单（简单档无顶栏/仅再来一杯关；3s 首请求＋200ms×16）。
- 待办/别碰照 relay 与批 1–3；加热进度胶囊作废；标准/完整档 TDS/粉量仍原生 input。
