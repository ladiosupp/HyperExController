# 交接：HEC v0.4→v0.5（2026-11-15 第三轮）

> 前序：HANDOFF_2026-11-15-hec-ui-v03.md（v0.3 现状/通道/真机事实）、HANDOFF_2026-11-15-hec-shadow-arbiter.md（影子/仲裁/架构口径）。
> 技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22。
> 规矩照 AGENTS.md（7 四件事、20 先问、16 中文、15 正斜杠链接、17 小字只状态/标题、18 推送走 VPN）。
> **本轮只做 APK 侧，插件一行未动。用户真机列的功能问题已全部落地；温度传感器选择问题用户另开新对话完善（见 §6）。**

## 0. 一句话现状

HEC 仓库 HEAD 5e6a0aa（v0.5，versionCode 5），tag v0.5，main 与 origin 同步，GitHub Release v0.5 带 APK。
父仓库指针已更新到 5e6a0aa。平板与模拟器 hxpad 都已装 v0.5。夸克「来自：Codex」目录有 v0.4/v0.5 两个 APK。
工作区干净。真机验收需 Decaid 唤醒（8080 有服务）后看水位/去皮/滤波。

## 1. 本轮改动（v0.4 = 7414485，v0.5 = 5e6a0aa）

### v0.4（功能）
- **前台常亮**：MainActivity onCreate 加 FLAG_KEEP_SCREEN_ON；切后台/退出自动恢复系统熄屏。用户定「前台常亮」而非精确 20 分钟计时。
- **去皮**：点秤重卡片 → PUT /api/v1/scale/tare，失败回退 POST（NSX 皮肤同款端点，web-ui/NSX-skin/core/api.js 可查）。成功 toast「已去皮」；**萃取中拒绝**（ext.extracting 或 machine.state=espresso）toast「萃取中不可去皮」且不发请求。tareBusy 防重入；成功后清 run.lastWeight/lastStamp 防跳变误判。卡片不加说明小字（AGENTS 17），只有 title 提示。
- **曲线保留**：杯结束（机器回 idle/ready/sleeping）run 冻结（runEnded/runEndedAt），样本/色带/指令台账不再追加，计时停住；**下一次开杯（extracting 且 (!run||runEnded)）才新建清空**。影子 onCupEnd 钩子不变。
- **水位胶囊**：官方 WS ws/v1/machine/waterLevels（与插件同源，字段 currentLevel/refillLevel，mm）。第三路 WS，随 openWs/closeWs/重连。胶囊在**休眠按钮左侧**（#hstat[hidden]~ 的 margin-left:auto 规则链保证贴右组）。≥33 满格淡蓝；18–33 淡蓝按 mm/33；12–18 黄；<12 红+「缺水」前缀、进度固定 10%。无数据/未连接隐藏。
- **RAW 滤波**：仅显示层。居中时间窗滑动平均（双指针 O(n)）实线为主体 + 原始散点（alpha .28、stride 限 600 点）。窗宽拨轮在 RAW 开关旁：0=关、0.5–2.0 步长 0.1、0.5 下一档=0、默认 1.0s。**趋势角 maybeCheck 与影子仍用原始 s.raw，不受滤波影响**。图例随开关变（RAW 滤波/原始散点 vs RAW dW/dt）。
- **IDLE 胶囊缩字**：相位胶囊仅 idle 加 .idle 类，16→12px（S1/S2/S3 不变）。

### v0.5（布局紧凑化）
- **状态卡单行**：.hec-cards .card 改 flex（标题左/数值右，baseline 对齐），卡高 56→38px，曲线区增高。
- **侧栏去滚动条**：kv 行高 21→17px（font 11px/1.35 + padding 1px）；hecbox padding 9→7；**去掉「HEC·本杯锁定」hecchip**；「本杯锁定」蓝色小胶囊移到曲线卡 curveTag 右侧（.curvetags flex 行，仅 hx 且未接管显示，renderCurveBtn 控制）；aside gap 10→8。真机视口 1138×633 实测 scrollH==clientH==574，溢出 0。

## 2. 本轮踩的坑（项目特有）

- **曲线保留第一版堆叠 bug**：冻结后①空闲秤快照仍 push 样本（t 全用冻结时刻→竖线堆叠）②noteExternal 仍 push 色带/指令③下一杯 !run 条件不新建。修法：所有追加处加 !runEnded 守卫 + 开杯条件 (!run||runEnded)。**教训：保留类改动必须测「冻结后不增长 + 第二杯重建」，只测 UI 开关会漏**（用户真机发现「曲线堆在一起」）。
- **4797 旧桩占 port**：上一轮对话的 4797 桩进程还活着，新桩起不来（EADDRINUSE 静默）。先 Get-CimInstance Win32_Process 核命令行再 Stop-Process 精确 pid；**4795/4796 是别的对话的，别 kill**。
- **回归断言 vs DOM 归一化**：style.width 设 "100.0%" 读回 "100%"，断言写错会假失败；先按读回值写断言。
- **真机 CDP 偶发 TIMEOUT**：重 forward + 亮屏重试即恢复（技能硬规矩）；conn=bad 多数是 Decaid 没在跑，不是代码问题。
- **CDP 量窄屏**：Emulation.setDeviceMetricsOverride 1138×633 后必须强制重排+resize+等 400ms 再量（.tools/__v04-viewport.cjs 已封装，传 expr 文件+可选截图路径）。

## 3. 通道 / 复跑

- adb/构建/CDP 同 v0.3 交接 §3。真机 mDNS 名 adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp；模拟器 emulator-5554。
- **桩 .tools/hec-stub.cjs 本轮新增**：/__water POST {current,refill} 注水位；/__tare GET 看去皮计数；PUT/POST /api/v1/scale/tare 归零 weight；WS 第三路 waterLevels 每 100ms 广播。4797 桩本轮已重启为新版（提权侧）。
- **回归脚本（.tools/，不入库）**：__v04-regress-a.cjs（水位四档+边界+去皮 9 项）、__v04-regress-b.cjs（曲线保留/冻结不堆叠/第二杯重建/IDLE 字号/水位贴左 7 项）、__v04-regress-c.cjs（滤波拨轮档位/关/图例/绘制 9 项）。**套件之间重启 App**（防 CDP 挂死）。b 需等桩一杯 34s。
- 截图取证在 D:/vscode/.impeccable/review/v04-*.png（gitignore）。

## 4. 验证回执

- 回归 A 9/9、B 7/7、C 9/9（模拟器+4797 桩）。
- 布局：1280 与 1138×633 两档视口状态卡无裁切、侧栏溢出 0。
- 真机/模拟器装机 versionName=0.5 核对过；GitHub push（VPN 57890）+ Release v0.5 + 夸克上传均成功。
- **未做**：真机带 Decaid 的功能验收（水位真实 mm、去皮真秤、滤波真噪声）——用户唤醒机器后自验，有问题按只读排查→先问再改。

## 5. 别碰

- 插件仓库别人未提交改动；父仓库未跟踪目录；4795/4796 桩进程。
- 标题配色（h1 灰/大写白/版本号琥珀）是 v0.3 定稿，别改回。
- .tools/ 不入库；review/ 截图不入库。

## 6. 待办（新对话按顺序）

1. **温度传感器选择**（用户点名另开新对话完善）：现状控制页温度卡显示 mix（mixTemperature），压力温度图温度线也用 mix；用户要能选传感器（mix/group 等）。新对话先听用户口径，只读排查 machine 快照字段（onMachineSnapshot 已解析 mix/group/steam），按 AGENTS 20 先问再改。
2. 真机功能验收（§4 未做项）。
3. 沿用前序：影子杯数据核对（hecShadowCups 导出，sent 恒 false）→ 攒数据 → 学习仲裁 → 自动发送须协议 §8 联调+用户同意 → 发版先问。

