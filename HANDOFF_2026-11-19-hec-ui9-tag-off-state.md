# 交接：HEC UI9 小批——总开关关闭时胶囊隐藏＋开关纯显示门审计（2026-11-19，本地未发版）

> lineage：HANDOFF_2026-11-19-hec-v028-release.md → 本份。UI9 用户直管（AGENTS §1.13，不回叫统筹）。
> 触发：用户「杯末总结弹窗选项关闭以后，曲线选择那个胶囊状态不对」→ 灰底方案被用户否决：「开关关闭的时候胶囊直接不显示才对」＋「开关关闭的时候各个模型和算法一概不能有影响」。

## 0. 一句话现状

子模块 main HEAD = 本批提交；只在本地与模拟器（versionCode 仍 28），装平板/发版/推送/父仓指针先问。回归 __summary-regress **59/59**＋__boot-check **8/8**。

## 1. 改动

- updateTag：**enabled=false → 胶囊整颗隐藏**（用户 11-19 定稿，覆盖灰底方案与旧口径「master off 回看标签保留」）；enabled=true → 文字「本杯总结」＋lvN 档位色（承 v0.28）。hidden＝enabled && lastRunId && control 模式。.off CSS 已删（孤儿）。
- **纯显示门审计**（用户 11-19「各个模型和算法一概不能有影响」）：enabled 仅 summary 内四处读（updateTag/onCupEnd 守卫/setEnabled/init 读盘）；control.js 的 HxShadow.onCupEnd 独立且先于 HxSummary.onCupEnd；shadow/arbiter 零引用 HxSummary；off 时 collect 不跑、_attachSummary 不碰归档、stopCountdown+fetchSeq++ 只取消 summary 自身收集 → 模型/算法零影响。回归断言锁死。
- 同步路径已齐：setEnabled／init 开关读盘／onLang 均叫 updateTag → live 与冷 boot 都正确。
- 回归＋4 断言（hidden 替换旧「review tag kept」不计新增）：off 萃取中 shadow 仍 ingest 样本（_debug().cup.samples>0，算法独立）／off 归档该杯无 summary／on 恢复 lv1＋文字／收尾复位写盘 ack；冷 boot master-off 断言改核 hidden。
- **测试脚本状态卫生**：套件开头统一 await 写盘 on/标准（防上轮遗留 off/0 致首杯不弹）；收尾复位改 await Promise.all ack（旧 fire-and-forget＋sleep200 曾丢写盘，致后续每轮首杯不弹、sumMeta 读 null exit 2）。

## 2. 验证

- 59/59＋8/8；实拍 review/hec-ui5/tag-off.png（off＝胶囊消失）、tag-lv0/lv2.png（gitignore）。
- 用户视角：关开关＝胶囊消失（模型/算法照跑）；开开关＝档位色「本杯总结」回来。

## 3. 坑 / 待办 / 别碰

- 胶囊隐藏口径覆盖旧「回看标签保留」：off 时 UI 无回看入口（review() 函数仍在，测试/未来入口可用）；「杯末不自动弹/回看保留」i18n 键闲置留档。
- **回归跨轮状态卫生**：凡写盘改设置的断言块，收尾必须 await 写盘 ack 复位；套件开头统一复位起始态。fire-and-forget dbSet＋短 sleep 在 WebView IDB 上会丢（本轮实测），别再用。
- 待拍板：装平板/发版（v0.29）先问。别碰照 v0.28 §4；v0.13–v0.28 口径不回退。

