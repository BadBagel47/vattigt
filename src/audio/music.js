// Music: Midsommarpolskan (D-012, draft 1), synthesised in the browser.
// Same engine as the music workshop in docs/music/index.html; keep them in step.
/* ---------- notes ---------- */
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = n => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function parseBar(str) {                 // "D5:3 E5:1 r:2" -> events, lengths in sixteenths, 12 per bar
  const out = []; let pos = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, l] = tok.split(':'); const len = +l;
    if (n !== 'r') out.push({ s: pos, len, m: midi(n) });
    pos += len;
  }
  if (pos !== 12) throw new Error('Bar is ' + pos + ' sixteenths: ' + str);
  return out;
}

/* ---------- the tune: an original polska in D minor, AABB ---------- */
const MEL_A = [
  'D5:3 E5:1 F5:2 E5:2 D5:2 A4:2',
  'F5:2 A5:2 G5:2 F5:2 E5:2 D5:2',
  'E5:3 F5:1 G5:2 E5:2 C5:2 E5:2',
  'G5:2 F5:1 E5:1 F5:2 G5:2 E5:4',
  'D5:3 E5:1 F5:2 A5:2 D6:2 A5:2',
  'Bb5:2 A5:1 G5:1 F5:2 G5:2 D5:2 Bb4:2',
  'A4:2 C#5:2 E5:2 G5:2 F5:1 E5:1 C#5:2',
  'D5:4 F5:1 E5:1 D5:6'
];
const MEL_B = [
  'A5:3 Bb5:1 A5:2 F5:2 C6:2 A5:2',
  'G5:2 E5:2 C5:2 E5:2 G5:2 C6:2',
  'A5:3 G5:1 F5:2 E5:2 D5:2 F5:2',
  'E5:2 C#5:2 A4:2 C#5:2 E5:4',
  'F5:2 A5:2 C6:3 Bb5:1 A5:2 F5:2',
  'G5:2 B5:1 C6:1 D6:2 C6:2 G5:2 E5:2',
  'F5:2 D5:2 G5:2 Bb5:1 G5:1 E5:2 C#5:2',
  'D5:8 r:4'
];
const SONG = [
  { name: 'Intro', mel: ['r:12', 'r:6 A4:2 C#5:2 E5:2'], ch: ['Dm', 'A'] },
  { name: 'A', mel: MEL_A, ch: ['Dm', 'Dm', 'C', 'C', 'Dm', 'Gm', 'A', 'Dm'] },
  { name: 'A', mel: MEL_A, ch: ['Dm', 'Dm', 'C', 'C', 'Dm', 'Gm', 'A', 'Dm'], rep: true },
  { name: 'B', mel: MEL_B, ch: ['F', 'C', 'Dm', 'A', 'F', 'C', 'Gm|A', 'Dm'] },
  { name: 'B', mel: MEL_B, ch: ['F', 'C', 'Dm', 'A', 'F', 'C', 'Gm|A', 'Dm'], rep: true }
].map(p => ({ ...p, bars: p.mel.map(parseBar) }));
const CHORD = { Dm: [2, 5, 9], C: [0, 4, 7], Gm: [7, 10, 2], A: [9, 1, 4], F: [5, 9, 0] };
const chordAt = (c, s) => { const p = c.split('|'); return p.length > 1 && s >= 6 ? p[1] : p[0]; };
const SCALE = [2, 4, 5, 7, 9, 10, 0];    // D natural minor, ascending
function diatonic(m, k) {                // move k scale steps; notes outside the scale use a third
  const i = SCALE.indexOf(((m % 12) + 12) % 12);
  if (i < 0) return m + (k < 0 ? -4 : 3);
  let cur = m, ci = i; const dir = Math.sign(k);
  for (let n = 0; n < Math.abs(k); n++) {
    const ni = ((ci + dir) % 7 + 7) % 7; let d = SCALE[ni] - SCALE[ci];
    if (dir > 0 && d <= 0) d += 12; if (dir < 0 && d >= 0) d -= 12;
    cur += d; ci = ni;
  }
  return cur;
}

/* ---------- engine ---------- */
export function createEngine(ctx, hooks = {}) {
  const st = { bpm: 112, gung: .5, level: 2, layers: { mel: 1, harm: 1, bass: 1, comp: 1, drone: 1, drums: 1 } };

  const master = ctx.createGain(); master.gain.value = .85;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = .008; comp.release.value = .25;
  const music = ctx.createGain();
  const stingBus = ctx.createGain();
  music.connect(comp); stingBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  const analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .7; master.connect(analyser);

  // a small room: generated stereo impulse with a soft top
  const rev = ctx.createConvolver();
  { const len = Math.floor(ctx.sampleRate * 2.4), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * .35; d[i] = lp * Math.pow(1 - i / len, 3.2) * (i < 220 ? i / 220 : 1); } }
    rev.buffer = b; }
  const revIn = ctx.createGain(), revOut = ctx.createGain(); revOut.gain.value = .5;
  revIn.connect(rev); rev.connect(revOut); revOut.connect(music);
  // echo, three sixteenths long, follows the tempo
  const dly = ctx.createDelay(2), fb = ctx.createGain(), dlf = ctx.createBiquadFilter(), echoIn = ctx.createGain(), echoOut = ctx.createGain();
  fb.gain.value = .3; dlf.type = 'lowpass'; dlf.frequency.value = 2400; echoOut.gain.value = .32;
  echoIn.connect(dly); dly.connect(dlf); dlf.connect(fb); fb.connect(dly); dlf.connect(echoOut); echoOut.connect(music); echoOut.connect(revIn);

  function chan(pan, rv, ec, bus = music) {
    const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan;
    const rs = ctx.createGain(), es = ctx.createGain(); rs.gain.value = rv; es.gain.value = ec;
    g.connect(p); p.connect(bus); p.connect(rs); rs.connect(revIn); p.connect(es); es.connect(echoIn);
    return { in: g, echo: es };
  }
  const CH = { mel: chan(-.08, .32, .22), harm: chan(.38, .38, .05), bass: chan(0, .06, 0), comp: chan(-.42, .22, 0), drone: chan(0, .45, 0), drums: chan(.05, .1, 0), sting: chan(0, .35, .15, stingBus) };

  const pulse = d => { const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = 2 / (n * Math.PI) * Math.sin(n * Math.PI * d);
    return ctx.createPeriodicWave(re, im); };
  const W = { p50: pulse(.5), p25: pulse(.25), p12: pulse(.125) };
  // crunchy noise, held over a few samples like an old sound chip
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  { const d = noiseBuf.getChannelData(0); let v = 0; for (let i = 0; i < d.length; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; d[i] = v; } }

  function tone(dest, wave, m, t, dur, o) {
    const osc = ctx.createOscillator();
    if (typeof wave === 'string') osc.type = wave; else osc.setPeriodicWave(wave);
    osc.frequency.value = hz(m);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.cut || 4000; f.Q.value = .6;
    const g = ctx.createGain(), v = (o.vel ?? 1) * o.gain, a = o.a ?? .01, r = o.r ?? .06;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.setTargetAtTime(v * (o.s ?? .6), t + a, (o.d ?? .1) / 3);
    g.gain.setTargetAtTime(0, t + Math.max(a, dur), r / 3);
    if (o.scoop) { osc.detune.setValueAtTime(-o.scoop, t); osc.detune.linearRampToValueAtTime(0, t + .05); }
    if (o.vib && dur > .22) {
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.6;
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib, t + Math.min(.35, dur * .7));
      l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + dur + r * 3 + .05);
    }
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + Math.max(a, dur) + r * 3 + .05);
  }
  function noise(dest, t, o) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.value = o.f; f.Q.value = o.q || .7;
    const g = ctx.createGain(); g.gain.setValueAtTime(o.gain, t); g.gain.exponentialRampToValueAtTime(.0005, t + o.dec);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * .5); src.stop(t + o.dec + .02);
  }
  function thump(dest, t, hi, lo, dec, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(hi, t); o.frequency.exponentialRampToValueAtTime(lo, t + dec * .8);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0005, t + dec);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dec + .02);
  }
  const stamp = (t, v) => { thump(CH.drums.in, t, 120, 55, .16, .55 * v); noise(CH.drums.in, t, { f: 420, gain: .35 * v, dec: .07 }); };
  const kick = (t, v) => thump(CH.drums.in, t, 150, 42, .24, .8 * v);
  const hat = (t, v) => noise(CH.drums.in, t, { type: 'highpass', f: 7000, gain: .09 * v, dec: .035 });

  // the drone: open fifth that breathes
  let drone = null;
  function startDrone(t) {
    const g = ctx.createGain(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 650; f.Q.value = 1.2; lfo.frequency.value = .09; lg.gain.value = 260;
    lfo.connect(lg); lg.connect(f.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(st.layers.drone ? .035 : 0, t + 1.2);
    const oscs = [midi('D3'), midi('A3'), midi('D2')].map((m, i) => { const o = ctx.createOscillator(); o.setPeriodicWave(i === 2 ? W.p50 : W.p12); o.frequency.value = hz(m); o.detune.value = [0, 3, -2][i]; o.connect(f); o.start(t); return o; });
    f.connect(g); g.connect(CH.drone.in); lfo.start(t);
    drone = { g, oscs, lfo };
  }
  function stopDrone(t) { if (!drone) return; drone.g.gain.setTargetAtTime(0, t, .15); [...drone.oscs, drone.lfo].forEach(o => o.stop(t + 1)); drone = null; }

  // sequencer position
  let part = 0, bar = 0, step = 0, laps = 0, nextT = 0;
  const tempoMul = () => st.level === 3 ? 1.07 : st.level === 1 ? .96 : 1;
  const stepDur = s => { const w = [1 + .14 * st.gung, 1 - .14 * st.gung, 1][Math.floor((s % 12) / 4)]; return 60 / (st.bpm * tempoMul()) / 4 * w; };
  const durOf = (s, len) => { let d = 0; for (let k = s; k < s + len; k++) d += stepDur(k); return d; };
  const on = l => !!st.layers[l];

  function playStep(t) {
    const P = SONG[part], s = step, lv = st.level;
    if (s === 0 && hooks.onBar) hooks.onBar(t, P.name, bar, P.bars.length, laps, part === 0);
    const chord = chordAt(P.ch[bar], s), cpc = CHORD[chord];
    const chordStart = s === 0 || (s === 6 && P.ch[bar].includes('|'));
    const chordLen = P.ch[bar].includes('|') ? 6 : 12;
    // melody and second voice
    for (const e of P.bars[bar]) if (e.s === s) {
      const dur = durOf(s, e.len) * .94, strong = s % 4 === 0;
      if (on('mel')) tone(CH.mel.in, W.p25, e.m, t, dur, { gain: .24, vel: lv === 1 ? .7 : strong ? 1 : .86, cut: lv === 1 ? 1700 : lv === 2 ? 3000 : 3800, a: .012, d: .12, s: .62, r: .07, vib: 9, scoop: e.len >= 3 ? 55 : 0 });
      const harmOn = on('harm') && part > 0 && (lv === 3 || (lv === 2 && P.rep));
      if (harmOn) tone(CH.harm.in, W.p12, diatonic(e.m, laps % 2 ? 2 : -2), t + .006, dur, { gain: .12, vel: strong ? 1 : .85, cut: 2600, a: .02, d: .25, s: .55, r: .12, vib: 7 });
    }
    // bass
    if (on('bass')) {
      const root = 36 + cpc[0] + (cpc[0] < 2 ? 12 : 0);
      if (lv === 1) { if (chordStart) tone(CH.bass.in, 'triangle', root, t, durOf(s, chordLen) * .95, { gain: .15, vel: .8, a: .03, d: .4, s: .6, r: .2 }); }
      else if (chordLen === 6) { if (chordStart) tone(CH.bass.in, 'triangle', root, t, durOf(s, 4), { gain: .2, a: .005, d: .15, s: .55, r: .06 }); }
      else if (s === 0) tone(CH.bass.in, 'triangle', root, t, durOf(0, 4), { gain: .21, a: .005, d: .15, s: .55, r: .06 });
      else if (s === 4) tone(CH.bass.in, 'triangle', root + 12, t, durOf(4, 2), { gain: .12, a: .005, d: .08, s: .4, r: .04 });
      else if (s === 8) tone(CH.bass.in, 'triangle', root + 7, t, durOf(8, 3), { gain: .18, a: .005, d: .15, s: .55, r: .06 });
    }
    // chords
    if (on('comp') && lv >= 2 && (s === 4 || s === 8 || (lv === 3 && s === 10))) {
      const v = s === 8 ? .9 : s === 4 ? .6 : .45;
      for (const pc of cpc) { let m = 60 + pc; if (m > 68) m -= 12; tone(CH.comp.in, W.p50, m, t, durOf(s, 1) * .9, { gain: .055, vel: v, cut: 2200, a: .003, d: .06, s: .25, r: .05 }); }
    }
    // feet and drums
    if (on('drums') && lv >= 2) {
      if (lv === 2) { if (s === 0) stamp(t, .9); if (s === 8) stamp(t, .7); }
      else {
        if (s === 0) kick(t, 1); if (s === 8) { stamp(t, .9); kick(t, .5); } if (s === 4) stamp(t, .45);
        if (s % 2 === 1) hat(t, s % 4 === 3 ? .5 : .9); if (s === 10) hat(t, .7);
      }
    }
  }
  function advance() {
    step++;
    if (step === 12) { step = 0; bar++;
      if (bar >= SONG[part].bars.length) { bar = 0; part++; if (part >= SONG.length) { part = 1; laps++; } } }
  }
  function scheduleUntil(limit) { while (nextT < limit) { playStep(nextT); nextT += stepDur(step); advance(); } }

  function start(t) { part = 0; bar = 0; step = 0; laps = 0; nextT = t; music.gain.cancelScheduledValues(t); music.gain.setValueAtTime(1, t); startDrone(t); setLevel(st.level, t); }
  function stop(t) { music.gain.setTargetAtTime(0, t, .08); stopDrone(t); }
  function setLevel(l, t = ctx.currentTime) { st.level = l; CH.mel.echo.gain.setTargetAtTime(l >= 2 ? .22 : 0, t, .2); }
  function setLayer(k, v, t = ctx.currentTime) { st.layers[k] = v; if (k === 'drone' && drone) drone.g.gain.setTargetAtTime(v ? .035 : 0, t, .2); }
  function setTempo(b) { st.bpm = b; dly.delayTime.setTargetAtTime(60 / b / 4 * 3, ctx.currentTime, .1); }
  setTempo(st.bpm);

  function sting(kind, t = ctx.currentTime + .03) {
    if (kind === 'boras') return dansband(t);
    const six = 60 / (st.bpm * 1.05) / 4;
    const notes = kind === 'vinst'
      ? [['D5', 0, 2], ['F#5', 2, 2], ['A5', 4, 2], ['D6', 6, 14]]
      : [['A4', 0, 1], ['D5', 1, 1], ['F5', 2, 1], ['A5', 3, 6]];
    const total = notes.reduce((a, n) => Math.max(a, n[1] + n[2]), 0) * six;
    music.gain.setTargetAtTime(.4, t, .03); music.gain.setTargetAtTime(1, t + total * .8, .35);
    for (const [n, s, l] of notes) {
      const m = midi(n);
      tone(CH.sting.in, W.p25, m, t + s * six, l * six * .95, { gain: .2, cut: 4200, a: .008, d: .1, s: .65, r: .1, vib: 10 });
      tone(CH.sting.in, W.p12, kind === 'vinst' ? m - 12 : diatonic(m, -2), t + s * six + .005, l * six * .95, { gain: .1, cut: 2800, a: .01, d: .2, s: .5, r: .12 });
    }
    thump(CH.sting.in, t, 120, 55, .16, .5);
    if (kind === 'vinst') { thump(CH.sting.in, t + 6 * six, 150, 42, .3, .8);
      for (const m of [50, 54, 57, 62]) tone(CH.sting.in, W.p50, m, t + 6 * six, 12 * six, { gain: .06, cut: 2000, a: .01, d: .3, s: .5, r: .4 }); }
  }
  // "Bara i Borås": a short dansband phrase in C major with an oom-pa bass (game only, not in the workshop).
  function dansband(t) {
    const e = 60 / 132 / 2;
    const mel = [['G4', 0, 1], ['C5', 1, 1], ['E5', 2, 1], ['G5', 3, 2], ['E5', 5, 1], ['A5', 6, 2], ['G5', 8, 1], ['E5', 9, 1], ['F5', 10, 1], ['D5', 11, 1], ['C5', 12, 4]];
    music.gain.setTargetAtTime(.25, t, .03); music.gain.setTargetAtTime(1, t + 16 * e, .4);
    for (const [n, s, l] of mel) {
      tone(CH.sting.in, W.p50, midi(n), t + s * e, l * e * .9, { gain: .16, cut: 3200, a: .01, d: .08, s: .7, r: .08, vib: 14 });
      tone(CH.sting.in, W.p25, midi(n) - 4 + (n[0] === 'G' || n[0] === 'C' ? 1 : 0), t + s * e + .004, l * e * .9, { gain: .07, cut: 2400, a: .01, d: .1, s: .6, r: .08 });
    }
    for (let b = 0; b < 16; b++) {
      const bt = t + b * e;
      if (b % 2 === 0) { tone(CH.sting.in, 'triangle', midi(b % 4 === 0 ? 'C3' : 'G2'), bt, e * .8, { gain: .3, a: .005, d: .1, s: .5, r: .05 }); thump(CH.sting.in, bt, 110, 50, .12, .35); }
      else for (const m of [64, 67, 72]) tone(CH.sting.in, W.p50, m, bt, e * .4, { gain: .04, cut: 2000, a: .003, d: .05, s: .3, r: .04 });
    }
  }
  return { st, start, stop, scheduleUntil, setLevel, setLayer, setTempo, setGung: g => { st.gung = g; }, sting, analyser };
}
