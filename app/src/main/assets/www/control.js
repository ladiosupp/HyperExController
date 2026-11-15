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
  const TEMP_LO = 88, TEMP_HI = 96;
  const tempNorm = (c) => Math.max(0, Math.min(10, (c - TEMP_LO) / (TEMP_HI - TEMP_LO) * 10));
  const C = { raw: '#63d89b', decaid: '#c77dff', target: '#f0c75e', cmd: '#e8833a', press: '#63d89b', mflow: '#6ea8fe', temp: '#f2a0aa', vec: '#8fd7ff', vecdn: '#e9c276', grid: '#232830', axis: '#7d8592' };
  const PHASE_LABEL = { stage1: 'S1', stage2: 'S2', stage3: 'S3', dumping: '泄压', soak: '浸泡', restart_wait: '等 GHC', finishing: '收尾', idle: 'IDLE', aborted: '中止' };
  const PHASE_PILL = { stage1: ['#20304d', '#9cc0ff'], stage2: ['#3d2c17', '#f5c078'], stage3: ['#173a2a', '#8fe0b0'], dumping: ['#3d1d22', '#f2a0aa'], soak: ['#322040', '#d5a8f5'], idle: ['#2a2f37', '#cfd5de'] };
  const STAGE_BAND = { stage1: 'rgba(110,168,254,.10)', dumping: 'rgba(242,144,154,.08)', soak: 'rgba(199,125,255,.08)', stage2: 'rgba(245,164,66,.10)', stage3: 'rgba(99,216,155,.10)' };

  // ---- 中英文（控制页自己的键；回放页键在 app.js 的 EN）----
  const EN = {
    '控制': 'Control', '回放': 'Replay', 'modeSub1': 'curve · temp/weight · live trim', 'modeSub2': 'ProfileReplayer page',
    '曲线选择': 'Curve select', '萃取温度': 'Brew temp', '萃取液重': 'Beverage weight', '应用': 'Apply',
    'Decaid 地址': 'Decaid address', '本杯锁定': 'shot locked', '插件': 'Plugin', '逻辑帧': 'Frame',
    '基值/当前': 'Base/now', '目标杯流': 'Target', '限压': 'Limiter', '接管原因': 'Reason', '接管时刻': 'At', '当前指令': 'Command',
    '时刻': 'Time', '相位': 'Phase', '秤重': 'Weight', '杯流': 'Flow', '压力': 'Pressure', '温度': 'Temp', '趋势角': 'Trend°', '机器流量': 'Machine flow',
    '杯流 (g/s)': 'Flow (g/s)',
    '握手': 'Handshake', '未握手 · 只读': 'No handshake · read-only', 'recorder 在录': 'recorder recording',
    '插件已接管本杯': 'Plugin took over', '只读 · 下一杯恢复': 'read-only · resumes next shot',
    '接管横幅': 'Plugin took over · command returned to base, chart continues',
    '咖啡机休眠': 'Machine sleep', '唤醒': 'Wake', '已休眠': 'Asleep', '萃取中': 'Extracting', '待机': 'Idle', '睡眠': 'Sleep', '未连接': 'Offline',
    '休眠标题': 'Put machine to sleep', '休眠说明': 'This aborts the current shot and puts the DE1 into standby (boiler cools, heating stops). Wake anytime.',
    '取消': 'Cancel', '连接': 'Connect', '连接失败': 'Connect failed', '选择曲线': 'Select curve',
    'HyperEx': 'HyperEx', '非HyperEx': 'Non-HyperEx', '非 HyperEx · 只读': 'Non-HyperEx · read-only', 'HyperEx · 插件接管': 'HyperEx · takeover',
    '预算': 'Budget', '拒绝': 'Rejects', '调流·写入': 'Trim·write', '检测': 'Check', '相位切换': 'Phase',
    'decaid 杯流': 'decaid flow', '目标杯流': 'Target flow', '矢量·增': 'Vector up', '矢量·减': 'Vector down',
    '机器流量': 'Machine flow', '目标指令': 'Target cmd', 'APK 指令': 'APK cmd',
    '插件版本过低': 'Plugin too old', '需要插件': 'Requires plugin', '升级提示': 'HEC needs plugin ≥ 2.2.48. Update HyperEx Pulse Filter, then reconnect.',
    '切档失败': 'Mode switch failed', '本杯进行中': 'Shot in progress; mode applies next shot.',
    '应用失败': 'Apply failed', '已应用': 'Applied', '温度已应用': 'Temperature applied', '液重已应用': 'Weight applied',
    '曲线已切换': 'Curve sent', '切换失败': 'Switch failed', '空闲才能改': 'Only while idle',
    '未连接 Decaid': 'Decaid not connected', '地址无效': 'Invalid address',
    '无曲线': 'No curves', '加载曲线失败': 'Failed to load curves',
    '接管': 'Takeover', '心跳断': 'Heartbeat lost',
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
  let machineWs = null, scaleWs = null, wsRetry = 0;
  let run = null;                  // 当前杯实时缓冲
  let checks = [];                 // 趋势角检测点
  let lastCheck = null;
  let toastTimer = 0;
  let curves = [];                 // {id,title,hx,profile}
  let selectedCurve = null;
  let liveProfile = null;          // GET /workflow 的 profile
  let savedProfile = null;         // 选中曲线的存储记录（温度平移的形状基准）
  let dial = { temp: { v: 92, min: 70, max: 100, step: .5 }, weight: { v: 36, min: 10, max: 300, step: .5 } };
  let dialDirty = { temp: false, weight: false };
  let applying = false;
  let rawOn = true;
  let recorderOn = false;
  let machineStateStr = '';
  let takeLast = null;
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
    const r = await httpJson('POST', pluginPath('external-hello'), { client: 'HyperExController', version: appVer() });
    helloOk = !!(r.ok && r.body && r.body.ok);
    if (helloOk && r.body) ext = r.body;
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
  function appVer() { try { return (window.HxBridge && window.HxBridge.appVersion()) || '0.1'; } catch (_) { return '0.1'; } }

  // ---- 实时杯缓冲（WS 驱动）----
  function newRun() {
    return { startedAt: Date.now(), samples: [], phases: [], lastPhase: null, lastWeight: null, lastStamp: null, lastRaw: null, cmd: [], lastCmd: null };
  }
  function runT() { return run ? (Date.now() - run.startedAt) / 1000 : 0; }
  function noteExternal(x) {
    // 相位色带 / 接管锁存 / 指令台账（事件日志卡已移除，只保留状态）
    if (!x) return;
    if (x.phase && run && x.phase !== run.lastPhase) {
      run.phases.push({ t: runT(), phase: x.phase });
      run.lastPhase = x.phase;
    }
    if (x.takeover && (!takeLast || takeLast.atMs !== x.takeover.atMs)) {
      takeLast = x.takeover;
    }
    if (!x.takeover) takeLast = null;
    if (Number.isFinite(x.lastCommandMlS) && run && x.lastCommandMlS !== run.lastCmd) {
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
    const extracting = st === 'espresso';
    if (extracting && !run) {
      run = newRun(); checks = []; lastCheck = null; takeLast = null;
      // 开杯即落第一段色带：用插件当前相位（握手/轮询可能晚于机器快照）
      const ph = (ext && ext.phase) || 'stage1';
      run.phases.push({ t: 0, phase: ph });
      run.lastPhase = ph;
    }
    if (!extracting && run && (st === 'idle' || st === 'ready' || st === 'sleeping')) { run = null; }
    renderHeaderState();
    drawCharts();
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
    if (run && run.lastWeight != null) {
      const drop = run.lastWeight - weight;
      tare = Number.isFinite(drop) && drop >= TARE_RESET_THRESHOLD_G;
      const dt = (stamp != null && run.lastStamp != null) ? stamp - run.lastStamp : null;
      if (!tare && dt != null && dt > 0 && dt <= 10) raw = (weight - run.lastWeight) / dt;
    }
    scale = { weight, weightFlow: Number.isFinite(wf) ? wf : null, raw, tare, at: now };
    if (run) {
      run.lastWeight = weight; if (stamp != null) run.lastStamp = stamp;
      const s = { t: runT(), weight, decaid: scale.weightFlow, raw, tare, phase: (ext && ext.phase) || run.lastPhase || 'stage1', pressure: machine && machine.pressure, mflow: machine && machine.flow, tcmd: machine && machine.targetFlow, cmd: ext ? ext.lastCommandMlS : null, temp: machine && machine.mix };
      run.samples.push(s);
      if (run.samples.length > 4000) run.samples.shift();
      maybeCheck(s);
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
      scaleWs = new WebSocket(wsBase() + '/ws/v1/scale/snapshot');
      scaleWs.onmessage = (e) => { try { onScaleSnapshot(JSON.parse(e.data)); } catch (_) {} };
      scaleWs.onclose = () => scheduleWsRetry();
      scaleWs.onerror = () => { try { scaleWs.close(); } catch (_) {} };
    } catch (_) {}
  }
  function closeWs() {
    for (const w of [machineWs, scaleWs]) { if (w) { w.onclose = null; try { w.close(); } catch (_) {} } }
    machineWs = scaleWs = null;
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
    const tw = Number(liveProfile.target_weight);
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
        if (isHxSelected()) {
          const r = await httpJson('POST', pluginPath('settings'), { FinalWeight: dial.weight.v });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          // settings 会 reload 插件 → 丢心跳 → 重发 hello
          setTimeout(() => { hello(); }, 1500);
        } else {
          const r = await httpJson('PUT', '/api/v1/workflow', { profile: { target_weight: dial.weight.v } });
          if (!r.ok) throw new Error('HTTP ' + r.status);
        }
        dialDirty.weight = false;
        toast(t('液重已应用') + ' ' + dial.weight.v.toFixed(1) + ' g');
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
    const r = await httpJson('PUT', '/api/v1/workflow', { profile: c.profile });
    if (!r.ok) { toast(t('切换失败') + ': HTTP ' + r.status); return; }
    selectedCurve = c; savedProfile = c.profile;
    await loadWorkflow();
    closeModal();
    toast(t('曲线已切换'));
  }

  // ---- 休眠 / 唤醒 ----
  const MOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function machineAsleep() { return String(machineStateStr || '').toLowerCase() === 'sleeping'; }
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
    b.disabled = locked || (!dialDirty.temp && !dialDirty.weight);
    document.querySelectorAll('#controlAside .dial').forEach((d) => {
      if (d.classList.contains('curve-card')) return;
      d.classList.toggle('locked', locked);
    });
  }
  function renderHeaderState() {
    const pill = $('de1Pill'), txt = $('de1PillTxt');
    if (mode !== 'control') return;
    const wl = $('whitelistBar'); if (wl) wl.hidden = true;
    const s = String(machineStateStr || '');
    let cls = 'off', label = t('未连接');
    if (s === 'sleeping') { cls = 'sleep'; label = t('已休眠'); }
    else if (s === 'espresso') { cls = 'espresso'; label = t('萃取中'); }
    else if (s === 'idle' || s === 'ready') { cls = 'idle'; label = t('待机'); }
    else if (s) { cls = 'idle'; label = s; }
    pill.className = 'de1pill ' + cls;
    txt.textContent = label;
    // 握手胶囊
    const hb = $('hbPill'), hbt = $('hbPillTxt');
    const taken = !!(ext && ext.takeover);
    if (taken) { hb.className = 'hb bad'; hbt.textContent = t('插件已接管本杯'); hb.hidden = false; }
    else if (helloOk && ext && ext.heartbeat) { hb.className = 'hb ok'; hbt.textContent = t('握手') + ' ' + ((ext.heartbeat.ageMs || 0) / 1000).toFixed(1) + ' s'; hb.hidden = false; }
    else if (connState === 'ok' && !hecMode) { hb.className = 'hb off'; hbt.textContent = t('未握手 · 只读'); hb.hidden = false; }
    else { hb.hidden = true; }
    // recorder 胶囊：非 HyperEx 且机器在录
    $('recPill').hidden = !(connState === 'ok' && !isHxSelected() && s === 'espresso' && recorderOn);
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
    if (hx) html += card(t('相位'), '<span class="phasepill" style="background:' + pill[0] + ';color:' + pill[1] + '">' + esc(phaseName(phase)) + '</span>');
    html += card(t('秤重'), f1(s.weight) + '<small>g</small>');
    html += card(t('杯流'), f2(s.decaid != null ? s.decaid : s.raw) + '<small>g/s</small>');
    html += card(t('压力'), f2(m.pressure) + '<small>bar</small>');
    html += card(t('温度'), f1(m.mix) + '<small>°C</small>');
    if (hx) html += card(t('趋势角'), (lastCheck ? lastCheck.ang : '—') + '<sup class="deg">°</sup>');
    else html += card(t('机器流量'), f2(m.flow) + '<small>ml/s</small>');
    box.innerHTML = html;
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
      const tgt = samples.map((s) => [s.t, ext && ext.targetGS != null && hx ? ext.targetGS : null]);
      if (hx) line(ctx, tgt, pad, w, h, xMax, yMin, yMax, C.target, 1.2, [5, 4]);
      line(ctx, samples.map((s) => [s.t, s.decaid]), pad, w, h, xMax, yMin, yMax, C.decaid, 1.4);
      if (rawOn) line(ctx, samples.map((s) => [s.t, s.raw]), pad, w, h, xMax, yMin, yMax, C.raw, 1.8);
      if (hx) vecArrows(ctx, checks, pad, w, h, xMax, yMin, yMax);
      if (run) nowLine(ctx, w, h, pad, xMax, runT());
    }
    // 压力温度图
    const b = setup('hcPress');
    if (b) {
      const { ctx, w, h } = b;
      const yMin = 0, yMax = 10;
      const p2 = { l: pad.l, r: 32, t: pad.t, b: pad.b };
      if (hx && run) bands(ctx, w, h, pad, xMax, run.phases);
      axes(ctx, w, h, pad, yMin, yMax);
      ctx.fillStyle = C.temp; ctx.font = '10px ui-monospace,monospace';
      for (let i = 0; i <= 4; i++) { const y = p2.t + (h - p2.t - p2.b) * i / 4; ctx.fillText((10 - 2.5 * i).toFixed(0), w - 26, y + 3); }
      if (hx) {
        line(ctx, samples.map((s) => [s.t, s.tcmd]), pad, w, h, xMax, yMin, yMax, C.target, 1.2, [5, 4]);
        stepLine(ctx, run ? run.cmd : [], pad, w, h, xMax, yMin, yMax, C.cmd, 1.8);
      }
      line(ctx, samples.map((s) => [s.t, s.mflow]), pad, w, h, xMax, yMin, yMax, C.mflow, 1.2);
      line(ctx, samples.map((s) => [s.t, s.pressure]), pad, w, h, xMax, yMin, yMax, C.press, 1.6);
      line(ctx, samples.map((s) => [s.t, s.temp != null ? tempNorm(s.temp) : null]), p2, w, h, xMax, 0, 10, C.temp, 1.6);
      if (run) nowLine(ctx, w, h, pad, xMax, runT());
    }
    renderLegends(hx);
  }
  function renderLegends(hx) {
    const lg = (id, items) => { const el = $(id); if (el) el.innerHTML = items.map((it) => '<span class="lg' + (it.dash ? ' dash' : '') + (it.arrow ? ' arrow' : '') + '" style="color:' + it.c + '"><i style="background:' + it.c + '"></i><span style="color:#aab2bf">' + it.l + '</span></span>').join(''); };
    const flow = [{ l: t('decaid 杯流'), c: C.decaid }, { l: 'RAW dW/dt', c: C.raw }];
    if (hx) flow.push({ l: t('目标杯流'), c: C.target, dash: 1 }, { l: t('矢量·增'), c: C.vec, arrow: 1 }, { l: t('矢量·减'), c: C.vecdn, arrow: 1 });
    lg('lgFlow', flow);
    const press = [{ l: t('压力'), c: C.press }, { l: t('机器流量'), c: C.mflow }];
    if (hx) press.push({ l: t('目标指令'), c: C.target, dash: 1 }, { l: t('APK 指令'), c: C.cmd });
    press.push({ l: t('温度'), c: C.temp });
    lg('lgPress', press);
  }

  // ---- 弹窗 ----
  function openModal(inner) { const d = $('hecDim'); d.innerHTML = '<div class="modal">' + inner + '</div>'; d.hidden = false; }
  function closeModal() { const d = $('hecDim'); d.hidden = true; d.innerHTML = ''; }
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
  function openCurveModal() {
    if (!curves.length) { toast(t('无曲线')); return; }
    const cur = (liveProfile && liveProfile.title) || '';
    openModal('<h3>' + t('选择曲线') + '</h3><div class="mlist">' + curves.map((c, i) => '<div class="mitem' + (c.title === cur ? ' sel' : '') + '" data-ci="' + i + '"><span>' + esc(c.title) + '</span><span class="mtag' + (c.hx ? '' : ' plain') + '">' + (c.hx ? t('HyperEx') : t('非HyperEx')) + '</span></div>').join('') + '</div>');
    $('hecDim').querySelectorAll('[data-ci]').forEach((it) => it.addEventListener('click', () => selectCurve(curves[Number(it.dataset.ci)])));
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
  function openSleepModal() {
    if (machineAsleep()) { doSleep(); return; }
    openModal('<h3>' + t('休眠标题') + '</h3><p class="modal-note">' + t('休眠说明') + '</p><div class="modal-actions"><button class="ghost" id="sleepCancel">' + t('取消') + '</button><button class="primary" id="sleepOk">' + t('咖啡机休眠') + '</button></div>');
    $('sleepCancel').addEventListener('click', closeModal);
    $('sleepOk').addEventListener('click', doSleep);
  }

  // ---- 模式切换 ----
  function setMode(m) {
    mode = m;
    const control = m === 'control';
    document.body.classList.toggle('hec-mode', control);
    $('replayAside').hidden = control;
    $('replayView').hidden = control;
    $('controlAside').hidden = !control;
    $('controlView').hidden = !control;
    $('manualFetch').hidden = control;
    $('status').hidden = control;
    $('hbPill').hidden = true; $('recPill').hidden = true; $('sleepBtn').hidden = true; $('hstat').hidden = true;
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

  // ---- 拨轮交互 ----
  function bump(k, dir) {
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
        bump(k, Number(b.dataset.step));
      });
    });
    document.querySelectorAll('#controlAside [data-dial]').forEach((num) => {
      const k = num.dataset.dial;
      let sy = 0, sv = 0, drag = false;
      num.addEventListener('pointerdown', (e) => { if (ext && ext.extracting) return; drag = true; sy = e.clientY; sv = dial[k].v; num.setPointerCapture(e.pointerId); });
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
      initDials();
      $('curveBtn').addEventListener('click', openCurveModal);
      $('connBtn').addEventListener('click', openAddrModal);
      $('applyBtn').addEventListener('click', applyDials);
      $('sleepBtn').addEventListener('click', openSleepModal);
      $('hecDim').addEventListener('click', (e) => { if (e.target === $('hecDim')) closeModal(); });
      $('hecRawToggle').addEventListener('change', function () { rawOn = this.checked; drawCharts(); });
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
      $('modeLb').textContent = t(mode === 'control' ? '控制' : '回放');
    },
    onMachine: function (st) {
      // 回放页的 10s 轮询也喂控制页状态（WS 之外的兜底）
      if (st && st.ok && st.state) { machineStateStr = st.state; if (mode === 'control') renderHeaderState(); }
    },
    // 供联调/回归脚本注入快照（模拟器无真机时）
    _injectMachine: onMachineSnapshot,
    _injectScale: onScaleSnapshot,
    // 联调/回归用：注入检测点并重画（验证超长示意标注）
    _injectChecks: function (cks) { checks = cks.slice(); lastCheck = checks[checks.length - 1] || null; drawCharts(); },
    _state: function () { return { mode, baseUrl, connState, pluginVersion, pluginOk, hecMode, helloOk, ext, checks: checks.length, samples: run ? run.samples.length : 0 }; },
  };
})();

