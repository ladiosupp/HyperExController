# 交接：样式 1 目标线批（2026-11-18 晚，用户三轮口径订正后定稿）

> 前序：HANDOFF_2026-11-18-hec-shot-summary-impl.md（v0.21 已发）。**本批已发 v0.22 装平板**（用户 11-18 晚授权「装平板、发版、推送和父仓指针」）：版本提交 d651809、tag v0.22、Release id 449956741（asset 763329190，6,731,329 字节）、夸克 fileId 3096730deafb461598486e781e82d7bf；平板 versionCode 22（20:31:24 装机）冒烟通过；子模块 main/tag 与父仓指针已推（父仓 hash 见回叫/对话）。接力交接见 HANDOFF_2026-11-18-hec-ui-continue.md。

## 0. 用户定稿口径

- HX 曲线压力卡**不动**（已有目标指令黄虚线 + APK 指令橙实线）。
- 杯流卡增加**目标杯流黄虚线**：HX 萃取中保留原有活线（ext.targetGS / tgtHist）；空闲无杯与非 HX 取曲线步参考（profileTargets）。
- 非 HX 压力卡增加**目标压力黄虚线 + 目标机器流量蓝虚线**：萃取中取遥测 tgtP / tcmd；空闲取曲线步参考（limiter / flow）。
- 样式 2 合并图不受影响（图例/配色/键不变）。

## 1. 改动（control.js，assets 同步）

- profileTargets()：按 liveProfile.steps 累积时长生成 flow/press/mflow 阶梯参考；g/s 取 desiredRealFlowGS → 步名 /real X g/s/ → flow；bar 取 limiter.value → 压步 pressure；**函数内自带有限数 helper**（num 是 onMachineSnapshot 局部，误用曾致 drawCharts ReferenceError 中断——本轮真 bug）。
- drawCharts 样式 1：prof = (idle || !hx) 时计算；xMax 空闲按曲线总时长取整（参考线全宽可见）；杯流卡 prof 阶梯黄虚线（stepLine 新增 dash 参数）否则 HX 活线；压力卡 HX 原块不动，非 HX 有样本画 tgtP 黄虚线 + tcmd 蓝虚线，无样本画 prof 参考。
- seriesCache/EMPTY_SC 补 tgtP 序列（onScaleSnapshot 的 s.tgtP 来自 v0.21 归档补字段）。
- 图例：样式 1 杯流目标杯流条目不再限 hx；压力卡 hx → 目标指令+APK 指令（原样），非 hx → 目标压力(黄)+目标机器流量(蓝)；EN 增两词条。

## 2. 验证回执

- __targetline2-check.cjs **12/12**（HX 空闲/萃取、非 HX 空闲/萃取、样式 2 图例不变；像素黄/蓝计数）。
- 复跑 m10 20/20、m6m8 8/8+5/5、boot 8/8。
- 取证：review/hec-ui5/v24-style1-hx-cup.png、v24-style1-nonhx-cup.png（gitignore 本地）。
- 收尾：stayon false、forward 9224 / reverse 4801 删、桩 4801 按 pid 停。

## 3. 本轮坑

- **num 作用域**：onMachineSnapshot 局部 const num，外层新函数误用 → ReferenceError 被渲染链吞掉，表现为「曲线间歇性整卡不画」；新函数自带 helper。
- **像素验收的遮挡陷阱**：合成数据 decaid==target、mflow==tcmd、温度恰在左轴中点时，实线完全盖住同高黄虚线 → 计数 0 假红；验收数据必须错开（targetGS≠weightFlow、mflow≠tcmd、温度避中点）。
- **注入时间压缩**：_injectScale 的 s.t 用 runT()（真实时钟），密集注入会把活线挤在左缘 1-2px；验收注入须间隔 ≥250ms 散开。
- 套件 baseUrl 残留（上轮 yield 切 4802）→ 开头经地址弹窗复位 4801；桩 workflow 跨套件污染同前批。

## 4. v0.22 发版回执（2026-11-18 晚，用户授权）

- 预检十支全绿（v0.22 包）：targetline2 12/12、summary 27/27、r2345 27/27、phaseB 15/15、m10 20/20、m6m8 8/8+5/5、flowcard 6/6、boot 8/8、yield 19/19。
- flowcard 刷新项曾连红四次：套件按整圈计数而 CDP 往返延迟把 10 次注入拉至 1.3-1.5s → 4 次更新假红；**测量窗改固定前 1000ms** 后 6/6（改测量不改代码）。
- APK 6,731,329 字节，SHA256 1BEB8804F000EE072E15CF60943D7780BF34BBB7C5A2F0CC6280C2B3633B2C0F；Release 449956741 / asset 763329190 uploaded；夸克 3096730deafb461598486e781e82d7bf（无 notice.text）。
- 平板 install -r 20:31:24，dumpsys 22；冒烟 ver v0.22 / conn ok / helloOk / heartbeat ageMs 0 / externalWrites 0 / shadow ready；插件 2.2.50。
- 推送：子模块 main 8e57211..d651809..（回执）+ tag v0.22；父仓指针提交 + 推。
- 收尾：stayon false、forward 9224/9223、reverse 4801/4802 删、两桩按 pid 停。

## 4b. 待办（转接力对话）

1. 功能设置/其他其余内容等用户定义；二期回放页逐杯回看；三期插件提案①②③另批授权。
2. profileFrame 非 HX 真机色带验证仍待真杯（评估交接已确认未被覆盖）。

## 5. 别碰

同前批：shadow/arbiter 发送、温度链路、HX 液重、插件仓、他人未跟踪文件。
