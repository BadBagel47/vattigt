// The match: units, turns, weapons and physics. Pure and deterministic:
// the same seed and the same inputs give the same match in every browser
// (whole numbers only, no Math.random, no Math.sin), so online play can send
// inputs only (D-011).
import * as R from './rules.js';
import { makeMap, blast, isSolid } from './terrain.js';
import { sin, cos, isqrt } from './trig.js';

const { FP, W, H } = R;
const px = (v) => Math.floor(v / FP);

/* ---------- random numbers kept in the state ---------- */
function rand(w) {
  w.rng = (w.rng + 0x6D2B79F5) >>> 0;
  let t = w.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
const randInt = (w, n) => rand(w) % n;

/* ---------- setup ---------- */
// Normalise match settings so that every browser uses exactly the same values.
export function matchSettings(opts = {}) {
  const d = R.DEFAULT_SETTINGS, s = { ...d, ...(opts.settings || {}) };
  const clamp = (v, lo, hi, def) => (Number.isInteger(v) && v >= lo && v <= hi ? v : def);
  const weapons = Array.isArray(s.weapons) ? R.WEAPONS.map((w) => w.id).filter((id) => s.weapons.includes(id)) : d.weapons;
  return {
    map: ['midsommar', 'kobbarna', 'trollskogen', 'gruvan'].includes(s.map) ? s.map : d.map,
    night: !!s.night,
    units: clamp(s.units, 1, R.MAX_UNITS, d.units),
    turn: clamp(s.turn, 10, 120, d.turn),
    flood: clamp(s.flood, 0, 99, d.flood),
    weapons: weapons.length ? weapons : ['gurra']
  };
}

export function newMatch(seed, opts = {}) {
  const settings = matchSettings(opts);
  const src = R.TEAMS.map((def, i) => ({ ...def, ...((opts.teams || [])[i] || {}) }));
  const teams = src.map((t, i) => ({
    name: String(t.name || R.TEAMS[i].name).slice(0, 20), index: i, color: Number.isInteger(t.color) ? t.color : i, hat: t.hat || R.TEAMS[i].hat,
    ammo: R.WEAPONS.map((wp) => (settings.weapons.includes(wp.id) ? wp.ammo : 0)), next: 0
  }));
  const map = makeMap(seed, settings.map);
  const w = {
    seed: seed >>> 0, rng: seed >>> 0, tick: 0, settings,
    map, water: map.water, wind: 0, trollTurn: -1,
    teams, units: [], projectiles: [], clouds: [], stones: [],
    turn: { phase: 'start', team: -1, unit: -1, timer: 0, retreat: 0, quiet: 0, round: 0, weapon: 0, aim: { angle: 45, power: 60 }, number: 0 },
    winner: null, events: [], mapVersion: 0
  };
  let id = 0;
  teams.forEach((t, ti) => {
    const spots = map.spawns[ti].slice();
    for (let i = spots.length - 1; i > 0; i--) { const j = randInt(w, i + 1); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    const names = src[ti].units || R.TEAMS[ti].units;
    for (let k = 0; k < settings.units; k++) {
      let [x, y] = spots[k % spots.length];
      x += Math.trunc(k / spots.length) * 6;
      // a free spot near the spawn point: first a little lower (tunnels), then higher
      let ok = bodyFree(w, x, y);
      for (let d = 1; !ok && d <= 24; d++) if (bodyFree(w, x, y + d)) { y += d; ok = true; }
      while (!ok && y > 3) { y--; ok = bodyFree(w, x, y); }
      const name = String(names[k] || R.TEAMS[ti].units[k] || 'VÄTTE').toUpperCase().slice(0, 10);
      w.units.push({ id: id++, team: ti, name, X: x * FP, Y: y * FP, VX: 0, VY: 0, air: true, hp: R.HP, alive: true, face: ti === 0 ? 1 : -1, walk: 0 });
    }
  });
  return w;
}

/* ---------- bodies ---------- */
const solidAt = (w, x, y) => isSolid(w.map, x, y);
// A vätte is 5 px wide and 10 px tall; (x, y) is the pixel of its feet.
function bodyFree(w, x, y) {
  for (let r = y - 8; r <= y - 2; r += 2) if (solidAt(w, x - 2, r) || solidAt(w, x + 2, r)) return false;
  return !solidAt(w, x, y - 9) && !solidAt(w, x - 1, y) && !solidAt(w, x, y) && !solidAt(w, x + 1, y);
}
// Standing means the body cannot move one pixel down.
const standing = (w, x, y) => !bodyFree(w, x, y + 1);

function kill(w, u, why) {
  if (!u.alive) return;
  u.alive = false; u.hp = 0;
  w.events.push({ t: 'death', unit: u.id, why, x: px(u.X), y: px(u.Y) });
  if (why !== 'water' && why !== 'edge') w.stones.push({ X: u.X, Y: u.Y, VY: 0, team: u.team });
}
function hurt(w, u, n) {
  if (!u.alive || n <= 0) return;
  u.hp -= n;
  w.events.push({ t: 'damage', unit: u.id, n, x: px(u.X), y: px(u.Y) - 12 });
  if (u.hp <= 0) kill(w, u, 'hp');
}

function stepUnit(w, u) {
  if (!u.alive) return;
  let x = px(u.X), y = px(u.Y);
  if (!u.air && !standing(w, x, y)) { u.air = true; u.VX = 0; u.VY = 0; }
  if (u.air) {
    u.VY += R.GRAVITY;
    const n = Math.max(1, Math.trunc((Math.max(Math.abs(u.VX), Math.abs(u.VY)) + FP - 1) / FP));
    const sx = Math.trunc(u.VX / n), sy = Math.trunc(u.VY / n);
    for (let i = 0; i < n && u.air; i++) {
      const nx = u.X + sx, ny = u.Y + sy;
      if (bodyFree(w, px(nx), px(ny))) { u.X = nx; u.Y = ny; }
      else if (bodyFree(w, px(u.X), px(ny))) { u.Y = ny; u.VX = -Math.trunc(u.VX / 3); }
      else if (bodyFree(w, px(nx), px(u.Y))) { u.X = nx; if (u.VY > 0) land(w, u); else u.VY = 0; }
      else if (u.VY > 0) land(w, u);
      else { u.VY = 0; u.VX = 0; }
      if (u.air && u.VY >= 0 && standing(w, px(u.X), px(u.Y)) && u.VY < 2 * R.GRAVITY) land(w, u);
    }
  }
  x = px(u.X); y = px(u.Y);
  if (y > w.water) { kill(w, u, 'water'); w.events.push({ t: 'splash', x, y: w.water }); }
  else if (x < -20 || x > W + 20) kill(w, u, 'edge');
}
function land(w, u) {
  const v = u.VY;
  u.air = false; u.VX = 0; u.VY = 0; u.Y = px(u.Y) * FP;
  if (v > R.FALL_SAFE_VY) hurt(w, u, Math.trunc(((v - R.FALL_SAFE_VY) * R.FALL_DAMAGE_PER_PX) / FP) + 2);
}
function walk(w, u, dir) {
  const x = px(u.X), y = px(u.Y);
  u.face = dir;
  for (let c = 0; c <= R.CLIMB; c++) {
    if (!bodyFree(w, x + dir, y - c)) continue;
    let ny = y - c;
    for (let k = 0; k < 5 && !standing(w, x + dir, ny); k++) ny++;
    u.X = (x + dir) * FP; u.Y = ny * FP;
    if (!standing(w, x + dir, ny)) { u.air = true; u.VX = dir * 300; u.VY = 0; }
    return;
  }
}

/* ---------- weapons ---------- */
function fire(w, u, shot) {
  const t = w.turn, wp = R.WEAPONS[t.weapon], team = w.teams[u.team];
  if (team.ammo[t.weapon] === 0) return false;
  if (team.ammo[t.weapon] > 0) team.ammo[t.weapon]--;
  const cx = u.X, cy = u.Y - 5 * FP;
  if (wp.aim) {
    const angle = ((shot.angle % 360) + 360) % 360, power = Math.max(0, Math.min(100, shot.power | 0));
    const v = Math.trunc((wp.speed * power) / 100);
    const dx = cos(angle), dy = -sin(angle);
    u.face = dx < 0 ? -1 : 1;
    w.projectiles.push({ kind: wp.id, X: cx + dx * 7, Y: cy + dy * 7, VX: Math.trunc((dx * v) / 1024), VY: Math.trunc((dy * v) / 1024), owner: u.id, age: 0, fuse: wp.fuse || -1, rest: false });
  } else {
    w.projectiles.push({ kind: wp.id, X: u.X + u.face * 4 * FP, Y: u.Y - 3 * FP, VX: u.face * 200, VY: 0, owner: u.id, age: 0, fuse: wp.fuse, rest: false });
  }
  w.events.push({ t: 'fire', kind: wp.id, x: px(cx), y: px(cy) });
  return true;
}

function explode(w, x, y, wp) {
  const r = wp.radius;
  blast(w.map, x, y, r);
  w.mapVersion++;
  w.events.push({ t: 'boom', x, y, r, kind: wp.id });
  for (const l of w.map.lamps) if (l.on && (l.x - x) * (l.x - x) + (l.y - y) * (l.y - y) <= (r + 6) * (r + 6)) { l.on = 0; w.events.push({ t: 'lamp', x: l.x, y: l.y }); }
  wakeTroll(w, x, y, r);
  const reach = r + 12;
  for (const u of w.units) {
    if (!u.alive) continue;
    const dx = px(u.X) - x, dy = px(u.Y) - 5 - y, d2 = dx * dx + dy * dy;
    if (d2 >= reach * reach) continue;
    const d = isqrt(d2), k = reach - d;
    hurt(w, u, Math.max(1, Math.trunc((wp.damage * k) / reach)));
    if (!u.alive) continue;
    const f = Math.trunc((wp.force * k) / reach), dd = Math.max(d, 1);
    u.VX = Math.trunc((dx * f) / dd);
    u.VY = Math.trunc((dy * f) / dd) - Math.trunc(f / 3) - 400;
    u.air = true;
  }
  for (const p of w.projectiles) if (p.rest) { const dx = px(p.X) - x, dy = px(p.Y) - y; if (dx * dx + dy * dy < reach * reach) { p.rest = false; p.VY = -1500; } }
}

// Trollskogen at night: a blast on the troll wakes it, and it throws a stone at
// whoever's turn it is. Once a turn, aimed roughly, as trolls do.
function wakeTroll(w, x, y, r) {
  const tr = w.map.troll;
  if (!tr || !w.settings.night || w.trollTurn === w.turn.number) return;
  const dx0 = x - tr.x, dy0 = y - tr.y;
  if (dx0 * dx0 + dy0 * dy0 > (tr.r + r) * (tr.r + r)) return;
  const target = w.units.find((u) => u.id === w.turn.unit && u.alive) || w.units.find((u) => u.alive);
  if (!target) return;
  w.trollTurn = w.turn.number;
  const sx = tr.x, sy = tr.y - tr.r - 6, dx = px(target.X) - sx, dir = dx < 0 ? -1 : 1;
  const v = Math.max(2048, Math.min(10 * FP, isqrt(Math.abs(dx) * FP * R.GRAVITY)));
  w.projectiles.push({ kind: 'troll', X: sx * FP, Y: sy * FP, VX: Math.trunc((dir * v * 724) / 1024), VY: -Math.trunc((v * 724) / 1024), owner: -1, age: 0, fuse: -1, rest: false });
  w.events.push({ t: 'troll', x: sx, y: sy });
}

function stepProjectile(w, p) {
  p.age++;
  const wp = p.kind === 'troll' ? R.TROLLSTONE : R.WEAPONS.find((o) => o.id === p.kind);
  if (p.fuse > 0 && --p.fuse === 0) { open(w, p, wp); return false; }
  if (p.rest) {
    if (!solidAt(w, px(p.X), px(p.Y) + 1)) p.rest = false; else return true;
  }
  if (wp.wind) p.VX += Math.trunc((w.wind * R.WIND_ACCEL) / 2);
  p.VY += R.GRAVITY;
  const n = Math.max(1, Math.trunc((Math.max(Math.abs(p.VX), Math.abs(p.VY)) + FP - 1) / FP));
  const sx = Math.trunc(p.VX / n), sy = Math.trunc(p.VY / n);
  for (let i = 0; i < n; i++) {
    const nx = p.X + sx, ny = p.Y + sy, ix = px(nx), iy = px(ny);
    if (iy > w.water) { w.events.push({ t: 'splash', x: ix, y: w.water }); return false; }
    if (ix < -60 || ix > W + 60 || iy > H + 20) return false;
    if (p.kind === 'gurra' || p.kind === 'troll') {
      const hitUnit = w.units.some((u) => u.alive && !(u.id === p.owner && p.age < 12) && Math.abs(px(u.X) - ix) <= 3 && iy >= px(u.Y) - 10 && iy <= px(u.Y));
      if (solidAt(w, ix, iy) || hitUnit) { explode(w, ix, iy, wp); return false; }
    } else if (solidAt(w, ix, iy)) {
      const hx = solidAt(w, ix, px(p.Y)), vy = solidAt(w, px(p.X), iy);
      if (hx || !vy) p.VX = -Math.trunc((p.VX * 45) / 100);
      if (vy || !hx) { p.VY = -Math.trunc((p.VY * 40) / 100); p.VX = Math.trunc((p.VX * 80) / 100); }
      if (Math.abs(p.VY) < 400 && Math.abs(p.VX) < 200 && solidAt(w, px(p.X), px(p.Y) + 1)) { p.rest = true; p.VX = 0; p.VY = 0; }
      w.events.push({ t: 'bounce', kind: p.kind, x: px(p.X), y: px(p.Y), v: Math.abs(p.VX) + Math.abs(p.VY) });
      return true;
    }
    p.X = nx; p.Y = ny;
  }
  return true;
}
function open(w, p, wp) {
  const x = px(p.X), y = px(p.Y);
  explode(w, x, y, wp);
  if (p.kind === 'strom') { w.clouds.push({ X: p.X, Y: p.Y - 6 * FP, turns: R.CLOUD_TURNS }); w.events.push({ t: 'cloud', x, y }); }
}

/* ---------- turns ---------- */
const aliveIn = (w, ti) => w.units.filter((u) => u.alive && u.team === ti);

function nextTurn(w) {
  const t = w.turn;
  const living = w.teams.filter((tm) => aliveIn(w, tm.index).length > 0);
  if (living.length <= 1 && t.phase !== 'start') return gameOver(w, living);
  // pick the next team with vättar left
  let team = t.team;
  for (let k = 0; k < w.teams.length; k++) {
    team = (team + 1) % w.teams.length;
    if (aliveIn(w, team).length) break;
  }
  if (team <= t.team || t.team < 0) t.round++;
  // the surströmming cloud stings the vättar of the team whose turn begins
  for (const c of w.clouds) for (const u of aliveIn(w, team)) {
    const dx = px(u.X) - px(c.X), dy = px(u.Y) - 5 - px(c.Y);
    if (dx * dx + dy * dy <= R.CLOUD_RADIUS * R.CLOUD_RADIUS) hurt(w, u, R.CLOUD_DAMAGE);
  }
  for (const c of w.clouds) c.turns--;
  w.clouds = w.clouds.filter((c) => c.turns > 0);
  if (w.settings.flood && t.round >= w.settings.flood && t.phase !== 'start') { w.water -= R.FLOOD_PX; w.events.push({ t: 'flood', water: w.water }); }
  const left = w.teams.filter((tm) => aliveIn(w, tm.index).length > 0);
  if (left.length <= 1 && t.phase !== 'start') return gameOver(w, left);
  if (!aliveIn(w, team).length) { t.team = team; return nextTurn(w); }
  // the next vätte of that team, in turn
  const tm = w.teams[team], own = w.units.filter((u) => u.team === team);
  let pick = null;
  for (let k = 0; k < own.length; k++) { const u = own[(tm.next + k) % own.length]; if (u.alive) { pick = u; tm.next = (own.indexOf(u) + 1) % own.length; break; } }
  t.team = team; t.unit = pick.id; t.phase = 'aim'; t.timer = w.settings.turn * R.TPS; t.retreat = 0; t.quiet = 0; t.number++;
  if (tm.ammo[t.weapon] === 0) t.weapon = Math.max(0, tm.ammo.findIndex((a) => a !== 0));
  t.aim = { angle: pick.face > 0 ? 45 : 135, power: 60 };
  w.wind = randInt(w, R.WIND_MAX * 2 + 1) - R.WIND_MAX;
  w.events.push({ t: 'turn', team, unit: pick.id, wind: w.wind, round: t.round });
}
function gameOver(w, living) {
  w.turn.phase = 'over';
  w.winner = living.length === 1 ? living[0].index : -1;
  w.events.push({ t: 'over', winner: w.winner });
}

const busy = (w) => w.projectiles.length > 0 || w.units.some((u) => u.alive && u.air) || w.stones.some((s) => s.air !== false);

/* ---------- one step ---------- */
// input: { walk: -1|0|1, jump: bool, weapon: index, aim: {angle, power}, fire: {angle, power} | true }
export function step(w, input = {}) {
  w.events = [];
  const t = w.turn;
  if (t.phase === 'over') { w.tick++; return w; }
  const u = w.units.find((o) => o.id === t.unit);
  const control = u && u.alive && (t.phase === 'aim' || t.phase === 'retreat');
  if (control) {
    if (t.phase === 'aim' && Number.isInteger(input.weapon) && input.weapon >= 0 && input.weapon < R.WEAPONS.length && w.teams[u.team].ammo[input.weapon] !== 0) t.weapon = input.weapon;
    if (input.aim && t.phase === 'aim') {
      t.aim = { angle: ((input.aim.angle | 0) % 360 + 360) % 360, power: Math.max(0, Math.min(100, input.aim.power | 0)) };
      u.face = cos(t.aim.angle) < 0 ? -1 : 1;
    }
    if (!u.air) {
      if (input.jump && standing(w, px(u.X), px(u.Y))) { u.air = true; u.VX = u.face * R.JUMP_VX; u.VY = R.JUMP_VY; w.events.push({ t: 'jump', x: px(u.X), y: px(u.Y) }); }
      else if (input.walk === 1 || input.walk === -1) { u.walk++; if (u.walk % R.WALK_EVERY === 0) walk(w, u, input.walk); }
      if (input.fire && t.phase === 'aim' && !u.air) {
        const shot = input.fire === true ? t.aim : input.fire;
        if (fire(w, u, shot)) { t.phase = 'retreat'; t.retreat = R.RETREAT_TICKS; }
      }
    }
  }
  for (const o of w.units) stepUnit(w, o);
  w.projectiles = w.projectiles.filter((p) => stepProjectile(w, p));
  for (const c of w.clouds) c.X += w.wind * 2;
  for (const s of w.stones) {
    if (s.air === false && solidAt(w, px(s.X), px(s.Y) + 1)) continue;
    s.air = true; s.VY = Math.min(s.VY + R.GRAVITY, 6 * FP); s.Y += s.VY;
    while (solidAt(w, px(s.X), px(s.Y))) { s.Y -= FP; s.air = false; s.VY = 0; }
    if (solidAt(w, px(s.X), px(s.Y) + 1)) { s.air = false; s.VY = 0; }
    if (px(s.Y) > H + 10) s.air = false;
  }
  w.stones = w.stones.filter((s) => px(s.Y) <= w.water);

  if (t.phase === 'aim') { if (--t.timer <= 0) t.phase = 'settle'; }
  else if (t.phase === 'retreat') { t.timer = Math.max(0, t.timer - 1); if (--t.retreat <= 0) t.phase = 'settle'; }
  if ((t.phase === 'aim' || t.phase === 'retreat') && !(u && u.alive)) t.phase = 'settle';
  if (t.phase === 'aim' && u && u.alive && u.air && px(u.Y) > w.water) t.phase = 'settle';
  if (t.phase === 'settle' || t.phase === 'start') {
    t.quiet = busy(w) ? 0 : t.quiet + 1;
    if (t.quiet >= R.SETTLE_QUIET_TICKS) nextTurn(w);
  }
  w.tick++;
  return w;
}

/* ---------- helpers for drawing, tests and online play ---------- */
export const activeUnit = (w) => w.units.find((u) => u.id === w.turn.unit) || null;
export const teamHp = (w, ti) => w.units.filter((u) => u.team === ti && u.alive).reduce((a, u) => a + u.hp, 0);
export { px };

// A short fingerprint of the whole match state, to compare two browsers.
export function fingerprint(w) {
  let h = 2166136261 >>> 0;
  const mix = (v) => { h ^= v & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; };
  mix(w.tick); mix(w.rng); mix(w.water); mix(w.wind + 100);
  for (const u of w.units) { mix(u.X); mix(u.Y); mix(u.VX); mix(u.VY); mix(u.hp); mix(u.alive ? 1 : 0); }
  for (const p of w.projectiles) { mix(p.X); mix(p.Y); mix(p.VX); mix(p.VY); mix(p.fuse); }
  for (const c of w.clouds) { mix(c.X); mix(c.turns); }
  for (const l of w.map.lamps) mix(l.on);
  const s = w.map.solid;
  for (let i = 0; i < s.length; i += 7) mix(s[i] * (i + 1));
  mix(w.turn.team + 5); mix(w.turn.unit + 5); mix(w.turn.timer); mix(w.turn.round);
  return h.toString(16).padStart(8, '0');
}
