# 交接：HEC UI9 第二批修复——冷 boot 读盘竞态（颗粒度/总开关/lastRunId 落默认值）（2026-11-19，本地未发版）

> lineage：HANDOFF_2026-11-19-hec-v026-release.md（v0.26 已发版装平板）→ 本份。UI9 用户直管（AGENTS §1.13，不回叫统筹）。
> 触发：用户平板选「简单」后弹窗仍标准布局。活状态取证：IndexedDB 存值 hecShotSummaryLevel=0（number），但 HxSummary._state().level=1。

## 0. 一句话现状

子模块 main HEAD = 本批提交；**修复只在本地与模拟器**（versionCode 仍 26），平板 v0.26 不含本修复；装平板/发版（v0.27）/推送/父仓指针先问。回归 __summary-regress **53/53**＋__boot-check **8/8**。

## 1. 根因

- app.js dbGet/dbSet/dbCup* 在 Promise executor 里**同步** `db.transaction(...)`；db 仅在 openDb 的 onsuccess 赋值；openDb 唯一调用点在 boot 函数 `await openDb()`（app.js:1263）。
- summary.js init 在脚本加载（index.html:610）即 dbGet 三连 → 彼时 db=null → executor 抛 TypeError → reject；**init 无 .catch** → level/enabled/lastRunId 落默认（1/true/null）。**每次冷 boot 必现**，非偶发。
- learn.js 的 dbGet 有 .catch → 滑杆显默认；用户当次拨滑杆 live 生效（setLevel），但重启即丢。存盘值一直在（取证 0），只是 boot 读不到。
- 回归盲区：以往启动后拨滑杆改档（live 路径），无冷 boot 读回断言。

## 2. 改动（app/www/app.js，assets 同步；调用方零改动）

- openDb 记忆化：`let dbReady`＋`if (dbReady) return dbReady`；boot 的 await openDb() 拿同一 promise，不双开。
- dbGet/dbSet/dbCupPut/dbCupAll/dbCupKeys/dbCupDel/dbCupGet 七个助手改 `return openDb().then(() => new Promise(...原事务体...))`——init 期首调自动等开库；所有调用方（summary/learn/control/shadow 归档读）同受益。
- 回归＋3 冷 boot 断言：dbSet level0/master0/lastRunId → 自重启 → _state 读回 0/false/原 id；收尾复位 1/true。

## 3. 验证

- __summary-regress **53/53**（50 基线＋冷 boot 3）；__boot-check **8/8**（db 助手改动后复跑）。
- 平板取证脚本（.tools，gitignore）：__ui9-tablet-look.cjs（截图＋_state＋DOM）、__ui9-tablet-store.cjs（IndexedDB 存值探针，dbGet .then 挂 window 再同步读，避 awaitPromise 挂死坑）。

## 4. 坑 / 待办 / 别碰

- **init 期读盘必须走 db 助手（已等开库）**；今后新增启动读盘别绕助手直碰 db；回归凡涉持久化设置必加冷 boot 读回断言。
- 待拍板：装平板/发版链 v0.27 先问。用户平板存值已是 0——装上本修复后冷 boot 直接恢复简单档，无需重选。
- 别碰照 v0.26 §4；v0.13–v0.26 口径不回退。

