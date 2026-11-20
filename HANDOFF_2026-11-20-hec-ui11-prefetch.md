# 交接：UI11 批 3 — 杯内预取写本地，杯末本地弹窗（2026-11-20）

> 前任：v0.34 回执（11a9aeb）。用户真机复报「倒计时结束还是卡＋简单取不到数据」，问「是不是跟插件修改有关」，口径「7秒多不够先把简单需要的数据取回来先写本地」。

## 0. 一句话现状

子模块 HEAD = 本批提交；**本地已提交、未推、未发版、未装平板**（先问）。模拟器全套绿（72+8+8+4）。**平板仍 v0.34 含本问题**，建议 v0.35 发版链。

## 1. 根因（真机取证 v0.34 后）

- 插件 2.2.56 杯末自动归档＋学习结算阻塞 HTTP：空闲 /diagnostics 1.1s，但杯末窗内全超时（v0.34 小 packet 也取不到）→ 末杯归档 hasSummary:false、commands:null → 离线 compact → 缺 5 项；弹窗拖到 8.5s 兜底 → 倒数完还卡。
- external-status 快（52ms）但不含打分字段，借不到。
- control poll（700ms external-status）正常 → 桥池非全堵 → 锁定 diagnostics 杯末不可用（插件侧）。

## 2. 本轮改动（用户预取口径）

- **summary.js**：prefetch(rid) 节流 2.5s，杯内 httpJsonPick PICK1 取打分子集，仅当 phases 有 available output 才缓存（防 stage1 空 phases 早缓存）；写内存 liveCache＋IDB hecLiveDiag（单键覆盖，冷启动可续）。
- **collect 重构**：本地缓存优先（内存→IDB）→ buildModel 直接弹窗（保证倒数结束即弹）＋refreshOnce 杯末单次校正（不密轮询，避免僵尸占池）；无缓存才走原 3s＋密轮询＋8.5s 硬 deadline 兜底。scoring 抽 buildModel；autoApply 刷新抽 autoRefresh；openWith 统一 attach/open/enrich/autoRefresh。
- refreshOnce/enrich 守卫只判 seq（倒数期间 model 未赋值），渲染才判 model===m。
- **control.js**：poll 里 noteExternal 后挂 HxSummary.prefetch(runId)（run 活跃即杯内）；export prefetch。
- 归档 commands 随缓存/在线 attach 落（_attachSummary 第三参），离线 portModel 有目标流量。

## 3. 验证回执

- __summary-regress **72/72**＋__boot-check **8/8**＋__tf-realshape **8/8**（S2 100／S3 82／总 90）。
- __tf-prefetch **4/4**：杯内预取写本地✓；桩延迟拉 9s 模拟插件杯末堵死→倒数结束即弹✓、来源 online✓、总 90✓。

## 4. 待办 / 别碰

- 装平板／发版／推送／父仓指针先问；建议 v0.35 发版链（平板 v0.34 含本问题）。
- 别碰：影子/仲裁发送面、温度链路、HX 液重、他人未跟踪。
- incoming：用户下一条指令。
