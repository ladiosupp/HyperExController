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
  // ---- Wave B 同步债基础设施（full→hec 里程碑项③；只建 schema/gate/字段，不改决策消费）----
  const GAIN_MEMORY_SCHEMA = 1;             // 插件 gainMemory schema（2.2.59 格式，viBuckets 预留）
  const GAIN_R_MIN = 0.2, GAIN_R_MAX = 3;
  const GAIN_MEMORY_SIGNATURE_SAMPLES = 6, GAIN_MEMORY_BUCKET_RADIUS = 0.12, GAIN_MEMORY_MAX_BUCKETS = 12;
  const S2_REFILL_VI_RATIO_MIN = 0.2, S2_REFILL_VI_RATIO_MAX = 0.8;
  const S2_VI_LEARN_STORAGE_MIN = 12, S2_VI_LEARN_STORAGE_MAX = 40;
  const S2_VI_BANDS = [[0.2, 0.4], [0.4, 0.6], [0.6, 0.8]];
  const SCALE_SAMPLE_GATE = Object.freeze({ minGapMs: 60, monotonic: true }); // 2.2.57 同口径
  const GAIN_MEMORY_KEY = 'hecGainMemory';  // APK 镜像 kv 键（插件主本，pre-cup 刷新；fingerprint 来源待②裁）
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
      modeAtStart: null, fixLevel: 'r1-r5', live: null, pendingRealized: [], pendingResponse: [], s2FirstStamp: null, s2FirstT: null, pluginWriteCount: 0,
      cfgView: null, estimator: null };
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
  // Wave C D3（插件 normalTrimQuanta 9602）：S2 大缺口（>30%）立即抬常规步限 6/8，不等角度积累。
  function normalTrimQuanta(phase, streak, relativeError, largeGap) {
    if (largeGap && phase === 'stage2') return streak >= 3 ? 8 : 6;
    if (relativeError > 0.15 && streak >= 6) return 8;
    if (relativeError > 0.15 && streak >= 3) return 6;
    return phase === 'stage3' ? (relativeError > 0.15 ? 4 : 2) : 4;
  }
  function recoveryTimeEstimate(errorGS, r, phase, streak, relativeError, periodS, largeGap) {
    const quanta = Math.abs(errorGS) / Math.max(0.02, r / 16);
    const perWrite = Math.max(1, Math.min(normalTrimQuanta(phase, streak, relativeError, largeGap), Math.round(Math.abs(errorGS) / r * 16)));
    const fastestS = 1.2 + Math.ceil(quanta / Math.max(1, perWrite)) * periodS;
    return { quanta, perWrite, fastestS };
  }
  function newLive() {
    return { frame: null, phase: null, frameStartSec: null, lastEvalStamp: null, lastDecStamp: null,
      lastCheckGS: null, lastCheckAtSec: null, rescueAngleStreak: 0, bigAngleStreak: 0,
      rescueMode: false, rescueCalmStreak: 0, lastWriteAtSec: null, lastWriteSeen: null, lastWriteFrame: null,
      predictedGS: null, predictedAvailable: false, rescueActive: false, rescueHot: false,
      trendAngleDeg: null, remainingS: null, reg: null, rEst: null, rAtSec: 0, rCommand: null, rStamp: null, rFirstStamp: null, rCount: 0,
      largeGapS2: false, commandGapPct: null, controlCenterMlS: null, controlSource: null };
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
      seen.add(row.stamp); window[window.length - 1].t = row.t; // Wave B：补记到达 t（wetLat 时基，s.t 杯内相对秒）
      while (window.length && row.stamp - window[0].x > 2.05 + 1e-9) window.shift();
      if (window.length < 4 || row.stamp - window[0].x < 0.39 || row.weight - window[0].y < 0.2 - 1e-9) continue;
      const fit = linReg(window); if (!fit || fit.r2 < 0.85 || fit.slope < threshold) continue;
      let rise = window.findIndex((p) => p.y - window[0].y >= 0.05 - 1e-9);
      let onsetIndex = Math.max(0, rise - 1);
      while (onsetIndex > 0 && window[onsetIndex].y > window[onsetIndex - 1].y + 1e-9) onsetIndex--;
      cup.s2FirstStamp = window[onsetIndex].x;
      cup.s2FirstT = window[onsetIndex].t != null ? window[onsetIndex].t : null; // Wave B：onset 到达 t（wetLat=onset.t−boost.t 同基；s2FirstStamp 保留供回归窗）
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
    // Wave C D3：控制中心等价物（估计器；空记忆/无历史/无 local → profile-base，r=null → RESCUE_R 缺省，
    // 与旧口径逐字一致）＋largeGap＝|command−cc.commandMlS|/cc.commandMlS>.30（仅 S2）。
    // rescueHot 角度豁免（streak≥2 || largeGap），predictedRel/actualRel/cannotReturn 后三门不动。
    const cc = estControlCenterForLive(lv, cup, ctx, reg, nowMs);
    const rRescue = cc && Number(cc.r) > 0 ? Number(cc.r) : RESCUE_R[phase];
    const gapRel = cc && Number.isFinite(cc.commandMlS) && cc.commandMlS > 0 && cmd != null ? Math.abs(cmd - cc.commandMlS) / cc.commandMlS : null;
    const largeGap = phase === 'stage2' && gapRel !== null && gapRel > .30;
    lv.largeGapS2 = largeGap;
    lv.commandGapPct = gapRel === null ? null : Math.round(gapRel * 1000) / 10;
    lv.controlCenterMlS = cc ? cc.commandMlS : null;
    lv.controlSource = cc ? cc.source : null;
    if (Number.isFinite(stageEndWeight) && Number.isFinite(cum)) {
      const remainingS = Math.max(0, (stageEndWeight - cum) / Math.max(0.1, decisionGS));
      lv.remainingS = remainingS;
      // 局部增益 blend 已并入 estLiveTrimControlCenter（count≥3/覆盖满窗/600ms 新鲜；prior=platformMemoryGain||local.r）。
      const periodS = estLiveResponseIntervalMs(phase, false, largeGap) / 1000;
      const est = recoveryTimeEstimate(target - decisionGS, rRescue, phase, lv.bigAngleStreak, predictedRel, periodS, largeGap);
      cannotReturn = est.fastestS > remainingS;
    }
    const rescueHot = (lv.rescueAngleStreak >= 2 || largeGap) && predictedRel > 0.25 && actualRel >= 0.12 && cannotReturn;
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
  // ---- Wave B：gainMemory 镜像 schema＋normalize（插件 1335–1407 同口径，含 legacy 容错）----
  // 插件主本＋APK 镜像（统筹裁①）；本波只建存储/normalize 基础设施，pre-cup 刷新与消费 Wave C；
  // viBuckets 预留 fpKey 字段位（完整指纹门硬依赖②fingerprint 来源，待用户裁）。记忆不删改。
  function gmRound(v, n) { const f = Math.pow(10, n); return Math.round(v * f) / f; }
  function gmFiniteOrNull(v) { if (v === null || v === undefined || v === '') return null; const x = Number(v); return Number.isFinite(x) ? x : null; }
  function emptyGainMemory() {
    return { schema: GAIN_MEMORY_SCHEMA, buckets: [], viBuckets: [], seq: 0, lastBucketId: null, updatedAt: null };
  }
  function normalizeGainMemory(raw) {
    const out = emptyGainMemory();
    out.dropped = [];
    if (!raw || typeof raw !== 'object') return out;
    const seen = new Set();
    for (const row of Array.isArray(raw.buckets) ? raw.buckets : []) {
      if (!row || typeof row !== 'object') continue;
      const center = Number(row.center), radius = Number(row.radius);
      if (!Number.isFinite(center) || center <= 0) continue;
      const id = String(row.id || ''); if (!id || seen.has(id)) continue;
      const samples = (Array.isArray(row.samples) ? row.samples : []).map(Number).filter(x => Number.isFinite(x) && x > 0).slice(-GAIN_MEMORY_SIGNATURE_SAMPLES);
      const stages = {};
      for (const key of ['s2', 's3']) {
        const x = row.stages && row.stages[key];
        const r = Number(x && x.r);
        if (!Number.isFinite(r)) continue;
        if (!(r >= GAIN_R_MIN && r <= GAIN_R_MAX)) {
          out.dropped.push({ bucketId: id, stage: key, r: gmRound(r, 4), reason: 'r outside [' + GAIN_R_MIN + ',' + GAIN_R_MAX + ']' });
          continue;
        }
        stages[key] = { r: gmRound(r, 4), n: Math.max(1, Math.floor(Number(x.n) || 1)),
          lastDeviation: gmFiniteOrNull(x.lastDeviation) !== null ? gmRound(Number(x.lastDeviation), 4) : null,
          lastObservedR: gmFiniteOrNull(x.lastObservedR) !== null ? gmRound(Number(x.lastObservedR), 4) : null,
          lastLocalR: gmFiniteOrNull(x.lastLocalR) !== null ? gmRound(Number(x.lastLocalR), 4) : null,
          damped: !!x.damped,
          drift: gmFiniteOrNull(x.drift) !== null ? gmRound(Number(x.drift), 4) : null,
          commandMlS: gmFiniteOrNull(x.commandMlS) !== null ? gmRound(Number(x.commandMlS), 4) : null,
          commandBand: typeof x.commandBand === 'string' ? x.commandBand : null,
          bands: (function () { const b = {}; for (const k of Object.keys(x.bands && typeof x.bands === 'object' ? x.bands : {})) { const v = x.bands[k], br = Number(v && v.r); if (!(br >= GAIN_R_MIN && br <= GAIN_R_MAX)) continue; b[k] = { r: gmRound(br, 4), n: Math.max(1, Math.floor(Number(v.n) || 1)), lastObservedR: gmFiniteOrNull(v.lastObservedR) !== null ? gmRound(Number(v.lastObservedR), 4) : null, updatedAt: v.updatedAt || null, steadyN: v.steadyN == null ? null : (Number.isFinite(Number(v.steadyN)) ? Math.max(0, Math.floor(Number(v.steadyN))) : null), provisional: v.provisional === true }; } return Object.keys(b).length ? b : null; })(),
          lastRunId: x.lastRunId == null ? null : String(x.lastRunId), updatedAt: x.updatedAt || null };
      }
      // 2.2.59 d-B：A 键 g 桶 vi 行移除，Vi 存独立 ratio 带 viBuckets；旧 A 格式 vi 行容错忽略（无 live 数据不迁移）。
      if (!Object.keys(stages).length) continue;
      seen.add(id);
      out.buckets.push({ id, center: gmRound(center, 4), radius: Number.isFinite(radius) && radius > 0 ? gmRound(radius, 4) : GAIN_MEMORY_BUCKET_RADIUS,
        samples: samples.length ? samples : [gmRound(center, 4)], stages, createdAt: row.createdAt || null, updatedAt: row.updatedAt || null });
    }
    out.buckets = out.buckets.slice(0, GAIN_MEMORY_MAX_BUCKETS);
    out.dropped = out.dropped.slice(-20);
    out.seq = Math.max(Number(raw.seq) || 0, out.buckets.length);
    out.lastBucketId = out.buckets.some(x => x.id === raw.lastBucketId) ? String(raw.lastBucketId) : null;
    out.viBuckets = [];
    const vseen = new Set();
    for (const v of Array.isArray(raw.viBuckets) ? raw.viBuckets : []) {
      if (!v || typeof v !== 'object') continue;
      const lo = Number(v.bandLo), hi = Number(v.bandHi);
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(lo >= S2_REFILL_VI_RATIO_MIN && hi <= S2_REFILL_VI_RATIO_MAX && lo < hi)) continue;
      const bk = lo + '-' + hi; if (vseen.has(bk)) continue;
      const vv = Number(v.vi);
      if (!(Number.isFinite(vv) && vv >= S2_VI_LEARN_STORAGE_MIN && vv <= S2_VI_LEARN_STORAGE_MAX)) {
        if (Number.isFinite(vv)) out.dropped.push({ band: bk, stage: 'vi', vi: gmRound(vv, 2), reason: 'vi outside [' + S2_VI_LEARN_STORAGE_MIN + ',' + S2_VI_LEARN_STORAGE_MAX + ']' });
        continue;
      }
      vseen.add(bk);
      out.viBuckets.push({ bandLo: gmRound(lo, 4), bandHi: gmRound(hi, 4), vi: gmRound(vv, 2), n: Math.max(1, Math.floor(Number(v.n) || 1)),
        lastDeviation: gmFiniteOrNull(v.lastDeviation) !== null ? gmRound(Number(v.lastDeviation), 4) : null,
        lastObservedVi: gmFiniteOrNull(v.lastObservedVi) !== null ? gmRound(Number(v.lastObservedVi), 2) : null,
        lastLocalVi: gmFiniteOrNull(v.lastLocalVi) !== null ? gmRound(Number(v.lastLocalVi), 2) : null,
        damped: !!v.damped, censored: !!v.censored,
        censoredN: Math.max(0, Math.floor(Number(v.censoredN) || 0)),
        lastRunId: v.lastRunId == null ? null : String(v.lastRunId), updatedAt: v.updatedAt || null,
        fpKey: typeof v.fpKey === 'string' ? v.fpKey : null,
        floodMode: typeof v.floodMode === 'string' ? v.floodMode : null });
    }
    out.viBuckets.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    out.viBuckets = out.viBuckets.slice(0, S2_VI_BANDS.length);
    out.updatedAt = raw.updatedAt || null;
    return out;
  }
  async function loadGainMemory() {
    const d = db(); if (!d) return emptyGainMemory();
    let raw = null; try { raw = await d.get(GAIN_MEMORY_KEY); } catch (_) {}
    return normalizeGainMemory(raw);
  }
  async function saveGainMemory(gm) {
    const d = db(); if (!d) return null;
    const norm = normalizeGainMemory(gm);
    try { await d.set(GAIN_MEMORY_KEY, norm); } catch (_) { return null; }
    return norm;
  }
  // ---- Wave B：scaleSampleGate（2.2.57 插件 2715–2731 同口径；摄入副本，输入不改，保微簇）----
  // 字段兼容 APK {stamp,weight,tare} 与插件 {scaleTimestampSeconds,weightG,tareReset}。
  // 红线：只学习侧消费（oq 等价路径），不 gate 控制回归 trimRegression/决策 weightRegression/归档/soak/whole。
  function scaleSampleGate(samples) {
    if (!Array.isArray(samples)) return samples;
    const minGapS = (SCALE_SAMPLE_GATE.minGapMs || 60) / 1000;
    const monotonic = SCALE_SAMPLE_GATE.monotonic === true;
    const out = []; let lastStamp = null, lastWeight = null;
    for (const x of samples) {
      if (x && (x.tareReset || x.tare)) { lastStamp = null; lastWeight = null; }
      const stamp = gmFiniteOrNull(x && (x.scaleTimestampSeconds != null ? x.scaleTimestampSeconds : x.stamp));
      const weight = gmFiniteOrNull(x && (x.weightG != null ? x.weightG : x.weight));
      if (stamp !== null && lastStamp !== null && stamp - lastStamp < minGapS) continue;
      if (monotonic && weight !== null && lastWeight !== null && weight < lastWeight) continue;
      out.push(x);
      if (stamp !== null) lastStamp = stamp;
      if (weight !== null) lastWeight = weight;
    }
    return out;
  }
  // 学习侧消费点（oq 等价路径）：gate 副本后回归，供 Wave C gain-memory observedR 消费。
  // 决策/控制回归仍走未 gate 的 weightRegression/trimRegression（写序列/HIT 不变，用户裁 A 行为级口径）。
  function gatedLearningRegression(samples, tSec, windowS, phase) {
    return weightRegression(scaleSampleGate(samples), tSec, windowS, 0, phase);
  }
  // ---- Wave C 前半同步债：杯间估计器纯函数（full→hec 里程碑项③；插件 2.2.59=3cd2cd8 同口径移植）----
  // 纯函数＋显式传参：memory/history/prior 由调用方传入（插件全局 state → 参数）。shadow 模式 sent 恒 false，
  // 只记录等价物（cup.estimator）；回放钩子经 HxShadow._est 暴露。锚点索引见 Wave C 交接 MD。
  // live 降级（回放一律用插件证据行/diagnosticLast 离线喂，规格 §7/§8）：startupAction/rescue/check trace、
  // stage2CommandOrigin、numeric fingerprint、LUT 标定表、s3 三帧证据 APK 侧不可得 →
  // live 只学 s2（oq 尾段）、FF k 无 fp 不消费、manual 锚 live 不触发；杯末等价物照记。
  const GM_ALPHA = 0.35, GM_DEVIATION_ALPHA = 0.55, GM_DEVIATION = 0.15;
  const GM_BUCKET_MIN_RADIUS = 0.08, GM_BUCKET_MAX_RADIUS = 0.20, GM_HYSTERESIS = 1.25, GM_MIN_SAMPLES = 10;
  const S2_REFILL_SETTLE_MS = 800, S2_REFILL_CHAIN_SETTLE_MS = 1500;
  const EST_COMMAND_EQUAL_TOLERANCE = 1 / 32;
  const ADAPTIVE_HISTORY_KEY = 'hecAdaptiveHistory'; // 证据历史尾 8（插件 STORAGE_ADAPTIVE_HISTORY 同口径）
  function estRound(value, digits) {
    if (value === null || value === undefined || value === '') return null;
    const v = Number(value);
    if (!Number.isFinite(v)) return null;
    const f = Math.pow(10, digits === undefined ? 3 : digits);
    return Math.round(v * f) / f;
  }
  const estFiniteOrNull = gmFiniteOrNull;
  function estMedian(values) {
    const a = values.filter(Number.isFinite).sort((x, y) => x - y);
    if (!a.length) return null;
    const i = Math.floor(a.length / 2);
    return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2;
  }
  function estAverage(values) {
    const a = values.filter(Number.isFinite);
    return a.length ? a.reduce((sum, v) => sum + v, 0) / a.length : null;
  }
  function estClampNumber(value, lo, hi, fallback) {
    const v = Number(value);
    const x = Number.isFinite(v) ? v : Number(fallback);
    return Math.max(lo, Math.min(hi, x));
  }
  function estClampCommandFlow(value) { return estClampNumber(value, CMD_LO, CMD_HI, CMD_LO); }
  function estToDriverStep(value) { const v = Number(value); return Number.isFinite(v) ? Math.round(v * 16) / 16 : null; }
  function estSnapCommandFlow(value) {
    const step = estToDriverStep(value);
    if (step === null) return null;
    const lo = Math.round(CMD_LO * 16), hi = Math.round(CMD_HI * 16);
    return Math.max(lo, Math.min(hi, Math.round(step * 16))) / 16;
  }
  function estSameCommandFlow(a, b) {
    const x = estSnapCommandFlow(a), y = estSnapCommandFlow(b);
    return x !== null && y !== null && Math.abs(x - y) < EST_COMMAND_EQUAL_TOLERANCE;
  }
  function estFormatCommandFlow(value) {
    const q = estSnapCommandFlow(value);
    return q === null ? estSnapCommandFlow(CMD_LO).toFixed(3) : String(q);
  }
  function estCommandBandOf(value) {
    const v = Number(value);
    if (!(v > 0)) return null;
    if (v < 1) return '<1.0';
    if (v < 2) return '1.0-2.0';
    if (v < 3) return '2.0-3.0';
    if (v < 4) return '3.0-4.0';
    if (v < 5) return '4.0-5.0';
    return '>=5.0';
  }
  function estLinearRegression(points) {
    const clean = points.filter(p => Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)));
    if (clean.length < 3) return null;
    const mx = clean.reduce((s, p) => s + Number(p.x), 0) / clean.length;
    const my = clean.reduce((s, p) => s + Number(p.y), 0) / clean.length;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of clean) {
      const dx = Number(p.x) - mx, dy = Number(p.y) - my;
      sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
    }
    if (sxx <= 0) return null;
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    const r2 = syy > 0 ? Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy))) : 1;
    return { slope, intercept, r2, n: clean.length };
  }
  function estRawTimeSecondsForSample(s) {
    const ts = Number(s && s.scaleTimestampSeconds);
    return Number.isFinite(ts) ? ts : Number(s && s.tMs) / 1000;
  }
  function estRegressionForRawSamples(samples) {
    if (!Array.isArray(samples) || samples.length < 4) return null;
    const points = samples.map(s => ({ x: estRawTimeSecondsForSample(s), y: Number(s.weightG) }));
    const reg = estLinearRegression(points);
    if (!reg) return null;
    const xs = points.map(p => p.x).filter(Number.isFinite);
    const span = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    return { slope: estRound(reg.slope, 3), r2: estRound(reg.r2, 5), samples: reg.n, seconds: estRound(span, 2) };
  }
  function estPhaseRawSamplesUntrimmed(run, phase) {
    if (!run || !Array.isArray(run.rawScaleSamples)) return [];
    let raw = run.rawScaleSamples
      .filter(s => s.phase === phase && Number.isFinite(Number(s.weightG)))
      .slice()
      .sort((a, b) => Number(a.tMs) - Number(b.tMs));
    if (!raw.length) return raw;
    let lastReset = -1;
    for (let i = 0; i < raw.length; i++) if (raw[i].tareReset) lastReset = i;
    if (lastReset >= 0) raw = raw.slice(lastReset + 1);
    return raw;
  }
  // S2 出液起点（插件 stage2CupOnset 2640 逐字；与 shadow updateS2Onset 同算法，这里供估计器 run 视图用）。
  function estStage2CupOnset(run, source) {
    const raw = source || estPhaseRawSamplesUntrimmed(run, 'stage2'), target = Number(run && run.config && run.config.stage2Flow) || 5;
    const threshold = Math.max(.05, target * .01), seen = new Set(), window = [];
    for (const row of raw) {
      const stamp = estFiniteOrNull(row.scaleTimestampSeconds), weight = estFiniteOrNull(row.weightG), at = estFiniteOrNull(row.tMs);
      if (stamp === null || weight === null || at === null || seen.has(stamp)) continue;
      if (window.length && (stamp <= window[window.length - 1].x || stamp - window[window.length - 1].x > .6 || weight < window[window.length - 1].y - .2)) window.length = 0;
      seen.add(stamp); window.push({ x: stamp, y: weight, at }); while (window.length && stamp - window[0].x > 2.05 + 1e-9) window.shift();
      if (window.length < 4 || stamp - window[0].x < .39 || weight - window[0].y < .2 - 1e-9) continue;
      const fit = estLinearRegression(window); if (!fit || fit.r2 < .85 || fit.slope < threshold) continue;
      const rise = window.findIndex(p => p.y - window[0].y >= .05 - 1e-9); let onsetIndex = Math.max(0, rise - 1); while (onsetIndex > 0 && window[onsetIndex].y > window[onsetIndex - 1].y + 1e-9) onsetIndex--; const start = window[onsetIndex];
      const event = (run.events || []).find(x => x.name === 'stage2_start'), phaseStart = event && Number.isFinite(Number(event.tMs)) ? Number(event.tMs) : Number(raw[0].tMs);
      return { detected: true, startMs: start.at, delayS: estRound(Math.max(0, start.at - phaseStart) / 1000, 3), confirmedAtMs: at, thresholdGS: threshold, basis: 'sustained RAW weight rise' };
    }
    return { detected: false, startMs: null, confirmedAtMs: null, thresholdGS: threshold, basis: 'waiting for sustained RAW weight rise' };
  }
  function estPhaseRawSamples(run, phase) {
    const raw = estPhaseRawSamplesUntrimmed(run, phase); if (phase !== 'stage2') return raw;
    const onset = estStage2CupOnset(run, raw); return onset.detected ? raw.filter(s => Number(s.tMs) >= onset.startMs) : [];
  }
  function estDesiredRealForRunPhase(run, phase) {
    const cfg = run && run.config || {};
    if (phase === 'stage1') return estFiniteOrNull(cfg.stage1Flow);
    if (phase === 'stage2') return estFiniteOrNull(cfg.stage2Flow);
    if (phase === 'stage3') return estFiniteOrNull(cfg.stage3Flow);
    return null;
  }
  function estDiagnosticRawRegression(run, phase) {
    if (!run || !Array.isArray(run.rawScaleSamples)) return null;
    let raw = estPhaseRawSamples(run, phase);
    if (raw.length < 4) return null;
    const firstTMs = Number(raw[0].tMs);
    const settleSeconds = phase === 'stage1' ? 0.25 : phase === 'stage2' ? 0 : 2.0;
    let use = raw.filter(s => Number(s.tMs) - firstTMs >= settleSeconds * 1000);
    if (use.length < 5) use = raw.filter(s => Number(s.tMs) - firstTMs >= 100);
    if (use.length < 4) use = raw;
    const points = use.map(s => ({ x: estRawTimeSecondsForSample(s), y: Number(s.weightG) }));
    const reg = estLinearRegression(points);
    if (!reg) return null;
    const times = points.map(p => p.x).filter(Number.isFinite);
    const span = times.length ? Math.max(...times) - Math.min(...times) : 0;
    return { slope: estRound(reg.slope, 3), r2: estRound(reg.r2, 5), samples: reg.n, seconds: estRound(span, 2), settleSeconds: estRound(settleSeconds, 2) };
  }
  // 学习窗（插件 s2LearningWindow 2691 逐字）：refill boost→complete 确认＋settle；R-5 未确认一律 null 窗。
  function estS2LearningWindow(run, consumer) {
    const settleMs = consumer === 'chain' ? S2_REFILL_CHAIN_SETTLE_MS : S2_REFILL_SETTLE_MS;
    const out = { refill: false, confirmed: false, startMs: null, settleMs, chainSettleMs: S2_REFILL_CHAIN_SETTLE_MS, reason: null };
    const cfg = run && run.config || {}, trace = run && run.liveFlowTrim && run.liveFlowTrim.trace || [];
    const plan = cfg.s2StartupPlan || {};
    const boost = trace.find(x => x.kind === 'write' && x.startupAction === 'boost');
    if (plan.strategy !== 'refill-85' || !boost) return out;
    out.refill = true;
    const complete = trace.find(x => x.kind === 'startup-complete' && Number(x.frame) === 1);
    if (!complete) { out.reason = 'refill-return-unconfirmed'; return out; }
    out.confirmed = true;
    out.startMs = Number(complete.tMs) + settleMs;
    return out;
  }
  // 平台起点（插件 stage2PlateauStartMs 1597 逐字）：平滑杯流 95% 峰＋1.5s，下限学习窗 startMs；末段保 1.2s 回归窗。
  function estStage2PlateauStartMs(run) {
    const win = estS2LearningWindow(run);
    if (win.refill && !win.confirmed) return null;
    const base = Number.isFinite(win.startMs) ? win.startMs : null;
    const raw = estPhaseRawSamples(run, 'stage2');
    if (!raw.length) return null;
    let peak = -Infinity;
    for (const x of raw) { const v = Number(x.decaidWeightFlowGS); if (Number.isFinite(v) && v > peak) peak = v; }
    if (!Number.isFinite(peak)) return null;
    const peakRow = raw.find(x => Number(x.decaidWeightFlowGS) >= peak * .95);
    if (!peakRow) return null;
    const peakAt = Number(peakRow.tMs);
    const afterPeak = Number.isFinite(peakAt) ? peakAt + 1500 : null;
    const start = base === null ? afterPeak : Math.max(base, afterPeak);
    const lastAt = Number(raw[raw.length - 1].tMs);
    if (Number.isFinite(lastAt) && Number.isFinite(start) && start > lastAt - 1200) {
      const floor = base === null ? lastAt - 1200 : Math.max(base, lastAt - 1200);
      return floor;
    }
    return start;
  }
  // 有效指令（插件 stage2EffectiveCommand 1573 逐字）：泵实际跟随 targetFlowMlS 中位数（L-10/L-11）。
  function estStage2EffectiveCommand(run) {
    const win = estS2LearningWindow(run);
    if (win.refill && !win.confirmed) return null; // R-5
    const plateau = estStage2PlateauStartMs(run);
    const cutoffMs = plateau !== null ? plateau : (Number.isFinite(win.startMs) ? win.startMs : null);
    const rows0 = (run && Array.isArray(run.samples) ? run.samples : []).filter(x => x && x.phase === 'stage2' && x.machineTelemetryValid === true && Number.isFinite(Number(x.targetFlowMlS)) && Number(x.targetFlowMlS) > 0);
    const raw0 = estPhaseRawSamples(run, 'stage2');
    const rows = cutoffMs === null ? rows0 : rows0.filter(x => Number(x.tMs) >= cutoffMs), raw = cutoffMs === null ? raw0 : raw0.filter(x => Number(x.tMs) >= cutoffMs);
    if (rows.length < 6 || raw.length < 6) return null;
    const t0 = Number(raw[0].tMs), t1 = Number(raw[raw.length - 1].tMs);
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return null;
    const tail = cutoffMs === null ? rows.filter(x => Number(x.tMs) >= t0 + (t1 - t0) * 0.4).map(x => Number(x.targetFlowMlS)) : rows.filter(x => Number(x.tMs) >= cutoffMs).map(x => Number(x.targetFlowMlS));
    if (tail.length < 4) return null;
    return estMedian(tail);
  }
  // 输出质量（插件 controlOutputQuality 9249 逐字；scaleSampleGate 复用 Wave B 实现，只 gate 学习侧）。
  function estControlOutputQuality(run, phase) {
    const target = estDesiredRealForRunPhase(run, phase), whole = estDiagnosticRawRegression(run, phase);
    const win = phase === 'stage2' ? estS2LearningWindow(run) : null;
    const plateauStart = phase === 'stage2' ? estStage2PlateauStartMs(run) : null;
    const cutoffMs = phase === 'stage2' ? (plateauStart !== null ? plateauStart : (win && Number.isFinite(win.startMs) ? win.startMs : null)) : (win && Number.isFinite(win.startMs) ? win.startMs : null);
    if (win && win.refill && !win.confirmed) return { available: false, reason: 'refill-return-unconfirmed', windowSettleMs: win.settleMs, chainSettleMs: win.chainSettleMs }; // R-5
    const all = scaleSampleGate(estPhaseRawSamples(run, phase)), raw = cutoffMs === null ? all : all.filter(x => Number(x.tMs) >= cutoffMs);
    const lastAt = all.length ? Number(all[all.length - 1].tMs) : null;
    const plateauFallback = phase === 'stage2' && plateauStart !== null && Number.isFinite(lastAt) && plateauStart >= lastAt - 1200 - 1;
    if (!target) return { available: false, reason: 'no-target' };
    if (raw.length < 6) return { available: false, reason: cutoffMs === null || all.length < 6 ? 'raw-samples-insufficient' : 'learning-window-too-short', rawSamples: all.length, windowSamples: raw.length };
    const stamps = new Set(), data = raw.filter(x => { const t = estFiniteOrNull(x.scaleTimestampSeconds); if (t === null || stamps.has(t)) return false; stamps.add(t); return true; });
    let reducedWindow = false;
    if (data.length < 6) return { available: false };
    const lo = Number(data[0].scaleTimestampSeconds), hi = Number(data[data.length - 1].scaleTimestampSeconds), tail = phase === 'stage2' && plateauStart !== null ? lo : lo + (hi - lo) * .4;
    const flows = [];
    for (let i = 0; i < data.length; i++) {
      const end = Number(data[i].scaleTimestampSeconds); if (end < tail + 1.2) continue;
      const rows = data.slice(0, i + 1).filter(x => Number(x.scaleTimestampSeconds) >= Math.max(tail, end - 2));
      if (rows.length < 6 || rows.some((x, j) => j > 0 && (Number(x.scaleTimestampSeconds) <= Number(rows[j - 1].scaleTimestampSeconds) || Number(x.scaleTimestampSeconds) - Number(rows[j - 1].scaleTimestampSeconds) > .6))) continue;
      const r = estRegressionForRawSamples(rows); if (r && r.seconds >= 1.2 && r.r2 >= .90 && r.slope > 0) flows.push(r.slope);
    }
    if (!flows.length && phase === 'stage2' && data.length >= 6) {
      for (let i = 0; i < data.length; i++) {
        const end = Number(data[i].scaleTimestampSeconds); if (end < tail + 0.8) continue;
        const rows = data.slice(0, i + 1).filter(x => Number(x.scaleTimestampSeconds) >= Math.max(tail, end - 2));
        if (rows.length < 6 || rows.some((x, j) => j > 0 && (Number(x.scaleTimestampSeconds) <= Number(rows[j - 1].scaleTimestampSeconds) || Number(x.scaleTimestampSeconds) - Number(rows[j - 1].scaleTimestampSeconds) > .6))) continue;
        const r = estRegressionForRawSamples(rows); if (r && r.seconds >= 0.8 && r.r2 >= .95 && r.slope > 0) { flows.push(r.slope); reducedWindow = true; }
      }
    }
    const mean = estAverage(flows), variance = mean === null ? null : estAverage(flows.map(x => (x - mean) * (x - mean)));
    const errors = flows.map(x => Math.abs(x / target - 1) * 100).sort((a, b) => a - b);
    return { available: !!flows.length, targetGS: target, wholePhaseErrorPct: whole ? estRound((whole.slope / target - 1) * 100, 2) : null,
      tailMeanGS: estRound(mean, 3), tailErrorPct: mean === null ? null : estRound((mean / target - 1) * 100, 2), tailRippleCVPct: mean ? estRound(Math.sqrt(variance) / mean * 100, 2) : null,
      tailP95ErrorPct: errors.length ? estRound(errors[Math.max(0, Math.ceil(errors.length * .95) - 1)], 2) : null,
      tailRMSEGS: flows.length ? estRound(Math.sqrt(estAverage(flows.map(x => (x - target) * (x - target)))), 3) : null,
      tailOvershootPct: flows.length ? estRound(Math.max(0, Math.max(...flows) / target - 1) * 100, 2) : null, windows: flows.length,
      windowSettleMs: win ? win.settleMs : null, chainSettleMs: win ? win.chainSettleMs : null, tailFraction: phase === 'stage2' && plateauStart !== null ? 1 : .6, plateauFallback, reducedWindow,
      basis: 'actual RAW g/s; rolling regressions over the plateau (S2) or final60% (S1/S3), separate from normalized learning model' };
  }
  // S1 软提示（插件 s1OutflowHint 1462 逐字）：首次 0.5g/s ≥6.3s 或 S1 时长 ≥8s → high 候选 LOW。
  function estS1OutflowHint(run) {
    const rows = ((run && run.rawScaleSamples) || []).filter(x => x && x.phase === 'stage1' && Number.isFinite(Number(x.decaidWeightFlowGS)));
    if (rows.length < 8) return null;
    const t0 = Number(rows[0].tMs), t1 = Number(rows[rows.length - 1].tMs);
    if (!(Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0)) return null;
    const first = rows.find(x => Number(x.decaidWeightFlowGS) >= .5);
    const firstOutflowS = first ? estRound((Number(first.tMs) - t0) / 1000, 2) : null;
    const s1DurationS = estRound((t1 - t0) / 1000, 2);
    const high = (firstOutflowS !== null && firstOutflowS >= 6.3) || s1DurationS >= 8;
    return { candidate: high ? 'high' : 'low', firstOutflowS, s1DurationS, thresholdS: 6.3, durationThresholdS: 8, basis: 'S1 first 0.5 g/s and S1 duration', confidence: 'LOW' };
  }
  // ---- ①A 写侧（插件 gainRegimeForRun 1473 / 桶几何 1512–1556 / gainConfidence 1419 / gainBackfillAlpha 1429 /
  //      gainStageObservation 1623 / gainMemoryQualityGuard 1667 / updateGainMemoryFromRun 1694 逐字）----
  function estGainRegimeForRun(run) {
    const rows = ((run && run.samples) || []).filter(x => x && x.phase === 'stage2').sort((a, b) => Number(a.tMs) - Number(b.tMs));
    if (rows.length < GM_MIN_SAMPLES) return null;
    const trace = (run && run.liveFlowTrim && Array.isArray(run.liveFlowTrim.trace)) ? run.liveFlowTrim.trace : [];
    const ret = trace.find(x => x && x.kind === 'write' && x.startupAction === 'return' && Number(x.frame) === 1);
    const late = rows.slice(Math.floor(rows.length * .4));
    let windowRows = late, basis = 'S2 late 60% pressure / machine flow';
    if (ret && Number.isFinite(Number(ret.tMs))) {
      const start = Number(ret.tMs) + 2000, end = Number(ret.tMs) + 4000;
      const early = rows.filter(x => { const t = Number(x.tMs); return Number.isFinite(t) && t >= start && t <= end; });
      if (early.length >= GM_MIN_SAMPLES) { windowRows = early; basis = 'S2 refill return +2–4 s pressure / machine flow'; }
    }
    const collect = list => { const values = []; for (const x of list) {
      const pressure = Number(x.pressureBar), flow = Number(x.machineFlowMlS);
      if (!Number.isFinite(pressure) || !Number.isFinite(flow) || Math.abs(flow) < .15) continue;
      if (x.machineTelemetryValid === false) continue;
      if (Number.isFinite(Number(x.machineAgeMs)) && Number(x.machineAgeMs) > 600) continue;
      const ratio = pressure / flow;
      if (Number.isFinite(ratio) && ratio > 0.05 && ratio <= 5) values.push({ pressure, flow, ratio });
    } return values; };
    let values = collect(windowRows);
    if (values.length < GM_MIN_SAMPLES && windowRows !== late) {
      windowRows = late; basis = 'S2 late 60% pressure / machine flow'; values = collect(windowRows);
    }
    if (values.length < GM_MIN_SAMPLES) return null;
    const signature = estMedian(values.map(x => x.ratio));
    if (!(signature > 0.05)) return null;
    return { signature: estRound(signature, 4), samples: values.length,
      pressureBar: estRound(estMedian(values.map(x => x.pressure)), 3),
      machineFlowMlS: estRound(estMedian(values.map(x => x.flow)), 3),
      basis };
  }
  function estGainBucketLimit(bucket, buckets) {
    const radius = Number(bucket && bucket.radius) > 0 ? Number(bucket.radius) : GAIN_MEMORY_BUCKET_RADIUS;
    let gap = Infinity;
    for (const other of buckets || []) {
      if (!other || other === bucket) continue;
      const distance = Math.abs(Number(other.center) - Number(bucket.center));
      if (Number.isFinite(distance) && distance > 0 && distance < gap) gap = distance;
    }
    return Math.min(radius * GM_HYSTERESIS, gap / 2);
  }
  function estGainBucketRadius(samples) {
    if (!Array.isArray(samples) || samples.length < 3) return GAIN_MEMORY_BUCKET_RADIUS;
    const center = estMedian(samples), mad = estMedian(samples.map(x => Math.abs(x - center)));
    return Math.max(GM_BUCKET_MIN_RADIUS, Math.min(GM_BUCKET_MAX_RADIUS, 2.6 * mad));
  }
  function estSelectGainBucket(memory, signature) {
    const buckets = memory && Array.isArray(memory.buckets) ? memory.buckets : [];
    let best = null, bestDistance = Infinity;
    for (const bucket of buckets) {
      const distance = Math.abs(signature - Number(bucket.center));
      if (distance < bestDistance) { best = bucket; bestDistance = distance; }
    }
    if (!best) return { bucket: null, absorb: null, distance: Infinity, limit: 0 };
    const limit = estGainBucketLimit(best, buckets);
    if (bestDistance <= limit) return { bucket: best, absorb: null, distance: bestDistance, limit };
    if (bestDistance <= Number(best.radius)) return { bucket: null, absorb: best, distance: bestDistance, limit };
    return { bucket: null, absorb: null, distance: bestDistance, limit };
  }
  function estCreateGainBucket(memory, signature) {
    const id = 'g' + String(Math.max(1, Number(memory.seq) || 0) + 1);
    memory.seq = Number(id.slice(1)) || memory.buckets.length + 1;
    const bucket = { id, center: estRound(signature, 4), radius: GAIN_MEMORY_BUCKET_RADIUS, samples: [], stages: {}, createdAt: new Date().toISOString(), updatedAt: null };
    memory.buckets.push(bucket);
    while (memory.buckets.length > GAIN_MEMORY_MAX_BUCKETS) {
      const candidates = memory.buckets.filter(x => x.id !== bucket.id && x.id !== memory.lastBucketId);
      if (!candidates.length) break;
      candidates.sort((a, b) => String(a.updatedAt || a.createdAt || '').localeCompare(String(b.updatedAt || b.createdAt || '')));
      memory.buckets.splice(memory.buckets.indexOf(candidates[0]), 1);
    }
    return bucket;
  }
  function estGainConfidence(stageState) {
    if (!stageState || !(Number(stageState.r) > 0)) return 'LOW';
    const n = Number(stageState.n) || 1, deviation = Number(stageState.lastDeviation);
    if (stageState.reduced) return n >= 2 ? 'MEDIUM' : 'LOW';
    if (n >= 3 && (!Number.isFinite(deviation) || deviation <= GM_DEVIATION)) return 'HIGH';
    if (n >= 2) return 'MEDIUM';
    return 'LOW';
  }
  function estGainBackfillAlpha(run, deviation, stage) {
    let alpha = GM_ALPHA;
    const trim = run && run.liveFlowTrim, trace = trim && Array.isArray(trim.trace) ? trim.trace : [];
    const wantsFrame = stage === 's2' ? f => Number(f) === 1 : stage === 's3' ? f => Number(f) >= 2 : null;
    let rescue = null, normal = null;
    if (wantsFrame && trace.length) {
      rescue = 0; normal = 0;
      for (const w of trace) { if (w && w.kind === 'write' && wantsFrame(w.frame)) { if (w.rescue) rescue++; else normal++; } }
    }
    if (rescue !== null) {
      if (rescue > 0) alpha = .5;
      else if (normal > 0) alpha = .12;
    } else if (trim) {
      if (Number(trim.rescueWrites) > 0) alpha = .5;
      else if (Number(trim.normalWrites) > 0) alpha = .12;
    }
    // P2-5：阈下偏差线性提速到设计基值 0.35；damped 减半与饱和 0.55 覆盖在下游。
    const dev = Number(deviation);
    if (dev > 0 && dev <= GM_DEVIATION) alpha = Math.max(alpha, GM_ALPHA * dev / GM_DEVIATION);
    if (Number(deviation) > GM_DEVIATION) alpha = Math.max(alpha, GM_DEVIATION_ALPHA);
    return alpha;
  }
  function estGainStageObservation(run, evidence, stage) {
    const cfg = run && run.config || {};
    if (stage === 's2') {
      if (String(cfg.stage2CommandOrigin || '') === 'manual') return null;
      const quality = estControlOutputQuality(run, 'stage2');
      if (!quality || quality.available !== true || !(Number(quality.tailMeanGS) > 0)) return null;
      const ripple = Number(quality.tailRippleCVPct);
      if (ripple > 25) return null;
      const measured = Number(quality.tailMeanGS);
      const effective = estStage2EffectiveCommand(run);
      if (!Number.isFinite(effective) || effective <= 0) return null;
      const command = effective;
      const r = measured / command;
      if (!(r >= GAIN_R_MIN && r <= GAIN_R_MAX)) return null;
      const saturated = !!(evidence && evidence.liveTrimChain && evidence.liveTrimChain.usable === false);
      // P1-3：路由键＝base 命令 cfg.stage2CommandMlS（拿不到退 effective）；r 分母仍是有效指令。
      const baseCommand = Number(cfg.stage2CommandMlS);
      const routeCommand = Number.isFinite(baseCommand) && baseCommand > 0 ? baseCommand : command;
      return { r, command, measured, reduced: !!quality.reducedWindow, source: saturated ? 'S2 tail local (actuator saturated)' : 'S2 steady tail',
        local: saturated, damped: ripple >= 12, alphaOverride: saturated ? .55 : null,
        baseCommand: routeCommand, commandBand: estCommandBandOf(routeCommand), window: { startPct: 40, endPct: 100 } };
    }
    if (stage === 's3') {
      if (String(cfg.stage3CommandOrigin || '') === 'manual') return null;
      if (!evidence || evidence.stallQualitative || !Array.isArray(evidence.source) || evidence.source.length !== 3) return null;
      const mid = evidence.source[1], late = evidence.source[2];
      const command = Number(mid && mid.command), measured = Number(mid && mid.measured);
      if (!(command > 0 && measured > 0)) return null;
      const r = measured / command;
      if (!(r >= GAIN_R_MIN && r <= GAIN_R_MAX)) return null;
      const drift = Number(late && late.measured) > 0 ? Number(late.measured) / measured : null;
      return { r, drift: Number.isFinite(drift) && drift > 0 && drift <= 3 ? drift : null, command, measured, source: 'S3 MID', commandBand: estCommandBandOf(command) };
    }
    return null;
  }
  function estGainMemoryQualityGuard(run, phase) {
    const cfg = run && run.config || {};
    if (cfg.basketContext !== 'coffee') return { eligible: true, reason: 'Empty/legacy context', relaxed: true };
    const limit = estFiniteOrNull(cfg[phase + 'PressureLimit']);
    const onset = phase === 'stage2' ? estStage2CupOnset(run) : null;
    const all = (run.samples || []).filter(x => x.phase === phase && estFiniteOrNull(x.tMs) !== null && (!onset || onset.detected && Number(x.tMs) >= onset.startMs));
    if (!all.length || limit === null || limit <= 0) return { eligible: false, reason: 'Gain-memory quality evidence missing' };
    const start = Math.min(...all.map(x => Number(x.tMs))), rows = all.filter(x => Number(x.tMs) - start >= 1000);
    let usable = 0, nearLimit = 0, underCommand = 0;
    for (const row of rows) {
      const pressure = estFiniteOrNull(row.pressureBar), flow = estFiniteOrNull(row.machineFlowMlS);
      let command = phase === 'stage2' ? estFiniteOrNull(estStage2EffectiveCommand(run)) : estFiniteOrNull(row.targetFlowMlS);
      if (phase === 'stage3' && cfg.stage3Shape && cfg.stage3Shape.enabled) {
        const frame = estFiniteOrNull(row.profileFrame);
        command = frame === 2 ? estFiniteOrNull(cfg.stage3Shape.earlyCommand) : frame === 3 ? estFiniteOrNull(cfg.stage3Shape.midCommand) : frame === 4 ? estFiniteOrNull(cfg.stage3Shape.lateCommand) : null;
      }
      if (row.machineTelemetryValid !== true || estFiniteOrNull(row.machineAgeMs) === null || Number(row.machineAgeMs) > 1000 || pressure === null || pressure < 0 || flow === null || flow < 0 || command === null || command <= 0) continue;
      usable++;
      if (pressure >= limit * .95) nearLimit++;
      if (flow < command * .70) underCommand++;
    }
    const coverage = rows.length ? usable / rows.length : 0, pressureFraction = usable ? nearLimit / usable : 1, underFraction = usable ? underCommand / usable : 1;
    const eligible = usable >= 4 && coverage >= .60 && pressureFraction < .35 && underFraction < .40;
    return { eligible, relaxed: true, samples: usable, expectedSamples: rows.length, coverage: estRound(coverage, 3), pressureLimitedFraction: estRound(pressureFraction, 3), underCommandFraction: estRound(underFraction, 3),
      reason: !eligible ? 'Gain-memory quality evidence below relaxed floor' : 'Gain-memory quality evidence passed relaxed floor' };
  }
  // 写侧主函数：memory 显式传入（插件 gainMemoryState(true) 的 APK 等价）；原地更新 memory，返回台账 out。
  function estUpdateGainMemoryFromRun(memory, run, evidence) {
    if (!run || !evidence) return null;
    const regime = estGainRegimeForRun(run);
    if (!regime) return { status: 'no-regime', reason: 'S2 late pressure/machine-flow signature unavailable' };
    if (!memory) return null;
    const selected = estSelectGainBucket(memory, regime.signature);
    const scratch = !selected.bucket && !selected.absorb;
    const bucket = selected.bucket || selected.absorb || estCreateGainBucket(memory, regime.signature);
    const now = new Date().toISOString(), out = { status: 'updated', bucketId: bucket.id, bucketCreated: scratch, absorbed: !!selected.absorb, hysteresis: false, center: bucket.center, radius: bucket.radius, signature: regime.signature, signatureSamples: (Array.isArray(bucket.samples) ? bucket.samples : []).length, regime, stages: {}, updatedAt: now };
    // P2-3：先算两阶段观测，双 null → 删 scratch 桶、返回 no-observation，不动既有桶 center/radius。
    const observations = {};
    for (const stage of ['s2', 's3']) observations[stage] = estGainStageObservation(run, stage === 's3' && evidence.s3 ? evidence.s3 : evidence, stage);
    if (!observations.s2 && !observations.s3) {
      if (scratch) memory.buckets = memory.buckets.filter(x => x.id !== bucket.id);
      out.stages = { s2: { status: 'no-observation' }, s3: { status: 'no-observation' } };
      return Object.assign({}, out, { status: 'no-observation' });
    }
    bucket.samples = (Array.isArray(bucket.samples) ? bucket.samples.slice(-(GAIN_MEMORY_SIGNATURE_SAMPLES - 1)) : []).concat([estRound(regime.signature, 4)]);
    bucket.center = estRound(estMedian(bucket.samples), 4);
    bucket.radius = estRound(estGainBucketRadius(bucket.samples), 4);
    out.center = bucket.center; out.radius = bucket.radius; out.signatureSamples = bucket.samples.length;
    for (const stage of ['s2', 's3']) {
      const observation = observations[stage];
      if (!observation) { out.stages[stage] = { status: 'no-observation' }; continue; }
      let current = bucket.stages[stage], deviation = null, alpha = null;
      if (!current || !(Number(current.r) > 0)) {
        current = bucket.stages[stage] = { r: estRound(observation.r, 4), n: 1, lastDeviation: null, lastObservedR: estRound(observation.r, 4), drift: observation.drift == null ? null : estRound(observation.drift, 4), commandMlS: estRound(observation.command, 4), commandBand: observation.commandBand || estCommandBandOf(observation.command), reduced: !!observation.reduced, lastRunId: run.runId, updatedAt: now };
      } else {
        deviation = Math.abs(observation.r - current.r) / current.r;
        alpha = estGainBackfillAlpha(run, deviation, stage);
        if (observation.damped) alpha = alpha * .5;
        if (Number(observation.alphaOverride) > 0) alpha = Number(observation.alphaOverride);
        current.damped = !!observation.damped;
        if (deviation > GM_DEVIATION || observation.local) current.lastLocalR = estRound(observation.r, 4);
        current.r = estRound(current.r + alpha * (observation.r - current.r), 4);
        current.n = (Number(current.n) || 1) + 1;
        current.lastDeviation = estRound(deviation, 4);
        current.lastObservedR = estRound(observation.r, 4);
        if (Number(observation.drift) > 0) current.drift = estRound(Number(current.drift) > 0 ? current.drift + alpha * (observation.drift - current.drift) : observation.drift, 4);
        current.commandMlS = estRound(observation.command, 4); current.commandBand = observation.commandBand || estCommandBandOf(observation.command); current.reduced = !!observation.reduced;
        current.lastRunId = run.runId; current.updatedAt = now;
      }
      // cut8/L-7＋P1-4：每命令带独立 r；steadyN 非 local 观测＋1；provisional 行永不驱动建议基值。
      const obsBand = observation.commandBand || estCommandBandOf(observation.command);
      if (obsBand) {
        const bands = current.bands && typeof current.bands === 'object' ? current.bands : {};
        const row = bands[obsBand] && Number(bands[obsBand].r) > 0 ? bands[obsBand] : null;
        const steadyObs = !observation.local;
        if (row) {
          const bandAlpha = Number(alpha) > 0 ? Number(alpha) : GM_ALPHA;
          row.r = estRound(row.r + bandAlpha * (observation.r - row.r), 4);
          row.n = (Number(row.n) || 1) + 1; row.lastObservedR = estRound(observation.r, 4); row.updatedAt = now;
          if (row.steadyN == null || !Number.isFinite(Number(row.steadyN))) row.steadyN = 2;
          if (steadyObs) row.steadyN = Number(row.steadyN) + 1;
          row.provisional = Number(row.steadyN) < 2;
        } else bands[obsBand] = { r: estRound(observation.r, 4), n: 1, lastObservedR: estRound(observation.r, 4), updatedAt: now, steadyN: steadyObs ? 1 : 0, provisional: true };
        current.bands = bands; current.band = obsBand;
      }
      out.stages[stage] = { status: 'updated', r: current.r, n: current.n, observedR: current.lastObservedR,
        deviationPct: current.lastDeviation == null ? null : estRound(current.lastDeviation * 100, 1), alpha,
        confidence: estGainConfidence(current), reduced: !!current.reduced, source: observation.source, drift: current.drift == null ? null : estRound(current.drift, 4),
        commandBand: current.commandBand || null, window: observation.window || null };
    }
    memory.lastBucketId = bucket.id; memory.updatedAt = now; bucket.updatedAt = now; run.gainMemoryBucketId = bucket.id;
    return out;
  }
  // ---- ①A 读侧（插件 gainMemorySuggestion 1775 逐字；memory 显式传入）＋成熟度门 platformMemoryGain 3521 ----
  function estGainMemorySuggestion(memory, run, stage) {
    if (!memory) return null;
    const regime = estGainRegimeForRun(run);
    const hint = estS1OutflowHint(run);
    let bucket = null, fallback = false, hintBucket = null;
    if (regime) {
      bucket = run && run.gainMemoryBucketId ? memory.buckets.find(x => x.id === run.gainMemoryBucketId) : null;
      if (!bucket) bucket = estSelectGainBucket(memory, regime.signature).bucket;
    } else {
      if (hint && hint.candidate === 'high') hintBucket = memory.buckets.slice().sort((a, b) => Number(b.center) - Number(a.center))[0] || null;
      bucket = hintBucket || (memory.lastBucketId ? memory.buckets.find(x => x.id === memory.lastBucketId) : null);
    }
    if (!bucket) return null;
    const activeBucket = bucket;
    let stateRow = bucket.stages && bucket.stages[stage], sourceBucket = bucket;
    if (!stateRow || !(Number(stateRow.r) > 0)) {
      const rows = memory.buckets.filter(x => x !== bucket && x.stages && Number(x.stages[stage] && x.stages[stage].r) > 0);
      if (!rows.length) return null;
      rows.sort((a, b) => (Number(b.stages[stage].n) || 0) - (Number(a.stages[stage].n) || 0)
        || Math.abs(a.center - bucket.center) - Math.abs(b.center - bucket.center));
      sourceBucket = rows[0]; stateRow = rows[0].stages[stage]; fallback = true;
    }
    const cfg = run && run.config || {};
    const target = stage === 's2' ? Number(cfg.stage2Flow) : Number(cfg.stage3Flow);
    const lut = stage === 's2' ? Number(cfg.stage2LutCommandMlS) : Number(cfg.stage3LutCommandMlS);
    if (!(target > 0)) return null;
    // A② baseBand 路由（2.2.51）：读侧按 BASE 命令带路由，effectiveBand 降诊断量。
    const baseBand = stage === 's2' ? estCommandBandOf(Number(cfg.stage2CommandMlS)) : null;
    const effectiveBand = stage === 's2' ? estCommandBandOf(estStage2EffectiveCommand(run)) : null;
    const band = baseBand || stateRow.commandBand || estCommandBandOf(stateRow.commandMlS);
    const bandRowRaw = band && stateRow.bands && stateRow.bands[band] && Number(stateRow.bands[band].r) > 0 ? stateRow.bands[band] : null;
    // P1-4：provisional 行弃用回 overall r。
    const bandRow = bandRowRaw && bandRowRaw.provisional !== true ? bandRowRaw : null;
    const bandR = bandRow ? Number(bandRow.r) : null;
    const bandN = bandRow ? Math.max(1, Math.floor(Number(bandRow.n) || 1)) : 0;
    const localR = Number(stateRow.lastLocalR);
    const local = Number.isFinite(localR) && localR > 0 && Number(stateRow.lastDeviation) > GM_DEVIATION;
    const r = local ? localR : (bandR || Number(stateRow.r));
    if (!(r >= GAIN_R_MIN && r <= GAIN_R_MAX)) return null;
    const ceiling = Math.min(CMD_HI, Number.isFinite(lut) && lut > 0 ? lut * 2 : CMD_HI);
    const command = estSnapCommandFlow(Math.max(CMD_LO, Math.min(ceiling, target / r)));
    const crossBand = !!(stateRow.commandBand && (stateRow.commandBand !== estCommandBandOf(command) || (baseBand && stateRow.commandBand !== baseBand)));
    return { stage, bucketId: sourceBucket.id, activeBucketId: activeBucket.id, center: sourceBucket.center, radius: sourceBucket.radius, bucketSamples: stateRow.n,
      stale: !regime || fallback, fallback: fallback ? 'cross-bucket' : null, r: estRound(r, 4), smoothedR: estRound(stateRow.r, 4), observedR: stateRow.lastObservedR,
      band: band || null, effectiveBand: effectiveBand || null, bandR: bandR ? estRound(bandR, 4) : null, bandN, bandMatched: !!bandRow,
      deviationPct: stateRow.lastDeviation == null ? null : estRound(stateRow.lastDeviation * 100, 1), local,
      confidence: local ? 'LOW' : (hintBucket ? 'LOW' : estGainConfidence(stateRow)), targetGS: estRound(target, 3), lutCommandMlS: Number.isFinite(lut) ? estRound(lut, 3) : null,
      commandMlS: command, drift: stateRow.drift == null ? null : estRound(stateRow.drift, 4),
      commandBand: stateRow.commandBand || null, currentBand: estCommandBandOf(command),
      crossBand, bandProvisional: !!(bandRowRaw && bandRowRaw.provisional === true), baseBand: baseBand || null,
      sourceRunId: stateRow.lastRunId || null, s1Hint: hint || null, hintApplied: !!hintBucket, applied: false };
  }
  // 成熟度门（插件 platformMemoryGain 3521 逐字）：immature 回退 overall r；local 不受压；建议侧报告不改（P0-2）。
  function estPlatformMemoryGain(gm) {
    if (!gm || !(Number(gm.r) > 0)) return null;
    const immature = !gm.local && gm.bandMatched && (Number(gm.bandN) < 3 || gm.bandProvisional === true);
    const r = immature && Number(gm.smoothedR) > 0 ? Number(gm.smoothedR) : Number(gm.r);
    return Number.isFinite(r) && r > 0 ? r : null;
  }
  // ---- ④D2 FF k（插件 stageGainEstimate 4919 / ffKQualified 3533 / s2FfPlatformCandidate 3539 /
  //      s2RefillPumpEstimate 3493 / liveTrimMemoryCandidate 9583 / mappedCommandForReal 1125 同口径）----
  // history 显式传入（插件 state.adaptiveHistory）；priorEvidence 显式传入（插件 stage2AdaptiveEvidence(prior)
  // 的离线喂等价：回放＝插件证据行 s2，live＝证据历史存储的 oq 尾段对）。
  function estStageGainEstimate(stage, history, run, current) {
    const rows = [];
    const addSingle = e => { if (!e) return; const cmd = Number(e.command), m = Number(e.measured); if (cmd > 0 && m > 0) rows.push({ k: m / cmd, cmd, m, runId: e.runId }); };
    const addS3 = e => { if (!e) return; if (Array.isArray(e.source) && e.source.length) { let ws = 0, cs = 0, ms = 0; for (const f of e.source) { const w = Math.max(1, Number(f.seconds) || 1), c = Number(f.command), m = Number(f.measured); if (c > 0 && m > 0) { ws += w; cs += c * w; ms += m * w; } } if (ws > 0 && cs > 0 && ms > 0) rows.push({ k: (ms / ws) / (cs / ws), cmd: cs / ws, m: ms / ws, runId: e.runId }); } else addSingle(e); };
    const saved = (history || []).slice(-8);
    for (const s of saved) { if (run && s && s.runId === run.runId) continue; stage === 's3' ? addS3(s.s3) : addSingle(s[stage]); }
    stage === 's3' ? addS3(current) : addSingle(current);
    if (rows.length < 2) return { samples: rows.length, k: null };
    const ks = rows.map(x => x.k).sort((a, b) => a - b), k = estMedian(ks);
    if (!(k > 0)) return null;
    const spread = Math.sqrt(rows.reduce((a, x) => a + (x.k - k) ** 2, 0) / rows.length) / k;
    const last = rows[rows.length - 1];
    const bands = new Set(rows.map(x => estCommandBandOf(x.cmd)));
    return { samples: rows.length, k, spread, command: last.cmd, measured: last.m, sources: rows.map(x => x.runId).filter(Boolean).slice(-8), mixedBand: bands.size > 1 };
  }
  function estFfKQualified(gain) {
    if (!gain || !(Number(gain.k) > 0)) return false;
    const ok = gain.samples >= 3 ? gain.spread <= .12 : gain.samples === 2 && gain.spread <= .05;
    if (!ok) return false;
    return !gain.mixedBand || gain.spread <= .05;
  }
  function estS2FfPlatformCandidate(targetGS, prior, priorEvidence, history) {
    if (!(Number(targetGS) > 0)) return null;
    const gain = estStageGainEstimate('s2', history, prior, priorEvidence);
    if (!estFfKQualified(gain)) return null;
    const command = estSnapCommandFlow(estClampCommandFlow(Number(targetGS) / Number(gain.k)));
    if (!(Number.isFinite(command) && command > 0)) return null;
    return { commandMlS: command, k: Number(gain.k), spread: gain.spread, samples: gain.samples, mixedBand: !!gain.mixedBand };
  }
  // observed-tail 候选（插件 s2RefillPumpEstimate 3493；信任门 trustedAdaptiveRun＋numeric fp 由调用方
  // 以 fpMatch 旗标传入：回放＝fixture fp 相等 true，live＝②未裁前 false）。
  function estS2RefillPumpEstimate(prior, targetGS, fpMatch) {
    if (!prior || !fpMatch) return null;
    const q = estControlOutputQuality(prior, 'stage2'), raw = estPhaseRawSamples(prior, 'stage2');
    if (!q.available || !raw.length) return null;
    const lastWrite = (prior.liveFlowTrim && prior.liveFlowTrim.trace || []).filter(x => x.kind === 'write' && Number(x.frame) === 1).slice(-1)[0];
    const previousCommand = lastWrite ? Number(lastWrite.commandMlS) : Number(prior.config.stage2CommandMlS);
    if (!(previousCommand > 0)) return null;
    const first = Number(raw[0].tMs), last = Number(raw[raw.length - 1].tMs), limit = Number(prior.config.stage2PressureLimit);
    const tail = (prior.samples || []).filter(x => x.phase === 'stage2' && Number(x.tMs) >= first + (last - first) * .4);
    const fresh = tail.filter(x => x.machineTelemetryValid === true && Number(x.machineAgeMs) <= 600 && Number(x.machineFlowMlS) >= previousCommand * .85 && Number(x.machineFlowMlS) <= previousCommand * 1.15 && Number(x.pressureBar) < limit * .9);
    if (!(q.tailRippleCVPct <= 25) || !(q.tailMeanGS >= targetGS * .5 && q.tailMeanGS <= targetGS * 1.5)) return null;
    if (fresh.length < 8 || fresh.length < tail.length * .8) return null;
    const estimate = previousCommand * targetGS / Math.max(.1, q.tailMeanGS);
    if (!Number.isFinite(estimate) || estimate < CMD_LO || estimate > CMD_HI) return null;
    return { command: estimate, basis: 'target-cup-flow observed-tail local model', referenceTailGS: estRound(q.tailMeanGS, 3), sourceRunId: prior.runId, previousCommandMlS: estRound(previousCommand, 4), rippleCVPct: estRound(q.tailRippleCVPct, 2), rippleDamped: q.tailRippleCVPct >= 12 };
  }
  // ---- ④D1 清锚 fallback（插件 adaptiveEstimateFallback 3555 逐字）----
  function estAdaptiveEstimateFallback(node, targetGS) {
    if (!node || !(Number(targetGS) > 0)) return null;
    const gm = node.gainMemory;
    if (gm && gm.confidence === 'HIGH') {
      const r = estPlatformMemoryGain(gm);
      if (r) {
        const command = estSnapCommandFlow(estClampCommandFlow(Number(targetGS) / r));
        if (Number.isFinite(command) && command > 0) return { commandMlS: command, source: 'gain-memory' };
      }
    }
    const ff = node.gainFeedForward;
    if (ff && ff.eligible === true && Number(ff.k) > 0 && Number(ff.targetGS) > 0 && (!ff.mixedBand || Number(ff.spread) <= .05)) {
      const command = estSnapCommandFlow(estClampCommandFlow(Number(ff.targetGS) / Number(ff.k)));
      if (Number.isFinite(command) && command > 0) return { commandMlS: command, source: 'feed-forward-k' };
    }
    return null;
  }
  function estLiveTrimMemoryCandidate(phase, memory, candidates) {
    const stageKey = phase === 'stage2' ? 's2' : phase === 'stage3' ? 's3' : null;
    if (!stageKey) return null;
    for (const candidate of candidates || []) {
      if (!candidate) continue;
      const gm = estGainMemorySuggestion(memory, candidate, stageKey);
      if (gm && Number.isFinite(Number(gm.commandMlS)) && Number(gm.commandMlS) > 0) return gm;
    }
    return null;
  }
  // LUT 映射（插件 mappedCommandForReal 1125 同口径；标定表显式传入，live shadow 无表 → null）。
  function estMappedCommandForReal(realFlow, points, usable) {
    const target = Number(realFlow);
    if (!usable || !Number.isFinite(target) || target <= 0) return null;
    const pts = points || [];
    if (pts.length < 2) return null;
    const lo = Number(pts[0].actualFlow), hi = Number(pts[pts.length - 1].actualFlow);
    if (target < lo * 0.92 || target > hi * 1.08) return null;
    if (target <= lo) return Number(pts[0].commandFlow);
    if (target >= hi) return Number(pts[pts.length - 1].commandFlow);
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1], b = pts[i];
      const ya = Number(a.actualFlow), yb = Number(b.actualFlow);
      if (target <= yb && yb > ya) {
        const f = (target - ya) / (yb - ya);
        return Number(a.commandFlow) + f * (Number(b.commandFlow) - Number(a.commandFlow));
      }
    }
    return null;
  }
  // 补水平台基值选择序（插件 boundedRefillControlBase 3572 逐字）：
  // FF k 第一候选（P0-1 包线 hi=max(gm×1.25,gm+.35)/lo=min(gm×.75,gm−.35)）→ gain-memory → observed-tail → profile-base → lut。
  function estBoundedRefillControlBase(opts) {
    const targetGS = opts.targetGS, profileBase = opts.profileBase, observedBase = opts.observedBase;
    const memory = opts.memory, prior = opts.prior, current = opts.current, history = opts.history, priorEvidence = opts.priorEvidence;
    const gm = estLiveTrimMemoryCandidate('stage2', memory, [prior, prior || current, current]);
    const gmR = estPlatformMemoryGain(gm);
    const gmCommand = gmR && Number(targetGS) > 0 ? estSnapCommandFlow(Number(targetGS) / gmR) : null;
    const ff = estS2FfPlatformCandidate(targetGS, prior || current, priorEvidence, history);
    if (ff) {
      let command = ff.commandMlS;
      if (gmCommand) { const hi = Math.max(gmCommand * 1.25, gmCommand + 0.35), lo = Math.min(gmCommand * 0.75, gmCommand - 0.35); command = estSnapCommandFlow(estClampCommandFlow(Math.max(lo, Math.min(hi, command)))); }
      if (command) return { commandMlS: command, r: Number(targetGS) / command, source: 'feed-forward-k', bucketId: gm ? gm.bucketId : null };
    }
    if (gmCommand) return { commandMlS: gmCommand, r: Number(targetGS) / gmCommand, source: 'gain-memory', bucketId: gm.bucketId };
    if (Number.isFinite(Number(observedBase)) && Number(observedBase) > 0) { const observedCommand = estSnapCommandFlow(Number(observedBase)); if (observedCommand) return { commandMlS: observedCommand, r: Number(targetGS) / observedCommand, source: 'observed-tail' }; }
    const command = estSnapCommandFlow(Number(profileBase));
    if (command) return { commandMlS: command, r: Number(targetGS) / command, source: 'profile-base' };
    const mapped = Number.isFinite(Number(targetGS)) ? estMappedCommandForReal(targetGS, opts.lutPoints, opts.lutUsable) : null;
    if (Number.isFinite(Number(mapped)) && Number(mapped) > 0) { const mappedCommand = estSnapCommandFlow(mapped); if (mappedCommand) return { commandMlS: mappedCommand, r: Number(targetGS) / mappedCommand, source: 'lut' }; }
    return { commandMlS: Number(profileBase), r: Number(targetGS) / Number(profileBase), source: 'profile-base' };
  }
  // 杯内 trim 中心（插件 liveTrimControlCenter 9650 逐字）：当杯 local blend 优先 → FF k（同 P0-1 包线）→
  // gain-memory → lut → profile-base。local＝{r,count,coverageS,requiredCoverageS,atMs}（shadow lv 等价物），nowMs 显式传入。
  function estLiveTrimControlCenter(opts) {
    const phase = opts.phase, fallbackBase = opts.fallbackBase, run = opts.run;
    const memory = opts.memory, prior = opts.prior, current = opts.current, history = opts.history, priorEvidence = opts.priorEvidence;
    const candidates = phase === 'stage3' ? [run, prior, current] : [prior, run, current];
    const gm = estLiveTrimMemoryCandidate(phase, memory, candidates);
    const local = opts.local;
    const nowMs = Number(opts.nowMs);
    if (local && local.count >= 3 && local.coverageS + 1e-9 >= local.requiredCoverageS && Number.isFinite(nowMs) && nowMs - local.atMs <= 600) {
      const target = phase === 'stage2' ? run.config.stage2Flow : run.config.stage3Flow;
      const priorR = estPlatformMemoryGain(gm) || local.r;
      const weight = Math.min(.75, .15 * (local.count - 2));
      const bounded = Math.max(priorR * .75, Math.min(priorR * 1.25, local.r));
      const r = priorR * (1 - weight) + bounded * weight;
      return { commandMlS: estSnapCommandFlow(target / r), r, source: 'current-cup-blend', confidence: 'LOCAL', localR: local.r, weight };
    }
    const cfg = (run && run.config) || {};
    const target = phase === 'stage2' ? cfg.stage2Flow : phase === 'stage3' ? cfg.stage3Flow : null;
    const gmR = estPlatformMemoryGain(gm);
    const gmCenter = gmR && Number.isFinite(Number(target)) && Number(target) > 0 ? estSnapCommandFlow(Number(target) / gmR) : null;
    const ff = phase === 'stage2' ? estS2FfPlatformCandidate(target, prior || current, priorEvidence, history) : null;
    if (ff) {
      let command = ff.commandMlS;
      if (gmCenter) { const hi = Math.max(gmCenter * 1.25, gmCenter + 0.35), lo = Math.min(gmCenter * 0.75, gmCenter - 0.35); command = estSnapCommandFlow(estClampCommandFlow(Math.max(lo, Math.min(hi, command)))); }
      if (command) return { commandMlS: command, r: Number(target) / command, source: 'feed-forward-k', bucketId: gm ? gm.bucketId : null, confidence: 'FF' };
    }
    if (gmCenter) return { commandMlS: gmCenter, r: gmR, source: 'gain-memory', bucketId: gm.bucketId, confidence: gm.confidence };
    const mapped = Number.isFinite(Number(target)) ? estMappedCommandForReal(target, opts.lutPoints, opts.lutUsable) : null;
    if (Number.isFinite(Number(mapped)) && Number(mapped) > 0) return { commandMlS: estSnapCommandFlow(mapped), r: null, source: 'lut' };
    return { commandMlS: estSnapCommandFlow(fallbackBase), r: null, source: 'profile-base' };
  }
  // ---- ④D3 largeGap 节拍（插件 liveResponseInterval 9640 / liveTrimTick 10228–10238 口径）----
  function estLiveResponseIntervalMs(phase, rescue, largeGapS2) {
    return rescue ? 800 : (phase === 'stage3' ? 2400 : (phase === 'stage2' && largeGapS2 ? 1000 : 1200));
  }
  // ---- 建议侧配套（插件 learningPolicy 1319 / addGain 5128–5169 s2 支 / P0-2＋P0-1＋manual 锚 5170–5282）----
  function estNormalizeLearningLevel(v) {
    const aliases = { conservative: '保守', gentle: '温和', normal: '正常', aggressive: '激进' };
    return ['保守', '温和', '正常', '激进'].includes(v) ? v : aliases[String(v || '').toLowerCase()] || '正常';
  }
  function estLearningPolicy(v) {
    const name = estNormalizeLearningLevel(v), rank = ['保守', '温和', '正常', '激进'].indexOf(name);
    const rows = [
      { deadband: 8, gain: .18, single: false, largeSingle: false, s1: [.04, .04], s2: [.05, .10], s3: [.04, .04] },
      { deadband: 8, gain: .25, single: false, largeSingle: true, s1: [.05, .04], s2: [.08, .20], s3: [.05, .05] },
      { deadband: 8, gain: .35, single: true, largeSingle: true, s1: [.10, .08], s2: [.12, .35], s3: [.08, .075] },
      { deadband: 5, gain: .55, single: true, largeSingle: true, s1: [.15, .12], s2: [.20, .60], s3: [.12, .125] }
    ]; return Object.assign({ name, rank, qualityWidth: rank === 3 ? 1.3 : 1 }, rows[rank]);
  }
  // addGain s2 支（建议侧 span 限幅；eligible 门不套混带收紧——与平台侧 ffKQualified 区分）。
  function estAddGainS2(node, gain, targetGS, limits) {
    if (!node) return node;
    if (!gain || !(Number(gain.k) > 0)) { node.gainFeedForward = { stage: 's2', samples: gain && Number(gain.samples) || 0, k: null }; return node; }
    const target = Number(targetGS);
    const cmd = Number(gain.command), ff = cmd > 0 ? target / gain.k : null;
    if (!(Number.isFinite(ff) && ff > 0)) return node;
    const frac = limits[0], abs = limits[1];
    const span = Math.max(cmd * frac, abs);
    const bounded = estSnapCommandFlow(estClampCommandFlow(Math.max(cmd - span, Math.min(cmd + span, ff))));
    if (!Number.isFinite(bounded)) return node;
    const ok = gain.samples >= 3 ? gain.spread <= .12 : gain.samples === 2 && gain.spread <= .05;
    const info = { stage: 's2', samples: gain.samples, k: estRound(gain.k, 3), spread: estRound(gain.spread, 3), targetGS: estRound(target, 3), currentCommandMlS: estRound(cmd, 3), targetCommandMlS: estRound(ff, 3), boundedCommandMlS: estRound(bounded, 3), sources: gain.sources, mixedBand: !!gain.mixedBand, eligible: !!ok, reason: ok ? null : 'spread ' + estRound(gain.spread * 100, 1) + '% exceeds the ' + (gain.samples >= 3 ? '12%' : '5%') + ' agreement gate', applied: false };
    node.gainFeedForward = info;
    if (!ok) return node;
    if (node.usable !== false && Math.abs(bounded - cmd) >= .005) {
      node.suggestedCommandMlS = estRound(bounded, 3); node.action = node.action === 'HOLD' ? 'ADJUST' : node.action;
      node.gainFeedForward.applied = true; node.reason = (node.reason ? String(node.reason) + '; ' : '') + 'steady-gain feed-forward: k=' + estRound(gain.k, 3) + ', bounded command ' + estRound(bounded, 3) + ' ml/s';
    }
    return node;
  }
  // 记忆消费门（插件 nextShotAdaptiveSuggestion 5170–5282 的 s2 记忆支＋manual 锚＋actuator guard 豁免）。
  // node＝标量＋FF 建议节点（标量学习器不在本波范围，回放离线喂插件节点）；oq2/actuatorGuard 显式传入。
  function estApplyMemoryToS2Node(opts) {
    const s2 = opts.node, memoryS2 = opts.memoryS2, run = opts.run, oq2 = opts.oq2, policy = opts.policy;
    if (!s2 || !memoryS2) return s2;
    s2.gainMemory = Object.assign({}, memoryS2, { applied: false });
    const damped = /SATURATED|LIMITED|VARIABLE|MIXED/.test(String(s2.action || ''));
    if (damped) {
      s2.gainMemory.damped = true;
      const lvl = String(memoryS2.confidence || 'LOW');
      s2.gainMemory.confidence = lvl === 'HIGH' ? 'MEDIUM' : lvl === 'MEDIUM' ? 'LOW' : 'LOW';
      s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'scalar evidence is not admissible; gain memory applied at reduced confidence';
    }
    const curve = Number(run && run.config && run.config.stage2CommandMlS);
    const numeric = s2.usable !== false && (s2.action === 'ADJUST' || s2.action === 'LUT COMPENSATE') && Number.isFinite(Number(s2.suggestedCommandMlS));
    // P0-2：tailHit（RAW 尾段在带内）＋regimeChange（local 或 baseBand 移动；manual 不算）＋bandImmature。
    const tailHit = !!(oq2 && oq2.available && Number.isFinite(Number(oq2.tailErrorPct)) && Math.abs(Number(oq2.tailErrorPct)) <= policy.deadband);
    const manualOrigin = String(run && run.config && run.config.stage2CommandOrigin || '') === 'manual';
    const regimeChange = !!(memoryS2.local || (!manualOrigin && memoryS2.baseBand && memoryS2.commandBand && memoryS2.commandBand !== memoryS2.baseBand));
    const bandImmature = !regimeChange && memoryS2.bandMatched && Number(memoryS2.bandN) < 3;
    if (numeric && ((tailHit && !regimeChange) || bandImmature)) {
      s2.gainMemory.role = tailHit && !regimeChange ? 'hit-anchor' : 'immature-band';
      s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + (tailHit && !regimeChange ? 'HIT anchor: tail ' + estRound(oq2.tailErrorPct, 1) + '% inside the band; gain memory pull withheld (r=' + memoryS2.r + ')' : 'gain memory band n=' + memoryS2.bandN + ' < 3: immature band pull withheld');
    } else if (numeric) {
      const base = Number(s2.suggestedCommandMlS), memoryTarget = Number(memoryS2.commandMlS);
      const regime = !!(memoryS2.local || memoryS2.crossBand || memoryS2.confidence === 'HIGH');
      let pulled = false;
      if (regime && Number.isFinite(base) && Number.isFinite(memoryTarget)) {
        const pull = memoryS2.confidence === 'HIGH' ? 1 : 0.7;
        // D3c：大缺口（>30%）包线放宽到 ±50%（仍阻尼单步）；绝对量 .35 不动。
        const wide = Number.isFinite(base) && base > 0 && Math.abs(memoryTarget - base) / base > .30;
        const hi = Math.max(base * (wide ? 1.5 : 1.25), base + 0.35), lo = Math.min(base * (wide ? 0.5 : 0.75), base - 0.35);
        const bounded = estSnapCommandFlow(estClampCommandFlow(Math.max(lo, Math.min(hi, base + (memoryTarget - base) * pull))));
        if (Number.isFinite(bounded) && Math.abs(bounded - base) >= .005) {
          s2.suggestedCommandMlS = estRound(bounded, 4);
          s2.action = String(s2.action || '').includes('LUT') ? 'LUT COMPENSATE' : 'ADJUST';
          s2.gainMemory.role = 'base'; s2.gainMemory.applied = true;
          s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'gain memory ' + memoryS2.bucketId + ' band ' + (memoryS2.band || '—') + ' r=' + memoryS2.r + ' is the base: next command ' + estFormatCommandFlow(base) + ' -> ' + estFormatCommandFlow(bounded) + ' ml/s (' + Math.round(pull * 100) + '% toward target/r); same-shot reverse bounded by ' + policy.name;
          pulled = true;
        }
      }
      if (!pulled) {
        s2.gainMemory.role = 'prior';
        s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'gain memory ' + memoryS2.bucketId + ' band ' + (memoryS2.band || '—') + ' r=' + memoryS2.r + ' is a prior; the same-shot reverse keeps the command';
      }
    } else if (Number.isFinite(curve) && estSameCommandFlow(memoryS2.commandMlS, curve)) {
      s2.usable = true; s2.action = 'HOLD'; delete s2.suggestedCommandMlS;
      s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'gain memory already maps to the curve command';
    } else {
      if (s2.action === 'HOLD' && tailHit && !regimeChange) {
        s2.usable = true; s2.action = 'HOLD'; delete s2.suggestedCommandMlS;
        s2.gainMemory.applied = false; s2.gainMemory.role = 'hit-anchor';
        s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'HIT anchor: tail ' + estRound(oq2.tailErrorPct, 1) + '% inside the band; gain memory override withheld (r=' + memoryS2.r + ')';
      } else if (bandImmature) {
        s2.usable = true; s2.action = 'HOLD'; delete s2.suggestedCommandMlS;
        s2.gainMemory.applied = false; s2.gainMemory.role = 'immature-band';
        s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'gain memory band n=' + memoryS2.bandN + ' < 3: immature band cannot move the base';
      } else {
        // P0-1：direct mapping 阻尼单步（±25%/.35；大缺口 ±50%）。
        const c = Number.isFinite(curve) ? curve : Number(memoryS2.commandMlS);
        const wide = Number.isFinite(c) && c > 0 && Math.abs(Number(memoryS2.commandMlS) - c) / c > .30;
        const hi = Math.max(c * (wide ? 1.5 : 1.25), c + 0.35), lo = Math.min(c * (wide ? 0.5 : 0.75), c - 0.35);
        const bounded = estSnapCommandFlow(estClampCommandFlow(Math.max(lo, Math.min(hi, Number(memoryS2.commandMlS)))));
        if (Number.isFinite(bounded) && Math.abs(bounded - c) >= .005) {
          s2.usable = true; s2.action = s2.action === 'LUT COMPENSATE' ? 'LUT COMPENSATE' : 'ADJUST';
          s2.suggestedCommandMlS = estRound(bounded, 4); s2.gainMemory.applied = true; s2.gainMemory.role = 'base';
          s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'gain memory ' + memoryS2.bucketId + ' maps ' + memoryS2.targetGS + ' g/s to ' + memoryS2.commandMlS + ' ml/s (r=' + memoryS2.r + ', n=' + memoryS2.bucketSamples + ', ' + memoryS2.confidence + '); damped transition ' + estFormatCommandFlow(c) + ' -> ' + estFormatCommandFlow(bounded) + ' ml/s';
        } else {
          s2.usable = true; s2.action = 'HOLD'; delete s2.suggestedCommandMlS;
          s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'gain memory damped transition retains the curve command';
        }
      }
    }
    // manual 锚（2.2.50）：manual origin → HOLD 保用户 base；记忆/标量只建议不覆盖。
    if (String(run && run.config && run.config.stage2CommandOrigin || '') === 'manual' && s2.action !== 'HOLD') {
      s2.usable = true; s2.action = 'HOLD'; delete s2.suggestedCommandMlS;
      if (s2.gainMemory) { s2.gainMemory.applied = false; s2.gainMemory.role = 'manual-anchor'; }
      s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'manual origin: user-set base retained; memory/scalar advise only';
    }
    // actuator guard 豁免（gainMemoryQualityGuard 宽松门；guard 本体 stageActuatorEvidence 不在本波范围，回放离线喂）。
    const guard = opts.actuatorGuard;
    if (guard && !guard.eligible) {
      const relaxed = s2.gainMemory ? estGainMemoryQualityGuard(run, 'stage2') : null;
      if (relaxed && relaxed.eligible) {
        s2.memoryGuardBypass = { hard: guard, relaxed };
        s2.reason = (s2.reason ? String(s2.reason) + '; ' : '') + 'gain memory kept by relaxed quality guard';
      } else {
        Object.assign(s2, { usable: false, action: 'LIMITED / HOLD', confidence: 'INSUFFICIENT', reason: guard.reason, actuatorGuard: guard });
        if (s2.gainMemory) s2.gainMemory.applied = false;
      }
    }
    return s2;
  }
  // ---- 证据历史存储（插件 state.adaptiveHistory 尾 8 / STORAGE_ADAPTIVE_HISTORY 4857 同口径）----
  // 行＝{runId,profileTruthSchema,fingerprint,numericFp,basket,s2:{command,measured,targetGS,runId,measurementBasis},s3,source,capturedAt}。
  // live 行 numericFp=null（②未裁）→ FF k 消费侧 estHistoryForFp 过滤后为空（不消费）；回放离线喂插件证据行＋fixture fp。
  async function loadAdaptiveHistory() {
    const d = db(); if (!d) return [];
    let raw = null; try { raw = await d.get(ADAPTIVE_HISTORY_KEY); } catch (_) {}
    return Array.isArray(raw) ? raw.filter(x => x && x.runId) : [];
  }
  async function saveAdaptiveHistory(rows) {
    const d = db(); if (!d) return null;
    const tail = (Array.isArray(rows) ? rows : []).filter(x => x && x.runId).slice(-8);
    try { await d.set(ADAPTIVE_HISTORY_KEY, tail); } catch (_) { return null; }
    return tail;
  }
  function estHistoryForFp(history, fpKey) {
    if (!fpKey) return [];
    return (history || []).filter(x => x && x.profileTruthSchema === 3 && x.numericFp === fpKey);
  }
  // shadow cup → 插件 run 形状视图（估计器输入适配；字段映射见 Wave C 交接）。
  function estRunViewFromCup(c) {
    const cv = c.cfgView || {};
    const samples = c.samples.map(s => ({ tMs: Math.round(s.t * 1000), phase: s.phase, profileFrame: s.frame,
      pressureBar: s.pressure, machineFlowMlS: s.mflow, targetFlowMlS: s.tcmd,
      machineTelemetryValid: s.machineTelemetryValid, machineAgeMs: s.machineAgeMs }));
    const rawScaleSamples = c.samples.filter(s => s.stamp != null && s.weight != null).map(s => ({ tMs: Math.round(s.t * 1000), phase: s.phase, profileFrame: s.frame,
      scaleTimestampSeconds: s.stamp, weightG: s.weight, tareReset: !!s.tare, decaidWeightFlowGS: s.decaid,
      targetFlowMlS: s.tcmd, machineFlowMlS: s.mflow, pressureBar: s.pressure }));
    const trace = c.writes.map(w => ({ kind: w.kind === 'write' ? 'write' : 'frame-change', tMs: w.tMs, frame: w.frame, commandMlS: w.to, previousMlS: w.from, startupAction: w.startupAction || undefined, rescue: null }));
    return { runId: c.runId, kind: 'hyperex', result: null, samples, rawScaleSamples, events: [],
      liveFlowTrim: { trace, rescueWrites: null, normalWrites: null },
      config: { stage2Flow: cv.stage2Flow, stage2CommandMlS: cv.stage2CommandMlS, stage2PressureLimit: cv.stage2PressureLimit,
        stage3Flow: cv.stage3Flow, stage3CommandMlS: cv.stage3CommandMlS, stage3PressureLimit: cv.stage3PressureLimit,
        stage2CommandOrigin: null, stage3CommandOrigin: null, stage2LutCommandMlS: null, stage3LutCommandMlS: null,
        stage3Shape: null, basketContext: null, s2StartupPlan: { strategy: 'none' } } };
  }
  // 杯末估计器钩子（插件 rememberAdaptiveEvidence 4828 的 shadow 等价：写侧→存储→读侧/平台等价物记录）。
  // live 只学 s2（s3 三帧证据不可得）；sent 恒 false，等价物记 cup.estimator（additive，随 persist 落盘/导出）。
  let estimatorError = null;
  let estCache = { memory: null, history: [], prior: null, priorEvidence: null, ready: false };
  let lastEstRun = null, lastEstEvidence = null;
  function refreshEstCache() {
    (async () => {
      const memory = await loadGainMemory();
      const history = await loadAdaptiveHistory();
      const prior = lastEstRun;
      const priorEvidence = prior ? ((history.find(x => x && x.runId === prior.runId) || {}).s2 || lastEstEvidence) : null;
      estCache = { memory, history, prior, priorEvidence, ready: true };
    })().catch(() => {});
  }
  async function runCupEstimator(c) {
    if (!c || !c.cfgView || !Array.isArray(c.samples) || !c.samples.length) return;
    const run = estRunViewFromCup(c);
    const memory = await loadGainMemory();
    let history = await loadAdaptiveHistory();
    const evidence = { s2: null, s3: null }; // live：s2 观测由 run 自算；evidence.liveTrimChain 不可得（插件同名顶层字段本就不置位，逐字镜像）
    const gmOut = estUpdateGainMemoryFromRun(memory, run, evidence);
    if (gmOut && gmOut.status !== 'no-regime') await saveGainMemory(memory);
    const oq = estControlOutputQuality(run, 'stage2');
    const eff = estStage2EffectiveCommand(run);
    let row = null;
    if (oq && oq.available && Number(oq.tailMeanGS) > 0 && Number.isFinite(eff) && eff > 0) {
      row = { runId: c.runId, profileTruthSchema: null, fingerprint: null, numericFp: null, basket: null,
        s2: { runId: c.runId, targetGS: estRound(Number(run.config.stage2Flow), 3), command: estRound(eff, 3), measured: estRound(oq.tailMeanGS, 3), measurementBasis: 'shadow-oq-tail' },
        s3: null, source: 'shadow', capturedAt: new Date().toISOString() };
      history = history.filter(x => x && x.runId !== c.runId);
      history.push(row);
      history = await saveAdaptiveHistory(history) || history.slice(-8);
    }
    const histForFp = estHistoryForFp(history, null); // live 无 fp → FF k 不消费（②待裁）
    const sugS2 = estGainMemorySuggestion(memory, run, 's2');
    const sugS3 = estGainMemorySuggestion(memory, run, 's3');
    const target = Number(run.config.stage2Flow), base = Number(run.config.stage2CommandMlS);
    const pump = estS2RefillPumpEstimate(run, target, false);
    const platform = Number.isFinite(target) && target > 0 ? estBoundedRefillControlBase({ targetGS: target, profileBase: base, observedBase: pump && pump.command, memory, prior: run, current: null, history: histForFp, priorEvidence: row ? row.s2 : null, lutPoints: null, lutUsable: false }) : null;
    const center = Number.isFinite(target) && target > 0 ? estLiveTrimControlCenter({ phase: 'stage2', fallbackBase: base, run, memory, prior: run, current: run, history: histForFp, priorEvidence: row ? row.s2 : null, local: null, lutPoints: null, lutUsable: false, nowMs: Date.now() }) : null;
    c.estimator = { schema: 1, at: new Date().toISOString(), gainMemory: gmOut, suggestion: { s2: sugS2, s3: sugS3 }, platform, controlCenter: center,
      historyRows: history.length, degraded: { s3Evidence: true, startupTrace: true, fingerprint: true, origin: true, lut: true } };
    lastEstRun = run; lastEstEvidence = row ? row.s2 : null;
    estCache = { memory, history, prior: run, priorEvidence: row ? row.s2 : null, ready: true };
  }
  // 杯内控制中心等价物（D3 ccRescue；插件 liveTrimControlCenter 的 shadow 输入适配）。
  // 空记忆/无历史/无 local → profile-base（r=null → RESCUE_R 缺省），与 Wave B 前 r 口径逐字一致。
  function estControlCenterForLive(lv, cup, ctx, reg, nowMs) {
    const phase = lv.phase;
    const run = estRunViewFromCup(cup);
    const windowS = phase === 'stage3' ? 3.0 : 1.6;
    const local = lv.rEst !== null && lv.rFirstStamp !== null
      ? { r: lv.rEst, count: lv.rCount, coverageS: reg.endStamp - lv.rFirstStamp, requiredCoverageS: windowS, atMs: lv.rAtSec * 1000 } : null;
    const fallbackBase = ctx.baseCommandMlS != null ? ctx.baseCommandMlS : ctx.commandMlS;
    return estLiveTrimControlCenter({ phase, fallbackBase, run, memory: estCache.memory, prior: estCache.prior, current: run,
      history: estHistoryForFp(estCache.history, null), priorEvidence: estCache.priorEvidence,
      local, lutPoints: null, lutUsable: false, nowMs });
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
    delete copy.cfgView; // Wave C：config 快照是内部运行态，等价物已记 cup.estimator
    // _decStamp 是 R4 响应窗结算用的内部秤时间戳，不进存储/导出
    if (Array.isArray(copy.decisions)) copy.decisions = copy.decisions.map((d) => { const { _decStamp, ...rest } = d; return rest; });
    return copy;
  }
  // 显式传入要存的杯：调用方随后可能把全局 cup 置 null，先同步快照再入链。
  // 链式串行（同 app.js saveChain 模式）：消除交错 persist 的 lost update；exportJSON 先等链尾。
  function persist(c, final) {
    if (!c) return persistChain;
    const snapshot = () => JSON.parse(JSON.stringify(cleanCup(c)));
    let rec = final ? null : snapshot();
    persistChain = persistChain.then(async () => {
      if (final) {
        // Wave C：杯末估计器先于落盘（等价物附 cup.estimator）；失败不阻塞 persist（estimatorError 暴露）。
        try { await runCupEstimator(c); } catch (e) { estimatorError = String(e && e.message || e); }
        rec = snapshot();
      }
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
      if (cup && (cup.decisions.length || cup.writes.length)) { finalizeCup(cup); cups.push(summaryOf(cup)); persist(cup, true); }
      cup = newCup(ctx.runId);
      cup.modeAtStart = ctx.mode || null;
      refreshEstCache(); // Wave C：杯首加载记忆镜像/证据历史/上杯 prior（fire-and-forget，不阻塞样本流）
    }
    const s = ctx.sample;
    // Wave B 字段补：pressure/mflow/tcmd（soak 观测＋gain-memory 签名/观测分母）＋machineAgeMs/machineTelemetryValid 逐样本快照（control ctx 传入）。additive，决策回归不消费这些字段。
    cup.samples.push({ t: s.t, stamp: s.stamp != null ? s.stamp : null, weight: s.weight, tare: !!s.tare, phase: ctx.phase, frame: ctx.frame != null ? ctx.frame : null,
      pressure: s.pressure != null ? s.pressure : null, mflow: s.mflow != null ? s.mflow : null, tcmd: s.tcmd != null ? s.tcmd : null,
      decaid: s.decaid != null ? s.decaid : null, // Wave C：平滑杯流（plateau 峰值/S1 提示必需；Wave B 同款 additive）
      machineAgeMs: ctx.machineAgeMs != null ? ctx.machineAgeMs : null, machineTelemetryValid: ctx.machineTelemetryValid != null ? ctx.machineTelemetryValid : null });
    if (cup.samples.length > 4000) cup.samples.shift();
    // Wave C：config 快照（估计器 run 视图用；base/target/limiter 按阶段，additive，决策回归不消费）。
    if (!cup.cfgView) cup.cfgView = {};
    if (ctx.phase === 'stage2' || ctx.phase === 'stage3') {
      const cv = cup.cfgView, k = ctx.phase === 'stage2' ? 'stage2' : 'stage3';
      if (Number.isFinite(Number(ctx.targetGS))) cv[k + 'Flow'] = Number(ctx.targetGS);
      if (ctx.baseCommandMlS != null) cv[k + 'CommandMlS'] = ctx.baseCommandMlS;
      if (ctx.limiterBar != null) cv[k + 'PressureLimit'] = ctx.limiterBar;
    }
    // m9：阶段目标重量缺失计数（loadStageWeights 失败 → rescue cannotReturn 残废，status 暴露）。
    if (ctx.extracting && (ctx.phase === 'stage2' || ctx.phase === 'stage3') && !(Number.isFinite(ctx.stage2WeightG) && Number.isFinite(ctx.finalWeightG))) stageWeightsMissing++;
    // R2：插件写入台账区分帧切换与真实写入。帧号变化引起的跳变记 frame-change，
    // 同帧变化记 write；仲裁算法候选只消费 kind:'write'。
    const cmd = ctx.commandMlS;
    const frame = ctx.frame != null ? ctx.frame : null;
    if (cmd != null && cup.lastCmd != null && cmd !== cup.lastCmd) {
      const kind = (frame != null && cup.lastCmdFrame === frame) ? 'write' : 'frame-change';
      // Wave B：startupAction 字段位（boost/return 打标）。shadow 模式观察插件写入无法直判 startupAction（需插件 trace，Wave D）；
      // hec 模式 APK 自执行补水自打标（Wave E）。additive 默认 null，现有消费者不破坏。
      cup.writes.push({ tMs: Math.round(s.t * 1000), from: cup.lastCmd, to: cmd, source: 'plugin', frame, kind, startupAction: ctx.startupAction || null,
        largeGap: !!(cup.live && cup.live.largeGapS2), commandGapPct: cup.live && cup.live.commandGapPct != null ? cup.live.commandGapPct : null });
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
    if (cup && (cup.decisions.length || cup.writes.length)) { finalizeCup(cup); cups.push(summaryOf(cup)); persist(cup, true); }
    cup = null;
  }

  window.HxShadow = {
    load,
    onSample,
    onCupEnd,
    status: function () { return { loadState, loadError, model: 'bc_v0', arbiter: window.HxArbiter && window.HxArbiter.learnedStatus ? window.HxArbiter.learnedStatus() : null, cup: cup ? { runId: cup.runId, decisions: cup.decisions.length, writes: cup.writes.length } : null, archived: cups.length, inferErrors, lastInferError, stageWeightsMissing, estimatorError }; },
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
    _gainMemoryEmpty: emptyGainMemory,
    _gainMemoryNormalize: normalizeGainMemory,
    loadGainMemory,
    saveGainMemory,
    _scaleSampleGate: scaleSampleGate,
    _gatedLearningReg: gatedLearningRegression,
    // Wave C 回放钩子：估计器纯函数（memory/history/prior 显式传参）＋证据历史存储＋杯末钩子。
    _est: {
      round: estRound, median: estMedian, commandBandOf: estCommandBandOf, snap: estSnapCommandFlow, clamp: estClampCommandFlow, sameCommandFlow: estSameCommandFlow,
      oq: estControlOutputQuality, s2LearningWindow: estS2LearningWindow, plateauStartMs: estStage2PlateauStartMs, effectiveCommand: estStage2EffectiveCommand,
      onset: estStage2CupOnset, phaseRawSamples: estPhaseRawSamples, s1Hint: estS1OutflowHint,
      regime: estGainRegimeForRun, bucketLimit: estGainBucketLimit, bucketRadius: estGainBucketRadius, selectBucket: estSelectGainBucket, createBucket: estCreateGainBucket,
      confidence: estGainConfidence, backfillAlpha: estGainBackfillAlpha, observation: estGainStageObservation, qualityGuard: estGainMemoryQualityGuard,
      update: estUpdateGainMemoryFromRun, suggestion: estGainMemorySuggestion, platformMemoryGain: estPlatformMemoryGain,
      stageGainEstimate: estStageGainEstimate, ffKQualified: estFfKQualified, ffPlatformCandidate: estS2FfPlatformCandidate, pumpEstimate: estS2RefillPumpEstimate,
      fallback: estAdaptiveEstimateFallback, memoryCandidate: estLiveTrimMemoryCandidate, mappedCommandForReal: estMappedCommandForReal,
      boundedRefillControlBase: estBoundedRefillControlBase, liveTrimControlCenter: estLiveTrimControlCenter,
      responseIntervalMs: estLiveResponseIntervalMs, learningPolicy: estLearningPolicy, addGainS2: estAddGainS2, applyMemoryToS2Node: estApplyMemoryToS2Node,
      historyForFp: estHistoryForFp, runViewFromCup: estRunViewFromCup, controlCenterForLive: estControlCenterForLive,
      normalTrimQuanta, recoveryTimeEstimate,
    },
    loadAdaptiveHistory,
    saveAdaptiveHistory,
    _runCupEstimator: runCupEstimator,
    _estCache: function () { return estCache; },
    _setEstCache: function (c) { estCache = c || { memory: null, history: [], prior: null, priorEvidence: null, ready: false }; },
    _refreshEstCache: refreshEstCache,
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
