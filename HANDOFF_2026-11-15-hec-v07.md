# 交接：HEC v0.7（2026-11-15 第五轮）→ 回放页温度已实现，待真机验收后发版

> 前序：HANDOFF_2026-11-15-hec-v06.md（v0.6 现状/通道/坑）、hec-v05、hec-ui-v03。
> 技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22。
> 规矩照 AGENTS.md（7 四件事、20 先问、16 中文、15 正斜杠链接、17 小字只状态/标题、18 推送走 VPN、8 不拉整份 CodeInfo）。

## 0. 一句话现状

HEC 仓库 HEAD a0ed2a6（v0.7 功能已提交，**版本号仍是 0.6、未发版**），工作区干净。
模拟器 hxpad 已装含 v0.7 功能的 debug 包并回归通过；**真机平板还是 v0.6，未装新包**。
父仓库指针待提交（随本交接一起）。夸克 v0.6 仍未传（见 §5 待办 1）。

## 1. 本轮改了什么（a0ed2a6，用户口径已定）

用户拍板：**HEC 直控的杯，杯末全点直写回放归档（含 mix 温度），不依赖 recorder 插件；
回放页温度展示在 cPress 右轴；温度传感器固定 mix，不做切换（v0.5 遗留的温度传感器选择就此关闭）。**
去重口径（用户点名）：**直写和插件导出不许重复，互相验证补全就好。**

- **control.js**：
  - 开杯记 runId = 插件 ext.runId（随轮询跟进，noteExternal 里更新）；**拿不到 runId 不直写**。
  - 杯末（runEnded 时机）archiveRun()：样本映射成回放字段（tMs/scaleWeightG/decaidWeightFlowGS/
    rawScaleDwDtGS/pressureBar/machineFlowMlS/targetFlowMlS/temp=mix/phase），相位变点→events，
    指令台账 run.cmd→liveFlowTrim.trace（kind:write），摘要 source:'hec'、result:'HEC xx.x g'。
  - startedAt 从 runId 里的 13 位毫秒段推导（正则 /\d{13}/，兼容 stub- 前缀），与插件导出同口径。
  - 走现成 HxArchive.appendRun → archive → saveArchive → rebuildCupList。
- **archive-core.js**：
  - applyFull：新 samples 更长但**不带温度**、已有的带温度 → 保留已有的（防插件导出顶掉温度列）。
  - mergeExport：同 runId 的 startedAt 若 Date.parse 相等（ISO 尾零写法差异 ...26Z vs ...26.000Z）不算冲突。
- **app.js**：
  - cPress 加温度线（#f2a0aa，1.6px），右轴真实 °C 5 档，pad.r 34；tempRange 口径同控制页（两个 IIFE 各一份）。
  - **温度数据源 tempSource()：raw 优先的杯（合并了插件导出后 isRaw=true）温度在 samples 里，
    经 nearestSample 按 tMs 取**——这是本轮修过的坑：只看 frames 会让合并后的杯温度线消失。
  - 无温度杯：温度线/右轴/图例都不出现，pad.r 保持 10，老数据零影响。
  - saveArchive 写盘串行化（saveChain），杯末直写与后台抓取并发不交错。
- 回放页卡片没加温度卡（用户只要 cPress 右轴线）。

## 2. 验证（都做过，别重复）

- 离线：.tools/__v07-merge-test.cjs（合成）+ __v07-real-test.cjs（真实 71 杯导出）全过。
- 模拟器端到端（4797 桩 + CDP 9224）：
  - 桩出杯 34s → 直写入档（同 runId、>95% 样本带温度、字段映射、相位事件、指令轨迹）→ IndexedDB 落盘。
  - 回放页选中直写杯：温度线几何/图例/粉色像素（8480px）/光标圆点全过。
  - 合成大跨度温度杯（87→99.4）：纵轴撑开验证过（桩温度近平时最小跨度 6°C 居中是预期）。
  - 同 runId 插件导出再合并：仍一条、温度保留、raw/events 回填、摘要取插件（S1/S2/S3/result）。
  - 无 runId 有样本的杯：不直写（归档数不变）。
  - 真实导出老杯（637 raw 帧无温度）：无温度线/右轴/图例。
- 截图取证：D:/vscode/.impeccable/review/v07-replay-cpress.png（右轴 88°–95°、粉色温度线、图例）。
- 回归脚本：.tools/__v07-regress.cjs / __v07-regress2.cjs / __v07-regress3.cjs / __v07-norunid.cjs（不入库）。

## 3. 本轮踩的坑（项目特有）

- **CDP 多次求值之间桩 WS 会盖状态**：注入测试要把整段 machine/scale 序列放进**一次同步求值**，
  或按 v0.6 交接 §3 屏蔽 /ws/v1/ 新建连接。分多次 evaluate 注入会 samples=0 假失败。
- **DOM.setFileInputFiles 塞宿主机文件，file:// 页面读不了**（permission problems）。
  本地导入测试改走：提权侧起临时静态服务 + adb reverse + App 内 fetch → mergeIncoming（真实合并路径）。
- **WebView devtools socket 的 pid 不一定等于 App pid**（本轮出现过 socket 14150 vs App 26340）：
  forward 前用 cat /proc/net/unix | grep webview 拿真实 socket 名，别只信 pidof。
- 桩的 runId 是 stub-<毫秒> 形状：测试断言取毫秒段用正则 /\d{13}/，别 split('-')[0]。
- 真实导出 __hx-history.json 是归档形状 {kind:HyperExHistoryArchive, shots:[{fullRecord}]}，
  不是 legacy {history:{shots}}；抽单杯测试文件要照归档形状写。

## 4. 通道 / 复跑（沿用 v0.5 §3 / v0.6 §4）

- adb：D:/android-dev/sdk/platform-tools/adb.exe；真机 mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp；模拟器 emulator-5554。
- 构建：JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9、GRADLE_USER_HOME=D:/android-dev/gradle-home、
  D:/android-dev/gradle/gradle-8.7/bin/gradle.bat -p D:/vscode/HyperExController assembleDebug；**改 www 先 Copy-Item 同步 assets**。
- CDP：9223 真机 / 9224 模拟器；socket 名按 §3 的坑取；只同步求值。
- 桩 4797 是我们的（hec-stub.cjs，scenario=hec）；**4795/4796 是别的对话的，别 kill**。
- 模拟器里现有 4 杯测试数据（synth-temp-1、1794702166720-1、stub-1794750840302、stub-1794751504254），
  是本轮回归产物，真机不受影响；要清就在回放页「清空本机归档」。

## 5. 待办（新对话按顺序）

1. **夸克补传 v0.6**：夸克 MCP 本会话已恢复可用（list_files 实测正常，不用重启 Codex）。
   APK 在 D:/vscode/HyperExController/.tools/HyperExController_v0.6.apk（6,605,586 字节）→「/来自：Codex」。
   upload_file 参数 dest_path/local_path。**用户还没点头，先问。**
2. **v0.7 真机验收 → 发版**：用户唤醒机器后真机出一杯，确认直写+温度线；然后升 versionCode 7/0.7、
   构建、装平板、push（VPN 代理）、GitHub Release、夸克——**每一步都先问（AGENTS 20）**。
3. v0.6 遗留：真机出杯验收自适应纵轴（用户自验）。
4. 沿用前序：影子杯数据核对 → 攒数据 → 学习仲裁 → 自动发送须协议 §8 联调+用户同意 → 发版先问。
5. 历史 71 杯补温度（方案 A：Decaid shots REST 按时间窗插值）仍挂着，用户没点名要做，别擅自做。

## 6. 别碰

- 插件仓库别人未提交改动；父仓库未跟踪目录；4795/4796 桩。
- 标题配色（h1 灰/大写白/版本号琥珀）v0.3 定稿。
- .tools/ 不入库；review/ 截图不入库。
- 温度传感器固定 mix（用户 2026-11-15 定），不做切换。

