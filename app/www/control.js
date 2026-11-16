// HyperExController 控制页（HEC）。回放页 = ProfileReplayer v1.6 原页，不动。
// 协议：docs/HEC_PROTOCOL_FOR_APK.md（2.2.48）。单一写者：指令只经 external-flow，
// 插件代写 A010；APK 不碰 BLE / raw ws。插件端点无 CORS → HxBridge.httpJson 原生桥；
// 两路官方 WS（machine/scale snapshot）WebView 直连（平板实测可行）。
// 控制律（APK 算指令的算法）按技能 §22 口径另议，本版只落 UI 与链路：
// 萃取中显示实时曲线/趋势角/接管态，external-flow 通道就绪但不自动发指令。
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const PLUGIN_ID = 'decenthyperexplugin.reaplugin';
  const RECORDER_ID = 'profilerecorder.reaplugin';
  const MIN_PLUGIN = [2, 2, 48];
  const TARE_RESET_THRESHOLD_G = 2.0;
  // 温度纵轴自适应量程：按本杯实测 min/max ±15% 边距（≥1°C）向外取整，最小跨度 6°C，
  // 目标温度纳入量程；无数据回退 88–96。每次重绘按当前样本重算（只随数据增长而扩，不缩）。
  function tempRange(samples, target) {
    const vals = [];
    for (const s of samples) if (s && s.temp != null && Number.isFinite(s.temp)) vals.push(s.temp);
    if (target != null && Number.isFinite(target)) vals.push(target);
    if (!vals.length) return { lo: 88, hi: 96 };
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    const pad = Math.max(1, (hi - lo) * 0.15);
    lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad);
    if (hi - lo < 6) { const c = (hi + lo) / 2; lo = Math.floor(c - 3); hi = Math.ceil(c + 3); }
    return { lo, hi };
  }
  const C = { raw: '#63d89b', decaid: '#c77dff', target: '#f0c75e', cmd: '#e8833a', press: '#63d89b', mflow: '#6ea8fe', temp: '#f2a0aa', vec: '#8fd7ff', vecdn: '#e9c276', grid: '#232830', axis: '#7d8592' };
  const PHASE_LABEL = { stage1: 'S1', stage2: 'S2', stage3: 'S3', dumping: '泄压', soak: '浸泡', restart_wait: '等 GHC', finishing: '收尾', idle: 'IDLE', aborted: '中止' };
  const PHASE_PILL = { stage1: ['#20304d', '#9cc0ff'], stage2: ['#3d2c17', '#f5c078'], stage3: ['#173a2a', '#8fe0b0'], dumping: ['#3d1d22', '#f2a0aa'], soak: ['#322040', '#d5a8f5'], idle: ['#2a2f37', '#cfd5de'] };
  const STAGE_BAND = { stage1: 'rgba(110,168,254,.10)', dumping: 'rgba(242,144,154,.08)', soak: 'rgba(199,125,255,.08)', stage2: 'rgba(245,164,66,.10)', stage3: 'rgba(99,216,155,.10)' };

  // ---- 中英文（控制页自己的键；回放页键在 app.js 的 EN）----
  const EN = {
    '控制': 'Control', '回放': 'Replay', '选曲线 · 调温重量 · 实时调流': 'curve · temp/weight · live trim', 'ProfileReplayer 原页': 'ProfileReplayer page',
    '曲线选择': 'Curve select', '萃取温度': 'Brew temp', '萃取液重': 'Beverage weight', '应用': 'Apply',
    'Decaid 地址': 'Decaid address', '本杯锁定': 'shot locked', '插件': 'Plugin', '逻辑帧': 'Frame',
    '基值/当前': 'Base/now', '目标杯流': 'Target', '限压': 'Limiter', '接管原因': 'Reason', '接管时刻': 'At', '当前指令': 'Command',
    '时刻': 'Time', '相位': 'Phase', '秤重': 'Weight', '杯流': 'Flow', '压力': 'Pressure', '温度': 'Temp', '趋势角': 'Trend°', '机器流量': 'Machine flow',
    '杯流 (g/s)': 'Flow (g/s)',
    '握手': 'Handshake', '未握手': 'No handshake', '未握手 · 只读': 'No handshake · read-only', 'recorder 在录': 'recorder recording',
    '插件已接管本杯': 'Plugin took over', '只读 · 下一杯恢复': 'read-only · resumes next shot',
    '接管横幅': 'Plugin took over · command returned to base, chart continues',
    '咖啡机休眠': 'Machine sleep', '唤醒': 'Wake', '已休眠': 'Asleep', '萃取中': 'Extracting', '待机': 'Ready', '加热中': 'Heating', '睡眠': 'Sleep', '未连接': 'Offline',
    '正在检查机器状态': 'Checking machine state…', '当前状态': 'Current state',
    '确定让咖啡机休眠吗？': 'Put the machine to sleep?', '确定休眠': 'Sleep',
    '机器不在待机状态': 'Machine is not idle; try again after this shot.',
    '无法获取机器状态': 'Cannot read machine state.', '知道了': 'OK',
    '取消': 'Cancel', '连接': 'Connect', '连接失败': 'Connect failed', '选择曲线': 'Select curve',
    'HyperEx': 'HyperEx', '非HyperEx': 'Non-HyperEx', '非 HyperEx · 只读': 'Non-HyperEx · read-only', 'HyperEx · 插件接管': 'HyperEx · takeover',
    '预算': 'Budget', '拒绝': 'Rejects', '调流·写入': 'Trim·write', '检测': 'Check', '相位切换': 'Phase',
    'decaid 杯流': 'decaid flow', '目标杯流': 'Target flow', '矢量·增': 'Vector up', '矢量·减': 'Vector down',
    '机器流量': 'Machine flow', '目标指令': 'Target cmd', 'APK 指令': 'APK cmd',
    '插件版本过低': 'Plugin too old', '需要插件': 'Requires plugin', '升级提示': 'HEC needs plugin ≥ 2.2.48. Update HyperEx Pulse Filter, then reconnect.',
    '切档失败': 'Mode switch failed', '本杯进行中': 'Shot in progress; mode applies next shot.',
    '应用失败': 'Apply failed', '已应用': 'Applied', '温度已应用': 'Temperature applied', '液重已应用': 'Weight applied',
    '曲线已切换': 'Curve sent', '切换失败': 'Switch failed', '空闲才能改': 'Only while idle', '液重由插件控制': 'Weight is plugin-controlled',
    '未连接 Decaid': 'Decaid not connected', '地址无效': 'Invalid address',
    '无曲线': 'No curves', '加载曲线失败': 'Failed to load curves',
    '接管': 'Takeover', '心跳断': 'Heartbeat lost',
    '已去皮': 'Scale tared', '去皮失败': 'Tare failed', '萃取中不可去皮': 'Cannot tare while extracting', '去皮': 'Tare',
    '滤波': 'Filter', '关': 'Off', 'RAW 滤波': 'RAW filtered', '原始': 'Raw',
    '常用': 'Fav ', '空位': 'Empty', '条曲线': 'curves', '页': 'pages', '加入到常用': 'Add to fav ', '替换': 'Replace ', '移除': 'Remove', '已加入常用': 'Added to fav ', '已替换常用': 'Replaced fav ', '已移除常用': 'Removed from fav',
    '支持HEC': 'HEC ready',
  };
  // 控制页键优先，其次复用回放页 EN（插件/逻辑帧等共用词；顶层 const 不挂 window，走全局 t）
  function t(k) {
    if (typeof lang !== 'undefined' && lang === 'en') {
      if (EN[k] != null) return EN[k];
      if (typeof window.t === 'function') { const v = window.t(k); if (v !== k) return v; }
    }
    return k;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ---- 状态 ----
  let mode = 'control';            // control | replay
  let baseUrl = '';                // http://host:port
  let connState = 'off';           // off | ok | bad
  let pluginVersion = null;        // 字符串
  let pluginOk = false;            // ≥2.2.48
  let hecMode = false;             // 插件档位 = hec
  let ext = null;                  // 最近 external-status
  let helloOk = false;
  let pollTimer = 0, pollBusy = false;
  let machine = null;              // 最近 machine snapshot（解析后）
  let scale = null;                // 最近 scale snapshot
  let machineWs = null, scaleWs = null, waterWs = null, wsRetry = 0;
  let water = null;                // 最近水位快照 {current, refill, at}（ws/v1/machine/waterLevels）
  let run = null;                  // 当前杯实时缓冲
  let runEnded = false;            // 杯结束后冻结保留曲线，下一次开杯才清空（用户 2026-11-15 定）
  let runEndedAt = 0;
  let runId = null;                // 本杯归档 id：插件 runId；拿不到不直写，避免与插件导出重复
  let checks = [];                 // 趋势角检测点
  let lastCheck = null;
  let toastTimer = 0;
  let favs = [null, null, null, null, null, null];   // 常用曲线位（存本机 hecFavCurves，按标题）
  let sideCollapsed = false;
  let curves = [];                 // {id,title,hx,profile}
  let selectedCurve = null;
  let liveProfile = null;          // GET /workflow 的 profile
  let liveContext = null;          // GET /workflow 的 context（targetYield 才是 Decaid 的停杯目标）
  let savedProfile = null;         // 选中曲线的存储记录（温度平移的形状基准）
  let dial = { temp: { v: 92, min: 70, max: 100, step: .5 }, weight: { v: 36, min: 10, max: 300, step: .5 } };
  let dialDirty = { temp: false, weight: false };
  let applying = false;
  let rawOn = true;
  let rawWin = 1.0;                // RAW 滤波窗宽（s）：0=关，0.5–2.0 步长 0.1（用户 2026-11-15 定）
  let recorderOn = false;
  let machineStateStr = '';
  let sleepSeq = 0;                // 休眠弹窗代数：取消/关闭后丢弃迟到的状态查询响应
  let machineSubstate = '';        // 机器子状态（加热判定兜底）
  let helloBusy = false;           // 主动握手进行中
  let tareBusy = false;            // 去皮请求进行中
  let takeLast = null;
  let stageWeights = null;         // 阶段目标重量 {stage2, final}：calibration-status curveEditor.stageWeights
                                   // （external-status 不带此字段；影子救急 remainingS 需要）
  const netCbs = {};
  let netSeq = 0;

  // ---- 原生桥 / 浏览器直连 双通道 ----
  function httpJson(method, path, body) {
    return new Promise((resolve) => {
      const url = baseUrl + path;
      if (window.HxBridge && window.HxBridge.httpJson) {
        const cb = '__hecNet' + (++netSeq);
        netCbs[cb] = (payload) => { delete netCbs[cb]; try { resolve(JSON.parse(payload)); } catch (_) { resolve({ ok: false, status: 0, error: 'bad payload' }); } };
        window[cb] = netCbs[cb];
        window.HxBridge.httpJson(method, url, body == null ? '' : JSON.stringify(body), cb);
      } else {
        fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: body == null ? undefined : JSON.stringify(body), cache: 'no-store' })
          .then(async (r) => { let b; try { b = await r.json(); } catch (_) { b = null; } resolve({ ok: r.ok, status: r.status, body: b }); })
          .catch((e) => resolve({ ok: false, status: 0, error: String(e && e.message || e) }));
      }
    });
  }
  const pluginPath = (ep) => '/api/v1/plugins/' + PLUGIN_ID + '/' + ep;

  // ---- 版本核对 ----
  function verAtLeast(v, min) {
    const p = String(v || '').split('.').map((x) => parseInt(x, 10) || 0);
    for (let i = 0; i < min.length; i++) { if ((p[i] || 0) > min[i]) return true; if ((p[i] || 0) < min[i]) return false; }
    return true;
  }

  // ---- 连接 / 握手 / 轮询 ----
  async function connect() {
    if (!baseUrl) { setConn('off'); return; }
    const st = await httpJson('GET', pluginPath('status'));
    if (!st.ok || !st.body) { setConn('bad'); stopPoll(); return; }
    setConn('ok');
    pluginVersion = (st.body.calibration && st.body.calibration.pluginVersion) || null;
    pluginOk = verAtLeast(pluginVersion, MIN_PLUGIN);
    if (!pluginOk) { stopPoll(); showUpgrade(); renderAll(); return; }
    const cm = await httpJson('GET', pluginPath('control-mode'));
    hecMode = !!(cm.ok && cm.body && cm.body.algorithmIntervention === 'hec');
    await loadCurves();
    await loadWorkflow();
    loadStageWeights();
    startPoll();
    openWs();
    renderAll();
  }
  function setConn(s) { connState = s; renderConn(); }
  function startPoll() {
    stopPoll();
    hello();
    pollTimer = setInterval(poll, 700);
  }
  function stopPoll() { if (pollTimer) clearInterval(pollTimer); pollTimer = 0; helloOk = false; }
  async function hello() {
    if (helloBusy) return;
    helloBusy = true;
    const r = await httpJson('POST', pluginPath('external-hello'), { client: 'HyperExController', version: appVer() });
    helloOk = !!(r.ok && r.body && r.body.ok);
    if (helloOk && r.body) ext = r.body;
    helloBusy = false;
    renderAll();
  }
  async function poll() {
    if (pollBusy || !baseUrl || !pluginOk || document.hidden) return;
    pollBusy = true;
    const r = await httpJson('GET', pluginPath('external-status'));
    pollBusy = false;
    if (!r.ok || !r.body) { helloOk = false; renderAll(); return; }
    ext = r.body;
    helloOk = !!(ext.heartbeat && ext.heartbeat.ok);
    hecMode = ext.mode === 'hec';
    noteExternal(ext);
    renderAll();
  }
  function appVer() { try { return (window.HxBridge && window.HxBridge.appVersion()) || '0.11'; } catch (_) { return '0.11'; } }
  // 阶段目标重量（只读）：开杯前拉一次；影子救急判据 remainingS 用。
  async function loadStageWeights() {
    const r = await httpJson('GET', pluginPath('calibration-status'));
    const sw = r.ok && r.body && r.body.curveEditor && r.body.curveEditor.stageWeights;
    if (sw && Number.isFinite(Number(sw.stage2)) && Number.isFinite(Number(sw.final))) {
      stageWeights = { stage2: Number(sw.stage2), final: Number(sw.final) };
    }
  }

  // ---- 实时杯缓冲（WS 驱动）----
  function newRun() {
    return { startedAt: Date.now(), samples: [], phases: [], lastPhase: null, lastWeight: null, lastStamp: null, lastRaw: null, cmd: [], lastCmd: null };
  }
  function runT() { return run ? ((runEnded ? runEndedAt : Date.now()) - run.startedAt) / 1000 : 0; }
  function noteExternal(x) {
    // 相位色带 / 接管锁存 / 指令台账（事件日志卡已移除，只保留状态）
    if (!x) return;
    // 开杯瞬间插件 runId 可能还没轮询到：随轮询跟进，杯末归档用插件同一个 id
    if (run && !runEnded && x.runId && x.runId !== runId) runId = x.runId;
    if (x.phase && run && !runEnded && x.phase !== run.lastPhase) {
      run.phases.push({ t: runT(), phase: x.phase });
      run.lastPhase = x.phase;
    }
    if (x.takeover && (!takeLast || takeLast.atMs !== x.takeover.atMs)) {
      takeLast = x.takeover;
    }
    if (!x.takeover) takeLast = null;
    if (Number.isFinite(x.lastCommandMlS) && run && !runEnded && x.lastCommandMlS !== run.lastCmd) {
      run.cmd.push({ t: runT(), v: x.lastCommandMlS });
      run.lastCmd = x.lastCommandMlS;
    }
  }
  function phaseName(p) { return PHASE_LABEL[p] || p || '—'; }
  function onMachineSnapshot(payload) {
    const p = payload || {};
    const m = p.machine || p;
    const nested = m.state && typeof m.state === 'object' ? m.state : (p.state && typeof p.state === 'object' ? p.state : null);
    const st = nested ? nested.state : (typeof m.state === 'string' ? m.state : (typeof p.state === 'string' ? p.state : ''));
    const sub = nested ? nested.substate : (m.substate || p.substate || '');
    const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
    machine = {
      state: st, substate: sub,
      pressure: num(m.pressure !== undefined ? m.pressure : p.pressure),
      flow: num(m.flow !== undefined ? m.flow : p.flow),
      targetFlow: num(m.targetFlow !== undefined ? m.targetFlow : p.targetFlow),
      targetPressure: num(m.targetPressure !== undefined ? m.targetPressure : p.targetPressure),
      profileFrame: m.profileFrame !== undefined ? m.profileFrame : p.profileFrame,
      mix: num(m.mixTemperature !== undefined ? m.mixTemperature : p.mixTemperature),
      group: num(m.groupTemperature !== undefined ? m.groupTemperature : p.groupTemperature),
      steam: num(m.steamTemperature !== undefined ? m.steamTemperature : p.steamTemperature),
      at: Date.now(),
    };
    machineStateStr = st || machineStateStr;
    machineSubstate = sub || machineSubstate;
    const extracting = st === 'espresso';
    if (extracting && (!run || runEnded)) {
      run = newRun(); runEnded = false; runEndedAt = 0; checks = []; lastCheck = null; takeLast = null;
      runId = (ext && ext.runId) || null;
      // 开杯即落第一段色带：用插件当前相位（握手/轮询可能晚于机器快照）
      const ph = (ext && ext.phase) || 'stage1';
      run.phases.push({ t: 0, phase: ph });
      run.lastPhase = ph;
    }
    if (!extracting && run && !runEnded && (st === 'idle' || st === 'ready' || st === 'sleeping')) {
      // 杯结束：冻结计时并保留完整曲线，下一次开杯才清空
      runEnded = true; runEndedAt = Date.now();
      archiveRun().catch(() => {});
      if (window.HxShadow) window.HxShadow.onCupEnd();
    }
    renderHeaderState();
    drawCharts();
  }
  // ---- 杯末直写回放归档（用户 2026-11-15 定）：全点含 mix 温度，不经插件导出 ----
  async function archiveRun() {
    // 只归档拿到插件 runId 的杯：与插件导出同 id 去重，同一杯不会两条记录
    if (!run || !run.samples.length || !runId) return;
    const r = run, rid = runId;
    // startedAt 从 runId 的毫秒段推导，与插件导出同口径（同 runId 合并时不冲突）
    const m = String(rid).match(/\d{13}/);
    const ms = m ? Number(m[0]) : NaN;
    const startedAt = Number.isFinite(ms) ? new Date(ms).toISOString() : new Date(r.startedAt).toISOString();
    const samples = r.samples.map((s) => ({
      tMs: Math.round(s.t * 1000),
      scaleWeightG: s.weight,
      decaidWeightFlowGS: s.decaid,
      rawScaleDwDtGS: s.raw,
      pressureBar: s.pressure,
      machineFlowMlS: s.mflow,
      targetFlowMlS: s.tcmd,
      temp: s.temp,
      phase: s.phase,
    }));
    const events = r.phases.map((p) => ({ tMs: Math.round(p.t * 1000), name: 'phase', phase: p.phase }));
    const trace = r.cmd.map((c) => ({ kind: 'write', tMs: Math.round(c.t * 1000), commandMlS: c.v }));
    const last = samples[samples.length - 1];
    const shot = {
      runId: rid, startedAt,
      endedAt: new Date(r.startedAt + last.tMs).toISOString(),
      result: 'HEC ' + (last.scaleWeightG != null ? last.scaleWeightG.toFixed(1) + ' g' : ''),
      pluginVersion: pluginVersion || null,
      source: 'hec',
      samples, events,
      liveFlowTrim: trace.length ? { trace } : null,
    };
    const res = HxArchive.appendRun(archive || HxArchive.emptyArchive(), shot, MAX_SHOTS);
    archive = res.archive;
    await saveArchive();
    rebuildCupList();
  }
  function scaleTsSec(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'string') { const n = Number(v); if (Number.isFinite(n)) return scaleTsSec(n); const d = Date.parse(v); return Number.isFinite(d) ? d / 1000 : null; }
    const n = Number(v); if (!Number.isFinite(n)) return null;
    const a = Math.abs(n);
    if (a >= 1e17) return n / 1e9; if (a >= 1e14) return n / 1e6; if (a >= 1e11) return n / 1e3; return n;
  }
  function onScaleSnapshot(payload) {
    const p = payload || {};
    if (p.status === 'connected' || p.status === 'disconnected') return;
    const weight = Number(p.weight);
    if (!Number.isFinite(weight)) return;
    const wf = Number(p.weightFlow);
    const stamp = scaleTsSec(p.timestamp);
    const now = Date.now();
    let raw = null, tare = false;
    if (run && !runEnded && run.lastWeight != null) {
      const drop = run.lastWeight - weight;
      tare = Number.isFinite(drop) && drop >= TARE_RESET_THRESHOLD_G;
      const dt = (stamp != null && run.lastStamp != null) ? stamp - run.lastStamp : null;
      if (!tare && dt != null && dt > 0 && dt <= 10) raw = (weight - run.lastWeight) / dt;
    }
    scale = { weight, weightFlow: Number.isFinite(wf) ? wf : null, raw, tare, at: now };
    if (run && !runEnded) {
      run.lastWeight = weight; if (stamp != null) run.lastStamp = stamp;
      const s = { t: runT(), stamp, weight, decaid: scale.weightFlow, raw, tare, phase: (ext && ext.phase) || run.lastPhase || 'stage1', pressure: machine && machine.pressure, mflow: machine && machine.flow, tcmd: machine && machine.targetFlow, cmd: ext ? ext.lastCommandMlS : null, temp: machine && machine.mix, tgt: ext && Number.isFinite(ext.targetGS) ? ext.targetGS : null };
      run.samples.push(s);
      if (run.samples.length > 4000) run.samples.shift();
      maybeCheck(s);
      // 影子推理钩子：只记录不发送（shadow.js），特征/回归在模块内自算
      if (window.HxShadow) {
        window.HxShadow.onSample({
          run, runId: ext && ext.runId, sample: s,
          phase: (ext && ext.phase) || run.lastPhase, extracting: !!(ext && ext.extracting),
          takeover: !!(ext && ext.takeover), targetGS: ext && ext.targetGS,
          commandMlS: ext && ext.lastCommandMlS, baseCommandMlS: ext && ext.baseCommandMlS,
          frame: ext && ext.logicalFrame, pressureBar: machine && machine.pressure,
          machineFlowMlS: machine && machine.flow, cumulativeWeightG: weight,
          limiterBar: ext && ext.limiterBar,
          mode: ext && ext.mode, pending: ext && ext.pending,
          stage2WeightG: stageWeights ? stageWeights.stage2 : null, finalWeightG: stageWeights ? stageWeights.final : null,
          trendAngleDeg: lastCheck ? lastCheck.ang : null,
        });
      }
    }
    renderCards();
    drawCharts();
  }
  // 趋势角（技能 §19 口径）：相邻带 rawGS 检测点连线 vs 目标线夹角。
  // 朝目标且斜率同向 = atan(|slope|)（0–90）；平行偏离 = 90；背离 = 180−atan(|slope|)。
  // 2% 带内斜率≈0 记 0°。检测点节奏 ≥1s，取 RAW 回归斜率（最近 1.2s 线性拟合）。
  function maybeCheck(s) {
    if (!run || !ext || !ext.extracting) return;
    if (s.raw == null || s.tare) return;
    const target = Number(ext.targetGS);
    if (!Number.isFinite(target) || target <= 0) return;
    if (lastCheck && s.t - lastCheck.t < 1.0) return;
    const win = run.samples.filter((x) => x.raw != null && !x.tare && s.t - x.t <= 1.2);
    if (win.length < 4) return;
    const fit = linreg(win.map((x) => ({ x: x.t, y: x.raw })));
    if (!fit || fit.r2 < 0.5) return;
    const slope = fit.slope;
    const flow = s.raw;
    const inBand = Math.abs(flow - target) <= target * 0.02;
    let ang;
    if (inBand && Math.abs(slope) < target * 0.02) ang = 0;
    else {
      const toward = (flow < target && slope > 0) || (flow > target && slope < 0);
      const base = Math.atan(Math.abs(slope) / Math.max(0.3, target)) * 180 / Math.PI;
      if (Math.abs(slope) < 1e-6) ang = 90;
      else ang = toward ? base : 180 - base;
    }
    const prevCmd = lastCheck ? lastCheck.cmd : (ext.baseCommandMlS != null ? ext.baseCommandMlS : ext.lastCommandMlS);
    const cmd = Number.isFinite(ext.lastCommandMlS) ? ext.lastCommandMlS : prevCmd;
    const dc = (Number.isFinite(cmd) && Number.isFinite(prevCmd)) ? cmd - prevCmd : 0;
    const ck = { t: s.t, gs: flow, ang: Math.round(ang), dc, cmd };
    checks.push(ck); if (checks.length > 40) checks.shift();
    lastCheck = ck;
  }
  // ---- RAW 滤波（仅显示层；趋势角/影子仍用原始 raw）----
  function rawSeries(samples) {
    const pts = [];
    for (const s of samples) if (s.raw != null && Number.isFinite(s.raw)) pts.push([s.t, s.raw]);
    return pts;
  }
  // 居中时间窗滑动平均（双指针 O(n)，不引入滞后）
  function filterRaw(pts, win) {
    const half = win / 2, out = [];
    let lo = 0, hi = 0, sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const t = pts[i][0];
      while (lo < pts.length && pts[lo][0] < t - half) { sum -= pts[lo][1]; lo++; }
      while (hi < pts.length && pts[hi][0] <= t + half) { sum += pts[hi][1]; hi++; }
      out.push([t, sum / (hi - lo)]);
    }
    return out;
  }
  function scatterRaw(ctx, pts, p, w, h, xMax, yMin, yMax, color) {
    const stride = Math.max(1, Math.ceil(pts.length / 600));
    ctx.fillStyle = color; ctx.globalAlpha = .28;
    for (let i = 0; i < pts.length; i += stride) {
      const q = pts[i];
      const x = p.l + (w - p.l - p.r) * q[0] / xMax, y = p.t + (h - p.t - p.b) * (1 - (q[1] - yMin) / (yMax - yMin));
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function rawWinStep(dir) {
    if (rawWin <= 0) { if (dir > 0) rawWin = 0.5; }
    else {
      let v = Math.round((rawWin + dir * 0.1) * 10) / 10;
      if (v < 0.5) v = 0;               // 0.5 以下一档 = 0（滤波关）
      rawWin = Math.min(2, Math.max(0, v));
    }
    renderRawWin(); drawCharts();
  }
  function renderRawWin() {
    const el = $('rawWinV'); if (el) el.textContent = rawWin > 0 ? rawWin.toFixed(1) + 's' : t('关');
    const k = $('rawWinK'); if (k) k.textContent = t('滤波');
  }
  function linreg(pts) {
    const n = pts.length; if (n < 3) return null;
    let mx = 0, my = 0; for (const p of pts) { mx += p.x; my += p.y; } mx /= n; my /= n;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of pts) { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    if (sxx <= 0) return null;
    const slope = sxy / sxx;
    const r2 = syy > 0 ? Math.max(0, Math.min(1, sxy * sxy / (sxx * syy))) : 1;
    return { slope, r2 };
  }

  // ---- WS ----
  function wsBase() { return baseUrl.replace(/^http/, 'ws'); }
  function openWs() {
    closeWs();
    if (!baseUrl) return;
    try {
      machineWs = new WebSocket(wsBase() + '/ws/v1/machine/snapshot');
      machineWs.onmessage = (e) => { try { onMachineSnapshot(JSON.parse(e.data)); } catch (_) {} };
      machineWs.onclose = () => scheduleWsRetry();
      machineWs.onerror = () => { try { machineWs.close(); } catch (_) {} };
    } catch (_) {}
    try {
      waterWs = new WebSocket(wsBase() + '/ws/v1/machine/waterLevels');
      waterWs.onmessage = (e) => { try { onWaterSnapshot(JSON.parse(e.data)); } catch (_) {} };
      waterWs.onclose = () => scheduleWsRetry();
      waterWs.onerror = () => { try { waterWs.close(); } catch (_) {} };
    } catch (_) {}
    try {
      scaleWs = new WebSocket(wsBase() + '/ws/v1/scale/snapshot');
      scaleWs.onmessage = (e) => { try { onScaleSnapshot(JSON.parse(e.data)); } catch (_) {} };
      scaleWs.onclose = () => scheduleWsRetry();
      scaleWs.onerror = () => { try { scaleWs.close(); } catch (_) {} };
    } catch (_) {}
  }
  function closeWs() {
    for (const w of [machineWs, scaleWs, waterWs]) { if (w) { w.onclose = null; try { w.close(); } catch (_) {} } }
    machineWs = scaleWs = waterWs = null;
  }
  // ---- 水位（Decaid 官方 ws/v1/machine/waterLevels，与插件同源；字段 currentLevel/refillLevel，mm）----
  function onWaterSnapshot(payload) {
    const p = payload || {};
    const cur = Number(p.currentLevel);
    if (!Number.isFinite(cur)) return;
    const refill = Number(p.refillLevel);
    water = { current: cur, refill: Number.isFinite(refill) ? refill : null, at: Date.now() };
    renderHeaderState();
  }
  let wsRetryTimer = 0;
  function scheduleWsRetry() {
    if (wsRetryTimer || !baseUrl || mode !== 'control') return;
    wsRetryTimer = setTimeout(() => { wsRetryTimer = 0; openWs(); }, 2000);
  }

  // ---- 曲线 / workflow ----
  async function loadCurves() {
    const r = await httpJson('GET', '/api/v1/profiles?includeHidden=true');
    curves = [];
    if (r.ok && Array.isArray(r.body)) {
      for (const rec of r.body) {
        const p = rec && rec.profile;
        if (!p || !p.title) continue;
        const title = String(p.title);
        const hx = /^HyperEx/i.test(title) && !/Flow Calibration/i.test(title);
        curves.push({ id: rec.id, title, hx, profile: p });
      }
    }
    curves.sort((a, b) => (b.hx - a.hx) || a.title.localeCompare(b.title));
    renderCurveBtn();
  }
  async function loadWorkflow() {
    const r = await httpJson('GET', '/api/v1/workflow');
    if (r.ok && r.body && r.body.profile) {
      liveProfile = r.body.profile;
      liveContext = r.body.context || null;
      const title = String(liveProfile.title || '');
      selectedCurve = curves.find((c) => c.title === title) || null;
      savedProfile = selectedCurve ? selectedCurve.profile : null;
      syncDialsFromProfile();
    }
    renderCurveBtn();
  }
  function syncDialsFromProfile() {
    if (!liveProfile) return;
    const steps = Array.isArray(liveProfile.steps) ? liveProfile.steps : [];
    if (steps.length && Number.isFinite(Number(steps[0].temperature))) { dial.temp.v = clampDial('temp', Number(steps[0].temperature)); dialDirty.temp = false; }
    const cy = Number(liveContext && liveContext.targetYield);
    const tw = Number.isFinite(cy) && cy > 0 ? cy : Number(liveProfile.target_weight);
    if (Number.isFinite(tw) && tw > 0) { dial.weight.v = clampDial('weight', tw); dialDirty.weight = false; }
    renderDial('temp'); renderDial('weight');
  }
  function clampDial(k, v) { const d = dial[k]; return Math.min(d.max, Math.max(d.min, Math.round(v / d.step) * d.step)); }
  function isHxSelected() { return !!(selectedCurve && selectedCurve.hx) || /^HyperEx/i.test(String(liveProfile && liveProfile.title || '')); }

  // ---- 温度 / 液重应用（只空闲）----
  function shiftedTemperatures(baseTemps, first) {
    if (!Array.isArray(baseTemps) || !baseTemps.length) return null;
    const target = Number(first), origin = baseTemps[0];
    if (!Number.isFinite(target) || typeof origin !== 'number' || !Number.isFinite(origin)) return null;
    const shift = target - origin;
    return baseTemps.map((x) => (typeof x === 'number' && Number.isFinite(x) ? Math.round((x + shift) * 100) / 100 : Math.round(target * 100) / 100));
  }
  async function applyDials() {
    if (applying || !baseUrl) return;
    if (ext && ext.extracting) { toast(t('空闲才能改')); return; }
    applying = true; renderApply();
    try {
      if (dialDirty.temp) {
        const wf = await httpJson('GET', '/api/v1/workflow');
        const live = wf.ok && wf.body && wf.body.profile;
        if (!live || !Array.isArray(live.steps) || !live.steps.length) throw new Error('no live steps');
        const shape = (savedProfile && Array.isArray(savedProfile.steps) && savedProfile.steps.length === live.steps.length && savedProfile.title === live.title) ? savedProfile.steps : live.steps;
        const temps = shiftedTemperatures(shape.map((s) => s.temperature), dial.temp.v);
        const steps = live.steps.map((s, i) => Object.assign({}, s, { temperature: temps ? temps[i] : dial.temp.v }));
        const r = await httpJson('PUT', '/api/v1/workflow', { profile: { steps } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        dialDirty.temp = false;
        toast(t('温度已应用') + ' ' + dial.temp.v.toFixed(1) + '°C');
      }
      if (dialDirty.weight) {
        if (isHxSelected()) { toast(t('液重由插件控制')); }
        else {
          // Decaid 停杯读 context.targetYield（shot_sequencer），target_weight 只是曲线字段——两个一起发，Streamline 首页同款。
          const r = await httpJson('PUT', '/api/v1/workflow', { profile: { target_weight: dial.weight.v }, context: { targetYield: dial.weight.v } });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          dialDirty.weight = false;
          toast(t('液重已应用') + ' ' + dial.weight.v.toFixed(1) + ' g');
        }
      }
      await loadWorkflow();
      toast(t('已应用'));
    } catch (e) {
      toast(t('应用失败') + ': ' + (e && e.message || e));
    } finally {
      applying = false; renderApply();
    }
  }
  async function selectCurve(c) {
    if (!c || !baseUrl) return;
    if (ext && ext.extracting) { toast(t('本杯进行中')); return; }
    // 切曲线随带拨轮当前液重（用户 2026-11-16 拍板）：Decaid 深合并不重置 context，不带就沿用旧目标（0 = 不停杯）。
    const r = await httpJson('PUT', '/api/v1/workflow', { profile: c.profile, context: { targetYield: dial.weight.v } });
    if (!r.ok) { toast(t('切换失败') + ': HTTP ' + r.status); return; }
    selectedCurve = c; savedProfile = c.profile;
    await loadWorkflow();
    closeModal();
    toast(t('曲线已切换'));
  }

  // ---- 休眠 / 唤醒 ----
  const MOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function machineAsleep() { const s = String(machineStateStr || '').toLowerCase(); return s === 'sleeping' || s === 'sleep'; }
  // 机器状态胶囊映射（顶栏与休眠弹窗共用）：sleeping→已休眠、ready/idle→待机、heating→加热中、espresso→萃取中
  function machinePillInfo() {
    const s = String(machineStateStr || '').toLowerCase();
    const sub = String(machineSubstate || '').toLowerCase();
    if (s === 'sleeping' || s === 'sleep') return { cls: 'sleep', label: t('已休眠'), raw: s };
    if (s === 'espresso') return { cls: 'espresso', label: t('萃取中'), raw: s };
    // 真机实测：加热期 Decaid 报 idle/preparingForShot（无 heating 字符串），到温后回 idle/idle
    if (s === 'heating' || s === 'warmup' || s === 'warming' || sub === 'heating' || sub === 'preparingforshot') return { cls: 'heating', label: t('加热中'), raw: s };
    if (s === 'ready' || s === 'idle') return { cls: 'idle', label: t('待机'), raw: s };
    if (s) return { cls: 'idle', label: machineStateStr, raw: s };
    return { cls: 'off', label: t('未连接'), raw: '' };
  }
  async function doSleep() {
    const target = machineAsleep() ? 'idle' : 'sleeping';
    const r = await httpJson('PUT', '/api/v1/machine/state/' + target);
    if (!r.ok) { toast(t('应用失败') + ': HTTP ' + r.status); return; }
    closeModal();
    // 状态以机器确认为准（轮询/WS 回来再变胶囊），不做乐观切换
  }

  // ---- 渲染 ----
  function renderConn() {
    const b = $('connBtn'); if (!b) return;
    b.className = 'connbtn ' + (connState === 'ok' ? 'ok' : connState === 'bad' ? 'bad' : '');
    $('connLb').textContent = baseUrl ? baseUrl.replace(/^https?:\/\//, '') : '—';
  }
  function renderCurveBtn() {
    const lb = $('curveLb'), tag = $('curveTag');
    if (!lb) return;
    const title = (liveProfile && liveProfile.title) || (selectedCurve && selectedCurve.title) || t('无曲线');
    lb.textContent = title;
    const hx = isHxSelected();
    const taken = !!(ext && ext.takeover);
    tag.textContent = taken ? t('HyperEx · 插件接管') : hx ? 'HyperEx · HEC' : t('非 HyperEx · 只读');
    tag.className = 'curvetag' + (hx && !taken ? '' : ' plain');
    const lock = $('curveLock');
    if (lock) lock.hidden = !(hx && !taken);
  }
  function renderDial(k) {
    const el = document.querySelector('[data-dial="' + k + '"] .dv');
    if (!el) return;
    el.textContent = dial[k].v.toFixed(1);
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
  function renderApply() {
    const b = $('applyBtn'); if (!b) return;
    const locked = !!(ext && ext.extracting) || applying;
    const hxWeightLock = isHxSelected();
    b.disabled = locked || (!dialDirty.temp && (hxWeightLock || !dialDirty.weight));
    document.querySelectorAll('#controlAside .dial').forEach((d) => {
      if (d.classList.contains('curve-card')) return;
      const isWeight = !!d.querySelector('[data-dial="weight"]');
      d.classList.toggle('locked', locked || (isWeight && hxWeightLock));
      d.classList.toggle('hxlock', isWeight && hxWeightLock);
    });
  }
  function renderHeaderState() {
    const pill = $('de1Pill'), txt = $('de1PillTxt');
    if (mode !== 'control') return;
    const wl = $('whitelistBar'); if (wl) wl.hidden = true;
    const mp = machinePillInfo();
    pill.className = 'de1pill ' + mp.cls;
    txt.textContent = mp.label;
    // 握手胶囊
    const hb = $('hbPill'), hbt = $('hbPillTxt');
    const taken = !!(ext && ext.takeover);
    hb.classList.remove('clickable');
    if (taken) { hb.className = 'hb bad'; hbt.textContent = t('插件已接管本杯'); hb.hidden = false; }
    else if (helloOk && ext && ext.heartbeat) { hb.className = 'hb ok'; hbt.textContent = t('握手') + ' ' + ((ext.heartbeat.ageMs || 0) / 1000).toFixed(1) + ' s'; hb.hidden = false; }
    else if (connState === 'ok' && hecMode) { hb.className = 'hb off clickable'; hbt.textContent = t('未握手'); hb.hidden = false; }
    else if (connState === 'ok') { hb.className = 'hb off'; hbt.textContent = t('未握手 · 只读'); hb.hidden = false; }
    else { hb.hidden = true; }
    // recorder 胶囊：非 HyperEx 且机器在录
    $('recPill').hidden = !(connState === 'ok' && !isHxSelected() && mp.raw === 'espresso' && recorderOn);
    // 休眠按钮
    const sb = $('sleepBtn');
    sb.hidden = connState !== 'ok';
    const asleep = machineAsleep();
    $('sleepIc').innerHTML = asleep ? SUN : MOON;
    const lb = $('sleepLb'); const k = asleep ? '唤醒' : '咖啡机休眠';
    lb.dataset.i18n = k; lb.textContent = t(k);
    sb.classList.toggle('wake', asleep);
    // 顶栏只保留接管态的只读提示；预算/拒绝已移入左侧指令卡
    const hs = $('hstat');
    if (taken) { hs.hidden = false; hs.textContent = t('只读 · 下一杯恢复'); }
    else hs.hidden = true;
    renderWaterPill();
  }
  // 水位胶囊（用户 2026-11-15 定）：≥33mm 满格淡蓝；18–33 淡蓝按比例；12–18 黄；<12 红报警、进度条留 1/10
  function renderWaterPill() {
    const el = $('waterPill'); if (!el) return;
    if (!water || mode !== 'control' || connState !== 'ok') { el.hidden = true; return; }
    const mm = water.current;
    const low = mm < 12, warn = !low && mm < 18;
    el.hidden = false;
    el.className = 'waterpill' + (low ? ' low' : warn ? ' warn' : '');
    $('waterFill').style.width = (low ? 10 : Math.min(100, mm / 33 * 100)).toFixed(1) + '%';
    $('waterTxt').textContent = (low ? '缺水 ' : '') + mm.toFixed(1) + ' mm';
  }
  function renderCards() {
    if (mode !== 'control') return;
    const box = $('hecCards'); if (!box) return;
    const hx = isHxSelected();
    box.className = 'hec-cards' + (hx ? '' : ' plain');
    const s = scale || {};
    const m = machine || {};
    const tt = run ? runT() : 0;
    const mm = Math.floor(tt / 60), ss = (tt % 60).toFixed(1);
    const phase = (ext && ext.phase) || (run && run.lastPhase) || '';
    const pill = PHASE_PILL[phase] || ['#2a2f37', '#cfd5de'];
    const f1 = (v) => Number.isFinite(v) ? v.toFixed(1) : '—';
    const f2 = (v) => Number.isFinite(v) ? v.toFixed(2) : '—';
    const card = (k, v) => '<div class="card"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
    let html = '';
    html += card(t('时刻'), mm + ':' + (ss < 10 ? '0' : '') + ss);
    if (hx) html += card(t('相位'), '<span class="phasepill' + (phase === 'idle' ? ' idle' : '') + '" style="background:' + pill[0] + ';color:' + pill[1] + '">' + esc(phaseName(phase)) + '</span>');
    html += '<div class="card tareable" id="tareCard" title="' + esc(t('去皮')) + '"><div class="k">' + t('秤重') + '</div><div class="v">' + f1(s.weight) + '<small>g</small></div></div>';
    html += card(t('杯流'), f2(s.decaid != null ? s.decaid : s.raw) + '<small>g/s</small>');
    html += card(t('压力'), f2(m.pressure) + '<small>bar</small>');
    html += card(t('温度'), f1(m.mix) + '<small>°C</small>');
    if (hx) html += card(t('趋势角'), (lastCheck ? lastCheck.ang : '—') + '<sup class="deg">°</sup>');
    else html += card(t('机器流量'), f2(m.flow) + '<small>ml/s</small>');
    box.innerHTML = html;
    $('tareCard').addEventListener('click', tareScale);
  }
  // ---- 秤去皮（点秤重卡片；Decaid 官方 /api/v1/scale/tare，PUT 失败回退 POST，同 NSX 皮肤）----
  async function tareScale() {
    if (tareBusy || !baseUrl || connState !== 'ok') return;
    if ((ext && ext.extracting) || (machine && machine.state === 'espresso')) { toast(t('萃取中不可去皮')); return; }
    tareBusy = true;
    let r = await httpJson('PUT', '/api/v1/scale/tare');
    if (!r.ok) r = await httpJson('POST', '/api/v1/scale/tare');
    tareBusy = false;
    if (r.ok) {
      // 清掉上一杯重量基准，避免去皮造成的重量跳变被当成流量/去皮事件
      if (run && !runEnded) { run.lastWeight = null; run.lastStamp = null; }
      toast(t('已去皮'));
    } else toast(t('去皮失败') + (r.status ? ': HTTP ' + r.status : ''));
  }
  function renderHecBox() {
    const box = $('hecBox'), tb = $('takeoverBox');
    const taken = !!(ext && ext.takeover);
    box.hidden = taken || !isHxSelected();
    tb.hidden = !taken;
    $('takeoverBanner').hidden = !taken;
    if (taken) {
      $('kvTakeReason').textContent = ext.takeover.reason || '—';
      const at = ext.takeover.atMs;
      $('kvTakeAt').textContent = at && run ? ((at - run.startedAt) / 1000).toFixed(1) + ' s' : '—';
      $('kvTakeCmd').textContent = (ext.lastCommandMlS != null ? ext.lastCommandMlS.toFixed(2) : '—') + '（' + t('插件') + '）';
    } else {
      $('kvVer').textContent = pluginVersion || '—';
      const lf = ext && ext.logicalFrame;
      $('kvFrame').textContent = lf == null ? '—' : lf + ' · ' + phaseName(ext.phase);
      $('kvCmd').textContent = ext ? ((ext.baseCommandMlS != null ? ext.baseCommandMlS.toFixed(2) : '—') + ' / ' + (ext.lastCommandMlS != null ? ext.lastCommandMlS.toFixed(2) : '—')) : '—';
      $('kvTarget').textContent = ext && ext.targetGS != null ? ext.targetGS + ' g/s' : '—';
      $('kvLimiter').textContent = ext && ext.limiterBar != null ? ext.limiterBar + ' bar' : '—';
      $('kvBudget').textContent = ext ? (ext.writes || 0) + ' / ' + (ext.maxWrites || 0) : '—';
      $('kvRejects').textContent = ext && ext.heartbeat ? String(ext.heartbeat.externalRejects || 0) : '—';
    }
  }
  function renderAll() {
    if (mode !== 'control') return;
    renderConn(); renderCurveBtn(); renderHeaderState(); renderCards(); renderHecBox(); renderApply();
    drawCharts();
  }

  // ---- 图表 ----
  function setup(id) {
    const cv = $(id); if (!cv) return null;
    const box = cv.parentElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = box.clientWidth, h = box.clientHeight;
    if (w <= 0 || h <= 0) return null;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  const pad = { l: 34, r: 12, t: 10, b: 18 };
  function axes(ctx, w, h, p, yMin, yMax) {
    ctx.strokeStyle = C.grid; ctx.fillStyle = C.axis; ctx.font = '10px ui-monospace,monospace'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = p.t + (h - p.t - p.b) * i / 4; ctx.beginPath(); ctx.moveTo(p.l, y); ctx.lineTo(w - p.r, y); ctx.stroke(); ctx.fillText((yMax - (yMax - yMin) * i / 4).toFixed(0), 4, y + 3); }
  }
  function line(ctx, pts, p, w, h, xMax, yMin, yMax, color, width, dash) {
    if (!pts.length) return;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); let st = false;
    for (const q of pts) {
      if (q[1] == null || !Number.isFinite(q[1])) { st = false; continue; }
      const x = p.l + (w - p.l - p.r) * q[0] / xMax, y = p.t + (h - p.t - p.b) * (1 - (q[1] - yMin) / (yMax - yMin));
      if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function stepLine(ctx, pts, p, w, h, xMax, yMin, yMax, color, width) {
    if (!pts.length) return;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    let px = null, py = null;
    for (const q of pts) {
      const x = p.l + (w - p.l - p.r) * q[0] / xMax, y = p.t + (h - p.t - p.b) * (1 - (q[1] - yMin) / (yMax - yMin));
      if (px == null) ctx.moveTo(x, y); else { ctx.lineTo(x, py); ctx.lineTo(x, y); }
      px = x; py = y;
    }
    ctx.stroke();
  }
  function bands(ctx, w, h, p, xMax, phases) {
    for (let i = 0; i < phases.length; i++) {
      const a = phases[i], b = phases[i + 1];
      const col = STAGE_BAND[a.phase]; if (!col) continue;
      const x0 = p.l + (w - p.l - p.r) * a.t / xMax, x1 = p.l + (w - p.l - p.r) * Math.min(b ? b.t : xMax, xMax) / xMax;
      ctx.fillStyle = col; ctx.fillRect(x0, p.t, x1 - x0, h - p.t - p.b);
      ctx.fillStyle = 'rgba(232,234,238,.4)'; ctx.font = '10px ui-monospace,monospace';
      ctx.fillText(phaseName(a.phase), x0 + 4, p.t + 11);
    }
  }
  function nowLine(ctx, w, h, p, xMax, tt) {
    const x = p.l + (w - p.l - p.r) * tt / xMax;
    ctx.strokeStyle = 'rgba(232,234,238,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, p.t); ctx.lineTo(x, h - p.b); ctx.stroke(); ctx.setLineDash([]);
  }
  function vecArrows(ctx, cks, p, w, h, xMax, yMin, yMax) {
    const K = 220, MAX_LEN = 72;
    cks.forEach((ck, i) => {
      const x0 = p.l + (w - p.l - p.r) * ck.t / xMax, y0 = p.t + (h - p.t - p.b) * (1 - (ck.gs - yMin) / (yMax - yMin));
      const up = ck.dc >= 0; const a = Math.max(0, Math.min(180, ck.ang)) * Math.PI / 180;
      const dx = Math.cos(a), dy = up ? -Math.sin(a) : Math.sin(a);
      // 长度上限：不越出绘图区；超限的按上限画示意（方向/角度仍真实）
      const rawLen = Math.max(14, Math.abs(ck.dc) * K);
      let len = Math.min(rawLen, MAX_LEN);
      const xLo = p.l + 2, xHi = w - p.r - 2, yLo = p.t + 2, yHi = h - p.b - 2;
      if (dx > 1e-6) len = Math.min(len, (xHi - x0) / dx);
      if (dy < -1e-6) len = Math.min(len, (yLo - y0) / dy);
      if (dy > 1e-6) len = Math.min(len, (yHi - y0) / dy);
      len = Math.max(10, len);
      const capped = rawLen > len + 0.5;
      const x1 = x0 + dx * len, y1 = y0 + dy * len;
      const col = up ? C.vec : C.vecdn;
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = .3; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + len, y0); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = .15; ctx.beginPath(); ctx.arc(x0, y0, len, up ? Math.PI : 0, up ? 2 * Math.PI : Math.PI, false); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      const hl = 6, ha = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath(); ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - hl * Math.cos(ha - 0.45), y1 - hl * Math.sin(ha - 0.45));
      ctx.lineTo(x1 - hl * Math.cos(ha + 0.45), y1 - hl * Math.sin(ha + 0.45));
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x0, y0, 2.4, 0, 7); ctx.fill();
      // 角度标注在箭头起点：数字正常字号，° 上标小字号；位置夹在绘图区内
      ctx.font = '10px ui-monospace,monospace'; ctx.lineWidth = 3; ctx.strokeStyle = '#171a1f';
      const num = String(ck.ang);
      const numW = ctx.measureText(num).width;
      ctx.font = '7px ui-monospace,monospace';
      const degW = ctx.measureText('\u00b0').width;
      let lx = Math.min(Math.max(x0 + 6, xLo), xHi - numW - degW - 2);
      let ly = y0 + (up ? 14 + (i % 2) * 10 : -8 - (i % 2) * 10);
      ly = Math.min(Math.max(ly, yLo + 8), yHi - 2);
      ctx.font = '10px ui-monospace,monospace';
      ctx.strokeText(num, lx, ly); ctx.fillText(num, lx, ly);
      ctx.font = '7px ui-monospace,monospace';
      ctx.strokeText('\u00b0', lx + numW + 1, ly - 4); ctx.fillText('\u00b0', lx + numW + 1, ly - 4);
      // 超长示意：角度旁标真实矢量长度（|指令差| ml/s），提示箭头已按上限缩短
      if (capped) {
        const mag = (ck.dc >= 0 ? '+' : '\u2212') + Math.abs(ck.dc).toFixed(2);
        ctx.font = '8px ui-monospace,monospace';
        const magW = ctx.measureText(mag).width;
        const mx = Math.min(lx, xHi - magW - 2);
        const my = Math.min(ly + 10, yHi - 1);
        ctx.lineWidth = 3; ctx.strokeStyle = '#171a1f';
        ctx.strokeText(mag, mx, my); ctx.fillStyle = col; ctx.fillText(mag, mx, my);
      }
    });
  }
  function drawCharts() {
    if (mode !== 'control') return;
    const hx = isHxSelected();
    const samples = run ? run.samples : [];
    const tEnd = run ? Math.max(runT(), 10) : 30;
    const xMax = Math.max(30, Math.ceil(tEnd / 10) * 10);
    // 杯流图
    const a = setup('hcFlow');
    if (a) {
      const { ctx, w, h } = a;
      const yMin = 0, yMax = 8;
      if (hx && run) bands(ctx, w, h, pad, xMax, run.phases);
      axes(ctx, w, h, pad, yMin, yMax);
      const tgt = samples.map((s) => [s.t, hx ? (run && !runEnded && ext && ext.targetGS != null ? ext.targetGS : s.tgt) : null]);
      if (hx) line(ctx, tgt, pad, w, h, xMax, yMin, yMax, C.target, 1.2, [5, 4]);
      line(ctx, samples.map((s) => [s.t, s.decaid]), pad, w, h, xMax, yMin, yMax, C.decaid, 1.4);
      if (rawOn) {
        const rp = rawSeries(samples);
        if (rawWin > 0) {
          scatterRaw(ctx, rp, pad, w, h, xMax, yMin, yMax, C.raw);
          line(ctx, filterRaw(rp, rawWin), pad, w, h, xMax, yMin, yMax, C.raw, 1.8);
        } else line(ctx, rp, pad, w, h, xMax, yMin, yMax, C.raw, 1.8);
      }
      if (hx) vecArrows(ctx, checks, pad, w, h, xMax, yMin, yMax);
      if (run) nowLine(ctx, w, h, pad, xMax, runT());
    }
    // 压力温度图
    const b = setup('hcPress');
    if (b) {
      const { ctx, w, h } = b;
      const yMin = 0, yMax = 10;
      const p2 = { l: pad.l, r: 32, t: pad.t, b: pad.b };
      const tr = tempRange(samples, dial.temp.v);
      if (hx && run) bands(ctx, w, h, pad, xMax, run.phases);
      axes(ctx, w, h, pad, yMin, yMax);
      ctx.fillStyle = C.temp; ctx.font = '10px ui-monospace,monospace';
      for (let i = 0; i <= 4; i++) { const y = p2.t + (h - p2.t - p2.b) * i / 4; ctx.fillText((tr.hi - (tr.hi - tr.lo) * i / 4).toFixed(0) + '\u00b0', w - 30, y + 3); }
      if (hx) {
        line(ctx, samples.map((s) => [s.t, s.tcmd]), pad, w, h, xMax, yMin, yMax, C.target, 1.2, [5, 4]);
        stepLine(ctx, run ? run.cmd : [], pad, w, h, xMax, yMin, yMax, C.cmd, 1.8);
      }
      line(ctx, samples.map((s) => [s.t, s.mflow]), pad, w, h, xMax, yMin, yMax, C.mflow, 1.2);
      line(ctx, samples.map((s) => [s.t, s.pressure]), pad, w, h, xMax, yMin, yMax, C.press, 1.6);
      line(ctx, samples.map((s) => [s.t, s.temp]), p2, w, h, xMax, tr.lo, tr.hi, C.temp, 1.6);
      if (run) nowLine(ctx, w, h, pad, xMax, runT());
    }
    renderLegends(hx);
  }
  function renderLegends(hx) {
    const lg = (id, items) => { const el = $(id); if (el) el.innerHTML = items.map((it) => '<span class="lg' + (it.dash ? ' dash' : '') + (it.arrow ? ' arrow' : '') + (it.dot ? ' dot' : '') + '" style="color:' + it.c + '"><i style="background:' + it.c + '"></i><span style="color:#aab2bf">' + it.l + '</span></span>').join(''); };
    const flow = [{ l: t('decaid 杯流'), c: C.decaid }, { l: rawWin > 0 ? t('RAW 滤波') : 'RAW dW/dt', c: C.raw }];
    if (rawOn && rawWin > 0) flow.push({ l: t('原始'), c: C.raw, dot: 1 });
    if (hx) flow.push({ l: t('目标杯流'), c: C.target, dash: 1 }, { l: t('矢量·增'), c: C.vec, arrow: 1 }, { l: t('矢量·减'), c: C.vecdn, arrow: 1 });
    lg('lgFlow', flow);
    const press = [{ l: t('压力'), c: C.press }, { l: t('机器流量'), c: C.mflow }];
    if (hx) press.push({ l: t('目标指令'), c: C.target, dash: 1 }, { l: t('APK 指令'), c: C.cmd });
    press.push({ l: t('温度'), c: C.temp });
    lg('lgPress', press);
  }

  // ---- 弹窗 ----
  function openModal(inner) { const d = $('hecDim'); d.innerHTML = '<div class="modal">' + inner + '</div>'; d.hidden = false; }
  function closeModal() { sleepSeq++; const d = $('hecDim'); d.hidden = true; d.innerHTML = ''; }
  // 事件日志卡已按用户口径移除；操作反馈改走底部短暂提示，不占曲线空间。
  function toast(msg) {
    let el = $('hecToast');
    if (!el) { el = document.createElement('div'); el.id = 'hecToast'; el.className = 'hec-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function showUpgrade() {
    openModal('<h3>' + t('插件版本过低') + '</h3><p class="modal-note">' + t('升级提示') + ' (' + (pluginVersion || '?') + ')</p><div class="modal-actions"><button class="ghost" id="upClose">' + t('取消') + '</button></div>');
    $('upClose').addEventListener('click', closeModal);
  }
  // ---- 曲线选择弹窗（v0.11：80% 页宽 · 顶部 6 常用位 · 两列左右滑动 · 长按加常用）----
  const CHEV_L = '<svg width="6" height="9" viewBox="0 0 7 10"><path d="M6 1 2 5l4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEV_R = '<svg width="6" height="9" viewBox="0 0 7 10"><path d="M2 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function saveFavs() { try { dbSet('hecFavCurves', favs); } catch (_) {} }
  function favSlot(title) { return favs.indexOf(title); }
  function closeLp() { const m = document.querySelector('.lp-menu'); if (m) m.remove(); }
  function openCurveModal() {
    if (!curves.length) { toast(t('无曲线')); return; }
    const d = $('hecDim');
    d.innerHTML = '<div class="modal crv-modal"><div class="crv-head"><h3>' + t('选择曲线') + '</h3><span class="src" id="crvSrc"></span><button class="lrn-x" id="crvClose">✕</button></div><div class="favrow" id="favRow"></div><div class="crv-scroll" id="crvScroll"></div><div class="crv-dots" id="crvDots"></div></div>';
    d.hidden = false;
    renderCurveModal();
    $('crvScroll').scrollLeft = 0;
    $('crvClose').addEventListener('click', closeModal);
  }
  function curveMeta(c) {
    const p = c.profile || {};
    const st = Array.isArray(p.steps) && p.steps[0] ? p.steps[0] : null;
    const tv = st && Number.isFinite(Number(st.temperature)) ? Number(st.temperature) : null;
    const wv = Number.isFinite(Number(p.target_weight)) ? Number(p.target_weight) : null;
    return (tv != null ? tv + '°C' : '—') + ' · ' + (wv != null ? wv + 'g' : '—');
  }
  function renderCurveModal() {
    const cur = (liveProfile && liveProfile.title) || (selectedCurve && selectedCurve.title) || '';
    const pages = Math.max(1, Math.ceil(curves.length / 12));
    $('crvSrc').textContent = curves.length + ' ' + t('条曲线') + ' · ' + pages + ' ' + t('页');
    $('favRow').innerHTML = favs.map((f, i) => '<button type="button" class="fav ' + (f ? 'filled' : 'empty') + '" data-fav="' + i + '"><span class="fk">' + t('常用') + (i + 1) + '</span><span class="fn">' + esc(f || t('空位')) + '</span></button>').join('');
    let pagesHtml = '';
    for (let p = 0; p < pages; p++) {
      const chunk = curves.slice(p * 12, p * 12 + 12);
      pagesHtml += '<div class="crv-page">' + chunk.map((c) => {
        const gi = curves.indexOf(c);
        const fs = favSlot(c.title);
        return '<div class="crv-it' + (c.title === cur ? ' sel' : '') + '" data-ci="' + gi + '"><span class="nm">' + esc(c.title) + '</span><span class="cmeta">' + curveMeta(c) + '</span>' + (fs >= 0 ? '<span class="favb">' + t('常用') + (fs + 1) + '</span>' : '') + (c.hx ? '<span class="favb">' + t('支持HEC') + '</span>' : '') + '</div>';
      }).join('') + '</div>';
    }
    $('crvScroll').innerHTML = pagesHtml;
    $('crvDots').innerHTML = Array.from({ length: pages }, (_, i) => '<i' + (i === 0 ? ' class="on"' : '') + '></i>').join('');
    wireCurveModal();
  }
  function wireCurveModal() {
    const scroll = $('crvScroll'), dots = $('crvDots');
    scroll.addEventListener('scroll', () => {
      const p = Math.round(scroll.scrollLeft / Math.max(1, scroll.clientWidth));
      dots.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i === p));
    });
    $('favRow').querySelectorAll('[data-fav]').forEach((b) => b.addEventListener('click', () => {
      const title = favs[Number(b.dataset.fav)];
      if (!title) return;
      const c = curves.find((x) => x.title === title);
      if (c) { closeLp(); selectCurve(c); }
    }));
    scroll.querySelectorAll('[data-ci]').forEach((it) => wireCurveItem(it));
  }
  function wireCurveItem(it) {
    const c = curves[Number(it.dataset.ci)];
    let lpTimer = 0, sx = 0, sy = 0, fired = false;
    it.addEventListener('pointerdown', (e) => {
      fired = false; sx = e.clientX; sy = e.clientY;
      lpTimer = setTimeout(() => { fired = true; openFavMenu(c, e.clientX, e.clientY); }, 500);
    });
    it.addEventListener('pointermove', (e) => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) clearTimeout(lpTimer); });
    it.addEventListener('pointerup', () => clearTimeout(lpTimer));
    it.addEventListener('pointercancel', () => clearTimeout(lpTimer));
    it.addEventListener('click', () => { if (fired) { fired = false; return; } closeLp(); selectCurve(c); });
    it.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function openFavMenu(c, x, y) {
    closeLp();
    const m = document.createElement('div');
    m.className = 'lp-menu';
    const slot = favSlot(c.title);
    let html = '<div class="lp-t">' + esc(c.title) + '</div>';
    for (let i = 0; i < 6; i++) {
      const f = favs[i];
      if (i === slot) html += '<div class="lp-it hot" data-slot="' + i + '"><span class="n">' + (i + 1) + '</span>' + t('移除') + '</div>';
      else if (f) html += '<div class="lp-it" data-slot="' + i + '"><span class="n">' + (i + 1) + '</span>' + t('替换') + esc(f) + '</div>';
      else html += '<div class="lp-it" data-slot="' + i + '"><span class="n">' + (i + 1) + '</span>' + t('加入到常用') + (i + 1) + '</div>';
    }
    m.innerHTML = html;
    document.body.appendChild(m);
    const mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(x - 24, window.innerWidth - mw - 8)) + 'px';
    m.style.top = Math.max(8, Math.min(y + 10, window.innerHeight - mh - 8)) + 'px';
    m.querySelectorAll('[data-slot]').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = Number(el.dataset.slot);
      if (i === favSlot(c.title)) { favs[i] = null; toast(t('已移除常用')); }
      else { const had = !!favs[i]; favs[i] = c.title; toast((had ? t('已替换常用') : t('已加入常用')) + (i + 1)); }
      saveFavs(); closeLp(); renderCurveModal();
    }));
    setTimeout(() => document.addEventListener('pointerdown', closeLp, { once: true }), 0);
  }
  function openAddrModal() {
    openModal('<h3>' + t('Decaid 地址') + '</h3><input type="text" id="addrIn" value="' + esc(baseUrl || 'http://127.0.0.1:8080') + '"><div class="modal-actions"><button class="ghost" id="addrCancel">' + t('取消') + '</button><button class="primary" id="addrOk">' + t('连接') + '</button></div>');
    $('addrCancel').addEventListener('click', closeModal);
    $('addrOk').addEventListener('click', async () => {
      const v = $('addrIn').value.trim();
      if (!/^https?:\/\/.+/.test(v)) { toast(t('地址无效')); return; }
      baseUrl = v.replace(/\/+$/, '');
      try { await dbSet('hecBaseUrl', baseUrl); } catch (_) {}
      closeModal();
      await connect();
    });
  }
  // 休眠弹窗：先实时查一次机器状态，待机才询问确认；非待机/查询失败只提示（用户 2026-11-15 定稿）
  function sleepPill(s) {
    const info = machinePillInfo();
    return '<span class="de1pill ' + info.cls + '"><span class="dot"></span>' + esc(info.label) + '</span>';
  }
  function sleepModalBody(inner, actions) {
    return '<h3>' + t('咖啡机休眠') + '</h3>' + inner + '<div class="modal-actions">' + actions + '</div>';
  }
  async function openSleepModal() {
    if (machineAsleep()) { doSleep(); return; }
    const seq = ++sleepSeq;
    openModal(sleepModalBody('<div class="sleep-check"><span class="spin"></span>' + t('正在检查机器状态') + '…</div>',
      '<button class="ghost" id="sleepCancel">' + t('取消') + '</button>'));
    $('sleepCancel').addEventListener('click', closeModal);
    const r = await httpJson('GET', '/api/v1/machine/state');
    if (seq !== sleepSeq || $('hecDim').hidden) return; // 弹窗已被取消/替换，丢弃迟到响应
    const p = (r.ok && r.body) || {};
    const m = p.machine || p;
    const st = m.state && typeof m.state === 'object' ? m.state : (p.state && typeof p.state === 'object' ? p.state : null);
    const s = String((st ? st.state : (m.state || p.state)) || '').toLowerCase();
    const sub = String((st ? st.substate : (m.substate || p.substate)) || '').toLowerCase();
    if (!r.ok || !s) {
      openModal(sleepModalBody('<p class="modal-note">' + t('无法获取机器状态') + '</p>',
        '<button class="ghost" id="sleepCancel">' + t('取消') + '</button>'));
      $('sleepCancel').addEventListener('click', closeModal);
      return;
    }
    machineStateStr = s; machineSubstate = sub; renderHeaderState();
    const stat = '<span class="k">' + t('当前状态') + '</span>' + sleepPill(s);
    if (s === 'idle' || s === 'ready') {
      openModal(sleepModalBody('<div class="sleep-stat">' + stat + '<span class="sleep-ask">' + t('确定让咖啡机休眠吗？') + '</span></div>',
        '<button class="ghost" id="sleepCancel">' + t('取消') + '</button><button class="primary" id="sleepOk">' + t('确定休眠') + '</button>'));
      $('sleepCancel').addEventListener('click', closeModal);
      $('sleepOk').addEventListener('click', doSleep);
    } else {
      openModal(sleepModalBody('<div class="sleep-stat">' + stat + '<span class="sleep-note">' + t('机器不在待机状态') + '</span></div>',
        '<button class="ghost" id="sleepCancel">' + t('知道了') + '</button>'));
      $('sleepCancel').addEventListener('click', closeModal);
    }
  }

  // ---- 模式切换 ----
  function setMode(m) {
    mode = m;
    const control = m === 'control';
    document.body.classList.toggle('hec-mode', control);
    $('replayAside').hidden = control;
    $('replayView').hidden = control;
    $('controlAside').hidden = !control;
    $('sideToggle').hidden = !control;
    $('controlView').hidden = !control;
    $('manualFetch').hidden = control;
    $('status').hidden = control;
    $('hbPill').hidden = true; $('recPill').hidden = true; $('sleepBtn').hidden = true; $('hstat').hidden = true; $('waterPill').hidden = true;
    $('modeLb').textContent = t(control ? '控制' : '回放');
    $('modeLb').dataset.i18n = control ? '控制' : '回放';
    document.querySelectorAll('#modePanel .modedrop-item').forEach((it) => it.classList.toggle('sel', it.dataset.mode === m));
    if (control) {
      renderAll();
      if (baseUrl && pluginOk && !pollTimer) startPoll();
      if (baseUrl && !machineWs) openWs();
    } else {
      stopPoll(); closeWs();
      const wl = $('whitelistBar'); if (wl) wl.hidden = false;
      // 回放页恢复自己的顶栏状态
      if (typeof renderDe1Pill === 'function') renderDe1Pill();
      if (typeof renderFetchCount === 'function') renderFetchCount();
      if (typeof layoutCards === 'function') layoutCards();
    }
    try { dbSet('hecMode', m); } catch (_) {}
  }

  // ---- 侧栏收合（v0.11：窄胶囊把手 · 平时半透明 · 分隔线断开上下两条）----
  function applySide() {
    document.body.classList.toggle('side-collapsed', sideCollapsed);
    const b = $('sideToggle');
    if (b) { b.innerHTML = sideCollapsed ? CHEV_R : CHEV_L; b.setAttribute('aria-label', sideCollapsed ? '展开侧栏' : '收起侧栏'); }
  }
  function toggleSide() {
    sideCollapsed = !sideCollapsed;
    applySide();
    try { dbSet('hecSideCollapsed', sideCollapsed ? 1 : 0); } catch (_) {}
    setTimeout(() => { if (mode === 'control') drawCharts(); }, 260);
  }

  // ---- 拨轮交互 ----
  function bump(k, dir) {
    if (k === 'weight' && isHxSelected()) { toast(t('液重由插件控制')); return; }
    const d = dial[k];
    d.v = clampDial(k, d.v + dir * d.step);
    dialDirty[k] = true;
    renderDial(k); renderApply();
  }
  function initDials() {
    document.querySelectorAll('#controlAside .dial-tri button[data-step]').forEach((b) => {
      b.addEventListener('click', () => {
        if (ext && ext.extracting) return;
        const k = b.closest('.dial').querySelector('[data-dial]').dataset.dial;
        if (k === 'weight' && isHxSelected()) { toast(t('液重由插件控制')); return; }
        bump(k, Number(b.dataset.step));
      });
    });
    document.querySelectorAll('#controlAside [data-dial]').forEach((num) => {
      const k = num.dataset.dial;
      let sy = 0, sv = 0, drag = false;
      num.addEventListener('pointerdown', (e) => { if (ext && ext.extracting) return; if (k === 'weight' && isHxSelected()) { toast(t('液重由插件控制')); return; } drag = true; sy = e.clientY; sv = dial[k].v; num.setPointerCapture(e.pointerId); });
      num.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const d = dial[k];
        const delta = (sy - e.clientY) / 7;
        d.v = clampDial(k, sv + delta * d.step);
        dialDirty[k] = true;
        renderDial(k); renderApply();
      });
      num.addEventListener('pointerup', () => { drag = false; });
      num.addEventListener('pointercancel', () => { drag = false; });
    });
  }

  // ---- 对外钩子（app.js 调用）----
  window.HxControl = {
    init: async function () {
      try { baseUrl = (await dbGet('hecBaseUrl')) || ''; } catch (_) { baseUrl = ''; }
      const savedMode = await dbGet('hecMode').catch(() => null);
      try { const sf = await dbGet('hecFavCurves'); if (Array.isArray(sf)) favs = sf.slice(0, 6).concat([null, null, null, null, null, null]).slice(0, 6); } catch (_) {}
      try { sideCollapsed = (await dbGet('hecSideCollapsed')) === 1; } catch (_) {}
      initDials();
      if (window.HxShadow) window.HxShadow.load();
      $('sideToggle').addEventListener('click', toggleSide);
      applySide();
      $('sideToggle').hidden = mode !== 'control';
      $('curveBtn').addEventListener('click', openCurveModal);
      $('connBtn').addEventListener('click', openAddrModal);
      $('applyBtn').addEventListener('click', applyDials);
      $('sleepBtn').addEventListener('click', openSleepModal);
      $('hbPill').addEventListener('click', () => { if (connState === 'ok' && pluginOk && hecMode && !helloOk) hello(); });
      $('hecDim').addEventListener('click', (e) => { if (e.target === $('hecDim')) closeModal(); });
      $('hecRawToggle').addEventListener('change', function () { rawOn = this.checked; drawCharts(); });
      document.querySelectorAll('#rawWin [data-rw]').forEach((b) => b.addEventListener('click', () => rawWinStep(Number(b.dataset.rw))));
      renderRawWin();
      $('modeBtn').addEventListener('click', (e) => { e.stopPropagation(); $('modePanel').hidden = !$('modePanel').hidden; });
      document.addEventListener('click', () => { $('modePanel').hidden = true; });
      document.querySelectorAll('#modePanel .modedrop-item').forEach((it) => it.addEventListener('click', () => { setMode(it.dataset.mode); $('modePanel').hidden = true; }));
      window.addEventListener('resize', () => { if (mode === 'control') drawCharts(); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden && mode === 'control' && baseUrl && pluginOk) { hello(); } });
      renderDial('temp'); renderDial('weight');
      setMode(savedMode === 'replay' ? 'replay' : 'control');
      if (baseUrl) connect();
      // recorder 是否安装（决定非 HyperEx 在录胶囊）
      if (baseUrl) {
        httpJson('GET', '/api/v1/plugins').then((r) => {
          recorderOn = !!(r.ok && Array.isArray(r.body) && r.body.some((p) => p.id === RECORDER_ID && p.loaded !== false));
        });
      }
    },
    onLang: function () {
      if (mode === 'control') { renderAll(); }
      renderRawWin();
      $('modeLb').textContent = t(mode === 'control' ? '控制' : '回放');
      $('modeSub1').textContent = t('选曲线 · 调温重量 · 实时调流');
      $('modeSub2').textContent = t('ProfileReplayer 原页');
      if (window.HxLearn && window.HxLearn.onLang) window.HxLearn.onLang();
    },
    // 学习中心弹窗拉在线数据用（只读 GET，走同一条桥）
    httpJson: httpJson,
    onMachine: function (st) {
      // 回放页的 10s 轮询也喂控制页状态（WS 之外的兜底）
      if (st && st.ok && st.state) { machineStateStr = st.state; if (mode === 'control') renderHeaderState(); }
    },
    // 供联调/回归脚本注入快照（模拟器无真机时）
    _injectMachine: onMachineSnapshot,
    _injectScale: onScaleSnapshot,
    _injectWater: onWaterSnapshot,
    // 联调/回归用：注入检测点并重画（验证超长示意标注）
    _injectChecks: function (cks) { checks = cks.slice(); lastCheck = checks[checks.length - 1] || null; drawCharts(); },
    _state: function () { return { mode, baseUrl, connState, pluginVersion, pluginOk, hecMode, helloOk, ext, checks: checks.length, samples: run ? run.samples.length : 0, runEnded, water, shadow: window.HxShadow ? window.HxShadow.status() : null }; },
  };
})();

