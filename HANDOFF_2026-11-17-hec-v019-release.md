# HEC v0.19 发版回执（2026-11-17 晚，用户授权「按你计划继续吧，要发版就发版和装平板」）

> 轮名：hec-v019-release。派单：统筹 01a1e90d-5863-7000-ad55-21e1080d21e9（修复批1 复核通过：30/30+27/27+15/15、红线核过）。
> 内容：修复批1（e3d0d95，审计 M1/m2/m3/M2/M3/M4）发版 + 装平板 + 推送 + 父仓指针（用户授权随本批）。
> 基线：ea1fbbe（tracked 干净，仅别人未跟踪 .md/review/，不在构建路径）；www↔assets SHA256 9/9 一致。

## 0. 一句话现状

**v0.19 已发版装平板**：bump 2b64cac（19/0.19）、tag v0.19、GitHub Release id **448706115**（asset **759275727**，6,708,214 字节 state=uploaded）、夸克「/来自：Codex」fileId **261d49b037d744d591be32c3a6c37365**；平板 dumpsys versionCode 19 / lastUpdateTime 21:56:30，**10 杯真机旧归档自动迁移完整**；模拟器 boot 专项 + 七卡对齐复冒烟全过；子模块 main + tag 已推，父仓指针随本批建推。

## 1. 版本与构建

- bump：app/build.gradle versionCode 18→19 / versionName 0.18→0.19，提交 **2b64cac**（control.js appVer 兜底串仍旧，真机版本走 HxBridge.appVersion()=BuildConfig，实测 v0.19）。
- 构建：gradle assembleDebug --offline BUILD SUCCESSFUL；aapt2 dump badging 核 **versionCode='19' versionName='0.19'**。
- APK：**.tools/HyperExController_v0.19.apk，6,708,214 字节，SHA256 7B17DE581B2AD02A0DA2D0D35D3A82703DAA4B37768BB7F44D557C5FCE7B8854**。
- bump 不改逻辑：R2–R5 **27/27**、阶段 B **15/15**、审计探针 **30/30** 复跑全绿（含红线 P7：sent 恒 false + takeover 门）。

## 2. 模拟器回归复冒烟（hxpad，桩 4801 plain，提权侧）

- install -r Success；am start 后 **boot control 直达**：mode=control、controlView 显 / replayView+replayAside 隐 / controlAside 显、body hec-mode、标签「控制」（v0.18 闪屏修复保持）。
- appVer=**v0.19**、conn=**ok**（reverse 4801 重建后）、pluginVersion=2.2.48、loadState=**ready**（asset loader 路径）。
- boot 专项（等价 __boot-check 八断言，截图改 v019-* 名避免覆盖 v0.18 取证）：UI 切回放画布按可见容器重排重绘 **cFlow 878×150 CSS → 1756×300 @dpr2、ink 27179**；回放模式重启直达且画布同尺寸；切回控制恢复。取证 .tools/__v019-boot-control.png / __v019-boot-replay.png。
- 七卡对齐：标题 top **79.6×7 同一水平线**、卡高 **35×7**、侧栏溢出 **0**；双画布非空；样式 2/去皮/曲线弹窗沿用修复批1 冒烟（同 www）。
- 影子迁移复核：oldLen=0、cupKeys=**21**、exportCups=21（修复批1 的 20 杯 + M4 测量杯 stub-1794922875411），时序正确。

## 3. 平板装机 + 影子迁移核对（mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp）

- 装机前（v0.18）：conn ok（Decaid 在跑）、plugin 2.2.48、旧 kv 归档 **10 杯**（1794727769993-1 / 1794731835503-2 / live-1794782815357 / live-1794786975824 / live-1794829070738 / 1794868573594-3 / 1794869984844-4 / live-1794870710333 / 1794873721382-6 / 1794909699191-7）。
- install -r（保数据）；**dumpsys package 核：versionCode=19、versionName=0.19、lastUpdateTime=2026-11-17 21:56:30**（不信 install 回显）；am start 拉前台，pid 10003。
- 装机后：appVer=**v0.19**、conn=**ok**、loadState=**ready**、pluginVersion=2.2.48、控制页直达。
- **迁移核对：oldLen=0（旧 kv 键清空）、cupKeys=10、exportCups=10，runId 逐条不变**（首 1794727769993-1…末 1794909699191-7）——install -r 跨装机存活 + 首载迁移真机实证。
- asset loader 真机实证：页面 fetch https://appassets.androidplatform.net/assets/www/vendor/bc_v0.onnx → **200**；ort.env.wasm.wasmPaths 指 https（ORT 流式加载就绪）。
- 整屏截图取证：.tools/__v019-tablet.png（CDP 通道 forward 9223）。

## 4. 推送 / Release / 夸克

- 子模块 push（VPN 代理 127.0.0.1:57890）：**main 9a405f5..2b64cac**（含统筹规矩 ca82a72/ea1fbbe、修复批1 e3d0d95、bump 2b64cac）；**tag v0.19 → 2b64cac**（bump 提交，沿用 v0.18 惯例）；ls-remote 核 main 与 tag 均 2b64cac1c4d904f2fe4a894a25163d17e134b5ed。交接提交随后再推 main（见 §6）。
- GitHub Release REST：**id 448706115**，tag/name v0.19，body 中文修复摘要。
- 附件：**curl.exe --proxy -H 'Expect:' --data-binary 耐慢传成功 http=201**，耗时 **452s、~14.8KB/s**（本晚 VPN 上行比 v0.18 的 ~45KB/s 更慢，Invoke-RestMethod 必 reset，curl 单进程 + cell 内轮询到 exit，无孤儿）；**asset id 759275727，state=uploaded，size=6,708,214 与本地一致**；无 starter 残留（未用 DELETE）。
- 夸克 CLI：session **1794924410-1hm4ex**（search+upload 复用），--session-input 用户原话；目录 fid 经 search --keyword "来自：Codex" --search-type dir --stdout-only；upload --parent-fid → **fileId 261d49b037d744d591be32c3a6c37365**，HyperExController_v0.19.apk，6,708,214 字节，fullPath 夸克网盘/来自：Codex，instantUpload=false，result 无 notice。

## 5. 红线与边界

- 发版不改逻辑：sent 恒 false（全仓 external-flow 仅 3 行注释）、第 1 层硬包线、单一写者——探针 P7 + 平板/模拟器导出 sentTrue=0。
- 只 add 本批：build.gradle bump + 本交接（子模块）、HyperExController 指针（父仓）；别人未跟踪文件（HANDOFF_2026-11-17-hec-code-audit.md / HANDOFF_2026-11-17-hec-live-cups.md / review/hec-icon/）未碰未代提交。
- 版本号同步升；install -r 保数据（平板 10 杯迁移实证）。

## 6. 父仓指针与收尾

- 父仓 D:/vscode：git add HyperExController（只指针）→ 提交「子模块指针更新到 v0.19 发版回执」→ push origin main（VPN 代理，先子模块后父仓）；指针指向本交接提交（hash 见父仓 log，自指不入文）。父仓其他未跟踪/改动（bestpresso/browse/decenthyperexplugin 等别对话 WIP）未碰。
- 收尾已做：模拟器 stayon false、forward 9224 / reverse 4801 删除、桩 4801 按 pid 精确停；平板 forward 9223 删除；无孤儿 curl（进程核过）。模拟器/平板均留 v0.19。

## 7. 待办（每步先问）

1. m1 软预算墙（控制行为）及其余审计 minor（m4/m5/m7–m18）另批另授权；i2 切档/发送面阶段 D 有意暂缓。
2. hec 档 §8 链路清单真机演练仍待用户有空；功能设置/其他两分类内容等用户定义。
3. 真机 full 杯继续随缘攒（matched 校准素材口径，AGENTS §11）；出杯前复冒烟清单照旧。
4. 夸克 v0.6 历史欠传用户已取消，不传。

## 8. 产物索引

- 提交：bump 2b64cac；交接本文件（随后提交）；父仓指针提交（见父仓 log）。
- APK：.tools/HyperExController_v0.19.apk（gitignore）；构建日志 .tools/__v019-build.log。
- 取证（gitignore）：.tools/__v019-boot-control.png / __v019-boot-replay.png / __v019-tablet.png；日志 __v019-emu.log / __v019-tablet.log / __v019-quark-search.log / __v019-quark-upload.log / __v019-upload.json；release id __v019-release-id.txt；quark session __v019-quark-sid.txt。
- 复冒烟表达式：.tools/__v019-boot-state.js / __v019-canvas.js / __v019-to-replay/control.js / __v019-pre-kick/read.js（平板装机前计数）。

## 来源对照

- 修复批1 = HANDOFF_2026-11-17-hec-fix-batch1.md（e3d0d95）；审计 = HANDOFF_2026-11-17-hec-code-audit.md（未跟踪，上一轮交付）
- v0.18 发版坑 = HANDOFF_2026-11-17-hec-boot-flash-fix.md §8（curl 耐慢传 / DELETE 路径 / 孤儿进程）
- SOP = 本仓 AGENTS.md §4 + android-tablet-apk-dev 技能；夸克 = quarkclouddrive 技能 CLI
