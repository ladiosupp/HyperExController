# 交接：HEC 启动闪屏修复 + 平板图标缓存刷新（2026-11-17 晚）

> 前序：HANDOFF_2026-11-17-hec-v017-ui-continue.md（v0.17 基线、口径、通道）。本对话仍是唯一 UI 改动入口。规矩照 AGENTS.md 与子模块 AGENTS.md。

## 0. 一句话现状

闪屏修复已本地提交 **51056e5**（未 bump 版本号、未推、未装平板），模拟器回归全绿；平板仍 v0.17（**闪屏修复未装机**，装/发版待用户发话）。平板桌面图标经用户授权 force-stop com.miui.home 刷新，dock 已显示棕底 HEC 新图标（取证 v22-tablet-home-icon）。

## 1. 本轮改动

- **闪屏根因**：index.html 是 ProfileReplayer 基线标记，默认显示回放侧栏/视图；JS 默认模式却是 control（control.js let mode='control'）。模式切换排在长异步启动链末尾：app.js openDb → 读整份归档/地址/语言 → mergePending → 渲染回放杯单 → HxControl.init（7 个串行 dbGet + 影子加载 + 接线）→ setMode。首帧按标记画回放器，几百毫秒后翻面 = 用户看到的闪一下。
- **index.html**：body 预挂 class="hec-mode"；replayAside/replayView 默认 hidden、controlAside/controlView 默认显示。首帧即 HEC 骨架且布局即终态（hec-mode 的 219px 侧栏等 CSS 首帧生效）。存回放模式的用户首帧是控制骨架、setMode 再翻回放。
- **control.js**：setMode 回放分支末尾 window.dispatchEvent(new Event('resize'))。回放画布在隐藏期被 app.js 启动链画过时按兜底 800×150（app.js:850 clientWidth||800），切回放/回放启动后由 app.js 既有 resize 处理器（150ms 防抖：layoutCards + buildCharts + paint）重排重绘。
- assets/www 同步、SHA256 一致；index.html 工作区行尾归一纯 CRLF（HEAD 纯 LF、autocrlf；apply_patch 混入过 35 行 LF，见 §4）。

## 2. 验证回执（模拟器 hxpad · 桩 4801 · 提权侧）

- APK 内 assets 核对（.tools/__apk-asset-check.ps1）：control.js 含 resize 派发、index.html 四处新默认 + body hec-mode，全 True。
- **m10 20/20**；**m6m8 suite1 8/8、suite2 5/5**；**flowcard 6/6**（首跑红 1 项 refresh<=3 distinct/s 为注入计时竞态——handoff v0.17 §2 已点名 EMA 闸门竞态；复跑全绿，与本轮无关）。
- **__boot-check.cjs 8/8**（新脚本）：控制启动直达（mode/views/hec-mode/标签）；UI 切回放画布按可见容器重排重绘（cFlow 878×150 CSS → 1756×300 @dpr2、ink 26799）；回放模式重启直达且画布尺寸正确；切回控制重启恢复。
- 取证 review/hec-ui5/：v22-boot-control、v22-switch-replay、v22-boot-replay、v22-tablet-home-icon。
- 收尾已做：stayon false、forward 9224 / reverse 4801 删除、桩 4801 按 pid 停；模拟器留运行。

## 3. 平板图标（只读核对 + 用户授权 force-stop）

- 三层核对：源码 res 五档 + anydpi-v26 自适应图标 + 棕底 #3D2C17 齐全；本地 v0.17 包与**平板 pull 的 base.apk**（versionCode 17、11-17 08:32 更新、6,703,346 字节 = 发版包）aapt2 全密度指向 mipmap-anydpi-v26/ic_launcher.xml。v0.16 前 manifest 用系统图标 @android:drawable/ic_menu_manage。
- 结论：HyperOS 桌面图标缓存不因 install -r 失效。用户授权后 force-stop com.miui.home（resolve-activity 取包名），桌面重起即新图标，**无需重启平板**。

## 4. 本轮坑（项目特有）

- apply_patch 会往 CRLF 工作区文件混入 LF 行（index.html 35 行）；改完用 .tools/__eol-check.cjs 对 HEAD 核、__eol-fix.cjs 归一。autocrlf 下提交 diff 不受影响，但工作区要纯。
- cmd package resolve-activity 必须 -a android.intent.action.MAIN -c android.intent.category.HOME 双带；缺 -a 回 No activity found。
- **脚本位置更正（报统筹）**：v0.17 批回归（__m10/__m6m8/__flowcard/__center/__width/__color-shot/__tarebar/__ver14/__release17）在**父仓 D:/vscode/.tools**；子模块 .tools 是 cdp-eval/hec-stub 等。子模块 AGENTS §3.7「__m6m8 已不在盘」是查错了目录，脚本齐全可复跑。

## 5. 待办（每步先问）

1. 闪屏修复装平板 / 发版 v0.18：待用户发话（版本号未 bump，发版时升）。
2. 父仓指针：b99640a 仍未推；本轮 51056e5 的指针提交也未建——建/推都待用户发话。
3. 功能设置/其他两分类内容等用户定义；profileFrame 真机色带验证是否被真杯覆盖问统筹/用户。
4. 夸克 v0.6 欠传：**用户 11-17 已取消、不传**（统筹 AGENTS §11 WIP 新口径；该文件是统筹未提交改动，本对话不碰不代提交）。

## 6. 别碰

v0.17 交接 §5 全部沿用；另：子模块根 AGENTS.md 统筹 WIP（§11 夸克口径更新）不碰不代提交；review/hec-icon/*、HANDOFF_2026-11-17-hec-live-cups.md 仍别对话未跟踪。

## 7. 产物索引

- 代码提交：51056e5；交接：本文件（随后提交）。
- 脚本（不入库）：父仓 .tools/__boot-check.cjs、__boot-state.js、__restart-emu.ps1、__eol-check.cjs、__eol-fix.cjs、__m10-bootfix.log、__m6m8-bootfix1/2.log、__flowcard-bootfix*.log、__boot-check.log；子模块 .tools/__apk-asset-check.ps1。
- 取证：review/hec-ui5/v22-*（gitignore，本地）。
