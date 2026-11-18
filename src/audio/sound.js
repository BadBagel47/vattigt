// Music and sound effects. Starts on the first tap (browsers require it).
import { createEngine } from './music.js';

export function createSound() {
  let ctx = null, eng = null, timer = null, out = null, muted = false, level = 1, noiseBuf = null;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    eng = createEngine(ctx);
    out = ctx.createGain(); out.gain.value = .7; out.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); let v = 0;
    for (let i = 0; i < d.length; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; d[i] = v; }
    return true;
  }
  function startMusic() {
    if (!ensure() || timer) return;
    ctx.resume().catch(() => {});
    eng.st.level = level;
    eng.start(ctx.currentTime + .1);
    timer = setInterval(() => eng.scheduleUntil(ctx.currentTime + .2), 30);
  }
  function stopMusic() {
    if (!timer) return;
    clearInterval(timer); timer = null; eng.stop(ctx.currentTime);
  }

  function noise(t, { f, type = 'lowpass', gain, dec, q = .7 }) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0005, t + dec);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + dec + .05);
  }
  function tone(t, { type = 'square', f1, f2, gain, dec }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dec * .9);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0005, t + dec);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + .05);
  }

  function onEvents(evs) {
    if (!ctx || muted || ctx.state !== 'running') return;
    const t = ctx.currentTime + .01;
    for (const e of evs) {
      if (e.t === 'boom') {
        const big = e.r / 16;
        tone(t, { type: 'sine', f1: 140, f2: 32, gain: .9 * Math.min(1.3, big), dec: .45 + big * .2 });
        noise(t, { f: 900, gain: .7 * Math.min(1.2, big), dec: .5 + big * .3 });
        noise(t, { f: 3000, type: 'highpass', gain: .15, dec: .12 });
      } else if (e.t === 'fire') {
        if (e.kind === 'gurra') { noise(t, { f: 1800, type: 'bandpass', gain: .5, dec: .35, q: 1.2 }); tone(t, { f1: 220, f2: 90, gain: .12, dec: .2 }); }
        else if (e.kind === 'strom') tone(t, { type: 'triangle', f1: 300, f2: 520, gain: .3, dec: .15 });
        else tone(t, { type: 'triangle', f1: 160, f2: 120, gain: .3, dec: .12 });
      } else if (e.t === 'splash') {
        noise(t, { f: 1200, type: 'bandpass', gain: .5, dec: .4, q: .8 });
        tone(t, { type: 'sine', f1: 600, f2: 180, gain: .15, dec: .3 });
      } else if (e.t === 'jump') tone(t, { f1: 330, f2: 660, gain: .08, dec: .12 });
      else if (e.t === 'bounce' && e.v > 900) tone(t, { type: 'triangle', f1: 520, f2: 380, gain: .12, dec: .06 });
      else if (e.t === 'turn') { eng.sting('tur'); }
      else if (e.t === 'over') { eng.sting('vinst'); }
      else if (e.t === 'death') tone(t, { f1: 440, f2: 110, gain: .12, dec: .5 });
      else if (e.t === 'bump') { tone(t, { type: 'sine', f1: 120, f2: 60, gain: .4, dec: .15 }); noise(t, { f: 600, gain: .25, dec: .08 }); }
      else if (e.t === 'troll') { tone(t, { type: 'sawtooth', f1: 90, f2: 60, gain: .25, dec: .6 }); }
      else if (e.t === 'lamp') noise(t, { f: 4000, type: 'highpass', gain: .2, dec: .15 });
      else if (e.t === 'cloud') noise(t, { f: 500, gain: .3, dec: .6 });
      else if (e.t === 'rope') tone(t, { type: 'triangle', f1: 1200, f2: 300, gain: .12, dec: .12 });
      else if (e.t === 'rope-miss') tone(t, { type: 'triangle', f1: 600, f2: 200, gain: .08, dec: .2 });
      else if (e.t === 'pour') noise(t, { f: 900, type: 'bandpass', gain: .4, dec: 1.2, q: .6 });
      else if (e.t === 'nip') { tone(t, { f1: 900, f2: 500, gain: .12, dec: .08 }); tone(t + .08, { f1: 900, f2: 500, gain: .12, dec: .08 }); }
      else if (e.t === 'snow') noise(t, { f: 1500, gain: .25, dec: .25 });
      else if (e.t === 'avalanche') { noise(t, { f: 260, gain: .7, dec: 2.2 }); noise(t + .2, { f: 1400, gain: .2, dec: 1.4 }); }
      else if (e.t === 'metro') { tone(t, { type: 'square', f1: 660, f2: 660, gain: .06, dec: .18 }); tone(t + .2, { type: 'square', f1: 550, f2: 550, gain: .06, dec: .25 }); noise(t, { f: 700, type: 'bandpass', gain: .25, dec: .8 }); }
      else if (e.t === 'nest-down') { tone(t, { type: 'sawtooth', f1: 220, f2: 70, gain: .25, dec: .8 }); }
      else if (e.t === 'rauk') { tone(t, { type: 'sine', f1: 90, f2: 30, gain: .8, dec: 1.2 }); noise(t, { f: 400, gain: .6, dec: 1.4 }); }
      else if (e.t === 'sail') { tone(t, { type: 'square', f1: 300, f2: 700, gain: .12, dec: .12 }); noise(t, { f: 2500, type: 'bandpass', gain: .2, dec: .1 }); }
      else if (e.t === 'dam') { noise(t, { f: 300, gain: .8, dec: 2.4 }); tone(t, { type: 'sine', f1: 70, f2: 35, gain: .6, dec: 1.5 }); }
      else if (e.t === 'boing') tone(t, { type: 'sine', f1: 180, f2: 620, gain: .3, dec: .25 });
      else if (e.t === 'mow') { tone(t, { type: 'sawtooth', f1: 140, f2: 150, gain: .12, dec: .3 }); }
      else if (e.t === 'kubb') { tone(t, { type: 'triangle', f1: 760, f2: 520, gain: .3, dec: .07 }); tone(t + .09, { type: 'triangle', f1: 520, f2: 380, gain: .25, dec: .09 }); }
      else if (e.t === 'king') { for (let k = 0; k < 3; k++) tone(t + k * .1, { type: 'triangle', f1: 600 - k * 120, f2: 420 - k * 100, gain: .3, dec: .1 }); }
      else if (e.t === 'steam') noise(t, { f: 5000, type: 'highpass', gain: .12, dec: .4 });
    }
  }

  return {
    // Call from a tap: starts audio.
    unlock() { if (ensure()) { ctx.resume().catch(() => {}); if (!muted) startMusic(); } },
    setLevel(l) { if (l === level) return; level = l; if (eng) eng.setLevel(l); },
    setMuted(m) {
      muted = m;
      if (!ctx) return;
      if (m) { stopMusic(); out.gain.setTargetAtTime(0, ctx.currentTime, .05); }
      else { out.gain.setTargetAtTime(.7, ctx.currentTime, .05); startMusic(); }
    },
    get muted() { return muted; },
    sting(kind) { if (eng && !muted && ctx.state === 'running') eng.sting(kind); },
    suspend() { if (ctx) ctx.suspend().catch(() => {}); },
    resume() { if (ctx && !muted) ctx.resume().catch(() => {}); },
    onEvents
  };
}
