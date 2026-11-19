// HEC 学习中心（点标题弹窗）：三个一级入口——算法学习 / 决策模型 / 仲裁模型。
// 全部只读展示：算法学习读归档（gainMemory/最近杯判定）+ 在线 calibration-status（经控制页桥）；
// 决策模型读 HxShadow 状态与杯日志；仲裁模型读 HxArbiter 参数与决策里的仲裁记录。不发送任何指令。
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const EN = {
    'UI 设置': 'UI Settings', '功能设置': 'Function Settings', '其他': 'Other', '侧栏自动隐藏': 'Auto-hide sidebar', 'HX 曲线样式 2': 'HX curves · style 2', '非 HX 曲线样式 2': 'Non-HX curves · style 2', '实时曲线宽度': 'Chart line width',
    '学习中心': 'Learning', '控制中心': 'Control center', '内容待定': 'Content coming soon', '算法学习': 'Adaptive', '决策模型': 'Policy model', '仲裁模型': 'Arbiter', '杯末总结弹窗': 'Shot summary popup', '显示颗粒度': 'Display granularity', '简单': 'Simple', '标准': 'Standard', '完整': 'Full',
    '插件杯间学习成果': 'plugin shot-to-shot learning', '影子推理 bc_v0': 'shadow inference bc_v0', '规则仲裁 v0': 'rule arbitration v0',
    '下一杯指令': 'Next-shot commands', '增益记忆': 'Gain memory', '最近一杯判定': 'Last-shot verdict', '历史概览': 'History overview',
    '阶段': 'Stage', '目标 g/s': 'Target g/s', 'LUT 基础': 'LUT base', '学习后': 'Adapted', '来源': 'Origin',
    '自动应用': 'Auto apply', '已应用': 'applied', '已排除': 'excluded', '待应用': 'scheduled', '未启用': 'disabled',
    '桶中心 p/q': 'Bucket p/q', '样本': 'samples', '增益 r': 'Gain r', '漂移': 'Drift', '阻尼': 'damped', '指令档': 'Cmd band',
    '误差': 'Error', '状态': 'Status', '研磨建议': 'Grind advice', '学习完整性': 'Learning integrity', '合格': 'eligible', '不合格': 'not eligible',
    '已存杯数': 'Saved shots', '兼容杯数': 'Compatible', '基线参考': 'Baseline refs', '排除': 'excluded', '证据': 'evidence',
    '模型状态': 'Model state', '加载中': 'loading', '就绪': 'ready', '未加载': 'idle', '加载失败': 'load failed',
    '学习仲裁': 'Learned arbiter', '棵': 'trees', '阈值': 'threshold',
    '本杯决策': 'Current-cup decisions', '已归档杯': 'Archived cups', '插件写入': 'Plugin writes', '模型倾向写入': 'Model-leaning writes',
    '决策点': 'Decision points', '写入概率': 'Write prob', '档位': 'Quanta', '候选': 'Candidate', '动作': 'Action',
    '保持': 'hold', '写入': 'write', '算法': 'algo', '模型': 'model', '理由': 'Reason', '裁剪': 'clipped',
    '仲裁倾向': 'Preference', '分歧门': 'Divergence gate', '软预算': 'Soft cap', '硬边界': 'Hard bounds',
    '倾向算法': 'lean algo', '倾向模型': 'lean model', '均衡': 'balanced',
    '在线': 'live', '离线归档': 'offline archive', '未连接': 'offline', '读取中…': 'loading…',
    '暂无数据': 'No data yet', '跑一杯 HyperEx 后这里会有学习判定与增益记忆。': 'Run a HyperEx shot to populate learning verdicts and gain memory.',
    '模型未加载': 'Model not loaded', '影子模块随控制页连上插件后加载；这里展示它的推理记录。': 'The shadow module loads once the control page connects; its inference log is shown here.',
    '暂无决策记录': 'No decisions recorded', '萃取中 S2/S3 才会产生决策点（只记录、不发送）。': 'Decision points are recorded during S2/S3 extraction (log only, never sent).',
    '只读展示 · 不发送指令': 'Read-only · no commands sent', '关闭': 'Close',
    '阶段目标与实测': 'Stage target vs measured', '下一杯建议': 'Next-shot advice', '置信度': 'Confidence',
    'S2 补水': 'S2 refill', 'S3 形状': 'S3 shape', '早段': 'early', '中段': 'mid', '晚段': 'late',
    '杯': 'shots', '决策': 'decisions', '写入': 'writes', '无': 'none',
  };
  function t(k) { try { return (typeof lang !== 'undefined' && lang === 'en' && EN[k]) ? EN[k] : (window.t ? window.t(k) : k); } catch (_) { return k; } }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function f1(v) { return Number.isFinite(Number(v)) ? Number(v).toFixed(1) : '—'; }
  function f2(v) { return Number.isFinite(Number(v)) ? Number(v).toFixed(2) : '—'; }
  function f3(v) { return Number.isFinite(Number(v)) ? Number(v).toFixed(3) : '—'; }
  function pct(v) { return Number.isFinite(Number(v)) ? (v > 0 ? '+' : '') + Number(v).toFixed(1) + '%' : '—'; }
  function pill(txt, cls) { return '<span class="lrn-pill ' + cls + '">' + esc(txt) + '</span>'; }
  function when(iso) { const d = new Date(iso); return Number.isFinite(d.getTime()) ? (d.getMonth() + 1) + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '—'; }

  let tab = 'learn';
  let section = 'learn';   // 一级标签：control | learn（文件夹）
  let liveCal = null, liveState = 'idle';   // idle | loading | ok | err
  let open = false;

  // ---- 数据源 ----
  function latestShot() {
    if (typeof archive === 'undefined' || !archive || !archive.shots) return null;
    let best = null;
    for (const s of archive.shots) {
      if (!s || s.source === 'hec') continue;   // 直写杯没有学习判定，取插件杯
      if (!best || String(s.startedAt || '') > String(best.startedAt || '')) best = s;
    }
    return best;
  }
  function gainMemory() { return (typeof archive !== 'undefined' && archive && archive.gainMemory) || null; }
  // 归档杯的 commands 是 {stage1:{desiredGS,lutCommandMlS,commandMlS,origin,shape}} 形状，
  // 归一成在线 calibration-status 的 commandFlows 扁平形状，展示逻辑共用一份。
  function shotCommandFlows(shot) {
    if (!shot) return null;
    if (shot.nextShotApplied && shot.nextShotApplied.commandFlows) return shot.nextShotApplied.commandFlows;
    let c = shot.commands;
    if (typeof c === 'string') { try { c = JSON.parse(c); } catch (_) { return null; } }
    if (!c || !c.stage1) return null;
    const flat = {};
    for (const [i, name] of [[1, 'stage1'], [2, 'stage2'], [3, 'stage3']]) {
      const s = c[name] || {};
      flat[name + 'DesiredGS'] = s.desiredGS;
      flat[name + 'LutCommandMlS'] = s.lutCommandMlS;
      flat[name + 'CommandMlS'] = s.commandMlS != null ? s.commandMlS : (s.shape ? s.shape.midCommand : null);
      flat[name + 'Mode'] = s.mode;
      flat[name + 'Origin'] = s.origin;
    }
    if (c.stage3 && c.stage3.shape) flat.s3Shape = c.stage3.shape;
    return flat;
  }

  async function fetchLive() {
    if (!window.HxControl || !window.HxControl.httpJson) { liveState = 'err'; return; }
    liveState = 'loading';
    const r = await window.HxControl.httpJson('GET', '/api/v1/plugins/decenthyperexplugin.reaplugin/calibration-status');
    if (r && r.ok && r.body) { liveCal = r.body; liveState = 'ok'; } else { liveState = 'err'; }
    if (open && section === 'learn') renderBody();
  }

  // ---- 算法学习页 ----
  function renderLearn() {
    const shot = latestShot();
    const gm = gainMemory();
    const cf = (liveCal && liveCal.commandFlows) || shotCommandFlows(shot);
    const auto = liveCal ? liveCal.autoApplyLastStatus : (shot && shot.nextShotApplied ? { status: 'applied', at: shot.nextShotApplied.at, runId: shot.runId } : null);
    let html = '';
    // 下一杯指令
    html += '<div class="lrn-sec"><h4>' + t('下一杯指令') + '</h4>';
    if (cf) {
      const rows = [['S1', cf.stage1DesiredGS, cf.stage1LutCommandMlS, cf.stage1CommandMlS, cf.stage1Origin],
        ['S2', cf.stage2DesiredGS, cf.stage2LutCommandMlS, cf.stage2CommandMlS, cf.stage2Origin],
        ['S3', cf.stage3DesiredGS, cf.stage3LutCommandMlS != null ? cf.stage3LutCommandMlS : cf.stage3FlatCommandMlS, cf.stage3CommandMlS, cf.stage3Origin]];
      html += '<table class="lrn-table"><tr><th>' + t('阶段') + '</th><th>' + t('目标 g/s') + '</th><th>' + t('LUT 基础') + '</th><th>' + t('学习后') + '</th><th>' + t('来源') + '</th></tr>';
      for (const [name, tgt, lut, cmd, origin] of rows) {
        const adapted = Number.isFinite(Number(lut)) && Number.isFinite(Number(cmd)) && Math.abs(cmd - lut) > 1e-6;
        html += '<tr><td>' + name + '</td><td>' + f1(tgt) + '</td><td>' + f3(lut) + '</td><td>' + (adapted ? '<b style="color:#f5c078">' + f3(cmd) + '</b>' : f3(cmd)) + '</td><td>' + (origin ? pill(origin, origin === 'adaptive' ? 'warn' : 'mute') : '—') + '</td></tr>';
      }
      html += '</table>';
      if (cf.s3Shape && cf.s3Shape.enabled) {
        const sh = cf.s3Shape;
        html += '<div class="lrn-note">' + t('S3 形状') + '：' + t('早段') + ' ' + f3(sh.earlyCommand) + ' ml/s × ' + f1(sh.earlySeconds) + 's · ' + t('中段') + ' ' + f3(sh.midCommand) + ' × ' + f1(sh.midSeconds) + 's · ' + t('晚段') + ' ' + f3(sh.lateCommand) + ' ml/s' + (sh.model ? ' · ' + esc(sh.model) : '') + '</div>';
      }
      if (auto) {
        const cls = auto.status === 'applied' ? 'ok' : auto.status === 'excluded' ? 'bad' : 'warn';
        const lb = auto.status === 'applied' ? t('已应用') : auto.status === 'excluded' ? t('已排除') : auto.status === 'scheduled' ? t('待应用') : auto.status;
        html += '<div class="lrn-note">' + t('自动应用') + '：' + pill(lb, cls) + ' ' + esc(auto.message || '') + (auto.at ? ' · ' + when(auto.at) : '') + '</div>';
      }
    } else html += '<div class="lrn-empty">' + t('暂无数据') + '</div>';
    html += '</div>';
    // 增益记忆
    html += '<div class="lrn-sec"><h4>' + t('增益记忆') + '</h4>';
    if (gm && Array.isArray(gm.buckets) && gm.buckets.length) {
      html += '<table class="lrn-table"><tr><th>' + t('桶中心 p/q') + '</th><th>' + t('阶段') + '</th><th>' + t('增益 r') + '</th><th>n</th><th>' + t('漂移') + '</th><th>' + t('指令档') + '</th><th>' + t('状态') + '</th></tr>';
      for (const b of gm.buckets) {
        for (const st of ['s2', 's3']) {
          const g = b.stages && b.stages[st];
          if (!g) continue;
          html += '<tr><td>' + f3(b.center) + ' ±' + f2(b.radius) + '</td><td>' + st.toUpperCase() + '</td><td><b>' + f3(g.r) + '</b></td><td>' + (g.n != null ? g.n : '—') + '</td><td>' + (g.drift != null ? '×' + f2(g.drift) : '—') + '</td><td>' + esc(g.commandBand || '—') + '</td><td>' + (g.damped ? pill(t('阻尼'), 'warn') : pill('OK', 'ok')) + '</td></tr>';
        }
      }
      html += '</table>';
      if (gm.updatedAt) html += '<div class="lrn-note">' + t('更新') + ' ' + when(gm.updatedAt) + '</div>';
    } else html += '<div class="lrn-empty">' + t('暂无数据') + ' · ' + t('跑一杯 HyperEx 后这里会有学习判定与增益记忆。') + '</div>';
    html += '</div>';
    // 最近一杯判定
    html += '<div class="lrn-sec"><h4>' + t('最近一杯判定') + (shot ? ' · ' + when(shot.startedAt) : '') + '</h4>';
    if (shot) {
      html += '<table class="lrn-table"><tr><th>' + t('阶段') + '</th><th>' + t('目标 g/s') + '</th><th>RAW</th><th>R²</th><th>' + t('误差') + '</th><th>' + t('状态') + '</th></tr>';
      for (const [name, key] of [['S1', 's1'], ['S2', 's2'], ['S3', 's3']]) {
        const s = shot[key];
        if (!s) { html += '<tr><td>' + name + '</td><td colspan="5">—</td></tr>'; continue; }
        const err = Number(s.errorPct);
        const cls = !Number.isFinite(err) ? 'mute' : Math.abs(err) <= 5 ? 'ok' : Math.abs(err) <= 15 ? 'warn' : 'bad';
        html += '<tr><td>' + name + '</td><td>' + f1(s.targetGS) + '</td><td>' + f2(s.rawRegressionGS) + '</td><td>' + f2(s.rawRegressionR2) + '</td><td>' + pill(pct(s.errorPct), cls) + '</td><td>' + esc(s.status || '—') + '</td></tr>';
      }
      html += '</table>';
      const ga = shot.grindAdvice;
      if (ga && ga.available) {
        html += '<div class="lrn-note">' + t('研磨建议') + '：' + pill(ga.direction || ga.status, ga.direction === 'hold' ? 'info' : 'warn') + ' ' + esc(ga.label || '') + ' · ' + t('置信度') + ' ' + esc(ga.confidence || '—') + '</div>';
      }
      const li = shot.learningIntegrity;
      if (li) html += '<div class="lrn-note">' + t('学习完整性') + '：' + pill(li.eligible ? t('合格') : t('不合格'), li.eligible ? 'ok' : 'bad') + ' ' + esc(li.status || '') + (li.reasons && li.reasons.length ? ' · ' + esc(li.reasons.join(', ')) : '') + '</div>';
      if (shot.learningReview && shot.learningReview.excluded) html += '<div class="lrn-note">' + t('排除') + '：' + pill(shot.learningReview.reason || 'excluded', 'bad') + '</div>';
    } else html += '<div class="lrn-empty">' + t('暂无数据') + '</div>';
    html += '</div>';
    // 历史概览
    html += '<div class="lrn-sec"><h4>' + t('历史概览') + '</h4>';
    const ph = liveCal && liveCal.persistentHistory;
    const shots = (typeof archive !== 'undefined' && archive && archive.shots) || [];
    const pluginShots = shots.filter((s) => s && s.source !== 'hec');
    if (ph || pluginShots.length) {
      html += '<div class="lrn-grid">';
      html += '<div class="lrn-card"><div class="k">' + t('已存杯数') + '</div><div class="v">' + (ph ? ph.savedShots : pluginShots.length) + '</div><div class="s">' + (ph ? 'max ' + ph.maxShots : t('离线归档')) + '</div></div>';
      if (ph) {
        html += '<div class="lrn-card"><div class="k">' + t('兼容杯数') + '</div><div class="v good">' + ph.compatibleShots + '</div><div class="s">' + t('基线参考') + ' ' + ph.baselineReferenceShots + '</div></div>';
        html += '<div class="lrn-card"><div class="k">' + t('状态') + '</div><div class="v" style="font-size:13px">' + (ph.available ? pill('PERSISTENT', 'ok') : pill('SESSION', 'warn')) + '</div><div class="s">' + esc(ph.status || '') + '</div></div>';
      }
      html += '</div>';
      const recent = pluginShots.slice().sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || ''))).slice(0, 8);
      if (recent.length) {
        html += '<table class="lrn-table" style="margin-top:8px"><tr><th>' + t('时刻') + '</th><th>' + t('状态') + '</th><th>' + t('证据') + ' S1/S2/S3</th><th>' + t('排除') + '</th></tr>';
        for (const s of recent) {
          const li = s.learningIntegrity || {};
          const ev = s.evidence ? ['s1', 's2', 's3'].map((k) => s.evidence[k] ? '●' : '○').join('') : '—';
          html += '<tr><td>' + when(s.startedAt) + '</td><td>' + pill(li.eligible ? t('合格') : t('不合格'), li.eligible ? 'ok' : 'bad') + '</td><td>' + ev + '</td><td>' + (s.learningReview && s.learningReview.excluded ? pill(t('排除'), 'bad') : '—') + '</td></tr>';
        }
        html += '</table>';
      }
    } else html += '<div class="lrn-empty">' + t('暂无数据') + '</div>';
    html += '</div>';
    return html;
  }

  // ---- 决策模型页 ----
  function renderModel() {
    const st = window.HxShadow ? window.HxShadow.status() : null;
    let html = '';
    html += '<div class="lrn-sec"><h4>' + t('模型状态') + '</h4><div class="lrn-grid">';
    const stateCls = !st ? 'bad' : st.loadState === 'ready' ? 'ok' : st.loadState === 'loading' ? 'warn' : st.loadState === 'error' ? 'bad' : 'mute';
    const stateLb = !st ? t('无') : st.loadState === 'ready' ? t('就绪') : st.loadState === 'loading' ? t('加载中') : st.loadState === 'error' ? t('加载失败') : t('未加载');
    html += '<div class="lrn-card"><div class="k">bc_v0 · ONNX</div><div class="v" style="font-size:14px">' + pill(stateLb, stateCls) + '</div><div class="s">' + (st && st.loadError ? esc(st.loadError) : '13 ' + t('维特征') + ' · write_prob + quanta') + '</div></div>';
    if (st && st.cup) {
      html += '<div class="lrn-card"><div class="k">' + t('本杯决策') + '</div><div class="v">' + st.cup.decisions + '</div><div class="s">' + t('插件写入') + ' ' + st.cup.writes + '</div></div>';
    }
    html += '<div class="lrn-card"><div class="k">' + t('已归档杯') + '</div><div class="v" id="lrnArchN">…</div><div class="s" id="lrnArchS">hecShadowCups · max 40</div></div>';
    html += '</div>';
    if (!st || st.loadState !== 'ready') html += '<div class="lrn-note">' + t('影子模块随控制页连上插件后加载；这里展示它的推理记录。') + '</div>';
    html += '</div>';
    // 决策记录（从 IndexedDB 异步读，先占位）
    html += '<div class="lrn-sec"><h4>' + t('决策点') + '</h4><div id="lrnDecList"><div class="lrn-empty">' + t('读取中…') + '</div></div></div>';
    return html;
  }
  async function fillDecisions() {
    const box = $('lrnDecList');
    if (!box) return;
    let cups = [];
    try { cups = (await dbGet('hecShadowCups')) || []; } catch (_) {}
    const live = window.HxShadow && window.HxShadow._debug ? window.HxShadow._debug().cup : null;
    const all = cups.slice();
    if (!all.length && !live) { box.innerHTML = '<div class="lrn-empty">' + t('暂无决策记录') + ' · ' + t('萃取中 S2/S3 才会产生决策点（只记录、不发送）。') + '</div>'; return; }
    // m16：只读最近杯（在跑杯优先，否则 lastRunId 单杯读），不全量 exportJSON。
    let decs = [], writes = [], label = '';
    try {
      const c = window.HxShadow && window.HxShadow.latestCup ? await window.HxShadow.latestCup() : all[all.length - 1];
      if (c) { decs = c.decisions || []; writes = c.writes || []; label = c.runId; }
    } catch (_) {}
    if (!decs.length) { box.innerHTML = '<div class="lrn-empty">' + t('暂无决策记录') + '</div>'; return; }
    const last = decs.slice(-30).reverse();
    let html = '<div class="lrn-note" style="margin:0 0 6px">' + esc(label) + ' · ' + decs.length + ' ' + t('决策') + ' · ' + writes.length + ' ' + t('插件写入') + '</div>';
    html += '<div class="lrn-dec" style="color:#8b93a1;font-weight:600"><span class="t">' + t('时刻') + '</span><span class="ph">' + t('阶段') + '</span><span class="prob">P(' + t('写入') + ')</span><span class="cmd">' + t('档位') + ' → ' + t('候选') + '</span><span style="flex:none;width:52px;text-align:right">' + t('动作') + '</span></div>';
    for (const d of last) {
      const act = d.action === 'write' ? pill(t('写入'), 'warn') : pill(t('保持'), 'mute');
      html += '<div class="lrn-dec"><span class="t">' + (d.tMs / 1000).toFixed(1) + 's</span><span class="ph">' + esc((d.phase || '').replace('stage', 'S')) + '</span><span class="prob">' + f2(d.writeProb) + '</span><span class="cmd">' + (d.quanta > 0 ? '+' : '') + d.quanta + ' → ' + (d.candidateMlS != null ? f3(d.candidateMlS) : '—') + '</span><span style="flex:none;width:52px;text-align:right">' + act + '</span></div>';
    }
    box.innerHTML = html;
  }

  // ---- 仲裁模型页 ----
  function renderArbiter() {
    const pref = window.HxShadow && window.HxShadow.getPreference ? window.HxShadow.getPreference() : 0.35;
    const A = window.HxArbiter;
    let html = '';
    html += '<div class="lrn-sec"><h4>' + t('仲裁倾向') + '</h4>';
    const lean = pref < 0.45 ? t('倾向算法') : pref > 0.55 ? t('倾向模型') : t('均衡');
    html += '<div class="lrn-row"><span class="lbl">' + t('算法') + '</span><div class="lrn-bar"><i id="lrnBarAlgo" style="width:' + Math.round((1 - pref) * 100) + '%;background:#6ea8fe"></i></div><span class="val" id="lrnValAlgo">' + Math.round((1 - pref) * 100) + '%</span></div>';
    html += '<div class="lrn-row"><span class="lbl">' + t('模型') + '</span><div class="lrn-bar"><i id="lrnBarModel" style="width:' + Math.round(pref * 100) + '%;background:#f5c078"></i></div><span class="val" id="lrnValModel">' + Math.round(pref * 100) + '%</span></div>';
    html += '<input type="range" class="lrn-slider" id="lrnPref" min="0" max="100" value="' + Math.round(pref * 100) + '">';
    // i12：学习仲裁启用时显学习参数（阈值/树数），未就绪显规则 v0 参数。
    const learned = A && A.learnedReady && A.learnedReady();
    const lst = learned && A.learnedStatus ? A.learnedStatus() : null;
    html += '<div class="lrn-note"><span id="lrnLean">' + lean + '</span> · ' + (learned
      ? t('学习仲裁') + ' · LightGBM ' + (lst ? lst.trees : 300) + ' ' + t('棵') + ' · ' + t('阈值') + ' ' + (lst && lst.threshold != null ? lst.threshold : 0.5) + '（P(model_better)≥阈值）'
      : t('软预算') + ' 12 ' + t('写入') + '/杯 · ' + t('分歧门') + ' 0.5 ml/s') + ' · ' + t('硬边界') + ' ' + (A ? A.CMD_LO : 0.1) + '–' + (A ? A.CMD_HI : 8) + ' ml/s（1/16 量化）</div>';
    html += '</div>';
    html += '<div class="lrn-sec"><h4>' + t('决策点') + ' · ' + t('仲裁') + '</h4><div id="lrnArbList"><div class="lrn-empty">' + t('读取中…') + '</div></div></div>';
    return html;
  }
  async function fillArbiter() {
    const box = $('lrnArbList');
    if (!box) return;
    let cups = [];
    try { cups = (await dbGet('hecShadowCups')) || []; } catch (_) {}
    // m16：只读最近杯，不全量 exportJSON。
    let decs = [], label = '';
    try {
      const c = window.HxShadow && window.HxShadow.latestCup ? await window.HxShadow.latestCup() : cups[cups.length - 1];
      if (c) { decs = (c.decisions || []).filter((d) => d.arbiter); label = c.runId; }
    } catch (_) {}
    if (!decs.length) { box.innerHTML = '<div class="lrn-empty">' + t('暂无决策记录') + ' · ' + t('萃取中 S2/S3 才会产生决策点（只记录、不发送）。') + '</div>'; return; }
    // 统计
    const counts = { algo: 0, model: 0, hold: 0 };
    for (const d of decs) counts[d.arbiter.pick] = (counts[d.arbiter.pick] || 0) + 1;
    let html = '<div class="lrn-grid" style="margin-bottom:8px">';
    html += '<div class="lrn-card"><div class="k">' + t('算法') + '</div><div class="v" style="color:#6ea8fe">' + counts.algo + '</div></div>';
    html += '<div class="lrn-card"><div class="k">' + t('模型') + '</div><div class="v" style="color:#f5c078">' + counts.model + '</div></div>';
    html += '<div class="lrn-card"><div class="k">' + t('保持') + '</div><div class="v">' + counts.hold + '</div></div>';
    html += '</div>';
    const last = decs.slice(-25).reverse();
    html += '<div class="lrn-dec" style="color:#8b93a1;font-weight:600"><span class="t">' + t('时刻') + '</span><span class="ph">' + t('阶段') + '</span><span style="flex:none;width:56px">' + t('动作') + '</span><span class="cmd">' + t('理由') + '</span><span style="flex:none;width:64px;text-align:right">ml/s</span></div>';
    for (const d of last) {
      const a = d.arbiter;
      const cls = a.pick === 'algo' ? 'info' : a.pick === 'model' ? 'warn' : 'mute';
      const lb = a.pick === 'algo' ? t('算法') : a.pick === 'model' ? t('模型') : t('保持');
      html += '<div class="lrn-dec"><span class="t">' + (d.tMs / 1000).toFixed(1) + 's</span><span class="ph">' + esc((d.phase || '').replace('stage', 'S')) + '</span><span style="flex:none;width:56px">' + pill(lb, cls) + '</span><span class="cmd" style="text-align:left">' + esc(a.reason) + (a.clipped ? ' · ' + t('裁剪') : '') + '</span><span style="flex:none;width:64px;text-align:right">' + (a.commandMlS != null ? f3(a.commandMlS) : '—') + '</span></div>';
    }
    box.innerHTML = html;
  }

  // ---- 弹窗骨架 ----
  function renderBody() {
    const body = $('lrnBody');
    if (!body) return;
    if (tab === 'learn') body.innerHTML = renderLearn();
    else if (tab === 'model') { body.innerHTML = renderModel(); fillDecisions(); fillArchCount(); }
    else { body.innerHTML = renderArbiter(); fillArbiter(); wirePref(); }
  }
  function renderSection() {
    document.querySelectorAll('.ftab').forEach((el) => el.classList.toggle('sel', el.dataset.sec === section));
    const tabs = $('lrnTabs'), foot = $('lrnFoot'), body = $('lrnBody');
    if (section === 'control') {
      if (tabs) tabs.hidden = true;
      if (foot) foot.hidden = true;
      body.innerHTML = '<div class="lrn-sec"><h4>' + t('UI 设置') + '</h4>' +
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:18px;margin:2px 0 0 2px">' +
        '<label class="rawtoggle"><input type="checkbox" id="sideAutoHide"><span class="sw"></span>' + t('侧栏自动隐藏') + '</label>' +
        '<label class="rawtoggle"><input type="checkbox" id="chartStyle2Hx"><span class="sw"></span>' + t('HX 曲线样式 2') + '</label>' +
        '<label class="rawtoggle"><input type="checkbox" id="chartStyle2Non"><span class="sw"></span>' + t('非 HX 曲线样式 2') + '</label>' +
        '<label class="widthctl"><span>' + t('实时曲线宽度') + '</span><input type="range" id="curveWidth" min="0" max="4" step="1"><b id="curveWidthV">1×</b></label>' +
        '</div></div>' +
        '<div class="lrn-sec"><h4>' + t('功能设置') + '</h4>' +
        '<div class="setrow">' +
        '<label class="rawtoggle"><input type="checkbox" id="shotSummaryOn"><span class="sw"></span>' + t('杯末总结弹窗') + '</label>' +
        '<label class="widthctl"><span>' + t('显示颗粒度') + '</span><input type="range" id="shotSummaryLevel" min="0" max="2" step="1"><b id="shotSummaryLevelV">' + t('标准') + '</b></label>' +
        '</div></div>' +
        '<div class="lrn-sec"><h4>' + t('其他') + '</h4></div>';
      dbGet('hecSideAutoHide').then((v) => { const el = $('sideAutoHide'); if (el) el.checked = v !== 0; }).catch(() => {});
      $('sideAutoHide').addEventListener('change', function () {
        const v = this.checked;
        try { dbSet('hecSideAutoHide', v ? 1 : 0); } catch (_) {}
        if (window.HxControl && window.HxControl.setSideAutoHide) window.HxControl.setSideAutoHide(v);
      });
      const gs = (window.HxControl && window.HxControl.getChartStyles) ? window.HxControl.getChartStyles() : { hx: 1, non: 1 };
      const eH = $('chartStyle2Hx'), eN = $('chartStyle2Non'); if (eH) eH.checked = gs.hx === 2; if (eN) eN.checked = gs.non === 2;
      const W_LB = ['0.5×', '0.7×', '1×', '1.4×', '2×'];
      dbGet('hecCurveWidth').then((v) => {
        const i = Number.isInteger(v) && v >= 0 && v <= 4 ? v : 2;
        const el = $('curveWidth'); if (el) el.value = i;
        const lb = $('curveWidthV'); if (lb) lb.textContent = W_LB[i];
      }).catch(() => {});
      $('curveWidth').addEventListener('input', function () {
        const i = Number(this.value);
        const lb = $('curveWidthV'); if (lb) lb.textContent = W_LB[i];
        try { dbSet('hecCurveWidth', i); } catch (_) {}
        if (window.HxControl && window.HxControl.setCurveWidth) window.HxControl.setCurveWidth(i);
      });
      $('chartStyle2Hx').addEventListener('change', function () {
        if (window.HxControl && window.HxControl.setChartStyleFor) window.HxControl.setChartStyleFor('hx', this.checked ? 2 : 1);
      });
      $('chartStyle2Non').addEventListener('change', function () {
        if (window.HxControl && window.HxControl.setChartStyleFor) window.HxControl.setChartStyleFor('non', this.checked ? 2 : 1);
      });
      const L_LB = ['简单', '标准', '完整'];
      dbGet('hecShotSummary').then((v) => { const el = $('shotSummaryOn'); if (el) el.checked = v !== 0; }).catch(() => {});
      $('shotSummaryOn').addEventListener('change', function () {
        const v = this.checked;
        try { dbSet('hecShotSummary', v ? 1 : 0); } catch (_) {}
        if (window.HxSummary && window.HxSummary.setEnabled) window.HxSummary.setEnabled(v);
      });
      dbGet('hecShotSummaryLevel').then((v) => {
        const i = Number.isInteger(v) && v >= 0 && v <= 2 ? v : 1;
        const el = $('shotSummaryLevel'); if (el) el.value = i;
        const lb = $('shotSummaryLevelV'); if (lb) lb.textContent = t(L_LB[i]);
      }).catch(() => {});
      $('shotSummaryLevel').addEventListener('input', function () {
        const i = Number(this.value);
        const lb = $('shotSummaryLevelV'); if (lb) lb.textContent = t(L_LB[i]);
        try { dbSet('hecShotSummaryLevel', i); } catch (_) {}
        if (window.HxSummary && window.HxSummary.setLevel) window.HxSummary.setLevel(i);
      });
    } else {
      if (tabs) tabs.hidden = false;
      if (foot) foot.hidden = false;
      renderTabs(); renderBody();
    }
  }
  function wirePref() {
    const sl = $('lrnPref');
    if (!sl) return;
    let deb = 0;
    sl.addEventListener('input', () => {
      const p = Number(sl.value) / 100;
      if (window.HxShadow && window.HxShadow.setPreference) window.HxShadow.setPreference(p);
      updatePrefDisplay(p); // m16：局部刷新（bar/百分比/倾向文案），不重建整页，滑杆不失焦
      clearTimeout(deb);
      deb = setTimeout(() => { if (open && tab === 'arbiter') fillArbiter(); }, 150); // m16：防抖 150ms 再重读决策
    });
  }
  function updatePrefDisplay(p) {
    const ba = $('lrnBarAlgo'), bm = $('lrnBarModel'), va = $('lrnValAlgo'), vm = $('lrnValModel'), ln = $('lrnLean');
    if (ba) ba.style.width = Math.round((1 - p) * 100) + '%';
    if (bm) bm.style.width = Math.round(p * 100) + '%';
    if (va) va.textContent = Math.round((1 - p) * 100) + '%';
    if (vm) vm.textContent = Math.round(p * 100) + '%';
    if (ln) ln.textContent = p < 0.45 ? t('倾向算法') : p > 0.55 ? t('倾向模型') : t('均衡');
  }
  // i11：已归档杯读 IDB 真实计数（per-cup 键数），内存结算数降为副标注（§6.15 语义）。
  async function fillArchCount() {
    const el = $('lrnArchN'), sub = $('lrnArchS');
    if (!el) return;
    let n = null;
    try { if (window.dbCupKeys) n = (await window.dbCupKeys()).length; } catch (_) {}
    const st = window.HxShadow ? window.HxShadow.status() : null;
    if (n != null) { el.textContent = n; if (sub) sub.textContent = 'per-cup 存储 · max 40 · 内存结算 ' + (st ? st.archived : 0); }
    else { el.textContent = st ? st.archived : 0; if (sub) sub.textContent = '内存结算数（无 per-cup 存储）'; }
  }
  function renderTabs() {
    document.querySelectorAll('.lrn-tab').forEach((el) => el.classList.toggle('sel', el.dataset.tab === tab));
  }
  function openModal() {
    open = true;
    const dim = $('lrnDim');
    dim.innerHTML = '<div class="modal lrn-modal">' +
      '<div class="lrn-top"><div class="ftabs">' +
      '<button type="button" class="ftab" data-sec="learn">' + t('学习中心') + '</button>' +
      '<button type="button" class="ftab" data-sec="control">' + t('控制中心') + '</button>' +
      '</div><button class="lrn-x" id="lrnClose">✕</button></div>' +
      '<div class="lrn-tabs" id="lrnTabs">' +
      '<button class="lrn-tab" data-tab="learn">' + t('算法学习') + '<span class="sub">' + t('插件杯间学习成果') + '</span></button>' +
      '<button class="lrn-tab" data-tab="model">' + t('决策模型') + '<span class="sub">' + t('影子推理 bc_v0') + '</span></button>' +
      '<button class="lrn-tab" data-tab="arbiter">' + t('仲裁模型') + '<span class="sub">' + (window.HxArbiter && window.HxArbiter.learnedReady && window.HxArbiter.learnedReady() ? t('学习仲裁') + ' · LightGBM' : t('规则仲裁 v0')) + '</span></button>' +
      '</div>' +
      '<div class="lrn-body" id="lrnBody"></div>' +
      '<div class="modal-foot" id="lrnFoot" style="padding:0 16px 12px;margin:0">' + t('只读展示 · 不发送指令') + '</div>' +
      '</div>';
    dim.hidden = false;
    $('lrnClose').addEventListener('click', closeModal);
    dim.addEventListener('click', (e) => { if (e.target === dim) closeModal(); });
    document.querySelectorAll('.lrn-tab').forEach((el) => el.addEventListener('click', () => { tab = el.dataset.tab; renderTabs(); renderBody(); }));
    document.querySelectorAll('.ftab').forEach((el) => el.addEventListener('click', () => { section = el.dataset.sec; renderSection(); }));
    renderSection();
    fetchLive();
  }
  function closeModal() { open = false; $('lrnDim').hidden = true; $('lrnDim').innerHTML = ''; }

  function init() {
    const h1 = $('appTitle');
    if (h1) h1.addEventListener('click', openModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) closeModal(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.HxLearn = {
    open: openModal,
    onLang: function () { if (open) renderSection(); },
    _state: function () { return { open, tab, liveState, hasLive: !!liveCal }; },
  };
})();

