// HEC 仲裁：规则 v0 + 学习仲裁（阶段 B）。本模块只做选择，不发送指令（影子只记录）。
// 第 1 层安全包线是硬的（clip 0.10–8.00、1/16 量化、上行压力门、==当前指令→hold），
// 规则 v0 与学习仲裁共用，永不放宽。学习仲裁（LightGBM P(model_better)，纯 JS 树评估）
// 替换规则的第 2/3 层（分歧门控 + 倾向/软预算）；模型未就绪时优雅回落规则 v0。
// 学习模型 20 维特征均为逐点快照或插件真实写入计数（离线/真机语义一致）；
// 节拍依赖的 model_want_so_far/agree_rate 已在可部署模型中剔除（见 vendor/arbiter_lgb.json meta）。
(function () {
  'use strict';
  const CMD_LO = 0.10, CMD_HI = 8.00;
  function snap(v) { return Math.round(v * 16) / 16; }
  // i4：先夹后 snap，输出恒在 1/16 网格（旧先 snap 后夹可产非网格 0.10；插件 toDriverStep 同口径）。
  function clip(v) { return snap(Math.max(CMD_LO, Math.min(CMD_HI, v))); }

  // ---- 规则仲裁 v0（与离线 pipeline/arbitrate.js 同逻辑，原样保留）----
  function arbitrate(algo, model, ctx, opts) {
    const preference = opts && Number.isFinite(opts.preference) ? opts.preference : 0.35;
    const divergenceGate = opts && Number.isFinite(opts.divergenceGate) ? opts.divergenceGate : 0.5;
    const softCap = ctx && Number.isFinite(ctx.budgetSoftCap) ? ctx.budgetSoftCap : Infinity;
    const used = ctx && Number.isFinite(ctx.modelWritesSoFar) ? ctx.modelWritesSoFar : 0;

    const aCmd = algo && Number.isFinite(algo.commandMlS) ? algo.commandMlS : null;
    let mCmd = model && Number.isFinite(model.commandMlS) ? model.commandMlS : null;
    // i5：第 1 层包线单一实现（applyEnvelope），规则/学习共用防漂移；行为逐字不变。
    const env = applyEnvelope(mCmd, ctx);
    mCmd = env.mCmd;
    const clipped = env.clipped;

    const aValid = aCmd != null, mValid = mCmd != null;
    if (!aValid && !mValid) return { pick: 'hold', commandMlS: null, reason: 'both-hold', clipped };
    if (aValid && !mValid) return { pick: 'algo', commandMlS: aCmd, reason: 'model-hold-or-rejected', clipped };
    if (!aValid && mValid) {
      // m1：与 both-valid 分支同口径——软预算是倾向不是墙，preference≥0.7 仍可超（§6.4/§6.17）。
      if (used >= softCap && preference < 0.7) return { pick: 'hold', commandMlS: null, reason: 'model-over-soft-cap', clipped };
      return { pick: 'model', commandMlS: mCmd, reason: 'algo-hold-model-write', clipped };
    }
    const divergence = Math.abs(aCmd - mCmd);
    if (divergence <= 1e-9) return { pick: 'algo', commandMlS: aCmd, reason: 'identical', clipped };
    if (divergence < divergenceGate && preference < 0.5) return { pick: 'algo', commandMlS: aCmd, reason: 'small-divergence-lean-algo', clipped };
    if (used >= softCap && preference < 0.7) return { pick: 'algo', commandMlS: aCmd, reason: 'over-soft-cap-lean-algo', clipped };
    if (preference >= 0.5) return { pick: 'model', commandMlS: mCmd, reason: 'preference-model', clipped };
    return { pick: 'algo', commandMlS: aCmd, reason: 'preference-algo', clipped };
  }

  // ---- 第 1 层安全包线（硬；规则 arbitrate 与学习 arbitrateLearned 共用的单一实现）----
  function applyEnvelope(mCmd, ctx) {
    let clipped = false;
    const cur = ctx && Number.isFinite(ctx.currentMlS) ? ctx.currentMlS : null;
    if (mCmd != null) {
      const c = clip(mCmd);
      if (c !== mCmd) clipped = true;
      mCmd = c;
      const lim = ctx && Number.isFinite(ctx.limiterBar) ? ctx.limiterBar : null;
      const pr = ctx && Number.isFinite(ctx.pressureBar) ? ctx.pressureBar : null;
      if (lim != null && pr != null && cur != null && mCmd > cur && pr >= lim * 0.90) mCmd = null;
      if (mCmd != null && cur != null && mCmd === cur) mCmd = null;
    }
    return { mCmd, clipped };
  }

  // ---- 学习仲裁：模型加载（资产桥，同 shadow.js）+ 纯 JS 树评估 ----
  let learnedState = 'idle', learnedError = null, learnedModel = null, predictor = null, learnedThreshold = null;
  const LEARNED_URL = 'vendor/arbiter_lgb.json';
  const ASSET_HTTPS = 'https://appassets.androidplatform.net/assets/www/';
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  async function assetBytes(relPath) {
    try {
      const hr = await fetch(ASSET_HTTPS + relPath, { cache: 'no-store' });
      if (hr.ok) return new Uint8Array(await hr.arrayBuffer());
    } catch (_) {}
    if (window.HxBridge && window.HxBridge.readAssetBase64) {
      const b64 = window.HxBridge.readAssetBase64('www/' + relPath);
      if (b64) return b64ToBytes(b64);
    }
    const r = await fetch(relPath);
    if (!r.ok) throw new Error('asset fetch ' + relPath + ' -> ' + r.status);
    return new Uint8Array(await r.arrayBuffer());
  }
  function makePredictor(m) {
    const trees = m.trees;
    function evalTree(nodes, x) {
      let i = 0;
      for (;;) {
        const n = nodes[i];
        if (n.v !== undefined) return n.v;
        const xv = x[n.f];
        const left = (xv == null || Number.isNaN(xv)) ? n.dl : (xv <= n.t);
        i = left ? n.l : n.r;
      }
    }
    return function (x) { let s = 0; for (let k = 0; k < trees.length; k++) s += evalTree(trees[k], x); return 1 / (1 + Math.exp(-s)); };
  }
  async function loadLearned() {
    if (learnedState === 'ready' || learnedState === 'loading') return;
    learnedState = 'loading';
    try {
      const bytes = await assetBytes(LEARNED_URL);
      learnedModel = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      predictor = makePredictor(learnedModel);
      learnedState = 'ready';
    } catch (e) {
      learnedState = 'error'; learnedError = String(e && e.message || e);
    }
  }

  // 20 维特征（与离线 build_arbiter_labels.py 可部署子集逐字同序）。
  function buildFeatures(aCmd, mSafe, ctx, model) {
    const target = Number.isFinite(ctx.targetGS) ? ctx.targetGS : 5;
    const raw = Number.isFinite(ctx.rawGS) ? ctx.rawGS : null;
    const err = raw != null ? (raw - target) / target : 0;
    const pred = Number.isFinite(ctx.predictedGS) ? ctx.predictedGS : null;
    const predErr = pred != null ? (pred - target) / target : err;
    const ang = Number.isFinite(ctx.trendAngleDeg) ? ctx.trendAngleDeg / 180 : 0.5;
    const pr = Number.isFinite(ctx.pressureBar) ? ctx.pressureBar : null;
    const lim = Number.isFinite(ctx.limiterBar) ? ctx.limiterBar : null;
    const headroom = (pr != null && lim != null) ? lim - pr : 0;
    const div = (aCmd != null && mSafe != null) ? Math.abs(aCmd - mSafe) : null;
    const mf = Number.isFinite(ctx.machineFlowMlS) ? ctx.machineFlowMlS : null;
    const cw = Number.isFinite(ctx.cumulativeWeightG) ? ctx.cumulativeWeightG : null;
    const cur = Number.isFinite(ctx.currentMlS) ? ctx.currentMlS : null;
    const r2 = Number.isFinite(ctx.regR2) ? ctx.regR2 : 0;
    const wp = model && Number.isFinite(model.writeProb) ? model.writeProb : 0;
    const q = model && Number.isFinite(model.quanta) ? model.quanta : 0;
    const pw = Number.isFinite(ctx.pluginWritesSoFar) ? ctx.pluginWritesSoFar : 0;
    return [
      aCmd != null ? aCmd / 8 : 0,
      mSafe != null ? mSafe / 8 : 0,
      div != null ? div : 0,
      div != null ? div / target : 0,
      err, predErr, ang,
      pr != null ? pr : 0,
      headroom,
      ctx.phase === 'stage2' ? 1 : 0,
      ctx.phase === 'stage3' ? 1 : 0,
      pw, wp, q, target,
      mf != null ? mf / target : 1,
      cw != null ? cw / 100 : 0,
      cur != null ? cur / 8 : 0.5,
      r2,
      ctx.rescue ? 1 : 0,
    ];
  }

  // 学习仲裁：第 1 层硬包线后，用 P(model_better)≥阈值 决定选模型/算法/hold。
  function arbitrateLearned(algo, model, ctx, opts) {
    if (learnedState !== 'ready' || !predictor) return arbitrate(algo, model, ctx, opts); // 优雅回落
    const thr = opts && Number.isFinite(opts.threshold) ? opts.threshold
      : (learnedThreshold != null ? learnedThreshold : (learnedModel.threshold != null ? learnedModel.threshold : 0.5));
    const aCmd = algo && Number.isFinite(algo.commandMlS) ? algo.commandMlS : null;
    const mRaw = model && Number.isFinite(model.commandMlS) ? model.commandMlS : null;
    const env = applyEnvelope(mRaw, ctx);
    const mSafe = env.mCmd, clipped = env.clipped;
    const p = predictor(buildFeatures(aCmd, mSafe, ctx, model));
    const base = { kind: 'learned', pModelBetter: p, threshold: thr, clipped };
    const aValid = aCmd != null, mValid = mSafe != null;
    if (!aValid && !mValid) return Object.assign({ pick: 'hold', commandMlS: null, reason: 'both-hold' }, base);
    if (aValid && !mValid) return Object.assign({ pick: 'algo', commandMlS: aCmd, reason: 'model-hold-or-rejected' }, base);
    if (!aValid && mValid) {
      return p >= thr
        ? Object.assign({ pick: 'model', commandMlS: mSafe, reason: 'learned-model-no-algo' }, base)
        : Object.assign({ pick: 'hold', commandMlS: null, reason: 'learned-hold-low-p' }, base);
    }
    if (Math.abs(aCmd - mSafe) <= 1e-9) return Object.assign({ pick: 'algo', commandMlS: aCmd, reason: 'identical' }, base);
    return p >= thr
      ? Object.assign({ pick: 'model', commandMlS: mSafe, reason: 'learned-model' }, base)
      : Object.assign({ pick: 'algo', commandMlS: aCmd, reason: 'learned-algo' }, base);
  }

  window.HxArbiter = {
    arbitrate, arbitrateLearned, clip, snap, CMD_LO, CMD_HI,
    loadLearned,
    learnedReady: function () { return learnedState === 'ready'; },
    learnedStatus: function () { return { state: learnedState, error: learnedError, features: learnedModel ? learnedModel.features.length : 0, trees: learnedModel ? learnedModel.trees.length : 0, threshold: learnedThreshold != null ? learnedThreshold : (learnedModel ? learnedModel.threshold : null) }; },
    setLearnedThreshold: function (t) { if (Number.isFinite(t)) learnedThreshold = Math.max(0, Math.min(1, t)); return learnedThreshold; },
    _predict: function (x) { return predictor ? predictor(x) : null; },
    _features: buildFeatures,
  };
})();

