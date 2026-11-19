# 交接：HEC v0.25 已发版装平板（简单档 v7 锁稿 + 倒计时 5s 宽裕窗）→ UI 接力对话起点（2026-11-19）

> lineage：HANDOFF_2026-11-18-hec-v023-release.md → HANDOFF_2026-11-19-hec-v024-release.md（v0.24 四批）→ 本份（v0.25）。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md（开工四件事、先问后改、中文、正斜杠、推送走 VPN 57890）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。
> **接力：本份由 UI8（01a1eeac-1f2d-77d2-8b80-568d0821aa27）发版后创建的新接力对话接棒 UI；接力对话 ID 由其第一批回填本节 §6。真杯取证/统筹不碰 UI。**

## 0. 一句话现状

子模块 main HEAD = 本交接提交（v0.25 回执 f528168 之后），tag v0.25 已发：Release id 450832733（asset 766011665，6,736,189 字节，SHA256 3751E226B24CA8E73340CC540CFC72513A156E71918DBE215CCC12C88658B3AA），夸克「/来自：Codex」fileId c9917f98871040aaace4830d6aedd8ff；平板与模拟器均 v0.25（平板冒烟 iw=1138 / ver v0.25 / hec-mode）。父仓指针已推。

## 1. UI 口径增量（v0.25，用户 11-19 锁稿 v7，别回退）

- **简单档 = 视图过滤**（level 0）：左 **S1/S2/S3 匹配度三行**与右研磨三行**上下沿对齐**（同 3×24px 行格 + 8px gap）；行 = 阶段名 + valPill 状态（S1 有 quality 给 STARTUP 灰胶囊、否则 —）+ 整段误差等宽小字（validation/stages 取数，缺 —）。
- 中央 **192px** tier 色数字（good≥80/warn≥60/bad<60）：未确认=控制分、点「确认重算」后=加权分；lb/meta 小字随态；缺分 hero「—」+缺数据胶囊、三行全 —。
- **底部拨号式输入一行**：TDS 默认 **3.50**（toFixed(2)、步长 0.01、0–15）、研磨度默认 **000**（padStart(3)、步长 1、0–999）；竖滑 4px/步调值、**点数字弹输入框**（Enter 提交/Esc 取消/失焦提交，done 一次性守卫）；未触碰 .idle 置灰、触碰点亮；**蓝色确认重算**（#9cc0ff/#33507e，仅 TDS 触发、研磨度只记录不触发）；存 hecShotTds 同款 {tds,grind}。
- 标题字体：西文 Orbitron（--tech 同源）、中文黑体兜底（'Orbitron','Microsoft YaHei',…一个栈分流）。
- 顶栏仅标题+✕（无 runId/时刻小字）；无下一杯建议；三 zone 同底纹；居中短「再来一杯」= close；✕/遮罩可关。
- **动效一次编排**：开场 0→控制分计数 400ms ease-out + 字重 600→700；两侧三行 60ms 阶梯淡入（rowin）；确认重算 morph 240ms 字重→800；重渲染挂 .no-anim 不重播；prefers-reduced-motion 全 snap。
- **倒计时 5s 宽裕窗**（三段演进定稿）：CD_MS=5000；+100ms 起 collect 并行；圈 5→0 转完弹有数据窗（open 排队 cdQueued，**不再早到收零**）；慢于窗停 1 脉冲等到即弹（无圈后 limbo）；新杯 onExtracting / setEnabled(false) 取消（stopCountdown+fetchSeq++）。
- **简单档弹窗撑满居中**：sum-modal 类 .lrn-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}（真壳 .lrn-body 无 flex:1，见 §3 坑）。
- 标准/完整档（level 1/2）与 v0.13–v0.24 全部口径不变（含 v0.24 无大数字布局、样式分类型、沉浸全屏、去 hecBox）。

## 2. 验证（可复跑）

- __summary-regress **46/46**：匹配度三行对齐、拨号格式（3.50 点索引 1 / 000 三位）、点输提交（合成 PointerEvent）、确认 morph 到加权、再来一杯关、缺分降级三行 mute、5s 窗到点弹、停 1 无 limbo、取消、master off/非 HX/校准无倒计时。
- __boot-check 8/8、__targetline2-check 14/14、__flowcard-check 6/6、__m10-regress 20/20、__style-split-check 6/6（前批）。
- 居中断言口径：hero 行高 > body 一半 且 hero 行底 +14 == 输入行顶（**别用数字中心 vs body 中心**，底部控件占高、示意图数字中心本就偏上）。
- 实拍：.impeccable/review/hec-ui5/ sum-simple-v7.png、sum-count.png、tablet-v25.png；示意图 mocks/hec-popup-simple/popup-simple-v7.html（v1–v6 备查）。

## 3. 坑（项目特有增量；通用坑引技能）

- **真壳 .lrn-body 无 flex:1**（示意图有）：新弹窗内容会缩顶、弹窗下半空；sum-modal 类自补 flex。mock 与真机位置不一致先核壳 CSS 差异。
- **拨号类名冲突**：.dial-num/.dv 被侧栏拨号占用；简单档拨号用 .sum-dial 前缀独立实例（bindSumDial），交互口径同 control.js 拨号但 setPointerCapture 要 try/catch（合成事件回归需要）。
- 回归断言两处自坑：3.50 小数点索引 1 不是 2；居中别比数字中心与 body 中心（见 §2）。
- 倒计时语义三段演进（3s 固定+圈后 limbo → 覆盖等待早到收零 → **5s 宽裕窗转完弹**），别回退前两段。
- 模板串写补丁/转换脚本时 \n 与引号转义会被外层模板吃掉：锚点用反引号串、换行用 \\n 或 fromCharCode。

## 4. 待办 / 别碰

照前份：功能设置其余等用户定义；二期回放回看/三期插件提案另批；profileFrame 非 HX 色带仍待真杯；评分数据根因（total 为何 null）由弹窗评估对话另查（HANDOFF_2026-11-19-hec-popup-score-eval.md），UI 按有分/缺分两态设计。装平板/发版/推送/父仓指针一律先问。别碰清单不变（shadow/arbiter 发送逻辑、温度链路、HX 液重、插件仓在途批、他人未跟踪文件）。

## 5. 验证通道

照 v0.23/v0.24 交接 §2：adb/gradle/JAVA_HOME/GRADLE_USER_HOME 路径、assets 同步再构建、模拟器 hxpad CDP 9224 / 平板 9223、桩 4801（父仓 .tools/__m6m8-stub.cjs，提权侧起、随对话死）+ adb reverse、套件开头复位 workflow/baseUrl、注入时序、像素错开、发版 REST（git credential fill + curl -Proxy 57890 -H Expect:）、夸克 CLI upload --parent-fid（/来自：Codex fid 见 §0）。

## 6. 协作 / 接力

- 统筹：**01a1ef1c-40c3-7490-bcc4-b7043ebc1800**（hostId local；旧 01a1ee1f 作废）；状态真源 HEC_COORDINATOR_STATE.md；完成批回叫（轮名/key 数字/交接 MD/待拍板），纯确认不回叫。
- **接力对话 ID：待接力第一批回填**（UI8 发版后 create_thread 建，prompt 以本份为起点）。
- 示意稿 mocks/hec-popup-simple/（v7 锁稿）；取证 review/hec-ui5/（gitignore）。
