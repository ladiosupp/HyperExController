# 交接：UI11 批 2 — 两段取修真机「倒数完干等＋缺 5 项」（2026-11-20）

> 前任：批 1 改名（7d2f33f）＋v0.33 回执（d8d10b9）。用户当轮：「不行啊，一个是倒计时完了还是要等…第二个简单也显示缺数据，缺5项」→「你分两次取嘛…先取简单弹窗需要的，确保倒计时结束弹窗，后续的两个颗粒度就慢慢LOAD嘛」。

## 0. 一句话现状

子模块 HEAD = 本批提交；**本地已提交、未推、未发版、未装平板**（一律先问）。模拟器回归全绿＋真形状交叉 8/8。**平板仍 v0.33 含本 bug**，用户下一杯仍会复现，建议 v0.34 发版链。

## 1. 根因（真机取证）

- 插件 2.2.56 /diagnostics 全量 **447KB**（新增 learningEvidence 等）；HxBridge.httpJson 原生重序列化＋JSONObject.quote 整份逃逸（~1MB）经主线程 evaluateJavascript 注入 → collect 密轮询期间主线程堵死（真机 devtools /json/list 数分钟无响应为直证；force-stop 重启即恢复）。
- collect 窗内拿不到数据 → 8.5s deadline 离线兜底；归档无 commands（目标流量）→ portModel no-target → total null →「不评分·5 指标缺」。两症同源。
- 证据：真机归档 hasSummary:false／cmdKeys:null；REST diag ≈1.1s／447KB；top-level 形状 {summary,run}（controlReview 在 summary 内、runId 移到 summary.runId、phases 仅 stage2/3）。

## 2. 本轮改动（用户两段取口径）

- **HxBridge.java**：fetchWrap 抽出；新增 httpJsonPick(method,url,body,callback,pick)——原生线程按路径提取子集再注入（a.b.c 叶拷贝；末段 #field=value 数组过滤、@f1,f2 元素投影）。httpJson 行为不变。
- **control.js**：httpJsonPick 包装（无桥回落全量）；attachSummary(rid,obj,cmds) 把插件 shotCommands 落归档 commands（cleanSummary 保留顶层 → 离线 portModel 可算分）。
- **summary.js**：PICK1 打分子集（runId/startedAt/result/controlReview/trace 仅 write 投影/stage2Startup overshoot+target/stage2·3 validationStatus/grindAdvice/shotCommands，几 KB）倒数期间只取它，保证倒数结束弹窗；PICK2（nextShotAdaptive 7.5KB）弹窗后异步 enrich 给标准/完整，简单档不取、切颗粒度补；未到时标准/完整下一杯建议区显「加载中…」状态；8.5s deadline 硬截断（循环条件＋单请求 race min(2000,剩余)）。
- **enrich 守卫坑**：倒数期间 model 尚未赋值（doOpen 倒数末才赋），.then 只判 seq、不判 model!==m；重渲染才判 model===m。首版踩此坑（下一杯表＋已自动应用胶囊同在 nextSec，一起被挡）。
- **桩 __m6m8-stub.cjs**：/diagnostics 条件包 {summary,run}（diag 已是新形状则不重复包；__diag-live.json 本身已是新形状）。

## 3. 验证回执

- __summary-regress **72/72**＋__boot-check **8/8**（含旧形状夹具 85/91/80 交叉）。
- __tf-realshape **8/8**：真机 2.2.56 响应 summary 喂桩，手算期望 S2=100／S3=82／总=90 全中；在线接住、二段取 next 表、已自动应用胶囊、归档 commands.desiredGS=5、summary+next 回写。
- __tf-probe2：三请求时间线正常（PICK1 ~11ms），弹窗 next 表＋胶囊在。
- 诊断版（__tf-debug.cjs on/off）已回退，git diff 无残留；www/assets 两份 SHA256 一致。

## 4. 待办 / 别碰

- 装平板／发版／推送／父仓指针一律先问；建议 v0.34 发版链（平板现 v0.33 含 bug）。
- 开场 READY 0.9s 入场与 HEC 淡出有 0.1s 交叠（11-20 定稿口径）；用户若觉别扭可挪 1.0s，待用户发话。
- 别碰：影子/仲裁发送面、温度链路、HX 液重、他人未跟踪。
- incoming：用户下一条指令。
