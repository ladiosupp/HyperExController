# 交接：UI10 批 1 —— 自定义数字键盘＋弹窗仅按钮关＋研磨输入落记录＋右侧建议版式（2026-11-19）

> lineage：HANDOFF_2026-11-19-hec-ui9-ui10-relay.md（接力入口，UI10 ID 已回填 88466a5）→ 本份。规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md；UI 批用户直管，不回叫统筹。

## 0. 一句话现状

本批本地提交（见 git log）；模拟器回归 __summary-regress **69/69**＋__boot-check **8/8**；www 与 assets 四份哈希一致。**未装平板／未发版／未 push／父仓指针未动——一律先问用户**。versionCode 仍 29（本批不升版）。

## 1. 用户当轮原话（两批合一）

1. 「简单颗粒度，点击TDS旁边3.50文字后，弹窗出系统键盘，点击键盘外，整个对话框都关闭了，这个改成一个自己的输入控件吧，就是数字键盘控件和小数点就好了，也不要切出去；旁边研磨度那个用同样的方式改，然后研磨度要有输入的，记录在这杯的记录里面吧，不参与计算。这个杯末弹窗，要只能按关闭的按钮关闭，点击弹窗外不要关闭这个弹窗。」
2. 「还有顺便改改，评分数字右侧研磨改成研磨调整建议，右侧最下面置信LOW那行删掉，研磨度建议的文本往下就用第2、3行」

## 2. 本轮改动（全在 APK 侧 app/www，两份入库）

- **自定义数字键盘**（summary.js openKeypad/closeKeypad，bindSumDial 点按分支改调它；原生 input/.dv-in 全删）：TDS 带小数点（buf≤5 字符、单个 '.'）、研磨整数（≤3 位、无小数点键，空位占位）；⌫ 退格；橙色「完成」＝clamp 后提交；**点键盘外＝取消本次输入（值不变），弹窗不关**；竖滑 4px/步照旧；提交一次性守卫（finish 内 closeKeypad）。键盘罩 .sum-kp-wrap 挂在 sumDim 内、z-60 居中，样式复用现有令牌（#33507e 边／#e8833a 完成）。
- **弹窗仅按钮关**（全档）：init 里 sumDim 空白点击 close 与 document Esc close 两条监听删除；只剩 ✕（sumX）与简单档「再来一杯」（sumAgain）。系统事件 close 保留：onExtracting 新杯、setEnabled(false)。**设置弹窗（appTitle/hecDim）的 Esc 关不受影响**。
- **研磨输入落杯记录**：control.js 新增 attachInput(rid,patch)（_attachInput 导出，挨着 _attachSummary）：归档 shot 顶层 Object.assign＋saveArchive；简单档研磨 onCommit（滑与键盘同路）写 {grindInput: round(v)}。**只记录不参与计算**（weighted 只读 tds）。顶层字段经 archive-core cleanSummary 保留→合并/导出不丢。hecShotTds {tds,grind} 按 runId 照旧。回放详情 app.js renderCupInfo 有值才加一行「研磨输入 012」（EN: Grind input）。
- **简单档右侧版式**：标题 研磨→**研磨调整建议**（EN: Grind adjustment advice）；置信行 .s 删除（CSS 孤儿一并删）；建议文本 .v grid-row:2/4 占第 2、3 行、可换行（line-height 1.35、overflow hidden），右列仍 3×24px+8px 行格→与左三行上下沿对齐不变。缺数据时 .v 仍「—」。标准/完整档 grindSec 不动。
- i18n：summary.js EN 加 研磨调整建议/完成；app.js EN 加 研磨输入。

## 3. 覆盖的旧口径（下一任别回退）

- relay §1「点数字弹输入（Enter/Esc/失焦，done 一次性守卫）」→ 键盘语义（完成提交／键盘外取消／不切系统输入）。
- relay 未列但旧代码有的「sumDim 空白点击 close／Esc close」→ 作废，仅按钮关。
- relay §1 右侧三行（标题/建议/置信）→ 两子元素（标题＋跨 2-3 行建议文本）。
- 其余不变量（v7 布局/192px/拨号竖滑/倒计时 5s 等待态/顶栏仅标题✕/胶囊三档+关隐藏/纯显示门/phases 数组解析/冷 boot dbReady）本批未碰，回归锁死。

## 4. 验证回执

- __summary-regress 69/69（59 基线－4 旧输入/旧关闭＋13 键盘/仅按钮关/研磨落记录＋1 右侧版式）：键盘开无原生 input、buf 3.40、完成提交、研磨无小数点键、012 提交、archive.grindInput=12、键盘外取消且弹窗仍在、cupInfo 含「研磨输入 012」、Esc/空白不关、✕ 关、右侧标题+gridRowStart=2+无 .s。
- __boot-check 8/8。node --check 三 JS＋回归脚本绿。
- 实拍（gitignore，本地取证）：.impeccable/review/hec-ui5/sum-keypad.png（研磨键盘）／sum-simple-v7.png（关键盘后 3.40/012＋右侧新版式）。

## 5. 本轮坑

- Copy-Item -LiteralPath 不展开 wildcard（报 Cannot find path 'app/www/*'），同步 assets 用 -Path。
- 回归 kp 助手嵌套引号：外层单引号串内 \' 转义、属性选择器用双引号，node --check 后仍需真跑验证。

## 6. 待办 / 别碰

- 待用户：装平板／发版（升 versionCode 30 起）／push／父仓指针。标准/完整档 TDS/粉量仍是原生 input（用户只点名简单档拨号，不擅自扩）。
- 别碰：影子/仲裁发送面、温度链路、HX 液重、插件仓、他人未跟踪（评估 MD/图标卡池）；加热进度胶囊作废不做。
