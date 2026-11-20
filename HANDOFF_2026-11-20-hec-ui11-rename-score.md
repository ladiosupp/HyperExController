# 交接：UI11 批 1 — 杯末总结/本杯总结 改名 杯末评分/本杯评分（2026-11-20）

> 前任：HANDOFF_2026-11-20-hec-ui10-ui11-relay.md（UI10→UI11 入口；§5 已回填 UI11 ID 01a1f75f-93c0-7fa3-bb41-5a25d946a2a4，提交 3fb6928）。口径不变量全集以前任 §1 为准，本批只追加一条（见下）。

## 0. 一句话现状

子模块 main HEAD = 本批提交；改名批**本地已提交、未推、未发版、未装平板**（一律先问）。模拟器已装 debug 包、回归全绿。

## 1. 本轮改动（用户当轮原话：「杯末总结改杯末评分，胶囊处本杯总结也改本杯评分」）

- learn.js：设置开关标签 杯末总结弹窗→**杯末评分弹窗**；EN 键值同步 'Shot score popup'。
- summary.js：胶囊（updateTag）／倒数小字（sumCountLb）／标准·完整档顶栏标题 三处 t('本杯总结')→t('**本杯评分**')；EN 长行 '本杯总结':'Shot summary'→'本杯评分':'**Shot score**'、'杯末总结弹窗' 键同步。
- www 与 assets 两份 SHA256 一致；node --check 四份全过。
- 代码注释（index.html CSS 节注／control.js:361／summary.js:1）保留旧名不动（surgical）。
- 父仓 .tools/__summary-regress.cjs 胶囊断言改 textContent==="本杯评分"（gitignore 不入库）；新增取证脚本 __rename-shots.cjs（7 断言）。
- **口径追加**：本功能用户可见文案统一「评分」；EN＝Shot score／Shot score popup；「总结」仅存于代码注释与历史交接。其余不变量（胶囊三档色/开关隐藏门/仅按钮关/开场时序/桥池6/deadline 等）零改动。

## 2. 验证回执

- gradle assembleDebug SUCCESSFUL（810ms 增量）；emulator-5554 install -r Success。
- __summary-regress **72/72**（含胶囊文案、i18n EN、晚就绪 579ms≤2.5s）；__boot-check **8/8**。
- __rename-shots **7/7**：倒数小字／顶栏标题／胶囊／设置开关 中英全断言过；实拍 D:/vscode/.impeccable/review/hec-ui5/rename-{count,modal,capsule,toggle,toggle-en,capsule-en,modal-en}.png。
- 收尾 stayon 恢复 false。

## 3. 本轮坑

- 无新项目坑（通用引技能）。注意：summary.js EN 是一长行，改名要 EN 键与 t() 调用点同改，漏键则 EN 回落中文。

## 4. 待办 / 别碰

- 装平板／发版／推送／父仓指针：一律先问（用户未指示）。
- **UI10 遗留未提交**：app.js（www＋assets）EN 行 '准备好了吗':'READY' 一条（v0.32 发版包已含、源码未提交）。不碰不代提交；本批构建含它（已告知用户）。建议下批随用户批准一并提交或单独补提交。
- 别碰：他人未跟踪 HANDOFF/review、影子/仲裁发送面、温度链路、HX 液重。
- incoming：用户下一条 UI 指令。
