# HEC 同步债 Wave E 改码回执（hec 执行路径＋启用 HEC 切档 UI＋v0.39 候选；2026-11-21）

> 统筹 relay-11（01a1fdc6-c8bc-7a93-a146-d8687ee1c625）派；用户 2026-11-21 批「全链」授权改码，发版/推送/真机装机另问。基线 HEC main **739dbe8**（父仓指针 a52f1b8、Wave A/B/C/D 已并入）；插件只读参照 **0e0253f / 2.2.62**（控制律锚点与 2.2.61 逐字一致，2.2.62 仅杯末校验后置）。本批只改 APK 仓；插件仓零改，UI 视觉版式零改（只加最小切档入口与状态行）。

## 0. 一句话现状

hec 档 APK 调流链已打通：切档 UI → external-flow（≥300ms/读 pending）→ 409/takeover 白名单 → 补水状态机与收口全序 → 决策点 stage2 入口一次 → 常规守卫＋Vd15 → 自执行写台账打标；本地构建 v0.39 候选并在模拟器跑通完整 hec 杯，**未发版、未推、未装平板**。

## 1. 改动（4 文件，www 与 assets 同步）

| 文件 | 改动 |
|---|---|
| `app/www/shadow.js`（+544） | Wave E 执行器：计划/律/收口/守卫/governor/Vd15/409 策略/runtime；写台账自执行打标 |
| `app/www/control.js`（+56） | 「控制模式」最小入口（full↔hec，POST /control-mode）；HEC 执行状态行；每秤样本 hecTick；开杯/重连 hecReset；sender 注入 |
| `app/www/index.html`（+5） | 侧栏加「控制模式」按钮＋状态 note（沿用现有 .connbtn/.note 样式） |
| `app/build.gradle` | versionCode 39 / versionName 0.39（只这两行） |

### 1.1 执行器（shadow.js，只在 ext.mode==="hec" 且未接管时产出）

- **计划**：stage2 入口一次 `hecBuildPlan`（插件 `adaptiveReplanAtStage2Entry` 等价）——控制基/平台 `target/r`（gain-memory / FF k / 兜底 profile-base 与插件同序）、`estRefillAdaptiveFloodDecision` 出 flood/holdMs、`bleed=holding×0.35`。holdCfg 取不到 → 默认 4000 并标 degraded（与 Wave D 同口径）；cutoffFraction 默认 0.85（ext 未暴露）。
- **补水状态机**：armed → boosting → bleeding（700ms/预测回落/250ms 实测回落）→ returning → complete；trim 500ms；holdMs 动态；ACK 2s；回写看门狗 2.5s；预算/上行压力/秤 stale/blindFlood/Vb3/predicted≥target 或 observed≥0.85×target 与插件收口全序一致（`estS2RefillWouldReturn` 复用 Wave D 实现）。
- **常规路径**：coast（S2 8%/S3 10%＋closing/flat）、4% 死区、S2 补水后 up-hold 1.5s、handover falling/rising、S2 后斜坡 governor、S3 单调闸、压力/执行器上行门、rescue 步长、信封 `S2 1.25× / S3 1.2× / rescue→[0.10,8]`（与插件同值，未放宽）。
- **Vd15**：stage2 complete 后 raw>1.5×target 连续 3 fresh check＋笔数<4 → 旁路 handover/governor，单笔≤2 档；滞回 raw<1.2×target 或写满 4 笔退出；静默仍走 1200ms。
- **409/400**：11 条 409 全列（hec-mode-required/hec-takeover/not-extracting/frame-not-confirmed/frame-mismatch/frame-not-writable/write-pending/write-budget/pressure-upward-blocked/telemetry-stale/command-busy）＋400 command-invalid/out-of-bounds；未知 reason 停发并在状态行显示原文；takeover 停发并显示「插件已接管本杯」＋协议原值，下一杯 hecReset 重评。
- **自执行打标**：发送成功即写 cup.writes（source=apk、startupAction=boost/bleed/return/trim/decay、tMs=发送时刻）；ext 回显用 `echoQueue` 消费、不重复记账、不误记为 plugin write。Wave D 的 Va/Vb3/Vi_obs live 因此解锁。

### 1.2 切档 UI

- 侧栏「控制模式」按钮：full 显示「启用 HEC」；hec 显示「HEC 调流中」。点击 POST `/control-mode`（full↔hec）；成功 toast「已切换 HEC · 下一杯生效」并重发 hello；409 toast「本杯进行中，下一杯生效」；其他失败显示 HTTP。
- hec 时状态行显示「HEC 执行 · <状态>」＋最近拒绝/提示（notice）。接管沿用既有横幅/接管卡（原因、时刻、指令）。
- 卫生：切档成功/重连/开杯均 `HecReset`，上一杯的 stop/takeover 不跨杯。

## 2. 构建与产物（v0.39 候选，未发版）

- 同步：`app/www/*` → `app/src/main/assets/www/`；shadow/control/index 三份 SHA256 一致。
- APK：`app/build/outputs/apk/debug/app-debug.apk`，**6,877,108 字节，SHA256 6AFC56B93AE4D7F2E92399ABCBA30502BD8E346B53B555A8FC1CE6ABFDE01F24**（versionCode 39 / versionName 0.39）。
- entry 哈希（www＝assets＝APK 三方一致）：shadow **4C6D0475D962D7D1F43E16E3B775C0E9D321DCECEF442EE61C44727375F7E4E5**；control **CCFB6E91A6EB313271E4B1E0591BC886CF147967ED1689981ED945FDCB20AC06**；index **B781075ECADC8FBB65764561996F6DE5656EB498A6704C7876D00C96E60C9E79**。
- 模拟器 emulator-5554 `install -r` Success，dumpsys versionCode=39 / 0.39；平板未动。

## 3. 验证回执（全部本机实跑）

- **六套回归全绿（最终包复跑）**：summary **72/72**、boot **8/8**、curvetag **8/8**、TDS 矩阵 **33/33**、TDS UI **31/31**、WS 假死 **17/17**（4810 桩＋reverse＋`__set-addr-4810` 前置）。
- **既有不回退**：`__rectify-r2345-test` **27/27**、`__phaseB-integration-test` **15/15**、`__waveb-specialty` **33/33**、`__wavec-specialty` **128/128**、`__waved-specialty` **67/67**、`__wavec-replay` **REPLAY STRICT PASS**（Wave C/D 决策级回放维持）。
- **Wave E 专项 `__wavee-specialty.cjs` 50/50**：409 全 11 分支＋400/未知；信封 S2/S3/rescue＋含当前指令；补水向量律（满灌/平台/只降不升）；收口全序（压力→holdMs→stale→Vb3→predicted/backstop）；4% 死区/8% coast/9% 写/压力上行门/执行器门/补水后 up-hold/S3 入段守卫；Vd15 三连触发＋≤2 档＋滞回/笔数退出；governor S2 峰值/斜坡与 S3 单调闸；takeover 停发/非 hec 不发送/预算停发/409 hec-mode-required/未知 reason 原文/上行压力只 hold；ACK 2s 与回写看门狗 2.5s；状态机 boost→bleed→return→complete＋自执行打标（boost 只记一笔、回显不误记 plugin）。
- **端到端冒烟 `__wavee-smoke.cjs` 10/10**（模拟器＋4812 hec-stub plain）：初始 full→点按切 hec（label「HEC 调流中」）→切回 full→运行中点按 409「本杯进行中」→空闲切 hec→开杯 external-flow 实发→状态机进入 boost/bleed/return/complete→未接管→状态行显示 HEC 执行。
- **真机同形台账**（模拟器 hec 杯实抓）：`boost 5 → bleed 1.3125 → return 3.75 → trim 4/4.25/4.5/4.6875/4.9375`，source=apk 且 startupAction 齐全；只有一条 plugin frame-change（2.19→3.75），无重复 boost、无回显误记 plugin；sends=8/acks=8、无 takeover、无 rejects。

## 4. 本轮坑

- **ext 回显滞后**：若只在 onSample 按 `lastCommandMlS` 变化记台账，700ms 轮询会吞掉同窗 bleed→return，并把 APK 自己的写入误记成 plugin。修法＝发送成功即记 cup.writes＋`echoQueue` 消费回显；已加专项 10.5/10.6 钉住。
- **首次 tick 清 pending**：帧锁存前 `st.pending=null` 会吞掉第一笔 ACK 超时判断；只有 phase/frame 都已锁存且真的变化时才清。
- **holdMs/cutoffFraction/startDelay/approach 不在 ext-status**：live 用默认 4000/0.85，标 degraded；要严格等于插件设置需插件加性暴露（另批）。
- **WAVEE 状态里的 plan 每次 hecReset 清空**；若在 S2 中收不到计划（target/base 缺失）会一直 disabled，trim 仍可跑但不补水。
- 冒烟脚本复用 4812 桩时，stub 的 mode 会留在上一轮的 hec；复跑前要重启桩或空闲 POST full，否则初始档断言必红。

## 5. 待办（每步先回叫统筹）

1. **真机装机＋full→hec 切模式**：用户已原则批准，但时点先回叫统筹确认（平板 mDNS）；首杯真机陪杯由取证 relay-4 负责。
2. **发版**（tag/Release/夸克/push）本批未执行，另问统筹；本地 commit 已做。
3. Wave F：restore＋诊断镜像＋研磨新字段/R6；插件加性暴露 holdMs/startDelay/approach/learningRunAllowed 三字段可收紧 live 降级（另批）。
4. live soak 形状/峰/rise/wetLat 仍需真机陪杯标定；本批只证移植与链路。

## 6. 别碰

- 插件仓（decenthyperexplugin）、Decaid 皮肤/宿主配置、温度链路、HX 液重、UI 视觉版式、别人 WIP（HEC untracked 交接 MD 与 review 图）。
- shadow 模式 sent 恒 false 与既有记录口径（本批只在 hec 分支新增；shadow 路径逐字未动）。
- 硬包线 `applyEnvelope` 单一实现（执行器复用同常数，永不放宽）；LUT 不被学习改写；记忆不删改；校准杯强制 full（409 hec-mode-required）。

