# 交接：HEC v0.26 已发版装平板（杯末打分恢复＋倒计时等待态平滑）→ UI 接力对话起点（2026-11-19）

> lineage：HANDOFF_2026-11-19-hec-v025-release.md（v0.25 口径全集）→ HANDOFF_2026-11-19-hec-ui9-score-countdown-fix.md（修复批细节 bc5e422）→ 本份（v0.26 回执）。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md（开工四件事、先问后改、中文、正斜杠、推送走 VPN 57890）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。
> **UI 批用户直管 UI9（AGENTS §1.13）：不回叫统筹、统筹不派单不追踪；本份即 UI 接力起点。**

## 0. 一句话现状

子模块 main HEAD = 本交接提交（v0.26 回执 d0d5a24 之后），tag v0.26 已发：Release id 450874537（asset 766194750，6,736,469 字节，SHA256 71B893DAD72DD1CB0FFC3853407301C73E452D2D73CF62C702866B0655A21AC0），夸克「/来自：Codex」fileId 8c03d310772f433e95b98d40b2855f85；平板与模拟器均 v0.26（平板冒烟 iw=1138 / ver v0.26 / HX 曲线选中 / conn ok；dumpsys versionCode 26 / lastUpdateTime 2026-11-19 12:16:48）。父仓指针已推。

## 1. v0.26 口径增量（修复批，别回退）

- **打分恢复**：collect 按**数组**解析 controlReview.phases（按 phase find；旧按阶段名当对象索引 → total 恒 null → 每杯「不评分 · 5 指标缺」）；writes 改 **writeStats(trace 分类)**（port 同口径，公式 v2 只数常规+救急；插件 writes 是数字、directionReversals 含供水反转不能直接扣分）；补 startedAt（头部日期）。真 /diagnostics 顶层 {summary, run}，匹配键 summary.runId（review 无 runId 字段）。
- **倒计时关键路径**：calibration-status 移出（异步补进同一 m，autoApply 胶囊照旧、3s 刷新兜底）；等待态**圈停满＋数字 1 平滑呼吸脉冲**（.wait / sumwait 1.1s，reduced-motion 关；旧 cdEnd 每 200ms 拨 400 致环尖抽搐已除）；初始数字 5。**语义照 v0.25 不变**：CD_MS=5000、+100ms collect、圈转完弹有数据窗（cdQueued）、慢于窗停 1 等到即弹、新杯 onExtracting / setEnabled(false) 取消。
- **回看兜底**：persisted 仅 total≠null 或 fault 才用，否则 fall through portModel→compact（review＋openOffline 两处）。
- 公式 v2／权重／TDS 门控／三档渲染／简单档 v7／v0.13–v0.25 全集**零改动**。
- 真机预期：新杯在线打分恢复；插件 finalize 慢于 5s 时等待态平滑呼吸；旧杯回看 null persisted 落 compact（直写归档无 commands/分类 trace，port 门守住；老杯全量分数待插件导出合并或三期 compact 持久化）。**hecMode=false 是插件仍 full 模式（full→hec 里程碑未到），不是回归**；弹窗门控看 HX 曲线选中（ctx.hx）不看 hecMode。

## 2. 验证（可复跑）

- __summary-regress **50/50**（46 基线＋真数据交叉 3＋等待态脉冲 1；装机 v0.26 后复跑同绿）：真交叉用子模块 .tools/__diag-live.json 真响应 → online／控制 85／S2 91／S3 80（与弹窗评估修正值一致）；GOOD_DIAG 已换真形状（phases 数组＋writes 数字＋trace fixture），镜像断言盲区堵上（§3.13）。
- __boot-check **8/8**（装机后复跑）。其余套件（targetline2 14／flowcard 6／m10 20／style-split 6）本批未动其代码面，沿用 v0.25 绿。
- 等待态确定性验证：桩 /__setdiagDelay 600ms 拉长重试窗覆盖 5s→数据到；degraded 断言轮询 VIS（重试耗尽随请求延迟漂移，别固定 sleep）。
- 实拍（review/hec-ui5/，gitignore）：sum-full-scored.png（完整档 85／91／80＋日期＋已自动应用）、sum-wait.png（圈满＋1 脉冲）、tablet-v26.png、sum-modal/sum-simple-v7/sum-count.png。

## 3. 坑（项目特有增量；通用坑引技能）

- **apply_patch 多 hunk（≥3）在本仓报最后一个 hunk 找不到**（内容一致也报）：拆 ≤2 hunk/次。
- **平板装机后有两个 webview socket**（旧进程残留＋新 pid）：forward 必须按 `pidof com.ladios.hxcontroller` 取当前 pid，先 forward --remove 再建；冒烟脚本 .tools/__ui9-tablet-smoke.cjs 已按此写（轮询 android_asset 页）。
- 提权 shell PATH 无 bash：夸克 install.sh 用 `"C:/Program Files/Git/bin/bash.exe"` 跑。
- 内联 node -e 多层转义必脆（技能坑）：写 .tools 脚本文件跑。
- 回归「degraded opens」轮询化见 §2；桩延迟用完复位 0。

## 4. 待办 / 别碰

- **用户真机复测完整＋简单两档**（平板已 v0.26；当前 level=1 标准、开关 on，档位用户自调）。
- 评估 MD 顺带 minor 未做（另批）：增益带行 cal.gainMemory 真机恒空（改读 archive.gainMemory）；fix3 archiveRun 补 commands 快照（可选）。
- 功能设置其余等用户定义；二期回放回看／三期插件提案另批；profileFrame 非 HX 色带仍待真杯。
- 别碰照 v0.25 §4：影子/仲裁发送、温度链路、HX 液重、插件仓在途批、他人未跟踪文件；装平板/发版/推送/父仓指针一律先问（本轮用户已批全链）。

## 5. 验证通道

照 v0.25 §5：adb/gradle/JAVA_HOME/GRADLE_USER_HOME 路径、assets 同步再构建、模拟器 hxpad CDP 9224 / 平板 9223、桩 4801（父仓 .tools/__m6m8-stub.cjs，提权侧起、随对话死；新增 /__setdiagDelay）+ adb reverse、套件开头复位 workflow/baseUrl、发版 REST（git credential fill + curl -Proxy 57890 -H Expect:；模板 .tools/__release26.ps1）、夸克 CLI upload --parent-fid（目录 fid 经 search --keyword "来自：Codex" --search-type dir --stdout-only；session 复用）。

## 6. 协作 / 接力

- 统筹：**01a1ef1c-40c3-7490-bcc4-b7043ebc1800**（hostId local）；状态真源 HEC_COORDINATOR_STATE.md；**UI 批不回叫**（§1.13）。
- **接力对话 ID：01a1f1cd-d4c7-7241-a1ea-b96ddcd48a3c**（UI9「HEC UI9 接力（v0.25 后）」，hostId local；本批即 UI9 第一批修复＋发版）。
- 示意稿 mocks/hec-popup-simple/（v7 锁稿）；取证 review/hec-ui5/（gitignore）。

