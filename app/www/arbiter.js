// HEC 规则仲裁 v0（与离线 .tools/hx-train/pipeline/arbitrate.js 同逻辑）。
// 在算法候选（插件实际写入）与学习模型候选之间选一条。安全包线是硬的；
// preference 是可调倾向（默认偏算法），不是写入次数硬墙——写入频率交给后续
// 学习与仲裁倾向收敛（用户 2026-11-15 口径）。本模块只做选择，不发送指令。
(function () {
  'use strict';
  const CMD_LO = 0.10, CMD_HI = 8.00;
  function snap(v) { return Math.round(v * 16) / 16; }
  function clip(v) { return Math.max(CMD_LO, Math.min(CMD_HI, snap(v))); }

  function arbitrate(algo, model, ctx, opts) {
    const preference = opts && Number.isFinite(opts.preference) ? opts.preference : 0.35;
    const divergenceGate = opts && Number.isFinite(opts.divergenceGate) ? opts.divergenceGate : 0.5;
    const softCap = ctx && Number.isFinite(ctx.budgetSoftCap) ? ctx.budgetSoftCap : Infinity;
    const used = ctx && Number.isFinite(ctx.modelWritesSoFar) ? ctx.modelWritesSoFar : 0;

    const aCmd = algo && Number.isFinite(algo.commandMlS) ? algo.commandMlS : null;
    let mCmd = model && Number.isFinite(model.commandMlS) ? model.commandMlS : null;
    const cur = ctx && Number.isFinite(ctx.currentMlS) ? ctx.currentMlS : null;

    let clipped = false;
    if (mCmd != null) {
      const c = clip(mCmd);
      if (c !== mCmd) clipped = true;
      mCmd = c;
      const lim = ctx && Number.isFinite(ctx.limiterBar) ? ctx.limiterBar : null;
      const pr = ctx && Number.isFinite(ctx.pressureBar) ? ctx.pressureBar : null;
      if (lim != null && pr != null && cur != null && mCmd > cur && pr >= lim * 0.90) mCmd = null;
      if (mCmd != null && cur != null && mCmd === cur) mCmd = null;
    }

    const aValid = aCmd != null, mValid = mCmd != null;
    if (!aValid && !mValid) return { pick: 'hold', commandMlS: null, reason: 'both-hold', clipped };
    if (aValid && !mValid) return { pick: 'algo', commandMlS: aCmd, reason: 'model-hold-or-rejected', clipped };
    if (!aValid && mValid) {
      if (used >= softCap) return { pick: 'hold', commandMlS: null, reason: 'model-over-soft-cap', clipped };
      return { pick: 'model', commandMlS: mCmd, reason: 'algo-hold-model-write', clipped };
    }
    const divergence = Math.abs(aCmd - mCmd);
    if (divergence <= 1e-9) return { pick: 'algo', commandMlS: aCmd, reason: 'identical', clipped };
    if (divergence < divergenceGate && preference < 0.5) return { pick: 'algo', commandMlS: aCmd, reason: 'small-divergence-lean-algo', clipped };
    if (used >= softCap && preference < 0.7) return { pick: 'algo', commandMlS: aCmd, reason: 'over-soft-cap-lean-algo', clipped };
    if (preference >= 0.5) return { pick: 'model', commandMlS: mCmd, reason: 'preference-model', clipped };
    return { pick: 'algo', commandMlS: aCmd, reason: 'preference-algo', clipped };
  }

  window.HxArbiter = { arbitrate, clip, snap, CMD_LO, CMD_HI };
})();
