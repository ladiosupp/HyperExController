# 交接：HEC v0.23 已发版装平板（目标杯流历史化，样式 1+2）→ UI 对话继续（2026-11-18 晚）

> lineage：HANDOFF_2026-11-18-hec-ui-continue.md（v0.22 接力）→ 本份（v0.23）。本对话仍为 UI 入口；真杯取证/统筹对话不碰 UI。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。

## 0. 一句话现状

子模块 main HEAD = 本交接提交（v0.23 回执 94803be 之后），tag v0.23 已发：Release id 450011833（asset 763474919，6,731,125 字节，SHA256 EDB2F5A14C18C5659C0C07C62E1D2705CF435C4C5CA0D181351DF1577DEB4AD5），夸克「/来自：Codex」fileId 8c7f7e47378b426a9df5bf2e45ce3afb；平板与模拟器均 v0.23（平板冒烟 iw=1138 / ver v0.23 / hec-mode）。父仓指针已推。

## 1. UI 口径增量（v0.23，用户 11-18 晚定稿，别回退）

- **目标杯流 = 按样本历史 tgtHist**（样式 1 杯流卡 + 样式 2 合并图同改；写法对齐压力卡目标指令 sc.tcmd）：换段后旧段保留旧目标，不被当前值覆盖；**未启动不画、不分段**；HX 空闲不再画 profileTargets 步参考。
- 非 HX 步参考（杯流/压力/机器流量）、HX 压力卡（目标指令黄虚线+APK 指令橙实线）、非 HX 压力卡（tgtP 黄+tcmd 蓝）口径不变。
- targetSeries() 与 sc.tgt/tgtVal 已删（孤儿清理）；seriesCache 仍逐样本 push tgtHist。
- v0.13–v0.22 其余口径全集沿用上一份交接 §1，别回退。

## 2. 验证（可复跑）

- 回归 v4：父仓 .tools/__targetline2-check.cjs **14/14**（HX 空闲黄 0；换段 b5/b2 双值带；样式 2 合并图 m5/m2 双值带；非 HX/压力卡/图例不变）。band 助手 PIXB 按值带数黄像素（YM 两处须 split/join）。
- __flowcard-check **6/6**、__boot-check **8/8**。flowcard 的 hold during gap 断言已改「抖动后等 700ms 闸门落定再读 held」——慢 CDP 下读到未落定显示值是时序假红，产品逻辑（cand null 不更新）未动。
- 实拍：.impeccable/review/hec-ui5/flowtgt-idle/step/merge.png、tablet-v23.png（gitignore，本地取证）。
- 通道/桩/注入时序/发版 REST/夸克用法照上一份交接 §2。

## 3. 待办 / 别碰 / 协作

照上一份交接 §4–6：功能设置其余内容等用户定义；二期回放回看/三期插件提案另批；profileFrame 非 HX 色带仍待真杯；装平板/发版/推送/父仓指针一律先问（本轮用户已批全链）。别碰清单不变。统筹 01a1ee1f-0841-7c91-866d-668705990047，完成批已回叫。
