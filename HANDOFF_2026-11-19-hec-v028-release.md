# 交接：HEC v0.28 已发版装平板（本杯总结胶囊底色编码颗粒度三档）→ UI 接力对话起点（2026-11-19）

> lineage：HANDOFF_2026-11-19-hec-v027-release.md → HANDOFF_2026-11-19-hec-ui9-tag-tier-color.md（胶囊批细节）→ 本份（v0.28 回执）。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。
> **UI 批用户直管 UI9（AGENTS §1.13）：不回叫统筹。本份即 UI 接力起点。**

## 0. 一句话现状

子模块 main HEAD = 本交接提交（v0.28 回执 06d73c2 之后），tag v0.28 已发：Release id 450906878（asset 766327414，6,736,549 字节，SHA256 60EAD0F9B609457A08066DED18393F5A8DEEE9FEFAF4C5984F0EE49DC0309DE7），夸克「/来自：Codex」fileId f2870f51c0ec41ebbd0586bff5933706；平板与模拟器均 v0.28（平板 dumpsys versionCode 28 / lastUpdateTime 2026-11-19 13:09:59；冒烟 iw=1138 / ver v0.28 / 冷 boot 颗粒度恢复存值 0 / 胶囊类 curvetag sum lv0 / HX 曲线 / conn ok）。父仓指针已推。

## 1. v0.28 口径增量（别回退）

- **胶囊底色＝颗粒度三档**：曲线选择下「本杯总结」胶囊（#sumReviewTag）lv0 简单＝蓝 #20304d/#9cc0ff／lv1 标准＝琥珀 #3d2c17/#f5c078／lv2 完整＝绿 #173a2a/#8fe0b0（复用 lock/sum/ok 令牌）；文字「本杯总结」与点击回看不变。
- 同步路径：updateTag 设 className；setLevel 末尾＋init 颗粒度 dbGet .then 均叫 updateTag（滑杆 live／冷 boot 按存值）。
- 承 v0.27：冷 boot 读盘竞态修复、顶栏全档仅标题＋✕；承 v0.26：打分恢复（phases 数组＋writes trace 分类＋startedAt）、倒计时 5s 宽裕窗＋等待态圈满平滑脉冲、calibration-status 异步补、回看 null 分兜底。v0.13–v0.27 不回退。

## 2. 验证（可复跑）

- __summary-regress **55/55**（46 基线＋真数据交叉 3＋等待态脉冲 1＋冷 boot 3＋顶栏 1＋胶囊三档底色 1）；__boot-check **8/8**。v0.28 装机后复跑同绿。
- 胶囊断言口径：setLevel 0/1/2 → className 含 lvN＋computed backgroundColor 三色互异，收尾复位 1。
- 实拍 review/hec-ui5/：tablet-v28.png、tag-lv0.png（蓝）/tag-lv2.png（绿）、sum-full-scored/sum-wait 等（gitignore）。

## 3. 坑（项目特有增量；通用坑引技能）

- level 写路径三处（滑杆→setLevel、init 读盘、测试钩子）加状态同步逐处核 updateTag；本批前 setLevel 不叫 updateTag。
- 发版上传慢（VPN）：asset state=starter→uploaded 需轮询（15s×12 上限），别拿 starter 当完成；Release 已建时**别重跑发版脚本**（会建重复 Release），只读核 tags/v0.28。
- 平板冒烟 ver 改读 h1 textContent（innerText 首启可能空）；胶囊类直接读 className 验档色。
- apply_patch ≤2 hunk/次；父仓 .git 沙箱只读需提权。

## 4. 待办 / 别碰

- 用户真机复测：胶囊三色随档（蓝简单/琥珀标准/绿完整）＋简单档大数字＋完整档打分＋顶栏无小字。
- 评估 MD 顺带 minor 未做（另批）：增益带行 cal.gainMemory 真机恒空（改读 archive.gainMemory）；fix3 archiveRun 补 commands 快照（可选）。
- 功能设置其余等用户定义；二期回放回看／三期插件提案另批；profileFrame 非 HX 色带仍待真杯。
- 别碰照 v0.27 §4；装平板/发版/推送/父仓指针一律先问（本轮用户已批全链）。

## 5. 验证通道 / 6. 协作

照 v0.27 §5/§6：adb/gradle 路径、assets 同步再构建、CDP 9224/9223、桩 4801（/__setdiagDelay）、发版 REST 模板 .tools/__release28.ps1、夸克 CLI（session 复用、目录 fid 经 search --search-type dir）；统筹 01a1ef1c-40c3-7490-bcc4-b7043ebc1800（UI 不回叫）；**接力对话 ID：01a1f1cd-d4c7-7241-a1ea-b96ddcd48a3c（UI9）**。

