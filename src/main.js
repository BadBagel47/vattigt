// Ties the match, drawing, sound, touch controls and screens together.
// Taps become small input events (see net/match.js). On one phone the phone
// runs the match itself; online, the room's host runs it and the others follow
// (net/online.js).
import { createMatch } from './net/match.js';
import { createOnline, TEAM_PLACES } from './net/online.js';
import { activeUnit, newMatch, step } from './sim/world.js';
import { W, H, TPS, WEAPONS, DEFAULT_SETTINGS, TEAMS, MAX_UNITS, MODES, MODE_NAMES, POLE_WIN } from './sim/rules.js';
import { MAP_NAMES } from './sim/terrain.js';
import { createRenderer, drawIcon, MOODS, TEAM_COLORS, HATS, hatRows, teamColor } from './render/render.js';
import { VATTE } from './render/sprites.js';
import { DIALECTS, DIALECT_KEYS, defaultDialect } from './render/speech.js';
import { planTurn, LEVELS } from './ai/ai.js';
import { createSound } from './audio/sound.js';
import { shareLink, readShareLink, forgetShareKey, qrSvg, tabSession } from '../vendor/network-kit/client/index.js';

const $ = (id) => document.getElementById(id);
const scene = $('scene'), glow = $('glow'), stage = $('stage');
const renderer = createRenderer(scene, glow);
const sound = createSound();

let mode = 'title';                       // 'title' | 'local' | 'online'
let local = null;                         // the match on one phone
let online = null;                        // the online session
let backdrop = null;                      // a still match behind the start screen
let paused = false, moodName = 'midsommar', shotsFired = 0, overTimer = null;
const view = { aim: null };
let walkDir = 0;
const held = { left: false, right: false };

const match = () => (mode === 'online' ? online?.match : mode === 'local' ? local : null);
const world = () => match()?.world || backdrop;
// On one phone everyone may steer, except the computer's team.
const AI_TEAM = 1;
const aiTurn = () => mode === 'local' && aiLevel && local && local.world.turn.team === AI_TEAM;
const myTurn = () => (mode === 'local' && !aiTurn()) || (mode === 'online' && online.myTurn());
let aiLevel = null, aiPlan = [], aiFor = -1, aiClock = 0;

/* ---------- input events ---------- */
function emit(ev) {
  if (mode === 'local' && local && !paused) local.push(ev);
  else if (mode === 'online' && online) online.input(ev);
}
function updateWalk() {
  const d = held.left === held.right ? 0 : held.left ? -1 : 1;
  if (d !== walkDir) { walkDir = d; emit({ walk: d }); }
}

/* ---------- layout: scene as large as fits, panels at the sides ---------- */
let scale = 1, rotateDismissed = false;
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const side = Math.max(96, Math.min(150, Math.floor((vw - vh * W / H) / 2)));
  scale = Math.min((vw - 2 * side) / W, vh / H);
  if (scale <= 0.3) scale = vw / W;
  const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
  document.documentElement.style.setProperty('--side', side + 'px');
  stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
  const dpr = Math.min(2, devicePixelRatio || 1);
  glow.width = Math.round(cw * dpr); glow.height = Math.round(ch * dpr);
  $('rotate').hidden = !(vh > vw && mode !== 'title' && !rotateDismissed);
}
addEventListener('resize', layout);
addEventListener('orientationchange', () => setTimeout(layout, 200));

/* ---------- weapon buttons and panels ---------- */
const weaponButtons = WEAPONS.map((wp, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'weapon'; b.setAttribute('aria-pressed', 'false');
  const c = document.createElement('canvas'); drawIcon(c, i);
  const name = document.createElement('span'); name.textContent = wp.name;
  b.append(c, name, document.createElement('small'));
  b.addEventListener('click', () => { emit({ weapon: i }); sound.unlock(); menu(false); });
  $('weapons').append(b);
  return b;
});
function menu(open) {
  $('weaponMenu').hidden = !open;
  $('weaponBtn').setAttribute('aria-expanded', String(open));
  if (open) (weaponButtons.find((b) => b.getAttribute('aria-pressed') === 'true') || weaponButtons[0]).focus();
}
$('weaponBtn').addEventListener('click', () => { sound.unlock(); menu($('weaponMenu').hidden); });
$('weaponMenu').addEventListener('click', (e) => { if (e.target === $('weaponMenu')) menu(false); });
let shownWeapon = -1, shownAmmo = null;
function updatePanels() {
  const w = world();
  if (!w) return;
  const t = w.turn, u = activeUnit(w), team = u ? u.team : 0;
  document.documentElement.style.setProperty('--team', teamColor(w, team).css);
  const mine = myTurn() && mode !== 'title';
  const canAct = mine && t.phase === 'aim' && u && u.alive;
  weaponButtons.forEach((b, i) => {
    const ammo = w.teams[team].ammo[i];
    b.setAttribute('aria-pressed', String(t.weapon === i));
    b.disabled = !canAct || ammo === 0;
    b.hidden = !w.settings.weapons.includes(WEAPONS[i].id);
    b.querySelector('small').textContent = ammo < 0 ? '' : String(ammo);
    b.setAttribute('aria-label', `${WEAPONS[i].name}, ${ammo < 0 ? 'obegränsad' : ammo + ' kvar'}`);
  });
  const am = w.teams[team].ammo[t.weapon];
  if (shownWeapon !== t.weapon || shownAmmo !== am) {
    shownWeapon = t.weapon; shownAmmo = am;
    drawIcon($('weaponIcon'), t.weapon);
    $('weaponName').textContent = WEAPONS[t.weapon].name + (am >= 0 ? ` (${am})` : '');
    $('weaponBtn').setAttribute('aria-label', `Vapen: ${WEAPONS[t.weapon].name}. Tryck för att byta.`);
  }
  $('weaponBtn').disabled = !canAct;
  if (!canAct && !$('weaponMenu').hidden) menu(false);
  const wpn = WEAPONS[t.weapon], dyn = !wpn.aim && !wpn.target;
  const horse = mine && t.phase === 'retreat' && w.projectiles.some((p) => p.kind === 'hast' && u && p.owner === u.id && p.age > 6);
  const shoot = !horse && wpn.aim && view.aimed && canAct;
  $('drop').hidden = !(dyn || horse || shoot);
  $('drop').textContent = horse ? 'Spräng!' : shoot ? 'Skjut' : wpn.walker ? 'Släpp lös' : 'Lägg ut';
  $('drop').disabled = !horse && (!canAct || (u && u.air));
  const moving = mine && (t.phase === 'aim' || t.phase === 'retreat') && u && u.alive;
  for (const id of ['walkL', 'walkR', 'jump']) $(id).disabled = !moving;
  const aimable = canAct && wpn.aim && !wpn.tool && !(u && u.air);
  for (const id of ['aimUp', 'aimDown']) $(id).disabled = !aimable;
  $('power').disabled = !aimable; $('powerBox').setAttribute('aria-disabled', String(!aimable));
  if (document.activeElement !== $('power')) {
    const pw = (view.aim || view.keyAim || t.aim).power;
    if ($('power').value !== String(pw)) { $('power').value = String(pw); $('powerLabel').textContent = `Styrka ${pw} %`; }
  }
  if (!moving && (held.left || held.right)) { held.left = held.right = false; updateWalk(); }
  let hint = '';
  if (mode === 'online' && online.room) {
    const st = online.room.status;
    if (st === 'reconnecting' || st === 'offline') hint = 'Tappade kontakten, försöker igen …';
    else if (online.room.room?.paused) hint = 'Väntar på att den som kör matchen kommer tillbaka …';
    else if (t.phase === 'aim' && !mine) {
      const p = online.ctl != null ? online.room.player(online.ctl) : null;
      hint = p ? `${p.name} spelar ${u ? u.name.charAt(0) + u.name.slice(1).toLowerCase() : ''}` : 'Ingen i laget är med just nu.';
    }
  }
  if (!hint && aiTurn() && t.phase === 'aim') hint = 'Datorn tänker …';
  if (!hint && mine && u && u.rope) hint = 'Svinga med pilarna. Hoppa släpper.';
  else if (!hint && canAct && wpn.tool) hint = 'Dra mot ett tak eller en vägg och släpp för att kasta ut linan.';
  if (!hint && canAct && wpn.target) hint = wpn.ticket ? 'Tryck på vätten som ska till Borås.' : wpn.build ? 'Tryck där plankan ska ligga.' : wpn.water ? 'Tryck där hinken ska tömmas.' : wpn.id === 'jas' ? 'Tryck där planet ska fälla laddningarna.' : 'Tryck där korvarna ska falla.';
  if (!hint && canAct && wpn.aim && shotsFired < 2 && !view.aim && !view.aimed) hint = 'Dra i bilden för att sikta, eller använd ▲ ▼. Släpp för att skjuta.';
  if (!hint && horse) hint = 'Tryck på Spräng! när hästen är framme.';
  $('hint').textContent = hint;
  $('hint').hidden = !hint;
}

/* ---------- touch and mouse ---------- */
function holdButton(el, key) {
  const on = (e) => { e.preventDefault(); held[key] = true; sound.unlock(); el.setPointerCapture?.(e.pointerId); updateWalk(); };
  const off = () => { if (held[key]) { held[key] = false; updateWalk(); } };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
holdButton($('walkL'), 'left'); holdButton($('walkR'), 'right');

// Aim with up and down (F-038): up raises the aim towards straight up, down lowers it,
// on the side the vätte faces. The strength stays as it was. Fire with Enter or Skjut.
const AIM_STEP = 2;
function nudgeAim(dir) {
  if (!canAim()) return;
  const w = world(), u = activeUnit(w), cur = view.keyAim || w.turn.aim;
  let a = cur.angle > 180 ? cur.angle - 360 : cur.angle;               // -180 .. 180
  if (u.face > 0) a = Math.max(-80, Math.min(90, (a > 90 ? 180 - a : a < -90 ? -180 - a : a) + dir * AIM_STEP));
  else { let b = a < 0 ? a + 360 : a; if (b < 90) b = 180 - b; else if (b > 270) b = 540 - b; a = Math.max(91, Math.min(260, b - dir * AIM_STEP)); }
  view.keyAim = { angle: ((a % 360) + 360) % 360, power: cur.power };
  view.aimed = true;
  emit({ aim: view.keyAim });
}
function holdAim(el, dir) {
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; };
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); sound.unlock(); el.setPointerCapture?.(e.pointerId); nudgeAim(dir); stop(); timer = setInterval(() => nudgeAim(dir), 70); });
  el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); el.addEventListener('lostpointercapture', stop);
  el.addEventListener('click', (e) => { if (e.detail === 0) nudgeAim(dir); });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
holdAim($('aimUp'), 1); holdAim($('aimDown'), -1);

// Strength without dragging (F-039): the slider, or Shift with the left and right arrows.
function setPower(p) {
  if (!canAim()) return;
  const w = world(), cur = view.keyAim || w.turn.aim, power = Math.max(10, Math.min(100, Math.round(p)));
  view.keyAim = { angle: cur.angle, power }; view.aimed = true;
  $('power').value = String(power); $('powerLabel').textContent = `Styrka ${power} %`;
  emit({ aim: view.keyAim });
}
$('power').addEventListener('input', () => { sound.unlock(); setPower(+$('power').value); });
$('jump').addEventListener('pointerdown', (e) => { e.preventDefault(); emit({ jump: true }); sound.unlock(); });
$('jump').addEventListener('click', (e) => { if (e.detail === 0) emit({ jump: true }); });
$('drop').addEventListener('click', () => { const w = world(); emit({ fire: WEAPONS[w.turn.weapon].aim && view.keyAim ? { ...view.keyAim } : true }); shotsFired++; view.aimed = false; });

let drag = null;
const toWorld = (e) => { const r = scene.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
function canAim(kind = 'aim') {
  const w = world();
  if (!w || paused || !myTurn() || mode === 'title') return false;
  const u = activeUnit(w);
  const wp = WEAPONS[w.turn.weapon];
  return w.turn.phase === 'aim' && u && u.alive && (!u.air || (kind === 'aim' && wp.tool)) && !!wp[kind];
}
stage.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (!$('weaponMenu').hidden) return;
  if (canAim('target')) { e.preventDefault(); stage.setPointerCapture?.(e.pointerId); drag = { id: e.pointerId, target: true }; [view.target, view.targetY] = toWorld(e); return; }
  if (!canAim()) return;
  e.preventDefault();
  stage.setPointerCapture?.(e.pointerId);
  drag = { id: e.pointerId, start: toWorld(e) };
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.target) { [view.target, view.targetY] = toWorld(e); return; }
  const [x, y] = toWorld(e), dx = x - drag.start[0], dy = y - drag.start[1], len = Math.hypot(dx, dy);
  if (len < 4) { view.aim = null; return; }
  const angle = ((Math.round(Math.atan2(-dy, dx) * 180 / Math.PI) % 360) + 360) % 360;
  const power = Math.max(1, Math.min(100, Math.round(len / 70 * 100)));
  if (!view.aim || view.aim.angle !== angle || view.aim.power !== power) { view.aim = { angle, power }; view.keyAim = null; view.aimed = false; emit({ aim: view.aim }); }
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.target) { if (canAim('target')) { emit({ fire: { tx: Math.round(Math.max(0, Math.min(W - 1, view.target))), ty: Math.round(Math.max(0, Math.min(H - 1, view.targetY))) } }); shotsFired++; } drag = null; view.target = null; return; }
  if (view.aim && view.aim.power >= 10 && canAim()) { emit({ fire: { ...view.aim } }); shotsFired++; }
  drag = null; view.aim = null;
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) { drag = null; view.aim = null; view.target = null; } });

// Keyboard, for a computer: arrows to walk, up and down to aim, Shift with left and right for strength, space to jump, 1–9 for weapons, Enter to fire.
addEventListener('keydown', (e) => {
  if (mode === 'title' || paused || e.target.tagName === 'INPUT') return;
  if (e.repeat && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { const w = world(); if (w) setPower((view.keyAim || w.turn.aim).power + (e.key === 'ArrowRight' ? 5 : -5)); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { held.left = true; updateWalk(); }
  else if (e.key === 'ArrowRight') { held.right = true; updateWalk(); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { nudgeAim(e.key === 'ArrowUp' ? 1 : -1); e.preventDefault(); }
  else if (e.key === ' ') { emit({ jump: true }); e.preventDefault(); }
  else if (/^[1-9]$/.test(e.key)) emit({ weapon: +e.key - 1 });
  else if (e.key === 'v' || e.key === 'V') menu($('weaponMenu').hidden);
  else if (e.key === 'Escape') menu(false);
  else if (e.key === 'Enter' && e.target === document.body) { const w = world(); emit({ fire: w && WEAPONS[w.turn.weapon].aim && view.keyAim ? { ...view.keyAim } : true }); view.aimed = false; }
  else return;
  sound.unlock();
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') { held.left = false; updateWalk(); }
  if (e.key === 'ArrowRight') { held.right = false; updateWalk(); }
});

/* ---------- the loop ---------- */
// "Bara i Borås": when something unlikely happens (an own goal, a chain of five blasts, a ticket), once a turn.
const boras = { team: -1, booms: 0, shown: false, timer: null };
function stamp() {
  if (boras.shown) return;
  boras.shown = true;
  $('stamp').hidden = false; sound.sting('boras');
  clearTimeout(boras.timer); boras.timer = setTimeout(() => { $('stamp').hidden = true; }, 2600);
}
function handle(evs, w) {
  if (!evs.length) return;
  renderer.onEvents(evs, w);
  sound.onEvents(evs);
  for (const e of evs) {
    if (e.t === 'turn') { boras.team = e.team; boras.booms = 0; boras.shown = false; }
    else if (e.t === 'boom' && ++boras.booms === 5) stamp();
    else if (e.t === 'death' && w.units[e.unit] && w.units[e.unit].team === boras.team) stamp();
    else if (e.t === 'ticket') stamp();
    if (e.t === 'turn') { view.aim = null; view.keyAim = null; view.aimed = false; drag = null; walkDir = 0; }
    if (e.t === 'over') showOver();
  }
}
function musicLevel(w) {
  const t = w && w.turn;
  if (!t || mode === 'title') return 1;
  if (t.phase === 'aim') return t.timer <= 10 * TPS ? 3 : 2;
  return t.phase === 'over' ? 1 : 2;
}
let last = 0, acc = 0;
function loop(ms) {
  requestAnimationFrame(loop);
  const dt = Math.min(.25, (ms - last) / 1000); last = ms;
  if (mode === 'local' && local && !paused) {
    // the computer's turn: plan once, then feed its taps in over time
    if (aiTurn() && local.world.turn.phase === 'aim' && aiFor !== local.world.turn.number) {
      aiFor = local.world.turn.number; aiClock = 0;
      let at = 0; aiPlan = planTurn(local.world, aiLevel).map(([d, ev]) => [at += d, ev]);
    }
    if (aiPlan.length) {
      aiClock += dt * 1000;
      while (aiPlan.length && aiPlan[0][0] <= aiClock && aiTurn()) {
        const ev = aiPlan.shift()[1];
        if (ev.replan) { let at = aiClock; aiPlan = planTurn(local.world, aiLevel, { moved: true }).map(([d, e]) => [at += d, e]); }
        else local.push(ev);
      }
      if (!aiTurn()) aiPlan = [];
    }
    acc += dt;
    while (acc >= 1 / TPS) { local.runStep(); handle(local.world.events, local.world); acc -= 1 / TPS; }
  } else if (mode === 'online' && online) {
    const evs = online.frame(dt);
    if (online.match) handle(evs, online.match.world);
  }
  if (!$('custom').hidden && previewWorld) {
    const r = $('cScene').getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if ($('cGlow').width !== Math.round(r.width * dpr)) { $('cGlow').width = Math.round(r.width * dpr); $('cGlow').height = Math.round(r.height * dpr); }
    preview.frame(previewWorld, {}, ms);
  }
  const w = world();
  if (!w) return;
  const shake = renderer.frame(w, view, ms);
  stage.style.transform = shake ? `translate(${Math.round((Math.random() - .5) * shake * scale * .6)}px,${Math.round((Math.random() - .5) * shake * scale * .6)}px)` : '';
  sound.setLevel(musicLevel(w));
  updatePanels();
}

/* ---------- screens ---------- */
const screens = ['title', 'pause', 'over', 'net', 'lobby', 'custom', 'teams'];
function show(id) { for (const s of screens) $(s).hidden = s !== id; if (id) $(id).querySelector('button.primary, input, button')?.focus(); }
function resetView() { view.aim = null; view.keyAim = null; view.aimed = false; drag = null; held.left = held.right = false; walkDir = 0; shotsFired = 0; renderer.reset(); }

/* ---------- settings (eget spel) and saved teams (lagbyggaren) ---------- */
const NIGHT_MOODS = new Set(['midsommar', 'vinter']);
const custom = { opponent: 'spelare', mode: 'klassiskt', crates: true, map: DEFAULT_SETTINGS.map, units: DEFAULT_SETTINGS.units, turn: DEFAULT_SETTINGS.turn, flood: DEFAULT_SETTINGS.flood, weapons: new Set(DEFAULT_SETTINGS.weapons), team0: 0, team1: 1 };
const TEAM_KEY = 'vattigt-teams';
const defaultTeams = () => TEAMS.map((t, i) => ({ name: t.name, color: t.color, hat: t.hat, dialect: defaultDialect(i), units: t.units.map((n) => n.charAt(0) + n.slice(1).toLowerCase()) }));
let savedTeams = (() => { try { const v = JSON.parse(localStorage.getItem(TEAM_KEY) || 'null'); if (Array.isArray(v) && v.length >= 2) return v; } catch (e) { /* storage off */ } return defaultTeams(); })();
function saveTeams() { try { localStorage.setItem(TEAM_KEY, JSON.stringify(savedTeams)); } catch (e) { /* storage off: teams last until the page closes */ } }
function matchOpts() {
  const pick = (i) => savedTeams[i] || savedTeams[0];
  return {
    settings: { map: custom.map, night: NIGHT_MOODS.has(moodName), units: custom.units, turn: custom.turn, flood: custom.flood, weapons: [...custom.weapons], crates: custom.crates, mode: custom.mode },
    teams: [pick(custom.team0), pick(custom.team1)].map((t, i) => ({ name: t.name, color: t.color, hat: t.hat, units: t.units, dialect: t.dialect || defaultDialect(i) }))
  };
}

function newLocalGame() {
  clearTimeout(overTimer);
  mode = 'local';
  local = createMatch((Math.random() * 4294967296) >>> 0, matchOpts());
  aiLevel = custom.opponent === 'spelare' ? null : custom.opponent; aiPlan = []; aiFor = -1; aiClock = 0;
  resetView(); renderer.setMood(moodName);
  window.__vattigt = { match: local };
  paused = false; show(null); layout();
}
// Kubb: how the king fell.
function kingNote(w) {
  const by = w.teams[w.king.by] ? w.teams[w.king.by].name : 'Någon';
  return w.king.early ? `${by} fällde kungen för tidigt.` : `${by} fällde alla kubbar och sedan kungen.`;
}
function showOver() {
  clearTimeout(overTimer);
  overTimer = setTimeout(() => {
    const w = world();
    if (!w || w.turn.phase !== 'over') return;
    $('overText').textContent = w.winner >= 0 ? `${w.teams[w.winner].name} vinner!` : 'Oavgjort!';
    const left = w.units.filter((u) => u.alive).map((u) => u.name.charAt(0) + u.name.slice(1).toLowerCase());
    let sub = w.winner >= 0 ? `Kvar på ängen: ${left.join(', ')}. ${w.turn.round} ${w.turn.round === 1 ? 'runda' : 'rundor'}.` : 'Ingen vätte står kvar.';
    const rounds = `${w.turn.round} ${w.turn.round === 1 ? 'runda' : 'rundor'}`;
    if (w.king && w.king.winner != null) sub = `${kingNote(w)} ${rounds}.`;
    const lost = (w.nests || []).filter((n) => n.down).map((n) => w.teams[n.team].name);
    if (lost.length) sub = `${lost.join(' och ')} fick ${lost.length > 1 ? 'sina bon' : 'sitt bo'} förstört. ${rounds}.`;
    if (w.pole && w.winner >= 0 && w.pole.points[w.winner] >= POLE_WIN) sub = `${w.teams[w.winner].name} höll stången i ${POLE_WIN} rundor.`;
    const canStart = mode === 'local' || online?.isHost() || online?.room?.isOwner;
    if (mode === 'online' && !canStart) {
      const owner = online.room?.player(online.room.room?.ownerId);
      sub += ` Väntar på att ${owner ? owner.name : 'den som skapade rummet'} startar en ny match.`;
    }
    $('overSub').textContent = sub;
    $('again').hidden = !canStart;
    $('overTitle').textContent = mode === 'online' ? 'Lämna rummet' : 'Till start';
    show('over');
  }, 1800);
}
function setPaused(p) {
  paused = mode === 'local' && p;
  $('restart').hidden = mode !== 'local';
  $('toTitle').textContent = mode === 'online' ? 'Lämna rummet' : 'Avsluta';
  show(p ? 'pause' : null);
}
// The room this tab is in, so a reload brings the player back (kept per tab, gone when the tab closes).
const ROOM_KEY = 'vattigt-room';
function remember(v) { try { if (v) sessionStorage.setItem(ROOM_KEY, JSON.stringify(v)); else sessionStorage.removeItem(ROOM_KEY); } catch (e) { /* storage off */ } }
function recalled() { try { return JSON.parse(sessionStorage.getItem(ROOM_KEY) || 'null'); } catch (e) { return null; } }

function toTitle(msg) {
  clearTimeout(overTimer);
  remember(null);
  if (mode === 'online' && online) { online.leave(); online = null; }
  mode = 'title'; paused = false; local = null; resetView(); renderer.setMood(moodName);
  show('title'); layout();
  if (msg) { $('netMsg').textContent = msg; }
}

Object.entries(MOODS).forEach(([key, m]) => {
  for (const [box, net] of [['moods', false], ['netMoods', true]]) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = m.name; b.dataset.mood = key; b.setAttribute('aria-pressed', String(key === moodName));
    b.addEventListener('click', () => {
      moodName = key; markMood(key); renderer.setMood(key); preview.setMood(key);
      if (net && online) online.setMood(key);
      customNote();
    });
    $(box).append(b);
  }
});

/* ---------- eget spel ---------- */
const preview = createRenderer($('cScene'), $('cGlow'));
let previewWorld = null;
function rebuildPreview() { previewWorld = newMatch(7, { settings: { map: custom.map, units: custom.units, mode: custom.mode } }); for (let i = 0; i < 160; i++) step(previewWorld); preview.reset(); preview.setMood(moodName); }
function choiceRow(el, values, get, set, label = String) {
  el.innerHTML = '';
  for (const v of values) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label(v);
    b.setAttribute('aria-pressed', String(get(v)));
    b.addEventListener('click', () => { set(v); for (const o of el.children) o.setAttribute('aria-pressed', String(get(o._v))); customNote(); });
    b._v = v; el.append(b);
  }
}
function setupCustom() {
  choiceRow($('cMaps'), Object.keys(MAP_NAMES), (v) => custom.map === v, (v) => { custom.map = v; rebuildPreview(); }, (v) => MAP_NAMES[v]);
  const row = (k) => document.querySelector(`[data-opt=${k}]`);
  choiceRow(row('mode'), MODES, (v) => custom.mode === v, (v) => { custom.mode = v; rebuildPreview(); }, (v) => MODE_NAMES[v]);
  choiceRow(row('units'), [1, 2, 3, 4, MAX_UNITS], (v) => custom.units === v, (v) => { custom.units = v; rebuildPreview(); });
  choiceRow(row('turn'), [30, 45, 60, 90], (v) => custom.turn === v, (v) => { custom.turn = v; }, (v) => v + ' s');
  choiceRow(row('flood'), [0, 6, 8, 12], (v) => custom.flood === v, (v) => { custom.flood = v; }, (v) => (v ? 'Runda ' + v : 'Av'));
  choiceRow(row('opponent'), ['spelare', 'latt', 'lagom', 'svar'], (v) => custom.opponent === v, (v) => { custom.opponent = v; }, (v) => (v === 'spelare' ? 'En spelare till' : 'Dator: ' + LEVELS[v].name.toLowerCase()));
  choiceRow(row('crates'), [true, false], (v) => custom.crates === v, (v) => { custom.crates = v; }, (v) => (v ? 'På' : 'Av'));
  choiceRow(row('weapons'), WEAPONS.map((w) => w.id), (v) => custom.weapons.has(v), (v) => { if (custom.weapons.has(v) && custom.weapons.size > 1) custom.weapons.delete(v); else custom.weapons.add(v); }, (v) => WEAPONS.find((w) => w.id === v).name);
  for (const [i, sel] of [[0, $('cTeam0')], [1, $('cTeam1')]]) {
    sel.innerHTML = '';
    savedTeams.forEach((t, k) => { const o = document.createElement('option'); o.value = k; o.textContent = t.name; sel.append(o); });
    sel.value = String(Math.min(i ? custom.team1 : custom.team0, savedTeams.length - 1));
    sel.onchange = () => { custom['team' + i] = +sel.value; customNote(); };
  }
  if (!previewWorld) rebuildPreview();
  customNote();
}
function customNote() {
  const notes = { boras: 'Det regnar alltid, så eld slocknar. Slukhål öppnar sig mellan rundorna, lådorna kommer varje runda men innehåller ibland fel vara, och Knallen byter vapen med den som går fram till honom.', kobbarna: 'Granit tål mer än jord och bryggan är av trä.', trollskogen: 'Flyttblocken är hårda. Trollet vaknar om det träffas på natten (Midsommarnatt, Vinternatt).', gruvan: 'Mörkt under jord. Lyktorna går att skjuta sönder.', fjallet: 'Snön ligger löst på de branta sluttningarna. En smäll i närheten sätter fart på en lavin.', raukarna: 'Kalkstenspelare i havet. Skjuter man bort foten på en rauk välter den, och den skadar den den faller på.', slatten: 'Inget lä: vinden tar dubbelt så hårt. Kvarnvingarna snurrar med vinden och slår tillbaka skott.', takasarna: 'Koppartak och kanaler. Gå in vid T-skylten så åker du tunnelbana till nästa station, åt det håll du tittar.', midsommar: '' };
  let n = notes[custom.map] || '';
  const modeNotes = {
    kubb: 'Kubb: fäll motståndarens fem kubbar, sedan kungen i mitten. Fäller ni kungen för tidigt förlorar ni.',
    boet: 'Boet: varje lag har ett bo längst bak på sin sida. Laget vars bo förstörs förlorar.',
    stangen: `Stången: efter varje runda får laget med flest vättar vid midsommarstången en poäng. Först till ${POLE_WIN} vinner.`
  };
  if (modeNotes[custom.mode]) n = modeNotes[custom.mode] + ' ' + n;
  if (custom.team0 === custom.team1) n += ' Välj två olika lag.';
  $('cNote').textContent = n.trim();
  $('cStart').disabled = custom.team0 === custom.team1;
}
$('goCustom').addEventListener('click', () => { sound.unlock(); setupCustom(); show('custom'); });
$('cBack').addEventListener('click', () => show('title'));
$('cStart').addEventListener('click', () => { sound.unlock(); goFull(); newLocalGame(); });

/* ---------- lagbyggaren ---------- */
const OLD_NAMES = ['Agda', 'Alrik', 'Birger', 'Dagny', 'Elof', 'Frideborg', 'Gunnel', 'Holger', 'Ingrid', 'Josef', 'Knut', 'Lennart', 'Majken', 'Nils', 'Oskar', 'Ragnhild', 'Signe', 'Torsten', 'Ulla', 'Valborg', 'Åke', 'Östen', 'Gösta', 'Märta', 'Sixten', 'Tage'];
let curTeam = 0;
function teamsScreen() {
  const t = savedTeams[curTeam];
  $('tList').innerHTML = '';
  savedTeams.forEach((tm, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = tm.name; b.style.borderLeftColor = TEAM_COLORS[tm.color].css; b.setAttribute('aria-pressed', String(i === curTeam)); b.addEventListener('click', () => { curTeam = i; teamsScreen(); }); $('tList').append(b); });
  $('tName').value = t.name;
  $('tColors').innerHTML = '';
  TEAM_COLORS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.setAttribute('aria-label', c.name); b.title = c.name; b.setAttribute('aria-pressed', String(t.color === i)); const sp = document.createElement('span'); sp.style.background = c.css; b.append(sp); b.addEventListener('click', () => { t.color = i; saveTeams(); teamsScreen(); }); $('tColors').append(b); });
  $('tHats').innerHTML = '';
  for (const [k, name] of Object.entries(HATS)) { const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.setAttribute('aria-pressed', String(t.hat === k)); b.addEventListener('click', () => { t.hat = k; saveTeams(); teamsScreen(); }); $('tHats').append(b); }
  $('tDialect').innerHTML = '';
  for (const k of DIALECT_KEYS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = DIALECTS[k].name; b.setAttribute('aria-pressed', String((t.dialect || defaultDialect(curTeam)) === k)); b.addEventListener('click', () => { t.dialect = k; saveTeams(); teamsScreen(); }); $('tDialect').append(b); }
  $('tNames').innerHTML = '';
  for (let i = 0; i < MAX_UNITS; i++) { const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 10; inp.value = t.units[i] || ''; inp.setAttribute('aria-label', `Vätte ${i + 1}`); inp.addEventListener('input', () => { t.units[i] = inp.value.trim(); saveTeams(); }); $('tNames').append(inp); }
  $('tDelete').disabled = savedTeams.length <= 2;
  const g = $('tPrev').getContext('2d'), col = TEAM_COLORS[t.color];
  g.clearRect(0, 0, 20, 24);
  const pal = { L: col.c, l: col.d, h: 0xf4f4f0, S: 0xf2c9a2, N: 0xe89a80, e: 0x2a2030, W: 0xf4f4f0, G: 0x9aa0aa, g: 0x6a707c, B: 0x3a2c28 };
  hatRows(VATTE.slice(), t.hat).forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { g.fillStyle = '#' + pal[ch].toString(16).padStart(6, '0'); g.fillRect(5 + i, 7 + j, 1, 1); } }));
}
$('tName').addEventListener('input', () => { savedTeams[curTeam].name = $('tName').value.trim() || 'Laget'; saveTeams(); for (const [i, b] of [...$('tList').children].entries()) b.textContent = savedTeams[i].name; });
$('tShuffle').addEventListener('click', () => { const pool = OLD_NAMES.slice(); savedTeams[curTeam].units = Array.from({ length: MAX_UNITS }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); saveTeams(); teamsScreen(); });
$('tNew').addEventListener('click', () => { const pool = OLD_NAMES.slice(); savedTeams.push({ name: 'Nytt lag', color: savedTeams.length % TEAM_COLORS.length, hat: 'stickad', units: Array.from({ length: MAX_UNITS }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]) }); curTeam = savedTeams.length - 1; saveTeams(); teamsScreen(); $('tName').focus(); });
$('tDelete').addEventListener('click', () => { if (savedTeams.length <= 2) return; savedTeams.splice(curTeam, 1); curTeam = 0; custom.team0 = 0; custom.team1 = 1; saveTeams(); teamsScreen(); });
$('goTeams').addEventListener('click', () => { sound.unlock(); curTeam = 0; teamsScreen(); show('teams'); });
$('tBack').addEventListener('click', () => show('title'));
function markMood(key) { document.querySelectorAll('[data-mood]').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.mood === key))); }

async function goFull() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen && matchMedia('(pointer: coarse)').matches) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch (e) { /* not supported here, e.g. iPhone */ }
  layout();
}
$('play').addEventListener('click', () => { sound.unlock(); goFull(); custom.opponent = 'spelare'; newLocalGame(); });
$('playAi').addEventListener('click', () => { sound.unlock(); goFull(); custom.opponent = 'lagom'; newLocalGame(); });
$('again').addEventListener('click', () => {
  sound.unlock();
  if (mode === 'local') newLocalGame();
  else if (online?.room) { online.room.start(); $('again').disabled = true; setTimeout(() => { $('again').disabled = false; }, 3000); }
});
$('restart').addEventListener('click', () => newLocalGame());
$('menu').addEventListener('click', () => setPaused(true));
$('resume').addEventListener('click', () => setPaused(false));
$('toTitle').addEventListener('click', () => toTitle());
$('overTitle').addEventListener('click', () => toTitle());
$('anyway').addEventListener('click', () => { rotateDismissed = true; layout(); });
$('mute').addEventListener('click', () => {
  const m = !sound.muted; sound.setMuted(m);
  $('mute').setAttribute('aria-pressed', String(m)); $('mute').textContent = m ? 'Ljud på' : 'Ljud av';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { sound.suspend(); if (mode === 'local' && !paused) setPaused(true); held.left = held.right = false; updateWalk(); }
  else sound.resume();
});

/* ---------- online: entry and lobby ---------- */
const SERVER = location.origin;
const canOnline = /^https?:$/.test(location.protocol) && !location.hostname.endsWith('github.io');
$('goNet').hidden = !canOnline;
let invite = readShareLink(location.hash);
if (invite) forgetShareKey();

function netBusy(b) { for (const id of ['create', 'joinBtn']) $(id).disabled = b; }
function startOnline() {
  online = createOnline(SERVER, {
    onRoom: (rm) => updateLobby(rm),
    onMatch: (m, mood) => {
      clearTimeout(overTimer);
      mode = 'online'; resetView(); moodName = mood; markMood(mood); renderer.setMood(mood);
      window.__vattigt = { online };
      show(null); goFull(); layout();
    },
    onMood: (m) => { moodName = m; markMood(m); renderer.setMood(m); },
    onClosed: (info) => toTitle(info?.text || 'Rummet är stängt.'),
    onError: () => {},
  });
  return online;
}
async function enterRoom(fn) {
  const name = $('name').value.trim();
  if (!name) { $('netMsg').textContent = 'Skriv ditt namn först.'; $('name').focus(); return; }
  netBusy(true); $('netMsg').textContent = 'Ansluter …';
  try {
    startOnline();
    await fn(name);
    mode = 'online'; local = null;
    $('netMsg').textContent = '';
    remember({ code: online.room.code, name });
    netBuilt = false;
    updateLobby(online.room.room);
  } catch (err) {
    online = null;
    $('netMsg').textContent = err?.message || 'Det gick inte att ansluta. Försök igen.';
  } finally { netBusy(false); }
}
$('goNet').addEventListener('click', () => { sound.unlock(); show('net'); });
$('netBack').addEventListener('click', () => show('title'));
$('create').addEventListener('click', () => enterRoom((name) => online.create(name)));
$('joinBtn').addEventListener('click', () => {
  const code = $('code').value.trim();
  if (!code) { $('netMsg').textContent = 'Skriv rumskoden.'; $('code').focus(); return; }
  const key = invite && invite.code === code.toUpperCase().replace(/[\s-]/g, '') ? invite.key : null;
  enterRoom((name) => online.join(code, key, name));
});
$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('joinBtn').click(); });
$('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') (invite ? $('joinBtn') : $('create')).click(); });

let lastLink = '';
function updateLobby(rm) {
  if (!online?.room || !rm) return;
  const r = online.room;
  if (rm.phase === 'playing') return;
  if (rm.phase === 'ended') return;           // the over screen is showing
  if ($('lobby').hidden) show('lobby');
  $('roomCode').textContent = rm.code;
  const key = r.inviteKeys?.player?.k || null;
  const link = shareLink(location.origin + location.pathname, rm.code, key);
  if (link !== lastLink) { lastLink = link; $('qr').innerHTML = qrSvg(link, { title: 'QR-kod till rummet' }); }
  const name = (p) => p.name + (p.id === r.me ? ' (du)' : '') + (p.id === rm.ownerId ? ' ★' : '');
  for (const el of document.querySelectorAll('.team')) {
    const place = el.dataset.place, ids = rm.places?.[place] || [];
    el.querySelector('ul').innerHTML = '';
    for (const id of ids) { const p = r.player(id); if (!p) continue; const li = document.createElement('li'); li.textContent = name(p); if (p.status !== 'online') li.className = 'away'; el.querySelector('ul').append(li); }
    const btn = el.querySelector('button'), mine = r.self?.place === place;
    btn.textContent = mine ? 'Ditt lag' : 'Välj lag'; btn.disabled = mine;
    btn.onclick = () => r.takePlace(place);
  }
  const watchers = rm.players.filter((p) => !p.place).map((p) => p.name);
  $('watchers').textContent = watchers.length ? 'Tittar på: ' + watchers.join(', ') : '';
  const lead = r.isOwner || r.isHost;
  $('ownerBox').hidden = !lead;
  const curMap = rm.data?.map || 'midsommar';
  if (lead) netSetup();
  const st = rm.data?.settings || {}, tms = rm.data?.teams;
  $('lobbyMap').textContent = `Bana: ${MAP_NAMES[curMap]}.${MODE_NAMES[st.mode] && st.mode !== 'klassiskt' ? ` Spelläge: ${MODE_NAMES[st.mode]}.` : ''} ${st.units || 3} vättar per lag, ${st.turn || 45} sekunder per tur.`;
  document.querySelectorAll('.team').forEach((el, i) => { const t = tms && tms[i]; const h = el.querySelector('h3'); h.textContent = t ? t.name : TEAMS[i].name; h.style.color = TEAM_COLORS[t ? t.color : i].css; });
  const ready = TEAM_PLACES.every((pl) => (rm.places?.[pl] || []).length > 0);
  $('startNet').hidden = !lead;
  $('startNet').disabled = !ready || rm.phase === 'countdown';
  const owner = r.player(rm.ownerId);
  $('lobbyMsg').textContent = rm.phase === 'countdown' ? 'Matchen börjar …'
    : lead ? (ready ? 'Alla lag har spelare. Starta när ni är redo.' : 'Varje lag behöver minst en spelare. Bjud in med länken eller QR-koden.')
    : `Väntar på att ${owner ? owner.name : 'den som skapade rummet'} startar matchen.`;
}
// The room owner's choices: the same as in eget spel, sent to everyone in the room.
let netBuilt = false;
function pushSetup() {
  if (!online) return;
  const o = matchOpts();
  online.setSetup({ units: o.settings.units, turn: o.settings.turn, flood: o.settings.flood, weapons: o.settings.weapons, crates: o.settings.crates, mode: o.settings.mode }, o.teams);
}
function netSetup() {
  if (netBuilt) return;
  netBuilt = true;
  choiceRow($('netMaps'), Object.keys(MAP_NAMES), (v) => custom.map === v, (v) => { custom.map = v; online.setMap(v); }, (v) => MAP_NAMES[v]);
  choiceRow($('netMode'), MODES, (v) => custom.mode === v, (v) => { custom.mode = v; pushSetup(); }, (v) => MODE_NAMES[v]);
  choiceRow($('netUnits'), [1, 2, 3, 4, MAX_UNITS], (v) => custom.units === v, (v) => { custom.units = v; pushSetup(); });
  choiceRow($('netTurn'), [30, 45, 60, 90], (v) => custom.turn === v, (v) => { custom.turn = v; pushSetup(); }, (v) => v + ' s');
  choiceRow($('netFlood'), [0, 6, 8, 12], (v) => custom.flood === v, (v) => { custom.flood = v; pushSetup(); }, (v) => (v ? 'Runda ' + v : 'Av'));
  choiceRow($('netCrates'), [true, false], (v) => custom.crates === v, (v) => { custom.crates = v; pushSetup(); }, (v) => (v ? 'På' : 'Av'));
  choiceRow($('netWeapons'), WEAPONS.map((w) => w.id), (v) => custom.weapons.has(v), (v) => { if (custom.weapons.has(v) && custom.weapons.size > 1) custom.weapons.delete(v); else custom.weapons.add(v); pushSetup(); }, (v) => WEAPONS.find((w) => w.id === v).name);
  for (const [i, sel] of [[0, $('netTeam0')], [1, $('netTeam1')]]) {
    sel.innerHTML = '';
    savedTeams.forEach((t, k) => { const o = document.createElement('option'); o.value = k; o.textContent = t.name; sel.append(o); });
    sel.value = String(Math.min(i ? custom.team1 : custom.team0, savedTeams.length - 1));
    sel.onchange = () => { custom['team' + i] = +sel.value; pushSetup(); };
  }
  online.setMap(custom.map); pushSetup();
}
$('startNet').addEventListener('click', () => { sound.unlock(); online?.room?.start(); });
$('leave').addEventListener('click', () => toTitle());
$('copyLink').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(lastLink); $('lobbyMsg').textContent = 'Länken är kopierad.'; }
  catch (e) { $('lobbyMsg').textContent = lastLink; }
});

/* ---------- start ---------- */
// A frozen match behind the start screen.
backdrop = newMatch(20261117);
for (let i = 0; i < 200; i++) step(backdrop);
renderer.setMood(moodName);
layout();
requestAnimationFrame(loop);
if (invite && canOnline) { show('net'); $('code').value = invite.code; $('name').focus(); }
else $('play').focus();
// Back into the room after a reload (not in a tab copied from another, which has its own player).
if (canOnline && !invite) {
  const back = recalled();
  if (back?.code && back?.name) tabSession().then(({ copied }) => {
    if (copied) { remember(null); return; }
    show('net'); $('name').value = back.name; $('code').value = back.code;
    enterRoom((name) => online.join(back.code, null, name));
  }).catch(() => {});
}
