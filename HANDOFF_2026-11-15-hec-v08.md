# 交接：HEC v0.8（2026-11-15 第六轮）→ 学习中心弹窗（三入口），待真机验收后与 v0.7 一起发版

> 前序：HANDOFF_2026-11-15-hec-v07.md（杯末直写+回放温度线）、hec-v06、hec-v05。
> 技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22。
> 规矩照 AGENTS.md（7 四件事、20 先问、16 中文、15 正斜杠链接、17 小字只状态/标题、18 推送走 VPN、8 不拉整份 CodeInfo）。

## 0. 一句话现状

HEC 仓库 HEAD 3d98ad5（v0.8 学习中心已提交，**版本号仍是 0.6、未发版**；v0.7 功能也在里面）。
模拟器 hxpad 已装含 v0.7+v0.8 的 debug 包并回归通过；**真机平板还是 v0.6**。
父仓库指针待提交（随本交接一起）。夸克 v0.6 仍未传（用户还没点头）。

## 1. 本轮改了什么（3d98ad5，用户口径已定）

用户拍板：**移植插件诊断页的「学习成果」只读视图（不移植写操作），入口点 app 标题弹窗；
决策模型、仲裁模型与算法学习并列三个一级入口。**

- **learn.js（新文件，约 400 行）**：学习中心弹窗，全部只读、不发送指令。
  - **算法学习**：下一杯指令表（目标/LUT 基础/学习后/来源 adaptive，S3 形状早中晚三段）、
    自动应用状态胶囊、增益记忆表（桶中心 p/q±radius × S2/S3 的 r/n/漂移×比值/指令档/阻尼）、
    最近一杯判定（S1/S2/S3 误差%胶囊+状态、研磨建议中文 label+置信度、学习完整性、排除标记）、
    历史概览（已存/兼容/基线杯数 + 最近 8 杯完整性/证据●○/排除）。
  - **决策模型**：bc_v0 ONNX 加载状态（就绪/加载中/失败）、本杯决策数、归档杯数（max 40）、
    最近 30 个决策点（时刻/相位/P(写入)/档位→候选/动作保持|写入）。
  - **仲裁模型**：算法/模型倾向双条 + 滑杆（实时调 HxShadow.setPreference，0–100）、
    软预算 12/分歧门 0.5/硬边界 0.1–8 ml/s（1/16 量化）说明、算法/模型/保持统计卡、
    最近 25 条仲裁记录（选择/理由/裁剪/指令）。
  - 数据源：在线经 HxControl.httpJson 拉 calibration-status（控制页同款桥，无 CORS 问题）；
    离线回退归档。**归档杯 commands 是 {stage1:{desiredGS,…}} 形状，shotCommandFlows() 归一成
    在线 commandFlows 扁平形状**（nextShotApplied.commandFlows 优先）。drift 是比值（×1.05）不是百分比。
  - 关闭：✕ / Esc / 点遮罩；记住上次 tab；重复开关不重复挂监听；中英文完整（自己的 EN 表）。
- **archive-core.js**：归档保留顶层 gainMemory——merge 随导出更新（导出没有时保留已有）、
  appendRun 不丢、emptyArchive 带 null 字段。buildArchive 加第三参 gainMemory 显式传递。
- **control.js**：暴露 httpJson（学习中心只读 GET 用）；onLang 联动 HxLearn.onLang。
- **index.html**：h1 id=appTitle 可点（cursor:pointer）、lrnDim 遮罩、学习中心样式
  （复用现有 .modal/卡片/胶囊令牌，琥珀选中色同标题配色口径）、learn.js 最后挂载。
- **hec-stub.cjs（.tools，不入库）**：补 calibration-status 端点（在线路径测试用）。

## 2. 验证（都做过，别重复）

- 离线：__v08-gm-test.cjs（gainMemory 保留：merge/appendRun/无 gm 导出）全过。
- 模拟器交互回归 __v08-regress.cjs 9 项全过：模块挂载/点标题三入口/算法学习四区块/
  决策模型页/仲裁模型页/滑杆实时生效/✕关闭/Esc关闭/重复开关稳定。
- 真实数据展示：真机 71 杯导出的 gainMemory（8 桶）+ 最近杯判定注入归档 → 增益记忆 17 行、
  判定表、研磨建议、完整性、下一杯指令（S1 3.0/1.315→3.313 等）全部正确渲染。
- 在线路径：连 4797 桩（补了 calibration-status）→ 源标「在线 · calibration-status」、
  历史概览 3 卡（PERSISTENT/71/61）。
- 真实决策：桩出杯 34s → 影子 16 决策点全带仲裁记录（writeProb/quanta/候选/pick/reason）、
  2 次插件写入 → 决策模型页与仲裁模型页真实渲染。
- 英文切换：Learning / Adaptive / Policy model / Arbiter / Read-only · no commands sent。
- 截图：D:/vscode/.impeccable/review/v08-learn-real.png、v08-learn-online.png、
  v08-model-real.png、v08-arbiter-real.png。

## 3. 本轮踩的坑（项目特有）

- **真实导出 commands 与在线 commandFlows 字段名不同**（stage1.desiredGS vs stage1DesiredGS），
  且可能是 JSON 字符串；离线展示必须归一，否则整列「—」。
- **gainMemory.drift 是比值**（晚段/中段，1.05=+5%），不是百分比，别 ×100 当 % 显示。
- **影子杯末 onCupEnd 会把 cup 置 null 并归档**：杯末断言决策数要读 exportJSON/hecShadowCups，
  别读 status().cup（那是正在跑的杯）。
- CDP 回归脚本解析返回值要认裸 true/false/数字行，别只认 " { [ 开头。
- 弹窗记住上次 tab 是预期行为；测试打开后要显式点目标 tab。

## 4. 通道 / 复跑（沿用 v0.7 §4）

- adb / 构建 / CDP / 桩口径不变。4797 桩本轮重启过（加载 calibration-status），4795/4796 别碰。
- 模拟器归档里现有测试数据（真实杯摘要 + gainMemory + stub 杯 + synth 杯），真机不受影响。
- 学习中心数据服务 __v08-serve.cjs（4799，120s 自停）是临时测试用，不用常驻。

## 5. 待办（新对话按顺序）

1. **夸克补传 v0.6**：MCP 可用，APK 在 .tools/HyperExController_v0.6.apk →「/来自：Codex」。**先问用户。**
2. **v0.7+v0.8 真机验收 → 发版**：用户唤醒机器后真机出一杯，确认直写+温度线+学习中心；
   然后升 versionCode 7/0.7（或按用户口径）、构建、装平板、push（VPN）、Release、夸克——**每步先问**。
3. 沿用前序：影子杯数据核对 → 攒数据 → 学习仲裁 → 自动发送须协议 §8 联调+用户同意 → 发版先问。
4. 历史 71 杯补温度（方案 A）仍挂着，用户没点名，别擅自做。

## 6. 别碰

- 插件仓库别人未提交改动；父仓库未跟踪目录；4795/4796 桩。
- 标题配色 v0.3 定稿（学习中心选中态沿用琥珀口径）。
- .tools/ 不入库；review/ 截图不入库。
- 温度传感器固定 mix；学习中心只读，不加任何写操作（校准/曲线编辑/历史排除留在插件）。

