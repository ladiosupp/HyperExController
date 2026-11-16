# HEC 自定义图标接入交接（2026-11-17，图标设计与接入对话）

> 角色：图标设计 + APK 资源接入对话。给统筹对话（01a1e44a-d4bb-7b82-ac7f-fe101d439a53）、UI 对话、发版对话。
> 结论一句：HEC 自定义图标（4B 共笔画连字 + 棕底 crema 配色）已进 APK 资源与 manifest，本地 assembleDebug 通过、
> 图标逐密度核进包；**未装平板、未发版、未推送、未提交**，versionCode/versionName 未动（15 / 0.15）。

## 一、设计口径（用户拍板）

- 生图走百炼 `bl image generate`（token-plan profile，wan2.7-image），4 个字母标方向多轮抽卡；
  用户选定 **4B 结构**（H/E 共竖、E 上下横 45° 斜切桥接 C、C 为径向开口环）+ **4 号配色**（espresso 棕底 + crema 字）。
- 精修为精确矢量，纯色平涂（去掉生成图纹理）。色值：底 `#3D2C17`、字 `#F5C078`。
- 几何参数（1024 画布母版，改设计时照这份改）：笔画宽 64；字高 336（y 344–680）；
  H 左竖 x172–236、共竖 x348–412；E 中横止 x500；E 上/下横斜切 45°（顶边止 x590、底边止 x534）；
  C 环心 (684,512)、外 R168 / 内 R104、开口 ±47° 径向切；整体按包围盒自动居中。
  legacy 方形标宽占画布 62%，自适应前景占 60%（在 66dp 安全区内）。
- 设计稿 / 卡池 / 最终产物 / 生成脚本都在 `review/hec-icon/`（**不进包**）；
  母版 `review/hec-icon/final/hec-icon.svg`，单一几何源脚本 `review/hec-icon/final/build-icon.ps1`。

## 二、改动清单（仅本批，已本地提交、未 push）

- 新增 `app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/` 各 3 张：
  `ic_launcher.png`（48/72/96/144/192）、`ic_launcher_round.png`（同）、`ic_launcher_foreground.png`（108/162/216/324/432，透明底）。
- 新增 `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` 与 `ic_launcher_round.xml`：
  adaptive-icon，background=`@color/ic_launcher_background`、foreground=`@mipmap/ic_launcher_foreground`。
- 新增 `app/src/main/res/values/colors.xml`：`ic_launcher_background = #3D2C17`。
- `app/src/main/AndroidManifest.xml` 两行：`android:icon` 由 `@android:drawable/ic_menu_manage` 改 `@mipmap/ic_launcher`；
  新增 `android:roundIcon="@mipmap/ic_launcher_round"`。不碰任何逻辑代码。
- 新增 `review/hec-icon/`（设计资产）与本交接文档。
- 入库范围：res 全部新增 + manifest + 本交接 + `review/hec-icon/final/`（SVG/脚本/成品 PNG）与 `final-preview.png`；
  过程卡池（`c*-*.png`、`r3-*`、`r4-*`、`dbg-*`、contact-sheet / card-pool / color-pool）**不入库**，仅本地留存。

## 三、验证回执（2026-11-17 实测）

- `gradle -p app assembleDebug` BUILD SUCCESSFUL（mergeDebugResources / processDebugResources / packageDebug 实际执行）。
- APK zip 条目：15 张 mipmap PNG + 2 个 anydpi-v26 XML 全在（res/mipmap-*-v4/…）。
- `aapt2 dump badging`：application-icon-120/160/240/320/480/640/65534 全部指向
  `res/mipmap-anydpi-v26/ic_launcher.xml`（自适应图标生效）；package versionCode=15 / versionName=0.15 未变。
- 四形态目视预览：`review/hec-icon/final-preview.png`（legacy 方/圆、自适应圆/圆角方遮罩）。

## 四、没做 / 边界（统筹拍板用）

- **未装平板、未发版、未 push**；本批已本地提交（只含图标资源/manifest/交接/设计源）。工作区还有 UI 对话未提交的
  `app/www/index.html` 与 `app/src/main/assets/www/index.html`，本批不碰不提交不回滚）。
- **本次构建的 assets 含 UI 对话那份未提交 index.html**（gradle 打磁盘现状）——该 APK 只作图标验证，
  **不是发版基线**；发版照 SOP 先升版本号 + 装机回归，且先问用户。
- 图标换装不影响 www / 桥 / shadow / arbiter 任何逻辑；真杯取证对话的只读口径不受影响。

## 五、以后改图标怎么复现

1. 改 `review/hec-icon/final/build-icon.ps1` 的几何 / `$bgHex` / `$fgHex`（同步改 values/colors.xml），重跑脚本出 SVG + 全部 PNG。
   注意 PowerShell 变量名不区分大小写：脚本里已避开 `$S/$s`、`$R/$r` 这类配对，别改回去。
2. 把 15 张 PNG 覆盖进 res（在 HyperExController 根目录跑）：
   ```powershell
   $src='review/hec-icon/final'; $map=@{mdpi=@(48,108);hdpi=@(72,162);xhdpi=@(96,216);xxhdpi=@(144,324);xxxhdpi=@(192,432)}
   foreach($k in $map.Keys){ $d="app/src/main/res/mipmap-$k"
     Copy-Item "$src/legacy-$($map[$k][0]).png" "$d/ic_launcher.png" -Force
     Copy-Item "$src/round-$($map[$k][0]).png" "$d/ic_launcher_round.png" -Force
     Copy-Item "$src/foreground-$($map[$k][1]).png" "$d/ic_launcher_foreground.png" -Force }
   ```
3. 重新 assembleDebug + badging 核对（命令见下）。

## 六、引用

- 工具链（沿用 v013 交接口径）：adb=D:/android-dev/sdk/platform-tools/adb.exe；
  gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；
  GRADLE_USER_HOME=D:/android-dev/gradle-home；构建/adb 一律提权（技能 android-tablet-apk-dev 硬规矩）。
- 通用坑不重复，按条号引技能 android-tablet-apk-dev 的 references/pitfalls.md。
- 生图工具备忘：百炼 `bl image generate --n 2` 在该端点会丢提示词返回无关图（2.10.1 实测），
  抽卡一律 `--n 1` 单张请求；qwen-image-3.0 在 token-plan 端点 404，用 profile 默认 wan2.7-image。

