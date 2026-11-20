# 交接：曲线卡片胶囊档位标签 bug 修复（统筹批，2026-11-20，给 UI11）

> 用户在改另一个 bug，本交接把统筹已改完并合并的胶囊修复完整交代，避免再次整文件回退时覆盖；若被覆盖可按 §5 一键重落。**现状：修复已合并于 3d25166（叠在你的预取回退 284be06 之上），合并态回归 72/72＋8/8 全绿，本地未推未发版，v0.36 发版链待用户批；平板仍 v0.35 坏版。**

## 0. 一句话现状

胶囊 bug 已修＋已合并＋回归全绿；你继续改别的 bug 时保留 §2 两处改动即可，发版时一并带上。插件侧零改动。

## 1. Bug 与根因

- **现象**：插件全开（full 档）时平板曲线卡片胶囊恒显「HyperEx · HEC」，用户报不对（应是插件全控）。
- **根因**：app/www/control.js renderCurveBtn 自 v0.1（a6db5e5）起只看 ext.takeover＋曲线类型，**不读 ext.mode**。takeover 是 hec 档心跳保险接管锁存（plugin.js hecTakeoverActive：仅 algorithmIntervention==='hec' && hecTakeover 才真），full 档恒 null → full 档恒落 'HyperEx · HEC'。
- **插件上报正确**（平板 REST 实证）：external-status mode:"full", takeover:null；control-mode algorithmIntervention:"full", algorithmInterventionActive:"full"。mode 取值 full/hec/off（normalizeAlgorithmIntervention，plugin.js:727）。**插件无需改。**

## 2. 改动（两处；app/www/control.js 改完同步 assets 副本）

### 2.1 renderCurveBtn（约 696–712 行）

旧：

    const taken = !!(ext && ext.takeover);
    tag.textContent = taken ? t('HyperEx · 插件接管') : hx ? 'HyperEx · HEC' : t('非 HyperEx · 只读');

新：

    const taken = !!(ext && ext.takeover);
    // 胶囊按插件实际档位 ext.mode（full/hec/off）取标签；takeover 仅 hec 档心跳保险接管锁存（full 档恒 null），旧逻辑只看 takeover 致 full 档恒显 HEC（用户 11-20 报 bug，统筹修）。
    const im = ext && ext.mode;
    tag.textContent = taken ? t('HyperEx · 插件接管')
      : hx ? (im === 'full' ? t('HyperEx · 插件全控') : im === 'hec' ? 'HyperEx · HEC' : im === 'off' ? t('HyperEx · 只读') : 'HyperEx')
      : t('非 HyperEx · 只读');

标签矩阵：full→「HyperEx · 插件全控」／hec 无接管→「HyperEx · HEC」／hec+takeover→「HyperEx · 插件接管」（原语义保留）／off→「HyperEx · 只读」／未连接 ext=null→仅「HyperEx」／非 HX→「非 HyperEx · 只读」。

**不动**：tag.className = 'curvetag' + (hx && !taken ? '' : ' plain') 与 lock.hidden = !(hx && !taken) 原样（full 档液重锁本来就正确显示）。

### 2.2 i18n 词条（约 63 行，'HyperEx · 插件接管': 'HyperEx · takeover', 之后追加）

    'HyperEx · 插件全控': 'HyperEx · plugin control', 'HyperEx · 只读': 'HyperEx · read-only',

### 2.3 同步

app/www/control.js 改完同步到 app/src/main/assets/www/control.js，两份哈希须一致（当前合并态 FF84E4B892EB9FB35251A104035A160D24D35E0A79C915B032041C4242E99BB4）。

## 3. 提交链与合并历史（注意别再覆盖）

431a65e（v0.35 回执）→ 9072b56（统筹胶囊修复首提交）→ 30e9a87（统筹杯 22 落档）→ 284be06（UI11 预取回退：git checkout 9360eac~1 整文件恢复 v0.34，**附带覆盖了 9072b56 胶囊修复**，非有意）→ **3d25166（统筹在 284be06 之上重落胶囊修复＝合并批）** → b6e6e7a（统筹合并落档）。

**给你的提醒**：再做整文件 checkout/回退时保留 §2 两处（renderCurveBtn mode 分支＋2 词条）。你的预取回退（poll 里 prefetch 调用删除、summary.js 回退）与本修复无交集，正常叠加即可；当前 HEAD 两者都在。若不慎覆盖，按 §5 重落。

## 4. 验证（合并态已全绿）

- 分支行为测试 **8/8**：node D:/vscode/HyperExController/.tools/__coord-curvetag-test.cjs（六态标签＋接管优先＋锁/样式＋EN 词条；从 control.js 抽 renderCurveBtn 进 VM 跑，非镜像）。
- summary-regress **72/72**：node D:/vscode/.tools/__summary-regress.cjs（父仓 .tools；需回环/CDP，提权）。
- boot-check **8/8**：node D:/vscode/.tools/__boot-check.cjs（提权；boot-replay 项偶发时序竞态，v0.35 HEAD 对照证实既有，复跑即绿）。
- node --check 两份 control.js。

## 5. 一键重落（若被覆盖）

node D:/vscode/.tools/__coord-curvetag-fix.js（父仓 .tools，untracked scratch；锚点＝旧 tag 行＋旧词条子串，精确替换＋自动同步 assets）→ 再跑 §4 分支测试。脚本不在时按 §2 手工改两处＋同步 assets。

## 6. 边界 / 别碰

- 插件侧不碰（上报正确）；影子/仲裁发送面、温度链路、HX 液重不碰。
- **提交前 git diff --cached --stat 核索引无别人预暂存**（统筹 eb86c62 曾误纳 UI11 暂存 5 文件，已 reset 拆分还原；共享仓务必先核索引，或用 git commit -- <本批路径> 限定）。只 add 本批文件；别人未跟踪/未提交不碰不提交不回滚。
- 新不变量「**萃取中不能干预取值**」（用户点名，活文档 §0）：杯内禁竞争性插件请求/占桥池影响 control 实时快照——你改别的 bug 时也守这条。

## 7. 待办

- v0.36 发版链待用户批（回退版＋胶囊修复；升版 36→干净基线构建→模拟器回归→push VPN 57890→Release→夸克→父仓指针→平板装机告知用户）。
- 本地未推批含 284be06/3d25166/b6e6e7a 等，push 随发版批用户批。
- 插件 UI #refilladaptive 行目视核仍待用户补（与本修复无关，顺带提醒）。
