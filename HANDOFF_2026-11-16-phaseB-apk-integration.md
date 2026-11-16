# 阶段 B 学习仲裁 APK 集成回执（2026-11-16，APK 整改对话 → 统筹复核）

> 授权：用户 2026-11-16「把学习仲裁接进 APK，可以做」。本批正是离线回执 §4(b) 描述的整合：
> 学习仲裁替换仲裁第 2/3 层（分歧门控 + 倾向/软预算），第 1 层硬安全包线保留，影子仍只记录不发送。
> 闭包发送（阶段 D）未批准、未做；未装机、未发版、未推送。control.js / index.html 未碰（属并行 UI 对话）。
> 版本 0.11 → 0.12（versionCode 12）。离线训练产物在 D:/vscode/.tools/hx-train（仓库外）；本批出厂改动入库。

## 0. 一句话结论

学习仲裁已接进 APK 并默认启用（模型就绪时），纯 JS 树评估器与 Python booster 比特级一致（469 行最大误差 1.1e-16）；
集成桩 15/15、R2–R5 回归 27/27 全过；第 1 层硬包线、零发送、规则回落均验证。
仍为影子只记录，离线训出的仲裁待真机影子 matched/响应标签验证（用户暂缓），不是已证明的改进。

## 1. 训练/部署口径修正（动手前发现并处理）

离线标签建在插件每个 trace 点（~250ms 密集），APK 影子按自身节拍（≥1200ms/800ms，稀疏）出决策。
22 维特征里 model_want_so_far（本杯模型想写次数）与 agree_rate（历史方向一致率）依赖点 universe，密集/稀疏语义不一致，直接部署会喂错特征。
处理：剔除这两维，用其余 20 维重训可部署模型（plugin_writes_so_far 保留——它数插件真实写入次数，与节拍无关；其余皆逐点快照）。
重训结果（留一杯 CV，469 行）：AUC 0.865、acc@0.5 0.765（较 22 维 0.746 略升）、logloss 0.382；样本内 AUC 0.991（过拟合间隙如实标注）。
主导特征：限压余量 headroom（2506）、machineFlow_n（928）、pressure（375）、predErr（332）、quanta（326）、writeProb（248）。
未来可选改进：离线模拟影子节拍出稀疏决策点再建标签，可恢复这两维（本批未做）。

## 2. 移植方式：纯 JS 树评估器（零新依赖）

skl2onnx/onnxmltools 未装，ONNX 转换不便；LightGBM 文本模型 300 棵二叉树（binary sigmoid，<= 分裂，无缺失值）。
导出紧凑 JSON（vendor/arbiter_lgb.json，128KB，300 树 3322 节点，含 20 维特征序 + 阈值 0.5）；JS 递归求叶值之和再 sigmoid。
逐点核对：469 行 JS predict vs Python booster.predict_proba，最大绝对误差 1.1e-16（机器精度），阈值决策零分歧 → 比特级一致。

## 3. 出厂改动（本批入库文件）

- app/www/arbiter.js（+ assets 同步）：规则 v0 arbitrate 逐字保留；新增 applyEnvelope（第 1 层硬包线，与规则同逻辑）、
  loadLearned（资产桥加载 JSON，同 shadow.js 模式）、makePredictor、buildFeatures（20 维与离线逐字同序）、
  arbitrateLearned（包线后 P(model_better)≥阈值 选 model/algo/hold；未就绪优雅回落规则 v0）、learnedReady/learnedStatus/setLearnedThreshold/_predict/_features。
- app/www/shadow.js（+ assets 同步）：杯级 pluginWriteCount（只数 kind=write 真实写入）；load() 触发学习模型加载；
  仲裁调用改学习优先（扩展 ctx 带 obs 快照 + pluginWritesSoFar；quanta 传原始浮点与训练同口径）；
  决策记录 arbiter 加 kind/pModelBetter(4 位小数)/threshold；status 暴露学习态。第 1 层包线、R1–R5 记录逻辑、零发送均未改。
- app/www/vendor/arbiter_lgb.json（+ assets）：可部署学习模型。
- app/build.gradle：versionCode 12 / versionName 0.12。
- 本回执 HANDOFF_2026-11-16-phaseB-apk-integration.md。
- control.js / index.html 未改（appVer 缺省串虽旧，但真机版本走 HxBridge.appVersion()=BuildConfig，bump 后即 0.12，缺省串不影响）。

## 4. 验证（实测）

- 移植核对：469 行 JS vs Python，maxAbsDiff 1.1e-16，阈值决策分歧 0 → PORT OK。
- 集成桩（.tools/__phaseB-integration-test.cjs，真实 arbiter.js 加载真 vendor JSON + mock bc）：15/15。
  学习就绪 20 维 300 树；决策 kind=learned、pModelBetter∈[0,1]、threshold=0.5；pick=model 当且仅当 P≥阈值（both-valid 分歧）；
  高压（5.5≥6×0.9）上行候选被第 1 层包线拒；pluginWriteCount 只数真实写入（帧切换不计）；学习未加载回落 kind=rule；sent 恒 false。
- R2–R5 回归（.tools/__rectify-r2345-test.cjs）：27/27（学习未就绪走规则回落，既有影子行为无破坏）。

## 5. 边界遵守

- 影子只记录不发送：sent 恒 false；external-flow 通道未碰；闭包发送阶段 D 未批准未做。
- 第 1 层硬包线（clip 0.10–8.00、1/16 量化、上行压力门 ≥限压×0.90、==当前→hold）规则/学习共用，永不放宽。
- 仲裁三层结构：第 1 层硬保留；学习替换第 2/3 层（用户批准）；规则 v0 保留作回落与对照。
- 未装机、未发版、未推送；未碰插件仓与 UI 对话样式（control.js/index.html 未改）。

## 6. 保留与下一步（需拍板）

- 离线训出的仲裁标签植物中介（模型响应恒植物估、S3 外推不可靠）→ 仍是乐观上界，非已证明改进；真机影子 matched/响应标签（用户暂缓）才是裁判。
- 阈值默认 0.5，可 HxArbiter.setLearnedThreshold(t) 运行时调（0=偏算法，1=偏模型）；真机验证前建议保守。
- 下一轮可选：(a) 用户有空 full 档出杯 → 真机影子取证（含 learned 决策的 pModelBetter/matched/响应）→ 真标签重训验证；
  (b) 植物 S3 修正后反事实评估；(c) 闭包发送（阶段 D）须用户另行批准 + 协议 §8 联调。

## 7. 复跑索引

- 可部署模型重训+导出：D:/vscode/.tools/hx-train/.venv/Scripts/python.exe train_arbiter_deploy.py
  → vendor/arbiter_lgb.json（www+assets）、models/arbiter_lgb_deploy.txt + meta、data/__deploy_verify.json
- 移植核对：node D:/vscode/.tools/hx-train/__verify_js_eval.cjs
- 集成桩：node .tools/__phaseB-integration-test.cjs（仓库 .tools，gitignore）
- R2–R5 回归：node .tools/__rectify-r2345-test.cjs
- 离线训练/评估回执：D:/vscode/.tools/hx-train/HANDOFF_2026-11-16-phaseB-arbiter-learning.md
