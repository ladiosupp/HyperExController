# 交接：HX 曲线切曲线液重注入修复（2026-11-17）→ v0.15 已发版装平板；v0.16 校准同口径就绪待发版（供统筹）

> 前序：HANDOFF_2026-11-16-hec-yield-fix.md（液重停杯修复，非 HX 口径）。
> 技能：android-tablet-apk-dev（通用坑）、decentplugin §22（控制口径）。规矩照 AGENTS.md（7/15/16/19/20）。

## 0. 一句话现状

用户报：full 档用 HEC 做两杯 HyperEx Pulse Filter auto，都在 S2 中途 idle；回 Decaid/Streamline 正常、目标液重显示 0。
根因钉死：**HEC selectCurve 对 HX 曲线也注入拨轮残留液重到 context.targetYield**，Decaid SAW 按残留值（26g，拉杆配方带来）提前停杯。
已修（v0.15，versionCode 15）：HX 曲线改发曲线自己的 target_weight（真机 HX auto=0 → SAW 禁用、停杯交插件），非 HX 维持 11-16 拨轮口径。
模拟器回归 17/17 过。**用户确认后已装平板并完整发版**（push / GitHub Release / 夸克，回执见 §6）。
用户随后拍板：Flow Calibration 同口径处理 + 父仓指针推。v0.16 已改好并回归 19/19（§8），**发版（装平板/推送/Release/夸克）待用户拍板**。

## 1. 根因与真机证据（2026-11-17 上午，插件 2.2.48，full 档）

- Decaid 停杯读 workflow.context.targetYield（shot_sequencer.dart:451，targetYield>0 && projectedWeight>=targetYield）；
  HX 曲线 target_weight=0 是设计如此（plugin.js profileObject，notes "Final stop is by Idle"）：插件在 finalWeight≈100g 自己写 Idle 收尾，SAW 必须禁用。
- Streamline 对照基准：profileManager.js 按 meta.targetYield ?? parseFloat(profile.target_weight) 取值随曲线发 context（HX auto → 0）。
- HEC selectCurve 原来无条件发 context.targetYield=拨轮值；HX 液重锁只拦 applyDials 与拨轮步进（initDials），不拦切曲线。
- 真机三杯（Decaid /api/v1/shots + 插件 history-export，证据文件 D:/vscode/.tools/__hec-*.json）：
  | 时间(本地) | Decaid stopReason | 当时 targetYield | 插件 result |
  |---|---|---|---|
  | 06:36 | targetWeight | 26 | S2 中途 "Machine returned to Idle before the programmed trigger" |
  | 06:59 | targetWeight | 26 | 同上 |
  | 07:00 | apiStop | 0 | "completed at 101.60 g"（完整 S1→泄压→S2→S3） |
- 26 来自拉杆配方（19→26）：HEC 拨轮从 context 回读 26，选 HX auto 时注入。07:00 那杯是回 Streamline 后（皮肤按曲线 tw=0 重发 context）出的，完整跑完——证明 0 才是 HX 正常态。
- hec/full 不是变量：11-15 两杯 hec 档同样 "completed at 101.8/102.0 g"（当时 yield=0）。变量是切曲线时谁写了 targetYield。
- 曲线本体没写坏：库里 HX auto 六步齐全，三杯 profileTruthVerified=true，无 profile-mismatch 安全停。
- 用户看到的「目标液重 0」= Streamline 按 HX 曲线 tw=0 显示/下发，是正常态，不是 bug。

## 2. 本轮改了什么（用户 2026-11-17 授权「改吧，装平板前告诉我」）

1. app/www/control.js selectCurve：HX 分支（c.hx）发 Number(c.profile.target_weight)（非有限数回退 0），非 HX 仍发 dial.weight.v。assets 已同步（哈希一致）。
2. app/build.gradle：versionCode 14→15、versionName 0.14→0.15。
3. .tools/hec-stub.cjs：PROFILES 追加真机同款 hx-auto0（title "HyperEx Pulse Filter auto"，target_weight=0）。
4. .tools/__yield-regress.cjs：旧第 5 项把 bug 当预期（HX 照带拨轮值），改为新口径；补 HX auto(tw=0)→ctx 0、HX 锁定应用不发 PUT、切回拉杆跟拨轮当前值；端口参数化（argv[2]，默认 4798）。共 17 断言。

## 3. 验证

- node --check 三份 JS 过；www 与 assets control.js SHA256 一致。
- gradle assembleDebug 过（.tools/__hx-yield-build.log）；APK 副本 .tools/HyperExController_v0.15.apk（6,701,624 字节）。
- 模拟器（emulator-5554）装 v0.15 + 4798 桩（plain/full）+ CDP 回归 **17/17**（.tools/__hx-yield-regress.log）。
  截图 D:/vscode/.impeccable/review/hx-yield-fix-auto0.png（HX auto 选中、拨轮 hxlock）。
- 收尾已做：stayon false、reverse/forward 已删、4798 桩已停（按端口定位，4795–4797 没碰）。
- 回归一个认知修正：HX 锁定下拨轮步进被 initDials 主动拒绝（control.js:1239），不是只锁应用按钮——断言按此口径。

## 4. 待办

1. ~~装平板~~ 已装（2026-11-17 07:40:04，versionCode 15，-r 保数据）。
2. **真机验收（用户出杯）**：HEC 切 HX auto → Streamline 液重块应显示 0 → full 档出杯应完整跑到 ~100g 由插件写 Idle 收尾（stopReason=apiStop）；
   切拉杆仍跟拨轮液重到重停（11-16 口径不变）。
3. ~~发版~~ 已完成（§6）。父仓指针只在本地，推不推问用户。
4. ~~Flow Calibration 边界~~ 用户 11-17 拍板同口径，已在 v0.16 实施（§8）。

## 5. 别碰

- 插件仓与皮肤：本修复不涉及，两侧写法只是对照基准。
- 别人未跟踪文件：HANDOFF_2026-11-17-hec-live-cups.md（真杯取证对话）、review/hec-icon/。
- 同文件另一对话未提交改动：杯流卡显示层稳定化（flowDisp/EMA0.5/0.5s 刷新，用户 11-17 定）。
  本次提交用部分 staging（git apply --cached）只含 selectCurve hunk， theirs 原样留工作区；
  已构建的 v0.15 APK 含两者（回归 17/17 是在含两者的包上跑的），装平板前用户可决定是否等那边收尾。
- 温度链路、影子/仲裁、HX 液重锁本身。

## 6. 发版回执（2026-11-17，用户授权「你先装平板和发版」）

- 构建：gradle assembleDebug 过（.tools/__hx-yield-build2.log）；APK **6,701,612 字节**，副本 .tools/HyperExController_v0.15.apk。
  内容 = 81f901d（本修）+ cfff2aa（UI 去皮光条）+ UI 对话未提交的杯流卡显示稳定化（用户知情同意随包）。
- 平板：adb mDNS install -r；dumpsys 实测 **versionCode=15 / versionName=0.15 / lastUpdateTime=2026-11-17 07:40:04**；am start 拉前台。
- push：origin main **66bb463..81f901d**（http.proxy=127.0.0.1:57890）；本交接提交随后再推。
- GitHub Release：**v0.15**，id **447756775**，https://github.com/ladiosupp/HyperExController/releases/tag/v0.15 ；
  附件 HyperExController_v0.15.apk（asset id 756885496，6,701,612 字节）。REST 建 + uploads 直传（gh 带附件挂死坑），token 走 git credential fill，均走 VPN 代理。
- 夸克：**夸克网盘/来自：Codex**，fileId **5ae0a3c8576a452b99f99370111c1521**，6,701,612 字节（CLI 1.0.25）。
- 父仓指针：D:/vscode 本地提交 60e51d1；**用户 11-17 拍板推**，回执见 §8。

## 7. 给统筹的话（用户转交）

- **定性**：APK 写 workflow 的边界 bug，不是插件控制律问题，也不是 full/hec 档差异。插件 2.2.48 与皮肤零改动；
  影子/仲裁（阶段 B/C）不受影响，离线结论不变。hec 档当时能跑完是因为那时 context.targetYield=0，不是档位差异。
- **真杯取证对话**：今早两杯失败根因已钉死，证据在 D:/vscode/.tools/__hec-shots.json / __hec-hx-history.json / __hec-wf.json / __hec-diag.json / __hec-ext.json，
  可直接补 HANDOFF_2026-11-17-hec-live-cups.md §2/§3。v0.15 后 HEC 切 HX 不再注入残留液重，full 档取证可继续。
- **UI 对话**：杯流卡显示稳定化（flowDisp/EMA）仍未提交，已随 v0.15 包发出（用户知情）；请尽快提交固化，避免下次构建漂移。
  cfff2aa（去皮光条）已随本次 push 上远端。
- **待拍板**：① ~~Flow Calibration 同口径~~ 已实施（v0.16，§8）；② ~~父仓指针推不推~~ 已推（§8）；③ 夸克 v0.6 历史欠传；④ v0.16 发版（装平板/推送/Release/夸克）。
- **口径澄清**：HX 杯停杯 = 插件 FinalWeight（≈100g）写 Idle；拨轮/SAW 不是 HX 的液重入口，改 HX 液重改插件设置。
  Streamline 显示目标液重 0 对 HX 是正常态（皮肤按曲线 target_weight=0 下发）。

## 8. v0.16 批次：Flow Calibration 同口径（2026-11-17，用户拍板「Flow Calibration 曲线同口径处理；父仓指针推」）

- 改：selectCurve 的例外判定从 c.hx 改为标题正则 /^HyperEx/i（pluginStop），**覆盖 HX 各曲线 + Flow Calibration**：
  切这类曲线 context.targetYield 一律发曲线自己的 target_weight（校准曲线也是 0 → SAW 禁用，校准由插件主动停在 hardStopG）。
  拨轮/应用锁（isHxSelected）未动——校准曲线拨轮仍可手动编辑，显式应用液重是用户主动动作，不在本次静默注入修复范围。
- 版本：build.gradle 16/0.16；assets 同步哈希一致；node --check 过。
- 回归：模拟器装 v0.16 + 4798 桩 + CDP **19/19**（.tools/__cal-regress.log；新增「校准曲线切曲线 context=0」两项）。
  APK 副本 .tools/HyperExController_v0.16.apk。收尾已做（stayon false、reverse/forward 删、4798 桩停）。
- 构建内容提示：含 c417157（UI 对话杯流卡同源+稳定化，已提交未推）+ 图标对话未提交 WIP（manifest icon→mipmap、
  index.html 卡片对齐、res/mipmap 与 values 新目录）——发版时用户知情决定要不要等图标对话收尾。
- 父仓指针推送回执：D:/vscode origin main（ladiosupp/coffee-bean-manager），60e51d1 随待推指针提交链一起上远端，走 VPN 代理 57890。
- **v0.16 发版待用户拍板**（装平板/推送/Release/夸克）；本批提交只在本地。
