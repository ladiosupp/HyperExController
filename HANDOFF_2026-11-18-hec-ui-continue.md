# 交接：HEC v0.22 已发版装平板 → 新 UI 对话接力（2026-11-18 晚）

>  lineage：HANDOFF_2026-11-17-hec-v017-ui-continue.md → HANDOFF_2026-11-18-hec-shot-summary-impl.md（v0.21）→ HANDOFF_2026-11-18-hec-style1-targets.md（v0.22）。**本对话（01a1e8e3…）为旧 UI 入口，自本交接起由新 UI 对话接力**；真杯取证/统筹对话不碰 UI。
> 规矩照 D:/vscode/AGENTS.md 与子模块 AGENTS.md（开工四件事、先问后改、中文、正斜杠、推送走 VPN 57890）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法口径）。

## 0. 一句话现状

子模块 main HEAD = 本交接提交（v0.22 回执 d651809 之后），tag v0.22 已发：Release id 449956741（asset 763329190，6,731,329 字节，SHA256 1BEB8804F000EE072E15CF60943D7780BF34BBB7C5A2F0CC6280C2B3633B2C0F），夸克「/来自：Codex」fileId 3096730deafb461598486e781e82d7bf；平板与模拟器均 v0.22（平板 20:31:24 装机冒烟通过）。父仓指针已推（hash 见父仓 main）。

## 1. UI 现状口径（用户定稿，别回退）

- v0.13/v0.17 全部沿用：文件夹标签、侧栏窄胶囊、断口线、曲线弹窗两列共享行轨、长按菜单、行内容顺序、i18n、侧栏自动隐藏、杯流纵轴自适应、非 HX 图内 step 色带；stepstrip 概览胶囊不做；样式 1 配色/两卡布局别回退。
- v0.17：萃取锁定红条、曲线样式 2（合并图/图例点击不存盘/左轴固定 0-10/右轴温度自适应）、宽度五档 √2 滑块、状态卡单行居中、秤重卡光条、杯流卡同源稳定化、系统设置弹窗标签序（学习中心在前）+ 右上小字已删。
- v0.21 杯末总结弹窗：HX 杯杯末前台自动弹一次（校准/非 HX/后台/冻结不弹、开杯自动关、每杯一次）；壳 = **modal lrn-modal 组合类**（.lrn-modal 单独无底色！）+ sumDim；单标题「本杯总结」+runId+时刻+✕；公式 v2（1.8/1.8/1.2/0.5/3，免费带 4/3/5/25，w S1=0/S2 .45/S3 .55，缺数据重分配不给 0/100，中止不评分）；TDS 分=clamp(100−1.5×max(0,|TDS−3.5|−0.2)/3.5×100,0,100) **不先舍入**，加权=round(0.7×控制+0.3×TDS)，未录显控制分+「TDS 未录」；三档颗粒度 hecShotSummaryLevel 0/1/2 默认 1（简单=总分+TDS+研磨；标准=+下一杯表+已自动应用；完整=六区块+杯数据补充六行+粉量/EY）；总开关 hecShotSummary 与颗粒度正交（off 只关自动弹、回看胶囊保留）；在线 /diagnostics 权威 + 杯末持久化 shot.summary 回看 + 离线降级；仲裁措辞守「校准素材，非增益裁判」「离线训练乐观口径」；TDS 不喂增益记忆。
- v0.22 样式 1 目标线：杯流卡目标杯流黄虚线（HX 萃取活线保留；空闲/非 HX 取曲线步参考 profileTargets）；**非 HX 压力卡**目标压力黄虚线 + 目标机器流量蓝虚线（萃取取 tgtP/tcmd，空闲取步参考）；**HX 压力卡不动**（目标指令黄虚线+APK 指令橙实线）；样式 2 零影响。

## 2. 验证通道（可复跑）

- 工具链：adb=D:/android-dev/sdk/platform-tools/adb.exe；gradle=D:/android-dev/gradle/gradle-8.7/bin/gradle.bat；JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9；GRADLE_USER_HOME=D:/android-dev/gradle-home；改 www 先 Copy-Item app/www/* app/src/main/assets/www/ -Force -Recurse 再构建；发版包=debug 签名改名。
- 模拟器 AVD hxpad（emulator-5554）CDP 9224；平板 mDNS adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp CDP 9223；install -r 杀进程→am start+重 pidof+重 forward+重取 /json/list。
- 桩：父仓 .tools/__m6m8-stub.cjs 4801（+/__setext /__setdiag /__setcal）；子模块 .tools/hec-stub.cjs 4802（yield 用）；**每个桩端口都要 adb reverse**；提权侧起、随对话死、别 kill 别口旧桩。
- 回归（父仓 .tools 除注明）：__summary-regress 27、__targetline2-check 12、__m10-regress 20、__m6m8-regress 8+5、__flowcard-check 6、__boot-check 8、__yield-regress 19（子模块 .tools，hec-stub 4802）、__rectify-r2345-test 27 与 __phaseB-integration-test 15（子模块 .tools，node 直跑）。
- **套件开头必须复位桩 workflow 与 baseUrl**（yield 会 PUT workflow 到当前 baseUrl 桩、切曲线留非 HX；baseUrl 残留 4802 会 conn bad）：复位 workflow 用 PUT /api/v1/workflow，baseUrl 经地址弹窗（connBtn→addrIn→addrOk）。
- 注入时序：setext 后等 ≥900ms 再注 espresso（ext 轮询 ~700ms）；scale 注入间隔 ≥250ms 散开（s.t 用真实时钟，密集注入挤左缘）。
- 像素验收陷阱：合成数据 decaid==target / mflow==tcmd / 温度恰左轴中点 → 实线盖住同高虚线假红；验收数据错开。
- 发版 REST：gh 带附件挂死 → git credential fill 取 token（不回显）+ REST/curl 直传（curl -H 'Expect:' --data-binary 耐 VPN 慢传；pwsh 拼接 URL 必须加括号）；均 -Proxy http://127.0.0.1:57890。夸克 quarkclouddrive CLI upload --session-input/--session-id，目录 fid 经 search --search-type dir --stdout-only；notice.text 非空原样展示。

## 3. 坑（项目特有，通用坑引技能条号）

- **num 是 onMachineSnapshot 局部**：外层新函数误用 → ReferenceError 被渲染链吞 → 曲线间歇整卡不画；新函数自带有限数 helper。
- **.lrn-modal 单独无 background/border/radius**（在 .modal 上）；新弹窗必须 modal lrn-modal 组合。
- apply_patch 多 hunk 按文件行序升序、锚点整行、Add File 每行 +；control.js 工作区 CRLF。
- exec_command 30s yield 返回 session 后 cell 不轮询 = 孤儿进程；长任务 cell 内 write_stdin 轮询到 exit。
- cdp.js send 返回整条消息（截图 base64 在 r.result.data）；只同步求值不用 awaitPromise。
- 父仓 .git 沙箱只读 → 父仓 commit 需提权。
- flowcard 刷新断言测量窗固定前 1000ms（整圈计数受 CDP 延迟假红）。

## 4. 待办（每步先问）

1. 功能设置/其他其余内容等用户定义（目前只有杯末总结开关+颗粒度）。
2. 二期：回放页逐杯回看入口；三期插件提案①compact 持久化 5 指标②summary 轻量端点③TDS 集成（另批授权，不搭在途插件批的车）。
3. profileFrame 非 HX 真机色带验证仍待真杯（11-18 评估确认未被真杯覆盖）。
4. 用户继续提 UI 修改：按当轮口径（近几轮「直接改+模拟器确认」）；装平板/发版/推送/父仓指针一律先问。

## 5. 别碰

shadow.js/arbiter.js 发送逻辑、温度链路、HX 液重；插件仓 D:/vscode/decenthyperexplugin（在途批未提交）；他人未跟踪 HANDOFF-11-17-code-audit/live-cups、11-18-eval、review/hec-icon/*；旧桩端口别 kill；stepstrip 概览胶囊别加回。

## 6. 协作

- 统筹：01a1ee1f-0841-7c91-866d-668705990047（hostId local）；完成批回叫（prompt：轮名/key 数字/交接 MD/待拍板），纯确认不回叫；统筹接力以最新通知为准。
- 示意稿：.impeccable/mocks/hec-shot-summary/（已入父仓库）；取证 .impeccable/review/hec-ui5/（gitignore）。
- 开工四件事必做；commit 只 add 本批；别人未提交/未跟踪不碰不代提交。
