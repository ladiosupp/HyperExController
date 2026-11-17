# 交接：HEC v0.17 已发版装平板 → 新对话继续改 UI（2026-11-17）

> 前序：HANDOFF_2026-11-16-hec-v013-ui-continue.md（v0.11–v0.13 口径/通道/坑）。并行对话：真杯取证（HANDOFF_2026-11-17-hec-live-cups.md，平板只读监测）、统筹/图标（v0.16 整合发版 + 启动器图标进包，4057f49 交接定稿）。
> 规矩照 AGENTS.md（7 开工四件事、20 先问、16 中文、15 正斜杠、18 推送走 VPN）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法）。
> 示意稿：D:/vscode/.impeccable/mocks/hec-ui5/（m9 红条 / m10 样式2 / m11 光条；用户近几轮改为「直接改+模拟器实效果确认」，按用户当轮口径走）；取证：D:/vscode/.impeccable/review/hec-ui5/（gitignore，不入库）。

## 0. 一句话现状

子模块 main HEAD 见本交接提交，tag v0.17 已发：GitHub Release v0.17（id 447828379）带 HyperExController_v0.17.apk（6,703,346 字节，asset 757018538），夸克「/来自：Codex」有 v0.17（fileId 022ef1d7263e4ec4b49f35876b2f624a）。
平板与模拟器均已装 v0.17（versionCode 17，平板 CDP 核 ver=v0.17/conn ok）。父仓指针提交 b99640a **只在本地、没推**（推父仓仍待用户发话）。
**本对话是唯一 UI 改动入口**；真杯取证/统筹对话不碰 UI，影子发送逻辑谁都不碰。

## 1. UI 现状口径（用户定稿，别回退）

v0.13 交接 §1 全部沿用（文件夹标签、侧栏窄胶囊、断口线 main::before、曲线弹窗两列共享行轨、长按菜单 contains、行内容顺序、i18n、侧栏自动隐藏、杯流纵轴自适应、非 HX 图内 step 色带；stepstrip 概览胶囊不做）。本轮新增：

- **萃取锁定红条**：萃取中（锁定触发沿用现状 ext.extracting）温度/液重两卡挂 .hxlock 同款红条+变暗；杯末释放；HX 液重空闲红条保留。control.js renderApply 一行：hxlock = locked || (isWeight && hxWeightLock)。
- **实时曲线样式 2**（控制中心·UI 设置开关，存 hecChartStyle，默认 1）：两卡合一 boxMerge；图例一横排在 RAW 开关左侧（lgMerge，点击隐藏/显示、隐藏整项灰 .lg.off、**不存盘**）；左轴固定 0/2/4/6/8/10 六格（axes 第 8 参 n=5），右轴温度自适应带 ° 无标题；右上**无**杯流标题；RAW 开关+滤波拨轮随样式在 flowHead/mergeHead 间移动（applyChartStyle）。.hec-chartbox[hidden]{display:none} 防 flex 盖 hidden。
- **样式 2 配色**：压力绿 #63d89b（C.press2）、RAW 滤波线+原始散点白 #ffffff（C.raw2）；图例随动。**样式 1 配色不动**。HX「目标指令」在样式 2 改橙虚线（C.cmd dash）避免与目标杯流同黄虚线；APK 指令橙实线。
- **实时曲线宽度五档**（UI 设置 .widthctl 滑块，存 hecCurveWidth 0–4，默认 2）：等比 √2 [0.5,0.71,1,1.41,2]×，中档=现状；乘数只加在 line()/stepLine()（核实回放不共用），两种样式都生效；× 标签 ['0.5×','0.7×','1×','1.4×','2×']；矢量箭头/散点半径不动。
- **状态卡单行垂直居中**：.hec-cards .card align-items:center；.v display:flex+align-items:center+justify-content:flex-end+align-self:center+**margin-top:0**（回放基础规则 .card .v{margin-top:3px} 会漏进来，居中居的是 margin 盒）；七卡标题同一水平线；相位胶囊随 .v flex 居中（inline vertical-align 老偏移 bottom/-3.5px 已废）；趋势 ° sup.deg align-self:flex-start+margin-top:2px 保持上标。
- **秤重卡可点光条**：.hec-cards .card.tareable::before 2px 蓝渐变（.dial::before 同款）+position:relative+overflow:hidden+cursor:pointer；点击=去皮不变（萃取中提示不可去皮）。
- **杯流卡同源+稳定化**：weightFlow 优先、raw 兜底（旧 s.decaid 是死代码，scale 对象字段叫 weightFlow）；显示层 EMA0.5 + ≥0.5s 刷新 + 杯内候选断档保持 + 每杯重置 + 空闲/杯末回 —；onMachineSnapshot 补 renderCards()（否则杯末卡面等下一帧秤才刷）。**只动显示层，样本/曲线/影子不碰**。
- **标题弹窗标签顺序**：学习中心在前（openModal markup），与默认 section='learn' 匹配；同一次运行记住上次分区是现状行为。**右上角「在线 · calibration-status」小字已移除**（lrnSrc span + renderHead 函数及调用 + .lrn-top .src CSS 全删；✕ 的 margin-left:auto 改挂 .lrn-top .lrn-x）。用户称该弹窗为「系统设置页面」。
- i18n：learn.js EN 增 '实时曲线样式 2': 'Chart style 2'、'实时曲线宽度': 'Chart line width'。

## 2. 验证通道（可复跑）

- 工具链同 v0.13 交接 §2：adb=D:/android-dev/sdk/platform-tools/adb.exe；gradle=**D:/android-dev/gradle/gradle-8.7/bin/gradle.bat**（少一级目录会报 not recognized）；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9、GRADLE_USER_HOME=D:/android-dev/gradle-home；改 www 先 Copy-Item app/www/* app/src/main/assets/www/ -Force -Recurse 再构建。发版包=debug 签名改名（release 未签名）。
- 模拟器 AVD hxpad（emulator-5554），CDP forward 9224；平板 mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp，CDP 9223。**install -r 会杀 App 进程**：装完必须 am start + 重 pidof + 重 forward 再取 /json/list。
- 桩 .tools/__m6m8-stub.cjs 4801（提权侧起；**会随 exec 会话回收而死**，跑回归前先真实查端口：沙箱内 Get-NetTCPConnection 是假象）。新增测试端点 POST /__setext 改 ext（模拟插件报 extracting；红条断言必需，桩默认 extracting=false）。
- **模拟器 baseUrl 会被并行对话/手测改走（出现过 4798 无桩）**：__m10-regress / __center-check / __width-check 已带自愈（非 4801 就经地址弹窗恢复）。
- 回归：__m6m8-regress.cjs <wsUrl> <1|2>（8+5 项）；__m10-regress.cjs（20 项：红条/标签序/样式2/图例点击像素/持久化/重开记忆）；__flowcard-check.cjs（6 项杯流卡）；__center-check.cjs（量盒 k/v/pill 中心差）；__width-check.cjs（5 项宽度）；__color-shot.cjs（配色取证+图例色）；__tarebar-check.cjs（光条+去皮）；__ver14.cjs <wsUrl>（核版本）。
- **样式 2 persist 时旧套件 canvasShots ink=0 属预期**（取的是被隐藏的 hcFlow/hcPress）；合并图证据看 m10 的 hcMerge 特写。
- 注入坑：_injectScale 的 weightFlow:null 经 Number(null)=0 **不是断档**；真断档=字段缺失（undefined→NaN→null）+ dt>10s。EMA 0.5s 闸门使「保持」断言有竞态，间隔给足。
- 像素核对在页内 getImageData 计数（避免 CDP 异步求值挂死）；白=r,g,b>230，绿=g>170&&r<130&&b∈(120,190)，紫=r>150&&b>200&&g<160，蓝=b>200&&b-r>60&&g∈(120,200)。
- 发版 REST：gh 带附件挂死 → git credential fill 取 token（**不回显**），POST api.github.com + uploads.github.com 直传，均 -Proxy http://127.0.0.1:57890；脚本模板 .tools/__release17.ps1。夸克：quarkclouddrive skill CLI，upload 带 --session-input（用户原话）+ --session-id（同对话复用）；目录 fid 经 search --keyword "来自：Codex" --search-type dir --stdout-only（**keyword 走选项不是位置参数**）。

## 3. 本轮坑（项目特有）

- **apply_patch 多 hunk 必须按文件行序升序**（逆序报 Failed to find expected lines）；锚点整行；control.js 工作区是 CRLF。
- pwsh 内联 node -e 转义脆（:not(...) 等会被拆命令）→ 一律写 .cjs 脚本文件。
- exec_command 的 session 用 write_stdin 轮询；exec cell 用 wait；别混（cell id 查 session 报 not found）。
- gradle「33 up-to-date」不代表没带新代码：assets 时间戳相同会跳任务；怀疑时直接比 APK 内 assets/www/control.js 与 www 的内容（System.IO.Compression 读 entry）。
- 沙箱看端口/注册表/进程全是假象（AGENTS 10 同款）；查桩存活、tasklist 一律提权。
- 并行对话会动模拟器 baseUrl、会自行发版（v0.15/v0.16）并推父仓指针；**开工四件事必做**，版本号以 build.gradle 磁盘现状为准，别按记忆 bump。

## 4. 待办（新对话按顺序）

1. 用户继续提 UI 修改：按用户当轮口径（近几轮为「直接改+模拟器确认」；若用户要示意稿则 mocks/hec-ui5 同款：真令牌+真视口+标注在设备框外）。**装平板/发版一律先问**。
2. 功能设置 / 其他 两分类内容等用户定义。
3. profileFrame 随 step 递增的真机色带验证（v0.13 遗留）：真杯取证对话已出真杯，是否覆盖该验证问统筹/用户，别默认已验。
4. 父仓指针 b99640a 未推，推不推问用户。
5. 夸克 v0.6 历史欠传仍在（/来自：Codex 现有 v0.4/v0.5/v0.11/v0.12/v0.13/v0.14/v0.16/v0.17；v0.15 是否在该目录以统筹回执为准）。

## 5. 别碰

- shadow.js / arbiter.js 发送逻辑；插件仓 D:/vscode/decenthyperexplugin；真杯取证/统筹对话的真机安排。
- 别人未提交/未跟踪：review/hec-icon/*、AGENTS.md（子模块根）、HANDOFF_2026-11-17-hec-live-cups.md、图标 res 若再出现 WIP。
- 旧 4799 桩若还活着别 kill。
- stepstrip 概览胶囊别加回来；样式 1 配色/两卡布局别回退。

## 6. 本轮产物索引

- 代码提交：fd75aa0（状态卡居中）、2a5361b（样式2配色+宽度五档）、294e57f（v0.17 去小字+版本号）、本交接提交；父仓 b99640a（本地）。
- 脚本：.tools/__m10-regress.cjs、__flowcard-check.cjs、__flowcard-probe*.cjs、__center-check.cjs、__center-probe*.cjs、__width-check.cjs、__color-shot.cjs、__tarebar-check.cjs、__ver14.cjs、__release17.ps1、__m6m8-stub.cjs（+/__setext）。
- 取证：review/hec-ui5/ v14-1…v14-6（红条/样式2/重开修）、v15（光条）、v16–v19（居中迭代）、v20-colors-*（配色）、v21-width-*（宽度）、t9-v014-tablet.png、t10-v017-tablet.png。
