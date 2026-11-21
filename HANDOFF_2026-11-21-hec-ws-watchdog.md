# HEC APK WS 假死修复批交接（v0.37 候选，2026-11-21）

> 派单：统筹 01a1f8e8-499f-7513-a9cd-84b3af28bb14（用户 11-21 批「派对话改 WS 连接假死，按提案做」）。改码本批授权；发版/push/tag/装机另问（AGENTS 20）。基线 HEC main=6af225a（已推 origin）；工作区 HEAD=2a46d3c（统筹文档批 ahead 2 未推 f13a6dc/2a46d3c，不碰不代提交）。本批执行对话 01a1fb60-fdf6-7331-9a74-833bc46f7ae3。

## 1. 一句话现状

WS 假死三条修法已落 control.js 两份（www＋assets，SHA256 一致），模拟器回归 72+8+8 全绿＋WS 假死专项 17/17 全过；本批本地 commit（control.js 两份＋本交接），发版链待用户另批，真机验收另批。

## 2. 根因（统筹排查：杯25 真机＋logcat＋代码审）

机器夜间休眠后三路 WS（machine/scale/water）TCP 静默死亡：readyState 仍 OPEN、onclose 不触发，scheduleWsRetry 只挂 onclose 永不跑。machine WS 死→espresso 快照不到→newRun 不建→曲线冻在上一杯；scale WS 死→onSample 不调→影子零决策→重启整杯丢。重启即愈＝客户端 socket 死，服务端（插件/Streamline）正常。证据：logcat 旧进程 10223 无 crash、07:24:57 停帧、07:26:32 用户 SwipeUpClean 杀重开恢复。

## 3. 本轮改动（只改 APK 仓 control.js 两份；控制律/影子判定/写入面零改）

- **①WS 新鲜度看门狗 checkWsFreshness()**：借 poll() 700ms 成功路径查快照龄。conn ok＋mode control：machine WS OPEN 但机器快照龄 >5s（WS_MACHINE_STALE_MS=5000；machine 缺失以 wsOpenedAt 兜底）→closeWs()+openWs() 重建三路（machine 4Hz 常发含 sleeping 态为主判据）；extracting（ext.extracting || machine.state==='espresso'）时 scale WS OPEN 但秤样本龄 >3s（WS_SCALE_STALE_MS=3000）且 machine 新鲜（龄≤5s）→openScaleWs() 单独重建秤。idle 不以 scale 龄为判据（extracting 门控）不误触。重建是 WebView 本地 socket 操作，不发插件请求不占桥池，§0「萃取中不能干预取值」不变量安全；代价是重建瞬间样本空档（如实记录，未补平滑）。
- **②唤醒刷新**：doSleep() 唤醒（PUT idle）成功后＋onMachineSnapshot 观察 sleeping→idle/ready 转变（函数首捕获 prevMachineState，覆盖 Decaid/机器侧唤醒）：hello() 重握手＋checkWsFreshness()；门控 !extracting（machine espresso || ext.extracting）＋mode control＋baseUrl＋pluginOk。
- **③visibilitychange 增强**：回前台除现有 hello() 外补 !pollTimer→startPoll() 自恢复（startPoll 内含 hello）＋checkWsFreshness()。
- **重构**：openWs() 的 scale 创建抽成 openScaleWs()（逐字保留原 onmessage/onclose/onerror），供单独重建复用；openWs() 记 wsOpenedAt=Date.now()。
- diff：两份各 +46/-1（共 90 insertions / 2 deletions；2 删是 scale 块移入 openScaleWs）。SHA256 **8ADFA3C55BEDDE9B429993BF925754C03FE4645C44A578FFA68444E98F90F05C**（www=assets=APK 内 entry，94544 字节）。

## 4. 验证回执

- node --check 两份 exit 0；assets 同步哈希一致；APK 内 assets/www/control.js entry SHA256 与 www 一致（防 gradle 跳 assets 任务，v014 坑）。
- 构建 :app:assembleDebug BUILD SUCCESSFUL（versionCode 36 不升版，发版另批）；install -r 模拟器 emulator-5554（**不动平板**），dumpsys versionCode=36 / versionName=0.36 / lastUpdateTime=2026-11-21 00:43:01。
- **模拟器回归（提权，桩 __m6m8-stub 4801）**：__summary-regress **72/72**＋__boot-check **8/8**＋__coord-curvetag-test 分支 **8/8** 全绿。
- **WS 假死专项 17/17**（.tools/__ws-watchdog-test.cjs，不入库；hec-stub 4801 真 WS 10Hz＋客户端消息丢弃模拟 TCP 静默死亡；WebSocket 包装计数每路构造＋HxBridge Proxy 计数 external-hello，断言可观测效果非镜像）：
  - a 机器假死（OPEN＋machine.at 陈旧 >5s）→重建三路（构造计数 {machine:2,scale:2,water:2}→{3,3,3}）＋重建后机器快照恢复流动（新 socket msgs>0、dead=false）。
  - a-scale 萃取中秤假死（>3s）且机器新鲜→单独重建 scale（{4,4,4}→{4,5,4}，machine/water 不动）＋秤样本恢复流动。
  - c idle 秤停发（machine 新鲜、非萃取）→零重建（计数不变 {5,6,5}）。
  - b 唤醒 sleeping→idle→hello+1（5→6）；萃取中（ext.extracting true）sleeping→idle 转变→hello 门控挡住（6→6 不增）。
- 收尾：svc power stayon false、删本批 reverse tcp:4801 / forward tcp:9224、按端口停本批 hec-stub（pid 14696）；模拟器留运行。
- **最终验收真机另批**（本批不装机平板、不 adb 写平板）。

## 5. 本轮坑（项目特有）

- **4801 桩双口径**：__summary-regress 用 __m6m8-stub（REST＋/__setext，**不模拟 WS**，快照走 _injectMachine/_injectScale）；WS 假死专项须 hec-stub（真 WS 广播＋/__machine＋/__start＋PUT machine/state）。同端口换桩先精确停本批旧桩（Get-CimInstance 命令行过滤，提权），别 EADDRINUSE 静默。
- **Start-Process detached 起桩偶发首次即死**（日志空/端口拒连）：-PassThru 核 HasExited＋读 log 确认；本批 hec-stub 第二次起活（pid 14696）。
- **WS 假死注入须客户端丢消息**：Object.defineProperty 影子 onmessage＋addEventListener 分发、dead 旗标丢帧。单纯 Date.now 跳钟不行——真 WS 10Hz 会把 machine.at 刷成跳钟后的新值，龄判据失效。包装晚于连接时的 openWs（已用原 WebSocket），须 mode toggle replay→control 经 wrapper 重开 WS 才能接管当前三路。
- **萃取中秤单独重建判 extracting 用 machine.state espresso 兜底**：stub 杯 phase 经 dumping/soak 令 ext.extracting 间歇 false，machineState espresso 整杯不变（tick 不改 machineState）。
- gradle 增量构建 7s/3 executed 仍须核 APK 内 entry 哈希（assets 时间戳相同会跳任务）。

## 6. 待办（每步先问）

- 发版链（升 versionCode 37 / versionName 0.37→干净基线构建→模拟器装机回归→装平板 -r＋dumpsys→push→GitHub Release＋APK→夸克→父仓指针）：用户另批，本批不执行。
- push 本批 commit（统筹 ahead 2 文档批是否随推）：问用户（VPN 代理 127.0.0.1:57890）。
- 真机装机＋陪杯验证（夜间休眠后曲线/影子恢复、重建瞬间样本空档观感）：另批。
- 重建瞬间样本空档是否需补平滑（当前如实记录空档未补）：若用户要再议。

## 7. 别碰

- shadow.js / arbiter.js（控制律/影子判定/写入面零改已核）；插件仓 decenthyperexplugin、Decaid 皮肤、宿主配置只读。
- 别人未跟踪：HANDOFF_2026-11-17/18/19/20-*.md、review/hec-icon/*；统筹 ahead 2 文档批（f13a6dc/2a46d3c）不代提交不回滚。
- AGENTS §7 UI 口径全集（本批未动 UI，回归 72+8 证不回退）；§0 萃取中不能干预取值不变量。
- 平板（192.168.31.15:44439 / mDNS adb-haf6uwvcqcdujzin-trqoCZ）不动。

## 8. 产物索引

- 代码：app/www/control.js＋app/src/main/assets/www/control.js（本批 commit）。
- 测试脚本（.tools 不入库）：__ws-watchdog-test.cjs（专项 17）、__ws-state.cjs（状态探针）；日志 __sum-regress.log / __boot-check.log / __ws-watchdog.log / __hecstub4801.log。
- 取证：D:/vscode/.impeccable/review/hec-ui5/v22-*（boot-check 截图）。
