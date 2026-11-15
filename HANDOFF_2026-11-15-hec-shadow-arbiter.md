# 交接：HEC 影子推理 + 规则仲裁 v0 + 训练管线 + 真机接入（2026-11-15）

> 前序：HANDOFF_2026-11-15-hec-apk-impl.md（控制页实现 + UI 定稿，本仓库根）、docs/HEC_PROTOCOL_FOR_APK.md（接口契约 2.2.48）。
> 技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（控制口径）、hyperex-history（归档合并）。
> 仓库规矩照 AGENTS.md（7 四件事、20 先问、16 中文、18 推送走 VPN）。分工：本对话只做 APK 侧 + 离线训练；插件端由插件对话负责。
> **本轮把「学习决策模型 + 仲裁」从 0 落到可运行：训练管线、bc_v0 行为克隆、植物模型、规则仲裁 v0 全部就绪并接进 APK 影子链路（只记录不发送）。真机已装 APK，卡在插件版本（平板 2.2.47 < 要求 2.2.48），用户正在升级。**

## 0. 一句话现状

APK 仓库已建并推送：github.com/ladiosupp/HyperExController，HEAD 1841374（影子推理 + 规则仲裁 v0）。父仓库 D:/vscode 已把它注册为子模块（指针 1841374，父提交 59f684f）。
控制页 UI 沿用上一轮定稿，本轮**未改 UI**（用户说有若干 UI/功能问题要调，见 §8，尚未点名）。
影子链路：每个秤样本 → RAW 重量回归 → 13 维特征 → bc_v0 ONNX 推理 → 候选指令 → 规则仲裁（算法候选 vs 模型候选）→ 记录落 IndexedDB。**全程不发送 external-flow，sent 恒 false。**
离线训练在 D:/vscode/.tools/hx-train（不入库）：数据管线 + bc_v0 + 植物模型 + 仲裁扫描，全部可复跑。
真机（红米平板，HyperOS 3.0 / OS3.0.305）已装 HEC v0.1，连真实 Decaid 成功，但插件 2.2.47 低于门槛 → pluginOk=false，影子拿不到决策上下文。**下一步：用户升级插件到 2.2.48 → 切 hec 档 → 出杯攒影子数据。**

## 1. 架构与口径（用户 2026-11-15 定）

- **单一写者不变**：对机器而言插件仍是唯一经 A010 写帧的写者。APK 内部并联两个候选（插件算法移植版/实际写入 + 学习模型），经仲裁选一条，**当前只记录不发送**。技能 §22.10 已补「HEC 架构例外」澄清：不并联约束的是对机器写入面，不是 APK 内部候选生成。
- **奖励口径**（用户定）：趋势接近度 + 真实秤流平滑度，与插件一致。离线度量原样移植插件 controlOutputQuality 五指标 + controlQualityGood（尾误差≤8% / rippleCV≤10% / P95≤15% / 过冲≤20% / RMSE÷目标≤0.10）。**一致性已验证**：95 杯重算全相位误差 vs 插件存值，S2 51/51、S3 50/50 吻合（中位差 0.02–0.03pp）。
- **写入频率不硬压**（用户定）：模型想写得多（约插件 4×）不靠硬墙拦，交给后续学习收敛 + 仲裁倾向。仲裁软预算是倾向不是墙。
- **仲裁倾向可调**：preference ∈ [0,1]，默认 0.35 偏算法（保守起点）；学习证明模型可靠后往 0.5+ 调。APK 侧 HxShadow.setPreference(p) 可运行时改。

## 2. APK 侧改动（本仓库，已提交 1841374）

- **app/www/shadow.js**（新增）：影子推理模块。每秤样本驱动；RAW 重量回归（插件口径，S2 1.6s / S3 3s 窗，去重、跳变≤0.6s、R²≥0.90）；13 维特征（与离线 bc-features.js 逐字同序）；bc_v0 推理 → 候选（常规±4 档夹取、0.10–8.00、1/16 量化）；调仲裁；记录落 IndexedDB（键 hecShadowCups，≤40 杯）。HxShadow.exportJSON() 导出。load() 用桥读 assets（见下）。
- **app/www/arbiter.js**（新增）：规则仲裁 v0，与离线 pipeline/arbitrate.js 同逻辑。安全包线硬夹取（0.10–8.00、1/16、上行压力门 ≥limiter×0.90 拒上行）+ 分歧门控（默认 0.5 ml/s）+ 软预算（每杯模型写入软上限 12，倾向非硬墙）+ preference。返回 {pick, commandMlS, reason, clipped}。
- **app/www/control.js**（4 处钩子 + limiterBar）：onScaleSnapshot 末尾喂 HxShadow.onSample；onMachineSnapshot 杯尾调 onCupEnd；init 调 HxShadow.load；_state 带 shadow 状态。样本对象加 stamp（秤时间戳秒）。**UI 一行未动。**
- **app/www/index.html**：脚本引用顺序 archive-core → app → arbiter → shadow → control。
- **HxBridge.java**：新增 readAssetBase64(path)（同步读 assets 转 base64）。原因：file:// 页面 fetch 相对路径被 WebView 拦，ORT 的 import()/fetch 也被拦。
- **app/www/vendor/**（新增，入库）：bc_v0.onnx（22KB）、ort.wasm.min.js、ort-wasm-simd-threaded.wasm（14.16MB）、.mjs。离线推理运行时。
- **file:// 加载方案**（关键坑）：模型/wasm 走桥 readAssetBase64；.mjs 读成 blob URL 绝对地址设 ort.env.wasm.wasmPaths={mjs,wasm}；wasm 二进制注入 ort.env.wasm.wasmBinary；numThreads=1（避免 SharedArrayBuffer）。浏览器预览无桥时回退 fetch。
- **www 与 assets 已同步**（技能硬规矩），control.js 哈希一致。

## 3. 离线训练管线（D:/vscode/.tools/hx-train，不入库）

环境：uv + Python 3.11.18 + torch 2.15(CPU) + d3rlpy 2.8 + sb3 2.9.2 + LightGBM 4.7 + onnx/onnxruntime，都在 .venv。安装脚本 .tools/install-hx-train.ps1（走 VPN）。

- **pipeline/plugin-metrics.js**：插件度量原样移植（linearRegression / phaseRawSamples / stage2CupOnset / s2LearningWindow / stage2PlateauStartMs / controlOutputQuality / controlQualityGood）。
- **pipeline/reconstruct.js**：归档 shot 无 config，从 s2.targetGS / nextShotApplied.commandFlows / 样本 desiredRealFlowGS / workflowProfileCommands / s2StartupPlan 重建插件同构 run。
- **pipeline/build-dataset.js**：读归档 D:/vscode/.tools/hx-data/hyperex-history-all.json（103 杯）→ data/ 三份：
  - decisions.jsonl：13887 条（check 12828 / write 1059），8513 带响应。每点 obs→插件指令→写后 0.75–2.75s 响应回归→奖励。
  - plant.jsonl：703 对（write 响应 516 + 平台段 187，全版本）。指令→秤流响应 + 增益 r。
  - cups.jsonl：103 杯五指标 + good + 趋势角统计。
- **pipeline/bc-features.js**：13 维特征定义（单一真源，APK shadow.js 与之同序）。
- **train_bc.py**：行为克隆 v0。2.2.41+ 的 29 杯 3315 点（243 write + 3072 fresh check），按杯切分 24 训/5 验。双头 MLP（write/hold 分类 + 档数回归），write 点加权 8×。导出 models/bc_v0.onnx（归一化在图内）。
- **train_plant.py**：植物模型。703 对 57 杯按杯切分。幂律/LightGBM/MLP 三选，导出 plant_v0.onnx + plant_lgb.txt。
- **pipeline/arbitrate.js** + **replay_arbiter.py**：仲裁离线扫描（6 档 preference）。
- **replay_bc.py**：bc_v0 离线回放（真实杯决策点喂模型，对比插件）。

## 4. 模型成绩与保留（重要，别当结论）

- **bc_v0 验证杯**：write/hold precision 0.955 / recall 0.913；档数 MAE 5.3 档（被补水/救急大步长拉高），方向一致 74%。
- **离线回放（4229 点，2.2.41+）**：模型想写 652 / 插件实际 167；都写时方向一致 **89.6%**（129/144，硬数据可信）；可评分 75 对，模型候选更优 62.7%，奖励 插件(真实)0.874 / 模型(植物估)0.909。
- **仲裁扫描**：pref 0–0.35 → 算法 167 + 模型 196；pref 0.5–1.0 → 算法 77–93 + 模型 270–286。模型 652 次想写被压到 196–286 次实际选择。pref 0.35→0.5 有跳变（小分歧门控）。
- **两个保留**：① 模型奖励是植物估的，植物 S3 外推不可靠（幂律 b=0.107 近乎平坦，与台账 r≈2.0–2.4 矛盾，因 S3 指令样本范围窄 + 限压杯混入）→「模型更优 62.7%」是乐观估计，不能当真机结论。② 模型写得太勤（4×），与「干预越少越好」有张力，靠仲裁倾向收。
- **植物模型**：S2 幂律 a=2.30/b=0.48（接近台账 low 纸 2.177/0.524，可信）；S3 不可靠，样本范围内 LightGBM/MLP 可用，外推要夹取。

## 5. 验证回执

- **模拟器 hxpad（emulator-5554，CDP 9224）**：两杯实测，17/16 条决策 + 插件写入台账 + 306/310 样本落 IndexedDB，sent 全 false；仲裁记录全带（一杯 2 algo + 15 hold，桩曲线干净模型不写）；模型加载 ready。
- **真机（红米平板，CDP 9223）**：APK v0.1 装好（手动点安装，见 §6），视口 1138×680 正常，三模块 + ORT 加载，影子模型 ready；连真实 Decaid（127.0.0.1:8080）conn=ok，但插件 2.2.47 → pluginOk=false，无握手无 external-status。
- **离线**：度量一致性 51/51 + 50/50；ONNX 数值对齐通过；仲裁扫描跑通。

## 6. 真机接入坑（本轮新踩）

- **新包名安装被拦**：HEC 包名 com.ladios.hxcontroller 是全新包（平板原有 com.ladios.hxreplay）。HyperOS 3 对已装包同签名覆盖升级静默放行（所以以前升级从不确认），但对全新包 adb 安装报 INSTALL_FAILED_USER_RESTRICTED。**不是签名问题**（同 debug.keystore；签名不符会报 UPDATE_INCOMPATIBLE）。adb_enabled=0 / adb_wifi_enabled=1（无线调试）。
- **解法**：APK 推到 /sdcard/Download/HyperExController.apk，用户在平板文件管理里手动点安装（原生安装器，绕开 adb 静默校验）。装完这一次，以后同包名升级又能 adb 静默装。file:// 的 VIEW intent 被 HyperOS 拦（只弹夸克选项），MediaStore content URI 也未走通——手动最稳。
- **通知栏遮罩**：真机 mCurrentFocus 一度是 NotificationShade，但本次 CDP 视口未压 0（1138×680），不影响。回归前仍按技能 stayon true + WAKEUP + am start。
- **插件版本门槛**：HEC 要求 ≥2.2.48（external-* 端点 + hec 档）。平板 2.2.47 不够。2.2.48 包已推平板 Download/HyperExPulseFilter_v2.2.48.zip，也已发 GitHub Release（ladiosupp/decenthyperexplugin v2.2.48）。用户升级中。

## 7. 工具链 / 复跑

- 构建：JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9，GRADLE_USER_HOME=D:/android-dev/gradle-home，gradle.bat -p D:/vscode/HyperExController assembleDebug。**改 www 先 Copy-Item app/www/* app/src/main/assets/www/ -Force**（vendor 子目录单独同步）。
- 真机 adb：-s adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp（mDNS 名，端口重启会变）。CDP：pidof com.ladios.hxcontroller → forward tcp:9223 localabstract:webview_devtools_remote_<pid> → node .tools/cdp-eval.cjs 9223 <exprFile>。
- 模拟器：emulator-5554，CDP 9224，联调桩 node .tools/hec-stub.cjs 4795 hec（提权侧起，adb reverse tcp:4795）。
- 训练复跑：.tools/hx-train/.venv/Scripts/python.exe train_bc.py / train_plant.py / replay_bc.py / replay_arbiter.py；数据重建 node pipeline/build-dataset.js。
- 归档合并：hyperex-history 技能 scripts/hx-archive.mjs add --dir C:/Users/ladios/Downloads。
- 推送走 VPN 127.0.0.1:57890（AGENTS 18）；gh token 走 git credential fill。

## 8. 待办 / 下一步（按顺序）

1. **用户点名的 UI/功能问题调整**（本轮用户说有若干，尚未逐条点名）——等用户列出后按 AGENTS 20 先问再改。UI 沿用上一轮定稿，本轮未动。
2. **插件升级 2.2.48**（用户进行中）→ 重核版本 pluginOk=true → 切 hec 档 → 握手 ok。
3. **真机影子攒数据**：用户出杯，APK 记录「两路候选 + 仲裁选择 + 实际响应」几十杯。这是训练学习仲裁（LightGBM）的标签来源。影子只记录不发送，安全。
4. **学习仲裁**：攒够标签后训 LightGBM 排序模型替换规则仲裁（小样本树模型比神经网络稳）。决策模型主力 d3rlpy CQL（离线 RL），行为克隆做第一版已就绪。
5. **植物模型修正**：S3 外推不可靠，需更多 S3 指令范围样本或限压杯剔除。
6. **控制律自动发送**：本版只影子。真要 APK 经 external-flow 发指令，须先过协议 §8 联调清单 + 用户同意（AGENTS 20），且仲裁/安全门成熟后。
7. **发版**（升 versionCode/versionName → 构建 → 真机回归 → GitHub Release + 夸克）先问用户。

## 9. 工作区 / 别碰

- 插件仓库 D:/vscode/decenthyperexplugin：别人未提交的不碰（HANDOFF_2026-10-31.md、HEC_PROTOCOL_FOR_APK.md 修改是插件对话的；release/ zip、tests/ 未跟踪也不碰）。2.2.48 包是插件对话构建发版的。
- 本仓库 HEAD 1841374，工作区干净（本交接除外）。父仓库子模块指针 1841374（父提交 59f684f）。
- .tools/ 不入库（训练管线、探针、桩、截图都在那）。app/build/、.gradle/、local.properties 不入库。
- vendor/ 的 wasm 14MB 是离线推理必需，已入库（合理）。
