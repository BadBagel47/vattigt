// Ties the simulation, drawing, sound and touch controls together for one
// screen. Inputs are collected per simulation step, so online play can later
// send the same inputs instead (D-011).
import { newMatch, step, activeUnit, px } from './sim/world.js';
import { W, H, TPS, WEAPONS } from './sim/rules.js';
import { createRenderer, drawIcon, MOODS, TEAM_COLORS } from './render/render.js';
import { createSound } from './audio/sound.js';

const $ = (id) => document.getElementById(id);
const scene = $('scene'), glow = $('glow'), stage = $('stage');
const renderer = createRenderer(scene, glow);
const sound = createSound();

let world = null, running = false, paused = false, moodName = 'midsommar', shotsFired = 0, overTimer = null;
const inputs = [];                       // [tick, input] for every step with input: a replay of the match
const view = { aim: null };
const held = { left: false, right: false };
let queued = {};

/* ---------- layout: scene as large as fits, panels at the sides ---------- */
let scale = 1;
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const portrait = vh > vw;
  const side = Math.max(96, Math.min(150, Math.floor((vw - vh * W / H) / 2)));
  scale = Math.min((vw - 2 * side) / W, vh / H);
  if (scale <= 0.3) scale = vw / W;
  const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
  document.documentElement.style.setProperty('--side', side + 'px');
  stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
  const dpr = Math.min(2, devicePixelRatio || 1);
  glow.width = Math.round(cw * dpr); glow.height = Math.round(ch * dpr);
  $('rotate').hidden = !(portrait && running && !rotateDismissed);
}
let rotateDismissed = false;
addEventListener('resize', layout);
addEventListener('orientationchange', () => setTimeout(layout, 200));

/* ---------- weapon buttons ---------- */
const weaponButtons = WEAPONS.map((wp, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'weapon'; b.setAttribute('aria-pressed', 'false');
  const c = document.createElement('canvas'); drawIcon(c, i);
  b.append(c, document.createElement('small'));
  b.addEventListener('click', () => { queued.weapon = i; sound.unlock(); });
  $('weapons').append(b);
  return b;
});
function updatePanels() {
  if (!world) return;
  const t = world.turn, u = activeUnit(world), team = u ? u.team : 0;
  document.documentElement.style.setProperty('--team', TEAM_COLORS[team].css);
  const canAct = (t.phase === 'aim') && u && u.alive;
  weaponButtons.forEach((b, i) => {
    const ammo = world.teams[team].ammo[i];
    b.setAttribute('aria-pressed', String(t.weapon === i));
    b.disabled = !canAct || ammo === 0;
    b.querySelector('small').textContent = ammo < 0 ? '' : String(ammo);
    b.setAttribute('aria-label', `${WEAPONS[i].name}, ${ammo < 0 ? 'obegränsad' : ammo + ' kvar'}`);
  });
  const dyn = !WEAPONS[t.weapon].aim;
  $('drop').hidden = !dyn;
  $('drop').disabled = !canAct || (u && u.air);
  const moving = (t.phase === 'aim' || t.phase === 'retreat') && u && u.alive;
  for (const id of ['walkL', 'walkR', 'jump']) $(id).disabled = !moving;
  $('hint').hidden = !(canAct && !dyn && shotsFired < 2 && !view.aim);
}

/* ---------- touch and mouse ---------- */
function holdButton(el, key) {
  const on = (e) => { e.preventDefault(); held[key] = true; sound.unlock(); el.setPointerCapture?.(e.pointerId); };
  const off = () => { held[key] = false; };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
holdButton($('walkL'), 'left'); holdButton($('walkR'), 'right');
$('jump').addEventListener('pointerdown', (e) => { e.preventDefault(); queued.jump = true; sound.unlock(); });
$('jump').addEventListener('click', (e) => { if (e.detail === 0) queued.jump = true; });   // keyboard
$('drop').addEventListener('click', () => { queued.fire = true; shotsFired++; });

let drag = null;
const toWorld = (e) => { const r = scene.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
function canAim() {
  if (!world || paused) return false;
  const u = activeUnit(world);
  return world.turn.phase === 'aim' && u && u.alive && !u.air && WEAPONS[world.turn.weapon].aim;
}
stage.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (!canAim()) return;
  e.preventDefault();
  stage.setPointerCapture?.(e.pointerId);
  drag = { id: e.pointerId, start: toWorld(e) };
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const [x, y] = toWorld(e), dx = x - drag.start[0], dy = y - drag.start[1], len = Math.hypot(dx, dy);
  if (len < 4) { view.aim = null; return; }
  const angle = ((Math.round(Math.atan2(-dy, dx) * 180 / Math.PI) % 360) + 360) % 360;
  const power = Math.max(1, Math.min(100, Math.round(len / 70 * 100)));
  view.aim = { angle, power };
  queued.aim = view.aim;
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (view.aim && view.aim.power >= 10 && canAim()) { queued.fire = { ...view.aim }; shotsFired++; }
  drag = null; view.aim = null;
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) { drag = null; view.aim = null; } });

// Keyboard, for a computer: arrows to walk, space to jump, 1–3 for weapons, Enter to fire with the last aim.
addEventListener('keydown', (e) => {
  if (!running || paused || e.repeat && !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  if (e.key === 'ArrowLeft') held.left = true;
  else if (e.key === 'ArrowRight') held.right = true;
  else if (e.key === ' ') { queued.jump = true; e.preventDefault(); }
  else if (['1', '2', '3'].includes(e.key)) queued.weapon = +e.key - 1;
  else if (e.key === 'Enter' && e.target === document.body) queued.fire = true;
  else return;
  sound.unlock();
});
addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft') held.left = false; if (e.key === 'ArrowRight') held.right = false; });

/* ---------- the match loop: 60 fixed steps a second ---------- */
function takeInput() {
  const inp = {};
  if (held.left !== held.right) inp.walk = held.left ? -1 : 1;
  for (const k of ['jump', 'weapon', 'aim', 'fire']) if (queued[k] !== undefined) inp[k] = queued[k];
  queued = {};
  return inp;
}
function simStep() {
  const inp = takeInput();
  if (Object.keys(inp).length) inputs.push([world.tick, inp]);
  step(world, inp);
  if (world.events.length) {
    renderer.onEvents(world.events, world);
    sound.onEvents(world.events);
    for (const e of world.events) {
      if (e.t === 'turn') { view.aim = null; drag = null; }
      if (e.t === 'over') showOver();
    }
  }
}
function musicLevel() {
  const t = world && world.turn;
  if (!t || !running) return 1;
  if (t.phase === 'aim') return t.timer <= 10 * TPS ? 3 : 2;
  if (t.phase === 'over') return 1;
  return 2;
}

let last = 0, acc = 0;
function loop(ms) {
  requestAnimationFrame(loop);
  const dt = Math.min(.25, (ms - last) / 1000); last = ms;
  if (!world) return;
  if (running && !paused) {
    acc += dt;
    while (acc >= 1 / TPS) { simStep(); acc -= 1 / TPS; }
  }
  const shake = renderer.frame(world, view, ms);
  stage.style.transform = shake ? `translate(${Math.round((Math.random() - .5) * shake * scale * .6)}px,${Math.round((Math.random() - .5) * shake * scale * .6)}px)` : '';
  sound.setLevel(musicLevel());
  updatePanels();
}

/* ---------- screens ---------- */
function newGame() {
  clearTimeout(overTimer);
  world = newMatch((Math.random() * 4294967296) >>> 0);
  inputs.length = 0; shotsFired = 0; view.aim = null; drag = null; queued = {};
  renderer.reset(); renderer.setMood(moodName);
  window.__vattigt = { world, inputs };
  running = true; paused = false;
  for (const id of ['title', 'pause', 'over']) $(id).hidden = true;
  layout();
}
function showOver() {
  const w = world;
  overTimer = setTimeout(() => {
    $('overText').textContent = w.winner >= 0 ? `${w.teams[w.winner].name} vinner!` : 'Oavgjort!';
    const left = w.units.filter((u) => u.alive).map((u) => u.name.charAt(0) + u.name.slice(1).toLowerCase());
    $('overSub').textContent = w.winner >= 0 ? `Kvar på ängen: ${left.join(', ')}. ${w.turn.round} rundor.` : 'Ingen vätte står kvar.';
    $('over').hidden = false;
    $('again').focus();
  }, 1800);
}
function setPaused(p) { paused = p; $('pause').hidden = !p; if (p) $('resume').focus(); }

Object.entries(MOODS).forEach(([key, m]) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = m.name; b.setAttribute('aria-pressed', String(key === moodName));
  b.addEventListener('click', () => {
    moodName = key;
    document.querySelectorAll('#moods button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    renderer.setMood(key);
  });
  $('moods').append(b);
});

async function goFull() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen && matchMedia('(pointer: coarse)').matches) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch (e) { /* not supported here, e.g. iPhone */ }
  layout();
}
$('play').addEventListener('click', () => { sound.unlock(); goFull(); newGame(); });
$('again').addEventListener('click', () => { sound.unlock(); newGame(); });
$('restart').addEventListener('click', () => newGame());
$('menu').addEventListener('click', () => setPaused(true));
$('resume').addEventListener('click', () => setPaused(false));
function toTitle() { running = false; paused = false; $('pause').hidden = true; $('over').hidden = true; $('title').hidden = false; layout(); $('play').focus(); }
$('toTitle').addEventListener('click', toTitle);
$('overTitle').addEventListener('click', toTitle);
$('anyway').addEventListener('click', () => { rotateDismissed = true; layout(); });
$('mute').addEventListener('click', () => {
  const m = !sound.muted; sound.setMuted(m);
  $('mute').setAttribute('aria-pressed', String(m)); $('mute').textContent = m ? 'Ljud på' : 'Ljud av';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { sound.suspend(); if (running && !paused) setPaused(true); held.left = held.right = false; }
  else sound.resume();
});

// A match runs behind the title screen as a backdrop, frozen until Spela.
world = newMatch(20261117);
for (let i = 0; i < 200; i++) step(world);
renderer.setMood(moodName);
layout();
requestAnimationFrame(loop);
$('play').focus();
