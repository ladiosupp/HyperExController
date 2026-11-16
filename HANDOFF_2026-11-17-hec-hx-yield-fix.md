# 交接：HX 曲线切曲线液重注入修复（2026-11-17）→ 模拟器回归 17/17，待用户确认装平板

> 前序：HANDOFF_2026-11-16-hec-yield-fix.md（液重停杯修复，非 HX 口径）。
> 技能：android-tablet-apk-dev（通用坑）、decentplugin §22（控制口径）。规矩照 AGENTS.md（7/15/16/19/20）。

## 0. 一句话现状

用户报：full 档用 HEC 做两杯 HyperEx Pulse Filter auto，都在 S2 中途 idle；回 Decaid/Streamline 正常、目标液重显示 0。
根因钉死：**HEC selectCurve 对 HX 曲线也注入拨轮残留液重到 context.targetYield**，Decaid SAW 按残留值（26g，拉杆配方带来）提前停杯。
已修（v0.15，versionCode 15）：HX 曲线改发曲线自己的 target_weight（真机 HX auto=0 → SAW 禁用、停杯交插件），非 HX 维持 11-16 拨轮口径。
模拟器回归 17/17 过。**装平板要先问用户（用户已明确：装前告知等确认）；发版另问。**

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

## 4. 待办（每步先问用户）

1. **装平板**：用户确认后 adb -s <tablet> install -r .tools/HyperExController_v0.15.apk（-r 保数据；平板 mDNS 见 coordinator 交接 §7）。
2. 真机验收：HEC 切 HX auto → Streamline 液重块应显示 0 → full 档出杯应完整跑到 ~100g 由插件写 Idle 收尾（stopReason=apiStop）；
   切拉杆仍跟拨轮液重到重停（11-16 口径不变）。验收杯建议用测试豆/用户自己的安排，别动真实仓数据口径无关。
3. 发版（push 走 VPN、Release、夸克）另问用户；主仓子模块指针更新随发版流程。
4. 已知边界（未改，超出本次授权）：Flow Calibration 曲线在 HEC 里 hx=false，切它仍发拨轮值——校准杯由插件主动停，
   理论上同样可能被 SAW 提前停；用户没报过，留待拍板是否同口径处理。

## 5. 别碰

- 插件仓与皮肤：本修复不涉及，两侧写法只是对照基准。
- 别人未跟踪文件：HANDOFF_2026-11-17-hec-live-cups.md（真杯取证对话）、review/hec-icon/。
- 同文件另一对话未提交改动：杯流卡显示层稳定化（flowDisp/EMA0.5/0.5s 刷新，用户 11-17 定）。
  本次提交用部分 staging（git apply --cached）只含 selectCurve hunk， theirs 原样留工作区；
  已构建的 v0.15 APK 含两者（回归 17/17 是在含两者的包上跑的），装平板前用户可决定是否等那边收尾。
- 温度链路、影子/仲裁、HX 液重锁本身。
