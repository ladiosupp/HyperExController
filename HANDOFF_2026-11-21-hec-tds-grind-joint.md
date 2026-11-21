# APK TDS×秤流联合判定层批交接（2026-11-21，研磨建议细化 Q6 用户已裁）

## 0. 一句话现状

APK 侧 TDS×秤流联合判定层已落地（提案 HANDOFF_2026-11-21-grind-advice-review.md §4.1/§5.2，用户 11-21 裁 Q1–Q7 全按推荐）：summary.js jointVerdict 纯函数＋「确认重算」手势触发＋简单档右栏主/副行＋标准/完整档 grindSec 同口径；只展示红线维持；回归 72＋8＋33＋31 全绿；本地 commit 见 git log -1（只 add 本批 summary.js 两份＋本交接）；**发版/装机/push 未做，另批先问**。基线＝f6ce2b1（含 UI12 9e5bf03 JS 均衡右锚定＋WS 修复 55b5e62）；versionCode 未升（与 WS 修复 v0.37 候选可合发可分发，发版时用户裁）。

## 1. 本轮改动（只 APK 仓 app/www/summary.js＋assets 镜像＋本交接；index.html/build.gradle 未触）

- **jointVerdict(m, tds)** 纯函数（eyOf 后，约 60 行）：输入 m.grind（插件 status/relPct/confidence/label）＋tds.tds/dose＋m.finalWeightG；输出 {kind,title,detail,cls,hit,hasDose,ey,eyState,rel,regime}。测试钩子 HxSummary._jointVerdict。
- **触发**：simpleConfirmed（sumRecalc「确认重算」，与加权分同一手势）门控；新杯 doOpen 重置；锁定后 TDS/dose 编辑 live 重算（锁定态保持）。重算前右栏/grindSec 逐字不变（回归钉子 !.s 保绿）。
- **EY**＝tds×finalWeightG/dose（eyOf 同式）；**EY 正常带＝固定参考 17.7–19.8%**（提案参考配方 dose 19/液重 102 推得；**用户 11-21 确认不随录入 dose 缩放**——否则 EY 状态恒等于 TDS 状态，与 §5.2 粉量偏低示例 TDS 3.0/dose 17→EY 18.0% 正常矛盾）。TDS 命中带 3.5±0.2，两位小数舍入比较（避浮点边界），与 tdsScore 死区一致。
- **判定优先级**：fault/插件建议不可用/无 TDS→null 回落插件杯末建议；uneven→通道/布粉优先（EY 低支持通道；TDS 命中佐证研磨合适但通道证据仍在）；命中→regime 伪影嫌疑（|rel|>50，TDS 佐证非研磨）/萃取维度偏差（EY 偏，低优先级）/研磨大概率合适（**降级非否决**＋流量/base 注记＋无 dose 歧义注记）；TDS 低→EY 低（regime 守卫/偏粗三重/偏粗略低 lean/偏细略高 lean/萃取不足先布粉）/EY 正常·高→粉量偏低嫌疑/无 dose→weaker＋歧义；TDS 高→偏细三重/萃取过度/粉量偏高嫌疑/weaker。
- **三维合参口径**：秤流维度消费插件 status（flow-high/coarse→偏高，flow-low/fine→偏低，hold→近），阻力 rel ±12 三重一致/±8 近带 lean（R2 下界用户裁 Q3）；**不新增流量阈值**，status 词表/uneven 签名语义冻结不动。
- **展示**：简单档右栏联合态 .v 主行＝判定标题（grid-row 2，单行短语）＋.s 副行＝插件杯末 status·阻力 rel·confidence（grid-row 3，10px）；三行网格/上下沿对齐/UI12 右锚定＋balanceGrind 全不变（.s 独立于 .v，balanceGrind 只作用 .v，联合标题走 .vt 均衡）。标准/完整 grindSec：.t 标题＋「联合判定」pill、.d 完整指导文案、.s「插件杯末判定：status·rel·confidence·label」＋「只建议，不自动改」。TDS 未录→grindSec 插件建议＋「录 TDS 点重算可看联合判定」空态注记（提案 §4.1 原文，仅 grindSec；简单档靠既有 TDS 未录 pill＋disabled recalc，遵 AGENTS 17 不加操作小字）。
- **i18n**：19 条 EN 新词条（标题/固定标签）；指导 detail 为中文数据文案（与插件 label 同口径不译）。
- **红线（summary.js:4 维持）**：只展示；不写 shot.grindAdvice、不喂增益记忆、不发机器指令；hecShotTds 仍 APK 本地 {tds,dose,grind,at}；通道签名读插件 status 不受影响；联合层无插件对应物，不需镜像回插件。

## 2. 验证回执（模拟器 hxpad emulator-5554＋桩 4801 复用 __m6m8-stub 未 kill＋reverse 4801 既有）

- node --check 两份通过；**www/assets/APK 内 summary.js SHA256 三方一致 17DC334DAF114640295F68B438D1A597B37AE981F92E06D43ED8A2FEF111162F**。
- **__summary-regress.cjs 72/72**（含重算前右栏无 .s 钉子/v7 上下沿对齐/冷 boot 持久化；构建含 UI12 已提交批，基线干净）。
- **__boot-check.cjs 8/8**。
- **__tds-joint-matrix.cjs 33/33**（父仓 .tools 不入库，node 浏览器桩直测 _jointVerdict：§5.2 全 8 场景＋三重/lean/近带/regime/无 dose 歧义/边界 3.3/3.7/3.29/3.71/fault 门/relPct null/红线零 db 写零输入改）。
- **__tds-joint-ui.cjs 31/31**（父仓 .tools 不入库，CDP 真实 UI：recalc 触发门控/三档展示/dose live 重算 EY 21→萃取维度偏差/归档 grindAdvice·summary 不覆盖/hecShotTds 本地/影子零喂/新杯重置/TDS 未录回落/4 矩阵场景走真实 UI/fault 门/EN 真实下拉/无裁切测量 scrollHeight≤clientHeight/标题单行 .vt 无 br/UI12 .vt 右锚定共存）。
- 截图取证（review/ 不入库）：D:/vscode/.impeccable/review/hec-ui5/sum-joint-simple.png、sum-joint-standard.png。
- **真机验证未做**：需用户装机后录 ≥5 杯 TDS（覆盖 flow-high/low/hold）验联合文案（提案 §7.5；归档 TDS 0 条，离线仅假设演示）。**这次没做代码级云上核对**（本批无云部署）。

## 3. 本轮坑（项目特有）

- **num(null)=0 / num('')=0 陷阱**：tds/relPct 的 null 须显式守卫（tds null 被当 TDS 0、relPct null 渲染 "Resistance null%"）；jointVerdict 入口与两处副行 relPct 守卫共修三处。
- **浮点边界**：3.3/3.7 裸减 3.5 得 0.20000000000000018→命中带用 round(,2) 比较；tdsScore 裸值 3.7 有 7.7e-15 扣分（既有行为不改，显示取整 100）。
- **recalc 按钮只在简单档**：标准/完整联合判定靠 simpleConfirmed 共享态（简单档确认后切档）；测试脚本点 recalc 前必须 setLevel(0)。
- **EN 切换必须走真实 #lang 下拉**（app.js 词法 lang，window.lang 赋值无效）；**探针/测试改语言后必须还原 zh**——本批 EN 探针未还原致回归继承 EN 态 13 条语言断言假红（重跑即绿，非代码 bug）。
- **apply_patch 多 hunk 必须按文件位置排序**（AGENTS §2.9 同款再踩）。
- **并发协调**：UI12（用户直管）09:33/09:52 两次写 summary.js（balanceGrind JS 均衡＋右锚定），本批共存不覆盖：.s 独立网格行＋内联样式避 index.html；UI12 已自行部分 staging 提交 9e5bf03（commit 注「并发 TDS 批 WIP 留工作区未暂存」），本批提交时工作区只剩本批改动，无需部分 staging。**模拟器 userdata 重置会丢回归前置**（hecBaseUrl/app/reverse，UI12 交接 ac97317 §3，技能坑 29–31）：重起模拟器先 node .tools/__set-addr.cjs 设回地址＋control 档。
- **EY 正常带口径分叉已裁**：按每杯 dose 缩放→EY≡TDS 恒等（失解混淆意义）且与 §5.2 示例矛盾→用户确认固定参考带 17.7–19.8%。

## 4. 待办（每步先问）

- 发版/装机/push/tag/Release/夸克/父仓指针：另批授权（versionCode 未升；与 WS 修复 v0.37 候选合发/分发用户裁）。
- 真机 ≥5 杯 TDS 录入验证（装机后，用户操作）。
- **R6 多杯确认覆盖**（命中先验例外「除非 R6 确认＋EY 同向偏」）：待插件 P0 批落 confirmation 字段后消费（加性、status 词表冻结）——记 APK 同步债；本期无该字段不实现（归档 0 触发）。
- 插件 P0＋R7 批（另派，排 d 终裁后）：R3.5 TDS 注记文案属插件侧，不在本批。
- grindInput 漂移分析二期（Q6）。
- 插件新字段（evidence/subtype/suggestedDirection/confirmation）展示更新＝hec 里程碑同步债（提案 §6）。

## 5. 别碰

- UI12 已提交批（9e5bf03）与后续 WIP 不碰不代提交不回滚；影子发送/仲裁/温度链路/HX 液重；插件仓只读；平板不动（装机另批）；旧桩端口别 kill；记忆数据不删。
- simpleView v7 锁稿三行网格/上下沿对齐、UI12 右锚定＋JS 均衡、AGENTS §7 UI 口径全集别回退。
- shot.grindAdvice 不覆盖、增益记忆不喂、hecShotTds 不出 APK（summary.js:4 红线）；uneven 签名语义冻结。

## 6. 回叫

统筹 01a1f8e8-499f-7513-a9cd-84b3af28bb14：本交接路径＋commit hash＋diff 摘要（summary.js 两份 6 hunk：EN/grindSec/jointVerdict/simpleView/render 传参/测试钩子）＋72/8/33/31＋待批事（发版/装机另问；R6 同步债；EY 固定带已裁）。
