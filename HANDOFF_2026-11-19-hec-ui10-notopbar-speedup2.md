# 交接：UI10 批 3 —— 简单档去顶栏（B 采纳）＋提速二轮（3s 首请求/200ms 重试）（2026-11-19）

> lineage：countdown-speedup（批 2）→ 本份。用户当轮：「提案 B 采纳」＋「首请求放宽到 3s 再首请求，重试间隔 200ms」。

## 1. 改动（summary.js/index.html，www＋assets 两份）

- **简单档去顶栏**：simpleView 不再渲染 lrn-top（标题＋✕），modal 加 sum-notop 类（.lrn-body padding-top 20px）；render 的 sumX 绑定改存在性守卫；**简单档唯一关闭＝「再来一杯」**。标准/完整档顶栏✕ 保留（它们无再来一杯）。
- **提速二轮**：collect 首请求前 await 3000ms（用户口径：插件前 3s 算不完新杯，避免空请求），其后 200ms×16 次；等待态即弹/0ms 起 collect 承批 2。降级兜底窗≈3+16×(0.2+rtt)。
- 实测：late-ready（桩 5.3s 就绪）圈满后 842ms 开弹（含回归脚本自身采样滞后~150ms；真机无此层，界≤200ms 格＋rtt；旧 1s 格≈1.2s）。断言阈值 1000ms 防模拟器时序偶发。

## 2. 验证

- __summary-regress **71/71**（＋simple no topbar/again sole close 断言）；模拟器已装本批包；实拍 review/hec-ui5/sum-simple-v7.png（无顶栏）。
- 示意稿比选留档：mocks/hec-popup-simple/popup-simple-v8-notopbar.html/.png（景 A 现状 vs 景 B 提案，用户采纳 B）。

## 3. 覆盖旧口径（下一任别回退）

- relay「顶栏全档仅标题＋✕」→ 仅标准/完整；简单档无顶栏、仅再来一杯关。
- 批 2「400ms×12／0ms 首请求」→ 3s 首请求＋200ms×16（用户二轮拍板）。
- 其余承 relay/批 1/批 2（键盘语义/仅按钮关/grindInput/右侧版式/5s 圈/等待态脉冲）。

## 4. 状态 / 待办

- 本地提交（见 git log），**未 push/未发版**；平板仍 v0.30。待用户授权发 v0.31（含批 2＋批 3）。
- 别碰照旧；桩 4801 随对话死需提权重起（本对话已起）。
