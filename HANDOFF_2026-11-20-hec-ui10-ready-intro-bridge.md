# 交接：UI10 批 4 —— 杯末开场定稿（HEC 棕扩→READY→黑底 5s）＋原生桥堵死根因修（2026-11-20）

> lineage：v031 回执 → 本份。用户真机报「倒数完了没法弹」→查根因＋开场重设计（多轮拍板）。

## 1. 真机根因与修

- 平板实测 /diagnostics 单次往返 **1.4s**（external-status 0.96s）。HxBridge.httpJson 原生任务 JS 侧 race 超时取消不了；僵尸占槽（readTimeout 旧 8s）＋池仅 3 → 重试洪泛/轮询把槽占满，后续请求排队堵死 → collect 卡死、圈满干等不弹。
- 修：HxBridge 池 3→**6**、readTimeout 8s→**5s**；summary collect 单请求 2s race＋**8.5s 总 deadline（挪到 3s 首请求等待之前）**到点必离线兜底弹；首请求 3s＋200ms 密轮询承批 2/3。
- 实测晚就绪（桩 7.3s 切换）圈满后 **436ms** 在线接住开弹（旧 1s 格≈1.2s；无兜底旧版可干等数十秒）。

## 2. 开场定稿（用户 11-20 多轮拍板，总 7s）

- 0–0.7s：棕色 #3d2c17 clip-path 圆形扩到满窗口＋HEC 连字（图标母版同 path、#f5c078）淡入。
- 0.7–1.0s：连字与棕底**一起淡出**。
- 0.9–2s：「准备好了吗」/EN **READY** 黑体 900 72px 琥珀大字叠最上层（#sumCountReady，独立于圈盒）。
- 2–7s：**黑底** 5s 倒数（圈琥珀/数字暖白，承原 sumcount 样式）；等待态脉冲/降级兜底不变。
- reduced-motion 全 snap（棕/HEC 跳过、READY 直显）。
- 结构：sumCount innerHTML 增 sc-brown/sc-hec/sumCountReady/sumCountBox 四层；tick 前 2s 走 50ms 相位驱动，2s 后回 100ms 圈逻辑。

## 3. 验证

- __summary-regress **72/72**（READY 断言改查 sumCountReady＋box 隐藏；晚就绪断言＝在线接住＋≤2.5s 防模拟器尖峰假红）。
- 三帧实拍 review/hec-ui5/：sum-hec.png（棕满窗＋HEC＋READY 交叉）／sum-ready.png（黑底 READY）／sum-count.png（黑底圈倒数）。
- 示意稿留档 mocks/hec-popup-simple/popup-ready-intro-v1.html/.png（帧 3 棕底倒数已被用户改为黑底，以本份 §2 为准）。

## 4. 覆盖旧口径 / 状态 / 待办

- 覆盖：批 3「READY 在圈内/棕底倒数」→ 本份定稿（READY 独立层、倒数黑底）；relay「5s 圈」→2s 开场＋5s 圈。
- 本地提交（见 git log），**未 push/未发版**；模拟器已装本批包；平板仍 v0.31。待用户授权发 **v0.32**。
- 别碰照旧；桩 4801/模拟器本对话已起（随对话死，下一任重起）。
