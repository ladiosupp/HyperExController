# 交接：HEC v0.24 已发版装平板（沉浸全屏+去指令卡+样式分类型+杯末倒计时）→ UI 对话继续（2026-11-19）

> lineage：HANDOFF_2026-11-18-hec-v023-release.md（v0.23）→ 本份（v0.24）。本对话（HEC UI8，01a1eeac）仍为 UI 入口；真杯取证/统筹不碰 UI。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。

## 0. 一句话现状

子模块 main HEAD = 本交接提交（v0.24 回执 5167bb0 之后），tag v0.24 已发：Release id 450739200（asset 765634999，6,732,561 字节，SHA256 2824AFEFA7DC756E600108555BD99B3BAFE8A84378747FF4FC864315210FCBCC），夸克「/来自：Codex」fileId 3d836dc013fb4326b80f60ed43f611a6；平板与模拟器均 v0.24（平板冒烟 iw=1138 / ver v0.24 / hec-mode）。父仓指针已推。

## 1. UI 口径增量（v0.24，用户 11-19 定稿，别回退）

- **沉浸全屏**（MainActivity）：immersive sticky，API30+ WindowInsetsController / 老版本 legacy flag；上滑临时唤出系统栏自动收，onWindowFocusChanged 回焦重隐。首次启用有 Android 一次性「Viewing full screen / Got it」系统提示（标准行为）。
- **去 HX 侧栏指令卡 hecBox**（插件/逻辑帧/基值当前/目标杯流/限压/预算/拒绝整卡）；takeoverBox 接管提示保留。
- **样式分类型**：控制中心「HX 曲线样式 2」「非 HX 曲线样式 2」两开关；hecChartStyleByType {hx,non} 存盘，旧 hecChartStyle 迁移到两类；生效 chartStyle 随 isHxSelected() 切换（renderCurveBtn 首行 syncChartStyle）；setChartStyle(v)=设当前类型，setChartStyleFor(k,v)/getChartStyles 新钩子。
- **杯末倒计时**：守卫通过后全屏 3s 倒计时（3→2→1 大数字+黄进度环+「本杯总结」标题），collect 并行（仍 1s 后起、poll 6 次）；到点就绪即弹，未就绪停最后一帧「收集数据」等就绪；新杯 onExtracting/关总开关 setEnabled(false) 取消（stopCountdown+fetchSeq++）。open() 在倒计时期间排队 cdQueued，doOpen 真正开。
- **去大数字**：scoreSec 不再画 44px sumTotal 大数字；小字行保留 控制 X · TDS Y · 加权 Z（加权值原只在大数字上，现补小字行）。.total CSS 已删。
- v0.13–v0.23 其余口径全集沿用前两份交接，别回退。

## 2. 验证（可复跑）

- __summary-regress **35/35**（含倒计时出现/到点消失/新杯取消/等待态/master off 与非 HX 与校准无倒计时；分数断言改读 sumMeta「控制 100」「加权 99」）。
- __style-split-check **6/6**、__m10-regress **20/20**（两开关同操）、__targetline2-check **14/14**、__flowcard-check **6/6**、__boot-check **8/8**。
- 全屏量化：视口 2560×1600 吃满；底栏手势条白像素 0→上滑 46726→4.5s 后 0（System.Drawing 数像素）。
- 实拍：.impeccable/review/hec-ui5/ fs-hx2/fs-swipe/fs-hide、style-split-ui/hx/non、sum-count/sum-modal、tablet-v24.png（gitignore）。
- m10「idle 锁释放」与 flowcard「hold during gap」均出现过慢 CDP 时序假红（读早于闸门/轮询落定），复跑绿；断言已加落定等待。

## 3. 待办 / 别碰 / 协作

照前份：功能设置其余等用户定义；二期回放回看/三期插件提案另批；profileFrame 非 HX 色带仍待真杯；装平板/发版/推送/父仓指针一律先问（本轮用户已批全链）。别碰清单不变。
**统筹已接力：新 ID 01a1ef1c-40c3-7490-bcc4-b7043ebc1800（hostId local），旧 01a1ee1f 作废；状态真源 HEC_COORDINATOR_STATE.md。完成批已回叫新统筹。**
