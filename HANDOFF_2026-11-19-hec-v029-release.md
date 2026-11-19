# 交接：HEC v0.29 已发版装平板（总开关关闭胶囊隐藏＋开关纯显示门）→ UI 接力对话起点（2026-11-19）

> lineage：HANDOFF_2026-11-19-hec-v028-release.md → HANDOFF_2026-11-19-hec-ui9-tag-off-state.md（本批细节/审计/测试卫生）→ 本份（v0.29 回执）。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。
> **UI 批用户直管 UI9（AGENTS §1.13）：不回叫统筹。本份即 UI 接力起点。**

## 0. 一句话现状

子模块 main HEAD = 本交接提交（v0.29 回执 890ab90 之后），tag v0.29 已发：Release id 451045472（asset 766854496，6,736,613 字节，SHA256 C63F07F03C1E4FAEAE4E3C865F385F0AF923F6600BAEC0FD784C0D36F1FC34F7），夸克「/来自：Codex」fileId 66ab0ded029244789cccbcf34abf5018；平板与模拟器均 v0.29（平板 dumpsys versionCode 29 / lastUpdateTime 2026-11-19 16:11:01；冒烟 iw=1138 / ver v0.29 / 冷 boot 颗粒度恢复存值 0 / 胶囊 curvetag sum lv0 / HX 曲线 / conn ok）。父仓指针已推。

## 1. v0.29 口径增量（别回退）

- **总开关关＝「本杯总结」胶囊整颗隐藏**（用户 11-19 定稿；覆盖灰底方案与旧「master off 回看标签保留」口径）；开＝胶囊带档位色回来（承 v0.28 三档色）。hidden＝enabled && lastRunId && control 模式；冷 boot 同步。
- **开关纯显示门**（用户 11-19「各个模型和算法一概不能有影响」）：enabled 仅 summary 内四处读；HxShadow.onCupEnd 独立先于 summary 钩子；shadow/arbiter 零引用 HxSummary；off 时 collect 不跑、_attachSummary 不碰归档。回归锁死（off shadow ingest／off 归档无 summary）。
- 承 v0.28 胶囊三档色；承 v0.27 冷 boot 读盘修复＋顶栏仅标题✕；承 v0.26 打分恢复＋倒计时 5s 宽裕窗＋等待态圈满平滑脉冲＋calibration-status 异步补＋回看 null 分兜底。v0.13–v0.28 不回退。

## 2. 验证（可复跑）

- __summary-regress **59/59**（46 基线＋真数据交叉 3＋等待态脉冲 1＋冷 boot 3＋顶栏 1＋胶囊三档 1＋开关态/独立性 4）；__boot-check **8/8**。v0.29 装机后复跑同绿。
- 包体：6,736,613 字节，SHA256 C63F07F03C1E4FAEAE4E3C865F385F0AF923F6600BAEC0FD784C0D36F1FC34F7（本地 HyperExController_v0.29.apk 与 Release asset 766854496 同大小，state=uploaded）。
- 实拍 review/hec-ui5/：tablet-v29.png、tag-off.png（off 胶囊消失）、tag-lv0/lv2.png（gitignore）。
- **发版期间别对话插提交核过**：统筹批只改 HEC_COORDINATOR_STATE.md/AGENTS.md；`git diff 890ab90 HEAD -- app/www assets build.gradle` 空 → tag 代码与包体一致；父仓指针提交落在别对话 logo 批之后（只 add 指针）。

## 3. 坑（项目特有增量；通用坑引技能）

- 同 checkout 多对话并行：push 前核 `git log` 区间与 `git diff <bump> HEAD -- <代码路径>`，确认插提交不碰代码再发 Release；父仓 add 只 add 指针。
- 回归跨轮写盘卫生（承上批）：开头 await 复位起始态、收尾 await ack；fire-and-forget dbSet＋短 sleep 会丢。
- 胶囊隐藏后 off 态 UI 无回看入口（review() 仍在）；「杯末不自动弹/回看保留」i18n 键闲置留档。
- apply_patch ≤2 hunk/次；父仓 .git 沙箱只读需提权；VPN 慢传 asset state=starter→uploaded 轮询。
- **VPN 代理对 uploads.github.com 会卡死**（curl CPU≈0、asset 停 starter；同代理 api.github.com 正常）：**uploads 可直连**（本轮直连 201 一次过）。卡死处置：kill 自己卡死的 curl→DELETE 未完成 asset→重传（先直连限时 150s，失败再代理 --http1.1 限时 240s），模板 .tools/__rel29-retry.ps1；别重跑整份发版脚本（会建重复 Release）。

## 4. 待办 / 别碰

- 用户真机复测：关开关胶囊消失且影子的/算法照跑；开开关胶囊档位色回来；简单档大数字／完整档打分／顶栏无小字承前。
- 评估 MD 顺带 minor 未做（另批）：增益带行 cal.gainMemory 真机恒空（改读 archive.gainMemory）；fix3 archiveRun 补 commands 快照（可选）。
- 功能设置其余等用户定义；二期回放回看／三期插件提案另批；profileFrame 非 HX 色带仍待真杯。
- 别碰照 v0.28 §4；装平板/发版/推送/父仓指针一律先问（本轮用户已批全链）。

## 5. 验证通道 / 6. 协作

照 v0.28 §5/§6：adb/gradle 路径、assets 同步再构建、CDP 9224/9223、桩 4801（/__setdiagDelay）、发版 REST 模板 .tools/__release29.ps1、夸克 CLI（session 复用、目录 fid 经 search --search-type dir）；统筹 01a1ef1c-40c3-7490-bcc4-b7043ebc1800（UI 不回叫）；**接力对话 ID：01a1f1cd-d4c7-7241-a1ea-b96ddcd48a3c（UI9）**。

