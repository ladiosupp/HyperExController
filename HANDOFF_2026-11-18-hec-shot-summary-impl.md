# 交接：杯末总结弹窗实施批（2026-11-18 晚，用户批准示意稿后派单）

> 前序：HANDOFF_2026-11-18-shot-summary-eval.md（评估真源）、.impeccable/mocks/hec-shot-summary/（示意稿，随本批入父仓库）。
> 授权范围：实施 + 测试 + 本地 commit；**发版未授权，ready 停下先问**。版本号未升（仍 20/0.20）。

## 0. 一句话现状

杯末总结弹窗已实施并本地提交（子模块本交接提交；父仓 mocks 提交），模拟器回归全绿；**未装平板、未推、未发版**。透明壳 bug 已修（.lrn-modal 单独无底色，须 modal lrn-modal 组合类）。

## 1. 本轮改动

- **www/summary.js（新）**：窗口链逐行移植 plugin.js controlOutputQuality（含 reduced-window 重复 push 怪癖照抄）；公式 v2（1.8/1.8/1.2/0.5/3，免费带 4/3/5/25，w S1=0/S2 .45/S3 .55，缺数据权重重分配不给 0/100）；TDS 分 = clamp(100−1.5×max(0,|TDS−3.5|−0.2)/3.5×100,0,100)（**不先舍入**），加权 = round(0.7×控制+0.3×TDS)，未录显控制分+「TDS 未录」；三档渲染（简单=总分+TDS+研磨；标准=+下一杯表+已自动应用；完整=六区块+杯数据补充六行+粉量/EY）；触发守卫（enabled/hx/samples/conn ok/前台/每杯一次/校准与非 HX 不弹）；杯末 +1s 拉 /diagnostics（runId 不符重试 ≤5×1s）→ 降级本地影子+归档；autoApply 3s 刷新一次；开杯自动关；✕/Esc/遮罩关；回看胶囊（curveTag 旁，有结算杯才显示）；在线算毕经 HxControl._attachSummary 持久化 shot.summary，回看读持久化 → 插件导出历史杯走移植链（trace 有分类才算分）→ 旧杯 compact 降级；TDS/粉量 IDB hecShotTds {runId,tds,dose,at}，不喂增益记忆；i18n 自带 EN 表。
- **control.js**：杯末钩子 HxSummary.onCupEnd({runId,run,hx})、开杯 onExtracting、onLang 转发、_attachSummary 导出；archiveRun 补字段 scaleTimestampSeconds/tareReset/targetPressureBar/rawScaleSamples/finalWeightG（只加不改旧字段）；onScaleSnapshot 补 s.tgtP。
- **learn.js**：控制中心·功能设置首行总开关 shotSummaryOn（hecShotSummary 0/1 默认 1）+ 颗粒度滑杆 shotSummaryLevel（hecShotSummaryLevel 0/1/2 默认 1，b 显 简单/标准/完整）；EN 增词条。
- **index.html**：sumDim（lrnDim 同款 modal-dim，DOM 在其后）+ summary.js script 标签 + 总结弹窗 CSS（scoreline/total 三色 44px Orbitron/mrow/ded/grind 琥珀三色/tdsrow/tdsbox/srcrow/setrow/curvetag.sum）。**壳类名 modal lrn-modal**（底色/边框/圆角/阴影来自 .modal）。
- 红线守住：shadow.js/arbiter.js/温度链路/HX 液重零改动；sent 恒 false/硬包线/单一写者由回归复验。

## 2. 验证回执（模拟器 hxpad）

- **__summary-regress.cjs 27/27**（触发/在线源/总分/HIT/三档矩阵/TDS 加权 99/提案胶囊/Esc/持久化回看/完整区块/简单区块/总开关 off 不弹+回看保留/off 杯 compact/降级非在线/非 HX 不弹/校准不弹+drive 到位/中止不评分/缺数据 reason+重分配/compact MISS/遮罩关/开杯自动关/i18n EN）。
- 红线与适用集：**__yield-regress 19/19**（hec-stub 4802）、**__rectify-r2345 27/27**、**__phaseB 15/15**、**m10 20/20**、**m6m8 8/8+5/5**、**flowcard 6/6**、**boot-check 8/8**。
- 取证：review/hec-ui5/v23-impl-standard / -full-top / -full-bottom / -settings.png（gitignore 本地）。
- 收尾：stayon false、forward 9224 / reverse 4801+4802 删、两桩按 pid 停。

## 3. 本轮坑（项目特有）

- **.lrn-modal 单独没有 background/border/radius**（在 .modal 上）；学习中心用「modal lrn-modal」组合。新弹窗只写 lrn-modal = 透明壳（用户肉眼发现）。
- **桩 workflow 跨套件污染**：yield-regress 经 UI 切曲线会 PUT /workflow 到当前 baseUrl 的桩；把 m6m8 桩 live 改成非 HX 后，后续 drive 全被 hx 守卫挡（表现为「弹窗不弹」但无报错）。套件开头必须复位 workflow；排查先 dump 守卫埋点。
- **每个桩端口都要 adb reverse**（4802 没 reverse 时 conn=bad，suite 全红假象）。
- **ext 轮询 ~700ms**：注入 drive 在 setext 后须等 ≥900ms 再注 espresso，否则 runId 落旧值（杯末 ctx.runId 错/空）。
- **tdsScore 不要先舍入**（95.714→96 会让杯 8 加权 50→51，偏离批准口径）；显示层 round 1 位。
- **Object.assign({source:'persisted'}, shot.summary)** 会被 summary 自带 source:'online' 覆盖；改 Object.assign({}, summary, {source:'persisted'})。
- apply_patch 多 hunk 必须文件行序升序（本轮踩三次）；Add File 每行 + 前缀。
- exec_command 30s yield 后 cell 不轮询 = 孤儿进程（上轮已记）；本轮长任务均 cell 内 write_stdin 轮询。
- cdp.js send 返回整条消息，截图 base64 在 r.result.data。

## 4. 待办（每步先问）

1. **发版 v0.21 + 装平板**：待用户发话（版本号未升；本批未推）。
2. 父仓指针：本批子模块提交 + 父仓 mocks 提交的指针未建/未推，待用户发话。
3. 二期：回放页逐杯回看入口；三期插件提案①compact 持久化 5 指标②summary 端点③TDS 集成（另批授权）。
4. 功能设置/其他其余内容仍等用户定义。

## 5. 别碰

shadow/arbiter 发送逻辑、温度链路、HX 液重；插件仓（2.2.49 在途）；别人未跟踪 HANDOFF-11-17-code-audit / live-cups / 11-18-eval、review/hec-icon/*；旧桩端口别 kill。

## 6. 产物索引

- 子模块提交：实施批（8 文件）+ 本交接；父仓提交：.impeccable/mocks/hec-shot-summary/（html/woff2/3 png）。
- 脚本（不入库）：父仓 .tools/__summary-regress.cjs、__sum-shot.cjs、__sum-probe.cjs、__sum-errprobe.cjs、__sum-dbg.js、各 *-impl.log；子模块 .tools 无新增。
- 取证：review/hec-ui5/v23-impl-*（4 张）。
