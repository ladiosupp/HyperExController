# HEC v0.20 发版回执（2026-11-18 早，用户授权「发版装机吧」）

> 轮名：hec-v020-release。派单：统筹 01a1e90d-5863-7000-ad55-21e1080d21e9（批2 复核通过：探针 50/50 + R2–R5 27/27 + 阶段 B 15/15 + m5 parity 6/6、红线核过）。
> 内容：修复批2（0ab52ac，审计剩余 20 项）发版 + 装平板 + 推送 + 父仓指针（用户授权随本批）。
> 基线：5719e10（tracked 干净，仅别人未跟踪 .md/review/，不在构建路径）；www↔assets SHA256 9/9。

## 0. 一句话现状

**v0.20 已发版装平板**：bump 49fde42（20/0.20）、tag v0.20、GitHub Release id **449265886**（asset **760851479**，6,712,854 字节 state=uploaded）、夸克「/来自：Codex」fileId **82fe1e90bfa5459da40b0eb76da33cfb**；平板 dumpsys versionCode 20 / lastUpdateTime 2026-11-18 06:15:47，影子 10 杯装机前后一致；模拟器 boot 直达 + 七卡对齐复冒烟全过；子模块 main + tag 已推，父仓指针随本批建推。

## 1. 版本与构建

- bump：app/build.gradle versionCode 19→20 / versionName 0.19→0.20，提交 **49fde42**。
- 构建：gradle assembleDebug --offline BUILD SUCCESSFUL；aapt2 dump badging 核 **versionCode='20' versionName='0.20'**。
- APK：**.tools/HyperExController_v0.20.apk，6,712,854 字节，SHA256 0AFBBFD2E6AE624ECC6B0733A107B05D41E8BA2C996F53FAB8A89714E18643AC**。
- bump 不改逻辑：R2–R5 **27/27**、阶段 B **15/15**、审计探针 **50/50**、m5 parity **6/6** 复跑全绿（含红线 P7）。

## 2. 模拟器复冒烟（hxpad，桩 4801 plain，提权侧）

- install -r Success；am start 后 boot 控制直达（mode=control、视图/hec-mode/标签正确）。
- appVer=**v0.20**、conn=**ok**、pluginVersion=2.2.48、loadState=**ready**。
- 七卡对齐：标题 top **79.6×7**、卡高 **35×7**、侧栏溢出 **0**；遥测胶囊「遥测 0.1/0.1s」（i7 保持）。
- 取证：.tools/__v020-emu.png。

## 3. 平板装机 + 影子杯数核对（mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp）

- 装机前（v0.19）：conn ok、per-cup store **10 杯**（oldLen=0，v0.19 已迁移；首 1794727769993-1…末 1794909699191-7）。
- install -r（保数据）；**dumpsys package 核：versionCode=20、versionName=0.20、lastUpdateTime=2026-11-18 06:15:47**（不信 install 回显）；am start 拉前台，pid 3460。
- 装机后：appVer=**v0.20**、conn=**ok**、loadState=**ready**、pluginVersion=2.2.48、控制页直达。
- **杯数核对：cupKeys 10 == 装机前 10，exportCups 10，runId 逐条不变**——install -r 保数据实证。
- 整屏截图取证：.tools/__v020-tablet.png（CDP forward 9223）。

## 4. 推送 / Release / 夸克

- 子模块 push（VPN 代理 127.0.0.1:57890）：**main 8332f87..49fde42**（含批2 0ab52ac、统筹规矩 5719e10、bump）；**tag v0.20 → 49fde42**（bump 提交，v0.18/v0.19 惯例）；ls-remote 核 main 与 tag 均 49fde42c524a70b3020f2f8326e355359ca460ac。交接提交随后再推 main（见 §6）。
- GitHub Release REST：**id 449265886**，tag/name v0.20，body 中文批2 修复摘要。
- 附件：**curl.exe --proxy -H 'Expect:' --data-binary，http=201，4.1s、~1.63MB/s**（今早 VPN 上行远快于昨晚 14.8KB/s，仍按耐慢传配方单进程 + cell 内轮询到 exit）；**asset id 760851479，state=uploaded，size=6,712,854 与本地一致**；无 starter 残留（未用 DELETE）。
- 夸克 CLI：session **1794924410-1hm4ex**（本对话 v0.19 起复用），--session-input 用户原话「发版装机吧」；目录 fid 经 search --keyword "来自：Codex" --search-type dir --stdout-only；upload --parent-fid → **fileId 82fe1e90bfa5459da40b0eb76da33cfb**，HyperExController_v0.20.apk，6,712,854 字节，fullPath 夸克网盘/来自：Codex，instantUpload=false，result 无 notice。

## 5. 红线与边界

- 发版不改逻辑：sent 恒 false（零发送代码）、第 1 层硬包线（i5 共用实现）、单一写者——探针 P7 含在 50/50；批2 模拟器导出 sentTrue=0。
- 只 add 本批：build.gradle bump + 本交接（子模块）、HyperExController 指针（父仓）；别人未跟踪文件（HANDOFF_2026-11-17-hec-code-audit.md / HANDOFF_2026-11-17-hec-live-cups.md / review/hec-icon/）未碰未代提交。
- 版本号同步升；install -r 保数据（平板 10 杯核对实证）。

## 6. 父仓指针与收尾

- 父仓 D:/vscode：git add HyperExController（只指针）→ 提交「子模块指针更新到 v0.20 发版回执」→ push origin main（VPN 代理，先子模块后父仓）；指针指向本交接提交（hash 见父仓 log，自指不入文）。父仓其他未跟踪/改动（别对话 WIP）未碰。
- 收尾已做：模拟器 stayon false、forward 9224 / reverse 4801 删除、桩 4801 按 pid 精确停；平板 forward 9223 删除；无孤儿 curl。模拟器/平板均留 v0.20。

## 7. 待办（每步先问）

1. 阶段 D（闭环发送）/ hec 档 §8 链路清单真机演练仍待用户授权与有空；i2 切档/发送面有意暂缓。
2. 控制中心「功能设置 / 其他」两分类内容等用户定义。
3. 真机 full 杯继续随缘攒（matched 校准素材口径，AGENTS §11）；出杯前复冒烟清单照旧（版本/心跳/mode=full/秤遥测几百 ms/胶囊亮/前台亮屏，逐杯导出）。
4. 审计项已全清（批1+批2），无剩余 minor；m11 杯分裂权衡见批2 交接 §4。

## 8. 产物索引

- 提交：bump 49fde42；交接本文件（随后提交）；父仓指针提交（见父仓 log）。
- APK：.tools/HyperExController_v0.20.apk（gitignore）；构建日志 .tools/__v020-build.log。
- 取证（gitignore）：.tools/__v020-emu.png / __v020-tablet.png；日志 __v020-emu.log / __v020-tablet.log / __v020-quark-search.log / __v020-quark-upload.log / __v020-upload.json；release id __v020-release-id.txt。

## 来源对照

- 批2 = HANDOFF_2026-11-17-hec-fix-batch2.md（0ab52ac）；v0.19 = HANDOFF_2026-11-17-hec-v019-release.md；发版坑 = HANDOFF_2026-11-17-hec-boot-flash-fix.md §8
- SOP = 本仓 AGENTS.md §4 + android-tablet-apk-dev 技能；夸克 = quarkclouddrive 技能 CLI
