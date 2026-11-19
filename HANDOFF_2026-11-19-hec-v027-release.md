# 交接：HEC v0.27 已发版装平板（冷 boot 读盘竞态修复＋顶栏去 runId/时刻）→ UI 接力对话起点（2026-11-19）

> lineage：HANDOFF_2026-11-19-hec-v026-release.md → HANDOFF_2026-11-19-hec-ui9-boot-persist-fix.md（冷 boot 根因/修复细节）→ 本份（v0.27 回执）。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。
> **UI 批用户直管 UI9（AGENTS §1.13）：不回叫统筹。本份即 UI 接力起点。**

## 0. 一句话现状

子模块 main HEAD = 本交接提交（v0.27 回执 5e12140 之后），tag v0.27 已发：Release id 450895706（asset 766278183，6,736,585 字节，SHA256 35E63C44E72256A7010C3B54771738B61C796A41D7DBAFFF8E808D49DF1B19FE），夸克「/来自：Codex」fileId 5058469d1e744901b7af662a8dde3f91；平板与模拟器均 v0.27 最终包（平板 dumpsys versionCode 27 / lastUpdateTime 2026-11-19 12:53:51；冒烟 iw=1138 / 冷 boot 颗粒度恢复存值 0 / HX 曲线 / conn ok）。父仓指针已推。

## 1. v0.27 口径增量（别回退）

- **冷 boot 读盘竞态修复**：openDb 记忆化（dbReady）＋dbGet/dbSet/dbCupPut/dbCupAll/dbCupKeys/dbCupDel/dbCupGet 七助手 `openDb().then(...)` 等开库再执行事务；调用方零改动。修前每次冷启动颗粒度/总开关/lastRunId 落默认（1/true/null）——用户选简单重启后仍标准的根因。
- **顶栏全档仅标题＋✕**：标准/完整档 render 顶栏的 rid（…runId 尾 6）/at（月-日 时:分）span 删除（v0.25 锁稿口径补齐到全档）；孤儿 rid/when 变量同删；.rid/.at CSS 留（惰性）。来源行 srcSec 的 runId 尾 6 保留（完整档来源区，非顶栏）。
- 承 v0.26 全集：打分恢复（phases 数组＋writes trace 分类＋startedAt）、倒计时 5s 宽裕窗＋等待态圈满平滑脉冲、calibration-status 异步补、回看 null 分兜底；v0.13–v0.26 不回退。

## 2. 验证（可复跑）

- __summary-regress **54/54**（46 基线＋真数据交叉 3＋等待态脉冲 1＋冷 boot 持久化 3＋顶栏仅标题✕ 1）；__boot-check **8/8**。最终包装机后复跑同绿。
- 包体：6,736,585 字节，SHA256 35E63C44E72256A7010C3B54771738B61C796A41D7DBAFFF8E808D49DF1B19FE（本地 HyperExController_v0.27.apk 与 Release asset 766278183 同大小，state=uploaded）。
- 冷 boot 断言口径：dbSet level0/master0/lastRunId → 自重启 → _state 读回；收尾复位。顶栏断言：full 档 `!#sumModal .rid && !.at`。
- 实拍 review/hec-ui5/：tablet-v27.png、sum-full-scored/sum-wait/sum-modal/sum-simple-v7/sum-count.png（gitignore）。

## 3. 坑（项目特有增量；通用坑引技能）

- **init 期读盘必须走 db 助手**（已等开库）；新增启动读盘别绕助手直碰 db；持久化设置回归必加冷 boot 读回断言（live 拨滑杆测不出竞态）。
- 平板冒烟 ver 字段偶发 undefined：装机首启 DOM 未渲染时 innerText 为空；版别以 dumpsys versionCode 为准、顶栏文本另探针核（__ui9-tablet-hdr.cjs）。
- 发版链中途并入新修复：tag 未推前 `git tag -f v0.27 HEAD` 重指最终代码提交；APK 改名副本必须重拷（旧副本是中途包）。
- apply_patch ≤2 hunk/次；内联 node -e 转义脆写脚本文件；父仓 .git 沙箱只读需提权（子模块不受影响）。

## 4. 待办 / 别碰

- 用户真机复测：简单档大数字视图（冷 boot 已恢复存值 0）＋完整档打分＋顶栏无小字。
- 评估 MD 顺带 minor 未做（另批）：增益带行 cal.gainMemory 真机恒空（改读 archive.gainMemory）；fix3 archiveRun 补 commands 快照（可选）。
- 功能设置其余等用户定义；二期回放回看／三期插件提案另批；profileFrame 非 HX 色带仍待真杯。
- 别碰照 v0.26 §4；装平板/发版/推送/父仓指针一律先问（本轮用户已批全链）。

## 5. 验证通道 / 6. 协作

照 v0.26 §5/§6：adb/gradle 路径、assets 同步再构建、CDP 9224/9223、桩 4801（/__setdiagDelay）、发版 REST 模板 .tools/__release27.ps1、夸克 CLI（session 复用、目录 fid 经 search --search-type dir）；统筹 01a1ef1c-40c3-7490-bcc4-b7043ebc1800（UI 不回叫）；**接力对话 ID：01a1f1cd-d4c7-7241-a1ea-b96ddcd48a3c（UI9）**。

