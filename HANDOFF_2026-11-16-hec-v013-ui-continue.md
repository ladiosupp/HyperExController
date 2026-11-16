# 交接：HEC v0.13 已发版装平板 → 新对话继续改 UI（2026-11-16 夜）

> 前序：HANDOFF_2026-11-16-hec-v012-ui-continue.md（v0.11/v0.12 UI 定稿口径）、HANDOFF_2026-11-16-phaseB-apk-integration.md（阶段 B）。
> 规矩照 AGENTS.md（7 开工四件事、20 先问、16 中文、15 正斜杠、18 推送走 VPN）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法）。
> 示意稿：D:/vscode/.impeccable/mocks/hec-ui5/（m6-autohide.html 是本轮定稿；m7/m8 稿已删）；取证：D:/vscode/.impeccable/review/hec-ui5/（gitignore，不入库）。

## 0. 一句话现状

子模块 main HEAD bd6c5d9，tag v0.13 已发：GitHub Release v0.13 带 HyperExController_v0.13.apk（6,670,683 字节），夸克「/来自：Codex」有 v0.13。
平板与模拟器均已装 v0.13（versionCode 13）。父仓库指针提交 5bd2a00 **只在本地、没推**。
**其他对话已被用户叫停，本对话是唯一 UI 改动入口**；阶段 B 真机验证归阶段 B 对话，别碰影子发送逻辑。

## 1. UI 现状口径（用户定稿，别回退）

v0.11/v0.12 口径全部沿用前序交接 §1（文件夹标签、侧栏窄胶囊、断口线 main::before、曲线弹窗两列共享行轨、长按菜单 contains 判定、行内容顺序、i18n），此处不重复。本轮新增：

- **控制中心页**（learn.js renderSection control 分支）：三分类 UI 设置 / 功能设置 / 其他，用现成 .lrn-sec>h4 分区小标题；后两类**空着等内容等用户定义**。照旧隐藏二级入口与只读脚注。
- **侧栏自动隐藏**开关在 UI 设置下：RAW 同款小开关（.rawtoggle .sw 30×17 琥珀），**不拉整行、不加说明小字**；默认开，存 hecSideAutoHide；EN=Auto-hide sidebar / UI Settings / Function Settings / Other。
  行为（control.js）：萃取启动瞬间（st=espresso 开杯钩子）setSide(true) 自动收合；杯末（回 idle/ready/sleeping）3 秒后 setSide(false) 自动展开；**手动按把手 clearTimeout 取消待执行自动展开**；关=纯手动。toggleSide 重构为 setSide(v)+持久化分离；自动动作不写 hecSideCollapsed。learn.js 开关 change → dbSet + HxControl.setSideAutoHide(v)。
- **杯流纵轴自适应**（用户拍板规则）：flowRange(samples,tgt,hx) 只看 decaid 杯流+目标杯流，上限=max×1.15 向上取整、**最小跨度 3**、下限 0、无数据回退 0–8；RAW 尖峰不带动轴；杯内只扩不缩。上限不被 4 整除时 flow 轴刻度一位小数（axes(...,dec) 可选参，**温度轴调用不传、不变**）。
- **非 HX 实时图内 step 色带+步编号**（m8 保留部分）：run.steps/lastStep，开杯后非 HX 且 extracting 时按 machine.profileFrame 变化记切换点；stepBands() 中性灰蓝交替带、带内标「步N」（steps[step].name 有名字标名字），两图都画，HX 的 S1–S3 语义色不动。
  **状态卡下面的概览胶囊（stepstrip）用户明确不要，已删，别加回来**（两度点名：先「三个胶囊去掉」，我误撤全 m8 被纠正「只撤胶囊」）。
- i18n：control.js EN 增 '步':'Step'；learn.js EN 增上述四键。

## 2. 验证通道（可复跑）

- 工具链：adb=D:/android-dev/sdk/platform-tools/adb.exe；gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat（**不是** gradle-8.7 直目录）；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9、GRADLE_USER_HOME=D:/android-dev/gradle-home；改 www 先 Copy-Item app/www/* app/src/main/assets/www/ -Force -Recurse 再构建。
- 模拟器 AVD hxpad（emulator-5554）。**旧 4799 桩是别人遗留，别 kill**；本轮桩 .tools/__m6m8-stub.cjs [port]（起在提权侧，本轮用 4801），adb reverse tcp:4801；**模拟器 App 的 hecBaseUrl 现在是 http://127.0.0.1:4801**（测试配置，经真实连接弹窗改的）。
- 回归：.tools/__m6m8-regress.cjs <wsUrl> <1|2>。suite1=8 项（m6 全行为），suite2=5 项（持久化、曲线加载、两次 step 切换、收合/展开）。机器状态走 HxControl._injectMachine/_injectScale（scale 字段 weight/weightFlow/timestamp）；_state() 含 samples/steps 计数；_samples() 读最近样本。
- **模拟器 screencap 与 CDP 截图都不含 2D canvas 层**（老版本也这样，环境限制，不是渲染 bug）：整屏图看布局/收合，曲线证据用 regress 内置 canvasShots（toDataURL 合成到面板底色 #171a1f）。像素核对工具 .tools/__pngtest.cjs / __pngmap.cjs。
- **注入样本集中在前 1 秒时，30s 横轴上曲线/色带压缩在左缘**，取证要间隔注入（.tools/__diag17.cjs 步间隔 8s 模板）。
- 平板：mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp（192.168.31.15），**灭屏不广播**；亮屏后 connect + wm dismiss-keyguard；CDP forward 9223。wm size 报竖屏自然尺寸，横屏要交换。
- **平板 CDP 坑**：Runtime.evaluate 里做 click 会挂死通道（桥接互扰）→ 点击改用 Input.dispatchMouseEvent（模板 .tools/__tablet19.cjs，本轮真机拨开关 PASS）；adb tap 要 ×dpr 且受锁屏/弹窗开合状态影响（先读 lrnDim.hidden 再决定点不点标题）。挂死后：杀残留 node（Win32_Process CommandLine 过滤）→ force-stop → am start → 重 forward → 重取 wsUrl。
- 发版 REST：gh 带附件挂死 → git credential fill 取 token，POST api.github.com 建 release + uploads.github.com 直传，均 -Proxy http://127.0.0.1:57890（本轮 release id 447126740）。
- 夸克：MCP upload 203 → quarkclouddrive skill CLI；install.sh 用 "C:/Program Files/Git/bin/bash.exe" 全路径跑（pwsh 无 bash）；upload 带 --session-input（用户原话）+ --session-id（{秒}-{6位随机}，同对话复用）；目录 fid 经 search --search-type dir --stdout-only 取。

## 3. 本轮坑（项目特有）

- **class 的 display:flex 会覆盖 hidden 属性**（UA [hidden] 特异性低）：stepstrip 曾因此常驻、并在该 WebView 上引发 canvas 合成异常；已随胶囊删除。今后加条状容器记得 [hidden]{display:none}。
- apply_patch 锚点必须**整行**，半行锚点报 Failed to find expected lines（本轮踩两次）。
- 弹窗开着时点标题=点 dim=关弹窗；状态感知脚本先读 lrnDim.hidden。
- 开关 input 是 0 尺寸 opacity 0，tap/点击要瞄准可见的 #sideAutoHide + .sw。
- 内联 node -e 在 pwsh 转义脆，写脚本文件（技能 pitfalls 同款）。

## 4. 待办（新对话按顺序）

1. 用户继续提 UI 修改：先出示意稿（mocks/hec-ui5 同款：真令牌+真视口+**标注在设备框外，编号圆点别放框内**——用户问过「那个1是什么」）给用户确认，点头再改代码（AGENTS 20）。
2. 功能设置 / 其他 两分类内容等用户定义。
3. **真机待验：profileFrame 是否随 step 递增**（色带信号第一次真机验证还没做，模拟器是注入）。用户下次跑非 HX 杯时看图内色带是否跟着切；不符先问用户再换信号。
4. 发版后续（升版本/装机/推送/夸克）一律先问；父仓库指针 5bd2a00 未推，推不推问用户。
5. 夸克 v0.6 历史欠传仍在（/来自：Codex 现有 v0.4/v0.5/v0.11/v0.12/v0.13）。

## 5. 别碰

- shadow.js / arbiter.js 发送逻辑（影子只记录不发送）；插件仓 D:/vscode/decenthyperexplugin；阶段 B 对话的真机验证安排。
- 旧 4799 桩若还活着别 kill。
- stepstrip 概览胶囊别加回来。

## 6. 本轮产物索引

- 代码：control.js / learn.js（www+assets 同步）、build.gradle（13/0.13）；提交 bd6c5d9（子模块）、5bd2a00（父指针，本地）。
- 脚本：.tools/__m6m8-stub.cjs、__m6m8-regress.cjs、__diag13–17.cjs、__tablet13–19.cjs、__pngtest.cjs、__pngmap.cjs。
- 取证：review/hec-ui5/v13-1…v13-6（整屏+canvas 特写）、e1-full/e1-hcFlow/e1-hcPress（间隔注入色带展开）、t7/t8-v013-control（平板）、__sheet13.png（核对板）。
