// HEC 影子推理（bc_v0）。只记录、不发送：模型候选与插件实际写入并行记录，
// 供离线回放与仲裁模型积累标签。本模块不改 UI、不调 external-flow。
// 特征口径与 .tools/hx-train/pipeline/bc-features.js 逐字一致（13 维）；
// 归一化在 ONNX 图内（train_bc.py Deploy 包装），这里只喂原始特征。
(function () {
  'use strict';
  const QUANTUM = 1 / 16;
  const CMD_LO = 0.10, CMD_HI = 8.00;      // 协议 §3 硬边界
  const NORMAL_CAP = 4;                     // 常规单笔上限 4 档（§22.4），救急另计
  const WINDOW_S = { stage2: 1.6, stage3: 3.0 };
  const MIN_INTERVAL_MS = 1200;             // 常规静默（§22.4）
  const RESCUE_INTERVAL_MS = 800;
  const MODEL_URL = 'vendor/bc_v0.onnx';
  const ORT_URL = 'vendor/ort.wasm.min.js';
  const WASM_BASE = 'vendor/';

  let session = null, loadState = 'idle', loadError = null;
  let cup = null, cups = [];
  let busy = false;
  // 仲裁倾向（默认偏算法 0.35；学习证明后可调高）。软预算是倾向不是硬墙。
  let arbPreference = 0.35;
  const ARB_SOFT_CAP = 12;

  function db() { return window.dbSet && window.dbGet ? { set: window.dbSet, get: window.dbGet } : null; }

  // 桥读 assets（file:// 页面 fetch 会被拦）；浏览器预览回退 fetch。
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  async function assetBytes(relPath) {
    if (window.HxBridge && window.HxBridge.readAssetBase64) {
      const b64 = window.HxBridge.readAssetBase64('www/' + relPath);
      if (b64) return b64ToBytes(b64);
    }
    const r = await fetch(relPath);
    if (!r.ok) throw new Error('asset fetch ' + relPath + ' -> ' + r.status);
    return new Uint8Array(await r.arrayBuffer());
  }

  async function load() {
    if (loadState === 'ready' || loadState === 'loading') return;
    loadState = 'loading';
    try {
      if (!window.ort) {
        await new Promise((res, rej) => {
          const sc = document.createElement('script');
          sc.src = ORT_URL; sc.onload = res; sc.onerror = () => rej(new Error('ort script load failed'));
          document.head.appendChild(sc);
        });
      }
      const ort = window.ort;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
      // file:// 下 ORT 的 import()/fetch 都会被拦：.mjs 读成 blob URL 绝对地址，
      // wasm 二进制直接注入 wasmBinary，两者都走桥（浏览器预览回退 fetch）。
      const wasmBytes = await assetBytes('vendor/ort-wasm-simd-threaded.wasm');
      ort.env.wasm.wasmBinary = wasmBytes.buffer;
      const mjsBytes = await assetBytes('vendor/ort-wasm-simd-threaded.mjs');
      const mjsUrl = URL.createObjectURL(new Blob([mjsBytes], { type: 'text/javascript' }));
      ort.env.wasm.wasmPaths = { mjs: mjsUrl, wasm: mjsUrl };
      const modelBytes = await assetBytes(MODEL_URL);
      session = await ort.InferenceSession.create(modelBytes.buffer, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      loadState = 'ready';
    } catch (e) {
      loadState = 'error'; loadError = String(e && e.message || e);
    }
  }

  // ---- 特征（与 bc-features.js 同序）----
  function features(o) {
    const target = o.targetGS || 5;
    const raw = o.rawGS;
    const err = raw != null ? (raw - target) / target : 0;
    const predErr = o.predictedGS != null ? (o.predictedGS - target) / target : err;
    const ang = o.trendAngleDeg != null ? o.trendAngleDeg / 180 : 0.5;
    return [
      raw != null ? raw / target : 1,
      err, predErr, ang,
      o.pressureBar != null ? o.pressureBar : 0,
      o.machineFlowMlS != null ? o.machineFlowMlS / target : 1,
      o.cumulativeWeightG != null ? o.cumulativeWeightG / 100 : 0,
      o.commandMlS != null ? o.commandMlS / 8 : 0.5,
      target,
      o.phase === 'stage2' ? 1 : 0,
      o.phase === 'stage3' ? 1 : 0,
      o.regR2 != null ? o.regR2 : 0,
      o.rescue ? 1 : 0,
    ];
  }

  // ---- RAW 回归（重量 vs 秤时间戳，插件口径；去重、跳变 ≤0.6s）----
  function weightRegression(samples, tSec, windowS) {
    const rows = samples.filter((s) => s.stamp != null && s.weight != null && !s.tare && s.stamp <= tSec && s.stamp >= tSec - windowS);
    const seen = new Set(); const uniq = [];
    for (const s of rows) { if (seen.has(s.stamp)) continue; seen.add(s.stamp); uniq.push(s); }
    if (uniq.length < 6) return null;
    for (let i = 1; i < uniq.length; i++) {
      const dt = uniq[i].stamp - uniq[i - 1].stamp;
      if (dt <= 0 || dt > 0.6) return null;
    }
    const n = uniq.length;
    let mx = 0, my = 0;
    for (const s of uniq) { mx += s.stamp; my += s.weight; }
    mx /= n; my /= n;
    let sxx = 0, sxy = 0, syy = 0;
    for (const s of uniq) { const dx = s.stamp - mx, dy = s.weight - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    if (sxx <= 0) return null;
    const slope = sxy / sxx;
    const r2 = syy > 0 ? Math.max(0, Math.min(1, sxy * sxy / (sxx * syy))) : 1;
    const span = uniq[n - 1].stamp - uniq[0].stamp;
    if (span < Math.min(1.2, windowS * 0.6) || r2 < 0.90 || !(slope > 0)) return null;
    return { slope, r2, seconds: span };
  }

  function newCup(runId) {
    return { runId: runId || ('live-' + Date.now()), startedAt: Date.now(), samples: [], decisions: [], writes: [], lastDecisionAt: 0, lastCmd: null, rescueStreak: 0, modelWrites: 0, lastPluginWriteCmd: null };
  }

  let persistError = null;
  // 显式传入要存的杯：persist 是异步的，调用方随后可能把全局 cup 置 null。
  async function persist(c) {
    const d = db(); if (!d || !c) return;
    try {
      const rec = JSON.parse(JSON.stringify(c));
      const all = ((await d.get('hecShadowCups')) || []).filter((x) => x && x.runId);
      const i = all.findIndex((x) => x && x.runId === rec.runId);
      if (i >= 0) all[i] = rec; else all.push(rec);
      while (all.length > 40) all.shift();
      await d.set('hecShadowCups', all);
    } catch (e) { persistError = String(e && e.message || e); }
  }

  // 每个秤样本调用（control.js onScaleSnapshot 钩子）。只记录，不发送。
  async function onSample(ctx) {
    if (!ctx || !ctx.run) return;
    if (loadState === 'idle') load();
    if (!cup || (ctx.runId && cup.runId !== ctx.runId)) {
      if (cup && cup.decisions.length) { cups.push(cup); persist(cup); }
      cup = newCup(ctx.runId);
    }
    const s = ctx.sample;
    cup.samples.push({ t: s.t, stamp: s.stamp != null ? s.stamp : null, weight: s.weight, tare: !!s.tare, phase: ctx.phase });
    if (cup.samples.length > 4000) cup.samples.shift();
    // 插件实际写入台账（ext.lastCommandMlS 变化）
    const cmd = ctx.commandMlS;
    if (cmd != null && cup.lastCmd != null && cmd !== cup.lastCmd) {
      cup.writes.push({ tMs: Math.round(s.t * 1000), from: cup.lastCmd, to: cmd, source: 'plugin' });
      cup.lastPluginWriteCmd = cmd;
    }
    if (cmd != null) cup.lastCmd = cmd;

    if (loadState !== 'ready' || busy || !ctx.extracting || ctx.takeover) return;
    if (ctx.phase !== 'stage2' && ctx.phase !== 'stage3') return;
    const target = Number(ctx.targetGS);
    if (!Number.isFinite(target) || target <= 0) return;
    const interval = ctx.rescue ? RESCUE_INTERVAL_MS : MIN_INTERVAL_MS;
    const nowMs = Math.round(s.t * 1000);
    if (nowMs - cup.lastDecisionAt < interval) return;
    if (s.stamp == null) return;
    const reg = weightRegression(cup.samples, s.stamp, WINDOW_S[ctx.phase] || 1.6);
    if (!reg) return;

    const obs = {
      targetGS: target, rawGS: reg.slope, regR2: reg.r2,
      predictedGS: ctx.predictedGS != null ? ctx.predictedGS : null,
      trendAngleDeg: ctx.trendAngleDeg != null ? ctx.trendAngleDeg : null,
      pressureBar: ctx.pressureBar, machineFlowMlS: ctx.machineFlowMlS,
      cumulativeWeightG: ctx.cumulativeWeightG, commandMlS: cmd,
      phase: ctx.phase, rescue: !!ctx.rescue,
    };
    busy = true;
    try {
      const ort = window.ort;
      const input = new ort.Tensor('float32', Float32Array.from(features(obs)), [1, 13]);
      const out = await session.run({ obs: input });
      const writeProb = out.write_prob.data[0];
      const quantaRaw = out.quanta.data[0];
      const quanta = Math.round(quantaRaw);
      const cur = cmd != null ? cmd : (ctx.baseCommandMlS != null ? ctx.baseCommandMlS : 0);
      let candidate = null, action = 'hold';
      if (writeProb >= 0.5 && quanta !== 0) {
        const capped = ctx.rescue ? quanta : Math.max(-NORMAL_CAP, Math.min(NORMAL_CAP, quanta));
        candidate = Math.round(Math.max(CMD_LO, Math.min(CMD_HI, cur + capped * QUANTUM)) * 16) / 16;
        if (candidate === cur) { candidate = null; } else { action = 'write'; }
      }
      cup.lastDecisionAt = nowMs;
      // 仲裁（只记录不发送）：算法候选 = 自上次决策以来插件实际写入；模型候选 = candidate
      let arb = null;
      if (window.HxArbiter) {
        const algoCmd = cup.lastPluginWriteCmd;
        arb = window.HxArbiter.arbitrate(
          { commandMlS: algoCmd },
          { commandMlS: candidate, writeProb, quanta },
          { phase: ctx.phase, targetGS: target, currentMlS: cur, pressureBar: ctx.pressureBar,
            limiterBar: ctx.limiterBar, rescue: !!ctx.rescue,
            modelWritesSoFar: cup.modelWrites, budgetSoftCap: ARB_SOFT_CAP },
          { preference: arbPreference }
        );
        if (arb.pick === 'model') cup.modelWrites++;
        cup.lastPluginWriteCmd = null; // 已消费本决策点的算法写入
      }
      cup.decisions.push({
        tMs: nowMs, phase: ctx.phase, frame: ctx.frame != null ? ctx.frame : null,
        obs, writeProb: Math.round(writeProb * 1000) / 1000, quantaRaw: Math.round(quantaRaw * 100) / 100,
        quanta, action, candidateMlS: candidate, pluginCommandMlS: cmd,
        arbiter: arb ? { pick: arb.pick, commandMlS: arb.commandMlS, reason: arb.reason, clipped: arb.clipped, preference: arbPreference } : null,
        sent: false,
      });
      if (cup.decisions.length > 2000) cup.decisions.shift();
      if (cup.decisions.length % 20 === 0) persist(cup);
    } catch (_) {
    } finally { busy = false; }
  }

  function onCupEnd() {
    if (cup && (cup.decisions.length || cup.writes.length)) { cups.push(cup); persist(cup); }
    cup = null;
  }

  window.HxShadow = {
    load,
    onSample,
    onCupEnd,
    status: function () { return { loadState, loadError, model: 'bc_v0', cup: cup ? { runId: cup.runId, decisions: cup.decisions.length, writes: cup.writes.length } : null, archived: cups.length }; },
    exportJSON: async function () {
      const d = db();
      let all = [];
      try { all = ((d && await d.get('hecShadowCups')) || []).filter((x) => x && x.runId); } catch (_) {}
      if (cup) all = all.concat([cup]);
      return JSON.stringify({ kind: 'HecShadowLog', schema: 1, model: 'bc_v0', exportedAt: new Date().toISOString(), cups: all });
    },
    _features: features,
    _regression: weightRegression,
    setPreference: function (p) { if (Number.isFinite(p)) arbPreference = Math.max(0, Math.min(1, p)); return arbPreference; },
    getPreference: function () { return arbPreference; },
    _debug: function () { return { cup: cup ? { runId: cup.runId, decisions: cup.decisions.length, samples: cup.samples.length, writes: cup.writes.length } : null, cups: cups.map(function (c) { return c ? { runId: c.runId, decisions: c.decisions.length } : String(c); }), persistError: persistError }; },
  };
})();
