// Ties the match, drawing, sound, touch controls and screens together.
// Taps become small input events (see net/match.js). On one phone the phone
// runs the match itself; online, the room's host runs it and the others follow
// (net/online.js).
import { createMatch } from './net/match.js';
import { createOnline, TEAM_PLACES } from './net/online.js';
import { activeUnit, newMatch, step } from './sim/world.js';
import { W, H, TPS, WEAPONS } from './sim/rules.js';
import { createRenderer, drawIcon, MOODS, TEAM_COLORS } from './render/render.js';
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
const myTurn = () => mode === 'local' || (mode === 'online' && online.myTurn());

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
  b.append(c, document.createElement('small'));
  b.addEventListener('click', () => { emit({ weapon: i }); sound.unlock(); });
  $('weapons').append(b);
  return b;
});
function updatePanels() {
  const w = world();
  if (!w) return;
  const t = w.turn, u = activeUnit(w), team = u ? u.team : 0;
  document.documentElement.style.setProperty('--team', TEAM_COLORS[team].css);
  const mine = myTurn() && mode !== 'title';
  const canAct = mine && t.phase === 'aim' && u && u.alive;
  weaponButtons.forEach((b, i) => {
    const ammo = w.teams[team].ammo[i];
    b.setAttribute('aria-pressed', String(t.weapon === i));
    b.disabled = !canAct || ammo === 0;
    b.querySelector('small').textContent = ammo < 0 ? '' : String(ammo);
    b.setAttribute('aria-label', `${WEAPONS[i].name}, ${ammo < 0 ? 'obegränsad' : ammo + ' kvar'}`);
  });
  const dyn = !WEAPONS[t.weapon].aim;
  $('drop').hidden = !dyn;
  $('drop').disabled = !canAct || (u && u.air);
  const moving = mine && (t.phase === 'aim' || t.phase === 'retreat') && u && u.alive;
  for (const id of ['walkL', 'walkR', 'jump']) $(id).disabled = !moving;
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
  if (!hint && canAct && !dyn && shotsFired < 2 && !view.aim) hint = 'Dra i bilden för att sikta. Släpp för att skjuta.';
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
$('jump').addEventListener('pointerdown', (e) => { e.preventDefault(); emit({ jump: true }); sound.unlock(); });
$('jump').addEventListener('click', (e) => { if (e.detail === 0) emit({ jump: true }); });
$('drop').addEventListener('click', () => { emit({ fire: true }); shotsFired++; });

let drag = null;
const toWorld = (e) => { const r = scene.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
function canAim() {
  const w = world();
  if (!w || paused || !myTurn() || mode === 'title') return false;
  const u = activeUnit(w);
  return w.turn.phase === 'aim' && u && u.alive && !u.air && WEAPONS[w.turn.weapon].aim;
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
  if (!view.aim || view.aim.angle !== angle || view.aim.power !== power) { view.aim = { angle, power }; emit({ aim: view.aim }); }
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (view.aim && view.aim.power >= 10 && canAim()) { emit({ fire: { ...view.aim } }); shotsFired++; }
  drag = null; view.aim = null;
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) { drag = null; view.aim = null; } });

// Keyboard, for a computer: arrows to walk, space to jump, 1–3 for weapons, Enter to fire with the last aim.
addEventListener('keydown', (e) => {
  if (mode === 'title' || paused || e.target.tagName === 'INPUT') return;
  if (e.repeat && !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  if (e.key === 'ArrowLeft') { held.left = true; updateWalk(); }
  else if (e.key === 'ArrowRight') { held.right = true; updateWalk(); }
  else if (e.key === ' ') { emit({ jump: true }); e.preventDefault(); }
  else if (['1', '2', '3'].includes(e.key)) emit({ weapon: +e.key - 1 });
  else if (e.key === 'Enter' && e.target === document.body) emit({ fire: true });
  else return;
  sound.unlock();
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') { held.left = false; updateWalk(); }
  if (e.key === 'ArrowRight') { held.right = false; updateWalk(); }
});

/* ---------- the loop ---------- */
function handle(evs, w) {
  if (!evs.length) return;
  renderer.onEvents(evs, w);
  sound.onEvents(evs);
  for (const e of evs) {
    if (e.t === 'turn') { view.aim = null; drag = null; walkDir = 0; }
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
    acc += dt;
    while (acc >= 1 / TPS) { local.runStep(); handle(local.world.events, local.world); acc -= 1 / TPS; }
  } else if (mode === 'online' && online) {
    const evs = online.frame(dt);
    if (online.match) handle(evs, online.match.world);
  }
  const w = world();
  if (!w) return;
  const shake = renderer.frame(w, view, ms);
  stage.style.transform = shake ? `translate(${Math.round((Math.random() - .5) * shake * scale * .6)}px,${Math.round((Math.random() - .5) * shake * scale * .6)}px)` : '';
  sound.setLevel(musicLevel(w));
  updatePanels();
}

/* ---------- screens ---------- */
const screens = ['title', 'pause', 'over', 'net', 'lobby'];
function show(id) { for (const s of screens) $(s).hidden = s !== id; if (id) $(id).querySelector('button.primary, input, button')?.focus(); }
function resetView() { view.aim = null; drag = null; held.left = held.right = false; walkDir = 0; shotsFired = 0; renderer.reset(); }

function newLocalGame() {
  clearTimeout(overTimer);
  mode = 'local';
  local = createMatch((Math.random() * 4294967296) >>> 0);
  resetView(); renderer.setMood(moodName);
  window.__vattigt = { match: local };
  paused = false; show(null); layout();
}
function showOver() {
  clearTimeout(overTimer);
  overTimer = setTimeout(() => {
    const w = world();
    if (!w || w.turn.phase !== 'over') return;
    $('overText').textContent = w.winner >= 0 ? `${w.teams[w.winner].name} vinner!` : 'Oavgjort!';
    const left = w.units.filter((u) => u.alive).map((u) => u.name.charAt(0) + u.name.slice(1).toLowerCase());
    let sub = w.winner >= 0 ? `Kvar på ängen: ${left.join(', ')}. ${w.turn.round} rundor.` : 'Ingen vätte står kvar.';
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
      moodName = key; markMood(key); renderer.setMood(key);
      if (net && online) online.setMood(key);
    });
    $(box).append(b);
  }
});
function markMood(key) { document.querySelectorAll('[data-mood]').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.mood === key))); }

async function goFull() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen && matchMedia('(pointer: coarse)').matches) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation?.lock?.('landscape');
  } catch (e) { /* not supported here, e.g. iPhone */ }
  layout();
}
$('play').addEventListener('click', () => { sound.unlock(); goFull(); newLocalGame(); });
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
  const ready = TEAM_PLACES.every((pl) => (rm.places?.[pl] || []).length > 0);
  $('startNet').hidden = !lead;
  $('startNet').disabled = !ready || rm.phase === 'countdown';
  const owner = r.player(rm.ownerId);
  $('lobbyMsg').textContent = rm.phase === 'countdown' ? 'Matchen börjar …'
    : lead ? (ready ? 'Alla lag har spelare. Starta när ni är redo.' : 'Varje lag behöver minst en spelare. Bjud in med länken eller QR-koden.')
    : `Väntar på att ${owner ? owner.name : 'den som skapade rummet'} startar matchen.`;
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
