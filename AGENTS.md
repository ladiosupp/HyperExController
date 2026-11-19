# HEC（HyperExController APK）专属规矩

本文件是 HEC（HyperExController APK）专属规矩，补充全局 AGENTS.md（D:/vscode/AGENTS.md，通用条号仍适用）。**凡做 HEC 的对话，动手前必读本文件。**

三个真源，本文件不重复其全文：
- 控制口径（单一写者 / 预测 / 救急 / 补水 / 平滑度）：decentplugin 技能 §22（C:/Users/ladios/.codex/skills/decentplugin/SKILL.md）。HEC 影子自算 predictedGS/rescue 必须与插件同口径。
- 通用坑（沙箱 / adb / CDP / 构建 / 发版）：android-tablet-apk-dev 技能 references/pitfalls.md，按条号引用（写作「技能坑 N」），项目交接不重复通用坑。
- 接口契约：docs/HEC_PROTOCOL_FOR_APK.md（与插件仓 D:/vscode/decenthyperexplugin/HEC_PROTOCOL_FOR_APK.md 一致，按插件 2.2.48 实测更正版）。

来源标注用短名，对照文末「来源对照」；AGENTS N = 全局 AGENTS.md 第 N 条；commit = 本仓 git 提交。冲突取舍以最近的用户拍板为准；被取代的旧口径集中在第 10 节，标注「勿用」。

## 1. 授权与协作边界

1. 改代码 / 发版 / 推送 / 装机 / 开闭环之前先问用户，讲清「改哪一侧、准备改什么、会影响什么」；用户当次「改吧 / 发吧」只对那一次那一批有效。只读排查、分析、本地预览、跑测试不需要问。（AGENTS 20；技能 §20 批准纪律；整改单头）
2. HEC 对话只改 APK 仓（D:/vscode/HyperExController）。插件仓（decenthyperexplugin）、Decaid 皮肤、宿主配置是只读口径来源；需要动它们时先明说「这需要改插件 / 皮肤 / 宿主配置，APK 本身做不到」，再问用户。（AGENTS 19；实现头分工；整改回执 §7）
3. 开工四件事：① git log --oneline -15；② 读与本次要碰的文件 / 页面相关的最新一份交接（别只读旧的）；③ git log -5 -- 目标文件；④ git status 看清工作区已有改动是谁的。编辑前先读文件现状，不凭记忆改；别人刚改过同一处就按他们最新版接着改；口径冲突停下来问用户。（AGENTS 7）
4. 提交只 add 本批文件；别人未提交 / 未跟踪的文件不碰、不代提交、不回滚。同文件有别人改动时用部分 staging（git apply --cached 只含本批 hunk，theirs 原样留工作区）。（AGENTS 7；HX液重 §5）
5. 对用户的输出一律简体中文（回复 / 进度 / 提问 / 提交信息）；引用原文（报错 / 日志 / 上游文档 / 命令与标识符）照抄不改。（AGENTS 16）
6. 给用户看的本地图 / 文件链接一律正斜杠绝对路径（D:/vscode/...）；反斜杠路径在 Markdown 里被转义、图静默不显示。（AGENTS 15）
7. 新 UI 设计任务先提醒用户已全局安装 impeccable 技能、问是否运行 /impeccable init 初始化设计上下文；只提醒并等确认，不擅自启用或执行。（AGENTS 5）
8. 分工：APK 侧归本仓对话，插件端归插件对话，统筹对话（01a1f379-3282-7681-8ec5-86443b43708b，hostId local；11-19 relay-4 活文档制接力，旧 01a1f239 已交接）中立复核。统筹每次接力，新统筹主动更新本行 ID（用户 2026-11-18 授权，常规同步不必再问）。统筹状态真源 = 本仓根 HEC_COORDINATOR_STATE.md（活文档，用户 2026-11-18 晚点名）：统筹每收到回叫/派单/拍板/发版/接力即更新该文件；每次接力新统筹第一动作读它＋本规矩＋技能 §22，不逐份读历史交接；执行对话轮次交接 MD 只作细节，状态以活文档为准。不碰别对话的功能区：影子发送逻辑归阶段 B/D 对话，UI 对话不碰；温度链路 / 影子仲裁 / HX 液重锁在非本批任务里不碰。（实现头；v012 §5；v013 §5；液重 §5；统筹交接通知 11-17；统筹接力 11-18）
9. 每批做完写交接 MD 回本仓：一句话现状 / 本轮改动 / 验证回执 / 本轮坑（项目特有）/ 待办（每步先问）/ 别碰；通用坑引技能条号，项目现状不塞进技能。完成后回叫统筹（send_message_to_thread，prompt 字段：文档路径 / 分类数条数 / 冲突清单 / 待拍板事），纯确认不回叫。（v011–v013 头；技能 SKILL.md；统筹派单口径）
10. 构建会打进别人 WIP 时（gradle 打磁盘现状），必须用户知情同意；不为「基线干净」代提交别人的改动。（图标 §4；HX液重 §5/§6）
11. 修 bug 时同一写法 / 同一 bug 在别处也有的，一起修（用户 11-18 晚点名「有一样bug的地方一起修」）：本轮样式 1 杯流卡目标杯流 targetSeries 覆盖 bug 被点名后，样式 2 合并图同款 bug 一并修（commit 6776a3e），不只修被点名那处。（UI8 派单 11-18；v023 §1）
12. 插件算法改动→APK 移植版同步（用户 2026-11-19 点名「改完插件要同步到 apk 里面的算法里头」）：插件控制律 / 估计算法改动后，APK 内移植版（shadow.js / arbiter.js 的 predictedGS / rescue / 平台估计）须同步到与插件同口径。**同步时机＝插件不用 full、可 hec 时做一次**（full→hec 里程碑，阶段 D），不是每批插件改动都立即同步；期间插件改动记入统筹活文档 §4「APK 同步债」，hec 切换批一并移植。插件批交接 MD 标注 APK 移植同步点（改了哪些算法函数 → APK 对应处），便于届时移植。（用户 11-19；§22.10 1a HEC 架构例外；影子同口径硬规矩）
13. 统筹范围与 UI 直管（用户 2026-11-19 点名）：统筹负责 HEC（APK 控制／取证／协议协调）＋插件部分＋用户交代的事；**UI 有关的都不用回叫统筹**——UI 批由用户直管 UI9（01a1f1cd-d4c7-7241-a1ea-b96ddcd48a3c，接 UI8），统筹不派单、不催回叫、不追踪 UI 批进度。其余执行对话（插件／取证／弹窗评估／规矩／离线／审计）回叫统筹照旧。（用户 11-19；统筹接力 relay-3）
14. 验杯与算法评估口径（用户 2026-11-19 点名）：插件和 APK 调流的设计目的＝自动适应更多情况——研磨度／豆种／粉量变化造成的误差正是算法要面对的问题，目标是杯内或很少杯数之间适应、使杯流满足设计要求。验杯主验：①有没达到设计目的 ②算法可以怎么继续优化 ③真实参数判断有没逻辑问题、设计方向对不对；**不是报「这杯偏移多少、什么因素」**——偏移数值与因素归因是证据材料，结论落在设计目的达成与算法优化。取证逐杯回执裁决节、插件核码／评估／修复提案、统筹裁决同口径。设计达成判据（用户 11-19 Q2 裁定「不批，坚持平滑度优先」）：whole HIT＋平台平直＝设计达成（§22.13 平滑度优先维持），tail ±4% 不作硬指标，coast 8% 维持；O2/O3 压 tail 批否。**40% 绊线区分（用户 11-19 裁定）**：峰过冲 40% 绊线区分正常/通道事件——正常杯按 40% 照旧；通道事件（grindAdvice uneven＋突破前平重＋dw 尖峰签名）另设接受准则，具体准则待评估批提案＋用户批，统筹/取证不擅自放宽；衰减期安全例外用户批派只读评估（平滑度优先不变前提下提高反应敏感度），控制律变更须另授权。**通道接受准则（用户 11-19 批准，11-20 增子形 B）**：正常杯峰≤40% 不变；通道事件两子形——**A uneven 通道**：签名 grindAdvice uneven＋突破前平重≥1s＋dw 尖峰≥target×1.1＋突破前存水≥~8ml，峰≤物理上限（泵最大＋留存水释放率）×1.1；**B even-puck 延迟润湿突破（用户 11-20 批，杯 19 正常操作首样本）**：签名突破前平重≥1s＋dw 尖峰≥target×1.1＋突破前存水≥~8ml＋grindAdvice≠uneven（flow-high/hold），峰≤泵最大×1.1（**用户保持 1.1**，2 样本均~1.095×余量 0.3–0.5% 实证偏紧，攒样本标定）；两子形均须衰减 tail 收敛 coast 8% 带内＋分类计数＋grindAdvice 反馈布粉改善；签名阈值/安全系数暂定待真机多杯标定；重跑杯（异常前提）独立异常类别不混入通道子形。**Vd15 衰减例外用户批并入 2.2.55 发版**（raw>1.5×target 3 样本旁路 handover-falling＋governor，小步≤2 quanta，静默 1200 保留，滞回退出＋笔数上限；平滑度优先不变，严重过冲安全例外；真机陪杯验热 tail 并标定）。**异常前提重跑杯（用户 11-19 批）**：独立异常类别（如 5 压力杯）——标记排除正常校准 universe（标记不删）、自设验收参考、计数；base 不干预（记忆硬规矩）下一杯自然验证；通道签名不加子形（正常操作样本未获得前正常杯 40% 不动）；通道准则 tail 收敛带＝coast 8%（Q2 一致，统筹口径校准，峰绊线不变）。**regime 切换首杯裁决（统筹 11-20 校准，§1.14 延伸）**：适应机制为主验（一杯/少杯纠正＝达成），首杯收敛受限注记状态切换固有代价（历史预测新态滞后）非逻辑失败；不另立数值准则（正常操作设计已处理，区别于通道异常）；估计选择精化（k-gm 调和/regime 感知/逐样本 freshness）控制律相邻须另授权，现状可接受（P0-1＋快速纠正，评估 11-20 反转逐杯无偏差）。（用户 11-19；统筹转取证/插件接力；Q2 裁定；杯 16 d 路径裁定；Vd15 并入＋准则批准；重跑杯归类＋杯 17 处置；统筹 11-20 regime 裁决校准）
15. 插件 manifest.json description 写法（用户 2026-11-19 点名）：固定短产品简介＋只写大的功能改动更新（例如 hec 可以联动了就写一句），**不堆叠每版 changelog、不保留 Retains 历史段**；版本细节归 release/notes-vX.md 与 GitHub Release body。基线文案＝HANDOFF_2026-11-19-manifest-description-shorten.md §3（用户确认 275 字符，不含版本号）；只改 description 字段，其余字段逐字不动。Decaid 插件页原样全文渲染该字段（不截断），堆 changelog 会很难看。（用户 11-19；manifest 简介文案批）

## 2. 构建与工具链

1. 工具链常量：gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat（不是 gradle-8.7 直目录）；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；GRADLE_USER_HOME=D:/android-dev/gradle-home；adb=D:/android-dev/sdk/platform-tools/adb.exe；SDK=D:/android-dev/sdk。（v013 §2；实现 §5；图标 §6）
2. 构建、adb、回环网络、gh 推送一律 require_escalated：沙箱 adb daemon 起不来、连 127.0.0.1 被拒（EACCES）；回环请求加 -NoProxy（系统 VPN 代理 57890 会劫持回环）。沙箱里读注册表 / 用户环境是假象，别拿沙箱结果下结论。（技能硬规矩；技能坑 1/2；AGENTS 10）
3. 跨会话网络隔离：沙箱里起的监听提权进程连不上（反之亦然）；联调桩 / 预览服务 / 测试服务一律在提权侧起，别在沙箱起了再提权连。（技能坑 3）
4. 改 www 先同步 assets 再构建：Copy-Item app/www/* app/src/main/assets/www/ -Force -Recurse（vendor 子目录单独同步）；www 与 assets 两份 SHA256 一致是验收项。不同步 = 装旧网页（「改了没生效」先查这条）。（技能硬规矩；技能坑 5；HX液重 §3）
5. gradle 打磁盘现状（含别人未提交改动）：发版基线必须干净；含别人 WIP 须用户知情决定要不要等那边收尾。（图标 §4；HX液重 §6/§8）
6. versionCode / versionName 同步升（app/build.gradle）；control.js appVer 兜底串可旧，真机版本走 HxBridge.appVersion()=BuildConfig，bump 后即新。（phaseB §3；HX液重 §2）
7. 装机用 install -r（覆盖装保数据）；装完 dumpsys package com.ladios.hxcontroller 核 versionCode / versionName / lastUpdateTime，别信 install 回显（常被吞）；拉前台用 am start -n com.ladios.hxcontroller/.MainActivity（monkey 有时不起进程）。（技能坑 6/7）
8. PowerShell 变量名不区分大小写：避开 $S/$s、$R/$r 这类配对（图标脚本已避开，别改回去）；内联 node -e 多层转义极脆，写 .js 脚本文件再跑、wsUrl 用 argv 传；PS 管道吞输出，落日志（*> log）再 Get-Content 读。（图标 §5；技能坑 14/15）
9. apply_patch 锚点必须整行（半行锚点报 Failed to find expected lines）；多 hunk 按文件位置排序。（v013 §3；v012 §3）
10. 不入库：.tools/（桩 / 探针 / 回归 / 截图）、app/build/、.gradle/、local.properties（sdk.dir 双反斜杠转义）、.gradle-build.log、review/ 过程截图；worktree 构建要拷 local.properties。vendor/（bc_v0.onnx + ort wasm 14MB + arbiter_lgb.json）是离线推理必需，入库。（实现 §1；v012 §2；影子初版 §2/§9）
11. 模拟器 AVD hxpad：emulator -avd hxpad -no-snapshot-load -gpu auto（提权后台）；getprop sys.boot_completed=1 才算开机；adb -s emulator-5554 指定设备；模拟器 127.0.0.1 是它自己，访问宿主服务要 adb reverse tcp:<port> tcp:<port>。（v012 §2；技能坑 22/23）
12. 改过的 JS 先 node --check；构建后先跑模拟器回归，再谈装平板 / 发版。（HX液重 §3；技能发版）

## 3. 测试与验收

1. 功能改动必跑安卓模拟器回归：同步 assets → 构建 → install -r → hec-stub 桩（提权侧）+ adb reverse → CDP 同步表达式驱动真实 UI 逐分支验证 + 截图取证。模拟器结论可代表同分辨率平板，但最终验收以真机为准。（技能 emulator-regression；实现 §4）
2. CDP 通道：pidof com.ladios.hxcontroller → forward tcp:9224（模拟器）/ 9223（平板，挂死后可换新端口如 9226）localabstract:webview_devtools_remote_<pid> → GET /json 挑 url 含 android_asset 的页（别挑到 Decaid 插件页）→ node .tools/cdp-eval.cjs <port> <exprFile> [shotPath] [超时默认 20s]。（实现 §5；技能硬规矩；技能坑 10；v06 §3；真机 §2.2）
3. 只同步求值，不用 awaitPromise（偶发挂死）；同步循环别超 ~15s（40s 循环曾挂死 CDP）；每套回归之间重启 App；App 重启 pid / 页 id 变，重 forward + 重取 wsUrl；devtools socket 的 pid 不一定等于 App pid，用 cat /proc/net/unix | grep webview 核真实 socket 名。挂死恢复：force-stop + 重拉 + 重 forward，别当业务 bug 改代码。（技能坑 8/9；v03 §3；v07 §3）
4. 回归前：svc power stayon true + KEYCODE_WAKEUP + am start 拉前台；锁屏 / 通知栏遮罩把 WebView 视口压 0（innerWidth=0），wm dismiss-keyguard 解锁；别发 keyevent 82（拉下通知栏），用 BACK 收起。收尾 stayon 恢复 false。（技能硬规矩；技能坑 11；整改回执 §12）
5. CDP 改视口（Emulation.setDeviceMetricsOverride 1138×633）后先强制重排（void document.body.offsetHeight）+ 派发 resize + 等 200–400ms 再量；断言过滤隐藏元素（filter width>0，display:none 的原生 select 仍是 flex 子元素）；判「单行」用垂直重叠不用 top 相等；DOM 归一化（style.width "100.0%" 读回 "100%"）按读回值写断言；数值比较别比字符串。（技能坑 12/19/20；v05 §2；液重 §3）
6. UI 结论要量出来（getBoundingClientRect / scrollWidth / computedStyle），别只凭截图感觉；模拟器 screencap 与 CDP 截图都不含 2D canvas 层（环境限制，不是渲染 bug），曲线证据用 regress 内置 canvasShots（toDataURL 合成到面板底色 #171a1f）。（技能验收循环；v013 §2）
7. 回归套件清单（均在 .tools/，不入库；项数核脚本头注 + 交接，2026-11-17 盘点）：
   - __yield-regress.cjs [stubPort=4798]：液重停杯 19 断言（v0.16 口径；v0.15 时期 17）。幂等：先复位桩 context 再断言。旧第 5 项把 bug 当预期（HX 照带拨轮值）已改，勿用旧口径。（HX液重 §2/§8；脚本头注）
   - __rectify-r2345-test.cjs：R2–R5 桩分支 27 项（mock ONNX + 真实 shadow.js / arbiter.js）。（整改回执 §11）
   - __phaseB-integration-test.cjs：阶段 B 集成 15 项（真实 arbiter.js + 真 vendor JSON + mock bc）。（phaseB §4）
   - __rectify-r1-replay.cjs：R1 离线逐点比对（验收线：predictedGS ≤0.05 g/s 的点 ≥95%、rescue 布尔一致 ≥95%；实测 98.78% / 99.36%）。（整改回执 §1/§11）
   - __ui5-regress.cjs A–D：v0.11 UI 五项 + 当日修（桩 __ui5-stub.cjs 4799，14 曲线 2 页；阶段间重启 App）。（v011 §2；脚本头注）
   - __v04-regress-a/b/c.cjs：水位四档 + 去皮 9 / 曲线保留冻结 + 第二杯重建 7 / RAW 滤波 9（4797 桩；b 需等桩一杯 34s）。（v05 §3）
   - __v07-regress/2/3.cjs + __v07-merge-test.cjs + __v07-real-test.cjs：杯末直写 + 回放温度线 + 合并去重。（v07 §2）
   - __v08-gm-test.cjs + __v08-regress.cjs（9 项）：gainMemory 保留 + 学习中心三入口。（v08 §2）
   - __v09-regress.cjs：七卡对齐（宽屏 + 窄屏两视口，标题 / 内容 / 卡高）。（脚本头注）
   - __m6m8-regress.cjs / __m6m8-stub.cjs 在父仓 D:/vscode/.tools（不在 APK 仓 .tools；统筹 11-17「已不在盘」误判已更正，UI 对话核实），齐全可复跑（侧栏自动隐藏 / step 色带 / 启动闪屏，m6m8 8/8+5/5）；口径见 v013 §1/§2。
   - __targetline2-check.cjs（父仓 D:/vscode/.tools，回归 v4）14/14：目标线历史化（HX 空闲黄 0 / 换段 b5/b2 双值带 / 样式 2 合并图 m5/m2 双值带 / 非 HX·压力卡·图例不变）；band 助手 PIXB 按值带数黄像素（YM 两处 split/join，见 3.17）。__flowcard-check 6/6（杯流卡同源稳定化；hold during gap 等 700ms 闸门，见 3.16）、__boot-check 8/8（启动闪屏 / 首帧 HEC 骨架）。（v023 §2）
8. 桩口径：node .tools/hec-stub.cjs [port=4795] [scenario=hec|plain|takeover|nohello]，按协议简化状态机，只供 UI / 链路联调，不是插件本体；注入端点 /__start（开杯）/__machine /__hb /__water /__tare /__puts /__ctx；PROFILES 含真机同款 hx-auto0（title "HyperEx Pulse Filter auto"，target_weight=0）。（hec-stub.cjs 头注；v03 §3；v05 §3；HX液重 §2）
9. 桩端口参数化；4795/4796/4797/4799 旧桩可能是别对话遗留，别 kill；端口被占 EADDRINUSE 是静默的，先 Get-CimInstance Win32_Process 核命令行再 Stop-Process 精确 pid；桩 / 模拟器随对话结束会死，新对话先重起。（v05 §2；v012 §2；技能 emulator-regression）
10. 注入测试：整段 machine/scale 序列放进一次同步求值（分多次 evaluate 桩 WS 会盖状态，samples=0 假失败）；或覆写 window.WebSocket 拦 /ws/v1/ 新建连接、收尾恢复；样本要间隔注入（集中在前 1s 会把曲线 / 色带压缩在 30s 横轴左缘，8s 步间隔模板见 v013 __diag17）；页面内 setTimeout 链被 WebView 节流，重播注入要宿主侧逐帧推。（v07 §3；v06 §3；v013 §2）
11. 桥失败 / 延迟模拟用 Proxy 包 window.HxBridge（Java 注入对象，直接给方法赋值不生效）；连接地址等配置走真实 UI（连接弹窗填地址），别绕 IndexedDB 直写（file:// 页面 IndexedDB 按目录隔离）。（v03 §3；技能坑 28）
12. 收尾清理：stayon false；删本批 reverse/forward；桩按端口定位停（别碰别口）；模拟器测试归档要清就在回放页「清空本机归档」，真机不受影响。（HX液重 §3；液重 §3；v07 §4）
13. 测试脚本要拿真机 history JSON 交叉验证：差距大就是测试不对，改测试不要改代码迎合测试；镜像断言不许写（assert 计划字段 = 当前代码算出的常数）；旧测试红了若因断言已被取代的口径，按新口径重写或删，不为变绿回退代码。（§22 支撑 references 规矩一；HX液重 §2 先例）
14. 仿真结论不能覆盖技能口径：sim 植物默认值与本机差距大（rPeak 4.2 vs 实测 0.26/0.53，单杯 RMSE 1.5–2.5 g/s），反事实用决策级回放；植物要拿真机 JSON 反复校准（目标准确度 ≥90%），与真机数据或 §22 冲突时以真机 + 口径为准。（§22 规矩二；AGENTS 21；模型设计 §2.2）
15. 真机取证另走只读口径（见第 8 节）：不改插件 / APK 出厂代码、不发版、不推送、不开闭环。（真机头）
16. CDP 回归读「基线值」先等显示闸门落定：杯流卡有 0.5s 刷新闸门，慢 CDP 下 held 读到未落定显示值会让断档保持断言假红（flowcard hold during gap 曾红过一次，产品逻辑 cand null 不更新无辜）；断言改抖动后等 700ms 闸门落定再读 held。（v023 §2）
17. 像素验收表达式注入占位符：String.replace 只换第一处，占位符出现多次（如 band 助手 PIXB 的 YM 两处）必须 split/join 全换，否则页内 ReferenceError 整套中断。（v023 §2）

## 4. 发版 SOP

1. 先问用户：装平板 / push / 打 tag / GitHub Release / 夸克 / 父仓指针，每一步先问再做；准备做完（版本升好 / 回归全过 / 工作区干净）只是「可以发」，不构成「现在发」。（AGENTS 20；v07 §5；v08 §5）
2. 流程：升 versionCode/versionName → 干净基线构建（别打进别人 WIP）→ assets 哈希一致 + node --check → 模拟器装机回归 → 装平板（-r + dumpsys 核对 + am start）→ push → GitHub Release 带 APK → 夸克 → 父仓指针。（技能发版；HX液重 §6；v011 §0）
3. push 走本机 VPN 代理：git -c http.proxy=http://127.0.0.1:57890 push origin main；不改 remote 为 SSH、不换 GitHub 端口；要持久化代理配置再问用户。（AGENTS 18）
4. gh token 走 git credential fill（protocol=https host=github.com）取 password 设 GH_TOKEN，token 不回显；gh 在沙箱报 keyring token 失效是假象（读不到 keyring），提权 + HTTPS_PROXY=http://127.0.0.1:57890 后正常。（技能坑 4；v06 §3）
5. gh release create/upload 带附件会静默挂死（日志空、REST 查 assets=[]）：改 REST —— POST api.github.com/repos/ladiosupp/HyperExController/releases 建 release，uploads.github.com 直传附件，均 -Proxy http://127.0.0.1:57890；release id 用 GET /releases/tags/<tag>；删旧附件 DELETE /repos/<owner>/<repo>/releases/assets/<id>。（v011 §6；v012 §3；v013 §2；HX液重 §6）
6. 夸克：目标目录「夸克网盘/来自：Codex」，包名 HyperExController_v0.X.apk；MCP upload_file commit 203（读正常）→ 改 quarkclouddrive 技能 CLI upload；别杀 MCP 进程（v0.6 教训：杀 quark-nd-mcp.exe → Transport closed 不自动重连，要重启 Codex 应用）；CLI install.sh 用 "C:/Program Files/Git/bin/bash.exe" 全路径跑（pwsh 无 bash）；upload 带 --session-input（用户原话）+ --session-id（{秒}-{6位随机}，同对话复用）；目录 fid 经 search --search-type dir --stdout-only 取。（v011 §3；v013 §2；v06 §3）
7. 版本冲突处置（v0.11/v0.12 教训）：发版包纯版本 —— 隔离 worktree 构建（先例 .tools/hec-v011-build = 基线 ea13901 + cherry-pick 本批断口线修），不含别对话未发版阶段（如阶段 B）；平板 / 模拟器留在主线最新，不降级装旧 versionCode（会盖别对话的测试包）。（v011 §6；v012 §3）
8. 部分 staging 先例：同文件有另一对话未提交改动时，git apply --cached 只 stage 本批 hunk，theirs 原样留工作区；已构建 APK 可能含两者（回归就是在含两者的包上跑的），装平板前用户可决定是否等那边收尾。（HX液重 §5/§6）
9. 父仓 D:/vscode 把 HEC 注册为子模块：指针提交在本地，推不推问用户（11-17 用户拍板推过一次，只对那次有效）；父仓 .git 沙箱只读，指针提交要提权。（HX液重 §6/§8；v06 §3；影子初版 §0）
10. 发版回执写进交接：APK 字节数 / 平板 dumpsys 实测（versionCode / lastUpdateTime）/ push 范围 / Release id + asset id / 夸克 fileId / 父仓指针提交。（HX液重 §6）

## 5. HEC app 业务口径

1. 三档模式：full = 插件调流（现状）；hec = APK 调流 + 插件监护学习 + 保险；off = 只检测。POST /control-mode 仅空闲 200、运行中 409；模式开杯锁存，萃取中不切档，下一杯生效；APK「启用 HEC」先切档成功再进控制界面，409 提示「本杯进行中，下一杯生效」。「启用 HEC」切档（POST /control-mode）与 external-flow 发送面属阶段 D，当前有意未实现（用户 11-17 确认，审计 i2 关闭）；现状 full 档影子只记录不发送，hec 档由外部切（Decaid UI/桩）。（协议 §0/§1/§7）
2. 单一写者：APK 不碰 BLE / ws/v1/machine/raw；调流指令只经 POST external-flow 发进插件，插件校验后代写 A010；ACK / 超时 / 预算 / 看门狗全在插件侧。「不并联」约束的是对机器的写入面，不是 APK 内部候选生成（§22.10a HEC 架构例外：内部并联候选 + 仲裁选一条，输出经插件代写）。（协议 §0；§22.10；模型设计 §1）
3. 版本核对：GET /status 的 calibration.pluginVersion（或 GET /external-status 顶层 pluginVersion；GET /control-mode 返回没有 pluginVersion）；HEC 需 ≥2.2.48，旧插件提示升级而不是硬调。（协议 §1；UI示意 §3.3）
4. 连接流程：status 核版本 → control-mode 核档位 → GET /profiles?includeHidden=true → GET /workflow → POST external-hello → 700ms 轮询 GET external-status（兼心跳兼决策上下文，协议建议 500–1000ms）；external-flow 也刷心跳。（实现 §2.1；协议 §2）
5. 心跳保险：超时 4000ms（heartbeat.heartbeatTimeoutMs，插件常量 HEC_HEARTBEAT_MS）；S2 补水前无握手 → hec-no-handshake 本杯锁存接管（补水计划当场重建为插件 full 计划）；stage2/3 心跳超时 → hec-heartbeat-lost，当前指令 ≠ 曲线基值时先代写一笔基值收回再接管；S1 不判心跳（判定从 stage2 开始，与补水时机对齐）。（协议 §2）
6. 接管：ext.takeover 非 null 即本杯已接管（没有 active 字段；heartbeat.takeover 与顶层 takeover 同一对象）；接管后本杯 external-flow 一律 409 hec-takeover → 停发指令、显示「插件已接管本杯」（原因显示协议原值）、曲线照常画；下一杯开杯按当时心跳重评，心跳恢复则下一杯仍是 APK 调流。计数 externalWrites / externalRejects / watchdogs 在 heartbeat 块、每杯清零。（协议 §2/§4；实现 §2.1；UI示意 §1）
7. 指令契约：command 0.10–8.00 ml/s，插件按 1/16 量化，越界 400；frame 为逻辑帧 S1=0（仅连续模式可写）/ S2=1 / S3=2/3/4，省略 = 当前帧，不符 409 frame-mismatch（防跨帧写，物理帧映射插件做、APK 不碰）；pending 串行（上一笔未 ACK 未超时新指令 409 write-pending），决策周期 ≥300ms 或读 pending 再发；上行压力门 ≥limiter×0.90 拒上行、下行不限（救急要能断流）；预算复用 LiveFlowTrimLevel 1–4 → 50/150/200/250 笔/杯（writes/maxWrites 透出）。（协议 §3）
8. 409 分支白名单应对：hec-mode-required（停发 + 提示切档）/ hec-takeover（停发 + 显示接管）/ not-extracting（等下一杯）/ frame-not-confirmed（等 logicalFrame 非 null）/ frame-mismatch（用 logicalFrame 重发）/ frame-not-writable（等可写帧）/ write-pending（等 ACK 或超时 ≤2s）/ write-budget（停止，插件接管剩余）/ pressure-upward-blocked（改下行或保持）/ telemetry-stale（等遥测恢复）/ command-busy（稍后重试）；400：command-invalid / command-out-of-bounds。未知 reason 一律停发 + 显示原文，不按前缀猜。（协议 §3）
9. 无 CORS → REST 全走 HxBridge.httpJson(method,url,body,callback) 原生桥（子线程 HttpURLConnection，回调 {ok,status,body}）；浏览器预览无桥回退 fetch。两路官方 WS WebView 直连（平板实测可行，不需 Java 桥 WS）：ws/v1/machine/snapshot ≈4Hz（state/substate/flow/pressure/targetFlow/profileFrame/五路温度）、ws/v1/scale/snapshot ≈10Hz（weight/weightFlow/timestamp），断线 2s 重连；第三路水位 WS ws/v1/machine/waterLevels。（实现 §2.1；UI示意 §3.2；v05 §1）
10. HX 曲线液重（v0.15/v0.16 口径）：HX 曲线 target_weight=0 是正常态 —— 插件 FinalWeight≈100g 自己写 Idle 收尾，SAW 必须禁用；selectCurve 例外判定 = 标题正则 /^HyperEx/i（pluginStop，覆盖 HX 各曲线 + Flow Calibration），context.targetYield 发曲线自己的 target_weight（非有限数回退 0）；非 HX 仍发拨轮当前值。旧「HX 照带拨轮残留液重」已取代，勿用（11-17 真机两杯 S2 中途停杯根因：残留 26g 触发 Decaid SAW 提前停）。（HX液重 §1/§2/§8；commit 81f901d/9e644c2）
11. HX 液重锁：isHxSelected 拦 applyDials 液重分支（只 toast 不写）+ initDials 步进（主动拒绝，不是只锁应用按钮）+ selectCurve 静默注入；锁定光带暗红 #b04a44 渐变 + toast「液重由插件控制」。Flow Calibration 曲线拨轮仍可手动编辑 —— 显式应用液重是用户主动动作，不在静默注入修复范围。旧 POST 插件 settings {FinalWeight} 路径已删（会 reload 插件丢心跳，且用户不允许改）。（HX液重 §3；v03 §1；commit 9e644c2）
12. 非 HX 液重停杯：Decaid 停杯读 workflow.context.targetYield 不读 profile.target_weight（shot_sequencer.dart:451；Bengle 停杯桥同）；Decaid PUT 是深合并，不带 context 就保持原值（旧 bug 永不停杯根因）。applyDials 液重分支一次两字段 {profile:{target_weight:v}, context:{targetYield:v}}；拨轮回读优先 context.targetYield（>0 才用），缺失回退 target_weight；温度应用只发 steps（宿主 Brew tile 语义整条曲线平移，形状基准优先选中曲线存储记录）。（液重 §1/§2；实现 §2.1）
13. HX 杯停杯 = 插件 FinalWeight（≈100g）写 Idle，stopReason=apiStop；改 HX 液重改插件设置，拨轮 / SAW 不是 HX 的液重入口；Streamline 显示目标液重 0 对 HX 是正常态（皮肤按曲线 target_weight=0 下发），不是 bug。（HX液重 §7）
14. 萃取锁定：萃取中拨轮 + 应用按钮锁定；去皮拒绝（ext.extracting || machine.state=espresso，toast 不发请求）；休眠 / 唤醒 PUT /api/v1/machine/state/sleeping|idle，状态以机器确认为准（轮询 / WS 回来再变胶囊），不做乐观切换；休眠弹窗先 GET state（idle/ready → 确认同一行；非待机 → 「不在待机状态」；失败 → 「无法获取机器状态」），sleepSeq 代数防护丢弃迟到响应；已休眠按钮本就是「唤醒」，直接唤醒不弹窗。（实现 §2.1；v05 §1；v03 §1）
15. 状态映射（真机实测，别猜）：休眠 = sleeping/idle；加热期 = idle/preparingForShot（group 爬温，没有 heating 字符串）；热好 = idle/idle；萃取 = espresso。胶囊：已休眠蓝 / 萃取中 / 加热中琥珀呼吸点（含子状态 preparingforshot）/ 待机绿 / 其他原词 / 空未连接。（v03 §1/§2）
16. 去皮：点秤重卡 → PUT /api/v1/scale/tare，失败回退 POST（NSX 皮肤同款端点）；成功 toast「已去皮」，tareBusy 防重入，成功后清 run.lastWeight/lastStamp 防跳变误判；卡左缘蓝色光条提示可点（拨轮卡同款渐变，点击行为不变），不加说明小字、只有 title 提示。累计重量 cumulativeWeightG 直传秤重已核（11-17，审计 m6 关闭）：DE1/Decaid 工作流每杯启动自动去皮（用户确认 + 插件 initial-tare 基线逻辑 + 验收杯 ~0→101.6g 实证），萃取中禁去皮（§5.14）故无中途偏置，正常流程直传秤重=杯重，非问题不改代码。（v05 §1；commit cfff2aa）
17. 学习与记录（插件侧，APK 知悉）：hec 杯 observationOnly=false，进杯间学习与自动下一杯；trace write 行带 external:true 区分来源；接管杯同样进学习（run.config.hecTakeover 记 reason）；增益指纹暂不加模式维度（hec/full 共享增益记忆，用户要学习连续）；HEC 未接管时插件补水计划禁用；校准杯强制 full（external-flow 409 hec-mode-required）；非 HyperEx 前缀曲线插件不介入（extracting 可能仍 true 但 mode 非 hec → 不发指令）。（协议 §5/§7）
18. 回放页隔离：app.js 只 3 处钩子（applyLang 末 HxControl.onLang / renderDe1Pill 末 onMachine / 启动 init——修复批2 m15 后提前到 mergePending 之前并行、6 键 Promise.all 批读，不依赖归档合并），回放逻辑逐字未动；双视图 body.hec-mode 类切换、互隐；模式 dbSet('hecMode')、地址 dbSet('hecBaseUrl') 持久化；连接按钮颜色 = 状态（绿 ok / 红 bad / 灰 off）。（实现 §2.2）
19. 杯末直写归档（v0.7 用户口径）：HEC 直控的杯杯末全点直写回放归档（含 mix 温度），不依赖 recorder 插件；runId = 插件 ext.runId（随轮询跟进），拿不到 runId 不直写；startedAt 从 runId 13 位毫秒段推导（正则 /\d{13}/，兼容 stub- 前缀）；直写和插件导出不许重复、互相验证补全 —— applyFull：新 samples 更长但不带温度、已有带温度 → 保留已有；mergeExport：同 runId startedAt Date.parse 相等（ISO 尾零写法差异）不算冲突；saveArchive 串行化（saveChain），杯末直写与后台抓取不交错。（v07 §1）
20. 温度传感器固定 mix，不做切换（v0.7 用户拍板，v0.5 遗留「传感器选择」就此关闭）；回放页温度只在 cPress 右轴线，不加温度卡；历史 71 杯补温度（Decaid shots 时间窗插值）用户没点名，别擅自做。（v07 §1/§5；v08 §5）
21. 曲线保留：杯结束（机器回 idle/ready/sleeping）run 冻结（runEnded/runEndedAt），样本 / 色带 / 指令台账不再追加、计时停住；所有追加处加 !runEnded 守卫；下一次开杯（extracting && (!run||runEnded)）才新建清空。保留类改动必须测「冻结后不增长 + 第二杯重建」，只测 UI 开关会漏。（v05 §1/§2）
22. 学习中心只读（v0.8 用户口径）：移植插件诊断页「学习成果」只读视图，不移植写操作（校准 / 曲线编辑 / 历史排除留在插件）；入口 = app 标题弹窗，算法学习 / 决策模型 / 仲裁模型三个一级入口并列；在线经 HxControl.httpJson 拉 calibration-status，离线回退归档；归档 commands {stage1:{desiredGS,…}} 形状（可能是 JSON 字符串）经 shotCommandFlows() 归一成在线 commandFlows 扁平形状（nextShotApplied.commandFlows 优先）；gainMemory.drift 是比值（×1.05=+5%）不是百分比，别 ×100；归档保留顶层 gainMemory（merge 随导出更新、导出没有时保留已有、appendRun 不丢）。（v08 §1/§3）

## 6. 影子 / 仲裁口径

1. 影子只记录不发送：sent 恒 false；external-flow 通道「就绪不自动发」；闭环发送 = 阶段 D，需用户另行批准 + 协议 §8 联调清单通过 + 安全门成熟，是单独决策点不是自动演进。（整改单 §0；模型设计 §8/§10；记录缺口 §4）
2. full 档攒标签（用户 11-16 拍板）：「算法候选 = 插件实际写入」只有 full 档成立（插件照常控杯、照常写 A010，模型并联提议、仲裁记录取舍，零风险）；hec 档只用于协议 §8 联调（握手 / 心跳 / 接管演练），其影子杯不作训练标签。旧「切 hec 攒标签」已取代，勿用。（整改单 §0；模型设计 §8 阶段 A；整改回执 §0）
3. 第 1 层硬包线永不放宽：clip 0.10–8.00、1/16 量化、上行压力 ≥限压×0.90 拒上行、== 当前指令 → hold；规则 / 学习共用；学习只动「选谁 / 写多少」，不动「能不能写」。（phaseB §5；模型设计 §5.1/§10）
4. 规则仲裁 v0（保留作回落与对照，逐字）：分歧门控两候选差 <0.5 ml/s 且 preference<0.5 → 判算法；preference∈[0,1] 默认 0.35 偏算法（HxShadow.setPreference(p) 运行时可调，学习证明可靠后往 0.5+ 调）；软预算每杯模型写入软上限 12（是倾向不是墙，preference≥0.7 仍可超；修复批2 m1 后 algo-hold 分支与 both-valid 同口径、旧墙已修；包线 i5 提取 applyEnvelope 单一共用、行为逐字不变；i4 clip 先夹后 snap 恒 1/16 网格）。（模型设计 §5.1；影子初版 §2；fix-batch2）
5. 学习仲裁（阶段 B，模型就绪时默认启用）：替换第 2/3 层（分歧门控 + 倾向 / 软预算）；LightGBM 300 棵二叉树（binary sigmoid，<= 分裂，无缺失值）导出紧凑 JSON app/www/vendor/arbiter_lgb.json（128KB，3322 节点，20 维特征序 + thr 0.5）；纯 JS 递归树评估器与 Python booster 比特级一致（469 行最大误差 1.1e-16，阈值决策零分歧）；未就绪优雅回落规则 v0；阈值 HxArbiter.setLearnedThreshold(t) 运行时可调（0 偏算法 1 偏模型），真机验证前保守。（phaseB §2/§3/§6）
6. 20 维特征：离线 22 维剔除 model_want_so_far / agree_rate（这两维依赖点 universe，离线 ~250ms 密集 vs 影子 ≥1200/800ms 稀疏语义不一致，直接部署会喂错特征）；plugin_writes_so_far 保留（数插件真实写入次数，与节拍无关）；buildFeatures 与离线逐字同序；quanta 传原始浮点与训练同口径。恢复这两维需离线模拟影子节拍出稀疏决策点再建标签（未做）。（phaseB §1/§3）
7. predictedGS 自算与插件同口径：移植 liveTrimRegression 尾段 / 头段加速度外推链（锚点 plugin.js:9134）—— S2 1.6s 窗 / 尾 0.75 头 0.65 / 前瞻 1.5s；S3 3s robust 窗 / 尾 1.2 头 1.2 / 前瞻 1.2s；predicted = fastSlope + clamp(acceleration×horizon, ±0.6×target)，decisionGS = predicted ?? slope。不是机器阶跃拟合公式（死区 0.35 + 爬升 0.85 + τ0.4 是 §22.4 对机器时延的物理描述，整改单该表述已被回执更正）。回归窗必须按 profileFrame===frame 过滤（S3 子帧 2/3/4 各自独立窗），否则子帧切换混帧、一致率掉到 ~94.8%。（整改回执 §1）
8. rescue 自算四判据（锚点 plugin.js:9198 rescueHot）：内部角 ≥120° 连续 ≥2 + predictedRel>25% + actualRel≥12%（2.2.31 实际误差门）+ recoveryTimeEstimate.fastestS > remainingS；remainingS = (阶段目标重量 − 累计)/max(.1, decisionGS)。内部角 = atan(|slope|) 不除目标（liveTrimTick 主判据）；lastCheck.ang 是记录角（atan(|slope|/max(.3,target))）不可复用（整改单「可复用」表述已更正）。r 优先当杯局部增益估计（updateLiveGain 同口径：静默一个回归窗 + R²≥.98 + 快慢斜率一致 + 压力留余量 + 机器流量贴指令），缺省回落 RESCUE_R（S2 1.2 / S3 1.8）；跨杯增益记忆是插件内部状态 APK 拿不到，未移植。救急锁存 + 平静退出（predictedRel<.06 或角 <90 连续 2）+ rescueActive=predictedRel≥.08。判定只供特征与记录，不触发任何写入。（整改回执 §1；§22.4）
9. 阶段目标重量：loadStageWeights() 连接时拉 calibration-status 的 curveEditor.stageWeights（external-status 不带阶段目标重量，救急 remainingS 需要；只读 GET 不改插件）；Stage2Weight / FinalWeight 是插件设置，非 workflow target_weight。（整改回执 §6）
10. writes 台账区分 frame-change / write：帧号变化引起的 lastCommandMlS 跳变记 kind:'frame-change'（带 frame），同帧变化记 kind:'write'；仲裁算法候选只消费 kind:'write'（cup.lastPluginWriteCmd 仅在 write 时置位）；cup.pluginWriteCount 只数真实写入（帧切换不计）。hec 未接管时插件 observe-only 一笔不写，帧跳不是真实写入。（整改回执 §2；整改单 §1；phaseB §3）
11. 决策点 realized / matched：决策点后跟踪同帧下一次真实写入（kind:'write'），回记 realizedCommandMlS / realizedAtMs / realizedFrame / matched；matched = arbiter.pick==='model' 且 realizedCommandMlS===arbiter.commandMlS（同帧、量化后相等）；帧切换不算 realized；杯结束仍无同帧写入记 realized:null（finalizeCup）。matched=true 子集 = 「插件恰好写了模型候选」的无偏响应素材。**11-17 干净验证更正：matched 点结构性平局（model==executed，两侧奖励同实测必相等），只能作植物校准 / 响应预测验证的无偏素材，裁不了「分歧时模型比插件好」；增益裁决须分歧点执行取证（阶段 D）或杯级 A/B。**（整改回执 §3；整改单 R3；clean-arbiter-validation §2.1；用户 11-17 晚拍板）
12. 写后响应窗：决策点后 0.75–2.75s（插件 controlRunReview 同窗，秤时间戳口径）RAW 回归，回记 responseGS / responseR2 / responseWindow；回归复用 weightRegression（去重、跳变 ≤0.6s、R²≥0.90、slope>0）；窗内样本不足或杯尾截断记 responseIncomplete:true。响应属于实际执行的指令；模型候选反事实响应不在此记录（仍靠植物估，S3 不可靠的保留照旧），不得把响应直接标给未执行的候选。（整改回执 §4；整改单 R4；记录缺口 §4）
13. 杯级与导出：cup.modeAtStart（开杯时 ext.mode）+ fixLevel:'r1-r5'；exportJSON 顶层 kind:'HecShadowLog'、schema:2、rectify:'2026-11-16'；并档规则：训练标签只取 modeAtStart=full 且 fixLevel 齐全的杯；hec 杯与 pre-fix 旧杯（1794727769993-1 / 1794731835503-2，无 fixLevel）及 v0.9 残杯只作链路证据，不进训练；11-17 早 pre-fix 失败杯（runId 尾号 -3/-4，杯 1 = 1794868573594-3）虽通过 full+r1-r5 过滤，仍按 runId 排除（真机 §2.1 更正）；离线归档 5 异常终止杯（1794101694516-1 / 1794101891088-2 / 1794102407706-4 S2→S3 过渡失败 + 1794438954177-13 / 1794439491260-14 超压中止）用户 11-17 晚拍板排除出训练 universe、留作压力测试集（贡献 58% 标签行、正率 5.5% vs 正常杯 57.9%；过渡失败是 2.2.43 旧 bug 工况；敏感性：剔后 matched/分歧子集不变）；模拟器/stub- 前缀杯（含 M2 取证脏杯 stub-1794922003805）不进真机训练 universe（真机标签主来源是真机 full 杯历史）；内部运行态（live / pendingRealized / pendingResponse / _decStamp）cleanCup 剥离，不进存储与导出（避免决策点重复序列化）。（整改回执 §5；shadow.js cleanCup/exportJSON；真机 §2.1 更正）
14. 影子决策门 phase∈{stage2,stage3}；相位全 idle 零决策是正确行为 —— 该杯未被识别为萃取中（非 HyperEx 曲线 / 未 arm，或出杯时控制页未连接、hello 晚于萃取），不是 recording bug；live- 兜底 runId 同模式（v0.9/v0.10 各一杯，非回归）。验收杯仍零记录再查相位锁存 / 轮询链路并报统筹。决策门另加 stale 守卫（document.hidden || 轮询断档>1500ms，control.js lastPollSuccessAt；修复批1 M2）：后台/ext 冻结时零决策产出（样本/曲线/杯末检测照常），防冻结上下文脏标签进训练过滤；模拟器实证基线后台 +12 脏决策→修复后零。（整改回执 §12/§13；真机 §2.1）
15. 影子归档有持久化、跨装机存活（统筹 11-17 更正；真机 §2.1 更正；shadow.js）：已结算杯（有 decisions 或 writes）经链式 persist 写入 IndexedDB per-cup objectStore hecShadowCups（keyPath runId，IDB hx-replay v2；修复批1 M1：旧 kv 全数组首载自动迁移保 install -r 存活、≤40 杯 FIFO 按 startedAt 淘汰、链式串行消除交错 lost update、失败记 persistError 且导出回退内存杯按 runId 并档），install -r / 进程重启不清空归档；在跑杯有决策后每 20 个决策 checkpoint，重启只丢末次 checkpoint 后尾部（零决策在跑杯整杯丢）；exportJSON 先 await persist 链尾再读 per-cup store（按 startedAt 排序）+ 当前在跑杯——杯末立即导出含刚结算杯（修复批1 修 M1 丢杯竞态）。**status().archived 只计当前进程内存结算杯（load 不回灌），不等于总归档杯数** —— 观测坑：取证以导出 JSON 为准，别拿 archived 判「零记录」（早上「两杯零影子」即此假象，-3/-4 实有 249/248 样本、4/3 决策）。杯末立即导出仍是好实践：留证据、防观测假象，理由不是防内存丢失。旧口径「纯内存无持久化」/「install -r 重启清内存影子」作废，勿用（见第 10 节）。（shadow.js persist/onCupEnd/exportJSON；真机 §2.1 更正）
16. 奖励口径 = 插件同一把尺子（用户定）：controlOutputQuality 五指标 + controlQualityGood（尾误差 ≤8% / rippleCV≤10% / P95≤15% / 过冲 ≤20% / RMSE÷目标 ≤0.10）；样本奖励 1−|响应杯流−目标|/目标（0.75–2.75s 窗）；杯级加趋势角 0° 占比 / 均值（0° 时段越多越好）。平滑度第一：验收先看 p95|e|、过冲面积、方向反转数、RMSE，均值只做报告；写入次数是字典序第二目标（平直度差在 0.1 g/s 或目标 2% 以内才选写入少的），少写不能省救急、不能放大死区、不能用晚到目标换平直。（模型设计 §3；§22.4/§22.13；影子初版 §1）
17. 写入频率不硬压（用户口径）：模型想写得多（约插件 4×）不靠硬墙拦，交给学习收敛 + 仲裁倾向；软预算是倾向不是墙。（模型设计 §1 口径 3）
18. 离线乐观估计不当真机结论：模型奖励是植物估的，植物 S3 外推不可靠（幂律 b=0.107 近乎平坦，与台账 r≈2.0–2.4 矛盾，因 S3 指令样本范围窄 + 限压杯混入）→「模型更优 62.7%」是乐观上界；方向一致 89.6%（129/144）是硬数据；增益裁决须真机分歧点执行取证（阶段 D）或杯级 A/B——matched 结构性平局只能校准植物，不是裁判（11-17 干净验证更正，见 6.11；分歧点信号 39/43 < 植物校准误差中位 0.096 g/s，S3 病灶支撑集内近平坦而非外推）。phaseB 学习仲裁同：离线训出的是乐观上界，不是已证明改进。首个真机验收杯（1794873721382-6，v0.16）matched=0：模型候选 3 次均未被插件以量化后相等值实际写入，本杯无无偏配对（语义如此，非缺陷），攒 matched 子集需更多 full 杯；学习仲裁真机已生效（kind=learned、thr 0.5、逐点 pModelBetter 在录）。（模型设计 §4/§6/§10；phaseB §6；真机 §2.4）
19. bc_v0 训练口径：只用 2.2.41+ 当示范（旧版本控制律不同，不能当正确决策示范；旧杯只进植物模型）；按杯切分 24 训 / 5 验防泄漏；write 点损失加权 8×（hold 占 93%）；13 维特征单一真源 D:/vscode/.tools/hx-train/pipeline/bc-features.js，APK shadow.js 逐字同序（rawGS_norm, errorPct, predictedError_norm, trendAngle_norm, pressureBar, machineFlow_norm, cumWeight_norm, command_norm, targetGS, phase_s2, phase_s3, regR2, rescue）；植物模型用全版本（物理不随算法变），S2 幂律 a=2.30/b=0.48 可信（接近台账 low 纸 2.177/0.524），S3 样本范围内 LightGBM/MLP 可用、外推必须夹取。（模型设计 §2.1/§4/§7）
20. RAW 回归与趋势角口径：RAW 重量 vs 秤时间戳，S2 1.6s / S3 3s 窗，去重、相邻跳变 ≤0.6s、R²≥0.90、slope>0；RAW dW/dt 相邻秤快照差分，去皮重置识别 TARE_RESET_THRESHOLD_G=2.0，scaleTsSec 兼容 ns/us/ms/s；趋势角（§19）：相邻带 rawGS 检测点连线 vs 目标线夹角，2% 带内斜率 ≈0 记 0°，朝目标 atan(|slope|/max(.3,target))、平行 90°、背离 180−atan，检测点节奏 ≥1s、最近 1.2s 线性拟合 r²≥0.5。machineFlow 是泵模型估计不是流量计：永远不用 machineFlow 当杯流真值做 targeting / 验收，用 RAW 秤回归；第一反馈是 RAW 秤斜率，targetFlow 回显不是写入确认。（模型设计 §2.1；实现 §2.1；§19）
21. 决策模型路线：bc_v0（已完成，只会复刻插件，目的是验证链路 + 攒仲裁标签）→ 真机影子几十杯 → d3rlpy CQL 离线 RL（主力；不用在线 RL —— 仿真植物不可信；离线 RL 学不到数据里没有的动作）→ 植物 S3 修正后反事实评估 → 真机影子验证 → 仲裁倾向逐步偏模型。奖励用五指标稠密化，不只用 good 布尔（好杯稀缺）。（模型设计 §2.2/§2.3/§8）

## 7. UI 口径（用户定稿，别回退）

1. 界面小字只用于状态 / 标题，非必要不加「怎么操作」提示（无「上下滑动 / 点击这里」类）；交互靠控件本身表达；报错 / 权限 / 空态功能性提示保留。示意稿的操作说明都在页脚「示意说明」，不在 UI 内。（AGENTS 17；UI示意 §1；实现 §3）
2. UI 改动流程：先出示意稿（D:/vscode/.impeccable/mocks/hec-ui5/ 同款：真令牌 + 真视口 1138×633 + 标注在设备框外，编号圆点别放框内）给用户确认，点头再改代码。（v013 §4；v012 §4；AGENTS 20）
3. 标题配色定稿别改回：h1 .ttl 小写灰 #8b93a1、.ttl-a（H/E/C 三个大写）白 #ffffff、.appver 版本号琥珀 #e8833a（用户依次否掉琥珀 / 红 / 黄方案后定的）；学习中心选中态沿用琥珀口径。（v03 §1；v08 §1）
4. 顶栏：所有胶囊 / 按钮统一 34px 高；recorder 胶囊紧跟只读 / 握手胶囊（左侧）不靠右；预算 / 拒绝在左侧 HEC 指令卡内（kvBudget/kvRejects 两行）不在顶栏；指令卡标题「HEC · 本杯锁定」（HEC 大写），自然布局不做下沿对齐（对齐尝试撑出左侧滚动条，用户点名撤销）；接管时换成接管卡（原因 / 时刻 / 当前指令）。（实现 §3）
5. 七卡对齐：标题七卡同一水平线、数值 / 相位胶囊垂直居中（.card .v 改 flex 居中，修残留 margin-top:3px 与胶囊 inline 基线偏移；° 上标保持置顶）；状态卡单行（标题左 / 数值右）卡高 38px；宽屏 + 窄屏（1138×633）两视口无裁切、侧栏溢出 0（__v09-regress）。（commit fd75aa0；v05 §1）
6. 侧栏：aside 219px；#sideToggle 窄胶囊 16×52、opacity .45 碰 / 按亮；收合 body.side-collapsed #controlAside margin-left:-219px（240ms）；状态存 hecSideCollapsed；收合后 setTimeout drawCharts 重绘；button.side-toggle:active 锁 translateY(-50%)（全局 button:active 的 scale(.97) 会把按压中的把手拽跳 26px，用同特异性后置覆盖）。（v011 §1；v012 §1）
7. 断口分隔线画 main::before：展开 left:219、收合 left:0（.24s 与侧栏同步），两态都保留上下两条线（渐变中间 64px 透明，不穿胶囊），把手中心始终骑线（219 / 0）；别把线画回 aside（overflow-y:auto 会裁掉 right:-1px 伸出的伪元素 → 整条线消失）；控制页 aside border-right:0；断言 lineLeft==handleCenter 两态成立。（v011 §6；v012 §1）
8. 侧栏自动隐藏（v0.13）：开关在控制中心 · UI 设置下，RAW 同款小开关（.rawtoggle .sw 30×17 琥珀），不拉整行、不加说明小字；默认开，存 hecSideAutoHide；行为：萃取启动瞬间（st=espresso 开杯钩子）自动收合，杯末（回 idle/ready/sleeping）3 秒后自动展开，手动按把手 clearTimeout 取消待执行自动展开，关 = 纯手动；setSide(v) 与持久化分离，自动动作不写 hecSideCollapsed；EN=Auto-hide sidebar / UI Settings / Function Settings / Other。（v013 §1）
9. 控制中心三分类：UI 设置 / 功能设置 / 其他（.lrn-sec>h4 分区小标题），后两类空着等内容等用户定义；隐藏二级入口与只读脚注；学习中心三个二级入口（算法学习 / 决策模型 / 仲裁模型）+ 记住上次 tab 照旧；文件夹标签（控制中心 / 学习中心）选中与主体同底、下缘开口连体、首个标签上缘与弹窗外框上缘齐平（.lrn-top padding-top:0 + position:relative;top:-1px；flex 不采纳负 margin，别用 margin-top:-1px 修）；蓝色只留选中文件夹左缘 2px 渐变亮条（首页拨轮卡同款）。（v013 §1；v012 §1；v011 §1）
10. 学习中心弹窗：宽 80%（dim 16px 内边距内）、高 min(86vh,860px)；✕ flex 居中（28×28 外框不变）；标题弹窗学习中心标签在前（v0.14）；重开记住控制中心时内容不被学习中心覆盖（openModal 尾部多余 renderBody + fetchLive 回调无条件 renderBody 两处已修）；关闭 ✕/Esc/点遮罩；重复开关不重复挂监听；i18n 完整（自己的 EN 表）。（v011 §1；v012 §1；commit 2546806/b2d422a；v08 §1）
11. 曲线弹窗：80% 宽；顶 6 常用位（hecFavCurves 按标题存本机，空位虚线）；每页两列网格、六条共享行轨（grid-auto-flow:column + grid-template-rows:repeat(6,auto) → 跨列 top 差 0、行距 44、高 38）；页自带 padding:0 16px 使页宽 = 滚动口宽（下一页不露边）；scroll-snap x mandatory + 底部圆点；打开归零 scrollLeft；长按 500ms 弹 6 槽菜单（空位加入 / 占用替换 / 本槽移除），点外关闭必须判 menu.contains(e.target)（否则真机点菜单项的瞬间菜单先被关、点击落空）；占用多槽的曲线逐槽显示「移除」。（v011 §1/§5；v012 §1）
12. 曲线行内容顺序（三次口径迭代最终版）：曲线名 → 支持HEC 胶囊（仅 hx，与常用位同款琥珀胶囊，EN HEC ready）→ 温度·目标液重（curveMeta()：steps[0].temperature / target_weight）→ 常用N；非 HyperEx 不挂任何标签（用户：绝大部分非 HyperEx，不用提示）。（v011 §5；v012 §1）
13. 温度 / 液重拨轮：Orbitron 大数字左对齐（内嵌 woff2 离线可用）；▲▼ 是拨片（30×14px 宽扁，内部三角 SVG 6×4px），▲ translateY(-1px)、▼ translateY(1px)；按住数字上下拖动可调；步进 0.5、边界夹取（温 70–100、重 10–300）；数值变化 bump 动效；萃取中锁定；HX 液重锁光带暗红 #b04a44 + toast。最坏值 300.0/100.0 数字区不裁切（nowrap + min-width:0）。（实现 §3；v03 §1）
14. 实时曲线双样式（控制中心 · UI 设置，hecChartStyle 持久化，默认 1）：
   - 样式 1 双卡：杯流图纵轴 flowRange 自适应 —— 只看 decaid 杯流 + 目标杯流，上限 = max×1.15 向上取整、最小跨度 3、下限 0、无数据回退 0–8，RAW 尖峰不带动轴，杯内只扩不缩；上限不被 4 整除时刻度一位小数（axes dec 可选参，温度轴调用不传、不变）；压力温度图左轴 0–10、右轴 tempRange 真实 °C 5 档，图题只写「温度」。
   - 样式 2 合并图（v0.14）：两卡合一，左轴固定 0–10（6 格）、右轴温度自适应去标题，图例点击隐藏 / 显示（seriesOff），RAW 开关 / 滤波窗拨轮移到合并图头。
   - 实时曲线宽度五档滑块（UI 设置，等比 √2 [0.5,0.71,1,1.41,2]×、中档 = 现状，仅实时图，存 hecCurveWidth）；合并图配色压力改绿 / RAW 滤波改白（仅样式 2，图例随动）。（commit 2a5361b）
   （v013 §1；commit 2546806/2a5361b；control.js drawCharts/drawMerge）
15. tempRange（温度纵轴自适应，v0.6）：取本杯样本 temp min/max（目标温度 dial.temp.v 也纳入），上下各留 max(1, 跨度×0.15) 边距后 floor/ceil；跨度不足 6°C 以中心扩到 6°C；无数据回退 {lo:88, hi:96}；每次重绘重算，数据只增不减、量程只扩不缩。固定 88–96 窗口旧口径已取代（削顶过冲、压底深蹲）。（v06 §1）
16. 相位色带：S1 蓝 / 泄压红 / 浸泡紫 / S2 橙 / S3 绿；开杯即落第一段色带（用插件当前相位，避免 S1 标签重叠）；非 HX 实时图内 step 色带 + 步编号（中性灰蓝交替带、带内标「步N」，steps[step].name 有名字标名字，两图都画，开杯后非 HX 且 extracting 按 machine.profileFrame 变化记切换点；HX 的 S1–S3 语义色不动）；状态卡下面的概览胶囊（stepstrip）用户明确不要、已删，别加回来（两度点名：先「三个胶囊去掉」，误撤全 m8 被纠正「只撤胶囊」）。真机待验：profileFrame 是否随 step 递增（色带信号第一次真机验证还没做，模拟器是注入），不符先问用户再换信号。（实现 §3；v013 §1/§4）
17. 趋势矢量箭头：指令增 → 上半圆（蓝）、减 → 下半圆（黄）；控制角定半圆内实际角度；长度 = |指令差|，上限 MAX_LEN=72px 且夹在绘图区内，超限按上限画示意（方向 / 角度仍真实），超长时在角度旁标真实指令差（如 +2.50，capped 判定 rawLen>len+0.5）；角度标注在箭头起点，数字 10px + ° 上标 7px；趋势角卡数字 + ° 上标（sup.deg 9px vertical-align:super）。（实现 §3；UI示意 §1）
18. 杯流卡同源 + 稳定化（用户 11-17 定）：显示 weightFlow 优先 RAW 兜底；EMA 0.5 + 0.5s 刷新；杯内断档保持；杯末 / 空闲回 —；机器快照补 renderCards 重绘。（commit c417157；HX液重 §5）
19. 萃取中温度 / 液重红条锁定（v0.14）。（commit 2546806/66bb463）
20. RAW 滤波仅显示层：居中时间窗滑动平均（双指针 O(n)）实线为主体 + 原始散点（alpha .28、stride 限 600 点）；窗宽拨轮在 RAW 开关旁：0=关、0.5–2.0 步长 0.1、0.5 下一档=0、默认 1.0s；趋势角 maybeCheck 与影子仍用原始 s.raw，不受滤波影响；图例随开关变。（v05 §1）
21. 水位胶囊：第三路 WS waterLevels（currentLevel/refillLevel，mm，与插件同源）；胶囊在休眠按钮左侧；≥33 满格淡蓝、18–33 淡蓝按 mm/33、12–18 黄、<12 红 +「缺水」前缀、进度固定 10%；无数据 / 未连接隐藏。（v05 §1）
22. 事件日志卡已移除（用户点名取消），操作反馈改底部短暂 toast（hecToast 2.6s），不占曲线空间；相位胶囊仅 idle 加 .idle 类 16→12px（S1/S2/S3 不变）；「本杯锁定」蓝色小胶囊在曲线卡 curveTag 右侧（.curvetags，仅 hx 且未接管显示），旧 hecchip 已去掉；侧栏 kv 行高 17px、hecbox padding 7、aside gap 8（去滚动条定稿）。（实现 §3；v05 §1）
23. 前台常亮：MainActivity onCreate FLAG_KEEP_SCREEN_ON；切后台 / 退出自动恢复系统熄屏。用户定「前台常亮」而非精确 20 分钟计时。（v05 §1）
24. i18n：control.js/learn.js 自带 EN 表，共用词回退全局 t()（window.t）；applyLang 只扫 data-i18n，动态创建的节点要在 applyLang 重渲染或补 else 分支；模式下拉副标题用 id + 中文键（裸键中文 t() 回退显示键名）。（实现 §2.2；技能坑 21；v03 §1）
25. WebView 交互坑（项目特有）：class 的 display:flex 会覆盖 hidden 属性（UA [hidden] 特异性低）→ 条状容器加 [hidden]{display:none}；开关 input 是 0 尺寸 opacity 0，tap/点击瞄准可见的 #sideAutoHide + .sw；弹窗开着时点标题 = 点 dim = 关弹窗，状态感知脚本先读 lrnDim.hidden 再决定点不点标题。（v013 §3）
26. 回放页温度线：cPress 右轴（#f2a0aa，1.6px，真实 °C 5 档，pad.r 34），tempRange 口径同控制页（app.js 与 control.js 两个 IIFE 各一份，别过度抽象）；tempSource()：raw 优先的杯（合并插件导出后 isRaw=true）温度在 samples 里，经 nearestSample 按 tMs 取（只看 frames 会让合并后的杯温度线消失）；无温度杯温度线 / 右轴 / 图例都不出现，pad.r 保持 10，老数据零影响。（v07 §1/§3）
27. 目标类曲线一律按逐样本历史画（v0.23 用户定稿，别回退）：杯流目标 tgtHist（样式 1 杯流卡 + 样式 2 合并图同改）、压力卡目标指令 sc.tcmd 是参照写法 —— 换段后旧段保留旧目标，不被当前值覆盖；未启动不画、不分段；HX 空闲不画 profileTargets 步参考。禁止用当前值重建整条历史（targetSeries 模式换段会把旧段盖成当前值，已删，见 10.16）；seriesCache 仍逐样本 push tgtHist。非 HX 步参考（杯流 / 压力 / 机器流量）、HX 压力卡（目标指令黄虚线 + APK 指令橙实线）、非 HX 压力卡（tgtP 黄 + tcmd 蓝）口径不变。（v023 §1；commit a0cb6b0/6776a3e）

## 8. 真机 / adb 坑

1. 平板通道：adb mDNS 名 adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp 直连（端口重启会变）；app/tools/tablet.json 的 connect「192.168.31.15:46113」已失效，别用；灭屏 mDNS 不广播、5555 不通（无线调试端口随机，别扫全子网），亮屏 / 重开无线调试即恢复。（整改回执 §12；v011 §3；v013 §2；影子初版 §7）
2. 包名 com.ladios.hxcontroller（与旧 hxreplay 不同包）。HyperOS 3 对全新包名 adb 安装报 INSTALL_FAILED_USER_RESTRICTED（不是签名问题，同 debug.keystore；签名不符会报 UPDATE_INCOMPATIBLE）：第一次推 APK 到 /sdcard/Download/，用户在文件管理里手动点安装（原生安装器绕开 adb 静默校验），装完这一次以后同包名升级又能 adb 静默装；file:// 的 VIEW intent 被 HyperOS 拦、MediaStore content URI 也未走通，手动最稳。（影子初版 §6）
3. 锁屏 / 通知栏遮罩压 WebView 视口 0：wm dismiss-keyguard 解锁 + am start 拉前台再复量；mCurrentFocus=NotificationShade 时 BACK+上滑无效也用 wm dismiss-keyguard。（技能坑 11；整改回执 §12；v011 §0）
4. 出杯前确认控制页「已连接」胶囊亮 + 秤遥测新鲜：秤休眠 scaleAgeMs stale（实测 88s/298s），须物理唤醒 / 重连秤并复测 scaleAgeMs 回到几百 ms 级才放行出杯 —— full 档插件「只在新秤样本时决策」（§22.4），秤休眠不只是 hec telemetry-stale 门问题，会直接让 full 杯缺决策样本、影响调流质量。（真机 §2.2/§2.3）
5. 出杯期间 HEC 控制页保持前台亮屏到杯末：poll() 在 document.hidden 时跳过，切后台 → ext 相位停 idle → 零决策（重蹈 v0.10 覆辙）；首测 ext=null/helloOk=false 是后台 → 前台瞬态，拉前台后 700ms 周期恢复（external-status 兼刷新心跳，无需重发 hello）。（真机 §1）
6. 每杯末立即导出（HxShadow.exportJSON()，异步 promise 先 kick 后读避技能坑 8），带时间戳另存（.tools/__rectify-tablet-shadow-export-live-<ts>.json，跑 __live-cup-export.ps1 + __rectify-tablet-check.cjs），连出多杯也逐杯导出，核对后回叫统筹；归档持久化跨装机，导出是留证据 / 防观测假象（见 6.15），不是防内存丢失；杯末 forward 可能失效（socket hang up / 拒连），重建 forward 再导出。（真机 §2.1 更正 / §2.4 / §3；整改回执 §12）
7. adb 老服务僵尸拖死所有新客户端（devices 都挂）：Stop-Process 老服务 + 遗留客户端再 start-server。（v011 §3；v012 §3）
8. 平板 CDP：Runtime.evaluate 里做 click 会挂死通道（桥接互扰）→ 点击改 Input.dispatchMouseEvent；adb tap 要 ×dpr 且受锁屏 / 弹窗开合状态影响；挂死后：杀残留 node（Win32_Process CommandLine 过滤）→ force-stop → am start → 重 forward → 重取 wsUrl；Input.dispatchTouchEvent 在此 WebView 不回包（挂死），手势测试改 JS 派发 TouchEvent（new Touch + dispatchEvent）走页面自己的监听器，手势前先 scrollIntoView 回可视区再取坐标。（v013 §2；技能坑 13）
9. 真机 CDP 偶发 TIMEOUT：重 forward + 亮屏重试即恢复，别改代码；conn=bad 多数是 Decaid 没在跑，不是代码问题；真机 Decaid 地址 http://127.0.0.1:8080（模拟器桩是 http://127.0.0.1:<stubPort>）；可 adb forward tcp:8081 tcp:8080 后本机 REST 只读取证。（v05 §2；实现 §5；v06 §2.3）
10. 真机视口 1138×633；wm size 报竖屏自然尺寸，横屏要交换；CDP 窄屏测量按 3.5 强制重排后再量。（v03 §2；v013 §2；v05 §2）
11. 插件版本门槛：真机插件 ≥2.2.48（GET /status calibration.pluginVersion 实测）；2.2.47 → pluginOk=false，无握手无 external-status，影子拿不到决策上下文；插件升级包推平板 Download/ 由用户装。（影子初版 §0/§6；真机 §0）
12. 真机取证角色边界：只读监测与取证，不改插件 / APK 出厂代码、不发版、不推送、不开闭环（阶段 D gated）；影子 sent 恒 false；第 1 层硬包线永不放宽；单一写者（插件代写 A010）；adb / 回环一律提权；pre-fix 失败杯标注不进训练标签，对照杯非 HEC 影子杯。（真机头 / §2.1）
13. 取证进程核对：pidof 可能返回多个 pid（首 token 不一定前台），双进程 / 双任务会误导连到后台旧进程 —— 导出前确认 am start 拉起的前台进程；「零记录」先怀疑观测口径（archived 语义 / 连错进程），以导出 JSON 为准，别急着定 recording bug。（真机 §2.1 更正）

## 9. 设计资产 / 生图坑

1. 图标几何单一源：review/hec-icon/final/build-icon.ps1 + 母版 review/hec-icon/final/hec-icon.svg；改设计改脚本几何 / $bgHex / $fgHex（同步改 app/src/main/res/values/colors.xml），重跑脚本出 SVG + 全部 PNG。色值：底 #3D2C17、字 #F5C078；结构 4B 共笔画连字（H/E 共竖、E 上下横 45° 斜切桥接 C、C 径向开口环）；1024 画布参数（笔画宽 64、字高 336、各笔画坐标、legacy 方标占 62% / 自适应前景占 60%）照脚本，别凭记忆改。（图标 §1/§5）
2. 图标进包 = 15 张 PNG 逐密度（mipmap-{mdpi..xxxhdpi} 各 ic_launcher / ic_launcher_round 48/72/96/144/192 + ic_launcher_foreground 108/162/216/324/432 透明底）+ mipmap-anydpi-v26 两个 adaptive-icon XML（background=@color/ic_launcher_background、foreground=@mipmap/ic_launcher_foreground）+ colors.xml + AndroidManifest android:icon / roundIcon 两行；覆盖进 res 用图标交接 §5 脚本；验证：assembleDebug + zip 条目（15 PNG + 2 XML）+ aapt2 dump badging（application-icon 各密度指向 anydpi-v26）。（图标 §2/§3/§5）
3. review/ 设计资产不进包；入库范围：res 全部新增 + manifest + 交接 + review/hec-icon/final/（SVG / 脚本 / 成品 PNG）与 final-preview.png；过程卡池（c*-*.png、r3-*、r4-*、dbg-*、contact-sheet / card-pool / color-pool）不入库，仅本地留存。图标批已随 v0.16 发版（99b40ef / 646080a），final/ 设计源已入 git（仍不进 APK 包）；图标交接 §4「未发版 / 未 push」状态行已过时，以 HX液重 §9 为准。（图标 §2；HX液重 §7/§9）
4. 取证目录分工：.impeccable/review/ 本地取证（gitignore，不随代码入库）；.impeccable/mocks/ 示意稿随代码入库。展示不受忽略影响（从 review/ 引用的实拍也能显示）。（AGENTS 15 配套；v011 头）
5. 生图（百炼 bl image generate，token-plan profile）：抽卡一律 --n 1 单张请求 —— --n 2 在该端点会丢提示词返回无关图（2.10.1 实测）；qwen-image-3.0 在 token-plan 端点 404，用 profile 默认 wan2.7-image。（图标 §6）
6. 图标换装不影响 www / 桥 / shadow / arbiter 任何逻辑；图标验证包（gradle 打磁盘现状，可能含别人未提交 index.html）不是发版基线，发版照 SOP 先升版本号 + 装机回归，且先问用户。（图标 §4）

## 10. 已取代的旧口径（勿用）与冲突核

已取代（以最新用户拍板 / 代码为准）：
1. 「HX 曲线切曲线照带拨轮残留液重」→ v0.15/v0.16：/^HyperEx/i 标题曲线（含 Flow Calibration）发曲线自身 target_weight。（HX液重 §2/§8）
2. __yield-regress 旧第 5 项（HX 照带拨轮值当预期）→ 已改新口径，现 19 断言。（HX液重 §2）
3. 「切 hec 攒标签」→ full 档攒标签，hec 只验链路。（整改单 §0；模型设计 §8 已更正）
4. HX 液重 POST 插件 settings {FinalWeight} → v0.3 删除，改锁定 + toast（reload 丢心跳 + 用户不允许改）。（v03 §1）
5. 温度传感器选择（mix/group/steam 切换）→ v0.7 用户拍板固定 mix，关闭。（v07 §1）
6. stepstrip 概览胶囊 → 用户明确不要，已删别加回。（v013 §1）
7. 事件日志卡 → 已移除，反馈改 toast。（实现 §3）
8. 固定 88–96 温度轴 → tempRange 自适应（v0.6）；样式 2 合并图右轴去标题（v0.14）。（v06 §1；commit 2546806）
9. 整改单「predictedGS 用机器阶跃拟合公式」→ 回执更正：移植 liveTrimRegression 外推链（plugin.js:9134）。（整改回执 §1）
10. 整改单「趋势角 lastCheck.ang 可复用」→ 回执更正：记录角 ≠ 内部角，救急角在 shadow 内自算。（整改回执 §1）
11. gh release 带附件 / 夸克 MCP upload → REST 直传 / quarkclouddrive CLI（见 4.5/4.6）。（v011 §3/§6）
12. 「影子杯纯内存无持久化」/「install -r 重启清内存影子」→ 影子归档持久化跨装机；status().archived 是当前进程内存计数（观测坑，取证以导出 JSON 为准）。（真机 §2.1 更正；统筹 11-17 更正）
13. 图标交接「未提交 / 未发版 / 未 push」状态行 → 图标批已随 v0.16 发版（99b40ef / 646080a），以 HX液重 §9 为准。（HX液重 §7）
14. 「真机 matched 作增益最终裁判」/「离线能证出增益」→ 11-17 干净验证：单点只执行一条指令，matched 必平局、分歧 model 响应必反事实，干净正类结构性为空（N=32 全平局、纯净窗 12、分歧 43 不可裁；旧 headline 0.615 = 同指令植物估 vs 实测校准噪声 Wilson95 [0.513,0.709]）；matched 改作植物校准素材，增益裁决待阶段 D 执行取证或杯级 A/B（S3 独立 Δ=0.03 g/s 约每臂 49 杯）。路线拍板：离线植物校准先行、真机暂缓；5 异常终止杯排除出训练 universe 留压力测试集。（clean-arbiter-validation §0/§2.1/§3；用户 11-17 晚拍板）
15. 「S3 植物近平坦是可修掉的拟合伪影」/「植物修正能收紧上界」→ 11-17 第二轮校准：近平坦是反馈控制 + 粉饼保留/漂移下 0.75–2.75s 响应窗内的真实有效斜率（§19 稳态线性 β=0.416 g/s per ml/s，簇 bootstrap CI [0.14,0.73]、素材子集敏感 0.03–0.42），与稳态比值 r（中位 1.27–2.28）差 5–10 倍、是不同物理量；中位 cup/command 直接当窗内斜率是范畴错误（pristine MAE 0.54）。修正模型 plant_v1_s3 在所有干净验证集校准比 v0 差（pristine12 MAE 0.073→0.136），植物 headline 随模型选择双向漂移（v0 0.615→v1 0.736→M1 22/71）；归谬：只预测中位数的常数模型植物评分「优于插件」70/71=98.6% → picked-better 量的是校准几何不是策略质量。定位：v0 留主参照、v1 作敏感性上界（统筹接受）；S2 低流量稳态素材 0、校准不可行沿用 v0。离线植物修正路线在没有更多真机稳态素材前不再推进。（plant-calibration §0/§2/§3/§4）
16. 「目标曲线用当前值重建整条历史（targetSeries / sc.tgt / tgtVal）」→ v0.23 改按逐样本历史 tgtHist / sc.tcmd（换段保留旧值、未启动不画不分段）；targetSeries() 与 sc.tgt/tgtVal 已删（孤儿清理）。（v023 §1；commit 6776a3e）

冲突核（报统筹，不擅自取舍）：
- 影子持久化表述（统筹 11-17 已更正，闭环）：真机交接 §1 旧句「cups 纯内存、无持久化」与统筹派单旧句「install -r 清内存影子」均作废；shadow.js persist() + 08:16 导出（9 杯含 11-15 旧杯）证明归档持久化跨装机，早上「两杯零影子」是观测假象（连到后台旧进程 + archived 只计当前进程内存杯；-3/-4 实有 249/248 样本、4/3 决策，影子管线早上即正常）。本文件 6.15 / 8.6 / 8.13 按更正后口径写；真机交接 §2.1 已附更正（§1 旧句留作历史记录，以 §2.1 为准）。
- __m6m8-regress.cjs / __m6m8-stub.cjs 位置（统筹 11-17 已更正，闭环）：在父仓 D:/vscode/.tools，不在 APK 仓 .tools；先前「已不在盘」是只查 APK 仓 .tools 的误判，脚本齐全可复跑（见 3.7）。
- 其余未发现无法按时间判定用户最新意图的口径冲突。

## 11. 当前基线与待拍板（2026-11-17 快照，新对话先 git log / dumpsys 复核）

- 仓 HEAD 38df7de（v0.23 交接定稿，11-18 晚；下接 v0.16–v0.18 历史发版记录）。当前 v0.23 = 目标杯流历史化批（样式 1+2，tag v0.23，Release 450011833 / asset 763474919，APK 6,731,125 字节 SHA256 EDB2F5A14C18C5659C0C07C62E1D2705CF435C4C5CA0D181351DF1577DEB4AD5，夸克 8c7f7e47378b426a9df5bf2e45ce3afb，父仓 a936b89；子模块 6776a3e/94803be/38df7de；平板+模拟器 v0.23 冒烟通过；回归 v4 14/14 + flowcard 6/6 + boot 8/8）。v0.19/v0.20 = 修复批 1/2 发版并装平板 versionCode 20（11-18 统筹接力通知）；v0.22 = UI 目标线批（Release 449956741 / asset 763329190 / 夸克 3096730d）。两侧 git 全同步无待推、审计 34 项全闭环、离线验证三轮到顶（11-18 接力通知；状态真源本仓 HEC_COORDINATOR_STATE.md 活文档）。已发版：v0.16（Release 447789185，APK 6,717,371 字节，夸克 fileId f817ee88ea10448cb60722594e765fa9）+ v0.17（294e57f 系统设置弹窗小字移除 + 2a5361b 合并图配色/曲线宽度滑块，平板 2026-11-17 08:32:34 装 versionCode 17） + v0.18（启动闪屏修复 51056e5，版本号 164aee6，Release 448471157，APK 6,703,446 字节，夸克 fileId 370500440749423ab456dcf7cc9fbcf0；平板 2026-11-17 18:31:04 装 versionCode 18、模拟器同装；用户 11-17 晚授权发版）；回归 m10 20/20、m6m8 8/8+5/5、flowcard 6/6、__boot-check 8/8。插件 2.2.48（用户「新插件」= autoApplyNextShot=true 设置开关，非新代码包，版本旗闭环）。子模块 main 已推至 15dccc1、tag v0.18 已推（统筹远端核过）；父仓指针 b99640a + 249f5f6 已推（用户 11-17 晚授权，统筹远端核过）。夸克 v0.6 欠传用户取消不传。
- 修复批1（11-17 晚，用户授权审计修复）：本地提交 e3d0d95（M1 persist 链式 per-cup 存储 + m2 持久化同口径 + m3 phase parity + M2 后台 stale 守卫 + M3 asset loader 流式 + M4 重绘节流），回归 R2–R5 27/27 + 阶段 B 15/15 + 探针 30/30、红线复验 PASS（统筹复跑核实）；已发版 v0.19 并装平板（11-18 统筹接力通知；原「待发」状态作废）；m1 软预算墙与其余 minor 待另批。详见 HANDOFF_2026-11-17-hec-fix-batch1.md。
- 修复批2（11-17 晚，用户 broad 授权「所有不需真机杯验证的」）：本地提交 0ab52ac，审计剩余 20 项全清（m1 软预算对齐 §6.4 + 可靠性 m4–m12 + 效率 m13/m15–m18 + UI i11/i12/i7 + 维护 i5/i3 + 理论 i4/i9/i10 加固，i8 不动），回归 R2–R5 27/27 + 阶段 B 15/15 + 探针 50/50 + m5 parity 6/6、红线 PASS（统筹复跑核实）；已发版 v0.20 并装平板 versionCode 20（11-18 统筹接力通知；原「待发」状态作废）。审计可离线修复项全部闭环；剩阶段 D 增益裁决 / hec §8 演练 / 后台守卫真机复核 / 非 HX 色带待真机。详见 HANDOFF_2026-11-17-hec-fix-batch2.md。
- 真机验收杯 PASS（1794873721382-6，v0.16，full，2026-11-17 08:02，真机 §2.4）：completed at 101.60 g、stopReason=apiStop、context.targetYield=0 → v0.15 液重修真机生效；S2 HIT +3.1% / S3 HIT -4.1%；影子 682 样本 / 35 决策、predictedGS 31/35、responseGS 34/35、matched=0（语义，攒无偏配对需更多 full 杯）、writes 7 = 4 write + 3 frame-change 零混入、学习仲裁真机生效（learned thr 0.5）、sent 恒 0；导出 9 杯落盘 .tools/__rectify-tablet-shadow-export-live-2026-11-17T0816.json（含早上两杯，归档跨装机存活）。统筹核过 c417157..HEAD 影子 / 仲裁 / 桥零改动。
- 待用户拍板 / 待验：① 夸克 v0.6 历史欠传——用户 11-17 取消，不传（闭环）；② hec 档 §8 链路清单真机演练（用户 11-16「没空测真机」暂缓，不阻塞离线交付）；③ 控制中心「功能设置 / 其他」两分类内容等用户定义；④ 真机剩余：校准杯验证（不再被 SAW 残留值提前停，HX液重 §9）+ 非 HX profileFrame 色带验证（信号第一次真机验证，模拟器是注入；不符先问用户再换信号，v013 §4）。R1/R3/R4 真机数值已有验收杯证据（真机 §2.4），不再是空白。⑤⑥（v0.18 装平板/发版、父仓指针建推）已按用户 11-17 晚授权完成，见基线条。
- 数据口径（用户 11-17 晚更正）：S3 设计工况就是低流量（命令 ~0.1–1.5 ml/s），「S3≥5 ml/s 标定样本」待办撤销——植物模型只需在设计命令范围内校准（用 observed realized 响应），不外推到系统不用的 5 ml/s。离线已有 21 杯全点 + 469 仲裁标签行（.tools/hx-train/data，仲裁已训已回放 CV AUC 0.865；样本小有过拟合风险、模型候选响应是植物估的乐观数）；真机新杯补样本/当前版本验证/干净 matched 标签，不是标签主来源，不压杯数指标、随缘攒。今晚 -6/-7 已验证管线 + 首批真机证据（matched=1）。出杯前复冒烟清单照旧（版本/心跳/mode=full/秤遥测几百 ms/胶囊亮/前台亮屏，逐杯导出）。（真机 §3；hx-train replay_learned_arbiter_report.json）干净仲裁验证（11-17 晚，用户拍板）：离线证不出增益（结构性，见 §10.14）；matched 改作植物校准素材；5 异常终止杯排除出训练 universe 留压力测试集（见 6.13）；路线=离线植物校准修正先行（第二轮已派 hx-train），阶段 D / 杯级 A/B 暂缓。（hx-train HANDOFF_2026-11-17-clean-arbiter-validation.md / clean_arbiter_report.json）第二轮校准回执（11-17）：S3 近平坦是响应窗真实有效斜率非伪影，v1 校准比 v0 差、植物中介上界双向不可信（§10.15），v0 主参照 / v1 敏感性；S2 低流量稳态素材 0 不可行；离线仲裁验证路线到顶——增益裁决只等真机（阶段 D / A/B，暂缓），matched 继续随缘攒作校准素材，更多 full 杯后才重启 S2 低流量 / S3 settled 扩充。（hx-train HANDOFF_2026-11-17-plant-calibration.md）
- 父仓指针：11-17 已推（60e51d1 及 v0.16 指针，用户拍板）；后续指针推不推仍问用户（授权只对当次有效）。
- 工作区别人 WIP（2026-11-17 本对话执行期间快照）：HANDOFF_2026-11-17-hec-live-cups.md（取证对话未跟踪，已附 §2.1 更正 / §2.4 验收）、review/hec-icon/ 过程卡池（图标对话未跟踪；final/ 设计源已入 git）—— 都不碰不代提交；control.js 早先未提交的 12 行改动已由 UI 对话提交为 2a5361b；本批只新增 AGENTS.md。

## 来源对照

文中短名对应文件（除技能 / 全局 AGENTS 外均在本仓）：
- HX液重 = HANDOFF_2026-11-17-hec-hx-yield-fix.md（v0.15/v0.16）
- v023 = HANDOFF_2026-11-18-hec-v023-release.md（v0.23 目标杯流历史化，样式 1+2；UI8 对话）
- 真机 = HANDOFF_2026-11-17-hec-live-cups.md
- 图标 = HANDOFF_2026-11-17-hec-icon.md
- 整改回执 = HANDOFF_2026-11-16-hec-shadow-rectify.md（v0.10，R1–R5）
- 整改单 = RECTIFY_2026-11-16-hec-shadow.md
- phaseB = HANDOFF_2026-11-16-phaseB-apk-integration.md（v0.12）
- 液重 = HANDOFF_2026-11-16-hec-yield-fix.md（非 HX 液重停杯）
- v013 / v012 / v011 = HANDOFF_2026-11-16-hec-v013-ui-continue.md / HANDOFF_2026-11-16-hec-v012-ui-continue.md / HANDOFF_2026-11-16-hec-v011.md
- 实现 = HANDOFF_2026-11-15-hec-apk-impl.md（v0.1）
- 影子初版 = HANDOFF_2026-11-15-hec-shadow-arbiter.md
- 模型设计 = DECISION_ARBITER_MODELS.md
- 记录缺口 = HANDOFF_2026-11-15-decision-arbiter-record-gap.md
- UI示意 = docs/HANDOFF_2026-11-15-hec-apk-ui.md
- v03 / v05 / v06 / v07 / v08 = HANDOFF_2026-11-15-hec-ui-v03.md / HANDOFF_2026-11-15-hec-v05.md / HANDOFF_2026-11-15-hec-v06.md / HANDOFF_2026-11-15-hec-v07.md / HANDOFF_2026-11-15-hec-v08.md
- 协议 = docs/HEC_PROTOCOL_FOR_APK.md（与 D:/vscode/decenthyperexplugin/HEC_PROTOCOL_FOR_APK.md 一致）
- 技能 / 技能坑 N = C:/Users/ladios/.codex/skills/android-tablet-apk-dev/SKILL.md / references/pitfalls.md #N（通用坑唯一维护处）
- §19 / §22.x = C:/Users/ladios/.codex/skills/decentplugin/SKILL.md 对应节（控制口径真源）
- AGENTS N = D:/vscode/AGENTS.md 第 N 条
- commit = 本仓 git 提交（git show -s <hash> 看全文）
