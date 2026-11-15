# 交接：HEC 控制页 UI/功能 v0.2→v0.3（2026-11-15 第二轮）

> 前序：HANDOFF_2026-11-15-hec-shadow-arbiter.md（影子链路/训练管线/架构口径，本仓库根）。
> 技能：android-tablet-apk-dev（通用坑唯一维护处，本轮新增 references/emulator-regression.md）、decentplugin §22。
> 规矩照 AGENTS.md（7 四件事、20 先问、16 中文、15 正斜杠链接、17 小字只状态/标题、18 推送走 VPN）。
> **本轮只做 APK 侧 UI/功能，插件一行未动。用户真机跑完一杯，报「好几个功能性问题」但尚未逐条点名——新对话先听用户列问题，按 AGENTS 20 先问再改。**

## 0. 一句话现状

HEC 仓库 HEAD 5b01e4d（v0.3，versionCode 3），父仓库指针 7720805，均未推送。
平板与模拟器 hxpad 都已装 v0.3。真机插件 2.2.48、hec 档、握手 ok、影子模型 ready；用户已真机出杯一杯
（影子应已落 IndexedDB hecShadowCups，**未导出核对**）。工作区除本交接外干净。

## 1. 本轮改动（v0.2 = 7037774，v0.3 = 5b01e4d）

- **休眠弹窗** openSleepModal：点击先 GET /api/v1/machine/state。待机(idle/ready)→「当前状态 [胶囊] 确定让咖啡机休眠吗？」**同一行** + 取消/确定休眠；非待机→「当前状态 [胶囊] 机器不在待机状态」同一行 + 知道了；查询失败→「无法获取机器状态」+ 取消。sleepSeq 代数防护：closeModal 自增，迟到响应丢弃。已休眠时按钮本就是「唤醒」，点了直接唤醒不弹窗。样式 .sleep-stat/.sleep-ask/.sleep-note/.sleep-check（index.html）。原「会中断萃取」长说明已删。
- **状态映射** machinePillInfo()（顶栏与弹窗共用）：sleeping/sleep→已休眠(蓝)、espresso→萃取中、heating/warmup/warming/子状态 heating/**子状态 preparingforshot**→加热中(琥珀呼吸点)、ready/idle→待机(绿)、其他原词、空→未连接。machineSubstate 在 onMachineSnapshot 与弹窗查询两处同步。machineAsleep 认 sleep/sleeping。
- **握手胶囊**：hec 档且 !helloOk 时 .hb.off.clickable 显示「未握手」，点击→hello()（helloBusy 防重入）；非 hec 档仍「未握手 · 只读」不可点。解决「先开 HEC 再唤醒」补握手。
- **侧栏/拨轮**：aside 216→219px；.dial-num 加 nowrap+min-width:0；.dv 27→26px；三角 padding 11→8px。最坏值 300.0/100.0 实测数字区 114px 不裁切（模拟器量过 scrollWidth==clientWidth）。
- **HyperEx 液重锁定**：renderApply 给液重卡加 hxlock（左侧光带暗红 #b04a44 渐变）+ locked；bump/三角 click/pointerdown 拦截并 toast「液重由插件控制」；applyDials 的 weight 分支 isHxSelected 时只 toast 不写。**删除了原 POST plugin settings FinalWeight 路径**（会 reload 插件丢心跳，且用户不允许改）。非 HyperEx 曲线液重仍 PUT workflow target_weight；温度整条平移写曲线逻辑未动。
- **模式下拉副标题修复**：原来 data-i18n 用裸键 modeSub1/modeSub2，中文下 t() 回退显示键名；改 id + 中文键（'选曲线 · 调温重量 · 实时调流'/'ProfileReplayer 原页'），onLang 里刷新。
- **标题配色定稿**：h1 .ttl 小写灰 #8b93a1、.ttl-a（H/E/C 三个大写）白 #ffffff、.appver 版本号琥珀 #e8833a。用户依次否掉琥珀/红/黄方案后定的这版，别再改回去。
- 版本 0.1→0.2→0.3。

## 2. 真机实测事实（别猜，已量过）

- Decaid GET /api/v1/machine/state 返回 {state:{state,substate}, mixTemperature, groupTemperature, targetGroupTemperature,...}。
  休眠=sleeping/idle；**加热期=idle/preparingForShot**（group 78→92 爬温，**没有 heating 字符串**）；热好=idle/idle；萃取=espresso。
- 平板插件已升 2.2.48：pluginOk/hecMode/helloOk 全 true；WebView 视口 1138×633。
- 真机 CDP 里同步 XHR 读 8080 可行（无 CORS 问题的是桥；页面内 XHR 回环也通）。

## 3. 通道 / 复跑

- adb：D:/android-dev/sdk/platform-tools/adb.exe。真机 -s adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp（mDNS，端口重启会变）；模拟器 emulator-5554。
- CDP：pidof com.ladios.hxcontroller → forward tcp:9223(真机)/9224(模拟器) localabstract:webview_devtools_remote_<pid> → node .tools/cdp-eval.cjs <port> <exprFile> [shotPath]。**只同步求值；同步循环别超 ~15s**——本轮 40s 循环把 CDP 挂死（socket hang up），force-stop+重拉+重 forward 恢复。App 重启 pid 变要重 forward。
- 构建：JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9、GRADLE_USER_HOME=D:/android-dev/gradle-home、D:/android-dev/gradle/gradle-8.7/bin/gradle.bat -p D:/vscode/HyperExController assembleDebug。**改 www 先 Copy-Item 同步 assets**（vendor 子目录单独）。
- 联调桩 .tools/hec-stub.cjs（提权侧起）：4795=上一轮对话遗留桩（无注入口，**别 kill**）；4797=本轮桩，带 /__machine（POST {state,substate} 注入机器状态）、/__hb（POST {drop:true} 丢心跳）、/__start（开杯）。模拟器已 reverse tcp:4797，App 指向 4797；真机 App 指向 8080 真 Decaid。
- 验证脚本 .tools/__sleep-check/*.js：e1/e2 读状态/点击，v-* 各分支（状态映射/握手/锁定/宽度/标题），t-* 真机只读，f-* 用 **Proxy 包 window.HxBridge** 造查询失败/延迟（桥是 Java 注入对象，直接给方法赋值不生效）。截图同目录 *.png，不入库。
- 模拟器回归前 stayon true + WAKEUP + am start；收尾 stayon false。

## 4. 技能更新（本轮已落盘）

- android-tablet-apk-dev：新增 references/emulator-regression.md（装 APK+桩+CDP 功能回归流程），SKILL.md 挂链接；pitfalls 新增 27（agent-browser 无 eval --file，用 --stdin/-b；socket 目录沙箱写不了要提权）、28（file:// 页面 IndexedDB 按目录隔离，跨页传配置走真实 UI）。

## 5. 待办（新对话按顺序）

1. **听用户列真机功能性问题**（跑完一杯后发现的，明细未知）→ 只读排查 → 按 AGENTS 20 先问再改。
2. 影子杯数据核对：真机 IndexedDB hecShadowCups 应有本轮那杯，HxShadow.exportJSON() 可导；确认 sent 恒 false、仲裁记录齐全。
3. 沿用前序 §8：攒影子数据 → 学习仲裁(LightGBM) → 植物模型 S3 修正 → 自动发送须协议 §8 联调清单+用户同意 → 发版(升版本/构建/真机回归/Release/夸克)先问。

## 6. 别碰

- 插件仓库 D:/vscode/decenthyperexplugin 别人未提交的改动；父仓库未跟踪目录（bestpresso/、browse/、output/ 等）。
- 4795 桩进程是别的对话起的。
- .tools/ 不入库；review/sleep-modal-mock/ 已随 v0.2 入库（示意图+png）。

