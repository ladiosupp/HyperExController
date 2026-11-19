// 杯末总结弹窗（用户 2026-11-18 批准示意稿 hec-shot-summary 后实施）。
// 分数公式 v2 / 窗口链逐行移植 plugin.js controlOutputQuality（含磁盘现状 reduced-window 重复 push 怪癖，照抄保真）。
// 在线主源 /diagnostics controlReview；杯末算毕持久化进归档 shot.summary；回看读持久化，插件导出历史杯走移植链，旧杯 compact 降级。
// 红线：不碰影子发送/仲裁/温度链路/HX 液重；TDS 仅本地展示，不喂增益记忆。
(function () {
  'use strict';
  const EN = { '本杯总结': 'Shot summary', '本杯控制分': 'Shot control score', '杯数据补充（仅完整档）': 'Cup extras (Full only)', '下一杯建议': 'Next-shot advice', '决策与仲裁': 'Decisions & arbitration', '研磨建议': 'Grind advice', 'TDS（可选）': 'TDS (optional)', '来源': 'Source', '简单': 'Simple', '标准': 'Standard', '完整': 'Full', '显示颗粒度': 'Display granularity', '杯末总结弹窗': 'Shot summary popup', 'TDS 未录': 'TDS not entered', '未录': 'Not entered', '加权 · 提案待确认': 'Weighted · proposal', '数据不足': 'Insufficient data', '不评分 · 5 指标缺': 'Not scored · metrics missing', '异常中止 · 不评分': 'Aborted · not scored', '只建议，不自动改': 'Advice only, no auto change', '阶段时长': 'Stage durations', '压力': 'Pressure', '供水峰': 'Refill peak', '研磨阻力': 'Grind resistance', '增益带': 'Gain band', '与上一杯': 'Vs previous cup', '上一杯不可评分': 'Previous cup not scoreable', '粉量 g（可选）': 'Dose g (optional)', 'TDS %（目标 3.5）': 'TDS % (target 3.5)', '阶段': 'Stage', '当前 ml/s': 'Current ml/s', '建议 ml/s': 'Suggested ml/s', '动作': 'Action', '置信': 'Confidence', '已自动应用': 'Auto-applied', '保留当前指令': 'Hold current commands', '在线': 'Online', '插件数据未就绪': 'Plugin data not ready', '本杯无影子记录': 'No shadow record for this cup', '离线归档': 'Offline archive', '均值只报告': 'mean reported only', '只报告，权重 0': 'reported only, weight 0', '权重重分配': 'weights renormalized', '缩减窗': 'reduced window', '杯末不自动弹': 'No auto popup', '回看保留': 'Review kept', '加权': 'Weighted', '再来一杯': 'Brew another', '确认重算': 'Confirm & recalc', '研磨度格数': 'Grind clicks', '研磨': 'Grind', '加权分': 'Weighted score', '控制分': 'Control score', '缺数据': 'Missing data' };
  Object.assign(EN, { '控制': 'Control', '分带': 'band', '写入': 'writes', '供水': 'refill', '常规': 'normal', '救急': 'rescue', '反转': 'reversals', '平台过冲': 'plateau over', '过冲': 'overshoot', '平台': 'plateau', '长段': 'long stage', '启动': 'startup', '整段': 'whole', '尾均': 'tail mean', '尾': 'tail', '扣分': 'deductions', '原始': 'raw', '整杯': 'whole cup', '中位': 'med', '峰': 'peak', '限压命中': 'limit hits', '滚动回归口径': 'rolling regression', '桶中心': 'bucket centre', '平滑': 'smoothed', '置信': 'conf', '分': 'pts', '匹配': 'match', '杯末持久化总结': 'persisted at cup end', '移植': 'ported', '本地影子': 'local shadow', '帧切换': 'frame changes', '插件写入': 'plugin writes', '置信中位': 'confidence median', '决策': 'decisions', '校准素材，非增益裁判': 'calibration material, not a gain verdict', '离线训练乐观口径': 'offline-training optimistic bound', '中止杯不给研磨建议': 'No grind advice for aborted cups', '平台 + 供水': 'plateau + refill' });
  function t(k) { try { return (typeof lang !== 'undefined' && lang === 'en' && EN[k]) ? EN[k] : (window.t ? window.t(k) : k); } catch (_) { return k; } }
  const $ = (id) => document.getElementById(id);
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  const round = (v, n) => { const x = Number(v); if (!Number.isFinite(x)) return null; const p = Math.pow(10, n == null ? 2 : n); return Math.round(x * p) / p; };
  const average = (a) => (a && a.length) ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const median = (a) => { if (!a || !a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function linearRegression(points) {
    const n = points.length; if (n < 2) return null;
    let mx = 0, my = 0; for (const p of points) { mx += p.x; my += p.y; } mx /= n; my /= n;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of points) { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    if (sxx <= 0) return null;
    const slope = sxy / sxx;
    const r2 = syy > 0 ? Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy))) : 1;
    return { slope, r2, n };
  }
  const rawTimeSecondsForSample = (s) => { const ts = Number(s && s.scaleTimestampSeconds); return Number.isFinite(ts) ? ts : Number(s && s.tMs) / 1000; };
  function regressionForRawSamples(samples) {
    if (!Array.isArray(samples) || samples.length < 4) return null;
    const points = samples.map((s) => ({ x: rawTimeSecondsForSample(s), y: Number(s.weightG) }));
    const reg = linearRegression(points); if (!reg) return null;
    const xs = points.map((p) => p.x).filter(Number.isFinite);
    const span = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    return { slope: round(reg.slope, 3), r2: round(reg.r2, 5), samples: reg.n, seconds: round(span, 2) };
  }
  // ---- 窗口链移植（plugin.js 同口径）----
  function phaseRawSamplesUntrimmed(run, phase) {
    if (!run || !Array.isArray(run.rawScaleSamples)) return [];
    let raw = run.rawScaleSamples.filter((s) => s.phase === phase && Number.isFinite(Number(s.weightG))).slice().sort((a, b) => Number(a.tMs) - Number(b.tMs));
    if (!raw.length) return raw;
    let lastReset = -1;
    for (let i = 0; i < raw.length; i++) if (raw[i].tareReset) lastReset = i;
    if (lastReset >= 0) raw = raw.slice(lastReset + 1);
    return raw;
  }
  function stage2CupOnset(run, source) {
    const raw = source || phaseRawSamplesUntrimmed(run, 'stage2');
    const target = Number(run && run.config && run.config.stage2Flow) || 5;
    const threshold = Math.max(.05, target * .01), seen = new Set(), window = [];
    for (const row of raw) {
      const stamp = num(row.scaleTimestampSeconds), weight = num(row.weightG), at = num(row.tMs);
      if (stamp === null || weight === null || at === null || seen.has(stamp)) continue;
      if (window.length && (stamp <= window[window.length - 1].x || stamp - window[window.length - 1].x > .6 || weight < window[window.length - 1].y - .2)) window.length = 0;
      seen.add(stamp); window.push({ x: stamp, y: weight, at });
      while (window.length && stamp - window[0].x > 2.05 + 1e-9) window.shift();
      if (window.length < 4 || stamp - window[0].x < .39 || weight - window[0].y < .2 - 1e-9) continue;
      const fit = linearRegression(window); if (!fit || fit.r2 < .85 || fit.slope < threshold) continue;
      const rise = window.findIndex((p) => p.y - window[0].y >= .05 - 1e-9);
      let onsetIndex = Math.max(0, rise - 1);
      while (onsetIndex > 0 && window[onsetIndex].y > window[onsetIndex - 1].y + 1e-9) onsetIndex--;
      const start = window[onsetIndex];
      const event = (run.events || []).find((x) => x.name === 'stage2_start');
      const phaseStart = event && Number.isFinite(Number(event.tMs)) ? Number(event.tMs) : Number(raw[0].tMs);
      return { detected: true, startMs: start.at, delayS: round(Math.max(0, start.at - phaseStart) / 1000, 3), confirmedAtMs: at, thresholdGS: threshold };
    }
    return { detected: false, startMs: null, confirmedAtMs: null, thresholdGS: threshold };
  }
  function phaseRawSamples(run, phase) {
    const raw = phaseRawSamplesUntrimmed(run, phase);
    if (phase !== 'stage2') return raw;
    const onset = stage2CupOnset(run, raw);
    return onset.detected ? raw.filter((s) => Number(s.tMs) >= onset.startMs) : [];
  }
  const S2_REFILL_SETTLE_MS = 800, S2_REFILL_CHAIN_SETTLE_MS = 1500;
  function s2LearningWindow(run, consumer) {
    const settleMs = consumer === 'chain' ? S2_REFILL_CHAIN_SETTLE_MS : S2_REFILL_SETTLE_MS;
    const out = { refill: false, confirmed: false, startMs: null, settleMs, chainSettleMs: S2_REFILL_CHAIN_SETTLE_MS, reason: null };
    const cfg = (run && run.config) || {}, trace = (run && run.liveFlowTrim && run.liveFlowTrim.trace) || [];
    const plan = cfg.s2StartupPlan || {};
    const boost = trace.find((x) => x.kind === 'write' && x.startupAction === 'boost');
    if (plan.strategy !== 'refill-85' || !boost) return out;
    out.refill = true;
    const complete = trace.find((x) => x.kind === 'startup-complete' && Number(x.frame) === 1);
    if (!complete) { out.reason = 'refill-return-unconfirmed'; return out; }
    out.confirmed = true;
    out.startMs = Number(complete.tMs) + settleMs;
    return out;
  }
  function stage2PlateauStartMs(run) {
    const win = s2LearningWindow(run);
    if (win.refill && !win.confirmed) return null;
    const base = Number.isFinite(win.startMs) ? win.startMs : null;
    const raw = phaseRawSamples(run, 'stage2');
    if (!raw.length) return null;
    let peak = -Infinity;
    for (const x of raw) { const v = Number(x.decaidWeightFlowGS); if (Number.isFinite(v) && v > peak) peak = v; }
    if (!Number.isFinite(peak)) return null;
    const peakRow = raw.find((x) => Number(x.decaidWeightFlowGS) >= peak * .95);
    if (!peakRow) return null;
    const peakAt = Number(peakRow.tMs);
    const afterPeak = Number.isFinite(peakAt) ? peakAt + 1500 : null;
    const start = base === null ? afterPeak : Math.max(base, afterPeak);
    const lastAt = Number(raw[raw.length - 1].tMs);
    if (Number.isFinite(lastAt) && Number.isFinite(start) && start > lastAt - 1200) {
      return base === null ? lastAt - 1200 : Math.max(base, lastAt - 1200);
    }
    return start;
  }
  function desiredRealForRunPhase(run, phase) {
    const cfg = (run && run.config) || {};
    if (phase === 'stage1') return num(cfg.stage1Flow);
    if (phase === 'stage2') return num(cfg.stage2Flow);
    if (phase === 'stage3') return num(cfg.stage3Flow);
    return null;
  }
  function diagnosticRawRegression(run, phase) {
    if (!run || !Array.isArray(run.rawScaleSamples)) return null;
    let raw = phaseRawSamples(run, phase);
    if (raw.length < 4) return null;
    const firstTMs = Number(raw[0].tMs);
    const settleSeconds = phase === 'stage1' ? 0.25 : phase === 'stage2' ? 0 : 2.0;
    let use = raw.filter((s) => Number(s.tMs) - firstTMs >= settleSeconds * 1000);
    if (use.length < 5) use = raw.filter((s) => Number(s.tMs) - firstTMs >= 100);
    if (use.length < 4) use = raw;
    const points = use.map((s) => ({ x: rawTimeSecondsForSample(s), y: Number(s.weightG) }));
    const reg = linearRegression(points); if (!reg) return null;
    const times = points.map((p) => p.x).filter(Number.isFinite);
    const span = times.length ? Math.max(...times) - Math.min(...times) : 0;
    return { slope: round(reg.slope, 3), r2: round(reg.r2, 5), samples: reg.n, seconds: round(span, 2) };
  }
  function controlOutputQuality(run, phase) {
    const target = desiredRealForRunPhase(run, phase), whole = diagnosticRawRegression(run, phase);
    const win = phase === 'stage2' ? s2LearningWindow(run) : null;
    const plateauStart = phase === 'stage2' ? stage2PlateauStartMs(run) : null;
    const cutoffMs = phase === 'stage2' ? (plateauStart !== null ? plateauStart : (win && Number.isFinite(win.startMs) ? win.startMs : null)) : (win && Number.isFinite(win.startMs) ? win.startMs : null);
    if (win && win.refill && !win.confirmed) return { available: false, reason: 'refill-return-unconfirmed', windowSettleMs: win.settleMs, chainSettleMs: win.chainSettleMs };
    const all = phaseRawSamples(run, phase), raw = cutoffMs === null ? all : all.filter((x) => Number(x.tMs) >= cutoffMs);
    const lastAt = all.length ? Number(all[all.length - 1].tMs) : null;
    const plateauFallback = phase === 'stage2' && plateauStart !== null && Number.isFinite(lastAt) && plateauStart >= lastAt - 1200 - 1;
    if (!target) return { available: false, reason: 'no-target' };
    if (raw.length < 6) return { available: false, reason: cutoffMs === null || all.length < 6 ? 'raw-samples-insufficient' : 'learning-window-too-short', rawSamples: all.length, windowSamples: raw.length };
    const stamps = new Set(), data = raw.filter((x) => { const tt = num(x.scaleTimestampSeconds); if (tt === null || stamps.has(tt)) return false; stamps.add(tt); return true; });
    if (data.length < 6) return { available: false, reason: 'raw-samples-insufficient' };
    const lo = Number(data[0].scaleTimestampSeconds), hi = Number(data[data.length - 1].scaleTimestampSeconds);
    const tail = phase === 'stage2' && plateauStart !== null ? lo : lo + (hi - lo) * .4;
    const flows = [], flowStamps = [];
    for (let i = 0; i < data.length; i++) {
      const end = Number(data[i].scaleTimestampSeconds); if (end < tail + 1.2) continue;
      const rows = data.slice(0, i + 1).filter((x) => Number(x.scaleTimestampSeconds) >= Math.max(tail, end - 2));
      if (rows.length < 6 || rows.some((x, j) => j > 0 && (Number(x.scaleTimestampSeconds) <= Number(rows[j - 1].scaleTimestampSeconds) || Number(x.scaleTimestampSeconds) - Number(rows[j - 1].scaleTimestampSeconds) > .6))) continue;
      const r = regressionForRawSamples(rows);
      if (r && r.seconds >= 1.2 && r.r2 >= .90 && r.slope > 0) { flows.push(r.slope); flowStamps.push(end); }
    }
    let reducedWindow = false;
    if (!flows.length && phase === 'stage2' && data.length >= 6) {
      for (let i = 0; i < data.length; i++) {
        const end = Number(data[i].scaleTimestampSeconds); if (end < tail + 0.8) continue;
        const rows = data.slice(0, i + 1).filter((x) => Number(x.scaleTimestampSeconds) >= Math.max(tail, end - 2));
        if (rows.length < 6 || rows.some((x, j) => j > 0 && (Number(x.scaleTimestampSeconds) <= Number(rows[j - 1].scaleTimestampSeconds) || Number(x.scaleTimestampSeconds) - Number(rows[j - 1].scaleTimestampSeconds) > .6))) continue;
        const r = regressionForRawSamples(rows);
        if (r && r.seconds >= 0.8 && r.r2 >= .95 && r.slope > 0) { flows.push(r.slope); flowStamps.push(end); reducedWindow = true; }
        if (r && r.seconds >= 0.8 && r.r2 >= .95 && r.slope > 0) { flows.push(r.slope); flowStamps.push(end); reducedWindow = true; } // 磁盘现状重复行，照抄保真
      }
    }
    const mean = average(flows), variance = mean === null ? null : average(flows.map((x) => (x - mean) * (x - mean)));
    const errors = flows.map((x) => Math.abs(x / target - 1) * 100).sort((a, b) => a - b);
    return {
      available: !!flows.length, targetGS: target, wholePhaseErrorPct: whole ? round((whole.slope / target - 1) * 100, 2) : null,
      tailMeanGS: round(mean, 3), tailErrorPct: mean === null ? null : round((mean / target - 1) * 100, 2),
      tailRippleCVPct: mean ? round(Math.sqrt(variance) / mean * 100, 2) : null,
      tailP95ErrorPct: errors.length ? round(errors[Math.max(0, Math.ceil(errors.length * .95) - 1)], 2) : null,
      tailRMSEGS: flows.length ? round(Math.sqrt(average(flows.map((x) => (x - target) * (x - target)))), 3) : null,
      tailOvershootPct: flows.length ? round(Math.max(0, Math.max(...flows) / target - 1) * 100, 2) : null,
      windows: flows.length, windowSettleMs: win ? win.settleMs : null, chainSettleMs: win ? win.chainSettleMs : null,
      tailFraction: phase === 'stage2' && plateauStart !== null ? 1 : .6, plateauFallback, reducedWindow,
    };
  }
  function writeStats(run, phase) {
    const trace = (run.liveFlowTrim && run.liveFlowTrim.trace) || [];
    const writes = trace.filter((x) => x.kind === 'write').sort((a, b) => a.tMs - b.tMs);
    const inPhase = (w) => phase === 'stage1' ? Number(w.frame) === 0 : phase === 'stage2' ? Number(w.frame) === 1 : Number(w.frame) >= 2;
    const pw = writes.filter(inPhase);
    const startup = pw.filter((w) => w.startupAction === 'boost' || w.startupAction === 'trim' || w.startupAction === 'bleed' || w.startupAction === 'return');
    const normal = pw.filter((w) => !w.startupAction && !w.rescue);
    const rescue = pw.filter((w) => !w.startupAction && w.rescue);
    const counted = normal.concat(rescue).sort((a, b) => a.tMs - b.tMs);
    let reversals = 0, lastDirection = 0, lastFrame = null;
    for (const w of counted) {
      const previous = num(w.previousMlS), next = num(w.commandMlS);
      const direction = previous === null || next === null ? 0 : Math.sign(next - previous);
      if (lastFrame !== w.frame) { lastDirection = 0; lastFrame = w.frame; }
      if (direction) { if (lastDirection && direction !== lastDirection) reversals++; lastDirection = direction; }
    }
    return { total: pw.length, startup: startup.length, normal: normal.length, rescue: rescue.length, reversals };
  }
  // ---- 公式 v2（用户 11-18 批准）----
  const W = { stage1: 0, stage2: 0.45, stage3: 0.55 };
  function stageScore(q, ws, floodPct) {
    if (!q || !q.available) return null;
    const rmsePct = q.tailRMSEGS != null ? q.tailRMSEGS / q.targetGS * 100 : 0;
    const dP95 = 1.8 * Math.max(0, (q.tailP95ErrorPct || 0) - 4);
    const dRmse = 1.8 * Math.max(0, rmsePct - 3);
    const dOver = 1.2 * Math.max(0, (q.tailOvershootPct || 0) - 5);
    const dFlood = Number.isFinite(floodPct) ? 0.5 * Math.max(0, floodPct - 25) : 0;
    const dRev = 3 * (ws ? ws.reversals : 0);
    const raw = 100 - dP95 - dRmse - dOver - dFlood - dRev;
    return { score: clamp(Math.round(raw), 0, 100), raw: round(raw, 1), dP95: round(dP95, 1), dRmse: round(dRmse, 1), dOver: round(dOver, 1), dFlood: round(dFlood, 1), dRev: round(dRev, 1), rmsePct: round(rmsePct, 2) };
  }
  function tdsScore(tds) { const d = Math.abs(Number(tds) - 3.5); return clamp(100 - 1.5 * Math.max(0, d - 0.2) / 3.5 * 100, 0, 100); }
  function weighted(total, tds) { if (total == null || tds == null || tds === '') return null; return Math.round(0.7 * total + 0.3 * tdsScore(tds)); }
  const band = (total) => total == null ? null : Math.floor(total / 2);
  const scoreColor = (v) => v == null ? '' : (v >= 80 ? 'good' : v >= 60 ? 'warn' : 'bad');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pill = (cls, txt) => '<span class="lrn-pill ' + cls + '">' + esc(txt) + '</span>';
  const valPill = (st) => st === 'HIT' ? pill('ok', 'HIT') : st === 'NEAR' ? pill('warn', 'NEAR') : st === 'MISS' ? pill('bad', 'MISS') : pill('mute', st || '—');

  // ---- 状态 ----
  let enabled = true, level = 1, model = null, openId = null, lastRunId = null, fetchSeq = 0, refreshTimer = 0, tagEl = null;
  const popped = {};
  const dbGet = (k) => (window.dbGet ? window.dbGet(k).catch(() => null) : Promise.resolve(null));
  const dbSet = (k, v) => { try { if (window.dbSet) window.dbSet(k, v); } catch (_) {} };
  const ctrl = () => (window.HxControl ? window.HxControl._state() : {});
  const DP = '/api/v1/plugins/decenthyperexplugin.reaplugin';

  async function tdsRec(runId) { const all = (await dbGet('hecShotTds')) || {}; return all[runId] || null; }
  async function tdsSave(runId, patchObj) { const all = (await dbGet('hecShotTds')) || {}; all[runId] = Object.assign({}, all[runId], patchObj, { at: Date.now() }); dbSet('hecShotTds', all); }

  function arbBlock(rec) {
    if (!rec || !Array.isArray(rec.decisions)) return null;
    const picks = { model: 0, algo: 0, hold: 0 }; let matched = 0; const pmb = []; const thr = new Set(); let learned = 0;
    for (const d of rec.decisions) {
      const a = d.arbiter;
      if (a) { picks[a.pick] = (picks[a.pick] || 0) + 1; if (a.pModelBetter != null) pmb.push(a.pModelBetter); if (a.threshold != null) thr.add(a.threshold); if (a.kind === 'learned') learned++; }
      if (d.matched) matched++;
    }
    pmb.sort((a, b) => a - b);
    return {
      decisions: rec.decisions.length, picks, matched,
      pluginWrites: (rec.writes || []).filter((w) => w.kind === 'write').length,
      frameChanges: (rec.writes || []).filter((w) => w.kind === 'frame-change').length,
      pModelBetter: pmb.length ? { n: pmb.length, median: round(pmb[Math.floor(pmb.length / 2)], 3) } : null,
      thr: [...thr], learned,
    };
  }
  function suppBuild(samples, cr, grind, gain, prevTotal, total) {
    const out = { dur: null, press: null, floodPeakGS: null, pq: null, gain: null, prevDelta: null };
    if (Array.isArray(samples) && samples.length) {
      const by = {};
      for (const s of samples) { const ph = s.phase; if (!ph) continue; (by[ph] = by[ph] || []).push(s); }
      const dur = {};
      for (const ph of ['stage1', 'soak', 'stage2', 'stage3']) {
        const ss = by[ph] || []; const ts = ss.map((s) => num(s.tMs != null ? s.tMs : s.t * 1000)).filter((v) => v != null);
        if (ts.length) dur[ph] = round((Math.max(...ts) - Math.min(...ts)) / 1000, 1);
      }
      const allT = samples.map((s) => num(s.tMs != null ? s.tMs : s.t * 1000)).filter((v) => v != null);
      if (allT.length) dur.whole = round((Math.max(...allT) - Math.min(...allT)) / 1000, 1);
      out.dur = dur;
      const pr = {};
      for (const ph of ['stage2', 'stage3']) {
        const ss = by[ph] || []; const ps = ss.map((s) => num(s.pressureBar != null ? s.pressureBar : s.pressure)).filter((v) => v != null);
        if (!ps.length) continue;
        const withL = ss.filter((s) => num(s.targetPressureBar) != null && num(s.targetPressureBar) > 0);
        const hit = withL.filter((s) => { const p = num(s.pressureBar != null ? s.pressureBar : s.pressure); return p != null && p >= num(s.targetPressureBar) - 0.05; }).length;
        pr[ph] = { med: round(median(ps), 2), peak: round(Math.max(...ps), 2), limHitPct: withL.length ? round(hit / withL.length * 100, 1) : null };
      }
      out.press = pr;
    }
    const s2s = cr && cr.stage2Startup;
    if (s2s && num(s2s.overshootPct) != null && num(s2s.targetGS)) out.floodPeakGS = round(num(s2s.targetGS) * (1 + num(s2s.overshootPct) / 100), 2);
    if (grind && num(grind.s2Pq) != null) out.pq = { s2Pq: grind.s2Pq, ref: grind.referencePq, relPct: grind.relPct };
    const g3 = gain && (gain.stage3 || gain.s3);
    if (g3 && num(g3.r) != null) out.gain = { r: round(g3.r, 2), smoothed: round(g3.smoothedR, 2), conf: g3.confidence || null };
    if (prevTotal != null && total != null) out.prevDelta = total - prevTotal;
    return out;
  }
  function runLikeFromShot(shot) {
    const fr = shot.fullRecord || {};
    const cmds = shot.commands || {};
    const raw = fr.rawScaleSamples || (Array.isArray(shot.samples) && shot.samples[0] && shot.samples[0].weightG != null ? shot.samples : null);
    return {
      runId: shot.runId,
      config: {
        stage1Flow: cmds.stage1 && cmds.stage1.desiredGS, stage2Flow: cmds.stage2 && cmds.stage2.desiredGS, stage3Flow: cmds.stage3 && cmds.stage3.desiredGS,
        s2StartupPlan: (fr.liveFlowTrim && fr.liveFlowTrim.s2StartupPlan) || (shot.liveFlowTrim && shot.liveFlowTrim.s2StartupPlan),
      },
      rawScaleSamples: raw, events: fr.events || shot.events || [], liveFlowTrim: fr.liveFlowTrim || shot.liveFlowTrim || null,
    };
  }
  function portModel(shot) {
    const run = runLikeFromShot(shot);
    if (!run.rawScaleSamples || !run.rawScaleSamples.length) return null;
    const trace = (run.liveFlowTrim && run.liveFlowTrim.trace) || [];
    if (!trace.some((x) => x.startupAction !== undefined || x.rescue !== undefined)) return null; // 离线写入分类缺 → 不算分（反转口径守 §22.4）
    const stages = {}; let wsum = 0, ssum = 0;
    for (const ph of ['stage1', 'stage2', 'stage3']) {
      const q = controlOutputQuality(run, ph);
      const ws = writeStats(run, ph);
      const floodPct = ph === 'stage2' && shot.s2Startup ? num(shot.s2Startup.overshootPct) : null;
      const sc = W[ph] > 0 ? stageScore(q, ws, floodPct) : null;
      stages[ph] = { quality: q, writes: ws, score: sc, floodPct };
      if (sc) { wsum += W[ph]; ssum += W[ph] * sc.score; }
    }
    const total = wsum ? Math.round(ssum / wsum) : null;
    const writesSum = ['stage1', 'stage2', 'stage3'].reduce((s, p) => s + stages[p].writes.normal + stages[p].writes.rescue, 0);
    const fw = (shot.samples || []).map((s) => num(s.scaleWeightG != null ? s.scaleWeightG : s.weightG)).filter((v) => v != null);
    return { source: 'port', stages, total, weightsUsed: wsum, lex: { band: band(total), writes: writesSum }, validation: { stage2: shot.s2 && { status: shot.s2.status, errorPct: shot.s2.errorPct }, stage3: shot.s3 && { status: shot.s3.status, errorPct: shot.s3.errorPct } }, grind: shot.grindAdvice || null, next: null, auto: null, arb: null, supp: suppBuild(shot.samples || (shot.fullRecord && shot.fullRecord.samples), null, shot.grindAdvice, null, null, total), fault: null, finalWeightG: fw.length ? Math.max(...fw) : null };
  }
  function compactModel(shot) {
    return { source: 'compact', stages: null, total: null, weightsUsed: 0, lex: null, validation: { stage2: shot.s2 && { status: shot.s2.status, errorPct: shot.s2.errorPct }, stage3: shot.s3 && { status: shot.s3.status, errorPct: shot.s3.errorPct } }, grind: shot.grindAdvice || null, next: null, auto: null, arb: null, supp: null, fault: null, compact: true };
  }
  async function archiveShot(runId) {
    const ar = await dbGet('archive');
    const shots = (ar && ar.shots) || [];
    return shots.find((x) => x && x.runId === runId) || null;
  }
  async function prevTotalOf(runId) {
    const ar = await dbGet('archive');
    const shots = ((ar && ar.shots) || []).filter((x) => x && x.runId && x.runId !== runId);
    shots.sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
    const prev = shots[shots.length - 1];
    if (!prev) return null;
    if (prev.summary && prev.summary.total != null) return prev.summary.total;
    const pm = portModel(prev);
    return pm ? pm.total : null;
  }

  // ---- 在线收集 ----
  async function collect(ctx) {
    const seq = ++fetchSeq;
    const st = ctrl();
    if (!st.baseUrl) return openOffline(ctx, seq);
    let body = null;
    for (let i = 0; i < 6; i++) {
      if (seq !== fetchSeq) return;
      const r = await window.HxControl.httpJson('GET', DP + '/diagnostics');
      const b = r && r.ok ? (r.body && r.body.summary ? r.body.summary : r.body) : null;
      const cr = b && b.controlReview;
      const rid = cr && (cr.runId || b.runId);
      if (cr && (rid == null || rid === ctx.runId)) { body = b; break; }
      if (i < 5) await new Promise((res) => setTimeout(res, 1000));
    }
    if (seq !== fetchSeq) return;
    if (!body) return openOffline(ctx, seq);
    const cr = body.controlReview || {};
    const phases = cr.phases || {};
    const stages = {}; let wsum = 0, ssum = 0;
    for (const ph of ['stage1', 'stage2', 'stage3']) {
      const p = phases[ph] || {};
      const q = p.output || null;
      const ws = p.writes || { total: 0, startup: 0, normal: 0, rescue: 0, reversals: p.directionReversals || 0 };
      if (ws.reversals == null) ws.reversals = p.directionReversals || 0;
      const floodPct = ph === 'stage2' && body.stage2Startup ? num(body.stage2Startup.overshootPct) : null;
      const sc = W[ph] > 0 ? stageScore(q, ws, floodPct) : null;
      const vst = (body[ph] && body[ph].validationStatus) || (phases[ph] && phases[ph].validationStatus) || null;
      stages[ph] = { quality: q, writes: ws, score: sc, floodPct, validationStatus: vst };
      if (sc) { wsum += W[ph]; ssum += W[ph] * sc.score; }
    }
    const total = wsum ? Math.round(ssum / wsum) : null;
    const writesSum = ['stage1', 'stage2', 'stage3'].reduce((s, p) => s + (stages[p].writes ? stages[p].writes.normal + stages[p].writes.rescue : 0), 0);
    let cal = null;
    const rc = await window.HxControl.httpJson('GET', DP + '/calibration-status');
    if (rc && rc.ok) cal = rc.body || null;
    let arb = null;
    if (window.HxShadow && window.HxShadow.latestCup) { try { arb = arbBlock(await window.HxShadow.latestCup()); } catch (_) {} }
    const prevTotal = await prevTotalOf(ctx.runId);
    const m = {
      source: 'online', runId: ctx.runId, stages, total, weightsUsed: wsum, lex: { band: band(total), writes: writesSum },
      validation: { stage2: stages.stage2.validationStatus && { status: stages.stage2.validationStatus, errorPct: stages.stage2.quality && stages.stage2.quality.wholePhaseErrorPct }, stage3: stages.stage3.validationStatus && { status: stages.stage3.validationStatus, errorPct: stages.stage3.quality && stages.stage3.quality.wholePhaseErrorPct } },
      grind: body.grindAdvice || null, next: body.nextShotAdaptive || null,
      auto: cal ? { enabled: cal.autoApplyNextShot !== false, status: cal.autoApplyLastStatus && cal.autoApplyLastStatus.status, at: cal.autoApplyLastStatus && cal.autoApplyLastStatus.at, flows: cal.autoApplyLastStatus && cal.autoApplyLastStatus.commandFlows } : null,
      arb, supp: suppBuild(ctx.run && ctx.run.samples, cr, body.grindAdvice, cal && cal.gainMemory, prevTotal, total),
      finalWeightG: (ctx.run && ctx.run.samples || []).map((s) => num(s.weight)).filter((v) => v != null).length ? Math.max(...(ctx.run && ctx.run.samples || []).map((s) => num(s.weight)).filter((v) => v != null)) : null,
      fault: (body.result && !/completed/i.test(String(body.result))) ? String(body.result) : null,
    };
    if (window.HxControl._attachSummary) window.HxControl._attachSummary(ctx.runId, m);
    // autoApply finalize→applying→applied：3s 后刷新一次
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      if (seq !== fetchSeq || !model || model.runId !== ctx.runId) return;
      const r2 = await window.HxControl.httpJson('GET', DP + '/calibration-status');
      if (r2 && r2.ok && r2.body && r2.body.autoApplyLastStatus) {
        model.auto = { enabled: r2.body.autoApplyNextShot !== false, status: r2.body.autoApplyLastStatus.status, at: r2.body.autoApplyLastStatus.at, flows: r2.body.autoApplyLastStatus.commandFlows };
        if (openId === ctx.runId) render();
      }
    }, 3000);
    open(ctx.runId, m);
  }
  async function openOffline(ctx, seq) {
    const shot = await archiveShot(ctx.runId);
    if (seq !== fetchSeq) return;
    let m = null;
    if (shot && shot.summary) m = Object.assign({}, shot.summary, { source: 'persisted' });
    if (!m && shot) m = portModel(shot);
    if (!m && shot) m = compactModel(shot);
    if (!m) m = { source: 'compact', stages: null, total: null, compact: true, validation: null, grind: null, next: null, auto: null, arb: null, supp: null, fault: null };
    if (window.HxShadow && window.HxShadow.latestCup && !m.arb) { try { m.arb = arbBlock(await window.HxShadow.latestCup()); } catch (_) {} }
    open(ctx.runId, m);
  }

  // ---- 渲染 ----
  function scoreSec(m, tds) {
    const total = m.total;
    const w = weighted(total, tds && tds.tds);
    const shown = w != null ? w : total;
    let h = '<div class="lrn-sec"><h4>' + t('本杯控制分') + '</h4>';
    if (m.fault) {
      h += '<div class="scoreline">' + pill('bad', t('异常中止 · 不评分')) + '</div><div class="lrn-note">' + esc(m.fault) + '</div></div>';
      return h;
    }
    if (total == null) {
      h += '<div class="scoreline">' + pill('mute', t('不评分 · 5 指标缺')) + '<div class="scoremeta"><span class="srcrow">' + (m.source === 'compact' ? t('离线归档') + ' · compact' : t('插件数据未就绪')) + '</span></div></div>';
      if (m.validation) {
        h += '<div class="lrn-grid">';
        for (const ph of ['stage2', 'stage3']) {
          const v = m.validation[ph];
          h += '<div class="lrn-card"><div class="k">' + (ph === 'stage2' ? 'S2' : 'S3') + ' ' + (v ? valPill(v.status) : '') + '</div><div class="v tech" style="color:#8b93a1">—</div><div class="s">' + (v && v.errorPct != null ? (v.errorPct > 0 ? '+' : '') + v.errorPct + '%' : '—') + '</div></div>';
        }
        h += '</div>';
      }
      h += '</div>';
      return h;
    }
    const vst = (m.validation && m.validation.stage2 && m.validation.stage2.status) || null;
    h += '<div class="scoreline">' + (vst ? valPill(vst) : '') + '<div class="scoremeta" id="sumMeta">';
    if (w != null) h += pill('warn', t('加权 · 提案待确认')) + '<span class="srcrow">' + t('控制') + ' ' + total + ' · TDS ' + round(tdsScore(tds.tds), 1) + ' · ' + t('加权') + ' ' + w + ' · 0.7/0.3</span>';
    else h += pill('mute', t('TDS 未录') + ' · ' + t('均值只报告')) + '<span class="srcrow">' + t('控制') + ' ' + total + '</span>';
    if (m.lex) h += '<span class="srcrow">2 ' + t('分带') + ' ' + m.lex.band + ' · ' + t('写入') + ' ' + m.lex.writes + ' · S1 ' + t('只报告，权重 0') + ' · S2 0.45 / S3 0.55</span>';
    h += '</div></div>';
    if (level === 2 && m.stages) {
      h += '<div class="lrn-grid" id="sumStageGrid">';
      for (const ph of ['stage2', 'stage3']) {
        const s = m.stages[ph] || {}, q = s.quality, sc = s.score, ws = s.writes;
        const label = ph === 'stage2' ? 'S2 · ' + t('平台 + 供水') : 'S3 · ' + t('长段');
        if (!q || !q.available) {
          h += '<div class="lrn-card"><div class="k">' + label + ' ' + pill('mute', t('数据不足')) + '</div><div class="v tech" style="color:#8b93a1">—</div><div class="s">' + esc((q && q.reason) || '—') + (m.weightsUsed ? ' · ' + t('权重重分配') : '') + '</div></div>';
          continue;
        }
        const vs = s.validationStatus || (m.validation && m.validation[ph] && m.validation[ph].status);
        h += '<div class="lrn-card"><div class="k">' + label + ' ' + valPill(vs) + '</div><div class="v tech ' + scoreColor(sc && sc.score) + '">' + (sc ? sc.score : '—') + '</div>';
        h += '<div class="mrow">p95 <b>' + q.tailP95ErrorPct + '%</b> · RMSE <b>' + (sc ? sc.rmsePct : '—') + '%</b> · ' + (ph === 'stage2' ? t('平台过冲') : t('过冲')) + ' <b>' + q.tailOvershootPct + '%</b>' + (ph === 'stage2' && s.floodPct != null ? ' · ' + t('供水峰') + ' <b>' + s.floodPct + '%</b>' : '') + ' · ' + t('反转') + ' <b>' + (ws ? ws.reversals : 0) + '</b> · ' + t('写入') + ' <b>' + (ws ? ws.total : 0) + '</b>' + (ws ? '（' + t('供水') + ' ' + ws.startup + ' / ' + t('常规') + ' ' + ws.normal + (ws.rescue ? ' / ' + t('救急') + ' ' + ws.rescue : '') + '）' : '') + '</div>';
        h += '<div class="s">' + t('整段') + ' ' + (q.wholePhaseErrorPct > 0 ? '+' : '') + q.wholePhaseErrorPct + '% · ' + t('尾均') + ' ' + (q.tailErrorPct > 0 ? '+' : '') + q.tailErrorPct + '%（' + t('均值只报告') + '）' + (q.reducedWindow ? ' · ' + pill('mute', t('缩减窗')) : '') + '</div>';
        if (sc) h += '<div class="ded">' + t('扣分') + ' p95 <b>−' + sc.dP95 + '</b> / RMSE <b>−' + sc.dRmse + '</b> / ' + t('平台') + ' <b>−' + sc.dOver + '</b>' + (ph === 'stage2' ? ' / ' + t('供水') + ' <b>−' + sc.dFlood + '</b>' : '') + ' / ' + t('反转') + ' <b>−' + sc.dRev + '</b> → ' + t('原始') + ' ' + sc.raw + '</div>';
        h += '</div>';
      }
      h += '</div>';
      const s1 = m.stages.stage1 || {};
      h += '<div class="lrn-row" style="margin-top:8px"><span class="lbl">S1 ' + t('启动') + '</span>' + (s1.quality && s1.quality.available ? pill('mute', 'STARTUP / REPEAT') + '<span class="srcrow">' + t('尾均') + ' ' + s1.quality.tailMeanGS + ' g/s（' + t('只报告，权重 0') + '）</span>' : pill('mute', t('数据不足')) + '<span class="srcrow">' + esc((s1.quality && s1.quality.reason) || '—') + '（' + t('只报告，权重 0') + '）</span>') + '</div>';
    }
    h += '</div>';
    return h;
  }
  function nextSec(m) {
    if (level < 1 || !m.next) return '';
    const n = m.next;
    let h = '<div class="lrn-sec" id="sumNextSec"><h4>' + t('下一杯建议') + '</h4><table class="lrn-table" id="sumNextTable"><tr><th>' + t('阶段') + '</th><th>' + t('当前 ml/s') + '</th><th>' + t('建议 ml/s') + '</th><th>' + t('动作') + '</th><th>' + t('置信') + '</th></tr>';
    for (const key of ['s1', 's2', 's3']) {
      const s = n[key]; if (!s) continue;
      const cur = num(s.currentCommandMlS), sug = num(s.suggestedCommandMlS);
      const act = String(s.action || '—');
      const cls = act === 'HOLD' ? 'ok' : act === 'REPEAT' ? 'mute' : 'warn';
      h += '<tr><td>' + key.toUpperCase() + '</td><td>' + (cur != null ? cur : '—') + '</td><td>' + (sug != null ? sug : (act === 'HOLD' ? t('保留当前指令') : '—')) + '</td><td>' + pill(cls, act) + '</td><td>' + esc(s.confidence || '—') + '</td></tr>';
    }
    h += '</table>';
    if (m.auto && m.auto.status === 'applied') {
      const b = m.auto.flows && num(m.auto.flows.stage2CommandMlS);
      h += '<div class="applied" id="sumApplied">' + pill('warn', t('已自动应用')) + '<span class="cmd">S2 base ' + (b != null ? b : '—') + (m.auto.at ? ' · ' + new Date(m.auto.at).toTimeString().slice(0, 8) : '') + '</span></div>';
    } else if (m.auto && m.auto.status === 'applying') {
      h += '<div class="applied" id="sumApplied">' + pill('info', 'applying') + '</div>';
    }
    h += '</div>';
    return h;
  }
  function arbSec(m) {
    if (level < 2) return '';
    let h = '<div class="lrn-sec" id="sumArbSec"><h4>' + t('决策与仲裁') + '</h4>';
    if (!m.arb) { h += '<div class="lrn-empty">' + t('本杯无影子记录') + '</div></div>'; return h; }
    const a = m.arb;
    h += '<div class="arb" id="sumArb">' + t('决策') + ' <b>' + a.decisions + '</b> · model <b>' + a.picks.model + '</b> / algo <b>' + a.picks.algo + '</b> / hold <b>' + a.picks.hold + '</b> · matched <b>' + a.matched + '</b> <span class="guard">（' + t('校准素材，非增益裁判') + '）</span><br>';
    h += t('置信中位') + ' <b>' + (a.pModelBetter ? a.pModelBetter.median : '—') + '</b> <span class="guard">（' + t('离线训练乐观口径') + '）</span> · thr <b>' + (a.thr && a.thr.length ? a.thr[0] : '—') + '</b> ' + (a.learned ? 'learned' : 'rule') + ' · ' + t('插件写入') + ' <b>' + a.pluginWrites + '</b>（' + t('帧切换') + ' ' + a.frameChanges + '）</div></div>';
    return h;
  }
  function grindSec(m) {
    const g = m.grind;
    let h = '<div class="lrn-sec" id="sumGrindSec"><h4>' + t('研磨建议') + '</h4>';
    if (m.fault) { h += '<div class="grind"><div class="t">aborted</div><div class="d">' + t('中止杯不给研磨建议') + '</div></div></div>'; return h; }
    if (!g || !g.available) { h += '<div class="lrn-empty">—</div></div>'; return h; }
    const cls = g.status === 'hold' ? 'ok' : 'warn';
    h += '<div class="grind" id="sumGrind"><div class="t">' + esc(g.status || '—') + ' ' + pill(cls, g.confidence || '—') + '</div><div class="d">' + esc(g.label || g.detail || '—') + '</div><div class="s">' + t('只建议，不自动改') + '</div></div></div>';
    return h;
  }
  function tdsSec(m, tds) {
    let h = '<div class="lrn-sec" id="sumTdsSec"><h4>' + t('TDS（可选）') + '</h4><div class="tdsrow"><span class="lbl">' + t('TDS %（目标 3.5）') + '</span><input class="tdsbox" id="sumTds" type="number" min="0" max="15" step="0.1" value="' + (tds && tds.tds != null ? tds.tds : '') + '">';
    if (tds && tds.tds != null && tds.tds !== '') {
      const d = round(Number(tds.tds) - 3.5, 1);
      h += pill('info', 'Δ ' + (d > 0 ? '+' : '') + d);
    } else h += pill('mute', t('未录'));
    if (level === 2) {
      h += '<span class="lbl">' + t('粉量 g（可选）') + '</span><input class="tdsbox" id="sumDose" type="number" min="5" max="30" step="0.5" value="' + (tds && tds.dose != null ? tds.dose : '') + '">';
      const ey = eyOf(m, tds);
      h += ey != null ? pill('ok', 'EY ' + ey + '%') : pill('mute', 'EY —');
    }
    h += '</div></div>';
    return h;
  }
  function eyOf(m, tds) {
    if (!tds || tds.tds == null || tds.tds === '' || tds.dose == null || tds.dose === '' || !Number(tds.dose)) return null;
    if (m.finalWeightG == null) return null;
    return round(Number(tds.tds) * m.finalWeightG / Number(tds.dose), 1);
  }
  function suppSec(m) {
    if (level < 2 || !m.supp) return '';
    const s = m.supp;
    let h = '<div class="lrn-sec" id="sumSuppSec"><h4>' + t('杯数据补充（仅完整档）') + '</h4>';
    const row = (k, v) => '<div class="lrn-row"><span class="lbl">' + t(k) + '</span><span class="srcrow">' + v + '</span></div>';
    if (s.dur) h += row('阶段时长', ['stage1', 'soak', 'stage2', 'stage3'].filter((p) => s.dur[p] != null).map((p) => (p === 'soak' ? 'soak' : p.replace('stage', 'S')) + ' ' + s.dur[p] + 's').join(' · ') + (s.dur.whole != null ? ' · ' + t('整杯') + ' ' + s.dur.whole + 's' : ''));
    if (s.press) h += row('压力', ['stage2', 'stage3'].filter((p) => s.press[p]).map((p) => p.replace('stage', 'S') + ' ' + t('中位') + ' ' + s.press[p].med + ' / ' + t('峰') + ' ' + s.press[p].peak + ' bar').join(' · ') + ' · ' + t('限压命中') + ' ' + (s.press.stage2 && s.press.stage2.limHitPct != null ? s.press.stage2.limHitPct + '%' : '—'));
    if (s.floodPeakGS != null) h += row('供水峰', s.floodPeakGS + ' g/s（' + t('滚动回归口径') + '）');
    if (s.pq) h += row('研磨阻力', 'S2 ' + t('尾') + ' p/q ' + s.pq.s2Pq + ' vs ' + t('桶中心') + ' ' + s.pq.ref + '（' + (s.pq.relPct > 0 ? '+' : '') + s.pq.relPct + '%）');
    if (s.gain) h += row('增益带', 'S3 r ' + s.gain.r + ' · ' + t('平滑') + ' ' + s.gain.smoothed + ' · ' + t('置信') + ' ' + (s.gain.conf || '—'));
    h += row('与上一杯', s.prevDelta != null ? (s.prevDelta > 0 ? '+' : '') + s.prevDelta + ' ' + t('分') : t('上一杯不可评分'));
    h += '</div>';
    return h;
  }
  function srcSec(m) {
    if (level < 2) return '';
    const txt = m.source === 'online' ? t('在线') + ' · /diagnostics controlReview · runId ' + esc(String(m.runId || '').slice(-6)) + ' ' + t('匹配') : m.source === 'persisted' ? t('离线归档') + ' · ' + t('杯末持久化总结') : m.source === 'port' ? t('离线归档') + ' · fullRecord ' + t('移植') : t('插件数据未就绪') + ' · ' + t('本地影子') + ' + ' + t('离线归档') + ' compact';
    return '<div class="srcrow" id="sumSrc">' + txt + ' · ' + t('仲裁块本地影子') + '</div>';
  }
  // ---- 简单档=仪表弧视图（用户 11-19 锁卡 Instrument Arc）：刻度弧+hero 数字居中，左补录组右研磨，底部再来一杯；视图过滤非删功能 ----
  let simpleConfirmed = false;
  function arcSvg(frac, color) {
    const P = (a, r) => { const rad = (a * Math.PI) / 180; return (100 + r * Math.cos(rad)).toFixed(1) + ' ' + (100 + r * Math.sin(rad)).toFixed(1); };
    let ticks = '';
    for (let i = 0; i <= 10; i++) { const a = 135 + i * 27; ticks += '<line x1="' + P(a, 80).split(' ')[0] + '" y1="' + P(a, 80).split(' ')[1] + '" x2="' + P(a, 86).split(' ')[0] + '" y2="' + P(a, 86).split(' ')[1] + '" stroke="#2a2f38" stroke-width="2"/>'; }
    const f = Math.max(0, Math.min(1, frac || 0));
    return '<svg class="sumarc" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" fill="none" stroke="#232830" stroke-width="6" pathLength="100" stroke-dasharray="75 25" transform="rotate(135 100 100)" stroke-linecap="round"/>' + (f > 0 ? '<circle cx="100" cy="100" r="88" fill="none" stroke="' + color + '" stroke-width="6" pathLength="100" stroke-dasharray="' + (75 * f).toFixed(1) + ' 100" transform="rotate(135 100 100)" stroke-linecap="round"/>' : '') + ticks + '</svg>';
  }
  function simpleView(m, tds) {
    const total = m.total;
    const w = weighted(total, tds && tds.tds);
    const shown = simpleConfirmed && w != null ? w : total;
    const col = shown == null ? '#8b93a1' : (shown >= 80 ? '#8fe0b0' : shown >= 60 ? '#f5c078' : '#f2a0aa');
    const g = m.grind;
    const tdsV = tds && tds.tds != null ? tds.tds : '';
    const grV = tds && tds.grind != null ? tds.grind : '';
    const canRecalc = total != null && tdsV !== '';
    let meta;
    if (total == null) meta = m.fault ? t('异常中止 · 不评分') : t('不评分 · 5 指标缺');
    else if (w != null && simpleConfirmed) meta = t('控制') + ' ' + total + ' · TDS ' + round(tdsScore(tds.tds), 1) + ' · ' + t('加权') + ' ' + w;
    else if (w != null) meta = t('控制') + ' ' + total + ' · TDS ' + tdsV;
    else meta = t('控制') + ' ' + total + ' · ' + t('TDS 未录');
    const lb = total == null ? t('不评分') + ' ' + pill('mute', m.fault ? t('异常中止 · 不评分') : t('缺数据')) : (simpleConfirmed && w != null ? t('加权分') + ' ' + pill('warn', t('加权 · 提案待确认')) : t('控制分') + (w == null ? ' ' + pill('mute', t('TDS 未录')) : ''));
    let h = '<div class="modal lrn-modal" id="sumModal"><div class="lrn-top"><h3>' + t('本杯总结') + '</h3><button type="button" class="lrn-x" id="sumX">✕</button></div><div class="lrn-body" id="sumBody"><div class="sum-simple">';
    h += '<div class="sum-hero-row">';
    h += '<div class="sum-inputs"><div class="sum-input"><span class="lbl">' + t('TDS %（目标 3.5）') + '</span><input class="tdsbox" id="sumTds" type="number" min="0" max="15" step="0.1" value="' + tdsV + '"><button type="button" class="sum-recalc' + (canRecalc ? '' : ' off') + '" id="sumRecalc"' + (canRecalc ? '' : ' disabled') + '>' + t('确认重算') + '</button></div><div class="sum-input"><span class="lbl">' + t('研磨度格数') + '</span><input class="tdsbox" id="sumGrind" type="number" min="0" max="60" step="1" value="' + grV + '"></div></div>';
    h += '<div class="sum-hero"><div class="sum-dial">' + arcSvg(shown == null ? 0 : shown / 100, col) + '<div class="n ' + (shown == null ? 'mute' : scoreColor(shown)) + '" id="sumHeroN">' + (shown == null ? '—' : shown) + '</div></div><div class="lb">' + lb + '</div><div class="meta">' + meta + '</div></div>';
    h += '<div class="sum-side right" id="sumGrindSec"><div class="k">' + t('研磨') + '</div><div class="v">' + (g && g.available ? esc(g.status || '—') + ' · ' + esc(g.label || g.detail || '—') : '—') + '</div><div class="s">' + (g && g.available ? t('置信') + ' ' + esc(g.confidence || '—') : t('数据不足')) + '</div></div>';
    h += '</div>';
    h += '<button type="button" class="sum-again" id="sumAgain">' + t('再来一杯') + '</button>';
    h += '</div></div></div>';
    return h;
  }
  function render() {
    if (!model || openId == null) return;
    const m = model;
    tdsRec(openId).then((tds) => {
      if (openId !== m.runId) return;
      const rid = String(m.runId || '');
      const when = m.startedAt ? new Date(m.startedAt) : null;
      let h;
      if (level === 0) { h = simpleView(m, tds); } else {
      h = '<div class="modal lrn-modal" id="sumModal"><div class="lrn-top"><h3>' + t('本杯总结') + '</h3><span class="rid">…' + esc(rid.slice(-6)) + '</span>' + (when ? '<span class="at">' + (when.getMonth() + 1) + '-' + when.getDate() + ' ' + when.toTimeString().slice(0, 5) + '</span>' : '') + '<button type="button" class="lrn-x" id="sumX">✕</button></div><div class="lrn-body" id="sumBody">';
      h += scoreSec(m, tds);
      h += nextSec(m);
      h += arbSec(m);
      h += grindSec(m);
      h += tdsSec(m, tds);
      h += suppSec(m);
      h += srcSec(m);
      h += '</div></div>';
      }
      const d = $('sumDim');
      d.innerHTML = h;
      d.hidden = false;
      $('sumX').addEventListener('click', close);
      const ti = $('sumTds');
      if (ti) ti.addEventListener('change', async function () {
        const v = this.value === '' ? null : clamp(Number(this.value), 0, 15);
        await tdsSave(openId, { tds: v });
        render();
      });
      const di = $('sumDose');
      if (di) di.addEventListener('change', async function () {
        const v = this.value === '' ? null : Number(this.value);
        await tdsSave(openId, { dose: v });
        render();
      });
      const rc = $('sumRecalc');
      if (rc) rc.addEventListener('click', () => { simpleConfirmed = true; render(); });
      const ga = $('sumAgain');
      if (ga) ga.addEventListener('click', close);
      const gi = $('sumGrind');
      if (gi) gi.addEventListener('change', async function () {
        const v = this.value === '' ? null : clamp(Number(this.value), 0, 60);
        await tdsSave(openId, { grind: v });
      });
    });
  }
  // ---- 杯末全屏倒计时（用户 11-19 二段定）：覆盖停杯→可弹窗整个等待；+100ms 起收集并行；数据早到收零即弹，未就绪停 1 脉冲等到即弹；新杯/关总开关取消 ----
  let cdTimer = 0, cdEnd = 0, cdActive = false, cdQueued = null;
  const CD_MS = 3000, CD_CIRC = 2 * Math.PI * 54;
  function stopCountdown() { cdActive = false; cdQueued = null; clearTimeout(cdTimer); cdTimer = 0; const d = $('sumCount'); if (d) { d.hidden = true; d.innerHTML = ''; } }
  function startCountdown(ctx) {
    stopCountdown();
    const seq = ++fetchSeq;
    cdActive = true; cdEnd = Date.now() + CD_MS;
    const d = $('sumCount'); if (!d) { collect(ctx); return; }
    d.hidden = false;
    d.innerHTML = '<div class="sumcount"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="54"/><circle class="fg" id="sumCountRing" cx="60" cy="60" r="54"/></svg><div class="n" id="sumCountN">3</div><div class="lb" id="sumCountLb">' + t('本杯总结') + '</div></div>';
    const tick = () => {
      if (!cdActive) return;
      const rem = cdEnd - Date.now();
      const nEl = $('sumCountN'), ring = $('sumCountRing'), lb = $('sumCountLb');
      if (ring) { ring.style.strokeDasharray = String(CD_CIRC); ring.style.strokeDashoffset = String(CD_CIRC * Math.max(0, rem) / CD_MS); }
      if (rem <= 0) {
        if (cdQueued) { const q = cdQueued; stopCountdown(); doOpen(q[0], q[1]); return; }
        // 数据未就绪：停 1 脉冲等待（环近满），数据一到 open() 拨 cdEnd=now 收零弹窗；无圈后 limbo
        cdEnd = Date.now() + 400;
        cdTimer = setTimeout(tick, 200);
        return;
      }
      const n = String(Math.max(1, Math.ceil(rem / 1000)));
      if (nEl && nEl.textContent !== n) { nEl.textContent = n; nEl.classList.remove('pop'); void nEl.offsetWidth; nEl.classList.add('pop'); }
      cdTimer = setTimeout(tick, 100);
    };
    tick();
    setTimeout(() => { if (seq === fetchSeq && cdActive) collect(ctx); }, 100);
  }
  function open(runId, m) { if (cdActive) { cdQueued = [runId, m]; cdEnd = Date.now(); return; } doOpen(runId, m); }
  function doOpen(runId, m) { stopCountdown(); simpleConfirmed = false; model = m; openId = runId; model.runId = runId; render(); updateTag(); }
  function close() { stopCountdown(); fetchSeq++; const d = $('sumDim'); if (d) { d.hidden = true; d.innerHTML = ''; } openId = null; }
  function updateTag() {
    if (!tagEl) return;
    const st = ctrl();
    tagEl.hidden = !(lastRunId && st.mode === 'control');
    tagEl.textContent = t('本杯总结');
  }
  async function review() {
    if (!lastRunId) return;
    const shot = await archiveShot(lastRunId);
    let m = shot && shot.summary ? Object.assign({}, shot.summary, { source: 'persisted' }) : null;
    if (!m && shot) m = portModel(shot);
    if (!m && shot) m = compactModel(shot);
    if (!m) m = { source: 'compact', stages: null, total: null, compact: true, validation: null, grind: null, next: null, auto: null, arb: null, supp: null, fault: null };
    if (!m.arb && window.HxShadow && window.HxShadow.latestCup) { try { m.arb = arbBlock(await window.HxShadow.latestCup()); } catch (_) {} }
    open(lastRunId, m);
  }
  function onCupEnd(ctx) {
    if (!ctx || !ctx.runId) return;
    lastRunId = ctx.runId;
    dbSet('hecSumLastRunId', lastRunId);
    updateTag();
    const st = ctrl();
    if (!enabled || popped[ctx.runId]) return;
    if (st.mode !== 'control' || st.connState !== 'ok' || document.hidden) return;
    if (!ctx.hx || !ctx.run || !ctx.run.samples || !ctx.run.samples.length) return;
    popped[ctx.runId] = 1;
    startCountdown(ctx);
  }
  function onExtracting() { close(); }
  function setEnabled(v) { enabled = !!v; if (!enabled) { stopCountdown(); fetchSeq++; } updateTag(); }
  function setLevel(v) { level = clamp(Number(v) || 0, 0, 2); if (openId != null) render(); }
  function onLang() { if (openId != null) render(); updateTag(); }
  function init() {
    dbGet('hecShotSummary').then((v) => { enabled = v !== 0; updateTag(); });
    dbGet('hecShotSummaryLevel').then((v) => { level = Number.isInteger(v) && v >= 0 && v <= 2 ? v : 1; });
    dbGet('hecSumLastRunId').then((v) => { if (v) { lastRunId = v; updateTag(); } });
    const host = document.querySelector('.curvetags');
    if (host) {
      tagEl = document.createElement('span');
      tagEl.className = 'curvetag sum';
      tagEl.id = 'sumReviewTag';
      tagEl.hidden = true;
      tagEl.addEventListener('click', review);
      host.appendChild(tagEl);
    }
    const d = $('sumDim');
    if (d) d.addEventListener('click', (e) => { if (e.target === d) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && d && !d.hidden) close(); });
  }
  window.HxSummary = {
    onCupEnd, onExtracting, review, close, setEnabled, setLevel, onLang, init,
    _state: function () { return { enabled, level, openId, lastRunId, source: model && model.source }; },
    _openForTest: function (m) { open(m.runId || 'test', m); },
    _tdsScore: tdsScore, _weighted: weighted,
  };
  init();
})();
