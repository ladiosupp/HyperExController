# 发版回执：v0.36（预取回退修曲线＋胶囊档位修＋杯末超时修缺5项 批发版）（2026-11-20）

> lineage：UI11 预取回退（284be06）＋统筹胶囊修复重落（3d25166）＋UI11 杯末超时修（a04069b）→ 升版 57fefba → 本份。用户授权「走 v0.36 发版链」。UI 批用户直管，不回叫统筹。

## 1. 发版资产

- Release **452506216** / tag **v0.36** / asset **771256323**（HyperExController_v0.36.apk，**6,742,065 字节**，uploaded；uploads 直连 201 一次过）。
- SHA256 **52E27716A4AD782FE01A5D9258861738B781229A952B6BF9E875E9EB40CEE8B0**。
- 夸克「/来自：Codex」fileId **0b26d5dbc8f74359b2abba5417bb14a5**（非秒传；session 1795152989-sg5iu2 复用）。

## 2. 装机与验证

- 平板 versionCode **36** @2026-11-20 17:39:30；模拟器 36。
- 平板冒烟 4/4：iw=1138／ver v0.36／开关「杯末评分弹窗」／胶囊「本杯评分」；实拍 review/hec-ui5/tablet-v36.png。
- 胶囊分支行为 **8/8**（统筹 __coord-curvetag-test：六态标签＋接管优先＋锁/样式＋EN）＋总结回归 **72/72**＋启动 **8/8**＋杯末慢响应专项 **3/3**。
- 模拟器中途 GPU 栈卡死（SurfaceFlinger 起不来，boot 假红/回归卡住根因），软件渲染 swiftshader_indirect 重起后复跑全绿——非代码问题。

## 3. git

- 子模块 main 推至 **57fefba**（升版）→ 回执提交再推；tag v0.36 已推；ls-remote 核 main/tag 均 57fefba113f4。
- 携带统筹活文档/派单插提交（afd5329/9a1e4e2/c7b6902 等，只 add HEC_COORDINATOR_STATE.md／交接 MD）；APK 代码区间核净（预取回退＋胶囊修＋杯末修＋升版）。
- 父仓指针同步（见父仓 log）。

## 4. 本批三修

- **预取回退**（修曲线）：v0.35 杯内预取争桥池＋插件杯内锁遥测致实时杯流劣化；立「萃取中不能干预取值」不变量。
- **胶囊档位**（统筹修）：renderCurveBtn 按 ext.mode 分档取标签，修 full 档恒显 HEC。
- **杯末超时**（修缺5项）：单请求 race 2s→5s 对齐原生 readTimeout；v0.32 的 2s 短于插件杯末结算延迟 3–6s 致全超时。
- 承 v0.34：两段取／READY 1.0s／readypop 入场触发／评分文案／开场 7s／桥池 6。

## 5. 待办 / 别碰

- 插件杯末结算堵 HTTP 是插件侧根因（2.2.56 起）；APK 已用杯末 5s race 接住慢响应。统筹另派 scaleSampleGate 2.2.57（秤样本滤波，插件批 01a1f67b）与本 UI 批无关。
- 别碰：影子/仲裁发送面、温度链路、HX 液重、他人未跟踪。
- incoming：用户真机陪杯验证（曲线恢复正常＋倒数完出分＋full 档胶囊「插件全控」）。
