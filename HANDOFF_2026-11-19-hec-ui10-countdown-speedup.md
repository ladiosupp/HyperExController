# 交接：UI10 批 2 —— 杯末弹窗提速（400ms 密轮询/0ms collect/等待态即弹）＋去顶栏示意稿待拍板（2026-11-19）

> lineage：v030 回执 → 本份。用户当轮：①简单档标题栏＋✕ 想去掉，先出示意图比选（**未改代码，待拍板**）；②倒计时结束仍等~1s，查提速空间（已改＋实测）。

## 1. 提速改动（summary.js，www＋assets 两份）

- 根因：collect 首请求 +100ms、失败重试 **1s 间隔**（请求点≈0.1/1.1/…/5.1s），插件若 5.3s 算毕新杯 controlReview 要等 6.1s 请求点→圈满后白等~1s；等待态 open() 还要等 ≤200ms tick。
- 改：重试 400ms×12 次（覆盖窗与旧 6 次相当）；collect 0ms 起；open() 在 Date.now()>=cdEnd 时 stopCountdown+doOpen 立即弹。
- 实测（回归新断言 late-ready）：桩 5.3s 切换就绪→圈满后 **446ms** 开弹（旧≈1.2s）。70/70 全绿（含等待态脉冲/降级路径，降级窗现 12×(0.6+0.4)≈12s）。
- 覆盖旧口径：relay「+100ms collect 并行」与 1s 重试格作废；5s 圈语义/等待态脉冲/新杯取消不变。

## 2. 去顶栏示意稿（待用户拍板，未动代码）

- .impeccable/mocks/hec-popup-simple/popup-simple-v8-notopbar.html/.png：景 A 现状 v0.30（标题栏＋✕）vs 景 B 提案（去 43px 顶栏，hero 净高 +43px，「再来一杯」唯一关闭）。
- 若采纳：simpleView 去 lrn-top（仅 level 0；标准/完整保留顶栏✕，否则无关闭按钮）；回归「顶栏仅标题✕」断言限标准/完整；简单档关闭只剩 sumAgain。

## 3. 状态 / 待办

- 本批本地提交（见 git log），**未 push/未发版**；模拟器已装提速包，平板仍 v0.30（提速随下一版发）。
- 桩 4801 随对话死：本对话曾遇 ECONNREFUSED，提权侧 Start-Process node __m6m8-stub.cjs 4801 重起＋reverse（技能/AGENTS 既有规矩）。
- 待用户：顶栏 B 采纳否；提速（＋顶栏若采纳）发 v0.31 授权。
