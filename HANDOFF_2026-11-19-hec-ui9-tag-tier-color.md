# 交接：HEC UI9 小批——「本杯总结」胶囊底色编码颗粒度三档（2026-11-19，本地未发版）

> lineage：HANDOFF_2026-11-19-hec-v027-release.md → 本份。UI9 用户直管（AGENTS §1.13，不回叫统筹）。
> 触发：用户「把总结的状态放胶囊的底色，三档三个颜色」；经问确认口径＝**颗粒度三档**（简单/标准/完整），非评分三 band。

## 0. 一句话现状

子模块 main HEAD = 本批提交；只在本地与模拟器（versionCode 仍 27），装平板/发版/推送/父仓指针先问。回归 __summary-regress **55/55**＋__boot-check **8/8**。

## 1. 改动

- 胶囊 = 曲线选择下 `#sumReviewTag`（class curvetag sum，点击=回看，行为不变、文字不变「本杯总结」）。
- updateTag 追加 `className = 'curvetag sum lv' + level`；CSS 三档底色复用现有令牌：**lv0 简单＝蓝 #20304d/#9cc0ff（lock 同源）／lv1 标准＝琥珀 #3d2c17/#f5c078（sum 原色）／lv2 完整＝绿 #173a2a/#8fe0b0（ok 同源）**。
- 同步路径补齐：setLevel 末尾加 updateTag()（滑杆 live 改色）；init 颗粒度 dbGet .then 加 updateTag()（冷 boot 改色，承冷 boot 修复）。
- 回归＋1 断言：setLevel 0/1/2 类名 lvN 命中＋computed background 三色互异，收尾复位 1。

## 2. 验证

- 55/55＋8/8；实拍 review/hec-ui5/tag-lv0.png（蓝）/tag-lv2.png（绿）（gitignore）。
- 用户视角：胶囊蓝＝简单、琥珀＝标准、绿＝完整；选档后立刻变色，冷 boot 按存值变色。

## 3. 坑 / 待办 / 别碰

- **level 的写路径有三处（滑杆 input→setLevel、init 读盘、回归/_setLevel）**，加状态同步时逐处核 updateTag 是否被叫到；本批前 setLevel 不叫 updateTag 是胶囊不变色的原因。
- 三档色复用令牌不新造色；若未来改编码口径（如评分 band）先问用户（本批已问过一次）。
- 待拍板：装平板/发版（v0.28）先问。别碰照 v0.27 §4；v0.13–v0.27 口径不回退。

