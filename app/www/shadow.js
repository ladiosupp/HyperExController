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
  // 原生 asset loader（MainActivity shouldInterceptRequest，WebViewAssetLoader 同款 URL）：
  // https 流式 fetch，免 base64 桥的内存峰值与 JS 线程阻塞；失败回退桥读（浏览器预览再回退相对 fetch）。
  const ASSET_HTTPS = 'https://appassets.androidplatform.net/assets/www/';
  let assetHttpsOk = null;

  let session = null, loadState = 'idle', loadError = null;
  let cup = null, cups = [];
  let busy = false;
  let busySince = 0, inferErrors = 0, lastInferError = null, stageWeightsMissing = 0;
  const failedCups = new Map(); // m13：persist 失败的杯全量留这里供导出回退（内存 cups 只留摘要）
  // 仲裁倾向（默认偏算法 0.35；学习证明后可调高）。软预算是倾向不是硬墙。
  let arbPreference = 0.35;
  const ARB_SOFT_CAP = 12;

  function db() { return window.dbSet && window.dbGet ? { set: window.dbSet, get: window.dbGet } : null; }
  // m13：内存结算杯只留摘要（runId/计数），全量杯靠 IDB；_debug 形状兼容。
  function summaryOf(c) {
    return { runId: c.runId, startedAt: c.startedAt, modeAtStart: c.modeAtStart, fixLevel: c.fixLevel, decisions: c.decisions.length, writes: c.writes.length, samples: c.samples.length };
  }

  // 桥读 assets（file:// 页面 fetch 会被拦）；浏览器预览回退 fetch。
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  async function assetBytes(relPath) {
    if (assetHttpsOk !== false) {
      try {
        const hr = await fetch(ASSET_HTTPS + relPath, { cache: 'no-store' });
        if (hr.ok) { assetHttpsOk = true; return new Uint8Array(await hr.arrayBuffer()); }
      } catch (_) {}
      assetHttpsOk = false;
    }
    if (window.HxBridge && window.HxBridge.readAssetBase64) {
      const b64 = window.HxBridge.readAssetBase64('www/' + relPath);
      if (b64) return b64ToBytes(b64);
    }
    const r = await fetch(relPath);
    if (!r.ok) throw new Error('asset fetch ' + relPath + ' -> ' + r.status);
    return new Uint8Array(await r.arrayBuffer());
  }

  async function load() {
    // 学习仲裁模型独立加载（fire-and-forget；未就绪时仲裁优雅回落规则 v0）
    if (window.HxArbiter && window.HxArbiter.loadLearned) window.HxArbiter.loadLearned();
    migrate(); // 旧 kv 数组 → per-cup 键存储（幂等，保 install -r 跨装机存活）
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
      // 模型小文件先探 asset loader：可用则 wasmPaths 指 https，ORT 自己流式 fetch/编译 wasm，
      // 不再 base64 注入 wasmBinary；不可用回退旧路（file:// 下 import()/fetch 被拦，
      // .mjs 读成 blob URL、wasm 二进制注入，两者走桥；浏览器预览回退 fetch）。
      const modelBytes = await assetBytes(MODEL_URL);
      if (assetHttpsOk) {
        ort.env.wasm.wasmPaths = { mjs: ASSET_HTTPS + 'vendor/ort-wasm-simd-threaded.mjs', wasm: ASSET_HTTPS + 'vendor/ort-wasm-simd-threaded.wasm' };
      } else {
        const wasmBytes = await assetBytes('vendor/ort-wasm-simd-threaded.wasm');
        ort.env.wasm.wasmBinary = wasmBytes.buffer;
        const mjsBytes = await assetBytes('vendor/ort-wasm-simd-threaded.mjs');
        const mjsUrl = URL.createObjectURL(new Blob([mjsBytes], { type: 'text/javascript' }));
        ort.env.wasm.wasmPaths = { mjs: mjsUrl, wasm: mjsUrl };
      }
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
  function weightRegression(samples, tSec, windowS, startIdx, phase) {
    // m17：样本按 stamp 单调追加，startIdx 窗起点索引消全扫描；phase 可选过滤（决策用，响应窗不传）。
    const rows = [];
    for (let k = startIdx || 0; k < samples.length; k++) {
      const s = samples[k];
      if (s.stamp != null && s.stamp > tSec) break;
      if (s.stamp != null && s.weight != null && !s.tare && s.stamp <= tSec && s.stamp >= tSec - windowS && (!phase || s.phase === phase)) rows.push(s);
    }
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
    return { runId: runId || ('live-' + Date.now()), startedAt: Date.now(), samples: [], decisions: [], writes: [], lastDecisionAt: 0, lastCmd: null, lastCmdFrame: null, rescueStreak: 0, modelWrites: 0, lastPluginWriteCmd: null,
      modeAtStart: null, fixLevel: 'r1-r5', live: null, pendingRealized: [], pendingResponse: [], s2FirstStamp: null, pluginWriteCount: 0 };
  }

  // ---- R1：插件同口径预测 / 救急状态机（只读计算，不触发任何写入）----
  // 移植 plugin.js 2.2.48 liveTrimTick / liveTrimRegression / recoveryTimeEstimate。
  // predictedGS = decisionGS = reg.predicted ?? reg.slope（锚点 plugin.js:9134）。
  // 技能 §22.4 的「死区 0.35 + 爬升 0.85 + τ0.4」是机器时延的物理描述；插件实际
  // 预测链是尾段/头段加速度外推（S2 前瞻 1.5s、S3 1.2s，±0.6×target 夹幅），按锚点移植。
  // 救急连击用的趋势角是插件内部角（atan 不除目标），与特征第 4 维的记录角
  // （trendAngleDeg，除目标）不同口径，故内部自算，不复用 ctx.trendAngleDeg。
  const RESCUE_R = { stage2: 1.2, stage3: 1.8 }; // 插件无增益记忆时的缺省 r（liveTrimTick）
  function linReg(points) {
    const n = points.length;
    if (n < 3) return null;
    let mx = 0, my = 0;
    for (const p of points) { mx += p.x; my += p.y; }
    mx /= n; my /= n;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of points) { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    if (sxx <= 0) return null;
    const slope = sxy / sxx;
    const r2 = syy > 0 ? Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy))) : 1;
    return { slope, r2 };
  }
  function robustReg(points) {
    const sorted = points.slice().sort((a, b) => a.x - b.x);
    if (sorted.length < 8) return linReg(sorted);
    const trim = Math.max(1, Math.floor(sorted.length * 0.15));
    const kept = sorted.slice(trim, sorted.length - trim);
    return kept.length >= 4 ? linReg(kept) : linReg(sorted);
  }
  // 插件 liveTrimRegression：S2 1.6s 窗 / 尾 0.75 头 0.65 / 前瞻 1.5；
  // S3 3s 窗 / 尾 1.2 头 1.2 / 前瞻 1.2（robust 主回归）。
  // 插件 liveTrimRegression 的窗按**接收时刻**（x.tMs）筛，回归用秤时间戳。
  // 这里入参 tSec 是决策时刻（杯内秒），样本带 t（接收秒）与 stamp（秤秒）。
  // frame：插件按 profileFrame===t.frame 过滤（S3 子帧 2/3/4 各自独立窗）。
  function trimRegression(samples, tSec, phase, target, frame, sinceStamp, startIdx) {
    const isS3 = phase === 'stage3';
    const windowS = isS3 ? 3.0 : 1.6, tailSec = isS3 ? 1.2 : 0.75, headSec = isS3 ? 1.2 : 0.65, horizon = isS3 ? 1.2 : 1.5;
    // m17：t 单调追加，startIdx 窗起点索引；sinceStamp = S2 onset 裁剪（原 pool 过滤并入谓词）。
    const rows = [];
    for (let k = startIdx || 0; k < samples.length; k++) {
      const s = samples[k];
      if (s.t > tSec) break;
      if (s.stamp != null && s.weight != null && !s.tare && s.phase === phase && (frame == null || s.frame === frame) && s.t >= tSec - windowS && (sinceStamp == null || s.stamp >= sinceStamp)) rows.push(s);
    }
    const seen = new Set(); const points = [];
    for (const s of rows) {
      if (seen.has(s.stamp)) continue;
      if (points.length && (s.stamp <= points[points.length - 1].x || s.stamp - points[points.length - 1].x > 0.6)) points.length = 0;
      seen.add(s.stamp); points.push({ x: s.stamp, y: s.weight });
    }
    if (points.length < 6 || points[points.length - 1].x - points[0].x < 1.2) return null;
    const r = isS3 ? robustReg(points) : linReg(points);
    const end = points[points.length - 1].x;
    const tail = points.filter((p) => end - p.x <= tailSec), head = points.filter((p) => end - p.x >= headSec);
    const fit = (a) => (a.length >= 4 && a[a.length - 1].x - a[0].x >= 0.45) ? linReg(a) : null;
    const fast = fit(tail), early = fit(head);
    const fastSlope = fast && fast.r2 >= 0.90 && fast.slope >= 0 ? fast.slope : null;
    const moveCap = Math.max(0.2, 0.6 * target);
    const center = (a) => a.reduce((s, p) => s + p.x, 0) / a.length;
    const separationS = fast && early ? center(tail) - center(head) : null;
    const acceleration = fastSlope !== null && early && early.r2 >= 0.90 && separationS > 0.1 ? (fastSlope - early.slope) / separationS : null;
    const predicted = acceleration !== null ? Math.max(0, fastSlope + Math.max(-moveCap, Math.min(moveCap, acceleration * horizon))) : fastSlope;
    if (!r || !(r.r2 >= 0.90) || !(r.slope > 0)) return null;
    return { slope: r.slope, r2: r.r2, predicted, fastSlope, endStamp: end };
  }
  function normalTrimQuanta(phase, streak, relativeError) {
    if (relativeError > 0.15 && streak >= 6) return 8;
    if (relativeError > 0.15 && streak >= 3) return 6;
    return phase === 'stage3' ? (relativeError > 0.15 ? 4 : 2) : 4;
  }
  function recoveryTimeEstimate(errorGS, r, phase, streak, relativeError, periodS) {
    const quanta = Math.abs(errorGS) / Math.max(0.02, r / 16);
    const perWrite = Math.max(1, Math.min(normalTrimQuanta(phase, streak, relativeError), Math.round(Math.abs(errorGS) / r * 16)));
    const fastestS = 1.2 + Math.ceil(quanta / Math.max(1, perWrite)) * periodS;
    return { quanta, perWrite, fastestS };
  }
  function newLive() {
    return { frame: null, phase: null, frameStartSec: null, lastEvalStamp: null, lastDecStamp: null,
      lastCheckGS: null, lastCheckAtSec: null, rescueAngleStreak: 0, bigAngleStreak: 0,
      rescueMode: false, rescueCalmStreak: 0, lastWriteAtSec: null, lastWriteSeen: null, lastWriteFrame: null,
      predictedGS: null, predictedAvailable: false, rescueActive: false, rescueHot: false,
      trendAngleDeg: null, remainingS: null, reg: null, rEst: null, rAtSec: 0, rCommand: null, rStamp: null, rFirstStamp: null, rCount: 0 };
  }
  // 当杯局部增益估计（插件 updateLiveGain 同口径）：静默一个回归窗 + 高 R² +
  // 快慢斜率一致 + 压力留余量 + 机器流量贴指令时，r = 杯流/指令 指数平滑。
  // 救急 cannotReturn 的 r 优先用它（插件 liveTrimControlCenter 的 current-cup-blend
  // 在 APK 侧拿不到跨杯增益记忆，局部估计是可得的最接近先验），缺省回落 RESCUE_R。
  function updateRGain(lv, cup, ctx, reg, nowSec) {
    // 分母用实际生效指令（插件 t.commands[frame]）：优先已 ACK 的 pending，
    // 其次 external-status.lastCommandMlS（插件指令台账当前值）。
    const pend = ctx.pending;
    const cmd = pend && pend.ack && Number.isFinite(pend.command) ? pend.command : ctx.commandMlS;
    if (!(cmd > 0) || !reg) { lv.rEst = null; return; }
    const windowS = lv.phase === 'stage3' ? 3.0 : 1.6;
    const quiet = lv.lastWriteAtSec === null || nowSec - lv.lastWriteAtSec >= windowS;
    const target = Number(ctx.targetGS);
    const fast = reg.fastSlope;
    const pr = ctx.pressureBar, lim = ctx.limiterBar, flow = ctx.machineFlowMlS;
    const stable = quiet && reg.r2 >= 0.98 && fast !== null && fast !== undefined &&
      Math.abs(fast - reg.slope) <= Math.max(0.03, target * 0.03) &&
      pr != null && lim != null && pr < lim * 0.90 &&
      flow != null && flow >= cmd * 0.85 && flow <= cmd * 1.15;
    if (!stable) { lv.rEst = null; return; }
    const observed = reg.slope / cmd;
    if (!(observed >= 0.2 && observed <= 3)) { lv.rEst = null; return; }
    const reset = lv.rCommand === null || Math.abs(lv.rCommand - cmd) > 1 / 32;
    if (reset) { lv.rEst = observed; lv.rCount = 1; lv.rFirstStamp = reg.endStamp; lv.rStamp = reg.endStamp; lv.rCommand = cmd; lv.rAtSec = nowSec; return; }
    if (lv.rStamp !== null && reg.endStamp <= lv.rStamp) return;
    lv.rStamp = reg.endStamp; lv.rCount++;
    lv.rEst = lv.rEst + 0.20 * (observed - lv.rEst); lv.rAtSec = nowSec;
  }
  // S2 出液起点（插件 stage2CupOnset 同口径）：预测回归只取起点之后的样本。
  function updateS2Onset(cup, s) {
    if (cup.s2FirstStamp != null || s.phase !== 'stage2' || s.stamp == null || s.weight == null || s.tare) return;
    const target = Number(cup.live && cup.live.target) || 5;
    const threshold = Math.max(0.05, target * 0.01);
    // m17：onset 滑窗只留 2.05s，窗起点索引即可（更旧的行本来就被 shift 出窗）。
    const rows = [];
    for (let k = winStart(cup, 'so', s.stamp, 2.05); k < cup.samples.length; k++) {
      const x = cup.samples[k];
      if (x.phase === 'stage2' && x.stamp != null && x.weight != null && !x.tare) rows.push(x);
    }
    const seen = new Set(); const window = [];
    for (const row of rows) {
      if (seen.has(row.stamp)) continue;
      if (window.length && (row.stamp <= window[window.length - 1].x || row.stamp - window[window.length - 1].x > 0.6 || row.weight < window[window.length - 1].y - 0.2)) window.length = 0;
      seen.add(row.stamp); window.push({ x: row.stamp, y: row.weight });
      while (window.length && row.stamp - window[0].x > 2.05 + 1e-9) window.shift();
      if (window.length < 4 || row.stamp - window[0].x < 0.39 || row.weight - window[0].y < 0.2 - 1e-9) continue;
      const fit = linReg(window); if (!fit || fit.r2 < 0.85 || fit.slope < threshold) continue;
      let rise = window.findIndex((p) => p.y - window[0].y >= 0.05 - 1e-9);
      let onsetIndex = Math.max(0, rise - 1);
      while (onsetIndex > 0 && window[onsetIndex].y > window[onsetIndex - 1].y + 1e-9) onsetIndex--;
      cup.s2FirstStamp = window[onsetIndex].x;
      return;
    }
  }
  // 每秤样本推进一次插件同口径状态（对应 liveTrimTick 的 fresh evaluation 段）。
  function updateLive(lv, cup, ctx, s, nowMs) {
    const phase = ctx.phase, frame = ctx.frame != null ? ctx.frame : null;
    const target = Number(ctx.targetGS);
    lv.target = target;
    if ((phase !== 'stage2' && phase !== 'stage3') || !Number.isFinite(target) || target <= 0 || frame == null || s.stamp == null) {
      lv.predictedGS = null; lv.predictedAvailable = false; lv.rescueActive = false; lv.rescueHot = false; lv.reg = null;
      return;
    }
    if (phase === 'stage2') updateS2Onset(cup, s);
    if (frame !== lv.frame || phase !== lv.phase) {
      if (phase !== lv.phase) { lv.rescueMode = false; lv.rescueAngleStreak = 0; lv.rescueCalmStreak = 0; lv.bigAngleStreak = 0; }
      lv.frame = frame; lv.phase = phase; lv.frameStartSec = s.t; lv.lastEvalStamp = null; lv.lastDecStamp = null;
      lv.predictedGS = null; lv.predictedAvailable = false; lv.rescueActive = false; lv.rescueHot = false; lv.reg = null;
      return; // 插件 frame-settle：本样本不出新评估
    }
    // 真实写入检测（同帧变化才是 write；帧切换在 onSample 里记 frame-change）。
    // 用 lv 自己的台账，不受 cup 台账杯首初始化影响。
    const cmd = ctx.commandMlS;
    if (cmd != null && lv.lastWriteSeen != null && cmd !== lv.lastWriteSeen && lv.lastWriteFrame === frame) {
      lv.lastWriteAtSec = nowMs / 1000;
    }
    if (cmd != null) { lv.lastWriteSeen = cmd; lv.lastWriteFrame = frame; }
    if (nowMs / 1000 - lv.frameStartSec < 1.6) return; // settling
    const reg = trimRegression(cup.samples, s.t, phase, target, frame, phase === 'stage2' ? cup.s2FirstStamp : null, winStart(cup, 't3', s.t, 3.0));
    lv.reg = reg;
    if (!reg) { lv.predictedGS = null; lv.predictedAvailable = false; lv.rescueActive = false; lv.rescueHot = false; return; }
    if (lv.lastWriteAtSec !== null && nowMs / 1000 - lv.lastWriteAtSec < 0.05) return;
    if (lv.lastEvalStamp === reg.endStamp || lv.lastDecStamp === reg.endStamp) return; // 等新秤样本
    lv.lastEvalStamp = reg.endStamp;
    updateRGain(lv, cup, ctx, reg, nowMs / 1000);
    const decisionGS = reg.predicted !== null && reg.predicted !== undefined && Number.isFinite(reg.predicted) ? reg.predicted : reg.slope;
    lv.predictedGS = decisionGS; lv.predictedAvailable = true;
    // 内部趋势角（liveTrimTick 主判据：atan 不除目标）
    let angleDeg = null;
    if (lv.lastCheckGS !== null && lv.lastCheckAtSec > 0) {
      const dtS = nowMs / 1000 - lv.lastCheckAtSec;
      if (dtS > 0.1) {
        const trendSlope = (reg.slope - lv.lastCheckGS) / dtS;
        const mag = Math.atan(Math.abs(trendSlope)) * 180 / Math.PI, inBand = Math.abs(reg.slope / target - 1) <= 0.02;
        angleDeg = Math.abs(trendSlope) < 1e-9 ? (inBand ? 0 : 90) : ((target > reg.slope ? trendSlope > 0 : trendSlope < 0) ? Math.min(90, mag) : 180 - Math.min(90, mag));
      }
    }
    lv.trendAngleDeg = angleDeg;
    if (angleDeg !== null && angleDeg >= 90) lv.bigAngleStreak++; else lv.bigAngleStreak = 0;
    const predictedRel = Math.abs(target - decisionGS) / target;
    const actualRel = Math.abs(target - reg.slope) / target;
    if (angleDeg !== null && angleDeg >= 120) lv.rescueAngleStreak++; else lv.rescueAngleStreak = 0;
    const stageEndWeight = phase === 'stage2' ? ctx.stage2WeightG : ctx.finalWeightG;
    const cum = ctx.cumulativeWeightG;
    let cannotReturn = false;
    lv.remainingS = null;
    if (Number.isFinite(stageEndWeight) && Number.isFinite(cum)) {
      const remainingS = Math.max(0, (stageEndWeight - cum) / Math.max(0.1, decisionGS));
      lv.remainingS = remainingS;
      // 局部增益可用条件（插件 current-cup-blend）：≥3 个估计、覆盖满一个回归窗、600ms 内新鲜
      const windowS = phase === 'stage3' ? 3.0 : 1.6;
      const rLocalOk = lv.rEst !== null && lv.rCount >= 3 && lv.rFirstStamp !== null &&
        (reg.endStamp - lv.rFirstStamp) + 1e-9 >= windowS && nowMs / 1000 - lv.rAtSec <= 0.6;
      const r = rLocalOk ? lv.rEst : RESCUE_R[phase];
      const periodS = (phase === 'stage3' ? 2400 : 1200) / 1000;
      const est = recoveryTimeEstimate(target - decisionGS, r, phase, lv.bigAngleStreak, predictedRel, periodS);
      cannotReturn = est.fastestS > remainingS;
    }
    const rescueHot = lv.rescueAngleStreak >= 2 && predictedRel > 0.25 && actualRel >= 0.12 && cannotReturn;
    lv.rescueHot = rescueHot;
    if (rescueHot) { lv.rescueMode = true; lv.rescueCalmStreak = 0; }
    else if (lv.rescueMode) {
      if (predictedRel < 0.06 || (angleDeg !== null && angleDeg < 90)) lv.rescueCalmStreak++; else lv.rescueCalmStreak = 0;
      if (lv.rescueCalmStreak >= 2) lv.rescueMode = false;
    }
    lv.rescueActive = !!lv.rescueMode && predictedRel >= 0.08;
    lv.lastCheckGS = reg.slope; lv.lastCheckAtSec = nowMs / 1000;
  }

  let persistError = null;
  let persistChain = Promise.resolve();
  let migratePromise = null;
  // m17：窗起点索引缓存（键独立：t3=预测窗 / s3=决策窗 / sr=响应窗 / so=onset；样本 shift 首元素变时重置）。
  function winStart(cup, key, val, span) {
    const arr = cup.samples;
    let c = cup._winIdx;
    if (!c || c.first !== arr[0]) c = cup._winIdx = { first: arr[0] };
    let i = c[key] || 0;
    if (key === 't') { while (i < arr.length && arr[i].t < val - span) i++; }
    else { while (i < arr.length && (arr[i].stamp == null || arr[i].stamp < val - span)) i++; }
    c[key] = i;
    return i;
  }
  // per-cup 键存储（app.js openDb v2 建 hecShadowCups objectStore，keyPath runId）；
  // 无该 store 的环境（旧测试沙箱）回退 kv 全数组路径，仍走链。
  function cupDb() {
    return window.dbCupPut && window.dbCupAll && window.dbCupKeys && window.dbCupDel && window.dbCupGet
      ? { put: window.dbCupPut, all: window.dbCupAll, keys: window.dbCupKeys, del: window.dbCupDel, get: window.dbCupGet } : null;
  }
  // 首载迁移：旧 kv hecShadowCups 数组逐杯 put 进 per-cup store，成功后清空旧键；幂等。
  function migrate() {
    if (migratePromise) return migratePromise;
    migratePromise = (async () => {
      const cd = cupDb(); const d = db();
      if (!cd || !d) return;
      let old = [];
      try { old = ((await d.get('hecShadowCups')) || []).filter((x) => x && x.runId); } catch (_) { return; }
      if (!old.length) return;
      for (const rec of old) await cd.put(rec);
      try { await d.set('hecShadowCups', []); } catch (_) {}
      try { await d.set('hecShadowLastRunId', old[old.length - 1].runId); } catch (_) {}
    })().catch((e) => { persistError = String(e && e.message || e); });
    return migratePromise;
  }
  // 内部运行态（live 状态机 / 待结算队列）不进存储与导出：队列里是决策点引用，
  // 直接序列化会把同一批决策点重复写两份。
  function cleanCup(c) {
    const copy = Object.assign({}, c);
    delete copy.live; delete copy.pendingRealized; delete copy.pendingResponse; delete copy._decTotal; delete copy._winIdx;
    // _decStamp 是 R4 响应窗结算用的内部秤时间戳，不进存储/导出
    if (Array.isArray(copy.decisions)) copy.decisions = copy.decisions.map((d) => { const { _decStamp, ...rest } = d; return rest; });
    return copy;
  }
  // 显式传入要存的杯：调用方随后可能把全局 cup 置 null，先同步快照再入链。
  // 链式串行（同 app.js saveChain 模式）：消除交错 persist 的 lost update；exportJSON 先等链尾。
  function persist(c) {
    if (!c) return persistChain;
    const rec = JSON.parse(JSON.stringify(cleanCup(c)));
    persistChain = persistChain.then(async () => {
      await migrate();
      const cd = cupDb();
      if (cd) {
        await cd.put(rec);
        const keys = await cd.keys();
        if (keys.length > 40) {
          const all = await cd.all();
          all.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
          for (let i = 0; i < keys.length - 40; i++) await cd.del(all[i].runId);
        }
      } else {
        const d = db(); if (!d) return;
        const all = ((await d.get('hecShadowCups')) || []).filter((x) => x && x.runId);
        const i = all.findIndex((x) => x && x.runId === rec.runId);
        if (i >= 0) all[i] = rec; else all.push(rec);
        while (all.length > 40) all.shift();
        await d.set('hecShadowCups', all);
      }
      failedCups.delete(rec.runId);
      const d2 = db();
      if (d2) { try { await d2.set('hecShadowLastRunId', rec.runId); } catch (_) {} }
      persistError = null;
    }).catch((e) => { persistError = String(e && e.message || e); failedCups.set(rec.runId, rec); });
    return persistChain;
  }

  // 每个秤样本调用（control.js onScaleSnapshot 钩子）。只记录，不发送。
  async function onSample(ctx) {
    if (!ctx || !ctx.run) return;
    if (loadState === 'idle') load();
    if (!cup || (ctx.runId && cup.runId !== ctx.runId)) {
      // 与 onCupEnd 同口径：有决策或写入即结算（审计 m2：writes-only 杯不再丢）。
      if (cup && (cup.decisions.length || cup.writes.length)) { finalizeCup(cup); cups.push(summaryOf(cup)); persist(cup); }
      cup = newCup(ctx.runId);
      cup.modeAtStart = ctx.mode || null;
    }
    const s = ctx.sample;
    cup.samples.push({ t: s.t, stamp: s.stamp != null ? s.stamp : null, weight: s.weight, tare: !!s.tare, phase: ctx.phase, frame: ctx.frame != null ? ctx.frame : null });
    if (cup.samples.length > 4000) cup.samples.shift();
    // m9：阶段目标重量缺失计数（loadStageWeights 失败 → rescue cannotReturn 残废，status 暴露）。
    if (ctx.extracting && (ctx.phase === 'stage2' || ctx.phase === 'stage3') && !(Number.isFinite(ctx.stage2WeightG) && Number.isFinite(ctx.finalWeightG))) stageWeightsMissing++;
    // R2：插件写入台账区分帧切换与真实写入。帧号变化引起的跳变记 frame-change，
    // 同帧变化记 write；仲裁算法候选只消费 kind:'write'。
    const cmd = ctx.commandMlS;
    const frame = ctx.frame != null ? ctx.frame : null;
    if (cmd != null && cup.lastCmd != null && cmd !== cup.lastCmd) {
      const kind = (frame != null && cup.lastCmdFrame === frame) ? 'write' : 'frame-change';
      cup.writes.push({ tMs: Math.round(s.t * 1000), from: cup.lastCmd, to: cmd, source: 'plugin', frame, kind });
      if (kind === 'write') {
        cup.lastPluginWriteCmd = cmd;
        cup.pluginWriteCount++; // 学习仲裁特征 plugin_writes_so_far（插件真实写入计数，与节拍无关）
        // R3：同帧真实写入 → 回记等待中的决策点
        for (const d of cup.pendingRealized) {
          if (d.frame === frame && d.realizedCommandMlS == null) {
            d.realizedCommandMlS = cmd; d.realizedAtMs = Math.round(s.t * 1000); d.realizedFrame = frame;
            d.matched = !!(d.arbiter && d.arbiter.pick === 'model' && cmd === d.arbiter.commandMlS);
          }
        }
        cup.pendingRealized = cup.pendingRealized.filter((d) => d.realizedCommandMlS == null);
      }
    }
    if (cmd != null) { cup.lastCmd = cmd; cup.lastCmdFrame = frame; }

    // R1：插件同口径预测 / 救急状态（每样本推进，决策点取特征）
    if (!cup.live) cup.live = newLive();
    updateLive(cup.live, cup, ctx, s, Math.round(s.t * 1000));

    // R4：写后响应窗到期结算（秤时间戳口径 0.75–2.75s）
    settleResponses(cup, s);

    // m10：busy 超时自愈（session 挂死 5s 后复位，计错误数）；M2 守卫：后台/ext 冻结不出决策防脏标签。
    if (busy && busySince && Date.now() - busySince > 5000) { busy = false; inferErrors++; lastInferError = 'busy-timeout-self-heal'; }
    if (loadState !== 'ready' || busy || !ctx.extracting || ctx.takeover || ctx.stale) return;
    if (ctx.phase !== 'stage2' && ctx.phase !== 'stage3') return;
    const target = Number(ctx.targetGS);
    if (!Number.isFinite(target) || target <= 0) return;
    const lv = cup.live;
    const rescue = lv.rescueActive;
    const interval = rescue ? RESCUE_INTERVAL_MS : MIN_INTERVAL_MS;
    const nowMs = Math.round(s.t * 1000);
    if (nowMs - cup.lastDecisionAt < interval) return;
    if (s.stamp == null) return;
    // 决策回归按 phase 过滤（对齐离线 regAt，审计 m3）+ 窗起点索引（m17）；响应窗不过滤（§6.12）。
    const reg = weightRegression(cup.samples, s.stamp, WINDOW_S[ctx.phase] || 1.6, winStart(cup, 's3', s.stamp, 3.0), ctx.phase);
    if (!reg) return;

    const obs = {
      targetGS: target, rawGS: reg.slope, regR2: reg.r2,
      predictedGS: lv.predictedGS,
      trendAngleDeg: ctx.trendAngleDeg != null ? ctx.trendAngleDeg : null,
      pressureBar: ctx.pressureBar, machineFlowMlS: ctx.machineFlowMlS,
      cumulativeWeightG: ctx.cumulativeWeightG, commandMlS: cmd,
      phase: ctx.phase, rescue,
    };
    busy = true; busySince = Date.now();
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
        const capped = rescue ? quanta : Math.max(-NORMAL_CAP, Math.min(NORMAL_CAP, quanta));
        candidate = Math.round(Math.max(CMD_LO, Math.min(CMD_HI, cur + capped * QUANTUM)) * 16) / 16;
        if (candidate === cur) { candidate = null; } else { action = 'write'; }
      }
      cup.lastDecisionAt = nowMs;
      lv.lastDecStamp = lv.reg ? lv.reg.endStamp : lv.lastDecStamp;
      // 仲裁（只记录不发送）：算法候选 = 自上次决策以来插件实际写入；模型候选 = candidate
      let arb = null;
      if (window.HxArbiter) {
        const algoCmd = cup.lastPluginWriteCmd;
        // 学习仲裁优先（替换第 2/3 层，第 1 层硬包线共用）；未就绪回落规则 v0。
        // quanta 传原始浮点（与离线训练特征同口径）；obs 快照供 20 维特征。
        const arbCtx = { phase: ctx.phase, targetGS: target, currentMlS: cur, pressureBar: ctx.pressureBar,
          limiterBar: ctx.limiterBar, rescue, modelWritesSoFar: cup.modelWrites, budgetSoftCap: ARB_SOFT_CAP,
          pluginWritesSoFar: cup.pluginWriteCount, rawGS: obs.rawGS, predictedGS: obs.predictedGS,
          trendAngleDeg: obs.trendAngleDeg, machineFlowMlS: ctx.machineFlowMlS,
          cumulativeWeightG: ctx.cumulativeWeightG, regR2: obs.regR2 };
        const arbModel = { commandMlS: candidate, writeProb, quanta: quantaRaw };
        arb = window.HxArbiter.learnedReady()
          ? window.HxArbiter.arbitrateLearned({ commandMlS: algoCmd }, arbModel, arbCtx, { preference: arbPreference })
          : window.HxArbiter.arbitrate({ commandMlS: algoCmd }, arbModel, arbCtx, { preference: arbPreference });
        if (arb.pick === 'model') cup.modelWrites++;
        cup.lastPluginWriteCmd = null; // 已消费本决策点的算法写入
      }
      const dec = {
        tMs: nowMs, phase: ctx.phase, frame: ctx.frame != null ? ctx.frame : null,
        obs, writeProb: Math.round(writeProb * 1000) / 1000, quantaRaw: Math.round(quantaRaw * 100) / 100,
        quanta, action, candidateMlS: candidate, pluginCommandMlS: cmd,
        predictedAvailable: lv.predictedAvailable,
        arbiter: arb ? { pick: arb.pick, commandMlS: arb.commandMlS, reason: arb.reason, clipped: arb.clipped, preference: arbPreference,
          kind: arb.kind || 'rule', pModelBetter: arb.pModelBetter != null ? Math.round(arb.pModelBetter * 10000) / 10000 : null,
          threshold: arb.threshold != null ? arb.threshold : null } : null,
        realizedCommandMlS: null, realizedAtMs: null, realizedFrame: null, matched: false,
        responseGS: null, responseR2: null, responseWindow: null, responseIncomplete: false,
        sent: false,
      };
      dec._decStamp = s.stamp;
      cup.decisions.push(dec);
      cup.pendingRealized.push(dec);
      cup.pendingResponse.push(dec);
      if (cup.decisions.length > 2000) cup.decisions.shift();
      // i9：checkpoint 按累计决策数（_decTotal）而非截断后 length，2000 上限后不再每决策都 persist。
      cup._decTotal = (cup._decTotal || 0) + 1;
      if (cup._decTotal % 20 === 0) persist(cup);
    } catch (e) {
      inferErrors++; lastInferError = String(e && e.message || e); // m10：推理错误计数进 status
    } finally { busy = false; busySince = 0; }
  }

  // R4：决策点后 0.75–2.75s（插件 controlRunReview 同窗，秤时间戳口径）RAW 回归。
  // 回归口径复用 weightRegression（去重、跳变 ≤0.6s、R²≥0.90、slope>0）。
  // 响应属于实际执行的指令；模型候选的反事实响应不在此记录（仍靠植物估）。
  function settleResponses(cup, s) {
    if (!cup.pendingResponse.length || s.stamp == null) return;
    const still = [];
    for (const d of cup.pendingResponse) {
      const decStamp = d._decStamp;
      if (decStamp == null) { d.responseIncomplete = true; continue; }
      if (s.stamp < decStamp + 2.75) { still.push(d); continue; }
      const rows = cup.samples.slice(winStart(cup, 'sr', decStamp + 2.75, 2.0)); // m17：窗起点索引
      const reg = rows.length ? weightRegression(rows, decStamp + 2.75, 2.0) : null;
      if (reg) { d.responseGS = reg.slope; d.responseR2 = reg.r2; d.responseWindow = [0.75, 2.75]; }
      else { d.responseIncomplete = true; }
    }
    cup.pendingResponse = still;
  }
  function finalizeCup(c) {
    for (const d of c.pendingRealized) { if (d.realizedCommandMlS == null) { d.realizedCommandMlS = null; d.matched = false; } }
    for (const d of c.pendingResponse) { if (d.responseGS == null) d.responseIncomplete = true; }
    c.pendingRealized = []; c.pendingResponse = [];
  }

  function onCupEnd() {
    if (cup && (cup.decisions.length || cup.writes.length)) { finalizeCup(cup); cups.push(summaryOf(cup)); persist(cup); }
    cup = null;
  }

  window.HxShadow = {
    load,
    onSample,
    onCupEnd,
    status: function () { return { loadState, loadError, model: 'bc_v0', arbiter: window.HxArbiter && window.HxArbiter.learnedStatus ? window.HxArbiter.learnedStatus() : null, cup: cup ? { runId: cup.runId, decisions: cup.decisions.length, writes: cup.writes.length } : null, archived: cups.length, inferErrors, lastInferError, stageWeightsMissing }; },
    exportJSON: async function () {
      await persistChain; // 先等在途 persist 落盘，杯末立即导出不再缺刚结算杯（审计 M1）
      await migrate();
      const cd = cupDb();
      let all = [];
      if (cd) { try { all = (await cd.all()).filter((x) => x && x.runId); } catch (_) {} }
      else { const d = db(); try { all = ((d && await d.get('hecShadowCups')) || []).filter((x) => x && x.runId); } catch (_) {} }
      // persistError 回退：failedCups（persist 失败杯的全量快照）按 runId 并档，防丢杯静默。
      if (persistError) {
        for (const rec of failedCups.values()) {
          const i = all.findIndex((x) => x && x.runId === rec.runId);
          if (i >= 0) all[i] = rec; else all.push(rec);
        }
      }
      all.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
      if (cup) all = all.concat([cleanCup(cup)]);
      // 并档规则：训练标签只取 modeAtStart=full 且 fixLevel 齐全的杯；
      // hec 杯与 pre-fix 旧杯（无 fixLevel）只作链路证据，不进训练。
      return JSON.stringify({ kind: 'HecShadowLog', schema: 2, model: 'bc_v0', rectify: '2026-11-16', exportedAt: new Date().toISOString(), cups: all });
    },
    // m16：学习中心只读最近杯（在跑杯优先，否则 lastRunId 单杯读），不全量 exportJSON。
    latestCup: async function () {
      await persistChain; await migrate();
      if (cup && (cup.decisions.length || cup.writes.length)) return cleanCup(cup);
      const cd = cupDb(); const d = db();
      let rid = null;
      try { rid = d && await d.get('hecShadowLastRunId'); } catch (_) {}
      if (rid && cd) { try { const rec = await cd.get(rid); if (rec && rec.runId) return rec; } catch (_) {} }
      if (cd) { try { const all = await cd.all(); if (all.length) { all.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0)); return all[all.length - 1]; } } catch (_) {} }
      return null;
    },
    _features: features,
    _regression: weightRegression,
    _trimReg: trimRegression,
    _onset: updateS2Onset,
    _newLive: newLive,
    _updateLive: updateLive,
    _newCup: newCup,
    _settleResponses: settleResponses,
    _finalizeCup: finalizeCup,
    setPreference: function (p) { if (Number.isFinite(p)) arbPreference = Math.max(0, Math.min(1, p)); return arbPreference; },
    getPreference: function () { return arbPreference; },
    _debug: function () { return { cup: cup ? { runId: cup.runId, decisions: cup.decisions.length, samples: cup.samples.length, writes: cup.writes.length } : null, cups: cups.map(function (c) { return c ? { runId: c.runId, decisions: c.decisions } : String(c); }), persistError: persistError, inferErrors: inferErrors, stageWeightsMissing: stageWeightsMissing }; },
  };
})();
